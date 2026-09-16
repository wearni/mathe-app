/* ============================================================
   Mathe App - Spiel-Engine
   - fallende Gleichungen (Space-Invaders-Prinzip)
   - Herzen als Leben, Sternchen als Belohnung
   - Bonus-Station nach jeder 10. Aufgabe
   - 30-Sekunden-Raumschiff-Bonuslevel
   ============================================================ */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const rf = (a, b) => a + Math.random() * (b - a);

  const CONFIG = {
    maxLives: 5,
    startLives: 3,
    heartCost: 5,
    miniCost: 8,
    bonusEvery: 10,      /* nach jeder 10. Aufgabe (egal ob richtig oder falsch) */
    levelEvery: 10,      /* Level-Up nach je 10 richtigen Aufgaben */
    miniDuration: 30,    /* Sekunden Bonuslevel */
    sessionLimit: 600    /* Sekunden reine Spielzeit pro Runde (10 Minuten) */
  };

  /* Start-Tempo. Es ist die Grundeinstellung, von der aus das Spiel mit
     jedem Level und jeder Spielminute schneller wird. */
  const SPEEDS = [
    { id: 1, icon: '🐌', name: 'Schnecke', desc: 'ganz viel Zeit', fall: 22, spawn: 4.4 },
    { id: 2, icon: '🐢', name: 'Gemütlich', desc: 'in Ruhe rechnen', fall: 18, spawn: 3.6 },
    { id: 3, icon: '🚶', name: 'Normal', desc: 'ausgewogen', fall: 14, spawn: 2.9 },
    { id: 4, icon: '🐇', name: 'Flott', desc: 'schon zügig', fall: 11, spawn: 2.4 },
    { id: 5, icon: '🚀', name: 'Rakete', desc: 'nur für Profis', fall: 8.5, spawn: 2.0 }
  ];

  const G = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    cb: {},
    raf: null, last: 0, time: 0,
    state: 'idle',        /* idle | playing | paused | bonus | mini | over */
    settings: { grade: 1, theme: 'stadt-tag', inputMode: 'keypad', speed: 3 },

    lives: 3, maxLives: 5, stars: 0, score: 0, level: 1,
    combo: 0, bestCombo: 0, correct: 0, wrongShots: 0, resolved: 0,
    elapsed: 0, sinceBonus: 0,
    session: 0, warned: {},   /* Spielzeit der Runde + schon gezeigte Warnungen */

    eqs: [], bullets: [], parts: [], floats: [], rings: [],
    spawnTimer: 0, idc: 1, targetId: 0,
    shake: 0, flash: 0, flashColor: '255,80,80', goldenTimer: 0,

    mini: null, bottomInset: 150,
    pointer: { x: 0, y: 0, active: false },
    keys: {}
  };

  /* ================= Hilfsfunktionen zum Zeichnen ================= */
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function star(ctx, cx, cy, r, points, inner) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? r : r * inner;
      const a = (i * Math.PI) / points - Math.PI / 2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath();
  }

  function heartPath(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.75);
    ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.3, cx - s * 0.6, cy - s * 1.2, cx, cy - s * 0.35);
    ctx.bezierCurveTo(cx + s * 0.6, cy - s * 1.2, cx + s * 1.5, cy - s * 0.3, cx, cy + s * 0.75);
    ctx.closePath();
  }

  /* ================= Partikel ================= */
  function burst(x, y, color, count, power, shape) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const sp = rf(power * 0.3, power);
      G.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: rf(0.4, 0.95), max: 1, size: rf(3, 8),
        color: Array.isArray(color) ? color[ri(0, color.length - 1)] : color,
        shape: shape || 'sq', rot: Math.random() * TAU, vr: rf(-6, 6)
      });
    }
  }

  function ring(x, y, color, max) {
    G.rings.push({ x, y, r: 6, max: max || 90, life: 0.45, color });
  }

  function float(x, y, text, color, size) {
    G.floats.push({ x, y, text, color: color || '#fff', size: size || 22, life: 1.1 });
  }

  /* ================= Aufgaben ================= */
  /* Die Schutzlinie liegt immer knapp über der Steuerung am unteren Rand. */
  function groundY() { return Math.max(G.H * 0.45, G.H - G.bottomInset - 34); }
  function spawnY() { return -40; }

  /* Gewähltes Start-Tempo */
  function tempo() { return SPEEDS[clamp((G.settings.speed | 0) - 1, 0, SPEEDS.length - 1)]; }

  /* Fallzeit in Sekunden: startet beim eingestellten Tempo und wird mit Level
     und Spielzeit immer kürzer - höchstens bis auf ein Drittel des Starts. */
  function fallTimeFor(speed, level, elapsed) {
    const b = SPEEDS[clamp((speed | 0) - 1, 0, SPEEDS.length - 1)].fall;
    return clamp(b - (level - 1) * b * 0.05 - elapsed * b * 0.0035, b * 0.34, b);
  }

  function spawnGapFor(speed, level, elapsed) {
    const b = SPEEDS[clamp((speed | 0) - 1, 0, SPEEDS.length - 1)].spawn;
    return clamp(b - (level - 1) * b * 0.045 - elapsed * b * 0.0022, b * 0.38, b);
  }

  function speedNow() {
    return (groundY() - spawnY()) / fallTimeFor(G.settings.speed, G.level, G.elapsed);
  }

  function spawnInterval() {
    return spawnGapFor(G.settings.speed, G.level, G.elapsed);
  }

  function maxOnScreen() {
    const slow = G.settings.speed <= 2;
    return clamp(2 + Math.floor(G.level / (slow ? 5 : 3)), 2, slow ? 3 : 4);
  }

  function measureEq(text) {
    const ctx = G.ctx;
    ctx.font = '700 ' + eqFont() + 'px "Baloo 2", system-ui, sans-serif';
    const w = ctx.measureText(text).width;
    return { w: Math.max(w + 44, 92), h: eqFont() * 1.85 };
  }

  function eqFont() {
    return clamp(Math.round(Math.min(G.W, G.H) * 0.055), 20, 34);
  }

  function spawnEq() {
    const p = MathGen.create(G.settings.grade, G.level);
    const m = measureEq(p.text);
    const kind = (G.correct > 0 && G.correct % 7 === 0 && Math.random() < 0.5) ? 'golden' : 'normal';
    let x = rf(m.w / 2 + 12, G.W - m.w / 2 - 12);
    /* nicht direkt übereinander spawnen */
    for (let tries = 0; tries < 6; tries++) {
      const close = G.eqs.some(e => e.y < 120 && Math.abs(e.x - x) < (e.w + m.w) / 2);
      if (!close) break;
      x = rf(m.w / 2 + 12, G.W - m.w / 2 - 12);
    }
    G.eqs.push({
      id: G.idc++, text: p.text, answer: p.answer,
      x, y: spawnY(), w: m.w, h: m.h,
      kind, locked: false, ph: Math.random() * TAU,
      choices: MathGen.choicesFor(p.answer, 4)
    });
    updateTarget(true);
  }

  function updateTarget(force) {
    let best = null;
    for (const e of G.eqs) if (!e.locked && (!best || e.y > best.y)) best = e;
    const id = best ? best.id : 0;
    if (id !== G.targetId || force) {
      G.targetId = id;
      if (G.cb.onChoices) G.cb.onChoices(best ? best.choices : []);
    }
  }

  /* ================= Schüsse ================= */
  function fire(value) {
    if (G.state !== 'playing') return;
    value = Math.round(value);
    let hit = null;
    for (const e of G.eqs) {
      if (e.locked) continue;
      if (e.answer === value && (!hit || e.y > hit.y)) hit = e;
    }
    Sound.play('shoot');
    const sx = G.W / 2, sy = groundY() - 26;
    if (hit) {
      hit.locked = true;
      G.bullets.push({
        x: sx, y: sy, tx: hit.x, ty: hit.y, target: hit.id,
        t: 0, dur: Math.max(0.16, Math.hypot(hit.x - sx, hit.y - sy) / 1500),
        color: hit.kind === 'golden' ? '#FFD166' : '#7CFF6B'
      });
      updateTarget(true);
    } else {
      G.bullets.push({ x: sx, y: sy, tx: sx + rf(-60, 60), ty: -30, t: 0, dur: 0.5, color: '#9aa4c7', miss: true });
      onWrong();
    }
    G.recoil = 1;
  }

  function onWrong() {
    G.wrongShots++;
    G.combo = 0;
    G.flash = 0.35; G.flashColor = '255,120,120';
    G.shake = Math.max(G.shake, 5);
    Sound.play('wrong');
    float(G.W / 2, groundY() - 70, 'Daneben!', '#FF8A8A', 20);
    pushHud();
  }

  function onHit(e) {
    const mult = G.combo >= 15 ? 4 : G.combo >= 10 ? 3 : G.combo >= 5 ? 2 : 1;
    const gold = e.kind === 'golden';
    const pts = (10 + G.level * 2) * mult * (gold ? 3 : 1);
    G.score += pts;
    G.combo++;
    G.bestCombo = Math.max(G.bestCombo, G.combo);
    G.correct++;

    let gained = 1 + (G.combo >= 5 ? 1 : 0) + (gold ? 2 : 0);
    G.stars += gained;

    const col = gold ? ['#FFD166', '#FFE9A8', '#FFAE2B'] : ['#7CFF6B', '#B8FFB0', '#FFFFFF', '#5BC0EB'];
    burst(e.x, e.y, col, gold ? 34 : 22, 320);
    ring(e.x, e.y, gold ? '#FFD166' : '#7CFF6B', gold ? 130 : 95);
    float(e.x, e.y - 10, '+' + pts, gold ? '#FFD166' : '#CFFFC8', 26);
    float(e.x, e.y + 18, '+' + gained + ' ★', '#FFE066', 18);
    G.shake = Math.max(G.shake, gold ? 8 : 4);

    Sound.play(gold ? 'golden' : 'hit');
    if (G.combo >= 3) Sound.play('combo', G.combo);
    if (G.combo === 5 || G.combo === 10 || G.combo === 15) {
      float(G.W / 2, G.H * 0.4, 'COMBO x' + (G.combo >= 15 ? 4 : G.combo >= 10 ? 3 : 2) + '!', '#FFD166', 34);
    }

    resolveOne();
    if (G.correct % CONFIG.levelEvery === 0) levelUp();
    pushHud();
  }

  function onMiss(e) {
    G.lives--;
    G.combo = 0;
    G.flash = 0.75; G.flashColor = '255,60,60';
    G.shake = 16;
    burst(e.x, groundY(), ['#FF5D73', '#FF9E9E', '#FFFFFF'], 30, 420);
    ring(e.x, groundY(), '#FF5D73', 150);
    float(e.x, groundY() - 50, '= ' + MathGen.sgn(e.answer), '#FFD1D1', 26);
    Sound.play('life');
    resolveOne();
    pushHud();
    if (G.lives <= 0) { gameOver(); return; }
  }

  function resolveOne() {
    G.resolved++;
    G.sinceBonus++;
    if (G.sinceBonus >= CONFIG.bonusEvery) {
      G.sinceBonus = 0;
      G.pendingBonus = true;
    }
  }

  function levelUp() {
    G.level++;
    Sound.play('levelup');
    Sound.setTempo(Math.min(132 + G.level * 3, 180));
    float(G.W / 2, G.H * 0.33, 'LEVEL ' + G.level + '!', '#FFD166', 40);
    ring(G.W / 2, G.H * 0.33, '#FFD166', 260);
    if (G.cb.onToast) G.cb.onToast('Level ' + G.level + ' – jetzt wird\'s schneller!');
  }

  function pushHud() {
    if (G.cb.onHud) G.cb.onHud({
      lives: G.lives, maxLives: G.maxLives, stars: G.stars, score: G.score,
      level: G.level, combo: G.combo, correct: G.correct,
      untilBonus: CONFIG.bonusEvery - G.sinceBonus,
      timeLeft: Math.max(0, CONFIG.sessionLimit - G.session)
    });
  }

  /* ================= Zeitlimit pro Runde ================= */
  function tickSession(dt) {
    G.session += dt;
    const left = CONFIG.sessionLimit - G.session;

    /* Anzeige nur aktualisieren, wenn sich die Sekunde ändert */
    const sec = Math.max(0, Math.ceil(left));
    if (sec !== G.lastSec) { G.lastSec = sec; pushHud(); }

    [300, 120, 60, 10].forEach(mark => {
      if (left <= mark && !G.warned[mark]) {
        G.warned[mark] = true;
        const txt = mark >= 60
          ? 'Noch ' + (mark / 60) + (mark === 60 ? ' Minute' : ' Minuten') + '!'
          : 'Noch ' + mark + ' Sekunden!';
        if (G.cb.onToast) G.cb.onToast('⏱ ' + txt);
        if (mark <= 60) Sound.play('click');
      }
    });

    if (left <= 0) {
      if (G.state === 'mini' && G.mini) { endMini(); }
      finishSession();
      return true;
    }
    return false;
  }

  /* Reguläres Ende: Zeit ist um - das ist kein Game Over. */
  function finishSession() {
    if (G.state === 'over') return;
    G.state = 'over';
    Sound.stopMusic();
    Sound.play('badge');
    G.eqs.forEach(e => burst(e.x, e.y, ['#8FC7FF', '#FFFFFF'], 10, 200));
    G.eqs.length = 0; G.bullets.length = 0;
    if (G.cb.onGameOver) G.cb.onGameOver(result('time'));
  }

  function result(reason) {
    return {
      reason: reason, score: G.score, level: G.level, correct: G.correct,
      bestCombo: G.bestCombo, stars: G.stars, grade: G.settings.grade,
      wrongShots: G.wrongShots, seconds: Math.round(G.session),
      timeLeft: Math.max(0, Math.round(CONFIG.sessionLimit - G.session))
    };
  }

  /* ================= Bonus-Station ================= */
  function enterBonus() {
    G.pendingBonus = false;
    /* Feld freundlich leeren - kein Leben geht verloren */
    G.eqs.forEach(e => { burst(e.x, e.y, ['#8FC7FF', '#FFFFFF'], 10, 200); });
    G.eqs.length = 0;
    G.bullets.length = 0;
    G.targetId = 0;
    G.state = 'bonus';
    Sound.play('badge');
    if (G.cb.onBonus) G.cb.onBonus({
      stars: G.stars, lives: G.lives, maxLives: G.maxLives,
      heartCost: CONFIG.heartCost, miniCost: CONFIG.miniCost,
      timeLeft: Math.max(0, CONFIG.sessionLimit - G.session),
      canHeart: G.stars >= CONFIG.heartCost && G.lives < G.maxLives,
      canMini: G.stars >= CONFIG.miniCost && enoughTimeForMini()
    });
  }

  function buyHeart() {
    if (G.stars < CONFIG.heartCost || G.lives >= G.maxLives) return false;
    G.stars -= CONFIG.heartCost;
    G.lives++;
    Sound.play('heart');
    pushHud();
    return true;
  }

  function resumeFromBonus() {
    if (CONFIG.sessionLimit - G.session <= 0) { finishSession(); return; }
    G.state = 'playing';
    G.spawnTimer = 0.6;
    G.last = performance.now();
    pushHud();
  }

  /* ================= Raumschiff-Bonuslevel ================= */
  /* Das Bonuslevel lohnt sich nur, wenn die Rundenzeit noch dafür reicht. */
  function enoughTimeForMini() {
    return (CONFIG.sessionLimit - G.session) >= CONFIG.miniDuration + 5;
  }

  function startMini(paid) {
    if (paid) {
      if (G.stars < CONFIG.miniCost || !enoughTimeForMini()) return false;
      G.stars -= CONFIG.miniCost;
    }
    G.mini = {
      t: CONFIG.miniDuration, ship: { x: G.W / 2, y: groundY() - 30 },
      shots: [], foes: [], kills: 0, escaped: 0, cool: 0, spawn: 0, score: 0, stars: 0
    };
    G.state = 'mini';
    G.last = performance.now();
    Sound.play('start');
    pushHud();
    if (G.cb.onMiniStart) G.cb.onMiniStart();
    return true;
  }

  function updateMini(dt) {
    const m = G.mini;
    m.t -= dt;

    /* Steuerung */
    if (G.pointer.active) {
      m.ship.x += (G.pointer.x - m.ship.x) * Math.min(1, dt * 14);
    }
    if (G.keys['ArrowLeft']) m.ship.x -= 420 * dt;
    if (G.keys['ArrowRight']) m.ship.x += 420 * dt;
    m.ship.x = clamp(m.ship.x, 30, G.W - 30);
    m.ship.y = groundY() - 30;

    /* Autofeuer */
    m.cool -= dt;
    if (m.cool <= 0) {
      m.cool = 0.16;
      m.shots.push({ x: m.ship.x, y: m.ship.y - 26 });
      Sound.play('type');
    }
    for (let i = m.shots.length - 1; i >= 0; i--) {
      const s = m.shots[i];
      s.y -= 880 * dt;
      if (s.y < -20) m.shots.splice(i, 1);
    }

    /* Gegner */
    m.spawn -= dt;
    if (m.spawn <= 0) {
      m.spawn = rf(0.28, 0.62);
      const n = ri(1, 2);
      for (let k = 0; k < n; k++) {
        m.foes.push({
          x: rf(36, G.W - 36), y: -30, vy: rf(80, 170), vx: rf(-50, 50),
          r: rf(15, 24), ph: Math.random() * TAU, hp: 1,
          c: ['#FF5D73', '#B388FF', '#7CFF6B', '#FFD166', '#4FC3F7'][ri(0, 4)]
        });
      }
    }
    for (let i = m.foes.length - 1; i >= 0; i--) {
      const f = m.foes[i];
      f.y += f.vy * dt;
      f.x += Math.sin(G.time * 2 + f.ph) * 40 * dt + f.vx * dt * 0.4;
      if (f.x < 24 || f.x > G.W - 24) f.vx *= -1;
      f.x = clamp(f.x, 24, G.W - 24);
      if (f.y > G.H + 40) { m.foes.splice(i, 1); m.escaped++; continue; }
      /* Treffer? */
      for (let j = m.shots.length - 1; j >= 0; j--) {
        const s = m.shots[j];
        if (Math.hypot(s.x - f.x, s.y - f.y) < f.r + 6) {
          m.shots.splice(j, 1);
          m.foes.splice(i, 1);
          m.kills++;
          m.score += 15;
          burst(f.x, f.y, [f.c, '#FFFFFF'], 16, 280);
          ring(f.x, f.y, f.c, 70);
          float(f.x, f.y, '+15', '#FFFFFF', 18);
          Sound.play('hit');
          G.shake = Math.max(G.shake, 3);
          break;
        }
      }
    }

    if (m.t <= 0) endMini();
  }

  function endMini() {
    const m = G.mini;
    const gainedStars = Math.floor(m.kills / 4);
    const heart = m.kills >= 20 && G.lives < G.maxLives;
    G.score += m.score;
    G.stars += gainedStars;
    if (heart) G.lives++;
    G.mini = null;
    G.state = 'bonus';
    Sound.play(m.kills > 0 ? 'badge' : 'back');
    pushHud();
    if (G.cb.onMiniEnd) G.cb.onMiniEnd({ kills: m.kills, score: m.score, stars: gainedStars, heart });
  }

  function renderMini(ctx) {
    const m = G.mini;
    /* Schüsse */
    ctx.fillStyle = '#7CFF6B';
    m.shots.forEach(s => {
      ctx.shadowColor = '#7CFF6B'; ctx.shadowBlur = 12;
      rrect(ctx, s.x - 3, s.y - 12, 6, 18, 3); ctx.fill();
    });
    ctx.shadowBlur = 0;

    /* Gegner */
    m.foes.forEach(f => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(Math.sin(G.time * 3 + f.ph) * 0.25);
      ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.ellipse(0, 0, f.r, f.r * 0.62, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(0, -f.r * 0.25, f.r * 0.42, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(-f.r * 0.14, -f.r * 0.3, f.r * 0.1, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(f.r * 0.14, -f.r * 0.3, f.r * 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = f.c;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(0, f.r * 0.5, f.r * 0.5, f.r * 0.22, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    drawShip(ctx, m.ship.x, m.ship.y, 1.15, 0);

    /* Timer-Balken */
    const p = clamp(m.t / CONFIG.miniDuration, 0, 1);
    const bw = G.W * 0.7, bx = (G.W - bw) / 2, by = 88;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    rrect(ctx, bx, by, bw, 16, 8); ctx.fill();
    ctx.fillStyle = p > 0.3 ? '#7CFF6B' : '#FF5D73';
    rrect(ctx, bx + 2, by + 2, Math.max(4, (bw - 4) * p), 12, 6); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 16px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BONUS  ' + Math.ceil(m.t) + 's   ·   ' + m.kills + ' Treffer', G.W / 2, by + 44);
  }

  /* ================= Raumschiff / Kanone ================= */
  function drawShip(ctx, x, y, s, recoil) {
    ctx.save();
    ctx.translate(x, y + (recoil || 0) * 6);
    ctx.scale(s, s);
    /* Flamme */
    const fl = 12 + Math.sin(G.time * 22) * 5;
    const g = ctx.createLinearGradient(0, 18, 0, 18 + fl);
    g.addColorStop(0, '#FFD166'); g.addColorStop(1, 'rgba(255,94,58,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, 18); ctx.lineTo(0, 18 + fl); ctx.lineTo(9, 18); ctx.closePath(); ctx.fill();
    /* Flügel */
    ctx.fillStyle = '#E63E62';
    ctx.beginPath();
    ctx.moveTo(-10, 4); ctx.lineTo(-26, 20); ctx.lineTo(-10, 18); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 4); ctx.lineTo(26, 20); ctx.lineTo(10, 18); ctx.closePath(); ctx.fill();
    /* Rumpf */
    ctx.fillStyle = '#F4F7FF';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(13, -8, 12, 18);
    ctx.lineTo(-12, 18);
    ctx.quadraticCurveTo(-13, -8, 0, -26);
    ctx.closePath(); ctx.fill();
    /* Fenster */
    ctx.fillStyle = '#4FC3F7';
    ctx.beginPath(); ctx.arc(0, -4, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(-2, -6, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ================= Hauptschleife ================= */
  function update(dt) {
    G.time += dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 1.6);
    if (G.recoil > 0) G.recoil = Math.max(0, G.recoil - dt * 6);

    /* Partikel */
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i];
      p.life -= dt;
      if (p.life <= 0) { G.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 520 * dt; p.vx *= 0.99;
      p.rot += p.vr * dt;
    }
    for (let i = G.rings.length - 1; i >= 0; i--) {
      const r = G.rings[i];
      r.life -= dt;
      r.r += (r.max - r.r) * Math.min(1, dt * 8);
      if (r.life <= 0) G.rings.splice(i, 1);
    }
    for (let i = G.floats.length - 1; i >= 0; i--) {
      const f = G.floats[i];
      f.life -= dt; f.y -= 42 * dt;
      if (f.life <= 0) G.floats.splice(i, 1);
    }

    /* Zeitlimit läuft nur während des Spielens - Pause und Menüs zählen nicht */
    if (G.state === 'playing' || G.state === 'mini') {
      if (tickSession(dt)) return;
    }

    if (G.state === 'mini') { updateMini(dt); return; }
    if (G.state !== 'playing') return;

    G.elapsed += dt;

    /* Schüsse */
    for (let i = G.bullets.length - 1; i >= 0; i--) {
      const b = G.bullets[i];
      b.t += dt;
      const k = clamp(b.t / b.dur, 0, 1);
      b.cx = b.x + (b.tx - b.x) * k;
      b.cy = b.y + (b.ty - b.y) * k - Math.sin(k * Math.PI) * 26;
      if (k >= 1) {
        G.bullets.splice(i, 1);
        if (!b.miss) {
          const idx = G.eqs.findIndex(e => e.id === b.target);
          if (idx >= 0) { const e = G.eqs[idx]; G.eqs.splice(idx, 1); onHit(e); updateTarget(true); }
        }
      }
    }

    /* Gleichungen fallen */
    const sp = speedNow();
    for (let i = G.eqs.length - 1; i >= 0; i--) {
      const e = G.eqs[i];
      e.y += sp * dt;
      if (e.y + e.h / 2 >= groundY() && !e.locked) {
        G.eqs.splice(i, 1);
        onMiss(e);
        updateTarget(true);
        if (G.state === 'over') return;
      }
    }

    /* Nachschub */
    G.spawnTimer -= dt;
    if (!G.pendingBonus && G.spawnTimer <= 0 && G.eqs.length < maxOnScreen()) {
      G.spawnTimer = spawnInterval();
      spawnEq();
    }

    /* Bonus-Station, sobald das Feld sicher ist */
    if (G.pendingBonus && G.bullets.length === 0) enterBonus();

    updateTarget(false);
  }

  function render() {
    const ctx = G.ctx;
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.clearRect(0, 0, G.W, G.H);

    if (G.shake > 0) {
      ctx.translate(rf(-G.shake, G.shake), rf(-G.shake, G.shake));
    }

    Backgrounds.draw(ctx, G.time);
    const ui = Backgrounds.ui();

    if (G.state === 'mini' && G.mini) {
      renderMini(ctx);
    } else {
      /* Schutzlinie */
      const gy = groundY();
      ctx.save();
      ctx.strokeStyle = ui.accent;
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(G.time * 3);
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(G.W, gy); ctx.stroke();
      ctx.restore();

      /* Gleichungen */
      const fs = eqFont();
      G.eqs.forEach(e => {
        const isTarget = e.id === G.targetId;
        const bob = Math.sin(G.time * 2.2 + e.ph) * 3;
        const x = e.x - e.w / 2, y = e.y - e.h / 2 + bob;
        const danger = clamp((e.y - (gy - G.H * 0.28)) / (G.H * 0.28), 0, 1);

        ctx.save();
        /* Schatten / Glühen */
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;

        let a = e.kind === 'golden' ? '#FFB020' : ui.eqA;
        let b = e.kind === 'golden' ? '#FFE27A' : ui.eqB;
        if (danger > 0.02) {
          const mix = danger * (0.6 + 0.4 * Math.sin(G.time * 9));
          a = mixColor(a, '#FF2D55', mix * 0.75);
          b = mixColor(b, '#FF6B81', mix * 0.75);
        }
        const g = ctx.createLinearGradient(x, y, x, y + e.h);
        g.addColorStop(0, b); g.addColorStop(1, a);
        ctx.fillStyle = g;
        rrect(ctx, x, y, e.w, e.h, 14); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        /* Rahmen */
        ctx.lineWidth = isTarget ? 4 : 2;
        ctx.strokeStyle = isTarget ? ui.accent : 'rgba(255,255,255,0.35)';
        rrect(ctx, x, y, e.w, e.h, 14); ctx.stroke();

        /* Glanzkante */
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        rrect(ctx, x + 4, y + 4, e.w - 8, e.h * 0.32, 9); ctx.fill();

        if (e.kind === 'golden') {
          ctx.fillStyle = '#FFF3C4';
          star(ctx, x + 14, y + 12, 7, 5, 0.45); ctx.fill();
        }

        ctx.fillStyle = e.kind === 'golden' ? '#4A2C00' : ui.eqText;
        ctx.font = '700 ' + fs + 'px "Baloo 2", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(e.text, e.x, y + e.h / 2 + 1);
        ctx.restore();
      });

      /* Schüsse */
      G.bullets.forEach(b => {
        ctx.save();
        ctx.shadowColor = b.color; ctx.shadowBlur = 16;
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.cx || b.x, b.cy || b.y, b.miss ? 5 : 8, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(b.cx || b.x, (b.cy || b.y) + 14, 5, 0, TAU); ctx.fill();
        ctx.restore();
      });

      drawShip(ctx, G.W / 2, gy - 26, 1.25, G.recoil || 0);
    }

    /* Ringe */
    G.rings.forEach(r => {
      ctx.save();
      ctx.globalAlpha = clamp(r.life / 0.45, 0, 1) * 0.7;
      ctx.strokeStyle = r.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      ctx.restore();
    });

    /* Partikel */
    G.parts.forEach(p => {
      ctx.save();
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'star') { star(ctx, 0, 0, p.size, 5, 0.45); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    /* Fließtexte */
    G.floats.forEach(f => {
      ctx.save();
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.font = '800 ' + f.size + 'px "Baloo 2", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });

    /* Rot-Blitz bei Verlust */
    if (G.flash > 0) {
      ctx.fillStyle = 'rgba(' + G.flashColor + ',' + (G.flash * 0.45) + ')';
      ctx.fillRect(-20, -20, G.W + 40, G.H + 40);
    }
  }

  function mixColor(c1, c2, t) {
    const p = h => {
      h = h.replace('#', '');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const a = p(c1), b = p(c2);
    const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return 'rgb(' + m.join(',') + ')';
  }

  function loop(now) {
    G.raf = requestAnimationFrame(loop);
    let dt = (now - G.last) / 1000;
    G.last = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.05);
    update(dt);
    render();
  }

  /* ================= Steuerung von außen ================= */
  function init(canvas, callbacks) {
    G.canvas = canvas;
    G.ctx = canvas.getContext('2d');
    G.cb = callbacks || {};
    resize();
    window.addEventListener('resize', resize);

    const pos = ev => {
      const r = canvas.getBoundingClientRect();
      const t = ev.touches ? ev.touches[0] : ev;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const down = ev => {
      if (G.state !== 'mini') return;
      const p = pos(ev); G.pointer.x = p.x; G.pointer.y = p.y; G.pointer.active = true;
      ev.preventDefault();
    };
    const move = ev => {
      if (G.state !== 'mini' || !G.pointer.active) return;
      const p = pos(ev); G.pointer.x = p.x; G.pointer.y = p.y;
      ev.preventDefault();
    };
    const up = () => { G.pointer.active = false; };

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    canvas.addEventListener('touchstart', down, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);

    window.addEventListener('keydown', e => { G.keys[e.key] = true; });
    window.addEventListener('keyup', e => { G.keys[e.key] = false; });

    G.last = performance.now();
    G.raf = requestAnimationFrame(loop);
  }

  function resize() {
    const c = G.canvas;
    if (!c) return;
    const r = c.getBoundingClientRect();
    G.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    G.W = Math.max(280, Math.round(r.width));
    G.H = Math.max(320, Math.round(r.height));
    c.width = Math.round(G.W * G.dpr);
    c.height = Math.round(G.H * G.dpr);
    G.ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    Backgrounds.resize(G.W, G.H);
  }

  function start(settings) {
    Object.assign(G.settings, settings || {});
    Backgrounds.use(G.settings.theme);
    G.lives = CONFIG.startLives;
    G.maxLives = CONFIG.maxLives;
    G.stars = 0; G.score = 0; G.level = 1;
    G.combo = 0; G.bestCombo = 0; G.correct = 0; G.wrongShots = 0;
    G.resolved = 0; G.sinceBonus = 0; G.elapsed = 0;
    G.session = 0; G.warned = {}; G.lastSec = -1;
    G.eqs.length = 0; G.bullets.length = 0; G.parts.length = 0;
    G.floats.length = 0; G.rings.length = 0;
    G.pendingBonus = false; G.mini = null; G.targetId = 0;
    G.spawnTimer = 0.9;
    G.state = 'playing';
    G.last = performance.now();
    Sound.setTempo(132);
    Sound.startMusic();
    pushHud();
  }

  function pause() { if (G.state === 'playing' || G.state === 'mini') { G.prevState = G.state; G.state = 'paused'; } }
  function resume() { if (G.state === 'paused') { G.state = G.prevState || 'playing'; G.last = performance.now(); } }

  function gameOver() {
    G.state = 'over';
    Sound.stopMusic();
    Sound.play('gameover');
    if (G.cb.onGameOver) G.cb.onGameOver(result('lives'));
  }

  function quit() {
    G.state = 'idle';
    Sound.stopMusic();
    G.eqs.length = 0; G.bullets.length = 0;
  }

  function setTheme(id) { Backgrounds.use(id); G.settings.theme = id; }

  /* Höhe der Steuerung am unteren Rand, damit die Schutzlinie sichtbar bleibt. */
  function setBottomInset(px) { G.bottomInset = Math.max(0, px || 0); }

  global.Game = {
    init, start, pause, resume, quit, fire, resize, setTheme, setBottomInset,
    buyHeart, startMini, resumeFromBonus,
    get state() { return G.state; },
    get stars() { return G.stars; },
    get lives() { return G.lives; },
    get maxLives() { return G.maxLives; },
    get config() { return CONFIG; },
    get speeds() { return SPEEDS; },
    get timeLeft() { return Math.max(0, CONFIG.sessionLimit - G.session); },
    enoughTimeForMini,
    /* Vorschau zum Feinjustieren: wie lange fällt eine Aufgabe bei dieser
       Einstellung, in diesem Level, nach so vielen Sekunden Spielzeit? */
    fallTimeFor, spawnGapFor,
    /* Nur für Tests/Debugging: aktuelle Aufgaben auf dem Feld */
    get equations() { return G.eqs.map(e => ({ id: e.id, text: e.text, answer: e.answer, y: e.y })); },
    demoFrame() { render(); }
  };
})(window);
