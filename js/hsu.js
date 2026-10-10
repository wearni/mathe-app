/* ============================================================
   Schul App - HSU-Fragen (Heimat- und Sachunterricht)

   Jedes Thema ist eine Liste von Fragen:
     q = Frage (kurz halten, sie muss in den Kasten passen)
     a = richtige Antwort
     w = drei falsche, aber plausible Antworten
     n = optionale Notiz, die nach der Aufgabe eingeblendet wird

   Neue Themen einfach als weiteren Eintrag in TOPICS ergänzen -
   Auswahl, Fortschritt und beide Spielarten kommen von selbst mit.
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

  /* ===================== Stadtgeschichte Traunstein =====================
     Quelle der geprüften Zahlen: Stadt Traunstein (Stadtgeschichte,
     Eingemeindungen, Amtsblatt 11/2026). Wo das Arbeitsblatt eine andere
     Zahl hatte, steht die geprüfte in der Notiz dabei. */
  const TRAUNSTEIN = [

    /* ---------- Steckbrief ---------- */
    { g: 'Steckbrief', q: 'Welche Farben hat die Stadt Traunstein?', a: 'schwarz, gelb, grün',
      w: ['blau, weiß, rot', 'rot, gelb, schwarz', 'grün, weiß, blau'],
      n: 'Im Wappen: schwarzer Schild, grüner Dreiberg, goldene Lilien.' },
    { g: 'Steckbrief', q: 'Wie viele Einwohner hat Traunstein?', a: 'rund 22.600',
      w: ['rund 12.600', 'rund 42.600', 'rund 2.600'] },
    { g: 'Steckbrief', q: 'Wo liegt Traunstein?', a: 'im Südosten von Bayern',
      w: ['im Norden von Bayern', 'im Westen von Bayern', 'in Baden-Württemberg'] },
    { g: 'Steckbrief', q: 'Wie groß ist Traunstein?', a: '48,57 km²',
      w: ['148,57 km²', '8,57 km²', '248,57 km²'] },
    { g: 'Steckbrief', q: 'An welchem Fluss liegt Traunstein?', a: 'an der Traun',
      w: ['an der Isar', 'am Inn', 'an der Salzach'] },
    { g: 'Steckbrief', q: 'Wie heißt der Oberbürgermeister?', a: 'Dr. Christian Hümmer',
      w: ['Dr. Thomas Huber', 'Christian Kegel', 'Dr. Martin Berger'],
      n: 'Im März 2026 wiedergewählt.' },
    { g: 'Steckbrief', q: 'In welcher Partei ist der Oberbürgermeister?', a: 'CSU',
      w: ['SPD', 'Freie Wähler', 'Die Grünen'] },
    { g: 'Steckbrief', q: 'Wie lautet das Autokennzeichen?', a: 'TS',
      w: ['TR', 'TN', 'TST'], n: 'Im Landkreis gibt es außerdem LF (Laufen).' },
    { g: 'Steckbrief', q: 'Wie lautet die Postleitzahl von Traunstein?', a: '83278',
      w: ['83024', '84307', '82378'] },
    { g: 'Steckbrief', q: 'Wo ist die Stadtverwaltung?', a: 'Stadtplatz 39',
      w: ['Bahnhofstraße 39', 'Salinenstraße 7', 'Maxplatz 1'] },
    { g: 'Steckbrief', q: 'Welcher Papst wuchs in Traunstein auf?', a: 'Papst Benedikt XVI.',
      w: ['Papst Franziskus', 'Papst Johannes Paul II.', 'Papst Pius XII.'] },
    { g: 'Steckbrief', q: 'Welcher Schriftsteller lebte in Traunstein?', a: 'Ludwig Thoma',
      w: ['Thomas Mann', 'Erich Kästner', 'Wilhelm Busch'] },

    /* ---------- Geschichte ---------- */
    { g: 'Geschichte', q: 'Wann wurde Traunstein erstmals urkundlich erwähnt?', a: '1245',
      w: ['1145', '1345', '1445'], n: 'Als Gericht und Amt des Klosters Baumburg.' },
    { g: 'Geschichte', q: 'Wie hieß Traunstein in der ersten Urkunde?', a: 'Trauwenstain',
      w: ['Traunburg', 'Trunstat', 'Traunfels'] },
    { g: 'Geschichte', q: 'Wann bekam Traunstein das Stadtrecht?', a: '1375',
      w: ['1275', '1475', '1575'], n: 'Verliehen von Herzog Friedrich.' },
    { g: 'Geschichte', q: 'Wann wurde ein Rathaus erstmals erwähnt?', a: '1486',
      w: ['1286', '1686', '1886'], n: 'Das Rathaus am Stadtplatz wurde 1576 vollendet.' },
    { g: 'Geschichte', q: 'Wann begann die Salzproduktion in der Saline?', a: '1619',
      w: ['1519', '1719', '1819'] },
    { g: 'Geschichte', q: 'Wann endete die Salzproduktion in der Saline?', a: '1912',
      w: ['1972', '1812', '1862'], n: 'Geprüft bei der Stadt Traunstein: 1912.' },
    { g: 'Geschichte', q: 'Wer legte 1704 die Stadt in Brand?', a: 'ungarische Panduren',
      w: ['französische Soldaten', 'schwedische Reiter', 'bayerische Truppen'] },
    { g: 'Geschichte', q: 'Wann brannte die Altstadt von Traunstein?', a: '1851',
      w: ['1751', '1801', '1901'], n: 'In der Nacht vom 25. auf den 26. April.' },
    { g: 'Geschichte', q: 'Wann wurde die Freiwillige Feuerwehr gegründet?', a: '1859',
      w: ['1759', '1889', '1919'] },
    { g: 'Geschichte', q: 'Wann wurde Traunstein Große Kreisstadt?', a: '1972',
      w: ['1922', '1952', '1992'], n: 'Bei der Gebietsreform 1972.' },
    { g: 'Geschichte', q: 'Wann wurden Kammer und Hochberg eingemeindet?', a: '1972',
      w: ['1952', '1914', '1978'] },
    { g: 'Geschichte', q: 'Wann wurden Haslach und Wolkersdorf eingemeindet?', a: '1978',
      w: ['1972', '1914', '1952'] },
    { g: 'Geschichte', q: 'Wann wurde Au eingemeindet?', a: '1914',
      w: ['1972', '1978', '1851'] },
    { g: 'Geschichte', q: 'Wie heißt die Stadtpfarrkirche?', a: 'St. Oswald',
      w: ['St. Michael', 'St. Georg', 'St. Martin'] },
    { g: 'Geschichte', q: 'Wie heißt der Brunnen mit der Ritterfigur?', a: 'Lindlbrunnen',
      w: ['Salinenbrunnen', 'Marienbrunnen', 'Traunbrunnen'] },
    { g: 'Geschichte', q: 'Wie heißt der Turm am Stadtplatz?', a: 'Jacklturm',
      w: ['Salzturm', 'Georgsturm', 'Pulverturm'] },

    /* ---------- Was ist eine Gemeinde? ---------- */
    { g: 'Gemeinde', q: 'Wie nennt man eine Gemeinde auch?', a: 'Kommune',
      w: ['Kolonie', 'Kommission', 'Kantine'] },
    { g: 'Gemeinde', q: 'Wie nennt man wahlberechtigte Einwohner?', a: 'Bürger',
      w: ['Gäste', 'Beamte', 'Nachbarn'] },
    { g: 'Gemeinde', q: 'Wen wählen die Bürger einer Gemeinde?', a: 'Gemeinderat und Bürgermeister',
      w: ['den Landrat', 'den Ministerpräsidenten', 'den Bundeskanzler'] },
    { g: 'Gemeinde', q: 'Was bildet der Gemeinderat?', a: 'die Regierung der Gemeinde',
      w: ['die Verwaltung', 'das Gericht', 'die Polizei'] },
    { g: 'Gemeinde', q: 'Wie heißen die Teile einer Gemeinde?', a: 'Ortsteile',
      w: ['Bezirke', 'Kreise', 'Reviere'] },
    { g: 'Gemeinde', q: 'Eine Gemeinde ist entweder …', a: 'eine Stadt oder ein Dorf',
      w: ['ein Land oder ein Kreis', 'eine Burg oder ein Hof', 'ein Bezirk oder ein Staat'] },
    { g: 'Gemeinde', q: 'Wo ist der Sitz der Verwaltung?', a: 'im Rathaus',
      w: ['in der Schule', 'im Landratsamt', 'in der Kirche'] },
    { g: 'Gemeinde', q: 'Woraus besteht eine Verwaltung?', a: 'aus verschiedenen Ämtern',
      w: ['aus Vereinen', 'aus Firmen', 'aus Schulen'] },
    { g: 'Gemeinde', q: 'Welches Amt gehört zur Verwaltung?', a: 'das Einwohnermeldeamt',
      w: ['das Finanzministerium', 'das Auswärtige Amt', 'das Patentamt'] },
    { g: 'Gemeinde', q: 'Wer ist der Leiter der Verwaltung?', a: 'der Bürgermeister',
      w: ['der Landrat', 'der Gemeinderat', 'der Pfarrer'] },

    /* ---------- Aufgaben der Gemeinde ---------- */
    { g: 'Aufgaben', q: 'Aufgaben, die jede Gemeinde erfüllen muss?', a: 'Pflichtaufgaben',
      w: ['freiwillige Aufgaben', 'Sonderaufgaben', 'Hausaufgaben'] },
    { g: 'Aufgaben', q: 'Aufgaben, die eine Gemeinde erfüllen kann?', a: 'freiwillige Aufgaben',
      w: ['Pflichtaufgaben', 'Notaufgaben', 'Zusatzsteuern'] },
    { g: 'Aufgaben', q: 'Was ist eine Pflichtaufgabe?', a: 'Müllbeseitigung',
      w: ['Schwimmbad', 'Bücherei', 'Museum'] },
    { g: 'Aufgaben', q: 'Was ist eine Pflichtaufgabe?', a: 'Trinkwasserversorgung',
      w: ['Sportanlage', 'Spielplatz', 'Konzert'] },
    { g: 'Aufgaben', q: 'Was ist eine Pflichtaufgabe?', a: 'Feuerwehr und Feuerschutz',
      w: ['Stadtfest', 'Kino', 'Museum'] },
    { g: 'Aufgaben', q: 'Was ist eine Pflichtaufgabe?', a: 'Schulen und Kindergärten',
      w: ['Bücherei', 'Schwimmbad', 'Spielplatz'] },
    { g: 'Aufgaben', q: 'Was ist eine freiwillige Aufgabe?', a: 'Bau von Spielplätzen',
      w: ['Straßenbau', 'Friedhof', 'Abwasserbeseitigung'] },
    { g: 'Aufgaben', q: 'Was ist eine freiwillige Aufgabe?', a: 'Bücherei und Museen',
      w: ['Trinkwasser', 'Müllabfuhr', 'Feuerwehr'] },
    { g: 'Aufgaben', q: 'Was ist eine freiwillige Aufgabe?', a: 'Bau eines Schwimmbads',
      w: ['Bau einer Schule', 'Bau einer Straße', 'Bau eines Friedhofs'] },
    { g: 'Aufgaben', q: 'Was braucht die Gemeinde für ihre Aufgaben?', a: 'Geld',
      w: ['Ferien', 'Gäste', 'Glück'] },

    /* ---------- Woher kommt das Geld? ---------- */
    { g: 'Geld', q: 'Woher bekommt die Gemeinde ihr Geld?', a: 'Steuern, Gebühren, sonstige Einnahmen',
      w: ['nur aus Steuern', 'vom Bundeskanzler', 'aus der Lotterie'] },
    { g: 'Geld', q: 'Welche Steuer zahlt man für einen Hund?', a: 'Hundesteuer',
      w: ['Grundsteuer', 'Gewerbesteuer', 'Einkommensteuer'] },
    { g: 'Geld', q: 'Welche Steuer zahlen Firmen?', a: 'Gewerbesteuer',
      w: ['Hundesteuer', 'Grundsteuer', 'Kirchensteuer'] },
    { g: 'Geld', q: 'Welche Steuer zahlt man für ein Grundstück?', a: 'Grundsteuer',
      w: ['Gewerbesteuer', 'Hundesteuer', 'Einkommensteuer'] },
    { g: 'Geld', q: 'Welche Steuer zahlt man vom Verdienst?', a: 'Einkommensteuer',
      w: ['Grundsteuer', 'Hundesteuer', 'Gewerbesteuer'] },
    { g: 'Geld', q: 'Was zahlt man für die Müllabfuhr?', a: 'eine Gebühr',
      w: ['eine Steuer', 'ein Bußgeld', 'eine Pacht'] },
    { g: 'Geld', q: 'Was ist eine Gebühr?', a: 'Geld für eine Leistung der Gemeinde',
      w: ['Geld vom Staat', 'eine Strafe', 'ein Geschenk'] },
    { g: 'Geld', q: 'Was zählt zu den sonstigen Einnahmen?', a: 'Bußgelder',
      w: ['Hundesteuer', 'Müllgebühren', 'Grundsteuer'] },
    { g: 'Geld', q: 'Wer gibt der Gemeinde Zuschüsse?', a: 'der Staat',
      w: ['die Nachbargemeinde', 'die Kirche', 'die Schule'] },
    { g: 'Geld', q: 'Wie heißt der Plan für Einnahmen und Ausgaben?', a: 'Haushaltsplan',
      w: ['Stadtplan', 'Bebauungsplan', 'Stundenplan'] },
    { g: 'Geld', q: 'Wie hoch dürfen die Ausgaben sein?', a: 'nicht höher als die Einnahmen',
      w: ['doppelt so hoch', 'beliebig hoch', 'halb so hoch'] }
  ];

  const TOPICS = [
    {
      id: 'traunstein',
      name: 'Stadtgeschichte Traunstein',
      icon: '🏰',
      desc: 'Steckbrief, Geschichte, Gemeinde, Aufgaben und Geld',
      questions: TRAUNSTEIN
    }
  ];

  const BY_ID = {};
  TOPICS.forEach(t => { BY_ID[t.id] = t; });

  function topic(id) { return BY_ID[id] || TOPICS[0]; }

  function list() {
    return TOPICS.map(t => ({
      id: t.id, name: t.name, icon: t.icon, desc: t.desc, count: t.questions.length
    }));
  }

  /* Welche Themenbereiche stecken drin? Nur für die Anzeige. */
  function groups(id) {
    const seen = [];
    topic(id).questions.forEach(q => { if (seen.indexOf(q.g) < 0) seen.push(q.g); });
    return seen;
  }

  let lastQ = '';

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
    if (topicId) missed[topic(topicId).id] = [];
    else Object.keys(missed).forEach(k => { missed[k] = []; });
  }

  /* Eine Frage ziehen. uid macht die Antwortwerte eindeutig, damit zwei
     Aufgaben auf dem Feld sich nicht gegenseitig abschießen. */
  function create(topicId, uid) {
    const t = topic(topicId);
    const all = t.questions;
    const b = bucket(t.id);

    let q = null;
    /* mit etwas Glück eine Frage, die vorhin danebenging */
    if (b.length && Math.random() < REPEAT_CHANCE) {
      const cand = b.map(x => all.find(a => a.q === x.q)).filter(Boolean)
        .filter(a => a.q !== lastQ);
      if (cand.length) q = cand[Math.floor(Math.random() * cand.length)];
    }
    let guard = 0;
    while (!q || (q.q === lastQ && guard < 12)) {
      q = all[Math.floor(Math.random() * all.length)];
      guard++;
    }
    lastQ = q.q;

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
      choices: choices
    };
  }

  global.HSU = { TOPICS, list, topic, groups, create, markResult, openRepeats, resetRepeats };
})(window);
