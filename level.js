class LevelGenerator {
    constructor() {
        this.platforms = []; this.ladders = []; this.enemies = []; this.items = []; this.corpses = [];
        this.cursorX = 0; this.baseY = 600; this.levelPlan = []; this.bossSpawned = false; this.currentGeneratedLevel = 1; this.goalX = null;
        this.classicMode = false; this._lastClassic = false; this.castleX = null;
        this.waterY = null;     // Wasseroberfläche (null = kein Wasser)
    }

    init(startX, startY) {
        this.platforms = []; this.ladders = []; this.enemies = []; this.items = []; this.corpses = [];
        this.cursorX = startX; this.baseY = 600; this.bossSpawned = false; this.goalX = null;
        this.waterY = null; this._hillH = 0;
        this.platforms.push(this._shab(new Platform(this.cursorX - 500, this.baseY, 2000, 1000, true), 'GROUND'));
        this.cursorX += 1500; this.levelPlan = null;
    }

    update(camX, screenWidth, gameLevel, difficulty = 'regular') {
        // (Neu-)Aufbau bei Levelwechsel ODER Moduswechsel (Story <-> Classic)
        if (this.currentGeneratedLevel !== gameLevel || this._lastClassic !== this.classicMode) {
            this.currentGeneratedLevel = gameLevel;
            this._lastClassic = this.classicMode;
            if (this.classicMode) this.buildClassic(gameLevel, difficulty);
            else { this.init(camX, 600); }
        }
        // Story-Level werden lazily aus dem Bauplan erweitert; Classic-Level stehen komplett.
        if (!this.classicMode) {
            if (!this.levelPlan) this.loadBlueprint(gameLevel);
            while (this.levelPlan.length > 0 && this.cursorX < camX + screenWidth + 1200) {
                let nextModule = this.levelPlan.shift(); this.buildModule(nextModule, gameLevel, difficulty);
            }
        }
        const cleanupX = camX - 2000;
        this.enemies = this.enemies.filter(e => e.x + e.w > cleanupX || e.isBoss);
        this.items = this.items.filter(i => i.x + i.w > cleanupX);
        this.corpses = this.corpses.filter(c => c.x + c.w > cleanupX);
    }

    // STORY: Terrain aus den Bibliotheks-Elementen im schäbigen Zombie-Look (drawClassic + shabby).
    _shab(p, style) {
        if (!this.classicMode) { p.style = style; p.ctheme = 'over'; p.shabby = true; }
        return p;
    }

    addFloor(width) {
        this._hillH = 0;                          // flacher Boden setzt die Hügel-Höhe zurück
        const p = new Platform(this.cursorX, this.baseY, width, 1500, true);
        this._shab(p, 'GROUND');
        this.platforms.push(p);
        let oldX = this.cursorX; this.cursorX += width; return oldX;
    }

    addPlatform(x, y, w, isCrumbling = false, isBouncy = false) {
        let p = new Platform(x, y, w, 40, false);
        p.isCrumbling = isCrumbling; p.isBouncy = isBouncy;
        if (!isBouncy && !isCrumbling) this._shab(p, 'STAIR');   // Bouncy/Crumbling behalten Spezial-Optik
        this.platforms.push(p); return p;
    }

    addMovingPlatform(x, y, w, range = 250, speed = 2.5) {
        let p = new Platform(x, y, w, 40, false);
        p.isMoving = true; p.moveRange = range; p.moveSpeed = speed;
        this._shab(p, 'STAIR');
        this.platforms.push(p); return p;
    }

    addSpikes(x, y, w) {
        let p = new Platform(x, y, w, 40, false);
        p.isSpiky = true; this.platforms.push(p); return p;
    }

    addFireTrap(x, y) {
        let p = new Platform(x, y, 80, 40, true);
        p.isFireTrap = true; this.platforms.push(p); return p;
    }

    // Solide Säule (Mario-"Röhre") vom Boden bis (baseY - h) hoch
    addPillar(x, h, w = 90) {
        const p = new Platform(x, this.baseY - h, w, h + 1500, true);
        this._shab(p, 'STAIR');
        this.platforms.push(p);
    }

    spawn(EnemyClass, x, y, level, diff, variant = null) {
        let e = new EnemyClass(x, y, level, variant);
        if (variant) e.enemyType = variant;
        if (diff === 'princess') { e.hp *= 0.4; } else if (diff === 'badass') { e.hp *= 2.5; }
        this.enemies.push(e); return e;
    }

    // ---- Theme & Gegner-Auswahl --------------------------------------------
    // 5 Settings: 1 Toxic Forest, 2 Scrap Facility, 3 Frozen Waste, 4 Burning City, 5 Flesh Hell
    themeOf(lvl) { return Math.min(5, Math.max(1, Math.ceil(lvl / 2))); }

    // Spawnt einen zum Setting passenden Gegner einer "Rolle"
    spawnThemeEnemy(x, lvl, diff, role) {
        const t = this.themeOf(lvl);
        const gy = this.baseY - 150, fy = this.baseY - 400;
        const Z = (v) => this.spawn(ZombieEnemy, x, gy, lvl, diff, v);
        const S  = () => this.spawn(SoldierEnemy, x, this.baseY - 160, lvl, diff);
        const SP = () => this.spawn(SpiderEnemy, x, this.baseY - 120, lvl, diff);
        const H  = () => this.spawn(HellhoundEnemy, x, this.baseY - 120, lvl, diff);
        const D  = () => this.spawn(DemonEnemy, x, fy, lvl, diff);
        const TR = () => this.spawn(TridentDemonEnemy, x, this.baseY - 220, lvl, diff);
        const B  = () => this.spawn(BloaterEnemy, x, this.baseY - 170, lvl, diff);
        const sets = {
            1: { basic: () => Z('NORMAL'), fast: () => Z('RUNNER'), tank: () => Z('TANK'), ranged: () => Z('SPITTER'), special: B,  flyer: D  },
            2: { basic: () => Z('NORMAL'), fast: () => Z('RUNNER'), tank: () => Z('TANK'), ranged: S,                  special: H,  flyer: SP },
            3: { basic: () => Z('NORMAL'), fast: H,                 tank: () => Z('TANK'), ranged: S,                  special: SP, flyer: D  },
            4: { basic: S,                 fast: H,                 tank: () => Z('TANK'), ranged: S,                  special: B,  flyer: SP },
            5: { basic: TR,                fast: SP,                tank: () => Z('TANK'), ranged: D,                  special: B,  flyer: D  }
        };
        const set = sets[t]; return (set[role] || set.basic)();
    }

    // --- kleine Mechanik-Helfer (für die Level-Module unten) ----------------
    addLadder(x, y, w, h) {                 // Kletterleiter
        const l = new Ladder(x, y, w, h);
        this.ladders.push(l);
        return l;
    }
    setWater(y) { this.waterY = y; }        // macht das GANZE Level zum Wasserlevel (Schwimmphysik)

    // zufällige Knuddel-Waffe aus dem vollen Arsenal (strong = stärkere Sorten)
    randWeapon(strong) {
        const early = ['PISTOL', 'UZI', 'SHOTGUN', 'KNIFE', 'AXE', 'GRENADE', 'MOLOTOV', 'ASSAULT_RIFLE', 'CHAINSAW'];
        const late  = ['ASSAULT_RIFLE', 'MINIGUN', 'ROCKET', 'FLAMETHROWER', 'CHAINSAW', 'SHOTGUN', 'UZI', 'GRENADE'];
        const pool = strong ? late : early;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // Wölkchen-Plattform: begehbar, sinkt langsam beim Draufstehen, steigt wieder hoch (entities.js)
    addCloud(x, y, w) {
        const p = new Platform(x, y, w, 40, false);
        p.isCloud = true; p.startY = y; p.style = null; p.shabby = false;
        this.platforms.push(p);
        return p;
    }

    // Rollender Hügel-Boden: Segmente mit unregelmäßiger Höhe (begehbar dank Step-up im Player).
    addHills(width) {
        const seg = 200, n = Math.max(1, Math.round(width / seg));
        const startX = this.cursorX;
        let h = this._hillH || 0;
        for (let i = 0; i < n; i++) {
            const gx = this.cursorX;
            const target = 10 + Math.abs(Math.sin(gx * 0.0021) + Math.sin(gx * 0.0009 + 1.3)) * 62; // ~10..134 über baseY
            h += (target - h) * 0.5;                       // glätten -> begehbare Stufen
            const p = new Platform(gx, this.baseY - h, seg + 3, h + 1500, true);
            this._shab(p, 'GROUND');
            this.platforms.push(p);
            this.cursorX += seg;
        }
        this._hillH = h;
        return startX;
    }

    // ========================================================================
    //  >>> HIER EIGENE STORY-LEVEL BAUEN <<<
    // ------------------------------------------------------------------------
    //  Ein Level = eine Reihenfolge von "Modulen" (loadBlueprint), die der
    //  LevelGenerator beim Vorrücken der Kamera nacheinander aus buildModule()
    //  zusammensetzt. Neue Module = neue case-Zweige unten. Alle Mechaniken
    //  (Plattformen, bewegte Stege, Leitern, Stacheln, Feuerfallen, Gegner,
    //  Pickups, Waffen, Jetpack, Schwimmen, Ziel-Flagge) sind über die
    //  Helfer-Methoden oben verfügbar.
    // ========================================================================

    // Bauplan: Abfolge der Module je Welt. Welt 4 (Plüsch-Königreich) endet mit dem
    // lieben Endboss-Knuddel. 'POOL' ist als Schwimm-Beispiel vorhanden (Wasser ist
    // global pro Level), einfach in einen Plan einsetzen statt 'CLIMB'.
    loadBlueprint(level) {
        const plans = {
            // kürzere, dichtere Welten (nicht mehr langatmig) — je ~7 Module, voll mit Gegnern
            1: ['RUN', 'CLOUDS', 'PILLARS', 'HORDE', 'UNICORN', 'BRIDGE', 'EXIT'],
            2: ['RUN', 'STAIRS', 'HORDE', 'TOWER', 'CLOUDS', 'UNICORN', 'EXIT'],
            3: ['FLOAT', 'CLOUDS', 'HORDE', 'PILLARS', 'UNICORN', 'TRAMP', 'EXIT'],
            4: ['RUN', 'HORDE', 'TOWER', 'UNICORN', 'CLOUDS', 'HORDE', 'PILLARS', 'BOSS']
        };
        this.levelPlan = (plans[level] || plans[1]).slice();
    }

    // Baut ein einzelnes Modul am laufenden cursorX zusammen.
    buildModule(moduleName, lvl, diff) {
        const B = this.baseY;
        let sx;
        switch (moduleName) {

            case 'RUN': {              // rollender Hügel-Lauf: Waffe + gleich mehrere Gegner
                sx = this.addHills(1600);
                this.spawnThemeEnemy(sx + 500, lvl, diff, 'basic');
                this.spawnThemeEnemy(sx + 850, lvl, diff, 'fast');
                this.spawnThemeEnemy(sx + 1200, lvl, diff, 'flyer');
                this.items.push(new Collectible(sx + 450, B - 120, this.randWeapon(false)));
                this.items.push(new Collectible(sx + 1100, B - 120, 'HEART'));
                break;
            }

            case 'GAP': {              // Abgrund zum Drüberspringen (tödlicher Sturz)
                this.addFloor(700);
                this.cursorX += 280;   // Lücke
                this.addFloor(900);
                break;
            }

            case 'FLOAT': {            // Schwebeplattformen über einer Lücke
                this.addFloor(500);
                this.cursorX += 250;
                const baseX = this.cursorX;
                for (let i = 0; i < 3; i++) this.addPlatform(baseX + i * 320, B - 150 - (i % 2) * 90, 180);
                this.items.push(new Collectible(baseX + 320, B - 320, 'STAR'));
                this.spawnThemeEnemy(baseX + 160, lvl, diff, 'flyer');
                this.spawnThemeEnemy(baseX + 640, lvl, diff, 'flyer');
                this.cursorX = baseX + 3 * 320;
                this.addFloor(700);
                break;
            }

            case 'MOVERS': {           // bewegte Plattform über einem Abgrund
                this.addFloor(600);
                const gx = this.cursorX; this.cursorX += 420;
                this.addMovingPlatform(gx + 110, B - 170, 200, 130, 1.6);
                this.addFloor(900);
                break;
            }

            case 'CLIMB': {            // Leiter hoch zu einer Belohnung (starke Waffe)
                sx = this.addFloor(1500);
                this.addPlatform(sx + 500, B - 360, 340);
                this.addLadder(sx + 560, B - 360, 70, 360);
                this.items.push(new Collectible(sx + 660, B - 440, this.randWeapon(true)));
                this.addSpikes(sx + 1000, B - 40, 220);   // Stachelfeld als Hindernis
                break;
            }

            case 'POOL': {             // SCHWIMM-BEISPIEL (siehe loadBlueprint-Hinweis)
                sx = this.addFloor(1800);
                this.setWater(B - 320);                    // hohe Wasserfläche -> Schwimmphysik
                this.items.push(new Collectible(sx + 600, B - 200, 'STAR'));
                this.spawn(ZombieEnemy, sx + 1000, B - 150, lvl, diff, 'NORMAL');
                break;
            }

            case 'HORDE': {            // große Kampf-Arena auf Hügeln: viele vielfältige Tierchen + Waffe
                sx = this.addHills(2100);
                const roles = ['basic', 'fast', 'flyer', 'tank', 'special'];
                const n = 5 + lvl;
                for (let i = 0; i < n; i++) this.spawnThemeEnemy(sx + 400 + i * 200, lvl, diff, roles[i % roles.length]);
                this.items.push(new Collectible(sx + 300, B - 120, this.randWeapon(lvl >= 3)));
                this.items.push(new Collectible(sx + 1100, B - 120, 'HEART'));
                break;
            }

            case 'EXIT': {             // Ziel-Flagge -> Levelende / nächste Welt
                sx = this.addFloor(1400);
                this.items.push(new Collectible(sx + 300, B - 120, 'HEART'));
                this.goalX = sx + 800;
                break;
            }

            case 'BOSS': {             // gigantisches Einhorn — Endboss (braucht SEHR viele Treffer)
                sx = this.addFloor(4400);
                this.items.push(new Collectible(sx + 300, B - 120, 'HEART'));
                this.items.push(new Collectible(sx + 600, B - 120, 'MINIGUN'));
                this.items.push(new Collectible(sx + 900, B - 120, 'ROCKET'));
                this.items.push(new Collectible(sx + 1200, B - 120, 'FLAMETHROWER'));
                this.items.push(new Collectible(sx + 1500, B - 120, 'HEART'));
                const boss = this.spawn(BossUnicorn, sx + 2600, B - 420, lvl, diff);
                boss.isBoss = true;
                boss.hp = 6000;          // sehr viele Treffer nötig
                this.bossSpawned = true;
                break;
            }

            case 'STAIRS': {           // Bonbon-Blocktreppe hoch & runter (Belohnung oben)
                sx = this.addFloor(2000);
                for (let i = 1; i <= 4; i++) this.addPillar(sx + 500 + i * 150, i * 90, 140);
                for (let i = 1; i <= 4; i++) this.addPillar(sx + 500 + (4 + i) * 150, (5 - i) * 90, 140);
                this.items.push(new Collectible(sx + 500 + 4 * 150 + 60, B - 4 * 90 - 70, 'LIQUOR'));
                this.spawnThemeEnemy(sx + 1700, lvl, diff, 'basic');
                break;
            }

            case 'TOWER': {            // hohe Wand: hochklettern (Leiter) & drüber, Belohnung oben
                sx = this.addFloor(1400);
                const wallX = sx + 900, top = 560;
                this.platforms.push(new Platform(wallX, B - top, 120, top + 1500, true));   // solide Wand
                for (let i = 0; i < 5; i++) this.addPlatform(wallX - 360 + (i % 2) * 180, B - 150 - i * 120, 200);
                this.addLadder(sx + 320, B - 420, 70, 420);
                this.items.push(new Collectible(wallX - 160, B - 720, 'STAR'));
                this.cursorX = wallX + 120;
                this.addFloor(1200);
                this.spawnThemeEnemy(this.cursorX - 400, lvl, diff, 'ranged');
                break;
            }

            case 'TRAMP': {            // Trampolin zu hoher Belohnung (selten Jetpack)
                sx = this.addFloor(1900);
                this.addPlatform(sx + 500, B - 40, 200, false, true);   // Trampolin (bouncy)
                this.addPlatform(sx + 470, B - 420, 280);
                this.items.push(new Collectible(sx + 560, B - 500, Math.random() < 0.3 ? 'JETPACK' : 'STAR'));
                this.items.push(new Collectible(sx + 1200, B - 120, 'BEER'));
                break;
            }

            case 'CLOUDS': {           // Wölkchen-Hüpfen über einen Abgrund (sinken beim Stehen)
                this.addFloor(500);
                this.cursorX += 200;
                const cbx = this.cursorX;
                for (let i = 0; i < 4; i++) this.addCloud(cbx + i * 300, B - 200 - (i % 2) * 70, 170);
                this.items.push(new Collectible(cbx + 300, B - 360, this.randWeapon(false)));
                this.items.push(new Collectible(cbx + 600, B - 300, 'BEER'));
                this.spawnThemeEnemy(cbx + 300, lvl, diff, 'flyer');
                this.spawnThemeEnemy(cbx + 900, lvl, diff, 'flyer');
                this.cursorX = cbx + 4 * 300;
                this.addFloor(700);
                break;
            }

            case 'UNICORN': {          // großes Einhorn als zäher Zwischengegner (einiges einstecken)
                sx = this.addHills(2300);
                this.items.push(new Collectible(sx + 300, B - 120, this.randWeapon(true)));
                this.items.push(new Collectible(sx + 600, B - 120, 'HEART'));
                const u = this.spawn(UnicornEnemy, sx + 1400, B - 220, lvl, diff);
                u.hp = 700 + lvl * 120;
                this.items.push(new Collectible(sx + 2000, B - 120, 'BEER'));
                break;
            }

            case 'PILLARS': {          // Säulen-Parcours + Bonbons obendrauf
                sx = this.addFloor(2100);
                for (let i = 0; i < 4; i++) { const px = sx + 400 + i * 360; this.addPillar(px, 110 + (i % 2) * 40, 90);
                    this.items.push(new Collectible(px + 5, B - 250 - (i % 2) * 40, 'BEER')); }
                this.spawnThemeEnemy(sx + 700, lvl, diff, 'basic');
                this.spawnThemeEnemy(sx + 1300, lvl, diff, 'fast');
                this.spawnThemeEnemy(sx + 1800, lvl, diff, 'tank');
                break;
            }

            case 'BRIDGE': {           // bröckelnde Stege über einem Abgrund (zügig rüber!)
                this.addFloor(600);
                const gw = 950, gx = this.cursorX; this.cursorX += gw; this.addFloor(1200);
                for (let i = 0; i < 5; i++) this.addPlatform(gx + 40 + i * ((gw - 80) / 4), B - 150 - (i % 2) * 45, 150, true);
                this.items.push(new Collectible(gx + gw * 0.5, B - 290, 'LIQUOR'));
                this.spawnThemeEnemy(gx + gw * 0.5, lvl, diff, 'flyer');
                this.spawnThemeEnemy(this.cursorX - 300, lvl, diff, 'basic');
                break;
            }

            case 'REST': {             // Verschnaufpause: viele Bonbons + Heilung
                sx = this.addFloor(1500);
                for (let i = 0; i < 5; i++) this.items.push(new Collectible(sx + 300 + i * 180, B - 130 - Math.sin(i) * 30, i % 2 ? 'LIQUOR' : 'BEER'));
                this.items.push(new Collectible(sx + 1180, B - 120, 'HEART'));
                break;
            }

            default: this.addFloor(1200); break;
        }
    }
}
