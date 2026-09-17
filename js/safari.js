/* ============================================================
   Mathe App - Safari-Modus

   Vogelperspektive: Ein Jeep fährt über eine kurvige Piste von
   Station zu Station. Weiter geht es nur mit einer richtigen
   Antwort. Nach der letzten Station wartet das Camp - dort gibt
   es die Bonus-Station wie gewohnt.

   Diese Datei kümmert sich nur um die Welt: Strecke, Landschaft,
   Jeep und das Schild mit der Aufgabe. Punkte, Herzen und der
   Spielablauf stecken in game.js.
   ============================================================ */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rf = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const SEG = 250;          /* Abstand zweier Stationen (Weltkoordinaten) */
  const DRIVE = 210;        /* Fahrtempo in Pixeln pro Sekunde */
  const ROAD = 52;          /* Breite der Piste */

  const COL = {
    sand: '#C8A96B',
    sandDark: '#A98A4E',
    grass1: '#9FAE5C',
    grass2: '#8B9C4E',
    road: '#D9C08A',
    roadEdge: '#9B7C46',
    rut: '#BFA271',
    water: '#5EC6E8',
    waterEdge: '#3E9BBB',
    rock: '#9A9384',
    rockDark: '#726C60',
    bush: '#6E8F45',
    bushDark: '#557034',
    trunk: '#7A5230',
    leaf: '#6FA24C',
    leafDark: '#537C39',
    wood: '#8A5A33',
    woodDark: '#5E3C21',
    board: '#E8D5A8'
  };

  /* ---------------- Strecke ---------------- */
  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
  }

  /* Wegpunkte: 0 = Start, 1..n = Stationen mit Aufgabe, n+1 = Ziel */
  function waypoints(n, width) {
    const amp = clamp(width * 0.3, 70, 150);
    const ph = Math.random() * TAU;
    const out = [];
    for (let i = -1; i <= n + 2; i++) {
      out.push({
        x: Math.sin(i * 0.85 + ph) * amp + Math.sin(i * 0.31 + ph * 2) * amp * 0.45,
        y: -i * SEG
      });
    }
    return out;   /* enthält je einen Hilfspunkt vor dem Start und hinter dem Ziel */
  }

  function buildPath(wps) {
    const poly = [], marks = [];
    let d = 0;
    poly.push({ x: wps[1].x, y: wps[1].y, d: 0 });
    marks.push(0);
    for (let i = 1; i < wps.length - 2; i++) {
      const p0 = wps[i - 1], p1 = wps[i], p2 = wps[i + 1], p3 = wps[i + 2];
      for (let s = 1; s <= 18; s++) {
        const p = catmull(p0, p1, p2, p3, s / 18);
        const prev = poly[poly.length - 1];
        d += Math.hypot(p.x - prev.x, p.y - prev.y);
        poly.push({ x: p.x, y: p.y, d });
      }
      marks.push(d);
    }
    return { poly, marks, length: d };
  }

  function posAt(path, d) {
    const poly = path.poly;
    d = clamp(d, 0, path.length);
    let lo = 0, hi = poly.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (poly[mid].d <= d) lo = mid; else hi = mid;
    }
    const a = poly[lo], b = poly[Math.min(lo + 1, poly.length - 1)];
    const span = Math.max(0.0001, b.d - a.d);
    const t = clamp((d - a.d) / span, 0, 1);
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      ang: Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2
    };
  }

  /* ---------------- Landschaft ---------------- */
  function buildDecor(path, wps, n) {
    const out = [];
    const kinds = ['tree', 'tree', 'tree', 'bush', 'bush', 'rock', 'grass'];
    for (let i = 1; i < wps.length - 2; i++) {
      const here = wps[i], next = wps[i + 1];
      const nx = -(next.y - here.y), ny = next.x - here.x;
      const len = Math.max(1, Math.hypot(nx, ny));
      for (let k = 0; k < 7; k++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const off = rf(82, 255) * side;
        const along = rf(-0.4, 0.6);
        let kind = pick(kinds);
        if (Math.random() < 0.10) kind = 'giraffe';
        else if (Math.random() < 0.09) kind = 'elephant';
        else if (Math.random() < 0.06) kind = 'water';
        out.push({
          kind,
          x: here.x + (next.x - here.x) * along + (nx / len) * off,
          y: here.y + (next.y - here.y) * along + (ny / len) * off,
          s: rf(0.8, 1.35), ph: Math.random() * TAU, flip: Math.random() < 0.5
        });
      }
    }
    /* Grasbüschel dicht an der Piste, damit der Rand lebendig wirkt */
    for (let j = 0; j < path.poly.length; j += 4) {
      const p = path.poly[j];
      out.push({
        kind: 'tuft', x: p.x + rf(-1, 1) * rf(36, 52), y: p.y + rf(-14, 14),
        s: rf(0.6, 1), ph: Math.random() * TAU
      });
    }
    return out.sort((a, b) => a.y - b.y);
  }

  /* ---------------- Zeichnen ---------------- */
  function ground(ctx, W, H, cam, time) {
    ctx.fillStyle = COL.sand;
    ctx.fillRect(0, 0, W, H);
    /* weiche Grasflecken - fest an die Welt gekoppelt, damit nichts flimmert */
    const step = 190;
    const x0 = Math.floor(cam.x / step) - 1, x1 = Math.ceil((cam.x + W) / step) + 1;
    const y0 = Math.floor(cam.y / step) - 1, y1 = Math.ceil((cam.y + H) / step) + 1;
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const seed = Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453;
        const f = seed - Math.floor(seed);
        if (f < 0.42) continue;
        const cx = gx * step + f * 120 - cam.x;
        const cy = gy * step + (f * 7 % 1) * 120 - cam.y;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = f > 0.75 ? COL.grass2 : COL.grass1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 60 + f * 70, 40 + f * 40, f * 3, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function road(ctx, path, cam) {
    const poly = path.poly;
    const line = (w, color, dash) => {
      ctx.beginPath();
      for (let i = 0; i < poly.length; i++) {
        const x = poly[i].x - cam.x, y = poly[i].y - cam.y;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = w; ctx.strokeStyle = color;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash(dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    ctx.save();
    line(ROAD + 10, COL.roadEdge);
    line(ROAD, COL.road);
    line(5, COL.rut, [22, 16]);
    ctx.restore();
  }

  function tree(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x + 6 * s, y + 8 * s, 26 * s, 16 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.trunk;
    ctx.fillRect(x - 3 * s, y - 4 * s, 6 * s, 12 * s);
    ctx.fillStyle = COL.leafDark;
    ctx.beginPath(); ctx.ellipse(x, y - 8 * s, 30 * s, 18 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.leaf;
    ctx.beginPath(); ctx.ellipse(x - 4 * s, y - 12 * s, 24 * s, 14 * s, 0, 0, TAU); ctx.fill();
  }

  function bush(ctx, x, y, s) {
    ctx.fillStyle = COL.bushDark;
    ctx.beginPath(); ctx.ellipse(x, y, 17 * s, 12 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.bush;
    ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 3 * s, 12 * s, 9 * s, 0, 0, TAU); ctx.fill();
  }

  function rock(ctx, x, y, s) {
    ctx.fillStyle = COL.rockDark;
    ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 15 * s, 10 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.rock;
    ctx.beginPath(); ctx.ellipse(x - 2 * s, y - 2 * s, 11 * s, 8 * s, 0, 0, TAU); ctx.fill();
  }

  function grass(ctx, x, y, s, t, ph) {
    ctx.strokeStyle = COL.grass2;
    ctx.lineWidth = 2 * s;
    const sway = Math.sin(t * 1.6 + ph) * 3 * s;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 5 * s, y);
      ctx.quadraticCurveTo(x + i * 5 * s + sway, y - 9 * s, x + i * 6 * s + sway * 1.6, y - 15 * s);
      ctx.stroke();
    }
  }

  function water(ctx, x, y, s, t) {
    ctx.fillStyle = COL.waterEdge;
    ctx.beginPath(); ctx.ellipse(x, y, 46 * s, 30 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.water;
    ctx.beginPath(); ctx.ellipse(x, y, 40 * s, 25 * s, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#EAFBFF'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 20 * s + Math.sin(t * 1.4) * 4, 12 * s, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function shadow(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, TAU); ctx.fill();
  }

  /* Schild mit der Aufgabe - steht neben der Station */
  function signpost(ctx, x, y, text, fs, highlight, t) {
    const pad = 18;
    ctx.save();
    ctx.font = '800 ' + fs + 'px "Baloo 2", system-ui, sans-serif';
    const w = Math.max(96, ctx.measureText(text).width + pad * 2);
    const h = fs * 1.7;
    const by = y - 96 - h;

    /* Pfosten */
    ctx.fillStyle = COL.woodDark;
    ctx.fillRect(x - 5, by + h - 4, 10, 66);

    /* Brett */
    const bob = highlight ? Math.sin(t * 2.4) * 2 : 0;
    ctx.translate(0, bob);
    ctx.fillStyle = COL.wood;
    ctx.fillRect(x - w / 2 - 5, by - 5, w + 10, h + 10);
    ctx.fillStyle = COL.board;
    ctx.fillRect(x - w / 2, by, w, h);
    if (highlight) {
      ctx.strokeStyle = '#FFD166';
      ctx.lineWidth = 4;
      ctx.strokeRect(x - w / 2 - 7, by - 7, w + 14, h + 14);
    }
    ctx.fillStyle = '#3B2A12';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + h / 2 + 1);
    ctx.restore();
  }

  function marker(ctx, x, y, num, done) {
    ctx.save();
    shadow(ctx, x + 4, y + 6, 15, 8);
    ctx.fillStyle = done ? '#7CFF6B' : '#F4F7FF';
    ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.woodDark;
    ctx.font = '800 15px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(done ? '✓' : String(num), x, y + 1);
    ctx.restore();
  }

  function camp(ctx, x, y, t) {
    ctx.save();
    shadow(ctx, x, y + 18, 62, 20);
    /* Zelt */
    ctx.fillStyle = '#D9A441';
    ctx.beginPath();
    ctx.moveTo(x - 46, y + 16); ctx.lineTo(x, y - 34); ctx.lineTo(x + 46, y + 16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#B5842C';
    ctx.beginPath();
    ctx.moveTo(x, y - 34); ctx.lineTo(x + 46, y + 16); ctx.lineTo(x + 12, y + 16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5E3C21';
    ctx.beginPath();
    ctx.moveTo(x - 13, y + 16); ctx.lineTo(x, y - 12); ctx.lineTo(x + 13, y + 16);
    ctx.closePath(); ctx.fill();
    /* Fahne */
    ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 52, y + 16); ctx.lineTo(x + 52, y - 48); ctx.stroke();
    ctx.fillStyle = '#E63E62';
    const w = 26 + Math.sin(t * 3) * 3;
    ctx.beginPath();
    ctx.moveTo(x + 52, y - 48); ctx.lineTo(x + 52 + w, y - 40); ctx.lineTo(x + 52, y - 30);
    ctx.closePath(); ctx.fill();
    /* Lagerfeuer */
    ctx.fillStyle = '#7A5230';
    ctx.fillRect(x - 60, y + 8, 22, 5);
    ctx.fillStyle = '#FF8C28';
    const f = 10 + Math.sin(t * 9) * 4;
    ctx.beginPath();
    ctx.moveTo(x - 49, y + 8); ctx.lineTo(x - 43, y + 8 - f); ctx.lineTo(x - 55, y + 8 - f * 0.7);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function gate(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = COL.woodDark;
    ctx.fillRect(x - 52, y - 6, 10, 46);
    ctx.fillRect(x + 42, y - 6, 10, 46);
    ctx.fillStyle = COL.wood;
    ctx.fillRect(x - 58, y - 22, 116, 18);
    ctx.fillStyle = COL.board;
    ctx.font = '800 13px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SAFARI', x, y - 12);
    ctx.restore();
  }

  /* ---------------- Welt ---------------- */
  function create(opts) {
    opts = opts || {};
    const n = Math.max(3, opts.stations || 20);
    let W = opts.W || 360, H = opts.H || 640;

    const wps = waypoints(n, W);
    const path = buildPath(wps);
    const decor = buildDecor(path, wps, n);

    const world = {
      stationCount: n,
      index: 0,            /* wie viele Stationen geschafft sind */
      done: [],            /* gelöste Stationen */
      atGoal: false,
      driving: false,
      task: '',
      dist: path.marks[0],
      dust: [],
      jeep: { x: 0, y: 0, ang: 0 }
    };

    let target = world.dist;

    function sync() {
      const p = posAt(path, world.dist);
      world.jeep.x = p.x; world.jeep.y = p.y; world.jeep.ang = p.ang;
    }
    sync();

    world.resize = (w, h) => { W = w; H = h; };

    world.setTask = txt => { world.task = txt; };

    /* Fahrt zur nächsten Station freigeben */
    world.drive = () => {
      if (world.driving) return;
      const next = Math.min(world.index + 1, path.marks.length - 1);
      target = path.marks[next];
      world.driving = true;
    };

    world.update = (dt, time) => {
      let event = null;
      if (world.driving) {
        world.dist = Math.min(target, world.dist + DRIVE * dt);
        sync();
        /* Staubwolke hinter dem Jeep */
        if (Math.random() < dt * 22) {
          world.dust.push({
            x: world.jeep.x + rf(-8, 8), y: world.jeep.y + rf(4, 14),
            r: rf(5, 10), life: rf(0.5, 0.9)
          });
        }
        if (world.dist >= target - 0.5) {
          world.driving = false;
          world.index = Math.min(world.index + 1, path.marks.length - 1);
          event = world.index > n ? 'goal' : 'arrived';
          if (event === 'goal') world.atGoal = true;
        }
      }
      for (let i = world.dust.length - 1; i >= 0; i--) {
        const d = world.dust[i];
        d.life -= dt; d.r += dt * 26;
        if (d.life <= 0) world.dust.splice(i, 1);
      }
      return event;
    };

    /* Kamera: der Jeep steht etwas unterhalb der Mitte, damit man die
       Strecke vor sich sieht. */
    function camera() {
      return { x: world.jeep.x - W / 2, y: world.jeep.y - H * 0.6 };
    }

    world.render = (ctx, time) => {
      const cam = camera();
      ground(ctx, W, H, cam, time);
      road(ctx, path, cam);

      /* Eingangstor am Start */
      gate(ctx, wps[1].x - cam.x, wps[1].y - cam.y);

      /* Stationen */
      for (let i = 1; i <= n; i++) {
        const p = posAt(path, path.marks[i]);
        const sx = p.x - cam.x, sy = p.y - cam.y;
        if (sy < -140 || sy > H + 140) continue;
        marker(ctx, sx + 42, sy, i, i <= world.index);
      }

      /* Ziel */
      const gp = posAt(path, path.marks[path.marks.length - 1]);
      camp(ctx, gp.x - cam.x, gp.y - cam.y - 10, time);

      /* Staub */
      world.dust.forEach(d => {
        ctx.globalAlpha = clamp(d.life, 0, 1) * 0.5;
        ctx.fillStyle = '#E9DCBC';
        ctx.beginPath(); ctx.arc(d.x - cam.x, d.y - cam.y, d.r, 0, TAU); ctx.fill();
      });
      ctx.globalAlpha = 1;

      /* Landschaft und Jeep nach Tiefe sortiert */
      const jy = world.jeep.y;
      const drawItem = it => {
        const x = it.x - cam.x, y = it.y - cam.y;
        if (y < -120 || y > H + 120 || x < -140 || x > W + 140) return;
        if (it.kind === 'tree') tree(ctx, x, y, it.s);
        else if (it.kind === 'bush') bush(ctx, x, y, it.s);
        else if (it.kind === 'rock') rock(ctx, x, y, it.s);
        else if (it.kind === 'water') water(ctx, x, y, it.s, time);
        else if (it.kind === 'giraffe') {
          shadow(ctx, x, y + 6, 16 * it.s, 7 * it.s);
          Pixel.draw(ctx, 'giraffe', x, y - 10 * it.s, Math.max(2, Math.round(3 * it.s)));
        } else if (it.kind === 'elephant') {
          shadow(ctx, x, y + 6, 20 * it.s, 8 * it.s);
          Pixel.draw(ctx, 'elephant', x, y - 6 * it.s, Math.max(2, Math.round(3 * it.s)),
            { S: '#9AA0AE', D: '#2A2E3A' });
        } else grass(ctx, x, y, it.s, time, it.ph || 0);
      };

      let drawnJeep = false;
      for (const it of decor) {
        if (!drawnJeep && it.y > jy) { drawJeep(ctx, cam, time); drawnJeep = true; }
        drawItem(it);
      }
      if (!drawnJeep) drawJeep(ctx, cam, time);

      /* Schild mit der aktuellen Aufgabe */
      if (world.task && !world.atGoal) {
        const st = posAt(path, path.marks[Math.min(world.index, path.marks.length - 1)]);
        const fs = clamp(Math.round(Math.min(W, H) * 0.052), 18, 30);
        signpost(ctx, st.x - cam.x, st.y - cam.y, world.task, fs, !world.driving, time);
      }
    };

    function drawJeep(ctx, cam, time) {
      const x = world.jeep.x - cam.x, y = world.jeep.y - cam.y;
      shadow(ctx, x + 5, y + 14, 26, 12);
      const bounce = world.driving ? Math.sin(time * 22) * 1.2 : 0;
      Pixel.draw(ctx, 'jeep', x, y + bounce, 4, {
        G: '#3E7C3A', K: '#22261C', C: '#A8DBFF', Y: '#E9D6A7'
      }, world.jeep.ang);
    }

    /* Nur für Tests */
    world.debug = () => ({
      index: world.index, driving: world.driving, atGoal: world.atGoal,
      dist: Math.round(world.dist), length: Math.round(path.length),
      stations: n, decor: decor.length
    });

    return world;
  }

  global.Safari = { create, SEG, STATIONS: 20 };
})(window);
