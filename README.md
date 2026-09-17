# 🚀 Mathe App

Eine Mathe-Arcade als **installierbare PWA** – im Stil von *Math Blaster* und *Space Invaders*.
Die Rechenaufgaben schweben von oben herab und werden mit der richtigen Lösung abgeschossen.
Was die Schutzlinie erreicht, kostet ein ❤️.

Alles läuft **komplett offline im Browser** – kein Server, kein Build-Schritt, keine Tracker,
keine Datenübertragung. Punkte und Abzeichen bleiben nur lokal auf dem Gerät.

---

## Features

| | |
|---|---|
| 🎯 **Klasse 1–6** | Aufgabentypen passen sich der gewählten Klassenstufe an – von „3 + 4“ bis „3/4 von 24“ und „(−7) · (−4)“ |
| ✅ **Rechenarten wählbar** | Plus, Minus, Mal, Geteilt … einzeln per Haken an- und abschalten – **pro Klassenstufe** gespeichert, von Haus aus ist alles an |
| 🐌 **Start-Tempo** | fünf Stufen von *Schnecke* bis *Rakete*, **pro Klassenstufe** gespeichert – Klasse 1 startet automatisch auf *Schnecke* |
| ⏱ **10-Minuten-Limit** | jede Runde dauert höchstens 10 Minuten reine Spielzeit; Pausen und Menüs zählen nicht mit |
| ❤️ **3 Leben als Herzchen** | bis zu 8 Herzen möglich – im 3er- und 5er-Paket günstiger |
| ⭐ **Sternchen** | für jede richtig gelöste Aufgabe (mehr bei Combo und goldenen Aufgaben) |
| ✌️ **Zwei Versuche** | eine falsche Antwort löscht nur die Eingabe; erst die zweite zählt als Fehler und kostet ein ❤️ |
| 🎁 **Bonus-Station** | nach **je 10 richtig gelösten** Aufgaben – Danebenschießen bringt einen keinen Schritt näher |
| 🎮 **Drei Bonusspiele** | Alien-Jagd, Zielschießen mit einstellbarem Winkel und Dosenwerfen mit echter Physik |
| ⚖️ **Ehrliche Wirtschaft** | ein Bonusspiel kostet 8 ★ und gibt höchstens 5 ★ zurück – Sternchen gibt es nur fürs Rechnen |
| ⏩ **Steigendes Tempo** | vom eingestellten Start-Tempo aus fallen die Aufgaben mit jedem Level und jeder Spielminute schneller – höchstens bis auf ein Drittel der Startzeit |
| 🖼️ **4 Hintergründe** | Stadt am Tag, Neon-Nacht, Weltraum, Unterwasser – alles live per Canvas gezeichnet |
| 🔊 **8-Bit Sound** | Effekte und **drei** Chiptune-Stücke mit Bass, Arpeggio, Melodie und Schlagzeug – alles per WebAudio erzeugt, keine Audiodateien |
| 👾 **Pixel-Art** | Rakete und Ufos als echte Pixel-Sprites; die Aufgabenkästen bleiben bewusst rund und gut lesbar |
| 🏆 **Online-Bestenliste** | mit Spitzname und selbst gewürfeltem Pixel-Avatar (optional, siehe unten) |
| 🔢 **Zwei Eingabearten** | großes Zahlenfeld (Touch + Tastatur) oder Multiple-Choice – jederzeit umschaltbar |
| 🏅 **Gamification** | Combo-Multiplikator bis x4, Level, XP-Ränge, 10 Abzeichen, Bestenliste pro Klasse |
| 🔄 **Selbst-Update** | eine neue Fassung auf GitHub landet beim nächsten Öffnen automatisch auf dem Gerät |
| 📲 **PWA** | installierbar auf Handy, Tablet und Desktop, funktioniert offline |

---

## Steuerung

**Zahlenfeld-Modus**

* Ziffern antippen oder auf der Tastatur eingeben
* `±` bzw. `-` für negative Ergebnisse (ab Klasse 5)
* `⌫` bzw. `Backspace` löscht
* **ABSCHIESSEN** bzw. `Enter` / `Leertaste` feuert

**Zwei Versuche pro Aufgabe**

Bei einer falschen Antwort wird die Eingabe gelöscht, ein Hinweis meldet „Noch 1 Versuch!“
und die Aufgabe fällt weiter – man darf es also noch einmal probieren. Ist auch die zweite
Antwort falsch, zählt die Aufgabe als Fehler: Sie verschwindet, die richtige Lösung wird
kurz eingeblendet und es kostet ein ❤️ – genau wie bei einer Aufgabe, die man gar nicht
beantwortet hat. Die Anzahl der Versuche steht in `CONFIG.maxTries` (`js/game.js`).

**Auswahl-Modus**

* Vier Antwortmöglichkeiten antippen – sie gehören immer zur untersten Aufgabe

**Bonusspiele**

* *Alien-Jagd*: Finger über den Bildschirm ziehen oder `◀` `▶` – geschossen wird automatisch
* *Zielschießen*: Winkel und Kraft mit den Reglern einstellen, **FEUER!** drücken. Die gestrichelte
  Linie zeigt die Flugbahn. Ein angetippter Ballon wird zum Ziel und zählt doppelt
* *Dosenwerfen*: vom Ball aus in Wurfrichtung ziehen und loslassen – 3 Bälle, 6 Dosen

**Pause und Zurück**

`Esc` oder der Pause-Knopf halten das Spiel an. Der Zurück-Knopf des Geräts (Android,
Browser, Wischgeste) verlässt die App nicht, sondern fragt erst nach: weiterspielen oder
zum Menü? Ein zweites Mal Zurück geht dann wirklich ins Menü.

Während der Pause läuft die Rundenzeit nicht weiter – dafür stehen beim Weiterspielen
**andere Aufgaben** auf dem Feld, an derselben Stelle und in derselben Höhe. Eine Pause
bringt also keinen Vorteil beim Nachdenken.

---

## Rechenarten ein- und ausschalten

**Einstellungen → Rechenarten.** Dort steht für die gerade gewählte Klassenstufe eine Liste
mit Haken – je nach Klasse etwa *Plus*, *Minus*, *Mal*, *Geteilt*, *Gemischt*,
*Potenzen & Wurzeln*, *Brüche & Prozent*, *Negative Zahlen* oder *Teiler & Vielfache*.
Abgehakte Rechenarten kommen im Spiel nicht mehr vor.

* Jede Klassenstufe hat ihre **eigene** Auswahl; neu ist immer alles angehakt.
* Mindestens eine Rechenart muss stehen bleiben – die letzte lässt sich nicht abwählen.
* Die Auswahl liegt im `localStorage` des Geräts und gilt auch nach dem Schließen der App.
* Unter der Liste steht, wie viele Rechenarten aktiv sind und wie viele Aufgabenarten
  daraus gerade entstehen; im Startmenü zeigt ein Chip das Gleiche in kurz.

So lässt sich zum Beispiel für Klasse 3 gezielt nur das Einmaleins üben oder in Klasse 1
das Minusrechnen erst einmal weglassen.

---

## Sternchen, Herzen und Bonusspiele

Für jede richtig gelöste Aufgabe gibt es mindestens ein ⭐ (mehr bei Combo und goldenen
Aufgaben). Nach je 10 **richtig** gelösten Aufgaben öffnet die Bonus-Station. Verrechnet oder
durchgerutscht zählt nicht mit – Bonusspiele muss man sich erarbeiten.

**Herzen** – je größer das Paket, desto günstiger:

| Paket | Preis | pro Herz |
|---|---|---|
| 1 Herz | 5 ★ | 5,0 ★ |
| 3 Herzen | 12 ★ | 4,0 ★ |
| 5 Herzen | 18 ★ | 3,6 ★ |

Mehr als 8 Herzen gehen nicht; Pakete, die darüber hinausgehen würden, sind gesperrt.

**Bonusspiele** kosten jeweils 8 ★ und geben **höchstens 5 ★** zurück:

| Spiel | Dauer | volle 5 ★ ab |
|---|---|---|
| 👾 Alien-Jagd | 30 s | 35 Treffern |
| 🎯 Zielschießen | 30 s | 15 Ballons |
| 🥫 Dosenwerfen | 45 s | 6 Dosen |

Unterm Strich kostet jedes Bonusspiel also Sternchen. Es ist eine Belohnung, keine
Abkürzung – nachgefüllt wird nur durch Rechnen. Die Preise stehen in
`CONFIG.heartPacks` (`js/game.js`) und in `MiniGames.LIST` (`js/minigames.js`), die
Obergrenze in `MiniGames.MAX_STARS`.

---

## Die 10 Minuten

Im HUD läuft oben links eine Restzeit mit. Bei 5 Minuten, 2 Minuten, 1 Minute und
10 Sekunden gibt es einen kurzen Hinweis, unter 30 Sekunden wird die Anzeige rot.
Ist die Zeit um, endet die Runde mit einem eigenen Abschluss-Bildschirm
(„Zeit ist um!“) statt mit einem Game Over – der Punktestand zählt ganz normal
für die Bestenliste.

Mitgezählt wird nur echte Spielzeit inklusive Bonuslevel. Pause, Menüs und die
Bonus-Station laufen nicht mit. Wenn für das 30-Sekunden-Bonuslevel nicht mehr
genug Zeit übrig ist, lässt es sich nicht mehr kaufen.

Das Limit steht in `js/game.js` bei `CONFIG.sessionLimit` (in Sekunden).

---

## Online-Bestenliste einrichten

Ohne diesen Schritt funktioniert alles – die Bestenliste bleibt dann einfach auf dem Gerät.
Für eine gemeinsame Liste braucht es einen kleinen Datenspeicher; **Supabase** ist dafür
kostenlos und passt zu einer rein statischen Seite.

**1. Projekt anlegen**

* Auf [supabase.com](https://supabase.com) mit dem GitHub-Konto anmelden
* **New project**, Name z. B. `mathe-app`, Region *Frankfurt (eu-central-1)*,
  das Datenbank-Passwort irgendwo notieren
* Ein bis zwei Minuten warten, bis das Projekt bereit ist

**2. Tabelle anlegen**

Links auf **SQL Editor → New query**, das Folgende einfügen und **Run** drücken:

```sql
create table public.highscores (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null,
  avatar     text not null default '0000',
  score      int  not null,
  grade      int  not null,
  correct    int  not null default 0,
  level      int  not null default 1
);

alter table public.highscores enable row level security;

-- Lesen darf jeder
create policy "lesen" on public.highscores
  for select using (true);

-- Eintragen darf jeder, aber nur mit vernünftigen Werten
create policy "eintragen" on public.highscores
  for insert with check (
    char_length(name) between 1 and 12
    and char_length(avatar) <= 8
    and score between 0 and 999999
    and grade between 1 and 6
  );

create index highscores_score_idx on public.highscores (score desc);
```

Es gibt bewusst **keine** Regel zum Ändern oder Löschen – über die App kann also niemand
fremde Einträge anfassen. Aufräumen kannst du jederzeit selbst im **Table Editor**.

**3. Zugangsdaten eintragen**

* In Supabase: **Project Settings → API**
* Dort stehen *Project URL* und der Schlüssel *anon public*
* Im GitHub-Repository `js/config.js` anklicken → Stift-Symbol → beide Werte eintragen:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://deinprojekt.supabase.co',
  supabaseKey: 'eyJhbGciOi...',
  table: 'highscores',
  topCount: 20
};
```

* **Commit changes**, danach wie üblich die Version in `sw.js` hochzählen

Der *anon public*-Schlüssel darf offen in der Seite stehen – genau dafür ist er gedacht.
Was erlaubt ist, entscheiden allein die Regeln aus Schritt 2.

### Wenn ein Eintrag nicht online geht

Scheitert der Upload – kein Netz, Supabase-Projekt pausiert, Regel zu streng –, bleibt der
Eintrag auf dem Gerät und wird mit `online: false` gemerkt. In der Bestenliste erscheint
dann oben ein gelber Kasten „n Einträge sind noch nicht online" mit einem Knopf zum
Nachreichen. Versucht wird es außerdem automatisch beim Start der App und jedes Mal, wenn
die Bestenliste geöffnet wird.

Beim Nachreichen holt die App zuerst die vorhandene Online-Liste und überspringt Einträge,
die dort schon stehen – es entstehen also keine Dubletten, auch nicht bei Punkteständen
aus einer älteren Fassung der App.

Die Fehlermeldung des Servers wird im Klartext angezeigt, zum Beispiel:

| Meldung | Bedeutung |
|---|---|
| `HTTP 503: Projekt schläft` | Kostenloses Supabase-Projekt pausiert – im Dashboard auf *Restore* |
| `HTTP 401 … row-level security` | Die Insert-Regel aus Schritt 2 fehlt oder passt nicht |
| `HTTP 404: Tabelle nicht gefunden` | Tabellenname in `config.js` stimmt nicht |
| `Zeitüberschreitung` | Netz war zu langsam – einfach nochmal auf „Jetzt hochladen" |

Ohne Spitznamen geht kein Eintrag: Der Knopf bleibt gesperrt, solange das Feld leer ist
(Leerzeichen zählen nicht).

**Datenschutz:** Gespeichert werden nur Spitzname (max. 12 Zeichen), Avatar-Kennung,
Punktzahl, Klassenstufe und ein Zeitstempel. Keine echten Namen, keine E-Mail, keine
Geräte-Kennung, keine Zählpixel. Das Eingabefeld weist ausdrücklich darauf hin, keinen
echten Nachnamen zu verwenden – die Liste ist öffentlich lesbar.

**Gut zu wissen:** Kostenlose Supabase-Projekte werden nach etwa einer Woche ohne Zugriff
pausiert. Ein Klick auf *Restore* im Dashboard weckt sie wieder. Ist der Dienst gerade
nicht erreichbar, zeigt die App einen Hinweis und speichert den Eintrag trotzdem auf dem
Gerät.

---

## Lokal ausprobieren

Wegen des Service Workers muss die App über HTTP laufen (nicht per Doppelklick auf `index.html`):

```bash
cd mathe-app
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

Alternativ in VS Code die Erweiterung *Live Server* benutzen.

---

## Auf GitHub veröffentlichen (alles im Browser)

Es wird kein Git auf dem Rechner gebraucht – das geht komplett auf **github.com**.

**1. Repository anlegen**

* Oben rechts auf **+ → New repository**
* *Repository name*: `mathe-app`
* *Public* auswählen (GitHub Pages braucht das im kostenlosen Tarif)
* **Nicht** „Add a README file“ ankreuzen
* **Create repository**

**2. Dateien hochladen**

* Auf der leeren Repo-Seite auf **uploading an existing file** klicken
  (oder später: **Add file → Upload files**)
* Den entpackten Ordner `mathe-app` öffnen, **alles darin markieren**
  (Strg+A bzw. Cmd+A) und in das Browserfenster ziehen

  > Wichtig: den *Inhalt* des Ordners hochladen, nicht den Ordner selbst –
  > sonst liegt später alles eine Ebene zu tief. Oben in der Dateiliste müssen
  > `index.html`, `sw.js`, `css`, `js` und `icons` direkt zu sehen sein.

  > Die versteckten Dateien `.nojekyll` und `.gitignore` tauchen im Dateidialog
  > eventuell nicht auf (mit Cmd+Shift+Punkt bzw. „versteckte Dateien anzeigen“
  > sichtbar machen). Wenn sie fehlen, ist das für diese App kein Problem.

* Unten **Commit changes**

**3. GitHub Pages einschalten**

* **Settings → Pages**
* *Source*: `Deploy from a branch`
* *Branch*: `main` und `/ (root)` → **Save**

Nach ein bis zwei Minuten ist die App unter
`https://DEIN-NAME.github.io/mathe-app/` erreichbar.

**4. Auf dem Gerät installieren**

* Die Adresse auf dem Handy oder Tablet öffnen
* Android/Chrome: Menü → *Zum Startbildschirm hinzufügen* (oder der Hinweis
  „App installieren“ im Menü der App)
* iPhone/iPad: Teilen-Symbol → *Zum Home-Bildschirm*

---

## Updates ausrollen (auch im Browser)

Geänderte Dateien lädt man auf github.com über **Add file → Upload files** neu hoch –
gleicher Dateiname bedeutet: Datei wird ersetzt. Einzelne Dateien lassen sich auch
direkt bearbeiten: Datei anklicken → Stift-Symbol → ändern → **Commit changes**.

**Dabei immer die Version hochzählen:**

1. Im Repository auf `sw.js` klicken
2. Stift-Symbol (✏️ *Edit this file*)
3. In der Zeile `const VERSION = '1.4.4';` die letzte Zahl erhöhen, z. B. auf `'1.4.4'`
4. **Commit changes**

> Wer lieber auf dem Rechner arbeitet: `./bump.sh "Was geändert wurde"` erledigt
> Hochzählen, Committen und Pushen in einem Schritt.

Beim nächsten Öffnen der App passiert dann automatisch Folgendes:

* Der Browser holt `sw.js` neu, erkennt die neue Version und installiert sie sofort.
* Die App lädt sich einmal selbst neu – aber **nie mitten im Spiel**, sondern erst
  zurück im Menü. Ein kurzer Hinweis „Neue Version wird geladen …“ erscheint.
* Zusätzlich holt der Service Worker alle eigenen Dateien grundsätzlich zuerst frisch
  aus dem Netz (mit 2,5 Sekunden Zeitlimit) und fällt nur offline auf den Cache zurück.
  Dadurch kommt ein neuer Stand auch dann an, wenn das Hochzählen der Version
  einmal vergessen wurde.

Welche Version gerade läuft, steht unten im Startmenü – praktisch, um nach einem
Deploy kurz zu prüfen, ob die neue Fassung angekommen ist.

---

## Projektstruktur

```
mathe-app/
├── index.html               Aufbau aller Bildschirme
├── manifest.webmanifest     PWA-Manifest
├── sw.js                    Service Worker (Offline-Cache + Auto-Update)
├── bump.sh                  Version hochzählen, committen, pushen
├── css/style.css            Arcade-Optik
├── js/
│   ├── config.js            Zugangsdaten der Online-Bestenliste (leer = aus)
│   ├── pixel.js             Pixel-Sprites, Pixelschrift, Avatare
│   ├── leaderboard.js       Anbindung an Supabase
│   ├── mathgen.js           Aufgaben-Generator Klasse 1–6
│   ├── minigames.js         die drei Bonusspiele (inkl. Dosen-Physik)
│   ├── audio.js             8-Bit Sound-Engine + Chiptune
│   ├── backgrounds.js       vier animierte Hintergründe
│   ├── game.js              Spiel-Engine und Bonus-Station
│   └── main.js              Menüs, Fortschritt, PWA-Anbindung
└── icons/                   App-Icons
```

### Etwas ändern?

* **Rundenlänge:** `CONFIG.sessionLimit` in `js/game.js` (Sekunden)
* **Tempo-Stufen:** die Tabelle `SPEEDS` in `js/game.js` – `fall` ist die Fallzeit in
  Sekunden beim Start, `spawn` der Abstand zwischen zwei Aufgaben
* **Standard-Tempo je Klasse:** `DEFAULTS.settings.speedByGrade` in `js/main.js`
* **Wie stark es schneller wird:** die Faktoren in `speedNow()` / `spawnInterval()` in `js/game.js`
* **Preise in der Bonus-Station:** `CONFIG.heartPacks` in `js/game.js`, `cost` in `MiniGames.LIST`
* **Maximale Sternchen aus Bonusspielen:** `MAX_STARS` in `js/minigames.js`
* **Neues Bonusspiel:** in `js/minigames.js` eine Funktion nach dem Muster der drei
  vorhandenen ergänzen und in `GAMES` und `LIST` eintragen
* **Bonus seltener/öfter:** `CONFIG.bonusEvery` in `js/game.js` (zählt nur richtige Antworten)
* **Neue Aufgabentypen:** in `js/mathgen.js` in der Tabelle `GENS` bei der passenden Klasse
  einen Eintrag `{ op: '…', fn: level => ({ text, answer }) }` ergänzen. `op` ist eine der IDs
  aus `OPS` – dadurch taucht der Typ automatisch unter der richtigen Rechenart in den
  Einstellungen auf. `min` legt fest, ab welchem Level der Typ vorkommt
* **Neue Rechenart-Kategorie:** in `js/mathgen.js` die Liste `OPS` erweitern (ID, Name, Symbol)
  und die neuen Generatoren mit dieser ID versehen – die Checkbox baut sich von selbst
* **Musikstücke:** die Tabelle `TRACKS` in `js/audio.js` – `melody`, `chords` und `drums`
  sind je 64 Schritte lang
* **Pixel-Sprites:** `SPRITES` in `js/pixel.js` (`FONT` liegt dort als fertige
  5×7-Pixelschrift bereit, falls die Aufgaben doch einmal pixelig werden sollen)
* **Aussehen der Aufgabenkästen:** der Block „Gleichungen“ in `render()` in `js/game.js`
* **Neuer Hintergrund:** in `js/backgrounds.js` ein weiteres Objekt in `THEMES` mit `build()` und
  `draw()` ergänzen und die ID in `ORDER` eintragen

---

## Hinweise

* Die Schriften werden von Google Fonts geladen. Ohne Internet greifen automatisch die
  System-Schriften – die App bleibt voll spielbar.
* Der Ton startet erst nach der ersten Berührung des Bildschirms (Browser-Vorgabe).
* Alle Spielstände **und Einstellungen** (Klasse, Rechenarten, Tempo, Hintergrund, Ton)
  liegen im `localStorage` des Geräts. „Alle Fortschritte löschen“ in den
  Einstellungen räumt sie wieder weg – auch die abgewählten Rechenarten sind danach
  wieder alle an.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
