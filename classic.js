// ============================================================================
//  CLASSIC MODE — originalgetreue Super-Mario-Bros-Level im Bad-Mario-Stil
// ----------------------------------------------------------------------------
//  Statt prozedural (siehe level.js) werden Klassik-Level handgesetzt an
//  absoluten Koordinaten gebaut. Gleiche Physik/Mechanik wie der Story-Modus.
//  Erstes Level: World 1-1. Erweitert LevelGenerator über das Prototype, damit
//  level.js schlank bleibt. Wird in index.html NACH level.js geladen.
// ============================================================================

// Mode B: 5 handgebaute süße Level (komplett anders als der prozedurale Mode A).
const CLASSIC_AVAILABLE = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };
const CLASSIC_LABELS    = { 1: 'Bonbon-Garten', 2: 'Unterwasser', 3: 'Wolkenflug', 4: 'Plüsch-Türme', 5: 'Einhorn-Schloss' };
const CLASSIC_THEMES    = { 1: 'over', 2: 'under', 3: 'over', 4: 'castle', 5: 'castle' }; // 'over'|'under'|'castle'

// Maße, an die Physik angepasst (Sprung-Apex ~200px über dem Absprung):
// C_TILE so groß, dass Mario (80px breit) ~1 Kachel breit ist (Super-Mario-Verhältnis).
const C_TILE = 92;                              // Raster-/Blockgröße in px
const C_PIPE_H = { 2: 110, 3: 145, 4: 175 };    // Röhrenhöhen in px (entkoppelt von C_TILE, bleiben überspringbar)

// ============================================================================
//  >>> HIER EIGENE CLASSIC-LEVEL BAUEN (handgesetzt an absoluten Koordinaten) <<<
// ----------------------------------------------------------------------------
//  Koordinaten in Kacheln (tx = Kachelindex, 1 Kachel = C_TILE px). Alle Bau-
//  Helfer (cFloor/cPipe/cBlock/cStair/cPlat/cLift/cEnemy/cPiranha/cBowser ...
//  + die Element-Bibliothek eStaircase/ePyramid/eFortress/eBrickRow) stehen
//  oben bereit. Für weitere Level: CLASSIC_AVAILABLE/-LABELS/-THEMES erweitern
//  und hier per `if (level === N)` einen Bau-Zweig ergänzen.
// ============================================================================
LevelGenerator.prototype.buildClassic = function(level, diff) {
    // Vollständiger Reset — alles absolut ab x=0.
    this.platforms = []; this.ladders = []; this.enemies = []; this.items = []; this.corpses = [];
    this.baseY = 600; this.goalX = null; this.bossSpawned = false; this.levelPlan = []; this.waterY = null;
    // Theme-/Hintergrund-Felder, die das Rendering (game.js) liest — IMMER setzen:
    this.classicTheme = CLASSIC_THEMES[level] || 'over';
    this.classicUnder = (this.classicTheme !== 'over');   // dunkler Hintergrund (Untergrund/Burg)
    this.classicNight = false;                            // Nacht (schwarzer Himmel)
    this.classicWorld = 1;
    this.worldHpMul   = 1;                                // Gegner-HP-Multiplikator (spätere Welten zäher)
    this.castleX      = null;                             // Schloss-Deko (game.js) — null = keins

    if (level === 1) this.build_garden(diff);
    else if (level === 2) this.build_underwater(diff);
    else if (level === 3) this.build_flight(diff);
    else if (level === 4) this.build_towers(diff);
    else if (level === 5) this.build_unicornCastle(diff);
    else this.build_garden(diff);
};

// --- LEVEL 1: Bonbon-Garten (over) — viele süße Objekte, horizontal ----------
LevelGenerator.prototype.build_garden = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270, HIGH = B - 400;
    this.cFloor(0, 22 * T); this.cFloor(24 * T, (40 - 24) * T); this.cFloor(42 * T, (74 - 42) * T);
    for (let i = 0; i < 5; i++) this.cDrink(4 + i, B - 180 - Math.sin(i) * 40, i % 2 ? 'LIQUOR' : 'BEER');
    this.cBlock(6, LOW, '?', 'BEER');
    this.cBlock(9, LOW, 'brick'); this.cBlock(10, LOW, '?', 'PISTOL'); this.cBlock(11, LOW, 'brick');
    this.cBlock(10, HIGH, '?', 'STAR');
    this.cPipe(14, 2); this.cPiranha(18, 3);
    this.eMushroom(27, B - 260, 3, 'koopa', diff);
    this.eMushroom(33, B - 340, 2, 'goomba', diff);
    this.cLift(36, B - 220, 2, 130, 1.6);
    this.cBlock(46, LOW, '?', 'HEART');
    for (let i = 0; i < 4; i++) this.cDrink(48 + i, B - 200, 'BEER');
    this.cEnemy(8, 'goomba', diff); this.cEnemy(20, 'koopa', diff); this.cEnemy(45, 'goomba', diff); this.cEnemy(52, 'para', diff);
    this.eStaircase(60, 5, 1);
    this.goalX = 68 * T;
};

// --- LEVEL 2: Unterwasser-Riff (under) — Schwimmen, Korallen, Bonbon-Blasen ---
LevelGenerator.prototype.build_underwater = function(diff) {
    const B = this.baseY, T = C_TILE;
    this.waterY = B - 520;                 // fast komplett unter Wasser -> Schwimmphysik
    this.cFloor(0, 66 * T);                // sandiger Boden
    const plats = [[6, B - 200, 3], [11, B - 340, 2], [15, B - 200, 3], [20, B - 380, 2], [25, B - 220, 3],
                   [30, B - 360, 2], [36, B - 200, 3], [41, B - 340, 2], [46, B - 240, 3], [52, B - 360, 2]];
    plats.forEach(p => this.cPlat(p[0], p[1], p[2]));                 // Schwebe-Korallen
    for (let i = 0; i < 18; i++) this.cDrink(4 + i * 3, B - 160 - ((i * 53) % 260), i % 2 ? 'LIQUOR' : 'BEER');
    this.cPiranha(9, 3); this.cPiranha(28, 4); this.cPiranha(48, 3);  // Korallen-Blümchen
    this.cBlock(20, B - 470, '?', 'HEART'); this.cBlock(38, B - 470, '?', 'STAR');
    this.cDrink(34, B - 300, 'JETPACK');
    this.cEnemy(7, 'koopa', diff); this.cEnemy(17, 'goomba', diff); this.cEnemy(33, 'koopa', diff); this.cEnemy(43, 'goomba', diff);
    this.eStaircase(58, 4, 1);
    this.goalX = 63 * T;
};

// --- LEVEL 3: Wolkenflug (over) — VERTIKAL, viele Jetpacks, Wölkchen-Türme ----
LevelGenerator.prototype.build_flight = function(diff) {
    const B = this.baseY, T = C_TILE;
    this.cFloor(0, 32 * T);                                   // durchgehender Boden (Flagge unten, kindgerecht)
    [2, 8, 14, 20, 26].forEach(tx => this.cDrink(tx, B - 150, 'JETPACK'));   // Jetpacks am Boden
    const towers = [4, 11, 18, 24];
    towers.forEach((tx, k) => {                               // hohe vertikale Wölkchen-/Plattform-Türme
        for (let i = 1; i <= 8; i++) {
            const y = B - 180 - i * 200;
            if (i % 2 === 0) this.addCloud(tx * T, y, 220); else this.cPlat(tx, y, 2);
            this.cDrink(tx, y - 60, i % 2 ? 'LIQUOR' : 'BEER');               // Bonbons hoch oben
            if (i % 4 === 0) this.cDrink(tx + 1, y - 60, 'JETPACK');          // Nachtank-Jetpack
        }
        this.cBlock(tx, B - 180 - 9 * 200, '?', k % 2 ? 'HEART' : 'STAR');     // Belohnung an der Spitze
    });
    this.cBullet(16, B - 500, -1); this.cBullet(22, B - 900, -1);
    this.cEnemy(7, 'para', diff); this.cEnemy(20, 'para', diff);
    this.eStaircase(28, 3, 1);
    this.goalX = 31 * T;
};

// --- LEVEL 4: Plüsch-Türme (castle) — Klettern, Lifts, Kanonen, Hammer-Bros ---
LevelGenerator.prototype.build_towers = function(diff) {
    const B = this.baseY, T = C_TILE, LOW = B - 270;
    this.cFloor(0, 72 * T);
    this.cStair(8, 5); this.cStair(9, 5); this.cStair(14, 3);
    this.cCannon(20, 3); this.cCannon(34, 4);                 // Liebes-Bomber-Kanonen
    this.cLift(24, B - 260, 2, 160, 1.8); this.cLift(28, B - 380, 2, 150, 2.0);
    this.cHammer(16, diff); this.cHammer(40, diff);          // werfen Lollis
    this.cPiranha(30, 3); this.cPiranha(46, 4);
    this.cPlat(38, B - 300, 3); this.cBlock(39, B - 470, '?', 'STAR');
    this.cBlock(50, LOW, '?', 'HEART'); this.cBlock(52, LOW, '?', 'SHOTGUN');
    for (let i = 0; i < 6; i++) this.cDrink(42 + i, B - 200 - Math.sin(i) * 40, i % 2 ? 'LIQUOR' : 'BEER');
    this.cEnemy(12, 'koopa', diff); this.cEnemy(26, 'goomba', diff); this.cEnemy(44, 'koopa', diff); this.cEnemy(58, 'para', diff);
    this.ePyramid(62, 4);
    this.goalX = 70 * T; this.castleX = 68 * T;
};

// --- LEVEL 5: Einhorn-Schloss (castle) — Aufrüsten + gigantisches Einhorn -----
LevelGenerator.prototype.build_unicornCastle = function(diff) {
    const B = this.baseY, T = C_TILE;
    this.cFloor(0, 70 * T);
    this.cBlock(6, B - 270, '?', 'MINIGUN'); this.cBlock(9, B - 270, '?', 'ROCKET'); this.cBlock(12, B - 270, '?', 'FLAMETHROWER');
    this.cDrink(15, B - 180, 'HEART'); this.cDrink(16, B - 180, 'HEART');
    this.cHammer(20, diff); this.cEnemy(24, 'koopa', diff);
    this.cLift(28, B - 250, 2, 160, 1.8);
    this.cPiranha(34, 3);
    const boss = this.spawn(BossUnicorn, 58 * T, B - 420, 1, diff);
    boss.isBoss = true; boss.hp = 6000;
    this.bossSpawned = true;
    this.castleX = 64 * T;
    // kein goalX -> Level endet, wenn das Einhorn besiegt ist
};

// --- kleine Bau-Helfer (Koordinaten in Kacheln, tx = Kachelindex) -----------
LevelGenerator.prototype.cFloor = function(x, w) {           // massiver Boden
    const p = new Platform(x, this.baseY, w, 1500, true);
    p.style = 'GROUND'; p.ctheme = this.classicTheme;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cPipe = function(tx, units) {       // grüne Röhre (solide)
    const h = C_PIPE_H[units] || 110;
    const p = new Platform(tx * C_TILE, this.baseY - h, C_TILE * 2, h + 1500, true);
    p.style = 'PIPE'; p.ctheme = this.classicTheme;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cCannon = function(tx, units) {    // Bullet-Bill-Kanone (solide, feuert Geschosse)
    const h = units * C_TILE;
    const p = new Platform(tx * C_TILE, this.baseY - h, C_TILE, h + 1500, true);
    p.style = 'CANNON'; p.ctheme = this.classicTheme; p.isCannon = true; p.cannonTimer = 1 + Math.random() * 2;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cBlock = function(tx, topY, kind, content) { // ?-Feld / Ziegel (solide, von unten anschlagbar)
    const p = new Platform(tx * C_TILE, topY, C_TILE, C_TILE, true);  // solider SMB-Block
    p.style = (kind === '?') ? 'QUESTION' : 'BRICK';
    p.ctheme = this.classicTheme;
    p.bumpable = true;
    p.bumpTimer = 0;
    p.content = content || null;   // HEART/STAR/Waffe/Bier – oder null (leerer Ziegel = zerstörbar)
    p.used = false;
    this.platforms.push(p);
    return p;
};
// Schwebende, begehbare Plattform (für Geschicklichkeits-Passagen) — Breite in Kacheln
LevelGenerator.prototype.cPlat = function(tx, topY, wTiles) {
    const p = new Platform(tx * C_TILE, topY, wTiles * C_TILE, 40, true);
    p.style = 'STAIR'; p.ctheme = this.classicTheme;
    this.platforms.push(p);
    return p;
};
// EIN Element: Pilz-Plattform (oranger Stiel bis Boden + grüne begehbare Kappe).
// Optional ein Gegner OBEN auf der Kappe (statt am Boden). capTx = linke Kachel der Kappe.
LevelGenerator.prototype.eMushroom = function(tx, capTopY, capTiles, foe, diff) {
    const p = new Platform(tx * C_TILE, capTopY, capTiles * C_TILE, 40, false);  // halb-solide Kappe (von oben begehbar)
    p.style = 'MUSHROOM'; p.ctheme = this.classicTheme;
    p.stemLen = Math.max(0, this.baseY - capTopY);
    this.platforms.push(p);
    if (foe) {
        const ex = (tx + capTiles / 2) * C_TILE - 40;
        if (foe === 'para') {
            const e = this.spawn(ParatroopaEnemy, ex, capTopY - 300, 1, diff); e.baseFlyY = e.y; e.hp *= (this.worldHpMul || 1);
        } else {
            const Cls = (foe === 'koopa') ? KoopaEnemy : GoombaEnemy;
            const e = this.spawn(Cls, ex, capTopY - 170, 1, diff); e.hp *= (this.worldHpMul || 1);
        }
    }
    return p;
};
// Bewegliche Lift-Plattform (nur von oben begehbar) — vertikal pendelnd
LevelGenerator.prototype.cLift = function(tx, topY, wTiles, range, speed) {
    const p = new Platform(tx * C_TILE, topY, wTiles * C_TILE, 36, false);
    p.style = 'STAIR'; p.ctheme = this.classicTheme;
    p.isMoving = true; p.moveRange = (range == null ? 130 : range); p.moveSpeed = (speed == null ? 1.6 : speed);
    p.startY = topY;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cStair = function(tx, units) {      // massive Treppenstufe bis Boden
    const h = units * C_TILE;
    const p = new Platform(tx * C_TILE, this.baseY - h, C_TILE, h + 1500, true);
    p.style = 'STAIR'; p.ctheme = this.classicTheme;
    this.platforms.push(p);
    return p;
};
LevelGenerator.prototype.cDrink = function(tx, topY, type) { // freie Bierflasche / Schnaps (keine Münzen)
    this.items.push(new Collectible(tx * C_TILE + C_TILE / 2 - 40, topY, type || 'BEER'));
};
LevelGenerator.prototype.cEnemy = function(tx, kind, diff) { // Original-Gegner; Anzahl skaliert mit Schwierigkeit
    const Cls = (kind === 'koopa') ? KoopaEnemy : (kind === 'para') ? ParatroopaEnemy : GoombaEnemy;
    let count = 1;
    if (diff === 'badass') count = (Math.random() < 0.6) ? 2 : 1;        // mehr Gegner
    else if (diff === 'princess') count = (Math.random() < 0.3) ? 0 : 1; // weniger Gegner
    for (let n = 0; n < count; n++) {
        const e = this.spawn(Cls, (tx + n * 1.7) * C_TILE, this.baseY - 160, 1, diff);
        e.hp *= (this.worldHpMul || 1);                                     // spätere Welten zäher
        if (kind === 'para') { e.y = this.baseY - 320; e.baseFlyY = e.y; }   // Paratroopa fliegt höher
    }
};
// Röhre mit Piranha-Pflanze (originaler Röhren-Gegner)
LevelGenerator.prototype.cPiranha = function(pipeTx, units) {
    this.cPipe(pipeTx, units);
    const h = C_PIPE_H[units] || 110;
    const cx = pipeTx * C_TILE + C_TILE;                  // Röhrenmitte (Breite 2·T)
    this.enemies.push(new PiranhaPlantEnemy(cx, this.baseY - h, 1));
};
LevelGenerator.prototype.cHammer = function(tx, diff) {  // Hammer-Bro
    const e = this.spawn(HammerBroEnemy, tx * C_TILE, this.baseY - 160, 1, diff);
    e.hp *= (this.worldHpMul || 1); return e;
};
LevelGenerator.prototype.cBullet = function(tx, topY, dir) {  // Bullet Bill (fliegt)
    this.enemies.push(new BulletBillEnemy(tx * C_TILE, topY, 1, dir || -1));
};
LevelGenerator.prototype.cBowser = function(tx) {        // Endboss
    const e = new BowserEnemy(tx * C_TILE, this.baseY - 196, 1);
    e.hp *= (this.worldHpMul || 1);
    this.enemies.push(e); return e;
};

// ============================================================================
//  ELEMENT-BIBLIOTHEK — zusammengesetzte Strukturen als EIN sauberer Aufruf.
//  Jedes Element wird komplett gebaut (geerdet, nahtlos); kein Inline-Gebastel
//  mehr in den Level-Funktionen. Im Story-Modus erben die Elemente den
//  schäbigen Look automatisch (this._shabby -> p.shabby in den Bau-Helfern).
// ============================================================================

// Schlusstreppe: geerdete Stufen. dir +1 = aufsteigend nach rechts, -1 = absteigend.
LevelGenerator.prototype.eStaircase = function(startTx, steps, dir) {
    dir = dir || 1;
    for (let i = 0; i < steps; i++) this.cStair(startTx + i, (dir > 0) ? (i + 1) : (steps - i));
    return startTx + steps;
};
// Pyramide: erst hoch (1..height) dann runter (height..1).
LevelGenerator.prototype.ePyramid = function(startTx, height) {
    let t = startTx;
    for (let i = 1; i <= height; i++) this.cStair(t++, i);
    for (let i = height; i >= 1; i--) this.cStair(t++, i);
    return t;
};
// Hammer-Bro-Festung: 2×2-Ziegelturm (LOW+HIGH) mit Hammer-Bro obendrauf.
LevelGenerator.prototype.eFortress = function(tx, diff) {
    const LOW = this.baseY - 270, HIGH = this.baseY - 380;
    this.cBlock(tx, LOW, 'brick'); this.cBlock(tx + 1, LOW, 'brick');
    this.cBlock(tx, HIGH, 'brick'); this.cBlock(tx + 1, HIGH, 'brick');
    this.cHammer(tx, diff);
    return tx + 2;
};
// Münz-/Bier-Reihe (Bogen optional über y).
LevelGenerator.prototype.eCoins = function(tx, n, y, type) {
    for (let i = 0; i < n; i++) this.cDrink(tx + i, y, type || 'BEER');
};
// Block-Reihe: pattern-String, z.B. "b?bB" -> brick/?-Beer/brick/?-Waffe. row in px (Oberkante).
LevelGenerator.prototype.eBrickRow = function(tx, row, pattern, world) {
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (c === 'b') this.cBlock(tx + i, row, 'brick');
        else if (c === '?') this.cBlock(tx + i, row, '?', 'BEER');
        else if (c === 'B') this.cBlock(tx + i, row, '?', this.cWeapon(world || this.classicWorld || 1));
        else if (c === 'H') this.cBlock(tx + i, row, '?', 'HEART');
        else if (c === 'S') this.cBlock(tx + i, row, '?', 'STAR');
        // ' ' = Lücke
    }
};

// Waffen-/Power-up-Auswahl, gewichtet nach Welt — sorgt für Abwechslung
const C_WEAPONS_EARLY = ['PISTOL', 'SHOTGUN', 'UZI', 'GRENADE', 'MOLOTOV', 'AXE', 'KNIFE', 'BAT'];
const C_WEAPONS_LATE  = ['ASSAULT_RIFLE', 'MINIGUN', 'ROCKET', 'FLAMETHROWER', 'CHAINSAW', 'SHOTGUN', 'UZI', 'GRENADE'];
const C_POWERUPS      = ['HEART', 'STAR', 'BOOSTER', 'JETPACK'];
LevelGenerator.prototype.cWeapon = function(world) {
    if (Math.random() < 0.18) return C_POWERUPS[Math.floor(Math.random() * C_POWERUPS.length)];
    const late = (world >= 4) || (Math.random() < (world - 1) * 0.18);
    const pool = late ? C_WEAPONS_LATE : C_WEAPONS_EARLY;
    return pool[Math.floor(Math.random() * pool.length)];
};
