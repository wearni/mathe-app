/* ============================================================
   Mathe App - Aufgaben-Generator (Klasse 1 bis 6)
   Alle Ergebnisse sind ganze Zahlen (ggf. negativ ab Klasse 5).
   ============================================================ */
(function (global) {
  'use strict';

  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p) { return Math.random() < p; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function ggT(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  function kgV(a, b) { return Math.abs(a * b) / ggT(a, b); }
  function neg(n) { return n < 0 ? '(−' + Math.abs(n) + ')' : String(n); }
  function sgn(n) { return String(n).replace('-', '−'); }

  /* Skalierungsfaktor: Aufgaben werden innerhalb einer Klassenstufe
     mit steigendem Level etwas anspruchsvoller (max. Faktor 2.2). */
  function scale(level) { return Math.min(1 + (level - 1) * 0.13, 2.2); }

  /* ---------------- Klasse 1: erst bis 10, später bis 20 ----------------
     Bewusst sanfter Einstieg: kleine Summanden, viele Nachbaraufgaben
     und Zehnerfreunde. Erst ab Level 3 bzw. 5 kommt mehr dazu.        */
  function k1(level) {
    const s = Math.min(1 + (level - 1) * 0.09, 1.7);   /* deutlich flacher als sonst */
    const hi = Math.min(Math.round(5 * s), 9);         /* Summanden von 1..5 bis 1..9 */

    const pool = [
      /* Plus im Zahlenraum bis 10 */
      () => { const a = ri(1, hi), b = ri(1, hi); return { text: a + ' + ' + b, answer: a + b }; },
      /* Minus im Zahlenraum bis 10 */
      () => { const a = ri(2, hi + 4), b = ri(1, a - 1); return { text: a + ' − ' + b, answer: a - b }; },
      /* Nachbaraufgaben */
      () => { const a = ri(1, 9); return { text: a + ' + 1', answer: a + 1 }; },
      () => { const a = ri(2, 10); return { text: a + ' − 1', answer: a - 1 }; },
      () => { const a = ri(1, 8); return { text: a + ' + 2', answer: a + 2 }; },
      /* Verdoppeln */
      () => { const a = ri(1, Math.min(6, hi + 1)); return { text: a + ' + ' + a, answer: 2 * a }; },
      /* Zehnerfreunde */
      () => { const a = ri(1, 9); return { text: a + ' + ' + (10 - a), answer: 10 }; }
    ];

    if (level >= 3) {
      pool.push(
        () => { const a = ri(10, 15), b = ri(1, 5); return { text: a + ' + ' + b, answer: a + b }; },
        () => { const a = ri(11, 20), b = ri(1, 9); return { text: a + ' − ' + b, answer: a - b }; }
      );
    }
    if (level >= 5) {
      pool.push(
        () => { const b = ri(1, 6), a = ri(1, 6); return { text: a + ' + ? = ' + (a + b), answer: b }; },
        () => { const a = ri(1, 4), b = ri(1, 4), c = ri(1, 4); return { text: a + ' + ' + b + ' + ' + c, answer: a + b + c }; },
        () => { const a = ri(1, 9), b = ri(1, 20 - a > 0 ? 20 - a : 1); return { text: a + ' + ' + b, answer: a + b }; }
      );
    }
    return pick(pool)();
  }

  /* ---------------- Klasse 2: bis 100 + kleines Einmaleins ---------------- */
  function k2(level) {
    const s = scale(level);
    const max = Math.min(Math.round(40 * s), 100);
    return pick([
      () => { const a = ri(10, max), b = ri(2, Math.min(50, max)); return { text: a + ' + ' + b, answer: a + b }; },
      () => { const a = ri(20, 100), b = ri(2, a - 1); return { text: a + ' − ' + b, answer: a - b }; },
      () => { const a = ri(2, 10), b = ri(2, 10); return { text: a + ' · ' + b, answer: a * b }; },
      () => { const a = ri(2, 10), b = ri(2, 10); return { text: (a * b) + ' : ' + a, answer: b }; },
      () => { const a = ri(2, 10), b = ri(2, 10); return { text: a + ' · ? = ' + (a * b), answer: b }; },
      () => { const a = ri(5, 50); return { text: a + ' + ' + a, answer: 2 * a }; },
      () => { const a = ri(1, 9), b = ri(1, 9), c = ri(1, 9); return { text: a + ' + ' + b + ' + ' + c, answer: a + b + c }; }
    ])();
  }

  /* ---------------- Klasse 3: bis 1000, Einmaleins sicher ---------------- */
  function k3(level) {
    const s = scale(level);
    const max = Math.min(Math.round(300 * s), 1000);
    return pick([
      () => { const a = ri(100, max), b = ri(10, 300); return { text: a + ' + ' + b, answer: a + b }; },
      () => { const a = ri(100, 1000), b = ri(10, a - 1); return { text: a + ' − ' + b, answer: a - b }; },
      () => { const a = ri(11, 25), b = ri(2, 9); return { text: a + ' · ' + b, answer: a * b }; },
      () => { const a = ri(2, 9), b = ri(11, 40); return { text: (a * b) + ' : ' + a, answer: b }; },
      () => { const a = ri(2, 10), b = ri(2, 10), c = ri(1, 20); return { text: a + ' · ' + b + ' + ' + c, answer: a * b + c }; },
      () => { const a = ri(3, 12), b = ri(3, 12); return { text: a + ' · ? = ' + (a * b), answer: b }; },
      () => { const a = ri(2, 9); return { text: a + ' · ' + a, answer: a * a }; },
      () => { const a = ri(20, 90), b = ri(10, 90); return { text: a + ' + ' + b + ' − ' + Math.min(a, b), answer: a + b - Math.min(a, b) }; }
    ])();
  }

  /* ---------------- Klasse 4: bis 10 000, schriftliche Verfahren ---------------- */
  function k4(level) {
    const s = scale(level);
    const max = Math.min(Math.round(2000 * s), 10000);
    return pick([
      () => { const a = ri(500, max), b = ri(100, 2500); return { text: a + ' + ' + b, answer: a + b }; },
      () => { const a = ri(1000, 9999), b = ri(100, a - 1); return { text: a + ' − ' + b, answer: a - b }; },
      () => { const a = ri(12, 45), b = ri(11, 25); return { text: a + ' · ' + b, answer: a * b }; },
      () => { const a = ri(2, 9), b = ri(30, 250); return { text: (a * b) + ' : ' + a, answer: b }; },
      () => { const a = ri(2, 15), b = ri(2, 15), c = ri(2, 9); return { text: '(' + a + ' + ' + b + ') · ' + c, answer: (a + b) * c }; },
      () => { const a = ri(3, 12), b = ri(3, 12), c = ri(2, 10); return { text: a + ' · ' + b + ' − ' + c, answer: a * b - c }; },
      () => { const a = ri(100, 900); return { text: a + ' · 10', answer: a * 10 }; },
      () => { const a = ri(11, 40); return { text: a + ' · ' + a, answer: a * a }; },
      () => { const b = ri(2, 12), a = ri(2, 12); return { text: '? · ' + a + ' = ' + (a * b), answer: b }; }
    ])();
  }

  /* ---------------- Klasse 5: negative Zahlen, Potenzen, Terme ---------------- */
  function k5(level) {
    const s = scale(level);
    return pick([
      () => { const a = ri(5, 60), b = ri(a + 1, a + 80); return { text: a + ' − ' + b, answer: a - b }; },
      () => { const a = ri(2, 20), b = ri(2, 30); return { text: neg(-a) + ' + ' + b, answer: b - a }; },
      () => { const a = ri(2, 12), b = ri(2, 12); return { text: neg(-a) + ' · ' + b, answer: -a * b }; },
      () => { const a = ri(2, 15); return { text: a + '²', answer: a * a }; },
      () => { const a = ri(2, 6); return { text: a + '³', answer: a * a * a }; },
      () => { const a = ri(2, 20); return { text: '√' + (a * a), answer: a }; },
      () => { const a = ri(2, 12), b = ri(2, 12), c = ri(2, 12); return { text: a + ' + ' + b + ' · ' + c, answer: a + b * c }; },
      () => { const a = ri(2, 15), b = ri(2, 12), c = ri(2, 9); return { text: '(' + a + ' + ' + b + ') · ' + c, answer: (a + b) * c }; },
      () => { const a = ri(3, 18), b = ri(3, 18); return { text: 'ggT(' + (a * 6) + '; ' + (b * 6) + ')', answer: ggT(a * 6, b * 6) }; },
      () => { const a = ri(11, Math.round(30 * s)), b = ri(11, 30); return { text: a + ' · ' + b, answer: a * b }; },
      () => { const a = ri(3, 12), b = ri(20, 200); return { text: (a * b) + ' : ' + a, answer: b }; }
    ])();
  }

  /* ---------------- Klasse 6: Brüche, Prozent, negative Zahlen ---------------- */
  function k6(level) {
    const s = scale(level);
    return pick([
      () => { const p = pick([10, 20, 25, 50, 75, 5]), base = pick([20, 40, 60, 80, 100, 120, 200, 400]); return { text: p + ' % von ' + base, answer: Math.round(base * p / 100) }; },
      () => { const n = pick([2, 3, 4, 5]), z = ri(1, n - 1 || 1), base = n * ri(2, 12); return { text: z + '/' + n + ' von ' + base, answer: base / n * z }; },
      () => { const a = ri(3, 30), b = ri(3, 30); return { text: neg(-a) + ' − ' + neg(-b), answer: -a + b }; },
      () => { const a = ri(2, 15), b = ri(2, 15); return { text: neg(-a) + ' · ' + neg(-b), answer: a * b }; },
      () => { const a = ri(2, 12), b = ri(2, 12); return { text: neg(-a * b) + ' : ' + a, answer: -b }; },
      () => { const a = ri(2, 8); return { text: a + '³', answer: a * a * a }; },
      () => { const a = ri(2, 25); return { text: '√' + (a * a), answer: a }; },
      () => { const a = ri(4, 18), b = ri(4, 18); return { text: 'kgV(' + a + '; ' + b + ')', answer: kgV(a, b) }; },
      () => { const a = ri(2, 12), b = ri(2, 12), c = ri(2, 12); return { text: a + ' · ' + b + ' − ' + c + ' · ' + a, answer: a * b - c * a }; },
      () => { const a = ri(20, Math.round(60 * s)), b = ri(11, 40); return { text: a + ' · ' + b, answer: a * b }; },
      () => { const a = ri(2, 20), b = ri(2, 20), c = ri(2, 9); return { text: '(' + a + ' − ' + b + ') · ' + c, answer: (a - b) * c }; },
      () => { const base = pick([200, 400, 800, 1000]), p = pick([10, 25, 50]); return { text: p + ' % von ' + base, answer: base * p / 100 }; }
    ])();
  }

  const GENERATORS = { 1: k1, 2: k2, 3: k3, 4: k4, 5: k5, 6: k6 };

  const GRADE_INFO = {
    1: { name: 'Klasse 1', desc: 'Plus & Minus bis 10, später bis 20' },
    2: { name: 'Klasse 2', desc: 'bis 100 · kleines Einmaleins' },
    3: { name: 'Klasse 3', desc: 'bis 1000 · Mal & Geteilt' },
    4: { name: 'Klasse 4', desc: 'bis 10 000 · Klammern' },
    5: { name: 'Klasse 5', desc: 'negative Zahlen · Potenzen' },
    6: { name: 'Klasse 6', desc: 'Brüche · Prozent · Terme' }
  };

  /* Erzeugt eine Aufgabe und vermeidet direkte Wiederholungen. */
  let lastText = '';
  function create(grade, level) {
    const gen = GENERATORS[grade] || GENERATORS[1];
    let p, guard = 0;
    do {
      p = gen(level || 1);
      guard++;
    } while (p.text === lastText && guard < 12);
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

  global.MathGen = { create, choicesFor, distractors, GRADE_INFO, sgn };
})(window);
