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
    { g: 'Steckbrief', q: 'Wie viele Einwohner hat Traunstein?', a: '22.698',
      w: ['12.698', '32.698', '2.698'], n: 'Stand Januar 2026 – so steht es im Heft.' },
    { g: 'Steckbrief', q: 'Wie heißt Traunstein auf Oberbayerisch?', a: 'Traunstoa',
      w: ['Traunstoan', 'Traunsta', 'Staunstoa'] },
    { g: 'Steckbrief', q: 'Welcher Sportler kommt aus Traunstein?', a: 'Tobias Angerer',
      w: ['Felix Neureuther', 'Markus Wasmeier', 'Thomas Müller'], n: 'Langläufer, zweimal Olympia-Silber.' },
    { g: 'Steckbrief', q: 'Welches Reiterfest gibt es in Traunstein?', a: 'der Georgiritt',
      w: ['das Oktoberfest', 'das Gäubodenfest', 'der Almabtrieb'], n: 'Jedes Jahr am Ostermontag.' },
    { g: 'Steckbrief', q: 'Wie heißt das Kulturfest im Sommer?', a: 'Kultursommer',
      w: ['Salzfest', 'Traunfest', 'Stadtsommer'] },
    { g: 'Steckbrief', q: 'Welche Sehenswürdigkeit gehört zum Salz?', a: 'die Saline',
      w: ['der Jacklturm', 'der Lindlbrunnen', 'die Stadtpfarrkirche'] },
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
    { g: 'Geschichte', q: 'Wann wurde Traunstein erstmals urkundlich erwähnt?', a: '1245', y: 1, ev: 'erste urkundliche Erwähnung',
      w: ['1145', '1345', '1445'], n: 'Als Gericht und Amt des Klosters Baumburg.' },
    { g: 'Geschichte', q: 'Wie hieß Traunstein in der ersten Urkunde?', a: 'Trauwenstain',
      w: ['Traunburg', 'Trunstat', 'Traunfels'] },
    { g: 'Geschichte', q: 'Wann bekam Traunstein das Stadtrecht?', a: '1375', y: 1, ev: 'Stadtrecht',
      w: ['1275', '1475', '1575'], n: 'Verliehen von Herzog Friedrich.' },
    { g: 'Geschichte', q: 'Wann wurde ein Rathaus erstmals erwähnt?', a: '1486', y: 1, ev: 'erstes Rathaus erwähnt',
      w: ['1286', '1686', '1886'], n: 'Das Rathaus am Stadtplatz wurde 1576 vollendet.' },
    { g: 'Geschichte', q: 'Wann begann die Salzproduktion in der Saline?', a: '1619', y: 1, ev: 'Saline beginnt',
      w: ['1519', '1719', '1819'] },
    { g: 'Geschichte', q: 'Wann endete die Salzproduktion in der Saline?', a: '1912', y: 1, ev: 'Saline endet',
      w: ['1972', '1812', '1862'], n: 'Geprüft bei der Stadt Traunstein: 1912.' },
    { g: 'Geschichte', q: 'Wer legte 1704 die Stadt in Brand?', a: 'ungarische Panduren',
      w: ['französische Soldaten', 'schwedische Reiter', 'bayerische Truppen'] },
    { g: 'Geschichte', q: 'Wann brannte die Altstadt von Traunstein?', a: '1851', y: 1, ev: 'Altstadtbrand',
      w: ['1751', '1801', '1901'], n: 'In der Nacht vom 25. auf den 26. April.' },
    { g: 'Geschichte', q: 'Wann wurde die Freiwillige Feuerwehr gegründet?', a: '1859', y: 1, ev: 'Feuerwehr gegründet',
      w: ['1759', '1889', '1919'] },
    { g: 'Geschichte', q: 'Wann wurde Traunstein Große Kreisstadt?', a: '1972', y: 1, ev: 'Große Kreisstadt',
      w: ['1922', '1952', '1992'], n: 'Bei der Gebietsreform 1972.' },
    { g: 'Geschichte', q: 'Wann wurden Kammer und Hochberg eingemeindet?', a: '1972', y: 1, ev: 'Kammer und Hochberg dazu',
      w: ['1952', '1914', '1978'] },
    { g: 'Geschichte', q: 'Wann wurden Haslach und Wolkersdorf eingemeindet?', a: '1978', y: 1, ev: 'Haslach und Wolkersdorf dazu',
      w: ['1972', '1914', '1952'] },
    { g: 'Geschichte', q: 'Wann wurde Au eingemeindet?', a: '1914', y: 1, ev: 'Au dazu',
      w: ['1972', '1978', '1851'] },
    { g: 'Geschichte', q: 'Wie heißt die Stadtpfarrkirche?', a: 'St. Oswald',
      w: ['St. Michael', 'St. Georg', 'St. Martin'] },
    { g: 'Geschichte', q: 'Wie heißt der Brunnen mit der Ritterfigur?', a: 'Lindlbrunnen',
      w: ['Salinenbrunnen', 'Marienbrunnen', 'Traunbrunnen'] },
    { g: 'Geschichte', q: 'Wie heißt der Turm am Stadtplatz?', a: 'Jacklturm',
      w: ['Salzturm', 'Georgsturm', 'Pulverturm'] },

    /* ---------- Was ist eine Gemeinde? ---------- */
    { g: 'Gemeinde', q: 'Was ist eine Gemeinde?', a: 'ein Ort, an dem Menschen leben',
      w: ['ein Amt im Rathaus', 'eine Gruppe von Firmen', 'ein Teil vom Landkreis'] },
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
    { g: 'Aufgaben', q: 'Welche Pflichtaufgabe betrifft die Straßen?', a: 'Straßenbau',
      w: ['Bücherei', 'Museum', 'Sportanlage'] },
    { g: 'Aufgaben', q: 'Welche Pflichtaufgabe plant den Ort?', a: 'Ortsplanung',
      w: ['Kultursommer', 'Spielplatzbau', 'Schwimmbad'] },
    { g: 'Aufgaben', q: 'Welche Pflichtaufgabe liefert Strom und Gas?', a: 'Strom- und Gasversorgung',
      w: ['Bücherei', 'Museum', 'Sportanlage'] },
    { g: 'Aufgaben', q: 'Wohin bringt die Gemeinde das Abwasser?', a: 'Abwasserbeseitigung',
      w: ['Trinkwasserversorgung', 'Müllbeseitigung', 'Ortsplanung'] },
    { g: 'Aufgaben', q: 'Welche Pflichtaufgabe gibt es für Verstorbene?', a: 'Friedhöfe',
      w: ['Museen', 'Büchereien', 'Schwimmbäder'] },
    { g: 'Aufgaben', q: 'Welche freiwillige Aufgabe ist zum Sport?', a: 'Bau von Sportanlagen',
      w: ['Straßenbau', 'Müllabfuhr', 'Feuerwehr'] },
    { g: 'Aufgaben', q: 'Welche freiwillige Aufgabe ist zum Feiern?', a: 'kulturelle Veranstaltungen',
      w: ['Abwasserbeseitigung', 'Ortsplanung', 'Friedhöfe'] },
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
    { g: 'Geld', q: 'Wofür zahlt man eine Gebühr beim Parken?', a: 'für den Parkplatz',
      w: ['für die Straße', 'für das Auto', 'für den Führerschein'] },
    { g: 'Geld', q: 'Was bekommt die Gemeinde für ein Grundstück?', a: 'Pacht oder Miete',
      w: ['Hundesteuer', 'Bußgeld', 'Zuschüsse'] },
    { g: 'Geld', q: 'Wofür zahlt man Gebühren?', a: 'Strom, Müll, Wasser',
      w: ['Hunde, Firmen, Grund', 'Schule, Kirche, Verein', 'Straße, Brücke, Platz'] },
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
      w: ['nur Geld verteilen', 'Gesetze für Bayern machen', 'die Schule leiten'] },

    /* ---------- Die demokratische Wahl ---------- */
    { g: 'Wahl', q: 'Wie muss eine demokratische Wahl sein?', a: 'gleich, frei, geheim, unmittelbar, allgemein',
      w: ['laut, schnell, öffentlich', 'nur für Erwachsene mit Haus', 'einfach, billig, kurz'],
      n: 'Die fünf Wahlgrundsätze aus dem Hefteintrag.' },
    { g: 'Wahl', q: 'Was heißt „geheim“ bei einer Wahl?', a: 'niemand sieht, was du wählst',
      w: ['niemand weiß, dass gewählt wird', 'nur der Bürgermeister weiß es', 'man wählt im Dunkeln'] },
    { g: 'Wahl', q: 'Was heißt „frei“ bei einer Wahl?', a: 'niemand darf dich zwingen',
      w: ['die Wahl kostet nichts', 'man darf mehrmals wählen', 'man wählt im Freien'] },
    { g: 'Wahl', q: 'Was heißt „gleich“ bei einer Wahl?', a: 'jede Stimme zählt gleich viel',
      w: ['alle wählen dasselbe', 'alle sind gleich alt', 'alle Kandidaten sind gleich'] },
    { g: 'Wahl', q: 'Was heißt „allgemein“ bei einer Wahl?', a: 'alle Wahlberechtigten dürfen wählen',
      w: ['alle Menschen der Welt dürfen', 'nur Allgemeinwissen zählt', 'alle wählen gemeinsam'] },
    { g: 'Wahl', q: 'Was heißt „unmittelbar“ bei einer Wahl?', a: 'man wählt direkt, ohne Vertreter',
      w: ['man wählt sofort', 'man wählt in der Mitte', 'man wählt per Hand'] },
    { g: 'Wahl', q: 'Welche ist eine demokratische Wahl?', a: 'die Klassensprecherwahl',
      w: ['der Mathetest', 'die Hausaufgabe', 'das Schulfest'] },
    { g: 'Wahl', q: 'Welche Wahl gibt es an der Schule?', a: 'die Elternbeiratswahl',
      w: ['die Gemeinderatswahl', 'die Bundestagswahl', 'die Bürgermeisterwahl'] },
    { g: 'Wahl', q: 'Welche Wahl ist keine Kommunalwahl?', a: 'die Bundestagswahl',
      w: ['die Bürgermeisterwahl', 'die Gemeinderatswahl', 'die Stadtratswahl'] },
    { g: 'Wahl', q: 'Wie heißt es, wenn der Rat entscheidet?', a: 'Abstimmung',
      w: ['Ansprache', 'Aufstellung', 'Anmeldung'] },
    { g: 'Wahl', q: 'Was ist ein Mehrheitsbeschluss?', a: 'die Mehrheit entscheidet',
      w: ['alle müssen zustimmen', 'einer entscheidet allein', 'das Los entscheidet'] },
    { g: 'Wahl', q: 'Wer darf bei der Kommunalwahl wählen?', a: 'die Bürger ab 18 Jahren',
      w: ['alle Einwohner', 'alle ab 14 Jahren', 'nur der Gemeinderat'] },

    /* ---------- Fachbegriffe richtig schreiben ----------
       Aus dem Kasten im Heft: "Fachbegriffe, die du richtig schreiben musst".
       x: 1 heißt, dass hier wirklich genau geschrieben werden muss - ein
       Tippfehler wird sonst verziehen, und genau darum geht es ja. */
    { g: 'Fachbegriffe', q: 'Wie schreibt man den Ort, an dem man lebt?', a: 'Gemeinde', x: 1,
      w: ['Gemeine', 'Gemeinede', 'Gemeindte'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man den Rat einer Gemeinde?', a: 'Gemeinderat', x: 1,
      w: ['Gemeinderath', 'Gemeinerat', 'Gemeindrat'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man den Rat einer Stadt?', a: 'Stadtrat', x: 1,
      w: ['Statrat', 'Stadrat', 'Stadtradt'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man die Mehrzahl von Amt?', a: 'Ämter', x: 1,
      w: ['Ämmter', 'Emter', 'Ämtter'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man das Haus der Verwaltung?', a: 'Rathaus', x: 1,
      w: ['Rathhaus', 'Radhaus', 'Rathauss'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man den Leiter der Gemeinde?', a: 'Bürgermeister', x: 1,
      w: ['Bürgermeißter', 'Burgermeister', 'Bürgermaister'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man das Geld vom Verdienst?', a: 'Steuern', x: 1,
      w: ['Steuren', 'Steiern', 'Stäuern'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man das Geld für eine Leistung?', a: 'Gebühren', x: 1,
      w: ['Gebüren', 'Gebührn', 'Gebueren'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man das Abstimmen im Rat?', a: 'Abstimmung', x: 1,
      w: ['Abstimung', 'Abstimmumg', 'Apstimmung'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man den Beschluss der Mehrheit?', a: 'Mehrheitsbeschluss', x: 1,
      w: ['Mehrheitsbeschluß', 'Merheitsbeschluss', 'Mehrheitsbescluss'] },
    { g: 'Fachbegriffe', q: 'Wie schreibt man eine Wahl nach Regeln?', a: 'demokratische Wahl', x: 1,
      w: ['demokratiesche Wahl', 'demogratische Wahl', 'demokratische Waal'] }
  ];


  /* ===================== Hefteinträge zum Ausfüllen =====================
     Die Seiten aus Idas Heft, so wie sie dort stehen. Was im Heft auf der
     Linie steht, kommt hier in geschweifte Klammern: {Kommune}. Die App
     macht daraus Lücken und legt die Wörter daneben.

     extra = zusätzliche Wörter, die NICHT gebraucht werden. Ohne sie wäre
     die letzte Lücke geschenkt. */
  const BLAETTER = [
    { id: 'gemeinde-1', titel: 'Was ist eine Gemeinde?',
      text: 'Eine Gemeinde ist ein Ort, an dem Menschen leben. Sie wird auch {Kommune} '
          + 'genannt. Wahlberechtigte Einwohner werden als {Bürger} bezeichnet. Sie können '
          + 'den {Gemeinderat} wählen, der die {Regierung} einer Gemeinde bildet.',
      extra: ['Verwaltung', 'Gäste'] },

    { id: 'gemeinde-2', titel: 'Stadt oder Dorf?',
      text: 'Eine Gemeinde hat oft verschiedene {Ortsteile}. Sie ist entweder eine {Stadt} '
          + 'oder ein {Dorf}. Die Gemeinde übernimmt viele wichtige {Aufgaben} für die '
          + 'Gemeinschaft.',
      extra: ['Bezirke', 'Ferien'] },

    { id: 'verwaltung', titel: 'Die Verwaltung',
      text: 'Viele Aufgaben werden in der {Verwaltung} der Gemeinde erledigt. Ihr Sitz ist '
          + 'im {Rathaus}. Eine Verwaltung besteht aus verschiedenen {Ämtern}, zum Beispiel '
          + 'dem Einwohnermeldeamt. Der {Bürgermeister} ist der Leiter der Verwaltung.',
      extra: ['Schule', 'Vereinen'] },

    { id: 'aufgaben', titel: 'Die Aufgaben der Gemeinde',
      text: 'Aufgaben, die jede Gemeinde erfüllen muss, heißen {Pflichtaufgaben}. Dazu '
          + 'gehören Müllbeseitigung, {Abwasserbeseitigung}, Straßenbau und '
          + '{Trinkwasserversorgung}. Aufgaben, die eine Gemeinde erfüllen kann, heißen '
          + '{freiwillige} Aufgaben. Dazu gehören Bücherei, Museen und {Schwimmbäder}.',
      extra: ['Hausaufgaben'] },

    { id: 'geld-1', titel: 'Woher kommt das Geld?',
      text: 'Die Gemeinde bekommt ihr Geld aus {Steuern}, {Gebühren} und sonstigen '
          + 'Einnahmen. Zu den Steuern gehören die Einkommensteuer, die Grundsteuer, die '
          + '{Gewerbesteuer} und die {Hundesteuer}.',
      extra: ['Bußgeldern', 'Pacht'] },

    { id: 'geld-2', titel: 'Der Haushaltsplan',
      text: 'Gebühren zahlt man für Strom, Müll, Wasser und {Parkplätze}. Zu den sonstigen '
          + 'Einnahmen zählen Zuschüsse vom {Staat}, Pacht oder Miete und {Bußgelder}. Im '
          + '{Haushaltsplan} stehen die Einnahmen und Ausgaben. Die Ausgaben sollen nicht '
          + 'höher sein als die {Einnahmen}.',
      extra: ['Stundenplan'] },

    { id: 'aemter', titel: 'Ämter einer Gemeinde',
      text: '„Ich bin umgezogen.“ → {Einwohnermeldeamt}. „Ich habe meinen Schirm '
          + 'verloren.“ → {Fundamt}. „Wir möchten heiraten.“ → {Standesamt}. „Ich möchte '
          + 'ein Obstgeschäft eröffnen.“ → {Gewerbeamt}.',
      extra: ['Bauamt', 'Kämmerei'] },

    { id: 'entscheiden-1', titel: 'Wer entscheidet in einer Gemeinde?',
      text: 'Alle wichtigen Entscheidungen werden vom {Bürgermeister} und dem {Gemeinderat} '
          + 'getroffen. In einer Stadt heißt der Gemeinderat {Stadtrat}. In großen Städten '
          + 'heißt der Bürgermeister oft {Oberbürgermeister}.',
      extra: ['Landrat', 'Kreistag'] },

    { id: 'entscheiden-2', titel: 'Die Kommunalwahl',
      text: 'Der Bürgermeister und der Gemeinderat werden alle {6} Jahre von den {Bürgern} '
          + 'einer Gemeinde gewählt. Man nennt die Wahl auch {Kommunalwahl}. Wählen darf '
          + 'man ab {18} Jahren.',
      extra: ['4', '14', 'Beamten'] },

    { id: 'entscheiden-3', titel: 'Vorsitz und Kontrolle',
      text: 'Der Bürgermeister hat den {Vorsitz} des Gemeinderates. Er {leitet} den '
          + 'Gemeinderat. Der Gemeinderat {kontrolliert} den Bürgermeister. Zusammen '
          + 'vertreten sie die {Interessen} der Einwohner und entscheiden über {Anträge}.',
      extra: ['bezahlt'] },

    { id: 'wahl', titel: 'Die demokratische Wahl',
      text: 'Eine demokratische Wahl ist {gleich}, {frei}, {geheim}, {unmittelbar} und '
          + '{allgemein}. Im Gemeinderat wird abgestimmt – es gilt der {Mehrheitsbeschluss}.',
      extra: ['laut', 'öffentlich'] },

    { id: 'steckbrief', titel: 'Steckbrief Traunstein',
      text: 'Traunstein liegt im {Südosten} von Bayern und hat rund {22.698} Einwohner. '
          + 'Die Stadt ist {48,57} km² groß. Der Oberbürgermeister heißt Dr. Christian '
          + '{Hümmer}. Das Autokennzeichen ist {TS}.',
      extra: ['Norden', 'LF'] }
  ];

  const TOPICS = [
    {
      id: 'traunstein',
      name: 'Die Gemeinde',
      icon: '🏛️',
      desc: 'Gemeinde, Aufgaben, Geld, Ämter, Wahl – mit Steckbrief Traunstein',
      questions: TRAUNSTEIN,
      sheets: BLAETTER
    }
  ];

  global.HSU = Bank.make('hsu', TOPICS);
})(window);
