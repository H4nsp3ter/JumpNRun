# 🌸 Blümchen-Land

Ein **knuddeliges 2D-Jump'n'Run für Kinder** – das liebe Gegenteil eines Gore-Shooters.
Du spielst **Lina die Blumenfee** und überwältigst süße Tierchen mit **so viel Liebe**, dass
sie vor Glück zu **Blümchen zerplatzen**. 🦄💕

Komplett in **Vanilla JavaScript** mit HTML5 Canvas 2D + Web Audio — kein Build-Step, kein
Framework, keine Dependencies. Alle Grafiken & Soundeffekte werden zur Laufzeit erzeugt;
einzige Asset-Dateien sind ein paar fröhliche Musik-Loops in `sound files/`. `index.html`
lädt einfach eine feste Reihe von `<script>`-Dateien.

---

## 🧚 Das Spiel

* **5 Spielfiguren** (im Startmenü wählbar) — jede mit eigener Superkraft (Taste **E** = Spezial):
  * **Lina die Blumenfee** 🧚 — Flatter-Doppelsprung + **Knutsch-Knuddel-Attacke**, die Gegner zu Blümchen knuddelt.
  * **Pupsi das Pupshörnchen** 🐿️💨 — fliegt mit **Pups-Antrieb** (Sprungtaste halten, begrenzter Vorrat) & pustet Gegner mit einem gezielten **Pups** weg.
  * **Brummel die Hummel** 🐝 — **schwebt dauerhaft** in der Luft & wirft klebrige **Honig-Kleckse**.
  * **Hoppel der Hase** 🐰 — **Dreifach-Hüpfer** & **Möhren-Wurf**.
  * **Quaki der Frosch** 🐸 — **Mega-Sprung** & **Klebezunge**, die Gegner UND Bonbons heranzieht.
* **Süße Waffen mit je eigenem Geschoss & Tempo:** Wasserspritzpistole (Wassertropfen),
  Seifenblasen-Pistole, Bonbonkanone, Wattebäuschchen-Werfer, Glitzer-Schleuder (Sternchen),
  Riesen-Wattebausch, Puddingwerfer, Seifenblasen-Bläser, Kuschelstab, Lolli-Hammer …
* **Liebe Gegner:** süße Tierchen, die mit **Herzchen** angreifen und beim Treffer zu Blümchen
  zerplatzen. Große, zähe **Einhörner** als Zwischengegner, ein **gigantisches Einhorn** als Boss.
* **Mechaniken:** Schwimmen (Wasserlevel), **Jetpack** (verschwindet nach ~60 s),
  **Wölkchen-Plattformen** (sinken beim Draufstehen), rollende Hügel-Landschaft, Leitern,
  Trampoline, Sammel-**Bonbons** & Herzen.
* **Belohnung:** nach jedem Level eine **süße Statistik** (mit Augenzwinkern 😉), am Ende ein
  **Trällerlied mit hüpfenden Einhörnern und Regenbogen**.
* **Optik & Sound:** weiches, modernes Pastell-Design (runde Fredoka-Schrift), prozedurale
  Glockenspiel-Soundeffekte + fröhliche Musik – im Menü wählbar: **LIEDER** (zufälliger
  Happy-Song je Level, läuft als Loop) oder **CHIPTUNE** (8-Bit-Melodien je Welt).

### Zwei Modi (im Startmenü)

* **Mode A** — 4 prozedural aufgebaute Welten (Blümchen-Land · Bonbon-Land · Wolken-Land ·
  Plüsch-Königreich) mit rollenden Hügeln, endet im **Einhorn-Boss**.
* **Mode B** — 5 handgebaute Level: **Bonbon-Garten**, **Unterwasser-Riff**, **Wolkenflug**
  (vertikales Flug-Level mit vielen Jetpacks), **Plüsch-Türme**, **Einhorn-Schloss** (Boss).

---

## 🎮 Steuerung

| Taste | Aktion |
| :--- | :--- |
| **A / D** oder **← →** | Laufen |
| **W / S** | Klettern (an Leitern) |
| **Leertaste / B** | Springen (gedrückt halten = Fliegen/Schweben bei Pupsi/Brummel oder mit Jetpack; mehrfach = Doppel-/Dreifachsprung) |
| **F / Linksklick / A** | Spritzen / Werfen |
| **Q / X** | Waffe wechseln |
| **E** | Spezial-Attacke (je Figur: Knuddeln · Rundum-Pups · Honig · Möhre · Klebezunge) |
| **M** | Ton stumm · **ESC** Pause |

Auf Touch-Geräten (Tablet/Handy quer halten) gibt es ein On-Screen-D-Pad + Aktionsknöpfe.

---

## 🚀 Starten

Keine Installation nötig:

1. Repo klonen oder ZIP herunterladen.
2. `index.html` in einem Chromium-Browser (Chrome/Edge empfohlen) öffnen.
3. **Einmal klicken**, damit der Browser den Ton abspielt — und los geht's! 🌼

---

## 🛠️ Technik & Erweitern

Reines Vanilla-JS, globaler Scope, Laden in fester Reihenfolge (siehe unten in `index.html`):
`config → audio → input → particles → sprites → entities → enemies → player → level → classic → game`.

* **Mode-A-Welten** → [`level.js`](level.js): Welt = Liste von *Modulen* (`loadBlueprint`),
  die `buildModule()` zusammensetzt. Helfer: `addFloor`, `addHills` (rollender Boden),
  `addPlatform`, `addMovingPlatform`, `addCloud` (Wölkchen), `addLadder`, `setWater`,
  `spawn(EnemyClass, …)`, `randWeapon()`.
* **Mode-B-Level** → [`classic.js`](classic.js): handgesetzt an Kachel-Koordinaten in
  `build_garden`/`build_underwater`/`build_flight`/`build_towers`/`build_unicornCastle`.
  Helfer: `cFloor`, `cPipe`, `cBlock`, `cStair`, `cPlat`, `cLift`, `cEnemy`, `cPiranha`,
  `eStaircase`, `ePyramid`, … Mehr Level: `CLASSIC_AVAILABLE/-LABELS/-THEMES` erweitern.
* **Optik** → Paletten in `CONFIG.LEVELS` ([`config.js`](config.js)); Figuren-/Gegner-Render
  prozedural in [`player.js`](player.js)/[`enemies.js`](enemies.js) (`_cutieBody`, `_drawUnicorn`);
  Hintergrund/Screens in [`game.js`](game.js); Menü-Stil in [`style.css`](style.css).
* **Sounds** → [`audio.js`](audio.js): prozedurale SFX/Chiptune + Happy-Song-Loops aus
  `sound files/` (einfach weitere MP3s in `_loadSongs()` eintragen).

> Hinweis: Das Projekt entstand als wiederverwendbare Engine-Basis – die Spiel-Mechanik ist
> sauber von Inhalt/Optik getrennt, lässt sich also leicht neu „einkleiden".

---

## 📜 Lizenz

MIT — benutzen, kaputtmachen, umbauen.
