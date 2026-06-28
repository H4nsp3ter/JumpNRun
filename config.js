const CONFIG = {
    GRAVITY: 1800,
    MAX_FALL_SPEED: 1200,
    PLAYER_SPEED: 350,
    PLAYER_ACCEL: 2500,
    PLAYER_FRICTION: 2000,
    CLIMB_SPEED: 250,
    JUMP_FORCE: 850,
    MAX_HP: 100,
    // --- Jetpack (Item-Power-up): Schub nach oben, begrenzter Treibstoff ---
    JETPACK_FUEL: 3.2,        // Sekunden Volltank
    JETPACK_THRUST: 2900,     // Aufwärtsbeschleunigung pro s (überwindet Schwerkraft)
    JETPACK_MAX_RISE: 520,    // maximale Steiggeschwindigkeit
    JETPACK_REFUEL: 0.5,      // Treibstoff/s, der am Boden nachläuft
    // --- PUPSI: Pups-Flug (eingebaut, begrenzter Pups-Vorrat wie ein Jetpack) ---
    FART_FUEL: 2.6,           // Sekunden Pups-Vorrat (Volltank)
    FART_REFUEL: 0.7,         // Vorrat/s, der am Boden nachläuft
    // --- Schwimmen (Wasserlevel) ---
    SWIM_GRAVITY: 430,        // sanftes Absinken
    SWIM_STROKE: 470,         // Auftriebs-Impuls je Schwimmzug (Sprungtaste)
    SWIM_MAX_RISE: 380,       // max. Steiggeschwindigkeit beim Schwimmen
    SWIM_MAX_SINK: 240,       // max. Sinkgeschwindigkeit
    SWIM_SPEED_MUL: 0.6,      // horizontal langsamer im Wasser
    // 4 süße Welten (Theme 1..4) über die 10 Level-Slots verteilt. theme steuert Hintergrund-/Deko-Akzent.
    // Welt 1 Blümchen-Land · Welt 2 Bonbon-Land · Welt 3 Wolken-Land · Welt 4 Plüsch-Königreich
    LEVELS: {
        // --- Welt 1: BLÜMCHEN-LAND (Wiese, Pastellblau→Creme-Rosa) ---
        1:  { theme: 1, SKY_TOP: '#BFE9FF', SKY_BOTTOM: '#FFF0F6', PLATFORM_TOP: '#8FD06A', LAVA_TOP: '#9FE8D0', LAVA_BOTTOM: '#BFE3FF', PLATFORM_GRAD: ['#A6E085', '#7FC85A'], DECOR: 'BLÜMCHEN-LAND' },
        // --- Welt 2: BONBON-LAND (Zuckerwatte, Rosa→Mint) ---
        2:  { theme: 2, SKY_TOP: '#FFD6EC', SKY_BOTTOM: '#D9FBF0', PLATFORM_TOP: '#FFB3DC', LAVA_TOP: '#FFC8E6', LAVA_BOTTOM: '#FF9FC9', PLATFORM_GRAD: ['#FFC2E2', '#FF93C5'], DECOR: 'BONBON-LAND' },
        // --- Welt 3: WOLKEN-LAND (Himmel, Lavendel→Pfirsich) ---
        3:  { theme: 3, SKY_TOP: '#E7DBFF', SKY_BOTTOM: '#FFE6CC', PLATFORM_TOP: '#FFFFFF', LAVA_TOP: '#D6E6FF', LAVA_BOTTOM: '#C9D9FF', PLATFORM_GRAD: ['#FFFFFF', '#CBD9FF'], DECOR: 'WOLKEN-LAND' },
        // --- Welt 4: PLÜSCH-KÖNIGREICH (Stoff/Filz, Cremegelb→Warm) ---
        4:  { theme: 4, SKY_TOP: '#FFF3C4', SKY_BOTTOM: '#FFE0C0', PLATFORM_TOP: '#F0B8D0', LAVA_TOP: '#FFD9B0', LAVA_BOTTOM: '#FFC890', PLATFORM_GRAD: ['#F0B8D0', '#C97FA8'], DECOR: 'PLÜSCH-KÖNIGREICH' },
        // --- Reserve-Slots (wiederholen die 4 Welten, falls mehr Level) ---
        5:  { theme: 1, SKY_TOP: '#BFE9FF', SKY_BOTTOM: '#FFF0F6', PLATFORM_TOP: '#8FD06A', LAVA_TOP: '#9FE8D0', LAVA_BOTTOM: '#BFE3FF', PLATFORM_GRAD: ['#A6E085', '#7FC85A'], DECOR: 'BLÜMCHEN-LAND' },
        6:  { theme: 2, SKY_TOP: '#FFD6EC', SKY_BOTTOM: '#D9FBF0', PLATFORM_TOP: '#FFB3DC', LAVA_TOP: '#FFC8E6', LAVA_BOTTOM: '#FF9FC9', PLATFORM_GRAD: ['#FFC2E2', '#FF93C5'], DECOR: 'BONBON-LAND' },
        7:  { theme: 3, SKY_TOP: '#E7DBFF', SKY_BOTTOM: '#FFE6CC', PLATFORM_TOP: '#FFFFFF', LAVA_TOP: '#D6E6FF', LAVA_BOTTOM: '#C9D9FF', PLATFORM_GRAD: ['#FFFFFF', '#CBD9FF'], DECOR: 'WOLKEN-LAND' },
        8:  { theme: 4, SKY_TOP: '#FFF3C4', SKY_BOTTOM: '#FFE0C0', PLATFORM_TOP: '#F0B8D0', LAVA_TOP: '#FFD9B0', LAVA_BOTTOM: '#FFC890', PLATFORM_GRAD: ['#F0B8D0', '#C97FA8'], DECOR: 'PLÜSCH-KÖNIGREICH' },
        // --- Reserve-Slots (wiederholen Welt 1/2, falls mehr Level) ---
        9:  { theme: 1, SKY_TOP: '#BFE9FF', SKY_BOTTOM: '#FFF0F6', PLATFORM_TOP: '#8FD06A', LAVA_TOP: '#9FE8D0', LAVA_BOTTOM: '#BFE3FF', PLATFORM_GRAD: ['#A6E085', '#7FC85A'], DECOR: 'BLÜMCHEN-LAND' },
        10: { theme: 2, SKY_TOP: '#FFD6EC', SKY_BOTTOM: '#D9FBF0', PLATFORM_TOP: '#FFB3DC', LAVA_TOP: '#FFC8E6', LAVA_BOTTOM: '#FF9FC9', PLATFORM_GRAD: ['#FFC2E2', '#FF93C5'], DECOR: 'BONBON-LAND' }
    },
    COLORS: {
        PROJECTILE_PLAYER: '#7FE3FF', // Wassertröpfchen / Wattebausch (hell)
        PROJECTILE_ROCKET: '#FFB3DC', // Riesen-Wattebausch / Bonbon
        PROJECTILE_ENEMY: '#FF6FA8',  // Liebes-Herzchen der Gegner
        POWERUP_STAR: '#FFE56B',      // Glücks-Stern (Unbesiegbarkeit)
        POWERUP_HEART: '#FF6FA8',
        POWERUP_BOOST: '#9FE8D0',     // Sprung-Booster
        MOLOTOV_FIRE: '#FFB3DC',      // Seifenblasen-Wölkchen
        COIN: '#FFD36E',
        LADDER: '#C9A0FF',
        FLAME: '#BFE3FF',             // Seifenblasen / Glitzer
    },
    // Knuddel-Anzeigenamen für die Waffen (interne Keys bleiben gleich -> Feuer-Logik unberührt).
    WEAPON_NAMES: {
        BAT:           { name: 'Kuschelstab',          short: 'KU' },
        KNIFE:         { name: 'Zuckerstange',         short: 'ZU' },
        AXE:           { name: 'Lolli-Hammer',         short: 'LO' },
        CHAINSAW:      { name: 'Kitzelfeder',          short: 'KI' },
        PISTOL:        { name: 'Wasserspritzpistole',  short: 'WA' },
        UZI:           { name: 'Seifenblasen-Pistole', short: 'SE' },
        SHOTGUN:       { name: 'Bonbonkanone',         short: 'BO' },
        ASSAULT_RIFLE: { name: 'Wattebäuschchen-Werfer', short: 'WT' },
        MINIGUN:       { name: 'Glitzer-Schleuder',    short: 'GL' },
        ROCKET:        { name: 'Riesen-Wattebausch',   short: 'RW' },
        FLAMETHROWER:  { name: 'Seifenblasen-Bläser',  short: 'SB' },
        GRENADE:       { name: 'Puddingwerfer',        short: 'PU' },
        MOLOTOV:       { name: 'Seifenblase',          short: 'BL' },
    },
    // Palette für den CLASSIC-Modus (originalgetreue Super-Mario-Level).
    // theme:0 -> Platform.draw zeichnet keine Story-Deko; die Klassik-Plattformen
    // rendern über ihren eigenen .style (siehe entities.js / classic.js).
    CLASSIC: {
        theme: 0,
        SKY_TOP: '#5C94FC', SKY_BOTTOM: '#5C94FC',
        PLATFORM_TOP: '#C84C0C', PLATFORM_GRAD: ['#C84C0C', '#7C2C00'],
        LAVA_TOP: '#FF6A00', LAVA_BOTTOM: '#561600',   // Lava nur in der Burg (1-4) sichtbar
        DECOR: 'CLASSIC DEMO'
    },
    // Spielbare Heldin (nur Lina). Weitere Figuren ließen sich hier ergänzen.
    CHARACTERS: {
        // LINA die Blumenfee: Flatter-Doppelsprung (Flügel) + Knutsch-Knuddel-Attacke (E).
        // hat:'crown' = Blütenkranz, wings:true = Feenflügel, cuddle:true = Spezial-Umarmung.
        LINA:  { name: 'LINA', jump: 1.1, speed: 1.05, dmg: 1.0, airJumps: 1, cuddle: true,
                 hat: 'crown', wings: true,
                 shirt: '#FF9FC9', shirtDk: '#E86FB0', overall: '#C9A0FF', skin: '#FBE0C8', boots: '#FFB3DC' },

        // --- Tier-Figuren (kind steuert die prozedurale Zeichnung in player.js) ---
        // PUPSI das Pupshörnchen: Pups-Flug (fartFly = eingebautes Jetpack) + Rundum-Pups-Blast (fartBlast)
        PUPSI:   { name: 'PUPSI', jump: 1.0, speed: 1.0, dmg: 1.0, airJumps: 0, kind: 'squirrel',
                   fartFly: true, fartBlast: true,
                   shirt: '#C68A52', shirtDk: '#8A5A2C', overall: '#9C6736', skin: '#F0D9B8' },
        // BRUMMEL die Hummel: Dauer-Schwebeflug (hover) + Honig-Klecks
        BRUMMEL: { name: 'BRUMMEL', jump: 1.0, speed: 1.1, dmg: 1.0, airJumps: 0, kind: 'bee',
                   hover: true, honey: true,
                   shirt: '#FFD86B', shirtDk: '#3a3a44', overall: '#E8B23A', skin: '#FFF0C0' },
        // HOPPEL der Hase: Dreifach-Hüpfer + Möhren-Wurf
        HOPPEL:  { name: 'HOPPEL', jump: 1.15, speed: 1.05, dmg: 1.0, airJumps: 2, kind: 'bunny', carrot: true,
                   shirt: '#FFE0EC', shirtDk: '#E8B0C8', overall: '#FF9FC9', skin: '#FFFFFF' },
        // QUAKI der Frosch: Mega-Sprung + Klebezunge (zieht Gegner & Bonbons ran)
        QUAKI:   { name: 'QUAKI', jump: 1.4, speed: 1.0, dmg: 1.0, airJumps: 0, kind: 'frog', tongue: true,
                   shirt: '#7FD06A', shirtDk: '#3E9E3E', overall: '#FFFFFF', skin: '#DFF0C0' }
    }
};