/* ============================================================
   Mathe App - Aufgaben-Generator (Klasse 1 bis 6)

   Jede Aufgabenart hat eine Rechenart ("op"). Über die Einstellungen
   lassen sich Rechenarten pro Klassenstufe ein- und ausschalten;
   create() bekommt dann die erlaubten Arten übergeben.

   Alle Ergebnisse sind ganze Zahlen (ab Klasse 5 auch negative).
   ============================================================ */
(function (global) {
  'use strict';

  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function chance(p) { return Math.random() < p; }
  function ggT(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  function kgV(a, b) { return Math.abs(a * b) / ggT(a, b); }
  function neg(n) { return n < 0 ? '(−' + Math.abs(n) + ')' : String(n); }
  function sgn(n) { return String(n).replace('-', '−'); }

  /* Innerhalb einer Klassenstufe werden die Zahlen mit steigendem
     Level etwas größer (höchstens Faktor 2,2). */
  function scale(level) { return Math.min(1 + (level - 1) * 0.13, 2.2); }

  /* ===================== Rechenarten ===================== */
  const OPS = [
    { id: 'add', name: 'Plus', sym: '+' },
    { id: 'sub', name: 'Minus', sym: '−' },
    { id: 'mul', name: 'Mal', sym: '·' },
    { id: 'div', name: 'Geteilt', sym: ':' },
    { id: 'mix', name: 'Gemischt', sym: '( )' },
    { id: 'pow', name: 'Potenzen & Wurzeln', sym: 'x²' },
    { id: 'frac', name: 'Brüche & Prozent', sym: '%' },
    { id: 'neg', name: 'Negative Zahlen', sym: '±' },
    { id: 'teiler', name: 'Teiler & Vielfache', sym: 'ggT' }
  ];
  const OP_INFO = {};
  OPS.forEach(o => { OP_INFO[o.id] = o; });

  /* ===================== Zahlenräume =====================
     Maßgeblich ist die größte Zahl, die in einer Aufgabe vorkommt -
     einschließlich des Ergebnisses. "7 + 5" gehört also zu den 10ern,
     weil 12 herauskommt. */
  const RANGES = [
    { id: '1', name: '1er', note: 'bis 10', max: 10 },
    { id: '10', name: '10er', note: 'bis 100', max: 100 },
    { id: '100', name: '100er', note: 'bis 1000', max: 1000 },
    { id: '1000', name: '1000er', note: 'bis 10 000', max: 10000 }
  ];
  const RANGE_INFO = {};
  RANGES.forEach(r => { RANGE_INFO[r.id] = r; });

  function bandOf(v) {
    v = Math.abs(v);
    if (v <= 10) return '1';
    if (v <= 100) return '10';
    if (v <= 1000) return '100';
    return '1000';
  }

  /* Alle Zahlen einer Aufgabe: aus dem Text plus das Ergebnis. */
  function topNumber(p) {
    let top = Math.abs(Math.round(p.answer)) || 0;
    const m = String(p.text).match(/\d+/g) || [];
    for (let i = 0; i < m.length; i++) {
      const n = parseInt(m[i], 10);
      if (n > top) top = n;
    }
    return top;
  }

  function fitsRange(p, want) {
    return want.indexOf(bandOf(topNumber(p))) >= 0;
  }

  /* Liste säubern: nur bekannte Kennungen, leer/vollständig = egal */
  function normRanges(list) {
    if (!Array.isArray(list) || !list.length) return null;
    const keep = list.filter(id => !!RANGE_INFO[id]);
    if (!keep.length || keep.length === RANGES.length) return null;
    return keep;
  }

  /* Notnagel: passt keine der vorhandenen Aufgabenarten in den gewählten
     Zahlenraum, wird eine passende Aufgabe direkt gebaut. Sonst bekäme man
     z. B. in Klasse 4 mit "nur 1er" gar nichts zu sehen. */
  const BASIC = ['add', 'sub', 'mul', 'div'];

  function synth(allowed, want) {
    const ops = (allowed && allowed.length ? allowed : BASIC).filter(o => BASIC.indexOf(o) >= 0);
    if (!ops.length) return null;                 /* Rechenart hat Vorrang */
    const op = pick(ops);
    const max = RANGE_INFO[pick(want)].max;
    const lo = max <= 10 ? 1 : Math.floor(max / 10);

    if (op === 'add') {
      const s = ri(lo + 1, max), a = ri(1, s - 1);
      return { text: a + ' + ' + (s - a), answer: s };
    }
    if (op === 'sub') {
      const a = ri(lo + 1, max), b = ri(1, a - 1);
      return { text: a + ' − ' + b, answer: a - b };
    }
    /* mul und div teilen sich dasselbe Produkt */
    let a = 2, b = 2, prod = 4, guard = 0;
    do {
      b = ri(2, Math.max(2, Math.min(12, Math.floor(max / 2))));
      a = ri(2, Math.max(2, Math.floor(max / b)));
      prod = a * b;
      guard++;
    } while ((prod > max || prod <= lo) && guard < 60);
    if (prod > max) { a = 2; b = 2; prod = 4; }
    return op === 'mul'
      ? { text: a + ' · ' + b, answer: prod }
      : { text: prod + ' : ' + b, answer: a };
  }

  /* ===================== Aufgaben je Klassenstufe =====================
     op   = Rechenart (zum Ein- und Ausschalten)
     min  = erst ab diesem Level                                     */

  const GENS = {

    /* ---------- Klasse 1: erst bis 10, später bis 20 ---------- */
    1: [
      { op: 'add', fn: l => { const h = hi1(l); const a = ri(1, h), b = ri(1, h); return { text: a + ' + ' + b, answer: a + b }; } },
      { op: 'sub', fn: l => { const h = hi1(l); const a = ri(2, h + 4), b = ri(1, a - 1); return { text: a + ' − ' + b, answer: a - b }; } },
      { op: 'add', fn: () => { const a = ri(1, 9); return { text: a + ' + 1', answer: a + 1 }; } },
      { op: 'sub', fn: () => { const a = ri(2, 10); return { text: a + ' − 1', answer: a - 1 }; } },
      { op: 'add', fn: () => { const a = ri(1, 8); return { text: a + ' + 2', answer: a + 2 }; } },
      { op: 'add', fn: l => { const a = ri(1, Math.min(6, hi1(l) + 1)); return { text: a + ' + ' + a, answer: 2 * a }; } },
      { op: 'add', fn: () => { const a = ri(1, 9); return { text: a + ' + ' + (10 - a), answer: 10 }; } },
      { op: 'add', min: 3, fn: () => { const a = ri(10, 15), b = ri(1, 5); return { text: a + ' + ' + b, answer: a + b }; } },
      { op: 'sub', min: 3, fn: () => { const a = ri(11, 20), b = ri(1, 9); return { text: a + ' − ' + b, answer: a - b }; } },
      { op: 'add', min: 5, fn: () => { const b = ri(1, 6), a = ri(1, 6); return { text: a + ' + ? = ' + (a + b), answer: b }; } },
      { op: 'mix', min: 5, fn: () => { const a = ri(1, 4), b = ri(1, 4), c = ri(1, 4); return { text: a + ' + ' + b + ' + ' + c, answer: a + b + c }; } },
      { op: 'add', min: 5, fn: () => { const a = ri(1, 9), b = ri(1, Math.max(1, 20 - a)); return { text: a + ' + ' + b, answer: a + b }; } }
    ],

    /* ---------- Klasse 2: bis 100 + kleines Einmaleins ---------- */
    2: [
      { op: 'add', fn: l => { const m = Math.min(Math.round(40 * scale(l)), 100); const a = ri(10, m), b = ri(2, Math.min(50, m)); return { text: a + ' + ' + b, answer: a + b }; } },
      { op: 'sub', fn: () => { const a = ri(20, 100), b = ri(2, a - 1); return { text: a + ' − ' + b, answer: a - b }; } },
      { op: 'mul', fn: () => { const a = ri(2, 10), b = ri(2, 10); return { text: a + ' · ' + b, answer: a * b }; } },
      { op: 'div', fn: () => { const a = ri(2, 10), b = ri(2, 10); return { text: (a * b) + ' : ' + a, answer: b }; } },
      { op: 'mul', fn: () => { const a = ri(2, 10), b = ri(2, 10); return { text: a + ' · ? = ' + (a * b), answer: b }; } },
      { op: 'add', fn: () => { const a = ri(5, 50); return { text: a + ' + ' + a, answer: 2 * a }; } },
      { op: 'mix', fn: () => { const a = ri(1, 9), b = ri(1, 9), c = ri(1, 9); return { text: a + ' + ' + b + ' + ' + c, answer: a + b + c }; } }
    ],

    /* ---------- Klasse 3: bis 1000, Einmaleins sicher ---------- */
    3: [
      { op: 'add', fn: l => { const m = Math.min(Math.round(300 * scale(l)), 1000); const a = ri(100, m), b = ri(10, 300); return { text: a + ' + ' + b, answer: a + b }; } },
      { op: 'sub', fn: () => { const a = ri(100, 1000), b = ri(10, a - 1); return { text: a + ' − ' + b, answer: a - b }; } },
      { op: 'mul', fn: () => { const a = ri(11, 25), b = ri(2, 9); return { text: a + ' · ' + b, answer: a * b }; } },
      { op: 'div', fn: () => { const a = ri(2, 9), b = ri(11, 40); return { text: (a * b) + ' : ' + a, answer: b }; } },
      { op: 'mix', fn: () => { const a = ri(2, 10), b = ri(2, 10), c = ri(1, 20); return { text: a + ' · ' + b + ' + ' + c, answer: a * b + c }; } },
      { op: 'mul', fn: () => { const a = ri(3, 12), b = ri(3, 12); return { text: a + ' · ? = ' + (a * b), answer: b }; } },
      { op: 'mul', fn: () => { const a = ri(2, 9); return { text: a + ' · ' + a, answer: a * a }; } },
      { op: 'mix', fn: () => { const a = ri(20, 90), b = ri(10, 90); return { text: a + ' + ' + b + ' − ' + Math.min(a, b), answer: a + b - Math.min(a, b) }; } }
    ],

    /* ---------- Klasse 4: bis 10 000, schriftliche Verfahren ---------- */
    4: [
      { op: 'add', fn: l => { const m = Math.min(Math.round(2000 * scale(l)), 10000); const a = ri(500, m), b = ri(100, 2500); return { text: a + ' + ' + b, answer: a + b }; } },
      { op: 'sub', fn: () => { const a = ri(1000, 9999), b = ri(100, a - 1); return { text: a + ' − ' + b, answer: a - b }; } },
      { op: 'mul', fn: () => { const a = ri(12, 45), b = ri(11, 25); return { text: a + ' · ' + b, answer: a * b }; } },
      { op: 'div', fn: () => { const a = ri(2, 9), b = ri(30, 250); return { text: (a * b) + ' : ' + a, answer: b }; } },
      { op: 'mix', fn: () => { const a = ri(2, 15), b = ri(2, 15), c = ri(2, 9); return { text: '(' + a + ' + ' + b + ') · ' + c, answer: (a + b) * c }; } },
      { op: 'mix', fn: () => { const a = ri(3, 12), b = ri(3, 12), c = ri(2, 10); return { text: a + ' · ' + b + ' − ' + c, answer: a * b - c }; } },
      { op: 'mul', fn: () => { const a = ri(100, 900); return { text: a + ' · 10', answer: a * 10 }; } },
      { op: 'mul', fn: () => { const a = ri(11, 40); return { text: a + ' · ' + a, answer: a * a }; } },
      { op: 'mul', fn: () => { const b = ri(2, 12), a = ri(2, 12); return { text: '? · ' + a + ' = ' + (a * b), answer: b }; } }
    ],

    /* ---------- Klasse 5: negative Zahlen, Potenzen, Terme ---------- */
    5: [
      { op: 'sub', fn: () => { const a = ri(5, 60), b = ri(a + 1, a + 80); return { text: a + ' − ' + b, answer: a - b }; } },
      { op: 'neg', fn: () => { const a = ri(2, 20), b = ri(2, 30); return { text: neg(-a) + ' + ' + b, answer: b - a }; } },
      { op: 'neg', fn: () => { const a = ri(2, 12), b = ri(2, 12); return { text: neg(-a) + ' · ' + b, answer: -a * b }; } },
      { op: 'pow', fn: () => { const a = ri(2, 15); return { text: a + '²', answer: a * a }; } },
      { op: 'pow', fn: () => { const a = ri(2, 6); return { text: a + '³', answer: a * a * a }; } },
      { op: 'pow', fn: () => { const a = ri(2, 20); return { text: '√' + (a * a), answer: a }; } },
      { op: 'mix', fn: () => { const a = ri(2, 12), b = ri(2, 12), c = ri(2, 12); return { text: a + ' + ' + b + ' · ' + c, answer: a + b * c }; } },
      { op: 'mix', fn: () => { const a = ri(2, 15), b = ri(2, 12), c = ri(2, 9); return { text: '(' + a + ' + ' + b + ') · ' + c, answer: (a + b) * c }; } },
      { op: 'teiler', fn: () => { const a = ri(3, 18), b = ri(3, 18); return { text: 'ggT(' + (a * 6) + '; ' + (b * 6) + ')', answer: ggT(a * 6, b * 6) }; } },
      { op: 'mul', fn: l => { const a = ri(11, Math.round(30 * scale(l))), b = ri(11, 30); return { text: a + ' · ' + b, answer: a * b }; } },
      { op: 'div', fn: () => { const a = ri(3, 12), b = ri(20, 200); return { text: (a * b) + ' : ' + a, answer: b }; } }
    ],

    /* ---------- Klasse 6: Brüche, Prozent, negative Zahlen ---------- */
    6: [
      { op: 'frac', fn: () => { const p = pick([10, 20, 25, 50, 75, 5]), base = pick([20, 40, 60, 80, 100, 120, 200, 400]); return { text: p + ' % von ' + base, answer: Math.round(base * p / 100) }; } },
      { op: 'frac', fn: () => { const n = pick([2, 3, 4, 5]), z = ri(1, Math.max(1, n - 1)), base = n * ri(2, 12); return { text: z + '/' + n + ' von ' + base, answer: base / n * z }; } },
      { op: 'frac', fn: () => { const base = pick([200, 400, 800, 1000]), p = pick([10, 25, 50]); return { text: p + ' % von ' + base, answer: base * p / 100 }; } },
      { op: 'neg', fn: () => { const a = ri(3, 30), b = ri(3, 30); return { text: neg(-a) + ' − ' + neg(-b), answer: -a + b }; } },
      { op: 'neg', fn: () => { const a = ri(2, 15), b = ri(2, 15); return { text: neg(-a) + ' · ' + neg(-b), answer: a * b }; } },
      { op: 'neg', fn: () => { const a = ri(2, 12), b = ri(2, 12); return { text: neg(-a * b) + ' : ' + a, answer: -b }; } },
      { op: 'pow', fn: () => { const a = ri(2, 8); return { text: a + '³', answer: a * a * a }; } },
      { op: 'pow', fn: () => { const a = ri(2, 25); return { text: '√' + (a * a), answer: a }; } },
      { op: 'teiler', fn: () => { const a = ri(4, 18), b = ri(4, 18); return { text: 'kgV(' + a + '; ' + b + ')', answer: kgV(a, b) }; } },
      { op: 'mix', fn: () => { const a = ri(2, 12), b = ri(2, 12), c = ri(2, 12); return { text: a + ' · ' + b + ' − ' + c + ' · ' + a, answer: a * b - c * a }; } },
      { op: 'mix', fn: () => { const a = ri(2, 20), b = ri(2, 20), c = ri(2, 9); return { text: '(' + a + ' − ' + b + ') · ' + c, answer: (a - b) * c }; } },
      { op: 'mul', fn: l => { const a = ri(20, Math.round(60 * scale(l))), b = ri(11, 40); return { text: a + ' · ' + b, answer: a * b }; } }
    ]
  };

  /* Klasse 1 wächst besonders sanft */
  function hi1(level) {
    return Math.min(Math.round(5 * Math.min(1 + (level - 1) * 0.09, 1.7)), 9);
  }

  const GRADE_INFO = {
    1: { name: 'Klasse 1', desc: 'Plus & Minus bis 10, später bis 20' },
    2: { name: 'Klasse 2', desc: 'bis 100 · kleines Einmaleins' },
    3: { name: 'Klasse 3', desc: 'bis 1000 · Mal & Geteilt' },
    4: { name: 'Klasse 4', desc: 'bis 10 000 · Klammern' },
    5: { name: 'Klasse 5', desc: 'negative Zahlen · Potenzen' },
    6: { name: 'Klasse 6', desc: 'Brüche · Prozent · Terme' }
  };

  /* Welche Rechenarten gibt es in dieser Klassenstufe? */
  function opsFor(grade) {
    const seen = [];
    (GENS[grade] || []).forEach(g => { if (seen.indexOf(g.op) < 0) seen.push(g.op); });
    /* in der Reihenfolge von OPS ausgeben, damit die Liste ruhig bleibt */
    return OPS.filter(o => seen.indexOf(o.id) >= 0)
      .map(o => ({ id: o.id, name: o.name, sym: o.sym }));
  }

  /* Wie viele Aufgabenarten stehen mit dieser Auswahl zur Verfügung? */
  function poolFor(grade, level, allowed) {
    const all = GENS[grade] || GENS[1];
    return all.filter(g =>
      (!g.min || level >= g.min) &&
      (!allowed || !allowed.length || allowed.indexOf(g.op) >= 0));
  }

  let lastText = '';

  /* allowed: Liste erlaubter Rechenarten, z. B. ['add','sub'].
     ranges:  Liste erlaubter Zahlenräume, z. B. ['1','10'].
     Fehlt eine Liste oder passt nichts dazu, ist alles erlaubt. */
  function create(grade, level, allowed, ranges) {
    level = level || 1;
    let pool = poolFor(grade, level, allowed);
    if (!pool.length) pool = poolFor(grade, level, null);
    if (!pool.length) pool = GENS[1];

    const want = normRanges(ranges);
    let p = null, spare = null;
    for (let guard = 0; guard < 60 && !p; guard++) {
      const c = pick(pool).fn(level);
      if (c.text === lastText && guard < 40) continue;   /* nicht zweimal dasselbe */
      if (!want || fitsRange(c, want)) p = c;
      else if (!spare) spare = c;
    }
    /* Nichts Passendes dabei: eine Aufgabe im gewünschten Zahlenraum bauen.
       Klappt auch das nicht, hat die Rechenart Vorrang vor dem Zahlenraum. */
    if (!p && want) p = synth(allowed, want);
    if (!p) p = spare || pick(pool).fn(level);

    lastText = p.text;
    p.answer = Math.round(p.answer);
    return p;
  }

  /* Plausible falsche Antworten für den Multiple-Choice-Modus. */
  function distractors(answer, count) {
    count = count || 3;
    const out = new Set();
    const mags = [1, 2, 3, 5, 10];
    let guard = 0;
    while (out.size < count && guard < 200) {
      guard++;
      let cand;
      const r = Math.random();
      if (r < 0.45) {
        cand = answer + pick(mags) * (chance(0.5) ? 1 : -1);
      } else if (r < 0.7) {
        cand = answer + Math.round(answer * (0.1 + Math.random() * 0.3)) * (chance(0.5) ? 1 : -1);
      } else if (r < 0.85 && Math.abs(answer) > 9) {
        const str = String(Math.abs(answer)).split('');
        if (str.length > 1) { [str[0], str[1]] = [str[1], str[0]]; }
        cand = parseInt(str.join(''), 10) * Math.sign(answer || 1);
      } else {
        cand = answer + ri(-12, 12);
      }
      cand = Math.round(cand);
      if (cand === answer || !isFinite(cand)) continue;
      if (answer >= 0 && cand < 0) continue;
      out.add(cand);
    }
    while (out.size < count) { out.add(answer + out.size + 1); }
    return Array.from(out).slice(0, count);
  }

  function choicesFor(answer, count) {
    return shuffle(distractors(answer, (count || 4) - 1).concat([answer]));
  }

  global.MathGen = {
    create, choicesFor, distractors, opsFor,
    GRADE_INFO, OPS, OP_INFO, RANGES, RANGE_INFO, sgn,
    /* Zu welchem Zahlenraum gehört diese Aufgabe? */
    rangeOf(p) { return bandOf(topNumber(p)); },
    /* Nur zum Testen: wie viele Aufgabenarten sind gerade möglich? */
    poolSize(grade, level, allowed) { return poolFor(grade, level, allowed).length; }
  };
})(window);
