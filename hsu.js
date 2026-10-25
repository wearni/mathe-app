/* ============================================================
   Schul App - HSU-Fragen (Heimat- und Sachunterricht)

   Hier stehen nur die Fragen. Die Mechanik dahinter - Themenliste,
   Ziehen, Wiederholungs-Stapel, Antwortarten, Zeitstrahl - kommt aus
   js/bank.js und ist für alle Fächer mit Fragenkatalog dieselbe.

   Jede Frage:
     q = Frage (kurz halten, sie muss in den Kasten passen)
     a = richtige Antwort
     w = drei falsche, aber plausible Antworten
     n = optionale Notiz, die nach der Aufgabe eingeblendet wird

   Neue Themen einfach als weiteren Eintrag in TOPICS ergänzen -
   Auswahl, Fortschritt und beide Spielarten kommen von selbst mit.
   ============================================================ */
(function (global) {
  'use strict';

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
    { g: 'Geschichte', q: 'Wann wurde Traunstein erstmals urkundlich erwähnt?', a: '1245', ev: 'erste urkundliche Erwähnung',
      w: ['1145', '1345', '1445'], n: 'Als Gericht und Amt des Klosters Baumburg.' },
    { g: 'Geschichte', q: 'Wie hieß Traunstein in der ersten Urkunde?', a: 'Trauwenstain',
      w: ['Traunburg', 'Trunstat', 'Traunfels'] },
    { g: 'Geschichte', q: 'Wann bekam Traunstein das Stadtrecht?', a: '1375', ev: 'Stadtrecht',
      w: ['1275', '1475', '1575'], n: 'Verliehen von Herzog Friedrich.' },
    { g: 'Geschichte', q: 'Wann wurde ein Rathaus erstmals erwähnt?', a: '1486', ev: 'erstes Rathaus erwähnt',
      w: ['1286', '1686', '1886'], n: 'Das Rathaus am Stadtplatz wurde 1576 vollendet.' },
    { g: 'Geschichte', q: 'Wann begann die Salzproduktion in der Saline?', a: '1619', ev: 'Saline beginnt',
      w: ['1519', '1719', '1819'] },
    { g: 'Geschichte', q: 'Wann endete die Salzproduktion in der Saline?', a: '1912', ev: 'Saline endet',
      w: ['1972', '1812', '1862'], n: 'Geprüft bei der Stadt Traunstein: 1912.' },
    { g: 'Geschichte', q: 'Wer legte 1704 die Stadt in Brand?', a: 'ungarische Panduren',
      w: ['französische Soldaten', 'schwedische Reiter', 'bayerische Truppen'] },
    { g: 'Geschichte', q: 'Wann brannte die Altstadt von Traunstein?', a: '1851', ev: 'Altstadtbrand',
      w: ['1751', '1801', '1901'], n: 'In der Nacht vom 25. auf den 26. April.' },
    { g: 'Geschichte', q: 'Wann wurde die Freiwillige Feuerwehr gegründet?', a: '1859', ev: 'Feuerwehr gegründet',
      w: ['1759', '1889', '1919'] },
    { g: 'Geschichte', q: 'Wann wurde Traunstein Große Kreisstadt?', a: '1972', ev: 'Große Kreisstadt',
      w: ['1922', '1952', '1992'], n: 'Bei der Gebietsreform 1972.' },
    { g: 'Geschichte', q: 'Wann wurden Kammer und Hochberg eingemeindet?', a: '1972', ev: 'Kammer und Hochberg dazu',
      w: ['1952', '1914', '1978'] },
    { g: 'Geschichte', q: 'Wann wurden Haslach und Wolkersdorf eingemeindet?', a: '1978', ev: 'Haslach und Wolkersdorf dazu',
      w: ['1972', '1914', '1952'] },
    { g: 'Geschichte', q: 'Wann wurde Au eingemeindet?', a: '1914', ev: 'Au dazu',
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
    { g: 'Aufgaben', q: 'Welche Pflichtaufgabe hat mit Wasser zu tun?', a: 'Trinkwasserversorgung',
      w: ['Sportanlage', 'Spielplatz', 'Konzert'] },
    { g: 'Aufgaben', q: 'Welche Pflichtaufgabe schützt vor Feuer?', a: 'Feuerwehr und Feuerschutz',
      w: ['Stadtfest', 'Kino', 'Museum'] },
    { g: 'Aufgaben', q: 'Welche Pflichtaufgabe betrifft Kinder?', a: 'Schulen und Kindergärten',
      w: ['Bücherei', 'Schwimmbad', 'Spielplatz'] },
    { g: 'Aufgaben', q: 'Was ist eine freiwillige Aufgabe?', a: 'Bau von Spielplätzen',
      w: ['Straßenbau', 'Friedhof', 'Abwasserbeseitigung'] },
    { g: 'Aufgaben', q: 'Welche freiwillige Aufgabe ist zum Lesen?', a: 'Bücherei und Museen',
      w: ['Trinkwasser', 'Müllabfuhr', 'Feuerwehr'] },
    { g: 'Aufgaben', q: 'Welchen Bau muss die Gemeinde nicht machen?', a: 'Bau eines Schwimmbads',
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
      w: ['doppelt so hoch', 'beliebig hoch', 'halb so hoch'] },

    /* ---------- Ämter einer Gemeinde ---------- */
    { g: 'Ämter', q: 'Wohin geht man, wenn man umgezogen ist?', a: 'Einwohnermeldeamt',
      w: ['Fundamt', 'Standesamt', 'Passamt'] },
    { g: 'Ämter', q: 'Wo meldet man einen verlorenen Schirm?', a: 'Fundamt',
      w: ['Ordnungsamt', 'Passamt', 'Steueramt'] },
    { g: 'Ämter', q: 'Welches Amt ist für Hochzeiten zuständig?', a: 'Standesamt',
      w: ['Ordnungsamt', 'Einwohnermeldeamt', 'Jugendamt'] },
    { g: 'Ämter', q: 'Wo holt man seinen neuen Pass ab?', a: 'Passamt',
      w: ['Fundamt', 'Standesamt', 'Gewerbeamt'] },
    { g: 'Ämter', q: 'Wer kümmert sich um zu viel bezahlte Steuer?', a: 'Steueramt',
      w: ['Kämmerei', 'Ordnungsamt', 'Bauamt'] },
    { g: 'Ämter', q: 'Wohin geht man, um ein Geschäft zu eröffnen?', a: 'Gewerbeamt',
      w: ['Steueramt', 'Bauamt', 'Kulturamt'] },
    { g: 'Ämter', q: 'Der Nachbarhund läuft frei herum. Welches Amt?', a: 'Ordnungsamt',
      w: ['Fundamt', 'Jugendamt', 'Standesamt'] },
    { g: 'Ämter', q: 'Welches Amt hilft Menschen aus dem Ausland?', a: 'Ausländeramt',
      w: ['Passamt', 'Ordnungsamt', 'Einwohnermeldeamt'] },
    { g: 'Ämter', q: 'Welches Amt verwaltet das Geld der Gemeinde?', a: 'Kämmerei',
      w: ['Steueramt', 'Bauamt', 'Kulturamt'] },
    { g: 'Ämter', q: 'Welches Amt genehmigt den Bau eines Hauses?', a: 'Bauamt',
      w: ['Ordnungsamt', 'Gewerbeamt', 'Kämmerei'] },
    { g: 'Ämter', q: 'Welches Amt kümmert sich um Feste und Kultur?', a: 'Kulturamt',
      w: ['Jugendamt', 'Bauamt', 'Fundamt'] },
    { g: 'Ämter', q: 'Welches Amt ist für Kinder und Jugendliche da?', a: 'Jugendamt',
      w: ['Kulturamt', 'Standesamt', 'Ordnungsamt'] },
    { g: 'Ämter', q: 'Wo sitzen die Ämter einer Gemeinde?', a: 'im Rathaus',
      w: ['im Landratsamt', 'in der Schule', 'im Finanzamt'] },

    /* ---------- Wer entscheidet in einer Gemeinde? ---------- */
    { g: 'Entscheiden', q: 'Wer trifft die wichtigen Entscheidungen?', a: 'Bürgermeister und Gemeinderat',
      w: ['nur der Bürgermeister', 'nur der Gemeinderat', 'der Landrat'] },
    { g: 'Entscheiden', q: 'Wie heißt der Gemeinderat in einer Stadt?', a: 'Stadtrat',
      w: ['Ortsrat', 'Kreistag', 'Landtag'] },
    { g: 'Entscheiden', q: 'Wie viele Stadträte hat Traunstein?', a: '30',
      w: ['20', '40', '12'], n: 'Dazu kommt der Oberbürgermeister.' },
    { g: 'Entscheiden', q: 'Wovon hängt die Zahl der Gemeinderäte ab?', a: 'von der Größe der Gemeinde',
      w: ['vom Alter der Gemeinde', 'vom Geld der Gemeinde', 'vom Bürgermeister'] },
    { g: 'Entscheiden', q: 'Wie heißt der Bürgermeister in großen Städten?', a: 'Oberbürgermeister',
      w: ['Hauptbürgermeister', 'Stadtdirektor', 'Landrat'] },
    { g: 'Entscheiden', q: 'Alle wie viele Jahre wird gewählt?', a: 'alle 6 Jahre',
      w: ['alle 4 Jahre', 'alle 5 Jahre', 'alle 8 Jahre'] },
    { g: 'Entscheiden', q: 'Wie nennt man die Wahl in einer Gemeinde?', a: 'Kommunalwahl',
      w: ['Bundestagswahl', 'Landtagswahl', 'Europawahl'] },
    { g: 'Entscheiden', q: 'Ab welchem Alter darf man wählen?', a: 'ab 18 Jahren',
      w: ['ab 14 Jahren', 'ab 16 Jahren', 'ab 21 Jahren'] },
    { g: 'Entscheiden', q: 'Was für eine Wahl ist die Kommunalwahl?', a: 'eine demokratische Wahl',
      w: ['eine geheime Losung', 'eine Abstimmung im Landtag', 'eine Ernennung'] },
    { g: 'Entscheiden', q: 'Wer hat den Vorsitz des Gemeinderates?', a: 'der Bürgermeister',
      w: ['der älteste Gemeinderat', 'der Landrat', 'der Kämmerer'] },
    { g: 'Entscheiden', q: 'Wer leitet den Gemeinderat?', a: 'der Bürgermeister',
      w: ['der Stadtrat', 'der Landrat', 'die Verwaltung'] },
    { g: 'Entscheiden', q: 'Wer kontrolliert den Bürgermeister?', a: 'der Gemeinderat',
      w: ['die Bürger', 'der Landrat', 'das Ordnungsamt'] },
    { g: 'Entscheiden', q: 'Wessen Interessen vertreten die beiden?', a: 'die der Einwohner',
      w: ['die der Firmen', 'die eigenen', 'die des Landkreises'] },
    { g: 'Entscheiden', q: 'Worüber entscheiden sie gemeinsam?', a: 'über Anträge',
      w: ['über Hausaufgaben', 'über Gesetze', 'über Steuersätze im Bund'] },
    { g: 'Entscheiden', q: 'Was machen Bürgermeister und Gemeinderat?', a: 'Aufgaben für uns alle übernehmen',
      w: ['nur Geld verteilen', 'Gesetze für Bayern machen', 'die Schule leiten'] }
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

  global.HSU = Bank.make('hsu', TOPICS);
})(window);
