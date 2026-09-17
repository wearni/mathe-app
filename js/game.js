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
    maxLives: 8,
    startLives: 3,
    /* Herz-Pakete: je mehr auf einmal, desto günstiger pro Herz */
    heartPacks: [
      { n: 1, cost: 5 },   /* 5,0 Sternchen pro Herz */
      { n: 3, cost: 12 },  /* 4,0 Sternchen pro Herz */
      { n: 5, cost: 18 }   /* 3,6 Sternchen pro Herz */
    ],
    bonusEvery: 10,      /* nach je 10 RICHTIG gelösten Aufgaben */
    maxTries: 2,         /* so oft darf pro Aufgabe daneben geraten werden */
    levelEvery: 10,      /* Level-Up nach je 10 richtigen Aufgaben */
    safariStations: 20,  /* Stationen bis zum Camp */
    safariScore: 0.5,    /* Safari ist gemütlich - dafür weniger Punkte ... */
    safariStarEvery: 2   /* ... und nur jede zweite Aufgabe bringt ein ★ */
  };

  /* Fahrzeug je Hintergrund - mit passendem Antrieb */
  const VEHICLES = {
    'stadt-tag': { sprite: 'plane', drive: 'jet' },
    'stadt-nacht': { sprite: 'heli', drive: 'rotor' },
    'weltraum': { sprite: 'ship', drive: 'flame' },
    'unterwasser': { sprite: 'sub', drive: 'bubbles' }
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
    state: 'idle',        /* idle | playing | safari | paused | bonus | mini | over */
    mode: 'arcade',       /* arcade | safari */
    settings: { grade: 1, theme: 'stadt-tag', inputMode: 'choice', speed: 3, ops: null, ranges: null },
    budget: 900,          /* Sekunden Bildschirmzeit, die zu Rundenbeginn übrig sind */
    safari: null, task: null, safariStars: 0,

    lives: 3, maxLives: 8, stars: 0, score: 0, level: 1,
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
    /* am Rand nach innen rücken, damit nichts abgeschnitten wird */
    const pad = Math.min(G.W * 0.45, 20 + (String(text).length * (size || 22)) / 3.2);
    G.floats.push({
      x: clamp(x, pad, G.W - pad), y,
      text, color: color || '#fff', size: size || 22, life: 1.1
    });
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

  function eqFont() {
    return clamp(Math.round(Math.min(G.W, G.H) * 0.055), 20, 34);
  }

  /* Die Schrift wird nur so weit verkleinert, dass auch lange Terme
     aus Klasse 6 noch auf den Bildschirm passen. */
  function measureEq(text) {
    const ctx = G.ctx;
    const maxBox = G.W - 20;
    const font = size => '700 ' + size + 'px "Baloo 2", system-ui, sans-serif';
    let fs = eqFont();
    ctx.font = font(fs);
    let w = ctx.measureText(text).width;
    while (w + 44 > maxBox && fs > 14) {
      fs--;
      ctx.font = font(fs);
      w = ctx.measureText(text).width;
    }
    return { w: Math.min(maxBox, Math.max(w + 44, 92)), h: Math.round(eqFont() * 1.85), fs };
  }

  function spawnEq() {
    const p = MathGen.create(G.settings.grade, G.level, G.settings.ops, G.settings.ranges);
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
      x, y: spawnY(), w: m.w, h: m.h, fs: m.fs,
      kind, locked: false, tries: 0, ph: Math.random() * TAU,
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
  /* Kurze Sperre nach jeder Antwort. Sie verhindert zweierlei: dass ein
     Doppeltipp versehentlich beide Versuche verbraucht, und dass man sich
     durch blindes Draufhauen durch die Antwortknöpfe rät. */
  const ANSWER_LOCK = 0.35;
  function answerBlocked() {
    if (G.time < (G.answerLock || 0)) return true;
    G.answerLock = G.time + ANSWER_LOCK;
    return false;
  }

  function fire(value) {
    if (answerBlocked()) return;
    if (G.state === 'safari') { safariAnswer(value); return; }
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

  /* Ein Fehlversuch geht immer auf die Aufgabe, die gerade als Ziel
     markiert ist. Nach CONFIG.maxTries Fehlversuchen gilt sie als falsch. */
  function onWrong() {
    G.wrongShots++;
    G.combo = 0;
    G.flash = 0.35; G.flashColor = '255,120,120';
    G.shake = Math.max(G.shake, 5);
    Sound.play('wrong');

    const tgt = G.eqs.find(e => e.id === G.targetId);
    if (!tgt) {
      float(G.W / 2, groundY() - 70, 'Daneben!', '#FF8A8A', 20);
      pushHud();
      return;
    }

    tgt.tries++;
    const left = CONFIG.maxTries - tgt.tries;
    if (left <= 0) { failEq(tgt); return; }

    float(tgt.x, tgt.y - tgt.h, left === 1 ? 'Noch 1 Versuch!' : 'Noch ' + left + ' Versuche!',
      '#FF8A8A', 20);
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

    resolveOne(true);
    if (G.correct % CONFIG.levelEvery === 0) levelUp();
    pushHud();
  }

  /* Eine Aufgabe geht verloren - entweder weil sie die Schutzlinie
     erreicht hat oder weil zu oft daneben geraten wurde. */
  function loseEq(e, atY, note) {
    G.lives--;
    G.combo = 0;
    G.flash = 0.75; G.flashColor = '255,60,60';
    G.shake = 16;
    burst(e.x, atY, ['#FF5D73', '#FF9E9E', '#FFFFFF'], 30, 420);
    ring(e.x, atY, '#FF5D73', 150);
    if (note) float(e.x, atY - 78, note, '#FF8A8A', 20);
    float(e.x, atY - 50, '= ' + MathGen.sgn(e.answer), '#FFD1D1', 26);
    Sound.play('life');
    resolveOne(false);
    pushHud();
    if (G.lives <= 0) gameOver();
  }

  function onMiss(e) {
    loseEq(e, groundY(), null);
  }

  /* Zu oft geraten: Aufgabe verschwindet sofort und zählt als falsch. */
  function failEq(e) {
    const i = G.eqs.indexOf(e);
    if (i >= 0) G.eqs.splice(i, 1);
    loseEq(e, e.y, 'Zweimal daneben!');
    updateTarget(true);
  }

  /* Für die Bonus-Station zählen ausschließlich richtig gelöste Aufgaben.
     Danebengeschossene oder durchgerutschte Aufgaben bringen einen der
     Bonus-Station keinen Schritt näher. */
  function resolveOne(correct) {
    G.resolved++;
    if (!correct) return;
    G.sinceBonus++;
    /* Im Safari zählt der Zähler nur für die Anzeige - die Bonus-Station
       wartet am Camp und wird von dort ausgelöst. */
    if (G.mode === 'safari') return;
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

  /* Wie viele richtige Aufgaben bis zur Bonus-Station bzw. bis zum Camp? */
  function bonusEvery() {
    return G.mode === 'safari' ? CONFIG.safariStations : CONFIG.bonusEvery;
  }

  function pushHud() {
    if (G.cb.onHud) G.cb.onHud({
      lives: G.lives, maxLives: G.maxLives, stars: G.stars, score: G.score,
      level: G.level, combo: G.combo, correct: G.correct,
      mode: G.mode,
      untilBonus: bonusEvery() - G.sinceBonus,
      bonusLabel: G.mode === 'safari' ? 'ZIEL in' : 'BONUS in',
      timeLeft: timeLeft()
    });
  }

  /* ================= Bildschirmzeit =================
     Das Budget gilt für das ganze Gerät und läuft nur, während wirklich
     gespielt wird. Pausen und Menüs zählen nicht mit. */
  function timeLeft() { return Math.max(0, G.budget - G.session); }

  function tickSession(dt) {
    G.session += dt;
    const left = G.budget - G.session;

    /* verbrauchte Zeit nach außen melden, damit sie dort gespeichert wird */
    G.sinceReport = (G.sinceReport || 0) + dt;
    if (G.sinceReport >= 1 || left <= 0) {
      if (G.cb.onTimeUsed) G.cb.onTimeUsed(G.sinceReport, Math.max(0, left));
      G.sinceReport = 0;
    }

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

  /* ================= Safari ================= */
  function safariTask() {
    const p = MathGen.create(G.settings.grade, G.level, G.settings.ops, G.settings.ranges);
    G.task = { text: p.text, answer: p.answer, tries: 0, choices: MathGen.choicesFor(p.answer, 4) };
    G.safari.setTask(p.text);
    if (G.cb.onChoices) G.cb.onChoices(G.task.choices);
    pushHud();
  }

  function safariAnswer(value) {
    const t = G.task;
    if (!t || G.safari.driving) return;

    if (Math.round(value) === t.answer) {
      const pts = Math.round((10 + G.level * 2) * CONFIG.safariScore);
      G.score += pts;
      G.correct++;
      G.combo++;
      G.bestCombo = Math.max(G.bestCombo, G.combo);

      /* Sternchen gibt es im Safari nur jede zweite Aufgabe */
      G.safariStars++;
      let gained = 0;
      if (G.safariStars % CONFIG.safariStarEvery === 0) { gained = 1; G.stars++; }

      const jx = G.W / 2, jy = G.H * 0.6;
      burst(jx, jy, ['#7CFF6B', '#FFE9A8', '#FFFFFF'], 18, 260);
      ring(jx, jy, '#7CFF6B', 95);
      float(jx, jy - 40, '+' + pts, '#CFFFC8', 26);
      if (gained) float(jx, jy - 12, '+1 ★', '#FFE066', 20);
      Sound.play('hit');

      G.task = null;
      G.safari.setTask('');
      if (G.cb.onChoices) G.cb.onChoices([]);
      resolveOne(true);
      if (G.correct % CONFIG.levelEvery === 0) levelUp();
      G.safari.drive();
      pushHud();
      return;
    }

    /* daneben */
    G.wrongShots++;
    G.combo = 0;
    t.tries++;
    Sound.play('wrong');
    G.flash = 0.3; G.flashColor = '255,120,120';
    const left = CONFIG.maxTries - t.tries;
    if (left > 0) {
      G.shake = Math.max(G.shake, 5);
      float(G.W / 2, G.H * 0.38, 'Noch 1 Versuch!', '#FF8A8A', 22);
      pushHud();
      return;
    }
    /* zweimal daneben: ein Herz weg, danach eine neue Aufgabe an
       derselben Station - festsitzen soll niemand */
    G.lives--;
    G.flash = 0.7; G.flashColor = '255,60,60';
    G.shake = 14;
    float(G.W / 2, G.H * 0.47, '= ' + MathGen.sgn(t.answer), '#FFD1D1', 26);
    Sound.play('life');
    resolveOne(false);
    pushHud();
    if (G.lives <= 0) { gameOver(); return; }
    safariTask();
  }

  function updateSafari(dt) {
    const ev = G.safari.update(dt, G.time);
    if (ev === 'arrived') {
      Sound.play('click');
      safariTask();
    } else if (ev === 'goal') {
      G.task = null;
      if (G.cb.onChoices) G.cb.onChoices([]);
      float(G.W / 2, G.H * 0.35, 'Camp erreicht!', '#FFD166', 34);
      G.sinceBonus = 0;
      enterBonus();
    }
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
      timeLeft: Math.round(timeLeft()), mode: G.mode
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
    if (G.cb.onBonus) G.cb.onBonus(bonusInfo());
  }

  /* Alles, was die Bonus-Station zum Anzeigen braucht */
  function bonusInfo() {
    return {
      stars: G.stars, lives: G.lives, maxLives: G.maxLives,
      timeLeft: timeLeft(), mode: G.mode,
      packs: CONFIG.heartPacks.map(p => ({
        n: p.n, cost: p.cost,
        per: Math.round(p.cost / p.n * 10) / 10,
        ok: G.stars >= p.cost && G.lives + p.n <= G.maxLives,
        tooMany: G.lives + p.n > G.maxLives
      })),
      games: MiniGames.LIST.map(g => ({
        id: g.id, icon: g.icon, name: g.name, desc: g.desc,
        cost: g.cost, seconds: g.seconds,
        ok: G.stars >= g.cost && enoughTimeForMini(g.id),
        noTime: !enoughTimeForMini(g.id)
      }))
    };
  }

  function buyHearts(n) {
    const pack = CONFIG.heartPacks.find(p => p.n === n);
    if (!pack) return false;
    if (G.stars < pack.cost || G.lives + pack.n > G.maxLives) return false;
    G.stars -= pack.cost;
    G.lives += pack.n;
    Sound.play('heart');
    pushHud();
    return true;
  }

  function resumeFromBonus() {
    if (timeLeft() <= 0) { finishSession(); return; }
    if (G.mode === 'safari') { nextLeg(); return; }
    G.state = 'playing';
    G.spawnTimer = 0.6;
    G.last = performance.now();
    pushHud();
  }

  /* ================= Bonusspiele ================= */
  /* Ein Bonusspiel lohnt sich nur, wenn die Rundenzeit noch dafür reicht. */
  function enoughTimeForMini(id) {
    const secs = id ? MiniGames.info(id).seconds : MiniGames.maxSeconds();
    return timeLeft() >= secs + 5;
  }

  /* Umgebung, die jedes Bonusspiel bekommt */
  const MINI_ENV = {
    get W() { return G.W; },
    get H() { return G.H; },
    get groundY() { return groundY(); },
    get time() { return G.time; },
    fx: {
      burst, ring, float,
      shake(v) { G.shake = Math.max(G.shake, v); }
    },
    sound(name) { Sound.play(name); },
    drawShip(ctx, x, y, s, r) { drawShip(ctx, x, y, s, r); },
    onAim(inst) { if (G.cb.onAim) G.cb.onAim(inst); }
  };

  function startMini(id, paid) {
    const info = MiniGames.info(id);
    if (paid) {
      if (G.stars < info.cost || !enoughTimeForMini(info.id)) return false;
      G.stars -= info.cost;
    }
    G.miniId = info.id;
    G.mini = MiniGames.create(info.id, MINI_ENV);
    G.state = 'mini';
    G.last = performance.now();
    Sound.play('start');
    pushHud();
    if (G.cb.onMiniStart) G.cb.onMiniStart(info, G.mini);
    return true;
  }

  function endMini() {
    if (!G.mini) return;
    const info = MiniGames.info(G.miniId);
    const r = G.mini.result();
    /* Sicherheitsnetz: nie mehr Sternchen als erlaubt */
    const gained = Math.max(0, Math.min(MiniGames.MAX_STARS, r.stars | 0));
    G.score += r.score | 0;
    G.stars += gained;
    G.mini = null;
    G.state = 'bonus';
    Sound.play(gained > 0 ? 'badge' : 'back');
    pushHud();
    if (G.cb.onMiniEnd) G.cb.onMiniEnd({
      game: info, score: r.score | 0, stars: gained, cost: info.cost, detail: r.detail || []
    });
  }

  /* ================= Fahrzeug (Pixel-Art) =================
     Welches Fahrzeug fliegt oder fährt, hängt am Hintergrund:
     Flugzeug über der Stadt, Hubschrauber in der Neon-Nacht,
     Rakete im Weltall, U-Boot unter Wasser. */
  function vehicle() {
    return VEHICLES[G.settings.theme] || VEHICLES['weltraum'];
  }

  function drawShip(ctx, x, y, s, recoil) {
    const v = vehicle();
    const sc = Math.max(2, Math.round(2.4 * (s || 1)));
    const yy = Math.round(y + (recoil || 0) * 6);
    const half = 8 * sc;   /* halbe Sprite-Höhe */

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (v.drive === 'flame') {
      /* Antriebsflamme - flackert in ganzen Pixeln */
      const fl = (2 + Math.floor((Math.sin(G.time * 19) * 0.5 + 0.5) * 3)) * sc;
      ctx.fillStyle = '#FF8C28';
      ctx.fillRect(Math.round(x - 1.5 * sc), yy + half - sc, 3 * sc, fl);
      ctx.fillStyle = '#FFD166';
      ctx.fillRect(Math.round(x - 0.5 * sc), yy + half - sc, sc, Math.round(fl * 0.6));
    } else if (v.drive === 'jet') {
      /* zwei kurze Kondensstreifen */
      const fl = (2 + Math.floor((Math.sin(G.time * 16) * 0.5 + 0.5) * 2)) * sc;
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#EAF2FF';
      ctx.fillRect(Math.round(x - 2.5 * sc), yy + half - sc, sc, fl);
      ctx.fillRect(Math.round(x + 1.5 * sc), yy + half - sc, sc, fl);
      ctx.globalAlpha = 1;
    } else if (v.drive === 'bubbles') {
      /* aufsteigende Luftblasen */
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#CFF4FF';
      for (let i = 0; i < 3; i++) {
        const ph = G.time * 1.6 + i * 0.7;
        const up = (ph % 1);
        const r = Math.max(1, Math.round((1.2 - up) * sc));
        ctx.beginPath();
        ctx.arc(Math.round(x + Math.sin(ph * 4) * 5 * sc), Math.round(yy + half - up * 26 * sc), r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    Pixel.draw(ctx, v.sprite, x, yy, sc);

    if (v.drive === 'rotor') {
      /* Rotor über der Kabine - dreht sich sichtbar */
      const a = G.time * 26;
      ctx.strokeStyle = 'rgba(224,232,255,0.85)';
      ctx.lineWidth = Math.max(2, sc);
      const len = 9 * sc;
      for (let i = 0; i < 2; i++) {
        const w = a + i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(w) * len, yy - half + 2 * sc - Math.sin(w) * len * 0.25);
        ctx.lineTo(x + Math.cos(w) * len, yy - half + 2 * sc + Math.sin(w) * len * 0.25);
        ctx.stroke();
      }
    }
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

    /* Die Bildschirmzeit läuft nur beim Spielen - Pause und Menüs zählen nicht */
    if (G.state === 'playing' || G.state === 'mini' || G.state === 'safari') {
      if (tickSession(dt)) return;
    }

    if (G.state === 'safari') { if (G.safari) updateSafari(dt); return; }

    if (G.state === 'mini') {
      if (G.mini) { G.mini.update(dt); if (G.mini.done) endMini(); }
      return;
    }
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

    const safariView = G.safari && G.mode === 'safari' && G.state !== 'mini';
    if (!safariView) Backgrounds.draw(ctx, G.time);
    const ui = Backgrounds.ui();

    if (G.safari && (G.state === 'safari' ||
        ((G.state === 'paused' || G.state === 'bonus' || G.state === 'over') && G.mode === 'safari' && !G.mini))) {
      G.safari.render(ctx, G.time);
    } else if (G.state === 'mini' && G.mini) {
      G.mini.render(ctx);
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
      G.eqs.forEach(e => {
        const isTarget = e.id === G.targetId;
        const bob = Math.sin(G.time * 2.2 + e.ph) * 3;
        const x = e.x - e.w / 2, y = e.y - e.h / 2 + bob;
        const danger = clamp((e.y - (gy - G.H * 0.28)) / (G.H * 0.28), 0, 1);

        ctx.save();
        /* weicher Schatten */
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

        /* Rahmen - das Ziel bekommt einen kräftigen Rand */
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
        ctx.font = '700 ' + (e.fs || eqFont()) + 'px "Baloo 2", system-ui, sans-serif';
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
    /* Berührungen gehen direkt an das laufende Bonusspiel.

       Wichtig: Nur Berührungen weiterreichen, die auch wirklich auf der
       Spielfläche begonnen haben, und beim Loslassen niemals
       preventDefault aufrufen. Genau das hat auf Touchgeräten sonst den
       Klick auf den FEUER-Knopf verschluckt. */
    const send = (phase, ev) => {
      if (G.state !== 'mini' || !G.mini) return;

      if (phase === 'down') {
        if (ev && ev.target !== canvas) return;   /* galt einem Knopf oder Regler */
        G.pointer.active = true;
      } else if (!G.pointer.active) {
        return;
      }

      if (phase !== 'up' && ev) { const p = pos(ev); G.pointer.x = p.x; G.pointer.y = p.y; }
      G.mini.pointer(phase, G.pointer.x, G.pointer.y);

      /* Nur beim Ziehen das Scrollen der Seite unterbinden */
      if (ev && ev.cancelable && phase !== 'up') ev.preventDefault();
      if (phase === 'up') G.pointer.active = false;
    };
    const down = ev => send('down', ev);
    const move = ev => send('move', ev);
    const up = ev => send('up', ev);

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    canvas.addEventListener('touchstart', down, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);

    const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ' ': 'fire', Enter: 'fire' };
    window.addEventListener('keydown', e => {
      G.keys[e.key] = true;
      if (G.state === 'mini' && G.mini && KEYMAP[e.key]) { G.mini.key(KEYMAP[e.key], true); e.preventDefault(); }
    });
    window.addEventListener('keyup', e => {
      G.keys[e.key] = false;
      if (G.state === 'mini' && G.mini && KEYMAP[e.key]) G.mini.key(KEYMAP[e.key], false);
    });

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
    if (G.safari) G.safari.resize(G.W, G.H);
  }

  function start(settings) {
    settings = settings || {};
    G.mode = settings.mode === 'safari' ? 'safari' : 'arcade';
    /* Bildschirmzeit, die zu Beginn dieser Runde noch übrig ist */
    G.budget = Math.max(0, settings.timeLeft != null ? settings.timeLeft : 900);
    Object.assign(G.settings, settings);
    Backgrounds.use(G.settings.theme);
    G.lives = CONFIG.startLives;
    G.maxLives = CONFIG.maxLives;
    G.stars = 0; G.score = 0; G.level = 1;
    G.combo = 0; G.bestCombo = 0; G.correct = 0; G.wrongShots = 0;
    G.resolved = 0; G.sinceBonus = 0; G.elapsed = 0;
    G.session = 0; G.warned = {}; G.lastSec = -1; G.sinceReport = 0;
    G.eqs.length = 0; G.bullets.length = 0; G.parts.length = 0;
    G.floats.length = 0; G.rings.length = 0;
    G.pendingBonus = false; G.mini = null; G.targetId = 0;
    G.spawnTimer = 0.9;
    G.safari = null; G.task = null; G.safariStars = 0; G.answerLock = 0;
    G.last = performance.now();
    Sound.setTempo(132);
    Sound.startMusic();

    if (G.mode === 'safari') {
      newLeg();
    } else {
      G.state = 'playing';
    }
    pushHud();
  }

  /* Eine Safari-Etappe: neue Strecke, Jeep fährt zur ersten Station */
  function newLeg() {
    G.safari = Safari.create({ W: G.W, H: G.H, stations: CONFIG.safariStations, theme: G.settings.theme });
    G.sinceBonus = 0;
    G.task = null;
    G.state = 'safari';
    if (G.cb.onChoices) G.cb.onChoices([]);
    G.safari.drive();
  }

  /* Nach der Bonus-Station am Camp geht es auf die nächste Etappe */
  function nextLeg() {
    newLeg();
    G.last = performance.now();
    pushHud();
  }

  function pause() {
    if (G.state === 'playing' || G.state === 'mini' || G.state === 'safari') {
      G.prevState = G.state; G.state = 'paused';
      /* Bei einer Pause ist Ruhe - das gilt auch, wenn die App in den
         Hintergrund rutscht und niemand mehr zuhört. */
      Sound.stopMusic();
    }
  }

  /* Nach einer Pause stehen andere Aufgaben da - sonst wäre die Pause
     eine bequeme Denkpause. Höhe und Position bleiben gleich, damit
     dabei keine Zeit geschenkt wird. */
  function refreshEquations() {
    G.eqs.forEach(e => {
      const p = MathGen.create(G.settings.grade, G.level, G.settings.ops, G.settings.ranges);
      const m = measureEq(p.text);
      e.text = p.text; e.answer = p.answer;
      e.w = m.w; e.h = m.h; e.fs = m.fs;
      e.choices = MathGen.choicesFor(p.answer, 4);
      e.locked = false;
      e.tries = 0;
      e.x = clamp(e.x, e.w / 2 + 10, G.W - e.w / 2 - 10);
    });
    G.bullets.length = 0;
    updateTarget(true);
  }

  function resume() {
    if (G.state !== 'paused') return;
    /* Im Safari steht der Jeep still - eine Denkpause bringt dort nichts,
       deshalb bleibt die Aufgabe dieselbe. */
    if (G.prevState === 'safari') {
      G.state = 'safari';
      G.last = performance.now();
      Sound.startMusic();
      if (G.cb.onChoices) G.cb.onChoices(G.task ? G.task.choices : []);
      return;
    }
    if (G.prevState !== 'mini') refreshEquations();
    G.state = G.prevState || 'playing';
    G.last = performance.now();
    Sound.startMusic();
  }

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
    G.safari = null; G.task = null;
  }

  function setTheme(id) { Backgrounds.use(id); G.settings.theme = id; }

  /* Höhe der Steuerung am unteren Rand, damit die Schutzlinie sichtbar bleibt. */
  function setBottomInset(px) { G.bottomInset = Math.max(0, px || 0); }

  global.Game = {
    init, start, pause, resume, quit, fire, resize, setTheme, setBottomInset,
    buyHearts, startMini, resumeFromBonus,
    get state() { return G.state; },
    get stars() { return G.stars; },
    get lives() { return G.lives; },
    get maxLives() { return G.maxLives; },
    get config() { return CONFIG; },
    get speeds() { return SPEEDS; },
    get timeLeft() { return timeLeft(); },
    get mode() { return G.mode; },
    enoughTimeForMini,
    get bonusInfo() { return bonusInfo(); },
    /* Vorschau zum Feinjustieren: wie lange fällt eine Aufgabe bei dieser
       Einstellung, in diesem Level, nach so vielen Sekunden Spielzeit? */
    fallTimeFor, spawnGapFor,
    /* Nur für Tests/Debugging: laufendes Bonusspiel */
    get miniState() { return G.mini; },
    /* Nur für Tests/Debugging: Stand der Safari-Etappe */
    get safariState() { return G.safari ? G.safari.debug() : null; },
    get task() { return G.task ? { text: G.task.text, answer: G.task.answer, tries: G.task.tries } : null; },
    /* Nur für Tests/Debugging: aktuelle Aufgaben auf dem Feld */
    get equations() { return G.eqs.map(e => ({ id: e.id, text: e.text, answer: e.answer, y: e.y, tries: e.tries })); },
    demoFrame() { render(); }
  };
})(window);
