/* ============================================================
   Schul App - gemeinsame Frage-Schnittstelle

   Die Spiel-Engine soll nicht wissen müssen, ob gerade Mathe oder HSU
   dran ist und wie geantwortet wird. Sie fragt hier nach der nächsten
   Aufgabe und bekommt immer dieselbe Form zurück:

     {
       form:        wie geantwortet wird (siehe FORMS)
       text:        was im Kasten bzw. auf dem Schild steht
       answer:      Vergleichswert für die Antwort-Knöpfe (Zahl)
       answerLabel: wie die richtige Antwort geschrieben wird
       choices:     [{ v, label }] für Auswahl und Wahr/Falsch
       letters:     Buchstaben für den Buchstabensalat
       items:       Einträge für den Zeitstrahl
       solution:    erwartete Eingabe bei Zahlenfeld, Freitext, Buchstaben
     }

   Geprüft wird nicht von der Engine, sondern hier: check(q, eingabe).
   ============================================================ */
(function (global) {
  'use strict';

  const SUBJECTS = [
    { id: 'mathe', name: 'Mathe', icon: '📐', desc: 'Rechnen von Klasse 1 bis 6' },
    { id: 'hsu', name: 'HSU', icon: '🌍', desc: 'Heimat- und Sachunterricht' },
    { id: 'deutsch', name: 'Deutsch', icon: '✍️', desc: 'Sprache und Rechtschreibung' }
  ];

  /* Antwortarten. "mixed" wechselt pro Aufgabe durch, was gerade passt. */
  const FORMS = [
    { id: 'choice', name: 'Auswahl', icon: '🎯', desc: 'Vier Antworten – eine antippen' },
    { id: 'number', name: 'Zahlenfeld', icon: '🔢', desc: 'Die Zahl selbst eintippen' },
    { id: 'truefalse', name: 'Wahr oder falsch', icon: '✓✗', desc: 'Stimmt die vorgeschlagene Antwort?' },
    { id: 'letters', name: 'Buchstabensalat', icon: '🔤', desc: 'Buchstaben der Reihe nach antippen' },
    { id: 'text', name: 'Freitext', icon: '⌨️', desc: 'Antwort mit der Tastatur schreiben' },
    { id: 'mixed', name: 'Gemischt', icon: '🎲', desc: 'Wechselt durch – man kann sich an nichts gewöhnen' }
  ];
  const FORM_INFO = {};
  FORMS.forEach(f => { FORM_INFO[f.id] = f; });

  /* Fächer mit festem Fragenkatalog (HSU, Deutsch, ...) laufen alle über
     denselben Unterbau aus js/bank.js. bankOf() liefert ihn - oder null,
     dann wird gerechnet. */
  function bankOf(s) { return Bank.of((s && s.subject) || 'mathe'); }
  function isBank(s) { return !!bankOf(s); }
  /* alter Name, wird an ein paar Stellen noch gebraucht */
  function isHsu(s) { return (s && s.subject) === 'hsu'; }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- Vergleichen ----------
     Großzügig: Groß- und Kleinschreibung, Umlaute, Leerzeichen und
     Satzzeichen sind egal. Ein einzelner Tippfehler wird verziehen,
     sobald das Wort lang genug ist - Rechtschreibung soll hier nicht
     die eigentliche Hürde sein. */
  function norm(t) {
    return String(t == null ? '' : t)
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');
  }

  function distance(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 1) return 9;
    let prev = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  function sameText(given, wanted, exact) {
    const a = norm(given), b = norm(wanted);
    if (!a) return false;
    if (a === b) return true;
    /* Bei Rechtschreibung und Zeitformen zählt nur die genaue Schreibweise -
       "ich spiele" und "ich spielte" trennt sonst nur ein Buchstabe. */
    if (exact) return false;
    /* sonst: ein Tippfehler darf sein, wenn das Wort lang genug ist */
    return b.length >= 5 && distance(a, b) <= 1;
  }

  /* Hat die Spielerin die Aufgabe richtig beantwortet? */
  function check(q, given) {
    if (!q) return false;
    if (q.form === 'timeline') {
      if (!Array.isArray(given) || given.length !== q.order.length) return false;
      return given.every((y, i) => y === q.order[i]);
    }
    if (q.form === 'choice' || q.form === 'truefalse') {
      return Math.round(given) === q.answer;
    }
    if (q.form === 'number') {
      const v = typeof given === 'number' ? given : parseInt(String(given).replace(/[^\-0-9]/g, ''), 10);
      return isFinite(v) && v === q.solutionNumber;
    }
    return sameText(given, q.solution, q.exact);
  }

  /* ---------- Antwortart wählen ---------- */
  function pickForm(wanted, available) {
    if (wanted === 'mixed') {
      /* Auswahl etwas seltener, damit die anderen Arten auch drankommen */
      const pool = available.filter(f => f !== 'choice');
      if (pool.length && Math.random() < 0.75) return pool[Math.floor(Math.random() * pool.length)];
      return 'choice';
    }
    return available.indexOf(wanted) >= 0 ? wanted : 'choice';
  }

  /* ---------- Aufbauen ---------- */
  function buildTrueFalse(q, uid) {
    const base = (uid || 1) * 10;
    const right = Math.random() < 0.5;
    const proposal = right ? q.answerLabel : q.wrongOne;
    const yes = { v: base + 8, label: '✓ Richtig' };
    const no = { v: base + 9, label: '✗ Falsch' };
    return {
      proposal: proposal,
      choices: [yes, no],
      answer: right ? yes.v : no.v,
      /* Bei "falsch" soll die Lösung trotzdem die echte Antwort zeigen */
      answerLabel: right ? ('Richtig – ' + q.answerLabel) : ('Falsch – richtig wäre: ' + q.answerLabel)
    };
  }

  function buildLetters(word) {
    const letters = String(word).split('');
    let mixedLetters, guard = 0;
    do { mixedLetters = shuffle(letters.slice()); guard++; }
    while (guard < 20 && mixedLetters.join('') === letters.join('') && letters.length > 1);
    return mixedLetters.map((ch, i) => ({ i: i, ch: ch }));
  }

  /* Eine Aufgabe ziehen. uid = laufende Nummer der Aufgabe auf dem Feld. */
  function create(s, uid) {
    s = s || {};
    const wanted = s.answerMode || 'choice';

    const bank = bankOf(s);

    /* ---- Zeitstrahl wird gelegentlich eingestreut ---- */
    if (bank && s.timeline && s.timelineDue) {
      const t = bank.timeline(s.topic, 3);
      if (t) {
        return {
          form: 'timeline',
          text: 'Bring in die richtige Reihenfolge:',
          items: t.items,
          order: t.order,
          answer: 0,
          answerLabel: t.answerLabel,
          note: 'Vom ältesten zum jüngsten Ereignis.',
          choices: []
        };
      }
    }

    if (bank) {
      const q = bank.create(s.topic, uid);
      const form = pickForm(wanted, q.forms);
      const out = {
        form: form, text: q.q || q.text, answer: q.answer, answerLabel: q.answerLabel,
        note: q.note, group: q.group, choices: q.choices, exact: !!q.exact,
        solution: q.answerLabel, solutionNumber: parseInt(q.answerLabel, 10)
      };
      if (form === 'truefalse') {
        const tf = buildTrueFalse(q, uid);
        out.proposal = tf.proposal;
        out.choices = tf.choices;
        out.answer = tf.answer;
        out.answerLabel = tf.answerLabel;
        out.text = q.text + '  →  ' + tf.proposal;
      } else if (form === 'letters') {
        out.letters = buildLetters(q.answerLabel);
      }
      return out;
    }

    /* ---- Mathe ---- */
    const p = MathGen.create(s.grade, s.level || 1, s.ops, s.ranges);
    const nums = MathGen.choicesFor(p.answer, 4);
    const label = MathGen.sgn(p.answer);
    /* Buchstabensalat gibt es beim Rechnen nicht - dort wird getippt */
    const available = ['choice', 'number', 'truefalse', 'text'];
    const form = pickForm(wanted === 'letters' ? 'number' : wanted, available);

    const out = {
      form: form, text: p.text, answer: p.answer, answerLabel: label, note: '',
      choices: nums.map(v => ({ v: v, label: MathGen.sgn(v) })),
      solution: label, solutionNumber: p.answer
    };
    if (form === 'truefalse') {
      const wrong = nums.filter(v => v !== p.answer);
      const tf = buildTrueFalse({
        answerLabel: label,
        wrongOne: MathGen.sgn(wrong[Math.floor(Math.random() * wrong.length)])
      }, uid);
      out.proposal = tf.proposal;
      out.choices = tf.choices;
      out.answer = tf.answer;
      out.answerLabel = tf.answerLabel;
      out.text = p.text + '  =  ' + tf.proposal;
    }
    return out;
  }

  /* Ergebnis zurückmelden. Bei HSU landet eine falsch beantwortete Frage
     im Wiederholungs-Stapel und kommt in dieser Runde noch einmal dran. */
  function markResult(s, text, correct) {
    const b = bankOf(s);
    if (b) b.markResult(s.topic, text, correct);
  }

  function openRepeats(s) { const b = bankOf(s); return b ? b.openRepeats(s.topic) : 0; }
  function resetRepeats(s) { const b = bankOf(s); if (b) b.resetRepeats(s.topic); }

  /* Welche Antwortarten stehen in diesem Fach zur Auswahl? */
  function formsFor(s) {
    if (isBank(s)) return FORMS;
    return FORMS.filter(f => f.id !== 'letters');
  }

  /* Hat das Thema genug Jahreszahlen für einen Zeitstrahl? */
  function hasTimeline(s) {
    const b = bankOf(s);
    return !!b && b.events(s && s.topic).length >= 3;
  }

  /* Themen eines Fachs - für die Auswahl in den Einstellungen */
  function topics(subject) {
    const b = Bank.of(subject);
    return b ? b.list() : [];
  }

  function topicOf(s) {
    const b = bankOf(s);
    return b ? b.topic(s && s.topic) : null;
  }

  function groupsOf(s) {
    const b = bankOf(s);
    return b ? b.groups(s && s.topic) : [];
  }

  /* Kurzer Text für Menü und Einstellungen */
  function info(s) {
    const b = bankOf(s);
    if (b) {
      const t = b.topic(s && s.topic);
      return { icon: t.icon, name: t.name, detail: t.questions.length + ' Fragen' };
    }
    const g = (s && s.grade) || 1;
    return { icon: '📐', name: MathGen.GRADE_INFO[g].name, detail: MathGen.GRADE_INFO[g].desc };
  }

  global.Quiz = {
    SUBJECTS, FORMS, FORM_INFO,
    create, check, markResult, openRepeats, resetRepeats,
    formsFor, hasTimeline, info, isHsu, isBank, sameText,
    topics, topicOf, groupsOf
  };
})(window);
