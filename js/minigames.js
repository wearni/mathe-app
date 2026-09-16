/* ============================================================
   Mathe App - Bonusspiele

   Jedes Spiel hat die gleiche Schnittstelle:
     inst.ui        'drag' oder 'cannon'  (welche Steuerung unten erscheint)
     inst.update(dt)
     inst.render(ctx)
     inst.pointer(phase, x, y)   phase: 'down' | 'move' | 'up'
     inst.key(name, isDown)
     inst.done                   true, wenn das Spiel vorbei ist
     inst.result()               { score, stars, detail:[[gross, klein], ...] }

   Wichtig für die Balance: ein Bonusspiel kostet 8 Sternchen und gibt
   höchstens 5 zurück. Spielen kostet also immer unterm Strich Sternchen -
   die gibt es nur fürs Rechnen.
   ============================================================ */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const rf = (a, b) => a + Math.random() * (b - a);

  const MAX_STARS = 5;   /* Obergrenze für jedes Bonusspiel */

  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Gemeinsame Kopfzeile: Zeit und aktueller Stand */
  function header(ctx, env, left, right) {
    const W = env.W;
    const bw = W * 0.7, bx = (W - bw) / 2, by = 88;
    const p = clamp(left.p, 0, 1);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    rrect(ctx, bx, by, bw, 16, 8); ctx.fill();
    ctx.fillStyle = p > 0.3 ? '#7CFF6B' : '#FF5D73';
    rrect(ctx, bx + 2, by + 2, Math.max(4, (bw - 4) * p), 12, 6); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 16px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 6;
    ctx.fillText(right, W / 2, by + 44);
    ctx.restore();
  }

  /* ============================================================
     1) Alien-Jagd  -  Raumschiff bewegen, automatisch feuern
     ============================================================ */
  function alienJagd(env) {
    const D = 30;
    const st = {
      ui: 'drag', done: false, t: D,
      ship: { x: env.W / 2, y: env.groundY - 30 },
      shots: [], foes: [], kills: 0, cool: 0, spawn: 0,
      ptr: null, keys: {}
    };

    st.update = dt => {
      st.t -= dt;
      const gy = env.groundY;
      st.ship.y = gy - 30;

      if (st.ptr) st.ship.x += (st.ptr - st.ship.x) * Math.min(1, dt * 14);
      if (st.keys.left) st.ship.x -= 420 * dt;
      if (st.keys.right) st.ship.x += 420 * dt;
      st.ship.x = clamp(st.ship.x, 30, env.W - 30);

      st.cool -= dt;
      if (st.cool <= 0) { st.cool = 0.16; st.shots.push({ x: st.ship.x, y: st.ship.y - 26 }); env.sound('type'); }
      for (let i = st.shots.length - 1; i >= 0; i--) {
        st.shots[i].y -= 880 * dt;
        if (st.shots[i].y < -20) st.shots.splice(i, 1);
      }

      st.spawn -= dt;
      if (st.spawn <= 0) {
        st.spawn = rf(0.28, 0.62);
        for (let k = 0, n = ri(1, 2); k < n; k++) {
          st.foes.push({
            x: rf(36, env.W - 36), y: -30, vy: rf(80, 170), vx: rf(-50, 50),
            px: ri(3, 4), ph: Math.random() * TAU,
            c: ['#FF5D73', '#B388FF', '#7CFF6B', '#FFD166', '#4FC3F7'][ri(0, 4)]
          });
        }
      }
      for (let i = st.foes.length - 1; i >= 0; i--) {
        const f = st.foes[i];
        f.y += f.vy * dt;
        f.x += Math.sin(env.time * 2 + f.ph) * 40 * dt + f.vx * dt * 0.4;
        const half = f.px * 7;
        if (f.x < half || f.x > env.W - half) f.vx *= -1;
        f.x = clamp(f.x, half, env.W - half);
        if (f.y > env.H + 40) { st.foes.splice(i, 1); continue; }
        for (let j = st.shots.length - 1; j >= 0; j--) {
          const s = st.shots[j];
          if (Math.abs(s.x - f.x) < f.px * 6.5 && Math.abs(s.y - f.y) < f.px * 5) {
            st.shots.splice(j, 1); st.foes.splice(i, 1);
            st.kills++;
            env.fx.burst(f.x, f.y, [f.c, '#FFFFFF'], 16, 280);
            env.fx.ring(f.x, f.y, f.c, 70);
            env.fx.float(f.x, f.y, '+15', '#FFFFFF', 18);
            env.sound('hit');
            env.fx.shake(3);
            break;
          }
        }
      }
      if (st.t <= 0) st.done = true;
    };

    st.render = ctx => {
      ctx.fillStyle = '#7CFF6B';
      st.shots.forEach(s => {
        ctx.shadowColor = '#7CFF6B'; ctx.shadowBlur = 12;
        rrect(ctx, s.x - 3, s.y - 12, 6, 18, 3); ctx.fill();
      });
      ctx.shadowBlur = 0;

      st.foes.forEach(f => {
        /* Ufo als Pixel-Sprite, Rumpffarbe pro Gegner */
        Pixel.draw(ctx, 'ufo', f.x, f.y, f.px, { P: f.c },
          Math.sin(env.time * 3 + f.ph) * 0.18);
      });

      env.drawShip(ctx, st.ship.x, st.ship.y, 1.15, 0);
      header(ctx, env, { p: st.t / D }, 'ALIEN-JAGD  ' + Math.ceil(st.t) + 's  ·  ' + st.kills + ' Treffer');
    };

    st.pointer = (phase, x) => {
      if (phase === 'up') st.ptr = null; else st.ptr = x;
    };
    st.key = (name, down) => { st.keys[name] = down; };
    st.result = () => ({
      score: st.kills * 15,
      stars: Math.min(MAX_STARS, Math.floor(st.kills / 7)),
      detail: [['👾 ' + st.kills, 'Aliens getroffen']]
    });
    return st;
  }

  /* ============================================================
     2) Zielschießen  -  stationäre Kanone, Winkel und Kraft
     ============================================================ */
  function zielschiessen(env) {
    const D = 30;
    const G = 900;
    const st = {
      ui: 'cannon', done: false, t: D,
      angle: 45, power: 65,
      balls: [], targets: [], hits: 0, shots: 0, bonusHits: 0,
      cool: 0, marked: null, flash: 0
    };

    function origin() { return { x: 54, y: env.groundY - 20 }; }
    function velocity() {
      const a = st.angle * Math.PI / 180;
      const v = st.power * 9.2;
      return { vx: Math.cos(a) * v, vy: -Math.sin(a) * v };
    }

    function newTarget() {
      const W = env.W, gy = env.groundY;
      return {
        x: rf(W * 0.38, W - 46),
        y: rf(Math.max(env.H * 0.26, 200), gy - 80),
        r: rf(20, 30),
        drift: rf(-26, 26),
        bob: rf(0.6, 1.6), ph: Math.random() * TAU,
        c: ['#FF5D73', '#FFD166', '#7CFF6B', '#4FC3F7', '#B388FF'][ri(0, 4)],
        born: 0
      };
    }
    for (let i = 0; i < 5; i++) st.targets.push(newTarget());

    st.fire = () => {
      if (st.done || st.cool > 0) return;
      const o = origin(), v = velocity();
      st.balls.push({ x: o.x + Math.cos(st.angle * Math.PI / 180) * 40, y: o.y - Math.sin(st.angle * Math.PI / 180) * 40, vx: v.vx, vy: v.vy, trail: [] });
      st.shots++;
      st.cool = 0.35;
      st.flash = 1;
      env.sound('shoot');
      env.fx.shake(4);
    };

    st.update = dt => {
      st.t -= dt;
      st.cool -= dt;
      if (st.flash > 0) st.flash -= dt * 4;

      st.targets.forEach(tg => {
        tg.born += dt;
        tg.x += tg.drift * dt;
        if (tg.x < env.W * 0.34) { tg.x = env.W * 0.34; tg.drift *= -1; }
        if (tg.x > env.W - 30) { tg.x = env.W - 30; tg.drift *= -1; }
      });

      for (let i = st.balls.length - 1; i >= 0; i--) {
        const b = st.balls[i];
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 16) b.trail.shift();
        b.vy += G * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        let gone = b.y > env.groundY - 4 || b.x > env.W + 60 || b.x < -60;
        for (let j = st.targets.length - 1; j >= 0; j--) {
          const tg = st.targets[j];
          const yy = tg.y + Math.sin(env.time * tg.bob + tg.ph) * 10;
          if (Math.hypot(b.x - tg.x, b.y - yy) < tg.r + 7) {
            const isMarked = st.marked === tg;
            st.hits++;
            if (isMarked) { st.bonusHits++; st.marked = null; }
            env.fx.burst(tg.x, yy, [tg.c, '#FFFFFF'], isMarked ? 28 : 18, 320);
            env.fx.ring(tg.x, yy, tg.c, 100);
            env.fx.float(tg.x, yy - 10, isMarked ? '+60 ZIEL!' : '+30', isMarked ? '#FFD166' : '#FFFFFF', isMarked ? 24 : 20);
            env.sound(isMarked ? 'golden' : 'hit');
            env.fx.shake(isMarked ? 7 : 4);
            st.targets.splice(j, 1);
            st.targets.push(newTarget());
            gone = true;
            break;
          }
        }
        if (gone) {
          if (b.y > env.groundY - 6) {
            env.fx.burst(b.x, env.groundY, ['#cfd6ff', '#8fa0d0'], 8, 160);
            env.sound('back');
          }
          st.balls.splice(i, 1);
        }
      }

      if (st.t <= 0) st.done = true;
    };

    /* gestrichelte Vorschau der Flugbahn */
    function preview(ctx) {
      const o = origin(), v = velocity();
      let x = o.x + Math.cos(st.angle * Math.PI / 180) * 40;
      let y = o.y - Math.sin(st.angle * Math.PI / 180) * 40;
      let vx = v.vx, vy = v.vy;
      const dt = 1 / 40;
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
      for (let i = 0; i < 80; i++) {
        vy += G * dt; x += vx * dt; y += vy * dt;
        if (y > env.groundY - 4 || x > env.W + 20) break;
        if (i % 3 === 0) {
          ctx.globalAlpha = 0.85 * (1 - i / 80);
          ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }

    st.render = ctx => {
      const o = origin();

      st.targets.forEach(tg => {
        const yy = tg.y + Math.sin(env.time * tg.bob + tg.ph) * 10;
        const isMarked = st.marked === tg;
        const pop = Math.min(1, tg.born * 4);
        ctx.save();
        ctx.translate(tg.x, yy);
        ctx.scale(pop, pop);
        if (isMarked) {
          ctx.strokeStyle = '#FFD166'; ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -env.time * 20;
          ctx.beginPath(); ctx.arc(0, 0, tg.r + 12, 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
        /* Ballon */
        ctx.fillStyle = tg.c;
        ctx.beginPath(); ctx.ellipse(0, 0, tg.r * 0.85, tg.r, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.ellipse(-tg.r * 0.28, -tg.r * 0.3, tg.r * 0.2, tg.r * 0.3, -0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = tg.c;
        ctx.beginPath(); ctx.moveTo(-4, tg.r * 0.95); ctx.lineTo(4, tg.r * 0.95); ctx.lineTo(0, tg.r * 1.2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, tg.r * 1.2); ctx.quadraticCurveTo(6, tg.r * 1.7, 0, tg.r * 2.2); ctx.stroke();
        /* Zielkreuz */
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
        ctx.restore();
      });

      preview(ctx);

      /* Podest, damit die Kanone nicht in der Luft steht */
      ctx.save();
      ctx.fillStyle = '#2b3566';
      rrect(ctx, o.x - 48, o.y + 6, 96, 40, 10); ctx.fill();
      ctx.fillStyle = '#3c4880';
      rrect(ctx, o.x - 48, o.y + 6, 96, 10, 5); ctx.fill();
      ctx.restore();

      /* Kanone */
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.save();
      ctx.rotate(-st.angle * Math.PI / 180);
      const rec = Math.max(0, st.flash) * 8;
      ctx.fillStyle = '#5b6ab8';
      rrect(ctx, -6 - rec, -11, 46, 22, 9); ctx.fill();
      ctx.fillStyle = '#8a9be8';
      rrect(ctx, -4 - rec, -8, 42, 7, 4); ctx.fill();
      ctx.fillStyle = '#39456f';
      rrect(ctx, 34 - rec, -12, 8, 24, 4); ctx.fill();
      if (st.flash > 0.2) {
        ctx.fillStyle = 'rgba(255,214,102,' + st.flash + ')';
        ctx.beginPath(); ctx.arc(46 - rec, 0, 16 * st.flash, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#E63E62';
      ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2b3566';
      rrect(ctx, -20, -2, 40, 16, 6); ctx.fill();
      ctx.fillStyle = '#1a2049';
      ctx.beginPath(); ctx.arc(-11, 14, 8, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(11, 14, 8, 0, TAU); ctx.fill();
      ctx.restore();

      /* Kugeln */
      st.balls.forEach(b => {
        ctx.save();
        b.trail.forEach((p, i) => {
          ctx.globalAlpha = (i / b.trail.length) * 0.4;
          ctx.fillStyle = '#FFD166';
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowColor = '#FFD166'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#FFE9A8';
        ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, TAU); ctx.fill();
        ctx.restore();
      });

      header(ctx, env, { p: st.t / D }, 'ZIELSCHIESSEN  ' + Math.ceil(st.t) + 's  ·  ' + st.hits + ' Treffer');

      if (!st.marked) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '700 14px "Baloo 2", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tippe einen Ballon an – zählt doppelt!', env.W / 2, 178);
        ctx.restore();
      }
    };

    /* Ziel per Antippen auswählen */
    st.pointer = (phase, x, y) => {
      if (phase !== 'down') return;
      let best = null, bd = 44;
      st.targets.forEach(tg => {
        const yy = tg.y + Math.sin(env.time * tg.bob + tg.ph) * 10;
        const d = Math.hypot(x - tg.x, y - yy) - tg.r;
        if (d < bd) { bd = d; best = tg; }
      });
      if (best) { st.marked = best; env.sound('click'); }
    };
    st.key = (name, down) => {
      if (!down) return;
      if (name === 'left') st.setAngle(st.angle + 2);
      if (name === 'right') st.setAngle(st.angle - 2);
      if (name === 'fire') st.fire();
    };
    st.setAngle = v => { st.angle = clamp(Math.round(v), 5, 85); if (env.onAim) env.onAim(st); };
    st.setPower = v => { st.power = clamp(Math.round(v), 20, 100); if (env.onAim) env.onAim(st); };
    st.result = () => ({
      score: st.hits * 30 + st.bonusHits * 30,
      stars: Math.min(MAX_STARS, Math.floor(st.hits / 3)),
      detail: [['🎯 ' + st.hits, 'Ballons getroffen'], ['⭐ ' + st.bonusHits, 'davon Zielballons']]
    });
    return st;
  }

  /* ============================================================
     3) Dosenwerfen  -  Verlet-Physik
        Jede Dose besteht aus zwei Punkten (unten/oben), die durch
        eine feste Strecke verbunden sind. Dadurch kippen, rollen und
        stürzen die Dosen von selbst überzeugend.
     ============================================================ */
  function dosenwerfen(env) {
    const D = 45;
    const GRAV = 2000;
    const SUB = 3;          /* Teilschritte pro Bild */
    const ITER = 6;         /* Durchläufe für die Zwangsbedingungen */
    const R = 6;            /* Radius der vier Eckpunkte */
    const BW = 16, BH = 32; /* Abstand der Eckpunkte - BW muss klar größer
                               als 2*R sein, sonst hat die Dose keinen Stand */
    const CW = BW + 2 * R, CH = BH + 2 * R;   /* sichtbare Größe */
    const DIAG = Math.hypot(BW, BH);

    const st = {
      ui: 'drag', done: false, t: D,
      cans: [], ball: null, ballsLeft: 3,
      aim: null, thrown: 0, settle: 0, armed: 0,
      tableY: 0, tableX0: 0, floorY: 0
    };

    function layout() {
      st.floorY = env.groundY;
      st.tableY = env.groundY - env.H * 0.08;
      st.tableX0 = env.W * 0.46;
    }
    layout();

    function pt(x, y) { return { x, y, px: x, py: y }; }

    /* Eine Dose besteht aus vier Eckpunkten mit festen Abständen.
       Die zwei unteren Punkte geben ihr einen echten Stand - dadurch
       bleibt der Stapel stehen und kippt erst beim Treffer um. */
    function makeCan(cx, bottomY, color) {
      const l = cx - BW / 2, r = cx + BW / 2;
      return {
        p: [pt(l, bottomY), pt(r, bottomY), pt(r, bottomY - BH), pt(l, bottomY - BH)],
        c: color, down: false
      };
    }

    const COLORS = ['#FF5D73', '#FFD166', '#7CFF6B', '#4FC3F7', '#B388FF', '#FF9E6B'];
    function buildStack() {
      st.cans.length = 0;
      const rows = [3, 2, 1];
      const stepX = CW + 1;
      const cx = (st.tableX0 + env.W - 20) / 2;
      let k = 0;
      rows.forEach((n, row) => {
        const bottomY = st.tableY - R - row * CH;
        for (let i = 0; i < n; i++) {
          st.cans.push(makeCan(cx + (i - (n - 1) / 2) * stepX, bottomY, COLORS[k++ % COLORS.length]));
        }
      });
    }
    buildStack();

    const BALL_X = 48;
    function ballHome() { return { x: BALL_X, y: env.groundY - 78 }; }

    function throwBall(vx, vy) {
      const h = ballHome();
      st.ball = { x: h.x, y: h.y, px: h.x - vx / 60, py: h.y - vy / 60, r: 15, live: true, age: 0 };
      st.ballsLeft--;
      st.thrown++;
      env.sound('shoot');
    }

    /* ---------- Physik (Verlet) ---------- */
    function integrate(p, dt, damp) {
      let vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
      /* winzige Restbewegung ganz abstellen, sonst zittert der Stapel */
      if (Math.abs(vx) < 0.02) vx = 0;
      if (Math.abs(vy) < 0.02) vy = 0;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + GRAV * dt * dt;
    }

    function stick(a, b, len, stiff) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const f = (d - len) / d * 0.5 * (stiff === undefined ? 1 : stiff);
      a.x += dx * f; a.y += dy * f;
      b.x -= dx * f; b.y -= dy * f;
    }

    /* Trennt zwei Kreise und bremst dabei das seitliche Abgleiten ab -
       ohne diese Reibung rutscht ein Dosenstapel von selbst auseinander. */
    function pushApart(a, b, minD, wa, wb, fric) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > minD * minD || d2 < 0.000001) return;
      const d = Math.sqrt(d2);
      const push = (minD - d) / d;
      a.x -= dx * push * wa; a.y -= dy * push * wa;
      b.x += dx * push * wb; b.y += dy * push * wb;

      if (!fric) return;
      const nx = dx / d, ny = dy / d;
      const rvx = (a.x - a.px) - (b.x - b.px);
      const rvy = (a.y - a.py) - (b.y - b.py);
      const dot = rvx * nx + rvy * ny;
      const tvx = rvx - dot * nx, tvy = rvy - dot * ny;
      a.px += tvx * fric * wa; a.py += tvy * fric * wa;
      b.px -= tvx * fric * wb; b.py -= tvy * fric * wb;
    }

    function surfaceUnder(x) {
      return (x > st.tableX0 && x < env.W - 2) ? st.tableY : st.floorY;
    }

    function collidePoint(p, r) {
      /* seitliche Wände */
      if (p.x < r) { p.x = r; }
      if (p.x > env.W - r) { p.x = env.W - r; }
      /* Tischkante: von links nicht durchrutschen */
      if (p.y + r > st.tableY && p.y - r < st.floorY && p.x > st.tableX0 - r && p.x < st.tableX0) {
        p.x = st.tableX0 - r;
      }
      /* Auflagefläche */
      const sy = surfaceUnder(p.x);
      if (p.y + r > sy) {
        p.y = sy - r;
        const vx = p.x - p.px;
        p.px = p.x - vx * 0.5;     /* Reibung */
      }
      if (p.y + r > st.floorY) {
        p.y = st.floorY - r;
        const vx = p.x - p.px;
        p.px = p.x - vx * 0.5;
      }
    }

    function physics(dt) {
      const h = dt / SUB;
      for (let s = 0; s < SUB; s++) {
        st.cans.forEach(c => c.p.forEach(p => integrate(p, h, 0.99)));
        if (st.ball && st.ball.live) {
          const b = st.ball;
          const nx = b.x + (b.x - b.px) * 0.999;
          const ny = b.y + (b.y - b.py) * 0.999 + GRAV * h * h;
          b.px = b.x; b.py = b.y; b.x = nx; b.y = ny;
          b.age += h;
        }

        for (let it = 0; it < ITER; it++) {
          /* Form der Dose halten: vier Kanten und zwei Diagonalen */
          st.cans.forEach(c => {
            const p = c.p;
            stick(p[0], p[1], BW); stick(p[1], p[2], BH);
            stick(p[2], p[3], BW); stick(p[3], p[0], BH);
            stick(p[0], p[2], DIAG); stick(p[1], p[3], DIAG);
          });

          /* Dose gegen Dose (Reibung nur im letzten Durchlauf) */
          const fric = (it === ITER - 1) ? 0.5 : 0;
          for (let i = 0; i < st.cans.length; i++) {
            for (let j = i + 1; j < st.cans.length; j++) {
              const pi = st.cans[i].p, pj = st.cans[j].p;
              for (let a = 0; a < 4; a++) {
                for (let b = 0; b < 4; b++) pushApart(pi[a], pj[b], R * 2, 0.5, 0.5, fric);
              }
            }
          }

          /* Ball gegen Dosen - der Ball ist schwer und lässt sich kaum bremsen */
          if (st.ball && st.ball.live) {
            st.cans.forEach(c => c.p.forEach(p => pushApart(st.ball, p, R + st.ball.r, 0.1, 0.9)));
          }

          st.cans.forEach(c => c.p.forEach(p => collidePoint(p, R)));
          if (st.ball && st.ball.live) collidePoint(st.ball, st.ball.r);
        }
      }
    }

    function canAngle(c) {
      const p = c.p;
      const dx = (p[1].x + p[2].x) / 2 - (p[0].x + p[3].x) / 2;
      const dy = (p[1].y + p[2].y) / 2 - (p[0].y + p[3].y) / 2;
      return Math.atan2(dy, dx);   /* 0 = aufrecht */
    }

    function checkDown() {
      if (st.armed < 0.8) return;
      st.cans.forEach(c => {
        if (c.down) return;
        const tilt = Math.abs(canAngle(c)) * 180 / Math.PI;
        const lowest = Math.max.apply(null, c.p.map(p => p.y));
        const fell = lowest > st.tableY + 30;
        if (tilt > 42 || fell) {
          c.down = true;
          const cx = (c.p[0].x + c.p[2].x) / 2, cy = (c.p[0].y + c.p[2].y) / 2;
          env.fx.burst(cx, cy, [c.c, '#FFFFFF'], 12, 220);
          env.fx.float(cx, cy - 26, '+40', '#FFE066', 20);
          env.sound('hit');
          env.fx.shake(3);
        }
      });
    }

    function downCount() { return st.cans.filter(c => c.down).length; }

    st.update = dt => {
      layout();
      st.t -= dt;
      st.armed += dt;
      physics(dt);
      checkDown();

      if (st.ball && st.ball.live) {
        const b = st.ball;
        const speed = Math.hypot(b.x - b.px, b.y - b.py);
        if (b.age > 1.4 && speed < 0.5) b.live = false;
        if (b.x > env.W + 80 || b.y > env.H + 80) b.live = false;
        if (!b.live) st.settle = 1.3;
      }
      if (st.settle > 0) {
        st.settle -= dt;
        if (st.settle <= 0) {
          if (st.ballsLeft > 0) { st.ball = null; st.aim = null; }
          else st.done = true;
        }
      }
      if (downCount() === st.cans.length && st.settle <= 0 && st.armed > 1) st.settle = 1.2;
      if (st.t <= 0) st.done = true;
    };

    st.render = ctx => {
      const W = env.W;

      /* Tisch */
      ctx.save();
      ctx.fillStyle = '#8D5A3B';
      rrect(ctx, st.tableX0, st.tableY, W - st.tableX0 + 10, 14, 5); ctx.fill();
      ctx.fillStyle = '#A9714C';
      rrect(ctx, st.tableX0, st.tableY, W - st.tableX0 + 10, 6, 3); ctx.fill();
      ctx.fillStyle = '#6E432A';
      ctx.fillRect(st.tableX0 + 16, st.tableY + 14, 14, st.floorY - st.tableY - 14);
      ctx.fillRect(W - 46, st.tableY + 14, 14, st.floorY - st.tableY - 14);
      ctx.restore();

      /* Dosen */
      st.cans.forEach(c => {
        const p = c.p;
        const cx = (p[0].x + p[1].x + p[2].x + p[3].x) / 4;
        const cy = (p[0].y + p[1].y + p[2].y + p[3].y) / 4;
        const ang = canAngle(c);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        ctx.fillStyle = c.down ? '#8b90a6' : c.c;
        rrect(ctx, -CW / 2, -CH / 2, CW, CH, 6); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        /* Deckel und Boden */
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        rrect(ctx, -CW / 2 + 2, -CH / 2 + 1, CW - 4, 5, 2); ctx.fill();
        rrect(ctx, -CW / 2 + 2, CH / 2 - 6, CW - 4, 5, 2); ctx.fill();
        /* Etikett */
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        rrect(ctx, -CW / 2 + 1, -CH * 0.20, CW - 2, CH * 0.40, 2); ctx.fill();
        ctx.fillStyle = c.down ? '#8b90a6' : c.c;
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
        ctx.restore();
      });

      /* Ball oder Wurfvorbereitung */
      const home = ballHome();
      const drawBall = (x, y, r) => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 2, x, y, r);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#E63E62');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.restore();
      };

      if (st.ball) {
        drawBall(st.ball.x, st.ball.y, st.ball.r);
      } else if (st.ballsLeft > 0) {
        drawBall(home.x, home.y, 15);
        if (st.aim) {
          const dxx = st.aim.x - home.x, dyy = st.aim.y - home.y;
          const pw = Math.min(Math.hypot(dxx, dyy), 190);
          const a = Math.atan2(dyy, dxx);
          let px = home.x, py = home.y, vx = Math.cos(a) * pw * 7, vy = Math.sin(a) * pw * 7;
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          const dt = 1 / 40;
          for (let i = 0; i < 70; i++) {
            vy += GRAV * dt; px += vx * dt; py += vy * dt;
            if (py > st.floorY || px > env.W) break;
            if (i % 3 === 0) {
              ctx.globalAlpha = 0.7 * (1 - i / 70);
              ctx.beginPath(); ctx.arc(px, py, 3.5, 0, TAU); ctx.fill();
            }
          }
          ctx.restore();
        }
      }

      /* verbleibende Bälle */
      for (let i = 0; i < st.ballsLeft - (st.ball ? 0 : 1); i++) {
        ctx.fillStyle = '#E63E62';
        ctx.beginPath(); ctx.arc(24 + i * 20, env.groundY - 16, 7, 0, TAU); ctx.fill();
      }

      header(ctx, env, { p: st.t / D },
        'DOSENWERFEN  ' + Math.ceil(st.t) + 's  ·  ' + downCount() + '/' + st.cans.length + ' Dosen');

      if (!st.ball && st.ballsLeft > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '700 14px "Baloo 2", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Vom Ball aus in Wurfrichtung ziehen', env.W / 2, 178);
        ctx.restore();
      }
    };

    st.pointer = (phase, x, y) => {
      if (st.done || st.ball || st.ballsLeft <= 0) return;
      if (phase === 'down' || phase === 'move') { st.aim = { x, y }; return; }
      if (phase === 'up' && st.aim) {
        const h = ballHome();
        const dx = st.aim.x - h.x, dy = st.aim.y - h.y;
        const pw = Math.min(Math.hypot(dx, dy), 190);
        if (pw < 24) { st.aim = null; return; }
        const a = Math.atan2(dy, dx);
        throwBall(Math.cos(a) * pw * 7, Math.sin(a) * pw * 7);
        st.aim = null;
      }
    };
    st.key = () => { };
    st.result = () => {
      const n = downCount();
      const all = n === st.cans.length;
      return {
        score: n * 40 + (all ? 100 : 0),
        stars: Math.min(MAX_STARS, Math.max(0, n - 1)),
        detail: [['🥫 ' + n + '/' + st.cans.length, 'Dosen umgeworfen'],
        [all ? '🎉 alle!' : '🎳 ' + st.thrown, all ? 'Bonus +100' : 'Würfe gebraucht']]
      };
    };
    return st;
  }

  /* ============================================================ */
  const GAMES = { alien: alienJagd, kanone: zielschiessen, dosen: dosenwerfen };

  const LIST = [
    { id: 'alien', icon: '👾', name: 'Alien-Jagd', desc: '30 Sek. abschießen', cost: 8, seconds: 30 },
    { id: 'kanone', icon: '🎯', name: 'Zielschießen', desc: 'Winkel einstellen', cost: 8, seconds: 30 },
    { id: 'dosen', icon: '🥫', name: 'Dosenwerfen', desc: '3 Bälle, 6 Dosen', cost: 8, seconds: 45 }
  ];

  function create(id, env) {
    const fn = GAMES[id] || GAMES.alien;
    return fn(env);
  }
  function info(id) { return LIST.find(g => g.id === id) || LIST[0]; }
  function maxSeconds() { return Math.max.apply(null, LIST.map(g => g.seconds)); }

  global.MiniGames = { LIST, create, info, maxSeconds, MAX_STARS };
})(window);
