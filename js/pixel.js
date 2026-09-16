/* ============================================================
   Mathe App - Pixel-Art

   Sprites werden als Textraster geschrieben: ein Zeichen = ein Pixel,
   '.' bleibt durchsichtig. Beim ersten Zeichnen wird jedes Sprite in
   passender Größe auf eine kleine Hilfs-Leinwand gerendert und
   gemerkt - dadurch bleiben die Kanten hart und es bleibt schnell.
   ============================================================ */
(function (global) {
  'use strict';

  const PAL = {
    W: '#F4F7FF',  /* weiß       */
    S: '#B9C4E4',  /* Schatten   */
    D: '#1B2247',  /* dunkel     */
    R: '#E63E62',  /* rot        */
    r: '#A81F42',  /* dunkelrot  */
    C: '#4FC3F7',  /* Fensterblau*/
    c: '#1E7FB5',  /* dunkelblau */
    Y: '#FFD166',  /* gelb       */
    O: '#FF8C28',  /* orange     */
    G: '#7CFF6B',  /* grün       */
    B: '#B388FF',  /* violett    */
    P: '#FF5D73',  /* Rumpf (wird ersetzt) */
    K: '#0E1330'   /* fast schwarz */
  };

  /* --------------------------- Sprites --------------------------- */
  const SPRITES = {
    /* Rakete der Spielerin (11 x 16) */
    ship: [
      '.....R.....',
      '....RRR....',
      '....RrR....',
      '...WWWWW...',
      '...WCCCW...',
      '...WCccW...',
      '...WWWWW...',
      '...WWWSW...',
      '..RWWWSWR..',
      '.RRWWWSWRR.',
      'RRrWWWSWrRR',
      'Rr.WWWSW.rR',
      '...WWWWW...',
      '...DWWWD...',
      '....OYO....',
      '.....O.....'
    ],
    /* Ufo (13 x 8) - Rumpffarbe wird pro Gegner ersetzt */
    ufo: [
      '....DDDDD....',
      '...DCCCCCD...',
      '..DCCcccCCD..',
      '.DDDDDDDDDDD.',
      'DPPPPPPPPPPPD',
      'DPYPPPYPPPYPD',
      '.DDDDDDDDDDD.',
      '..D.D...D.D..'
    ],
    /* kleines Herz (7 x 6) */
    heart: [
      '.RR.RR.',
      'RRRRRRR',
      'RRRRRRR',
      '.RRRRR.',
      '..RRR..',
      '...R...'
    ],
    /* Stern (7 x 7) */
    star: [
      '...Y...',
      '...Y...',
      'YYYYYYY',
      '.YYYYY.',
      '.YY.YY.',
      '.Y...Y.',
      '.......'
    ]
  };

  const cache = new Map();

  function build(name, scale, overrides) {
    const rows = SPRITES[name];
    const w = rows[0].length, h = rows.length;
    const cv = document.createElement('canvas');
    cv.width = w * scale;
    cv.height = h * scale;
    const c = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        const col = (overrides && overrides[ch]) || PAL[ch];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return cv;
  }

  function sheet(name, scale, overrides) {
    const key = name + '|' + scale + '|' + (overrides ? JSON.stringify(overrides) : '');
    let cv = cache.get(key);
    if (!cv) {
      cv = build(name, scale, overrides);
      if (cache.size > 120) cache.clear();
      cache.set(key, cv);
    }
    return cv;
  }

  /* Zeichnet ein Sprite mittig auf (cx, cy). */
  function draw(ctx, name, cx, cy, scale, overrides, rot) {
    const cv = sheet(name, Math.max(1, Math.round(scale)), overrides);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(cx), Math.round(cy));
    if (rot) ctx.rotate(rot);
    ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
    ctx.restore();
  }

  function size(name, scale) {
    const rows = SPRITES[name];
    return { w: rows[0].length * scale, h: rows.length * scale };
  }

  /* ---------------- Pixelige Kästen ohne weiche Ecken ----------------
     Ein Rechteck, dem an den Ecken je ein "Pixel" fehlt - genau so
     sehen Kästen in alten Konsolenspielen aus. */
  function boxPath(ctx, x, y, w, h, p) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.beginPath();
    ctx.rect(x + p, y, w - 2 * p, h);
    ctx.rect(x, y + p, w, h - 2 * p);
  }

  /* Kasten wie in alten Konsolenspielen: dunkle Fassung, Farbfläche,
     helle Kante oben links und dunkle Kante unten rechts. */
  function box(ctx, x, y, w, h, opts) {
    const p = opts.px || 4;
    const b = opts.border || p;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);

    boxPath(ctx, x, y, w, h, p);
    ctx.fillStyle = opts.outline || PAL.K;
    ctx.fill();

    boxPath(ctx, x + b, y + b, w - 2 * b, h - 2 * b, p);
    ctx.fillStyle = opts.fill;
    ctx.fill();

    const ix = x + b, iy = y + b, iw = w - 2 * b, ih = h - 2 * b;
    if (opts.light) {
      ctx.fillStyle = opts.light;
      ctx.fillRect(ix + p, iy, iw - 2 * p, p);            /* oben  */
      ctx.fillRect(ix, iy + p, p, ih - 2 * p);            /* links */
    }
    if (opts.dark) {
      ctx.fillStyle = opts.dark;
      ctx.fillRect(ix + p, iy + ih - p, iw - 2 * p, p);   /* unten  */
      ctx.fillRect(ix + iw - p, iy + p, p, ih - 2 * p);   /* rechts */
    }
  }

  /* -------- Avatare: kleine Pixel-Gesichter aus einer Kennung -------- */
  const AV_BODY = ['#FF5D73', '#FFD166', '#7CFF6B', '#4FC3F7', '#B388FF', '#FF9E6B', '#5BC0EB', '#E36BAE'];
  const AV_SHAPE = [
    ['.XXXXX.', 'XXXXXXX', 'XeXXXeX', 'XXXXXXX', 'XXmmmXX', 'XXXXXXX', '.X.X.X.'],   /* Blob     */
    ['X.....X', 'XXXXXXX', 'XeXXXeX', 'XXXXXXX', 'XmmmmmX', '.XXXXX.', '..X.X..'],   /* Monster  */
    ['..XXX..', '.XXXXX.', 'XeXXXeX', 'XXXXXXX', 'XXmmmXX', '.XXXXX.', '..XXX..'],   /* Roboter  */
    ['.X...X.', '.XXXXX.', 'XXeXeXX', 'XXXXXXX', 'X.mmm.X', '.XXXXX.', '.X...X.'],   /* Katze    */
    ['.XXXXX.', 'XXXXXXX', 'XeXeXeX', 'XXXXXXX', 'XmmmmmX', 'XXXXXXX', '.XXXXX.'],   /* Alien    */
    ['...X...', '..XXX..', '.XeXeX.', 'XXXXXXX', 'XXmmmXX', '.XXXXX.', '..X.X..']    /* Rakete   */
  ];

  /* Kennung: 4 Zeichen aus Ziffern - Form, Farbe, Augen, Mund */
  function randomAvatar() {
    const r = n => Math.floor(Math.random() * n);
    return '' + r(AV_SHAPE.length) + r(AV_BODY.length) + r(3) + r(3);
  }

  function avatarRows(code) {
    const c = String(code || '0000').padEnd(4, '0');
    const shape = AV_SHAPE[(+c[0] || 0) % AV_SHAPE.length];
    return shape;
  }

  function avatarColors(code) {
    const c = String(code || '0000').padEnd(4, '0');
    const body = AV_BODY[(+c[1] || 0) % AV_BODY.length];
    const eye = ['#12152E', '#FFFFFF', '#12152E'][(+c[2] || 0) % 3];
    const mouth = ['#12152E', '#FFFFFF', '#FF5D73'][(+c[3] || 0) % 3];
    return { X: body, e: eye, m: mouth };
  }

  /* Malt einen Avatar auf eine beliebige Leinwand. */
  function drawAvatar(ctx, code, x, y, scale) {
    const rows = avatarRows(code);
    const col = avatarColors(code);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < rows.length; r++) {
      for (let q = 0; q < rows[r].length; q++) {
        const ch = rows[r][q];
        if (ch === '.') continue;
        ctx.fillStyle = col[ch] || col.X;
        ctx.fillRect(x + q * scale, y + r * scale, scale, scale);
      }
    }
    ctx.restore();
  }

  /* Avatar als Bild-Datenstring, z. B. für <img> in Listen. */
  function avatarDataUrl(code, scale) {
    scale = scale || 6;
    const rows = avatarRows(code);
    const cv = document.createElement('canvas');
    cv.width = rows[0].length * scale;
    cv.height = rows.length * scale;
    drawAvatar(cv.getContext('2d'), code, 0, 0, scale);
    return cv.toDataURL();
  }


  /* ============================================================
     Eigene Pixel-Schrift (5 x 7) für die Aufgaben.
     Fertige Pixelschriften kennen weder "−" noch "·", "²" oder "√" -
     deshalb sind hier genau die Zeichen enthalten, die im Spiel
     vorkommen. Vorteil: funktioniert immer, auch ganz ohne Internet.
     ============================================================ */
  const FONT = {
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '−': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    '·': ['.....', '.....', '..##.', '..##.', '.....', '.....', '.....'],
    ':': ['.....', '.....', '..#..', '.....', '..#..', '.....', '.....'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
    ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
    '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
    '²': ['.##..', '#..#.', '...#.', '..#..', '.###.', '.....', '.....'],
    '³': ['.##..', '...#.', '..##.', '...#.', '.##..', '.....', '.....'],
    '√': ['..###', '..#..', '..#..', '..#..', '#.#..', '#.#..', '.#...'],
    ';': ['.....', '.....', '..#..', '.....', '..#..', '.#...', '.....'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
    'g': ['.....', '.####', '#...#', '#...#', '.####', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'k': ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'v': ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'o': ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
    'n': ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#']
  };

  const GW = 5, GH = 7, GAP = 1;

  function textWidth(str, scale) {
    if (!str.length) return 0;
    return (str.length * (GW + GAP) - GAP) * scale;
  }
  function textHeight(scale) { return GH * scale; }

  /* Größte Pixelgröße, mit der der Text noch in die Breite passt. */
  function fitScale(str, maxW, maxScale, minScale) {
    let s = maxScale || 5;
    const lo = minScale || 2;
    while (s > lo && textWidth(str, s) > maxW) s--;
    return s;
  }

  /* Zeichnet Text mit der Pixel-Schrift. x ist die Mitte, y die Mitte. */
  function text(ctx, str, cx, cy, scale, color, shadow) {
    str = String(str);
    const w = textWidth(str, scale), h = textHeight(scale);
    let x = Math.round(cx - w / 2);
    const y = Math.round(cy - h / 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < str.length; i++) {
      const rows = FONT[str[i]];
      if (rows) {
        for (let r = 0; r < GH; r++) {
          for (let q = 0; q < GW; q++) {
            if (rows[r][q] !== '#') continue;
            if (shadow) {
              ctx.fillStyle = shadow;
              ctx.fillRect(x + q * scale, y + r * scale + scale, scale, scale);
            }
          }
        }
      }
      x += (GW + GAP) * scale;
    }
    x = Math.round(cx - w / 2);
    for (let i = 0; i < str.length; i++) {
      const rows = FONT[str[i]];
      if (rows) {
        ctx.fillStyle = color;
        for (let r = 0; r < GH; r++) {
          for (let q = 0; q < GW; q++) {
            if (rows[r][q] === '#') ctx.fillRect(x + q * scale, y + r * scale, scale, scale);
          }
        }
      }
      x += (GW + GAP) * scale;
    }

    /* Bei einer Wurzel gehört der Strich über die Zahl dahinter. */
    const root = str.indexOf('\u221a');
    if (root >= 0 && root < str.length - 1) {
      const bx = Math.round(cx - w / 2) + (root + 1) * (GW + GAP) * scale - scale;
      const bw = (str.length - root - 1) * (GW + GAP) * scale - GAP * scale + scale;
      if (shadow) { ctx.fillStyle = shadow; ctx.fillRect(bx, y + scale, bw, scale); }
      ctx.fillStyle = color;
      ctx.fillRect(bx, y, bw, scale);
    }
    ctx.restore();
  }

  function known(str) {
    return String(str).split('').every(c => FONT[c] !== undefined);
  }

  global.Pixel = {
    PAL, draw, size, box, boxPath,
    text, textWidth, textHeight, fitScale, known,
    randomAvatar, drawAvatar, avatarDataUrl,
    avatarCount: AV_SHAPE.length * AV_BODY.length * 9
  };
})(window);
