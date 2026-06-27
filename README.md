# 🎮 Jump'n'Run Base

Eine **leere, aber voll funktionsfähige Ausgangsbasis** für ein eigenes 2D-Jump'n'Run /
Run-and-Gun. Komplett in **Vanilla JavaScript** mit HTML5 Canvas 2D + Web Audio — kein
Build-Step, kein Framework, keine Dependencies. `index.html` lädt einfach eine feste Reihe
von `<script>`-Dateien im globalen Scope.

Diese Basis entstand aus einem fertigen Spiel: **alle Mechaniken sind erhalten und
funktionsfähig**, nur die konkreten Level und die alte Optik wurden entkernt, damit du
eigene Level und ein eigenes Aussehen draufsetzen kannst.

---

## 🔋 Enthaltene Mechaniken (alles funktioniert)

* **Physik & Bewegung** — Laufen, Springen, Doppelsprung, Gravitation, AABB-Kollision
* **Klettern** (Leitern), **Schwimmen** (Wasserlevel), **Jetpack** (Power-up mit Treibstoff)
* **Waffen-Arsenal & Inventar** — Pistole, Shotgun, Uzi, Sturmgewehr, Minigun, Raketen,
  Flammenwerfer, Granaten, Molotow, Nahkampf (Bat/Messer/Axt/Kettensäge)
* **Gegner & Bosse** — abstrakte Enemy-Basis + viele konkrete Typen (als Klassen verfügbar)
* **Partikel** — Blut, Explosionen, Feuer, Hülsen, Level-Up-Effekte
* **Hybrid-Audio** — MP3-Musik/SFX + prozedural synthetisierte Sounds + 8-Bit-Chiptune-Modus
* **Prozedurale Sprites** — alle Grafiken werden zur Laufzeit gezeichnet
* **Input** — Tastatur, On-Screen-Touch-D-Pad, Gamepad
* **2 Level-Modi** — *Mode A* (prozedural aus Modulen) & *Mode B* (handgesetzt an Koordinaten)
* **4 Charaktere** mit eigenen Stats (Sprunghöhe, Tempo, Doppelsprung, Schaden)

---

## 🎮 Steuerung

| Taste | Aktion |
| :--- | :--- |
| **A / D** oder **← →** | Laufen |
| **W / S** | Klettern (an Leitern) |
| **Leertaste / B** | Springen (in der Luft: Jetpack/Doppelsprung) |
| **F / Linksklick / A** | Schießen |
| **Q / X** | Waffe wechseln |
| **E** | Roundhouse-Kick (Charakter „Chuck") |
| **M** | Musik stumm |
| **ESC** | Pause |

---

## 🚀 Starten

Keine Installation nötig:

1. Repo klonen oder ZIP herunterladen.
2. `index.html` in einem Chromium-Browser (Chrome/Edge empfohlen für Web Audio) öffnen.
3. **Wichtig:** Einmal klicken, damit der Browser Audio abspielt.

---

## 🛠️ Eigene Level bauen

* **Mode A (prozedural)** → [`level.js`](level.js): Ein Level ist eine Liste von *Modulen*
  (`loadBlueprint`), die `buildModule()` nacheinander zusammensetzt. Neues Hindernis =
  neuer `case`-Zweig. Helfer: `addFloor`, `addPlatform`, `addMovingPlatform`, `addSpikes`,
  `addFireTrap`, `addPillar`, `addLadder`, `setWater`, `spawn(EnemyClass, …)`.
* **Mode B (handgesetzt)** → [`classic.js`](classic.js): Level an absoluten Kachel-Koordinaten
  in `build_demo()`. Helfer: `cFloor`, `cPipe`, `cBlock`, `cStair`, `cPlat`, `cLift`,
  `cEnemy`, `cPiranha`, `eStaircase`, `ePyramid`, `eBrickRow`, …
* Weitere Level: in [`game.js`](game.js) `advanceLevel()` die Level-Grenze erhöhen bzw.
  `CLASSIC_AVAILABLE`/`CLASSIC_LABELS` in [`classic.js`](classic.js) erweitern.

> **Schwimmen:** `setWater(y)` macht das **ganze** Level zum Wasserlevel (globale
> Wasseroberfläche). Das fertige Beispiel-Modul `POOL` in `level.js` zeigt es — einfach in
> `loadBlueprint` aktivieren.

## 🎨 Optik ändern

* **Farb-Paletten / Theme pro Level** → `CONFIG.LEVELS[...]` in [`config.js`](config.js)
  (Himmel, Plattformen, Lava) + `DECOR`-Name (Einblendung beim Levelstart).
* **Branding-Texte** (Titel, „GAME OVER", Modus-Karten) → [`index.html`](index.html).
* **Render-Effekte** (Scanlines, Vignette, Blut-Overlay) → [`style.css`](style.css) +
  die `draw*`-Methoden in [`game.js`](game.js).
* **Charaktere** (Farben, Stats, Hut) → `CONFIG.CHARACTERS` in [`config.js`](config.js).

---

## 📜 Lizenz

MIT — benutzen, kaputtmachen, umbauen.
