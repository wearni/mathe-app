/* ============================================================
   Mathe App - Animierte Hintergründe (Flat-Artwork-Stil)
   Alles wird per Canvas gezeichnet - keine externen Bilder.
   ============================================================ */
(function (global) {
  'use strict';

  /* Deterministischer Zufall, damit die Kulisse nicht flackert. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function grad(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(s => g.addColorStop(s[0], s[1]));
    return g;
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Erzeugt eine Häuserzeile (doppelte Breite für nahtloses Scrollen). */
  function skyline(seed, W, minH, maxH, minWd, maxWd, windows) {
    const rnd = mulberry32(seed);
    const items = [];
    let x = -40;
    const total = W * 2 + 120;
    while (x < total) {
      const w = minWd + rnd() * (maxWd - minWd);
      const h = minH + rnd() * (maxH - minH);
      const b = { x, w, h, kind: rnd(), win: [] };
      if (windows) {
        const cols = Math.max(1, Math.floor(w / 18));
        const rows = Math.max(1, Math.floor(h / 22));
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (rnd() < 0.62) {
              b.win.push({
                x: 7 + c * (w - 10) / cols,
                y: 12 + r * (h - 16) / rows,
                w: Math.max(4, (w - 10) / cols - 6),
                h: Math.max(4, (h - 16) / rows - 8),
                ph: rnd() * 6.28,
                sp: 0.3 + rnd() * 1.4
              });
            }
          }
        }
      }
      items.push(b);
      x += w + 3 + rnd() * 10;
    }
    return items;
  }

  function drawSkyline(ctx, layer, W, H, baseY, offset, color, winColor, t) {
    const span = W * 2 + 120;
    const off = ((offset % span) + span) % span;
    ctx.fillStyle = color;
    for (let pass = 0; pass < 2; pass++) {
      const shift = -off + pass * span;
      for (let i = 0; i < layer.length; i++) {
        const b = layer[i];
        const x = b.x + shift;
        if (x > W + 60 || x + b.w < -60) continue;
        ctx.fillRect(x, baseY - b.h, b.w, b.h);
        /* Dachformen */
        if (b.kind > 0.82) {
          ctx.beginPath();
          ctx.moveTo(x, baseY - b.h);
          ctx.lineTo(x + b.w / 2, baseY - b.h - b.w * 0.35);
          ctx.lineTo(x + b.w, baseY - b.h);
          ctx.closePath();
          ctx.fill();
        } else if (b.kind > 0.7) {
          ctx.fillRect(x + b.w * 0.35, baseY - b.h - 16, b.w * 0.14, 16);
        }
      }
      if (winColor) {
        for (let i = 0; i < layer.length; i++) {
          const b = layer[i];
          const x = b.x + shift;
          if (x > W + 60 || x + b.w < -60) continue;
          for (let k = 0; k < b.win.length; k++) {
            const wn = b.win[k];
            const a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * wn.sp + wn.ph));
            ctx.globalAlpha = a;
            ctx.fillStyle = winColor;
            ctx.fillRect(x + wn.x, baseY - b.h + wn.y, wn.w, wn.h);
          }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
      }
    }
  }

  /* ============================ THEMEN ============================ */

  const THEMES = {

    /* ---------------------- Stadt bei Tag ---------------------- */
    'stadt-tag': {
      name: 'Stadt am Tag',
      icon: '🏙️',
      ui: { eqA: '#2E3A8C', eqB: '#4C5FD7', eqText: '#FFFFFF', accent: '#FFD166', ground: '#2E7D5B', hud: '#10224a' },
      build(W, H) {
        const rnd = mulberry32(7);
        this.far = skyline(11, W, H * 0.12, H * 0.26, 34, 70, false);
        this.mid = skyline(23, W, H * 0.16, H * 0.34, 40, 82, true);
        this.near = skyline(37, W, H * 0.10, H * 0.22, 52, 110, true);
        this.clouds = Array.from({ length: 7 }, () => ({
          x: rnd() * W * 1.4, y: H * (0.05 + rnd() * 0.3), s: 0.5 + rnd() * 1.1, v: 4 + rnd() * 10
        }));
        this.balloons = Array.from({ length: 5 }, () => ({
          x: rnd() * W, y: H * (0.3 + rnd()), s: 0.5 + rnd() * 0.8, v: 9 + rnd() * 14,
          c: ['#FF5D73', '#FFC145', '#5BC0EB', '#9BC53D', '#E36BAE'][Math.floor(rnd() * 5)], ph: rnd() * 6.28
        }));
        this.birds = Array.from({ length: 6 }, () => ({
          x: rnd() * W, y: H * (0.08 + rnd() * 0.25), s: 0.6 + rnd() * 0.7, v: 16 + rnd() * 22, ph: rnd() * 6.28
        }));
      },
      draw(ctx, t, W, H) {
        ctx.fillStyle = grad(ctx, 0, 0, 0, H, [
          [0, '#1E88E5'], [0.35, '#59B7F2'], [0.68, '#9FD9F6'], [1, '#FFE3B3']
        ]);
        ctx.fillRect(0, 0, W, H);

        /* Sonne mit rotierenden Strahlen */
        const sx = W * 0.78, sy = H * 0.17, sr = Math.min(W, H) * 0.075;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.12);
        ctx.fillStyle = 'rgba(255,225,140,0.20)';
        for (let i = 0; i < 12; i++) {
          ctx.rotate(Math.PI / 6);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(sr * 3.4, -sr * 0.28);
          ctx.lineTo(sr * 3.4, sr * 0.28);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(255,236,170,0.45)';
        ctx.beginPath(); ctx.arc(sx, sy, sr * 1.7, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#FFE066';
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.2832); ctx.fill();

        /* Wolken */
        this.clouds.forEach(c => {
          const x = (c.x + t * c.v) % (W + 260) - 130;
          ctx.fillStyle = 'rgba(255,255,255,0.88)';
          const s = c.s * Math.min(W, H) * 0.05;
          ctx.beginPath();
          ctx.arc(x, c.y, s, 0, 6.2832);
          ctx.arc(x + s * 0.9, c.y + s * 0.15, s * 0.78, 0, 6.2832);
          ctx.arc(x - s * 0.9, c.y + s * 0.2, s * 0.65, 0, 6.2832);
          ctx.arc(x + s * 0.15, c.y - s * 0.5, s * 0.7, 0, 6.2832);
          ctx.fill();
        });

        const baseY = H * 0.9;
        drawSkyline(ctx, this.far, W, H, baseY - H * 0.06, t * 5, '#7FA8D9', null, t);
        drawSkyline(ctx, this.mid, W, H, baseY - H * 0.02, t * 11, '#3F6BB5', 'rgba(255,224,130,0.95)', t);
        drawSkyline(ctx, this.near, W, H, baseY, t * 20, '#22407A', 'rgba(255,209,102,0.95)', t);

        /* Ballons */
        this.balloons.forEach(b => {
          const y = H + 60 - ((b.y + t * b.v) % (H + 220));
          const x = b.x + Math.sin(t * 0.5 + b.ph) * 18;
          const s = b.s * Math.min(W, H) * 0.035;
          ctx.fillStyle = b.c;
          ctx.beginPath(); ctx.ellipse(x, y, s * 0.8, s, 0, 0, 6.2832); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath(); ctx.ellipse(x - s * 0.28, y - s * 0.32, s * 0.2, s * 0.3, -0.4, 0, 6.2832); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x, y + s * 1.9); ctx.stroke();
          ctx.fillStyle = '#8D6E63';
          ctx.fillRect(x - s * 0.16, y + s * 1.9, s * 0.32, s * 0.26);
        });

        /* Vögel */
        ctx.strokeStyle = 'rgba(30,50,90,0.55)'; ctx.lineWidth = 2;
        this.birds.forEach(b => {
          const x = (b.x + t * b.v) % (W + 120) - 60;
          const y = b.y + Math.sin(t * 1.4 + b.ph) * 8;
          const s = b.s * 9;
          const flap = Math.sin(t * 7 + b.ph) * s * 0.4;
          ctx.beginPath();
          ctx.moveTo(x - s, y);
          ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.5 - flap, x, y);
          ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.5 - flap, x + s, y);
          ctx.stroke();
        });

        /* Boden */
        ctx.fillStyle = '#2E7D5B';
        ctx.fillRect(0, baseY, W, H - baseY);
        ctx.fillStyle = '#3B9970';
        ctx.fillRect(0, baseY, W, 8);
      }
    },

    /* ---------------------- Stadt bei Nacht ---------------------- */
    'stadt-nacht': {
      name: 'Neon-Nacht',
      icon: '🌃',
      ui: { eqA: '#6A1B9A', eqB: '#C2185B', eqText: '#FFFFFF', accent: '#00E5FF', ground: '#1A1033', hud: '#0d0725' },
      build(W, H) {
        const rnd = mulberry32(5);
        this.far = skyline(41, W, H * 0.12, H * 0.28, 30, 64, false);
        this.mid = skyline(53, W, H * 0.16, H * 0.36, 40, 80, true);
        this.near = skyline(67, W, H * 0.10, H * 0.24, 54, 116, true);
        this.stars = Array.from({ length: 90 }, () => ({
          x: rnd() * W, y: rnd() * H * 0.6, r: 0.6 + rnd() * 1.8, ph: rnd() * 6.28, sp: 0.6 + rnd() * 2
        }));
        this.signs = Array.from({ length: 6 }, () => ({
          x: rnd() * W, y: H * (0.42 + rnd() * 0.3), w: 14 + rnd() * 40, h: 5 + rnd() * 9,
          c: ['#FF2E88', '#00E5FF', '#FFE066', '#7CFF6B', '#B388FF'][Math.floor(rnd() * 5)],
          ph: rnd() * 6.28, sp: 0.5 + rnd() * 2.2
        }));
      },
      draw(ctx, t, W, H) {
        ctx.fillStyle = grad(ctx, 0, 0, 0, H, [
          [0, '#0B0524'], [0.4, '#22105A'], [0.72, '#5B1E7A'], [1, '#C0367B']
        ]);
        ctx.fillRect(0, 0, W, H);

        /* Sterne */
        this.stars.forEach(s => {
          ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
        });
        ctx.globalAlpha = 1;

        /* Mond */
        const mx = W * 0.2, my = H * 0.15, mr = Math.min(W, H) * 0.06;
        ctx.fillStyle = 'rgba(255,255,220,0.18)';
        ctx.beginPath(); ctx.arc(mx, my, mr * 2.1, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#FFF6D0';
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(210,200,170,0.5)';
        ctx.beginPath(); ctx.arc(mx + mr * 0.35, my - mr * 0.2, mr * 0.2, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(mx - mr * 0.3, my + mr * 0.35, mr * 0.14, 0, 6.2832); ctx.fill();

        const baseY = H * 0.9;
        drawSkyline(ctx, this.far, W, H, baseY - H * 0.06, t * 4, '#1B1244', null, t);
        drawSkyline(ctx, this.mid, W, H, baseY - H * 0.02, t * 10, '#241659', 'rgba(0,229,255,0.85)', t);
        drawSkyline(ctx, this.near, W, H, baseY, t * 18, '#150C33', 'rgba(255,214,102,0.9)', t);

        /* Neon-Schilder */
        this.signs.forEach(s => {
          const a = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
          ctx.globalAlpha = 0.35 + a * 0.65;
          ctx.shadowColor = s.c; ctx.shadowBlur = 18;
          ctx.fillStyle = s.c;
          roundRect(ctx, s.x, s.y, s.w, s.h, 3); ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        });

        ctx.fillStyle = '#1A1033';
        ctx.fillRect(0, baseY, W, H - baseY);
        ctx.fillStyle = '#00E5FF';
        ctx.globalAlpha = 0.55;
        ctx.fillRect(0, baseY, W, 3);
        ctx.globalAlpha = 1;
      }
    },

    /* ---------------------- Weltraum ---------------------- */
    'weltraum': {
      name: 'Weltraum',
      icon: '🚀',
      ui: { eqA: '#00344E', eqB: '#0277BD', eqText: '#FFFFFF', accent: '#7CFF6B', ground: '#10131F', hud: '#070a17' },
      build(W, H) {
        const rnd = mulberry32(3);
        this.layers = [0.4, 0.8, 1.5].map((sp, i) =>
          Array.from({ length: 50 - i * 10 }, () => ({
            x: rnd() * W, y: rnd() * H, r: 0.5 + rnd() * (1 + i * 0.9), sp: sp * (3 + i * 5),
            ph: rnd() * 6.28, tw: 0.5 + rnd() * 2.5
          })));
        this.nebula = Array.from({ length: 4 }, () => ({
          x: rnd() * W, y: rnd() * H * 0.8, r: Math.min(W, H) * (0.2 + rnd() * 0.3),
          c: ['#7B2FF7', '#F72585', '#2D9CFF', '#00C2A8'][Math.floor(rnd() * 4)], ph: rnd() * 6.28
        }));
        this.planets = [
          { x: W * 0.18, y: H * 0.2, r: Math.min(W, H) * 0.075, c1: '#FF9E6B', c2: '#D94F2B', ring: true, ph: 0.4 },
          { x: W * 0.82, y: H * 0.42, r: Math.min(W, H) * 0.045, c1: '#8BE3FF', c2: '#2277B5', ring: false, ph: 2.1 }
        ];
        this.comet = { ph: rnd() * 6.28 };
      },
      draw(ctx, t, W, H) {
        ctx.fillStyle = grad(ctx, 0, 0, W, H, [[0, '#050716'], [0.5, '#0B1030'], [1, '#160B2E']]);
        ctx.fillRect(0, 0, W, H);

        /* Nebel */
        this.nebula.forEach(n => {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          const pulse = 0.1 + 0.06 * Math.sin(t * 0.3 + n.ph);
          g.addColorStop(0, n.c);
          g.addColorStop(0.18, n.c);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = pulse;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fill();
          ctx.globalAlpha = 1;
        });

        /* Sterne mit Parallax */
        this.layers.forEach(layer => {
          layer.forEach(s => {
            const y = (s.y + t * s.sp) % (H + 20) - 10;
            ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.2832); ctx.fill();
          });
        });
        ctx.globalAlpha = 1;

        /* Planeten */
        this.planets.forEach(p => {
          const py = p.y + Math.sin(t * 0.25 + p.ph) * 8;
          if (p.ring) {
            ctx.save();
            ctx.translate(p.x, py); ctx.rotate(-0.4); ctx.scale(1, 0.28);
            ctx.strokeStyle = 'rgba(255,220,180,0.55)'; ctx.lineWidth = p.r * 0.22;
            ctx.beginPath(); ctx.arc(0, 0, p.r * 1.7, 0, 6.2832); ctx.stroke();
            ctx.restore();
          }
          const g = ctx.createRadialGradient(p.x - p.r * 0.35, py - p.r * 0.35, p.r * 0.1, p.x, py, p.r);
          g.addColorStop(0, p.c1); g.addColorStop(1, p.c2);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, py, p.r, 0, 6.2832); ctx.fill();
        });

        /* Komet */
        const cp = (t * 0.06 + this.comet.ph) % 1;
        const cx = -80 + cp * (W + 200), cy = H * 0.1 + cp * H * 0.25;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 60, cy - 18); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.2832); ctx.fill();

        ctx.fillStyle = '#10131F';
        ctx.fillRect(0, H * 0.93, W, H * 0.07);
        ctx.fillStyle = '#7CFF6B'; ctx.globalAlpha = 0.5;
        ctx.fillRect(0, H * 0.93, W, 3); ctx.globalAlpha = 1;
      }
    },

    /* ---------------------- Unterwasser ---------------------- */
    'unterwasser': {
      name: 'Unterwasser',
      icon: '🐠',
      ui: { eqA: '#00695C', eqB: '#00897B', eqText: '#FFFFFF', accent: '#FFD166', ground: '#0B3B4A', hud: '#052630' },
      build(W, H) {
        const rnd = mulberry32(13);
        this.bubbles = Array.from({ length: 34 }, () => ({
          x: rnd() * W, y: rnd() * H, r: 2 + rnd() * 8, v: 12 + rnd() * 34, ph: rnd() * 6.28
        }));
        this.fish = Array.from({ length: 9 }, () => ({
          x: rnd() * W, y: H * (0.15 + rnd() * 0.65), s: 0.6 + rnd() * 1.2,
          v: (12 + rnd() * 30) * (rnd() < 0.5 ? -1 : 1),
          c: ['#FF7043', '#FFCA28', '#EC407A', '#7E57C2', '#26C6DA'][Math.floor(rnd() * 5)], ph: rnd() * 6.28
        }));
        this.weeds = Array.from({ length: 16 }, () => ({
          x: rnd() * W, h: H * (0.08 + rnd() * 0.18), w: 5 + rnd() * 9,
          c: ['#1B7F5A', '#25A06F', '#0F6B55'][Math.floor(rnd() * 3)], ph: rnd() * 6.28
        }));
        this.corals = Array.from({ length: 10 }, () => ({
          x: rnd() * W, s: 0.6 + rnd() * 1.3,
          c: ['#FF6F91', '#FFA26B', '#C86BFA', '#FF5D73'][Math.floor(rnd() * 4)]
        }));
      },
      draw(ctx, t, W, H) {
        ctx.fillStyle = grad(ctx, 0, 0, 0, H, [
          [0, '#3ED0E8'], [0.35, '#12A5C6'], [0.7, '#0A6F93'], [1, '#063E5C']
        ]);
        ctx.fillRect(0, 0, W, H);

        /* Lichtstrahlen */
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 5; i++) {
          const x = (i / 5) * W + Math.sin(t * 0.25 + i) * 32;
          ctx.beginPath();
          ctx.moveTo(x, -20);
          ctx.lineTo(x + 46, -20);
          ctx.lineTo(x + 150, H);
          ctx.lineTo(x + 20, H);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        /* Fische */
        this.fish.forEach(f => {
          const span = W + 140;
          let x = (f.x + t * f.v) % span;
          if (x < 0) x += span;
          x -= 70;
          const y = f.y + Math.sin(t * 1.1 + f.ph) * 14;
          const s = f.s * Math.min(W, H) * 0.028;
          const dir = f.v < 0 ? -1 : 1;
          ctx.save();
          ctx.translate(x, y); ctx.scale(dir, 1);
          ctx.fillStyle = f.c;
          ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.62, 0, 0, 6.2832); ctx.fill();
          ctx.beginPath();
          const tw = Math.sin(t * 6 + f.ph) * s * 0.2;
          ctx.moveTo(-s * 0.85, 0);
          ctx.lineTo(-s * 1.75, -s * 0.55 + tw);
          ctx.lineTo(-s * 1.75, s * 0.55 + tw);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(s * 0.45, -s * 0.15, s * 0.16, 0, 6.2832); ctx.fill();
          ctx.fillStyle = '#12303A';
          ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.15, s * 0.08, 0, 6.2832); ctx.fill();
          ctx.restore();
        });

        /* Blasen */
        this.bubbles.forEach(b => {
          const y = H + 20 - ((b.y + t * b.v) % (H + 60));
          const x = b.x + Math.sin(t * 1.3 + b.ph) * 12;
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(x, y, b.r, 0, 6.2832); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.fill();
        });

        /* Meeresgrund */
        const baseY = H * 0.88;
        this.weeds.forEach(w => {
          ctx.fillStyle = w.c;
          ctx.beginPath();
          ctx.moveTo(w.x - w.w / 2, baseY + 10);
          const bend = Math.sin(t * 1.1 + w.ph) * 16;
          ctx.quadraticCurveTo(w.x + bend, baseY - w.h * 0.5, w.x + bend * 1.4, baseY - w.h);
          ctx.quadraticCurveTo(w.x + bend, baseY - w.h * 0.5, w.x + w.w / 2, baseY + 10);
          ctx.fill();
        });
        this.corals.forEach(c => {
          const s = c.s * Math.min(W, H) * 0.03;
          ctx.fillStyle = c.c;
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.ellipse(c.x + i * s * 0.7, baseY - s * (0.8 + Math.abs(i) * -0.25), s * 0.3, s * 0.85, i * 0.35, 0, 6.2832);
            ctx.fill();
          }
        });
        ctx.fillStyle = '#0B3B4A';
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, baseY + 6);
        for (let x = 0; x <= W; x += 40) {
          ctx.quadraticCurveTo(x + 20, baseY + (x % 80 === 0 ? -4 : 14), x + 40, baseY + 6);
        }
        ctx.lineTo(W, H);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#F4D9A6';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(0, baseY + 8, W, 6);
        ctx.globalAlpha = 1;
      }
    }
  };

  const ORDER = ['stadt-tag', 'stadt-nacht', 'weltraum', 'unterwasser'];

  let current = 'stadt-tag';
  let W = 0, H = 0;

  function use(id) {
    if (!THEMES[id]) id = 'stadt-tag';
    current = id;
    if (W && H) THEMES[id].build(W, H);
  }

  function resize(w, h) {
    W = w; H = h;
    ORDER.forEach(id => THEMES[id].build(w, h));
  }

  function draw(ctx, t) {
    THEMES[current].draw(ctx, t, W, H);
  }

  function ui() { return THEMES[current].ui; }

  function list() {
    return ORDER.map(id => ({ id, name: THEMES[id].name, icon: THEMES[id].icon, ui: THEMES[id].ui }));
  }

  /* Kleine Vorschau für das Einstellungsmenü. */
  function preview(ctx, id, w, h) {
    const th = THEMES[id];
    const saveW = W, saveH = H;
    W = w; H = h;
    th.build(w, h);
    th.draw(ctx, 0, w, h);
    W = saveW; H = saveH;
    th.build(W || w, H || h);
  }

  global.Backgrounds = { use, resize, draw, ui, list, preview, roundRect, THEMES };
})(window);
