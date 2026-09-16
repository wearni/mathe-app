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
| 🐌 **Start-Tempo** | fünf Stufen von *Schnecke* bis *Rakete*, **pro Klassenstufe** gespeichert – Klasse 1 startet automatisch auf *Schnecke* |
| ⏱ **10-Minuten-Limit** | jede Runde dauert höchstens 10 Minuten reine Spielzeit; Pausen und Menüs zählen nicht mit |
| ❤️ **3 Leben als Herzchen** | bis zu 5 Herzen sind möglich, verdient über die Bonus-Station |
| ⭐ **Sternchen** | für jede richtig gelöste Aufgabe (mehr bei Combo und goldenen Aufgaben) |
| 🎁 **Bonus-Station** | nach **jeder 10. Aufgabe** – egal ob richtig oder daneben |
| 👾 **Raumschiff-Bonuslevel** | 30 Sekunden Aliens abschießen, bringt Extra-Punkte, Sternchen und ab 20 Treffern ein Herz |
| ⏩ **Steigendes Tempo** | vom eingestellten Start-Tempo aus fallen die Aufgaben mit jedem Level und jeder Spielminute schneller – höchstens bis auf ein Drittel der Startzeit |
| 🖼️ **4 Hintergründe** | Stadt am Tag, Neon-Nacht, Weltraum, Unterwasser – alles live per Canvas gezeichnet |
| 🔊 **8-Bit Sound** | Effekte und Chiptune-Musik werden per WebAudio erzeugt (keine Audiodateien) |
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

**Auswahl-Modus**

* Vier Antwortmöglichkeiten antippen – sie gehören immer zur untersten Aufgabe

**Raumschiff-Bonuslevel**

* Finger über den Bildschirm ziehen oder `◀` `▶` – geschossen wird automatisch

`Esc` pausiert das Spiel. Während der Pause läuft die Rundenzeit nicht weiter.

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
3. In der Zeile `const VERSION = '1.2.0';` die letzte Zahl erhöhen, z. B. auf `'1.2.1'`
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
│   ├── mathgen.js           Aufgaben-Generator Klasse 1–6
│   ├── audio.js             8-Bit Sound-Engine + Chiptune
│   ├── backgrounds.js       vier animierte Hintergründe
│   ├── game.js              Spiel-Engine + Raumschiff-Bonuslevel
│   └── main.js              Menüs, Fortschritt, PWA-Anbindung
└── icons/                   App-Icons
```

### Etwas ändern?

* **Rundenlänge:** `CONFIG.sessionLimit` in `js/game.js` (Sekunden)
* **Tempo-Stufen:** die Tabelle `SPEEDS` in `js/game.js` – `fall` ist die Fallzeit in
  Sekunden beim Start, `spawn` der Abstand zwischen zwei Aufgaben
* **Standard-Tempo je Klasse:** `DEFAULTS.settings.speedByGrade` in `js/main.js`
* **Wie stark es schneller wird:** die Faktoren in `speedNow()` / `spawnInterval()` in `js/game.js`
* **Preise in der Bonus-Station:** `CONFIG.heartCost` / `CONFIG.miniCost` in `js/game.js`
* **Bonus seltener/öfter:** `CONFIG.bonusEvery` in `js/game.js`
* **Neue Aufgabentypen:** in `js/mathgen.js` bei der passenden Klassenfunktion (`k1` … `k6`) eine
  Funktion ergänzen, die `{ text, answer }` zurückgibt
* **Neuer Hintergrund:** in `js/backgrounds.js` ein weiteres Objekt in `THEMES` mit `build()` und
  `draw()` ergänzen und die ID in `ORDER` eintragen

---

## Hinweise

* Die Schriften werden von Google Fonts geladen. Ohne Internet greifen automatisch die
  System-Schriften – die App bleibt voll spielbar.
* Der Ton startet erst nach der ersten Berührung des Bildschirms (Browser-Vorgabe).
* Alle Spielstände liegen im `localStorage` des Geräts. „Alle Fortschritte löschen“ in den
  Einstellungen räumt sie wieder weg.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
