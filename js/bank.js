/* ============================================================
   Schul App - Fragen-Baukasten

   Die Fächer mit festem Fragenkatalog (HSU, Deutsch, ...) unterscheiden
   sich nur in ihren Fragen. Alles andere - Themenliste, Ziehen einer
   Frage, Wiederholungs-Stapel, passende Antwortarten, Zeitstrahl - ist
   überall gleich und steht deshalb hier.

   Ein neues Fach braucht nur noch eine Datei mit Fragen und eine Zeile:

     window.Deutsch = Bank.make('deutsch', TOPICS);

   Eine Frage sieht so aus:
     q  = Frage (kurz halten, sie muss in den Kasten passen)
     a  = richtige Antwort
     w  = drei falsche, aber plausible Antworten
     n  = optionale Notiz, die nach der Aufgabe eingeblendet wird
     g  = Bereich, in den die Frage gehört (nur für die Anzeige)
     ev = nur bei Jahreszahlen: Kurzname für den Zeitstrahl
   ============================================================ */
(function (global) {
  'use strict';

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Welche Antwortarten passen zu dieser Frage? Nicht jede Antwort lässt
     sich eintippen oder aus Buchstaben zusammensetzen. */
  function formsFor(q) {
    const a = String(q.a).trim();
    const out = ['choice', 'truefalse'];
    if (/^\d{1,6}$/.test(a)) out.push('number');
    if (/^[A-Za-zÄÖÜäöüß-]{3,14}$/.test(a)) out.push('letters');
    if (a.length <= 22) out.push('text');
    return out;
  }

  /* Jahreszahl-Frage? Entweder ausdrücklich mit y: 1 markiert oder eine
     Frage, deren Antwort eine Jahreszahl ist (die haben auch ein ev fürs
     Zeitstrahl-Label). Solche Fragen lassen sich abschalten, wenn im
     Unterricht gerade keine Jahreszahlen drankommen. */
  function isYear(q) {
    return !!q.y || (!!q.ev && /^\d{3,4}$/.test(String(q.a)));
  }

  const ALL = {};          /* subjectId -> Fach-Objekt */

  function make(subjectId, TOPICS) {
    const BY_ID = {};
    TOPICS.forEach(t => { BY_ID[t.id] = t; });

    function topic(id) { return BY_ID[id] || TOPICS[0]; }

    function list(opts) {
      return TOPICS.map(t => ({
        id: t.id, name: t.name, icon: t.icon, desc: t.desc,
        count: pool(t, opts).length, all: t.questions.length
      }));
    }

    /* Welche Fragen sind gerade im Spiel? */
    function pool(t, opts) {
      if (opts && opts.years === false) return t.questions.filter(q => !isYear(q));
      return t.questions;
    }

    /* Hat das Thema überhaupt Jahreszahl-Fragen? Nur dann lohnt der Schalter. */
    function hasYears(topicId) { return topic(topicId).questions.some(isYear); }

    /* ---------- Hefteinträge ----------
       Aus 'Sie wird auch {Kommune} genannt.' wird eine Folge aus Text und
       Lücken plus die Liste der Wörter, die hineingehören. */
    function parseSheet(sh) {
      const parts = [], words = [];
      const re = /\{([^}]+)\}/g;
      let last = 0, m;
      while ((m = re.exec(sh.text)) !== null) {
        if (m.index > last) parts.push({ t: sh.text.slice(last, m.index) });
        parts.push({ gap: words.length });
        words.push(m[1]);
        last = m.index + m[0].length;
      }
      if (last < sh.text.length) parts.push({ t: sh.text.slice(last) });
      return { id: sh.id, title: sh.titel, parts: parts, words: words, extra: (sh.extra || []).slice() };
    }

    function sheets(topicId) { return (topic(topicId).sheets || []).map(parseSheet); }
    function hasSheets(topicId) { return sheets(topicId).length > 0; }

    let lastSheet = '';

    /* Einen Hefteintrag ziehen - nicht zweimal denselben hintereinander. */
    function sheet(topicId) {
      const all = sheets(topicId);
      if (!all.length) return null;
      const frei = all.filter(x => x.id !== lastSheet);
      const pool = frei.length ? frei : all;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      lastSheet = pick.id;
      return pick;
    }

    /* Welche Themenbereiche stecken drin? Nur für die Anzeige. */
    function groups(id, opts) {
      const seen = [];
      pool(topic(id), opts).forEach(q => { if (seen.indexOf(q.g) < 0) seen.push(q.g); });
      return seen;
    }

    /* ---------- Abstand ----------
       Die zuletzt gestellten Fragen sind für eine Weile gesperrt. Ohne das
       kann eine Frage, die auf dem Wiederholungs-Stapel liegt, dreimal
       unter den ersten fünf auftauchen - das nervt mehr, als es hilft. */
    const recent = [];
    const COOLDOWN = 5;

    function cooldown(all) { return Math.min(COOLDOWN, Math.max(0, all.length - 2)); }
    function fresh(q) { return recent.indexOf(q.q) < 0; }
    function remember(q, all) {
      recent.push(q.q);
      while (recent.length > cooldown(all)) recent.shift();
    }

    /* ---------- Wiederholung ----------
       Was einmal danebenging, kommt in dieser Runde noch einmal dran - und
       fliegt erst wieder raus, wenn es zweimal richtig beantwortet wurde.
       Genau dafür ist das Fach da. */
    const missed = {};            /* topicId -> [{ q, left }] */
    const REPEAT_CHANCE = 0.45;

    function bucket(id) {
      if (!missed[id]) missed[id] = [];
      return missed[id];
    }

    function markResult(topicId, text, correct) {
      const id = topic(topicId).id;
      const b = bucket(id);
      const i = b.findIndex(x => x.q === text);
      if (correct) {
        if (i >= 0 && --b[i].left <= 0) b.splice(i, 1);
        return;
      }
      if (i >= 0) b[i].left = 2;
      else b.push({ q: text, left: 2 });
      if (b.length > 12) b.shift();
    }

    function openRepeats(topicId) { return bucket(topic(topicId).id).length; }

    function resetRepeats(topicId) {
      recent.length = 0;
      if (topicId) missed[topic(topicId).id] = [];
      else Object.keys(missed).forEach(k => { missed[k] = []; });
    }

    /* Wie viele Jahreszahl-Ereignisse hat das Thema? (für den Zeitstrahl) */
    function events(topicId) {
      return topic(topicId).questions
        .filter(q => q.ev && /^\d{3,4}$/.test(String(q.a)))
        .map(q => ({ label: q.ev, year: parseInt(q.a, 10), note: q.n || '' }));
    }

    /* Eine Zeitstrahl-Aufgabe: n Ereignisse, die in die richtige Reihenfolge
       gebracht werden müssen. Gleiche Jahre werden ausgelassen, sonst gäbe es
       mehr als eine richtige Lösung. */
    function timeline(topicId, n) {
      const all = events(topicId);
      if (all.length < 3) return null;
      n = Math.min(Math.max(n || 3, 3), 4);

      let pick_, guard = 0;
      do {
        pick_ = shuffle(all.slice()).slice(0, n);
        guard++;
      } while (guard < 30 && new Set(pick_.map(e => e.year)).size !== pick_.length);
      if (new Set(pick_.map(e => e.year)).size !== pick_.length) return null;

      const sorted = pick_.slice().sort((a, b) => a.year - b.year);
      return {
        items: shuffle(pick_.slice()).map(e => ({ label: e.label, year: e.year })),
        order: sorted.map(e => e.year),
        answerLabel: sorted.map(e => e.year + ' ' + e.label).join('  ·  ')
      };
    }

    /* Eine Frage ziehen. uid macht die Antwortwerte eindeutig, damit zwei
       Aufgaben auf dem Feld sich nicht gegenseitig abschießen. */
    function create(topicId, uid, opts) {
      const t = topic(topicId);
      const all = pool(t, opts);
      const b = bucket(t.id);

      let q = null;
      /* mit etwas Glück eine Frage, die vorhin danebenging */
      if (b.length && Math.random() < REPEAT_CHANCE) {
        const cand = b.map(x => all.find(a => a.q === x.q)).filter(Boolean).filter(fresh);
        if (cand.length) q = cand[Math.floor(Math.random() * cand.length)];
      }
      if (!q) {
        const pool = all.filter(fresh);
        const src = pool.length ? pool : all;
        q = src[Math.floor(Math.random() * src.length)];
      }
      remember(q, all);

      const base = (uid || 1) * 10;
      const labels = shuffle([q.a].concat(q.w.slice(0, 3)));
      const choices = labels.map((label, i) => ({ v: base + i, label }));
      const correct = choices[labels.indexOf(q.a)];

      return {
        text: q.q,
        answer: correct.v,
        answerLabel: q.a,
        note: q.n || '',
        group: q.g || '',
        choices: choices,
        forms: formsFor(q),
        /* x = 1: hier zählt die genaue Schreibweise, kein Tippfehler-Bonus */
        exact: !!q.x,
        /* für Wahr/Falsch: ein Vorschlag, der stimmen kann oder nicht */
        wrongOne: q.w[Math.floor(Math.random() * q.w.length)]
      };
    }

    const api = {
      id: subjectId, TOPICS, list, topic, groups, create, hasYears,
      sheets, sheet, hasSheets,
      markResult, openRepeats, resetRepeats, formsFor, events, timeline
    };
    ALL[subjectId] = api;
    return api;
  }

  function of(subjectId) { return ALL[subjectId] || null; }

  global.Bank = { make, of, formsFor, shuffle, isYear };
})(window);
