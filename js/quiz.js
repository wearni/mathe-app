/* ============================================================
   Schul App - gemeinsame Frage-Schnittstelle

   Die Spiel-Engine soll nicht wissen müssen, ob gerade Mathe oder HSU
   dran ist. Sie fragt hier nach der nächsten Aufgabe und bekommt immer
   dieselbe Form zurück:

     {
       text:        was im Kasten bzw. auf dem Schild steht
       answer:      die richtige Antwort als Zahl (Vergleichswert)
       answerLabel: wie die richtige Antwort geschrieben wird
       choices:     [{ v, label }, ...] für den Auswahl-Modus
       keypad:      true, wenn man die Antwort eintippen kann
     }

   Bei Mathe ist der Vergleichswert das Rechenergebnis - deshalb kann man
   es auch über das Zahlenfeld eingeben. Bei HSU sind die Antworten Texte;
   dort bekommt jede Aufgabe eigene Vergleichswerte, damit zwei Aufgaben
   auf dem Feld sich nicht gegenseitig abschießen.
   ============================================================ */
(function (global) {
  'use strict';

  const SUBJECTS = [
    { id: 'mathe', name: 'Mathe', icon: '📐', desc: 'Rechnen von Klasse 1 bis 6' },
    { id: 'hsu', name: 'HSU', icon: '🌍', desc: 'Heimat- und Sachunterricht' }
  ];

  function isHsu(s) { return (s && s.subject) === 'hsu'; }

  /* Eine Aufgabe ziehen. uid = laufende Nummer der Aufgabe auf dem Feld. */
  function create(s, uid) {
    s = s || {};
    if (isHsu(s)) {
      const q = HSU.create(s.topic, uid);
      q.keypad = false;
      return q;
    }
    const p = MathGen.create(s.grade, s.level || 1, s.ops, s.ranges);
    const nums = MathGen.choicesFor(p.answer, 4);
    return {
      text: p.text,
      answer: p.answer,
      answerLabel: MathGen.sgn(p.answer),
      note: '',
      choices: nums.map(v => ({ v: v, label: MathGen.sgn(v) })),
      keypad: true
    };
  }

  /* Ergebnis zurückmelden. Bei HSU landet eine falsch beantwortete Frage
     im Wiederholungs-Stapel und kommt in dieser Runde noch einmal dran. */
  function markResult(s, text, correct) {
    if (isHsu(s)) HSU.markResult(s.topic, text, correct);
  }

  /* Wie viele Fragen warten gerade auf eine Wiederholung? */
  function openRepeats(s) { return isHsu(s) ? HSU.openRepeats(s.topic) : 0; }

  function resetRepeats(s) { if (isHsu(s)) HSU.resetRepeats(s.topic); }

  /* Darf in diesem Fach über das Zahlenfeld geantwortet werden? */
  function allowsKeypad(s) { return !isHsu(s); }

  /* Kurzer Text für Menü und Einstellungen */
  function info(s) {
    if (isHsu(s)) {
      const t = HSU.topic(s && s.topic);
      return { icon: t.icon, name: t.name, detail: t.questions.length + ' Fragen' };
    }
    const g = (s && s.grade) || 1;
    return { icon: '📐', name: MathGen.GRADE_INFO[g].name, detail: MathGen.GRADE_INFO[g].desc };
  }

  global.Quiz = { SUBJECTS, create, markResult, openRepeats, resetRepeats, allowsKeypad, info, isHsu };
})(window);
