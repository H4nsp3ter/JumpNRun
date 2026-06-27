window.onload = () => {
    Assets.init();
    const game = new Game();
    game.start();
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'gameCanvas';
            document.body.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d', { alpha: false }); 
        
        this.input = new InputHandler(); 
        this.particles = new ParticleManager(); 
        this.audio = new AudioManager();
        
        this.state = 'MENU'; 
        this.lastTime = 0; 
        this.camera = { x: 0, y: 0 }; 
        this.levelGen = new LevelGenerator();
        this.player = null; 
        this.projectiles = []; 
        this.bgLayers = [];
        this.shakeMag = 0; 
        this.shakeTime = 0; 
        this.deathY = 2000;
                this.level = 1;
        this.difficulty = 'regular';
        this.gameMode = localStorage.getItem('badMarioMode') || 'NORMAL'; // 'NORMAL' = Story, 'CLASSIC' = Super-Mario-Level
        this.classicMode = (this.gameMode === 'CLASSIC');
        this.audioMode = localStorage.getItem('badMarioAudio') || 'METAL';  // 'METAL' = bisher, 'CLASSIC' = 8-Bit-Mario-Sound
        this.character = localStorage.getItem('badMarioChar') || 'LINA';   // LINA (Blumenfee) / MARIO / LUIGI / SONIC / CHUCK
        this.selectedDiff = 'regular';   // im Menü gewählte Schwierigkeit (Start über Hero-Select)
        this.maxUnlockedLevel = parseInt(localStorage.getItem('badMarioUnlockedLevel')) || 1;
        this.maxClassicUnlocked = parseInt(localStorage.getItem('badMarioClassicUnlocked')) || 1; // freigeschaltete Classic-Level (1-1, 1-2, ...)
        this.maxReachedLevel = 1;
        this.transitionTimer = 0; 
        this.levelFlashTimer = 0;
        
        this.savedHighscore = localStorage.getItem('badMarioHighscore') || 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.screenBlood = [];
        // Knuddel-Statistik (für den süßen Level-Abschluss)
        this.levelStats = { kills: 0, shots: 0, hits: 0 };
        this.totalStats = { kills: 0, shots: 0, hits: 0 };
        this.lastStats = null;        // Snapshot für den Level-Clear-Screen
        this._celebTime = 0;          // Animationszeit für Clear-/Sieg-Screen
        
        this.zoom = 1.0; 
        this.logicalWidth = window.innerWidth; 
        this.logicalHeight = window.innerHeight;
        
        this.ui = {
            hpFill: document.getElementById('health-bar-fill'),
            hearts: document.getElementById('hud-hearts'),
            scoreVal: document.getElementById('score-value'),
            coinVal: document.getElementById('coin-value'),
            levelVal: document.getElementById('level-value'),
            weaponVal: document.getElementById('weapon-value'),
            menuOverlay: document.getElementById('menu-overlay'),
            gameOverStats: document.getElementById('game-over-stats'),
            mobileControls: document.getElementById('mobile-controls'),
            startPrompt: document.getElementById('start-screen-prompt'),
            finalLevel: document.getElementById('final-level'),
            finalScore: document.getElementById('final-score'),
            inventoryDiv: document.getElementById('hud-inventory'),
            levelSelection: document.getElementById('level-selection'),
            levelButtons: document.getElementById('level-buttons')
        };
        this.uiCache = { hp: -1, score: -1, coins: -1, level: -1, weapon: '' };

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupEventListeners();
        this.setMode(this.gameMode); // synchronisiert Switch-Optik + Level-Auswahl
        this.setAudioMode(this.audioMode);
        this.setCharacter(this.character);
        this.selectDifficulty(this.selectedDiff);   // 'regular' vorausgewählt
    }

    // Heldin-Auswahl (nur Lina)
    setCharacter(key) {
        if (!CONFIG.CHARACTERS[key]) key = 'LINA';
        this.character = key;
        localStorage.setItem('badMarioChar', key);
        const cards = document.querySelectorAll('#hero-select .hero-card');
        cards.forEach(c => { c.style.borderColor = (c.dataset.char === key) ? '#E86FB0' : ''; });
    }

    // Schwierigkeit im Menü auswählen (Spielstart erst über Hero-Select)
    selectDifficulty(d) {
        this.selectedDiff = d;
        const ids = { princess: 'btn-princess', regular: 'btn-regular', badass: 'btn-badass' };
        for (const k in ids) {
            const b = document.getElementById(ids[k]); if (!b) continue;
            const a = (k === d);
            b.style.outline = a ? '3px solid #FFD700' : 'none';
            b.style.boxShadow = a ? '0 0 16px #FFD700, 3px 3px 0 #000' : '';
            b.style.transform = a ? 'scale(1.06)' : '';
        }
    }

    // Stufenweiser Menü-Assistent: START -> mode -> music -> hero -> level
    showStep(name) {
        ['step-mode', 'step-music', 'hero-select', 'step-level'].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.add('hidden');
        });
        const sp = document.getElementById('start-screen-prompt');
        if (name === 'start' || !name) { if (sp) sp.classList.remove('hidden'); return; }
        if (sp) sp.classList.add('hidden');
        const map = { mode: 'step-mode', music: 'step-music', hero: 'hero-select', level: 'step-level' };
        const el = document.getElementById(map[name]); if (el) el.classList.remove('hidden');
        if (name === 'mode') this.renderModePreviews();
        if (name === 'hero') { this.renderHeroPortraits(); this.setCharacter(this.character); }
        if (name === 'level') { this.updateLevelSelection(); this.selectDifficulty(this.selectedDiff); }
    }
    hideHeroSelect() { this.showStep('start'); }   // Kompatibilität

    // Vorschau-Szenen für die Modus-Auswahl
    renderModePreviews() {
        document.querySelectorAll('#step-mode .mode-card').forEach(card => {
            const cv = card.querySelector('.mode-preview'); if (!cv) return;
            const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; ctx.clearRect(0, 0, W, H);
            if (card.dataset.mode === 'CLASSIC') {
                ctx.fillStyle = '#5C94FC'; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = '#00A800'; ctx.beginPath(); ctx.arc(W * 0.32, H - 24, 40, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#C84C0C'; ctx.fillRect(0, H - 24, W, 24);
                ctx.fillStyle = '#7C2C00'; for (let x = 0; x < W; x += 18) ctx.fillRect(x, H - 24, 2, 24);
                ctx.fillStyle = '#00A800'; ctx.fillRect(W - 60, H - 70, 28, 46); ctx.fillStyle = '#58D854'; ctx.fillRect(W - 58, H - 68, 7, 44);
            } else {
                const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a0808'); g.addColorStop(1, '#0a0204');
                ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = '#5a4a36'; ctx.fillRect(0, H - 24, W, 24);
                ctx.fillStyle = '#241a10'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, H - 24, 2, 24);
                ctx.fillStyle = 'rgba(70,95,35,0.6)'; for (let x = 0; x < W; x += 22) ctx.fillRect(x, H - 24, 10, 4);
                ctx.fillStyle = '#5a7d3a'; ctx.beginPath(); ctx.ellipse(W - 52, H - 40, 13, 18, 0, 0, 7); ctx.fill();  // Zombie
                ctx.fillStyle = '#b00000'; ctx.beginPath(); ctx.arc(W - 56, H - 46, 2.2, 0, 7); ctx.arc(W - 48, H - 46, 2.2, 0, 7); ctx.fill();
            }
            try {
                const pl = new Player(0, 0, this.character); pl.facingRight = true; pl.grounded = true; pl.state = 'IDLE';
                ctx.save(); ctx.translate(W * 0.30, H - 24); ctx.scale(0.34, 0.34); pl.draw(ctx, 40, 145); ctx.restore();
            } catch (e) {}
        });
    }
    renderHeroPortraits() {
        const cards = document.querySelectorAll('#hero-select .hero-card');
        cards.forEach(card => {
            const cv = card.querySelector('.hero-canvas'); if (!cv) return;
            const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
            try {
                const pl = new Player(0, 0, card.dataset.char);
                pl.facingRight = true; pl.grounded = true; pl.state = 'IDLE';
                ctx.save();
                ctx.translate(cv.width / 2, cv.height); ctx.scale(0.82, 0.82); ctx.translate(-cv.width / 2, -cv.height);
                pl.draw(ctx, 40 - cv.width / 2, 157 - cv.height);   // zentriert, Füße am unteren Rand
                ctx.restore();
            } catch (e) {}
        });
    }

    // Sound-Stil umschalten (Heavy Metal vs. klassischer 8-Bit-Mario-Sound)
    setAudioMode(mode) {
        this.audioMode = mode;
        localStorage.setItem('badMarioAudio', mode);
        if (this.audio) this.audio.audioTheme = mode;

        const setBtn = (btn, active) => {
            if (!btn) return;
            btn.style.opacity = active ? '1' : '0.45';
            btn.style.boxShadow = active ? '0 0 15px #0FF' : 'none';
            btn.style.borderColor = active ? '#0FF' : '';
        };
        setBtn(document.getElementById('btn-audio-metal'), mode === 'METAL');
        setBtn(document.getElementById('btn-audio-classic'), mode === 'CLASSIC');

        // Läuft schon Musik? Dann live umschalten.
        if (this.state === 'PLAYING' && this.audio && this.audio.startBGM) {
            this.audio.stopBGM();
            this.audio.startBGM();
        }
    }

    // Story- vs. Classic-Modus umschalten (Switch im Startmenü)
    setMode(mode) {
        this.gameMode = mode;
        this.classicMode = (mode === 'CLASSIC');
        localStorage.setItem('badMarioMode', mode);
        document.body.classList.toggle('classic-mode', this.classicMode); // steuert u.a. die Vignette

        const setBtn = (btn, active) => {
            if (!btn) return;
            btn.style.opacity = active ? '1' : '0.45';
            btn.style.boxShadow = active ? '0 0 15px #FFD700' : 'none';
            btn.style.borderColor = active ? '#FFD700' : '';
        };
        setBtn(document.getElementById('btn-mode-story'), !this.classicMode);
        setBtn(document.getElementById('btn-mode-classic'), this.classicMode);
        document.querySelectorAll('#step-mode .mode-card').forEach(c => { c.style.borderColor = (c.dataset.mode === mode) ? '#FFD700' : ''; });

        this.level = 1;                 // bei Moduswechsel Auswahl zurücksetzen
        this.updateLevelSelection();
    }

    // Level-Auswahl: bereits freigeschaltete Level (Story ODER Classic) direkt anwählbar
    updateLevelSelection() {
        if (!this.ui.levelSelection || !this.ui.levelButtons) return;
        const maxLvl = this.classicMode ? this.maxClassicUnlocked : this.maxUnlockedLevel;

        this.ui.levelSelection.classList.remove('hidden');
        this.ui.levelButtons.innerHTML = '';
        const top = Math.max(1, maxLvl);
        if (this.level > top) this.level = 1;
        for (let i = 1; i <= top; i++) {
            const btn = document.createElement('button');
            btn.className = 'opt-btn lvl-btn';
            btn.innerText = this.classicMode ? (CLASSIC_LABELS[i] || i) : i;
            if (i === this.level) {
                btn.style.backgroundColor = 'rgba(255, 215, 0, 0.4)';
                btn.style.borderColor = '#FFD700';
                btn.style.color = '#FFF';
                btn.style.boxShadow = '0 0 15px #FFD700';
            }
            btn.onclick = () => { this.level = i; this.updateLevelSelection(); };
            this.ui.levelButtons.appendChild(btn);
        }
    }

        setupEventListeners() {
        const launchWithDiff = (diff) => {
            // Nur in Fullscreen gehen, wenn es nicht blockiert wird (z.B. Firefox Gamepad API Restriction)
            try {
                this.requestFullScreen();
            } catch (e) {}
            
            this.audio.init();
            this.startPlay(this.level, diff);
        };

        document.body.addEventListener('click', (e) => {
            const t = e.target;
            // ---- STUFENWEISER MENÜ-ASSISTENT: START -> Modus -> Musik -> Held -> Level ----
            if (t.id === 'btn-start') { this.audio.init(); this.showStep('mode'); return; }
            // Schwierigkeit im Level-Schritt = Auswahl (Start über LOS GEHT'S)
            if (t.id === 'btn-princess') { this.selectDifficulty('princess'); return; }
            if (t.id === 'btn-regular') { this.selectDifficulty('regular'); return; }
            if (t.id === 'btn-badass') { this.selectDifficulty('badass'); return; }
            if (t.id === 'btn-go') { launchWithDiff(this.selectedDiff); return; }
            // Game-Over-Restart startet direkt mit aktuellem Helden
            if (t.id === 'restart-princess') { launchWithDiff('princess'); return; }
            if (t.id === 'restart-regular') { launchWithDiff('regular'); return; }
            if (t.id === 'restart-badass') { launchWithDiff('badass'); return; }
            if (t.id === 'continue-btn') {
                this.requestFullScreen();
                if (this.state === 'GAMEOVER') this.continueGame();
                return;
            }
            // Zurück-Knöpfe im Assistenten
            const back = t.closest && t.closest('.wiz-back');
            if (back) { this.showStep(back.dataset.back); return; }
            // Modus-Karte -> Musik-Schritt
            const modeCard = t.closest && t.closest('.mode-card');
            if (modeCard) { this.setMode(modeCard.dataset.mode); this.showStep('music'); return; }
            // Musik-Karte -> Held-Schritt
            const musicCard = t.closest && t.closest('.music-card');
            if (musicCard) { this.audio.init(); this.setAudioMode(musicCard.dataset.audio); this.showStep('hero'); return; }
            // Helden-Karte -> Level-Schritt
            const card = t.closest && t.closest('.hero-card');
            if (card && card.dataset.char) { this.setCharacter(card.dataset.char); this.showStep('level'); return; }
        });

                const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnPause = document.getElementById('btn-pause');
        
        if (btnZoomIn) { 
            btnZoomIn.addEventListener('touchstart', (e) => { e.preventDefault(); this.zoom = Math.min(3.0, this.zoom + 0.1); }, {passive: false}); 
            btnZoomIn.addEventListener('mousedown', (e) => { e.preventDefault(); this.zoom = Math.min(3.0, this.zoom + 0.1); }); 
        }
        if (btnZoomOut) { 
            btnZoomOut.addEventListener('touchstart', (e) => { e.preventDefault(); this.zoom = Math.max(0.2, this.zoom - 0.1); }, {passive: false}); 
            btnZoomOut.addEventListener('mousedown', (e) => { e.preventDefault(); this.zoom = Math.max(0.2, this.zoom - 0.1); }); 
        }
        if (btnPause) {
            const togglePause = (e) => {
                e.preventDefault();
                if (this.state === 'PLAYING') this.state = 'PAUSED';
                else if (this.state === 'PAUSED') this.state = 'PLAYING';
            };
            btnPause.addEventListener('touchstart', togglePause, {passive: false});
            btnPause.addEventListener('mousedown', togglePause);
        }

                window.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') { 
                if (this.state === 'GAMEOVER' && this.player && this.player.deathTimer > 4.0) this.continueGame(); 
                else if (this.state === 'MENU') launchWithDiff('regular'); 
            }
            if (e.code === 'Escape') {
                if (this.state === 'PLAYING') this.state = 'PAUSED';
                else if (this.state === 'PAUSED') this.state = 'PLAYING';
            }
            if (e.code === 'KeyM') {
                if (this.audio.toggleMute) this.audio.toggleMute();
            }
        });

        // Weiter-Klick/Touch im Level-Clear-/Sieg-Screen
        const contInput = () => { if (this.state === 'LEVELCLEAR' || this.state === 'VICTORY') this._continueReq = true; };
        window.addEventListener('mousedown', contInput);
        window.addEventListener('touchstart', contInput, { passive: true });

        // Eigener Event-Listener für das Gamepad, da simulierte KeyboardEvents oft blockiert werden
        window.addEventListener('gamepadStart', () => {
             if (this.state === 'GAMEOVER' && this.player && this.player.deathTimer > 4.0) this.continueGame(); 
             else if (this.state === 'MENU') launchWithDiff('regular'); 
        });
        
                window.addEventListener('gamepadPause', () => {
             if (this.state === 'PLAYING') this.state = 'PAUSED';
             else if (this.state === 'PAUSED') this.state = 'PLAYING';
        });
    }

    requestFullScreen() {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (req) req.call(el).catch(err => console.log("Fullscreen Error:", err));
    }

        resize() {
            const isPortrait = window.matchMedia("(orientation: portrait)").matches && window.innerWidth <= 950;

            // Touch-Geräte erkennen -> Steuerung erscheint per CSS nur im Spiel (body.in-game.touch)
            const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth <= 950;
            document.body.classList.toggle('touch', isTouch);

            if (isPortrait) {
            this.canvas.width = window.innerHeight;
            this.canvas.height = window.innerWidth;
        } else {
            this.canvas.width = window.innerWidth; 
            this.canvas.height = window.innerHeight;
        }
        this.zoom = this.canvas.width < 850 ? this.canvas.height / 900 : 1.0;
        this.generateParallaxLayers();
    }

    generateParallaxLayers() {
        this.bgLayers = [{ speed: 0.05, elements: [] }, { speed: 0.15, elements: [] }, { speed: 0.3, elements: [] }];
        for (let l = 0; l < 3; l++) { 
            for (let i = 0; i < 40; i++) {
                this.bgLayers[l].elements.push({ 
                    x: Math.random() * 6000, 
                    y: (Math.random() * this.canvas.height * 1.5) - 200, 
                    w: 150 + Math.random() * 400, 
                    h: 300 + Math.random() * 600, 
                    type: Math.floor(Math.random() * 3) 
                }); 
            }
        }
    }

    triggerShake(mag, time) { 
        this.shakeMag = mag; 
        this.shakeTime = time; 
    }

    start() { 
        requestAnimationFrame((t) => this.loop(t)); 
    }

    startPlay(level = 1, diff = 'regular') {
        if(this.ui.menuOverlay) this.ui.menuOverlay.classList.add('hidden');
        if(this.ui.gameOverStats) this.ui.gameOverStats.classList.add('hidden');
        ['step-mode', 'step-music', 'hero-select', 'step-level'].forEach(id => {   // Wizard-Overlays ausblenden
            const el = document.getElementById(id); if (el) el.classList.add('hidden');
        });
        const sp = document.getElementById('start-screen-prompt'); if (sp) sp.classList.remove('hidden'); // für nächstes Mal zurücksetzen
        if(this.ui.mobileControls) this.ui.mobileControls.classList.remove('hidden');

        this.difficulty = diff;
        this.state = 'PLAYING';
        this.level = level;                          // gewähltes Level (Story oder Classic 1-1/1-2)
        this.maxReachedLevel = Math.max(this.maxReachedLevel, this.level);
        this.camera = { x: 0, y: 0 }; 
        this.player = new Player(100, 200, this.character);
        if (this.classicMode) {                 // kompakterer Mario (Super-Mario-Proportionen)
            const s = 0.8;
            this.player.w = Math.round(80 * s);
            this.player.standH = Math.round(140 * s);
            this.player.crouchH = Math.round(80 * s);
            this.player.h = this.player.standH;
        }
        this._bossWasActive = false;
        const wasted = document.querySelector('.wasted-text'); if (wasted) wasted.innerText = 'OHJE!';

        this.levelGen.classicMode = this.classicMode;
        this.levelGen.currentGeneratedLevel = -1; // erzwingt sauberen (Neu-)Aufbau im ersten update()
        this.levelGen.init(0, 500);
        this.projectiles = [];
        this.particles.particles = [];
        this.screenBlood = [];
        this.combo = 0;
        this.comboTimer = 0;
        this.levelStats = { kills: 0, shots: 0, hits: 0 };
        this.totalStats = { kills: 0, shots: 0, hits: 0 };
        this._celebTime = 0;

        this.uiCache = { hp: -1, score: -1, coins: -1, level: -1, weapon: '' };
        this.updateHUD(); 
        
        this.audio.audioTheme = this.audioMode;
        this.audio.startBGM();
        this.transitionTimer = 3.0;
        this.levelFlashTimer = 0; 
        this.lastTime = performance.now();
    }

    continueGame() {
        this.triggerShake(50, 1.0); 
        this.audio.playExplosion();
        this.player.hp = CONFIG.MAX_HP; 
        
        if (this.player.ammo !== Infinity) this.player.ammo += 20;
        
        this.levelGen.currentGeneratedLevel = -1; // Classic-Level beim Weiterspielen neu aufbauen
        this.levelGen.init(0, 500);
        this.player.x = 100;
        this.player.y = 200; 
        this.player.vx = 0; 
        this.player.vy = 0;
        
        this.player.isDead = false;
        this.player.deathTimer = 0;
        this.player.isStar = false;
        this.player.starTimer = 0;

        this.camera.x = 0; 
        this.camera.y = 0; 
        this.deathY = 2000; 
        this.projectiles = [];
        this.screenBlood = [];
        
        this.particles.spawnExplosion(this.player.x, this.player.y, this); 
        this.updateHUD(); 
        this.state = 'PLAYING';
        
        if(this.ui.menuOverlay) this.ui.menuOverlay.classList.add('hidden');
        if(this.ui.mobileControls) this.ui.mobileControls.classList.remove('hidden');
    }

    checkLevelUp() {
        if (this.player.coins % 20 === 0 && this.player.coins > 0) { 
            this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 20); 
            this.particles.spawnLevelUp(this.player.x + this.player.w/2, this.player.y);
            this.audio.playPickup(true); 
        }
        this.updateHUD();
    }

    // CLASSIC: ?-Block/Ziegel von unten anschlagen (oder per Projektil treffen)
    bumpBlock(p) {
        if (!p || p.used || p.style === 'USED') return;
        p.bumpTimer = 0.18;                       // kleiner Anschlag-Hop (siehe Platform)

        if (p.style === 'QUESTION') {
            if (this.audio.playBump) this.audio.playBump();
            this.dispense(p, p.content || 'BEER');
            p.style = 'USED'; p.used = true; p.bumpable = false;
        } else { // BRICK
            if (p.content) {                       // Ziegel mit Inhalt -> gibt Inhalt frei, bleibt als USED stehen
                if (this.audio.playBump) this.audio.playBump();
                this.dispense(p, p.content);
                p.content = null; p.style = 'USED'; p.used = true; p.bumpable = false;
            } else {                               // leerer Ziegel -> zerbricht
                this.particles.spawn(p.x + p.w/2, p.y + p.h/2, '#C84C0C', 18, 350);
                this.particles.spawn(p.x + p.w/2, p.y + p.h/2, '#7C2C00', 10, 300);
                if (this.audio.playBlockBreak) this.audio.playBlockBreak();
                this.triggerShake(4, 0.08);
                this.player.score += 50;
                const idx = this.levelGen.platforms.indexOf(p);
                if (idx >= 0) this.levelGen.platforms.splice(idx, 1);
            }
        }
        this.updateHUD();
    }

    // Inhalt eines Blocks ausgeben: ploppt unten aus dem Block und FÄLLT auf den Boden -> immer aufsammelbar
    dispense(p, type) {
        const it = new Collectible(p.x + p.w/2 - 40, p.y + p.h, type);
        it.startY = it.y;
        it.fallTo = this.levelGen.baseY - it.h;   // landet auf dem Boden
        this.levelGen.items.push(it);
        this.particles.spawn(p.x + p.w/2, p.y, '#FFF', 10, 200);
    }

    handleBossDefeat() {
        this.triggerShake(80, 2.5);
        this.audio.playExplosion();
        this.player.score += 5000;
        this.advanceLevel();
    }

    // Genereller Levelwechsel — durch Boss-Sieg (gerade Level) ODER Ziel-Erreichen (ungerade Level)
    advanceLevel() {
        // Statistik dieses Levels festhalten + zum Gesamtkonto addieren
        this.lastStats = { level: this.level, kills: this.levelStats.kills, shots: this.levelStats.shots, hits: this.levelStats.hits };
        this.totalStats.kills += this.levelStats.kills;
        this.totalStats.shots += this.levelStats.shots;
        this.totalStats.hits += this.levelStats.hits;
        this._celebTime = 0;
        this.shakeTime = 0; this.shakeMag = 0;   // kein Zittern auf dem Clear-/Sieg-Screen (Boss-Shake stoppen)
        const hasNext = this.classicMode ? !!CLASSIC_AVAILABLE[this.level + 1] : (this.level < 4); // 4 süße Welten
        if (hasNext) {
            this.state = 'LEVELCLEAR';                  // süße Statistik anzeigen, dann weiter
            if (this.audio.playLevelClear) this.audio.playLevelClear();
        } else {
            this.state = 'VICTORY';                     // Belohnung: Trällerlied + hüpfende Einhörner
            this.audio.stopBGM();
            if (this.audio.playVictorySong) this.audio.playVictorySong();
            if (this.player.score > this.savedHighscore) { this.savedHighscore = this.player.score; localStorage.setItem('badMarioHighscore', this.savedHighscore); }
        }
        if (this.ui.mobileControls) this.ui.mobileControls.classList.add('hidden');
        this.updateHUD();
    }

    // Vom Level-Clear-Screen weiter ins nächste Level
    _proceedNextLevel() {
        this.transitionTimer = 4.0;
        this.levelFlashTimer = 1.2;
        this.levelStats = { kills: 0, shots: 0, hits: 0 };
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        this.level++;
        if (this.classicMode) {
            if (this.level > this.maxClassicUnlocked) {
                this.maxClassicUnlocked = this.level;
                localStorage.setItem('badMarioClassicUnlocked', this.maxClassicUnlocked);
            }
        } else if (this.level > this.maxUnlockedLevel) {
            this.maxUnlockedLevel = this.level;
            localStorage.setItem('badMarioUnlockedLevel', this.maxUnlockedLevel);
            this.updateLevelSelection();
        }
        this.maxReachedLevel = Math.max(this.maxReachedLevel, this.level);
        this.levelGen.bossSpawned = false;
        this._bossWasActive = false;
        this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 25); // kleine Heilung beim Übergang
        if (this.classicMode) {
            this.player.x = 100; this.player.y = 200; this.player.vx = 0; this.player.vy = 0;
            this.camera.x = 0; this.camera.y = 0; this.deathY = 2000;
            this.projectiles = [];
        }
        if (this.ui.mobileControls) this.ui.mobileControls.classList.remove('hidden');
        this.updateHUD();   // BGM läuft weiter; update() ruft updateBGM je Level auf
    }

    // Vom Sieg-Screen zurück ins Menü
    _victoryToMenu() {
        this.state = 'GAMEOVER';
        const wasted = document.querySelector('.wasted-text'); if (wasted) wasted.innerText = 'GESCHAFFT!';
        if (this.ui.menuOverlay) this.ui.menuOverlay.classList.remove('hidden');
        if (this.ui.gameOverStats) this.ui.gameOverStats.classList.remove('hidden');
        if (this.ui.startPrompt) this.ui.startPrompt.classList.add('hidden');
        if (this.ui.finalLevel) this.ui.finalLevel.innerText = 'ALLE WELTEN GESCHAFFT!';
        if (this.ui.finalScore) this.ui.finalScore.innerText = this.player.score;
        if (this.player) this.player.deathTimer = 999;   // damit "weiter"-Logik nicht eingreift
    }

    triggerGameOver() {
        this.state = 'GAMEOVER';
        this.audio.stopBGM();
        
        if (this.player.score > this.savedHighscore) {
            this.savedHighscore = this.player.score;
            localStorage.setItem('badMarioHighscore', this.savedHighscore);
        }

        if(this.ui.mobileControls) this.ui.mobileControls.classList.add('hidden');
    }

    updateHUD() {
        if (!this.player) return;

        if (this.uiCache.hp !== this.player.hp) {
            if(this.ui.hpFill) this.ui.hpFill.style.width = `${Math.max(0, (this.player.hp / CONFIG.MAX_HP) * 100)}%`;
            if(this.ui.hearts) {
                const total = 5, filled = Math.max(0, Math.min(total, Math.ceil((this.player.hp / CONFIG.MAX_HP) * total)));
                let s = '';
                for (let i = 0; i < total; i++) s += `<span class="heart">${i < filled ? '❤️' : '🤍'}</span>`;
                this.ui.hearts.innerHTML = s;
            }
            this.uiCache.hp = this.player.hp;
        }
        if (this.uiCache.score !== this.player.score) {
            if(this.ui.scoreVal) this.ui.scoreVal.innerText = this.player.score.toString().padStart(6, '0');
            this.uiCache.score = this.player.score;
        }
        if (this.uiCache.coins !== this.player.coins) {
            if(this.ui.coinVal) this.ui.coinVal.innerText = this.player.coins;
            this.uiCache.coins = this.player.coins;
        }
        if (this.uiCache.level !== this.level) {
            if(this.ui.levelVal) this.ui.levelVal.innerText = this.classicMode ? (CLASSIC_LABELS[this.level] || '1-1') : `${this.level}`;
            this.uiCache.level = this.level;
        }
        
                const wMeta = CONFIG.WEAPON_NAMES && CONFIG.WEAPON_NAMES[this.player.weapon];
                const wName = wMeta ? wMeta.name : this.player.weapon;
                const currentWeaponStr = `${wName} [${this.player.ammo === Infinity ? '∞' : this.player.ammo}]`;
        if (this.uiCache.weapon !== currentWeaponStr) {
            if (this.ui.weaponVal) this.ui.weaponVal.innerText = currentWeaponStr;
            this.updateInventoryUI();
            this.uiCache.weapon = currentWeaponStr;
        }
    }

    updateInventoryUI() {
        if (!this.ui.inventoryDiv || !this.player) return;
        const inv = Object.keys(this.player.inventory);
        let html = '';
        
        inv.forEach((wType) => {
            const isCurrent = this.player.weapon === wType;
            const am = this.player.inventory[wType] === Infinity ? '∞' : this.player.inventory[wType];
            
            let bgCol = isCurrent ? 'rgba(255, 159, 201, 0.45)' : 'rgba(80, 50, 70, 0.7)';
            let bCol = isCurrent ? '#FFF' : '#C9A0FF';
            let shadow = isCurrent ? '0 0 15px #FF9FC9' : 'none';
            let textColor = isCurrent ? '#FFF' : '#EEE';
            const wShort = (CONFIG.WEAPON_NAMES[wType] && CONFIG.WEAPON_NAMES[wType].short) || wType.substring(0,3);
            
            html += `<div style="
                width: 70px; height: 70px; 
                background: ${bgCol}; border: 3px solid ${bCol}; 
                display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
                padding-bottom: 5px; border-radius: 5px; box-shadow: ${shadow};
                transition: all 0.2s;
            ">
                <span style="font-size:11px; color:#FFE6FA; margin-bottom:10px; font-weight:bold; text-shadow: 1px 1px 0 #9B6CD0;">${wShort}</span>
                <span style="font-size:16px; font-weight:bold; color:${textColor}; text-shadow: 2px 2px 0 #000;">${am}</span>
            </div>`;
        });
        
        this.ui.inventoryDiv.innerHTML = html;
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000; 
        this.lastTime = timestamp; 
        if (dt > 0.1) dt = 0.1; 
        
        window.gameInstance = this;
        document.body.classList.toggle('in-game', this.state === 'PLAYING' || this.state === 'PAUSED'); // Controls/Zoom nur im Spiel

        if (this.state === 'PLAYING') {
            this.update(dt);
        } else if (this.state === 'GAMEOVER') {
            if (this.shakeTime > 0) this.shakeTime -= dt;
            this.particles.update(dt, this.levelGen.platforms);
            
            for (let c of this.levelGen.corpses) c.update(dt, this.levelGen.platforms);
            
            if (this.player && this.player.isDead) {
                if (typeof this.player.updateDeath === 'function') this.player.updateDeath(dt, this);
                
                this.camera.x += ((this.player.x - this.logicalWidth * 0.4) - this.camera.x) * 2 * dt; 
                this.camera.y += ((this.player.y - this.logicalHeight * 0.55) - this.camera.y) * 2 * dt;
                
                if (this.player.deathTimer > 4.0) {
                    if(this.ui.menuOverlay && this.ui.menuOverlay.classList.contains('hidden')) {
                        this.ui.menuOverlay.classList.remove('hidden');
                        if (this.ui.gameOverStats) this.ui.gameOverStats.classList.remove('hidden');
                        if (this.ui.startPrompt) this.ui.startPrompt.classList.add('hidden'); 
                        
                        if (this.ui.finalLevel) this.ui.finalLevel.innerText = this.level;
                        if (this.ui.finalScore) this.ui.finalScore.innerText = this.player.score + (this.player.score >= this.savedHighscore && this.player.score > 0 ? " (RECORD!)" : "");
                    }
                }
            }
        } else if (this.state === 'LEVELCLEAR' || this.state === 'VICTORY') {
            this._celebTime += dt;
            if (this.shakeTime > 0) this.shakeTime -= dt;   // Restzittern auslaufen lassen
            this.particles.update(dt, this.levelGen.platforms);
            // Herzchen-/Blütenregen
            if (Math.random() < (this.state === 'VICTORY' ? 0.55 : 0.22)) {
                this.particles.spawnBlood(this.camera.x + Math.random() * this.logicalWidth, this.camera.y - 20, 1);
            }
            // Weiter per Leertaste/Enter/Klick (kurze Sperre, damit nichts versehentlich wegklickt)
            if (this._celebTime > 0.7) {
                const go = this.input.isJustPressed('Space') || this.input.isJustPressed('Enter') || this.input.isJustPressed('KeyF') || this._continueReq;
                this._continueReq = false;
                if (go) { if (this.state === 'LEVELCLEAR') this._proceedNextLevel(); else this._victoryToMenu(); }
            }
        }

        this.draw();
        this.input.update();
        if (this.audio.tickSustains) this.audio.tickSustains(); // Dauerfeuer-/Flammen-Loops sauber beenden
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.logicalWidth = this.canvas.width / this.zoom; 
        this.logicalHeight = this.canvas.height / this.zoom;
        
        if (this.shakeTime > 0) this.shakeTime -= dt;
        if (this.transitionTimer > 0) this.transitionTimer -= dt;
        if (this.levelFlashTimer > 0) this.levelFlashTimer -= dt;
        
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        for (let i = this.screenBlood.length - 1; i >= 0; i--) {
            this.screenBlood[i].y += 50 * dt; 
            this.screenBlood[i].alpha -= 0.5 * dt; 
            if (this.screenBlood[i].alpha <= 0) this.screenBlood.splice(i, 1);
        }
        
        // Boss-Thrash läuft, sobald ein Endboss in der Arena ist
        const bossActive = this.levelGen.enemies.some(e => e.isBoss && !e.dead);
        if (bossActive && !this._bossWasActive) this.audio.playRoar(); // Gebrüll beim Auftritt
        this._bossWasActive = bossActive;
        this.audio.updateBGM(this.level, bossActive);
        this.levelGen.update(this.camera.x, this.logicalWidth, this.level, this.difficulty);
        this.particles.update(dt, this.levelGen.platforms);
        
        for (let p of this.levelGen.platforms) {
            if (p.update) p.update(dt);
        }

        let oldHp = this.player.hp;
        this.player.update(dt, this.input, this);
        
        if (this.player.hp < oldHp) {
            // Getroffen von zu viel Liebe -> kurz Herzchen auf dem Bildschirm
            for(let k=0; k<4; k++) {
                this.screenBlood.push({ x: Math.random() * this.logicalWidth, y: Math.random() * this.logicalHeight, size: 12 + Math.random()*16, alpha: 0.8 });
            }
        }
        
        for (let i = 0; i < this.levelGen.corpses.length; i++) {
            this.levelGen.corpses[i].update(dt, this.levelGen.platforms);
        }
        
        this.camera.x += ((this.player.x - this.logicalWidth * 0.4) - this.camera.x) * 5 * dt; 
        if(this.camera.x < 0) this.camera.x = 0;
        this.camera.y += ((this.player.y - this.logicalHeight * 0.55) - this.camera.y) * 4 * dt;
        
        // Lava/Wasser an den BODEN koppeln (nicht an die Kletterhöhe) -> sie steigt nicht mehr
        // mit, wenn man hochklettert, und Runterspringen auf festen Boden tut nicht weh.
        let targetDeathY = this.levelGen.baseY + 550;
        this.deathY += (targetDeathY - this.deathY) * 4 * dt;

        if (this.player.y > this.deathY + 50) {
            this.player.takeDamage(50, this);
            if (this.player.hp > 0) {
                const p = this.player.lastSafePlatform || this.levelGen.platforms[0];
                this.player.x = p.x + p.w/2;
                this.player.y = p.y - this.player.h - 10;
                this.player.vx = 0;
                this.player.vy = 0;
                this.camera.x = Math.max(0, p.x - this.logicalWidth / 2);
                this.camera.y = this.player.y - this.logicalHeight / 2;
                this.deathY = this.levelGen.baseY + 550;
            }
        }
        
        // Level-Ende auf Nicht-Boss-Leveln: Ziel-Flagge erreicht -> nächstes Level
        if (this.levelGen.goalX != null && this.player.x > this.levelGen.goalX) {
            this.levelGen.goalX = null;
            this.audio.playPickup(true);
            this.advanceLevel();
        }

        for (let i = this.levelGen.items.length - 1; i >= 0; i--) {
            let item = this.levelGen.items[i];
            item.update(dt);
            if (this.player.checkCollision(item)) {
                
                // BUGFIX: Nutzt jetzt immer playPickup!
                let isPowerup = ['HEART', 'STAR', 'BOOSTER', 'JETPACK'].includes(item.type);
                this.audio.playPickup(isPowerup);

                if (item.type === 'HEART') { 
                    this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 50); 
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, CONFIG.COLORS.POWERUP_HEART || '#FF0000', 30, 250); 
                } 
                else if (item.type === 'BEER') {
                    this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 8);    // Bier heilt ein wenig
                    this.player.score += 50; this.player.coins += 1;
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, '#8B4513', 15, 150);
                    this.checkLevelUp();
                }
                else if (item.type === 'LIQUOR') {
                    this.player.hp = Math.min(CONFIG.MAX_HP, this.player.hp + 20);   // Schnaps heilt mehr
                    this.player.score += 500; this.player.coins += 1;
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, '#00FFFF', 25, 200);
                    this.checkLevelUp();
                }
                else if (item.type === 'STAR') { 
                    this.player.isStar = true;
                    this.player.starTimer = 10.0;
                    this.particles.spawn(item.x, item.y, '#FFFF00', 50, 400, 1.0, true); 
                }
                else if (item.type === 'BOOSTER') {
                    this.player.isBoosted = true;
                    this.player.boostTimer = 15.0;
                    this.particles.spawn(item.x, item.y, '#00FFCC', 40, 300, 1.0, true);
                }
                else if (item.type === 'JETPACK') {
                    this.player.hasJetpack = true;
                    this.player.jetpackFuel = this.player.jetpackMax;   // Volltank (auch beim Nachgreifen)
                    this.player.jetpackLife = 60;                       // verschwindet nach ~60s wieder
                    this.particles.spawn(item.x, item.y, '#33d6ff', 40, 300, 1.0, true);
                }
                else if (item.type === 'COIN') { 
                    this.player.score += 50; this.player.coins += 1; 
                    this.particles.spawn(item.x + item.w/2, item.y + item.h/2, CONFIG.COLORS.COIN || '#FFD700', 15, 150); 
                    this.checkLevelUp(); 
                } 
                else {
                    if (!this.player.inventory[item.type]) this.player.inventory[item.type] = 0;
                    let ammoAmount = 20;
                    if (item.type === 'UZI') ammoAmount = 50; 
                    else if (item.type === 'ROCKET') ammoAmount = 5; 
                    else if (item.type === 'PISTOL') ammoAmount = 25; 
                    else if (item.type === 'SHOTGUN') ammoAmount = 15; 
                    else if (item.type === 'ASSAULT_RIFLE') ammoAmount = 60; 
                    else if (item.type === 'MINIGUN') ammoAmount = 150; 
                    else if (item.type === 'GRENADE' || item.type === 'MOLOTOV') ammoAmount = 5; 
                    else if (item.type === 'FLAMETHROWER') ammoAmount = 150;
                    
                    this.player.inventory[item.type] += ammoAmount;
                    this.player.weapon = item.type; 
                }
                this.updateHUD(); 
                this.levelGen.items.splice(i, 1);
            }
        }
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i]; 
            proj.update(dt, this.particles);
            
            if (proj.type === 'MOLOTOV_FIRE') {
                if(this.particles.spawnFire) this.particles.spawnFire(proj.x + proj.w/2, proj.y + proj.h, 2, proj.w, 10);
            }
            
            if (proj.life <= 0) {
                if (proj.type === 'MOLOTOV') this.particles.spawnExplosion(proj.x, proj.y, this);
                this.projectiles.splice(i, 1);
                continue;
            }

            if (proj.x < this.camera.x - 500 || proj.x > this.camera.x + this.logicalWidth + 500 || 
                proj.y < this.camera.y - 1500 || proj.y > this.camera.y + this.logicalHeight + 500) { 
                this.projectiles.splice(i, 1); 
                continue; 
            }
            
            let hit = false;
            
            if (!hit && proj.isEnemy && this.player.checkCollision(proj) && !this.player.isStar) { 
                this.player.takeDamage(15, this); 
                hit = true; 
            }
            
                        if (!hit && !proj.isEnemy) {
                for (let j = this.levelGen.enemies.length - 1; j >= 0; j--) {
                    let enemy = this.levelGen.enemies[j];
                    if (!enemy.dead && proj.checkCollision(enemy)) {
                        let damage = 25;
                        if (proj.type === 'FLAME' || proj.type === 'MOLOTOV_FIRE') damage = 15;
                        else if (proj.type === 'ROCKET') damage = 500;

                        // Bosse sind schwer gepanzert: nur Kopftreffer (oberes ~28%) richten vollen Schaden an,
                        // Körpertreffer prallen weitgehend ab -> gezieltes Zielen wird belohnt.
                        if (enemy.isBoss) {
                            const projCy = proj.y + proj.h / 2;
                            if (projCy <= enemy.y + enemy.h * 0.28) {
                                damage *= 3;
                                this.particles.spawn(proj.x, proj.y, '#FFFF00', 8, 320, 0.4, true); // Kopftreffer-Funken
                                this.triggerShake(6, 0.1);
                            } else {
                                damage *= 0.15;
                                this.particles.spawn(proj.x, proj.y, '#AAAAAA', 4, 160, 0.25); // Abpraller am Panzer
                            }
                        }

                        enemy.takeDamage(damage, this, proj.type);
                        
                        if (proj.type !== 'FLAME' && proj.type !== 'MOLOTOV_FIRE') hit = true;
                        break; 
                    }
                }
            }
            
            if (!hit) {
                for (let j = 0; j < this.levelGen.platforms.length; j++) {
                    let p = this.levelGen.platforms[j];
                    if (proj.checkCollision(p)) {
                        hit = true;

                        // CLASSIC: Spielerschüsse öffnen ?-Blöcke / zerstören Ziegel
                        if (!proj.isEnemy && p.bumpable && !p.used) this.bumpBlock(p);

                        if (proj.type === 'MOLOTOV') {
                            this.audio.playExplosion();
                            if(this.particles.spawnFire) this.particles.spawnFire(proj.x, proj.y, 40, 200, 50);
                            proj.type = 'MOLOTOV_FIRE';
                            proj.isBallistic = false;
                            proj.life = 4.0; 
                            proj.w = 200; proj.h = 60; 
                            proj.y = p.y - proj.h; 
                            hit = false; 
                        }
                        else if (!['GRENADE', 'ROCKET', 'FLAME', 'MOLOTOV_FIRE'].includes(proj.type)) {
                            this.particles.spawn(proj.x + proj.w/2, proj.y + proj.h/2, proj.color, 12, 180); 
                        }
                        break; 
                    } 
                }
            }
            
            if (hit) { 
                if ((proj.type === 'ROCKET' && !proj.isEnemy) || proj.type === 'GRENADE') {
                    this.particles.spawnExplosion(proj.x, proj.y, this); 
                }
                this.projectiles.splice(i, 1); 
            }
        }
        
        for (let i = this.levelGen.enemies.length - 1; i >= 0; i--) {
            let enemy = this.levelGen.enemies[i];
            if (enemy.dead) {
                if (enemy.isBoss) this.handleBossDefeat();
                this.levelStats.kills++;   // ein Tierchen vor Glück zerplatzt

                this.combo++;
                this.comboTimer = 2.0;
                this.player.score += this.combo * 10;
                // Kill-Streak: sobald die COMBO-Meldung erscheint (ab x3) lacht der Held böse
                if (this.combo === 3 || (this.combo > 3 && this.combo % 5 === 0)) {
                    if (this.audio.playEvilLaugh) this.audio.playEvilLaugh();
                }

                this.levelGen.enemies.splice(i, 1);
                continue;
            }
            // --- ROUNDHOUSE: gekickter Gegner fliegt im Bogen; zerplatzt NUR bei schnellem
            //     Wandaufprall, sonst landet/rollt er aus und überlebt ---
            if (enemy.kicked) {
                enemy.spin = (enemy.spin || 0) + dt * 18;
                enemy.vy += CONFIG.GRAVITY * dt;
                enemy.x += enemy.vx * dt;
                enemy.y += enemy.vy * dt;
                const speed = Math.hypot(enemy.vx, enemy.vy);
                let splat = false, landed = false;
                for (const plat of this.levelGen.platforms) {
                    if (plat.isHazard || !plat.isSolidGround) continue;
                    if (!enemy.checkCollision(plat)) continue;
                    const onTop = enemy.vy > 0 && (enemy.y + enemy.h - enemy.vy * dt) <= plat.y + 22;
                    if (onTop) {                                  // auf Boden gelandet -> ausrollen
                        enemy.y = plat.y - enemy.h; enemy.vy = 0; enemy.vx *= 0.88; landed = true;
                    } else if (Math.abs(enemy.vx) > 520) {        // schneller Wandtreffer -> zerplatzen
                        splat = true; break;
                    } else {                                      // langsam -> abprallen (überlebt)
                        enemy.vx = -enemy.vx * 0.4; enemy.x += enemy.vx * dt;
                    }
                }
                if (speed > 700) {                                // mäht andere Gegner nur bei Tempo um
                    for (const o of this.levelGen.enemies) {
                        if (o !== enemy && !o.dead && !o.kicked && !o.isBoss && enemy.checkCollision(o) && o.takeDamage) o.takeDamage(1000, this, 'FLAME');
                    }
                }
                if (splat) {
                    this.particles.spawnBlood(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 60);
                    this.triggerShake(14, 0.25);
                    if (this.audio.playSplatter) this.audio.playSplatter();
                    enemy.dead = true; this.player.score += 150;
                    continue;
                }
                if (enemy.x < this.camera.x - 1600 || enemy.x > this.camera.x + this.logicalWidth + 2600 || enemy.y > this.levelGen.baseY + 800) {
                    enemy.dead = true; continue;                  // aus dem Level geflogen
                }
                if (landed && Math.abs(enemy.vx) < 60) {          // ausgerollt -> überlebt, normale KI zurück
                    enemy.kicked = false; enemy.vx = 0; enemy.spin = 0;
                }
                continue;   // normale KI + Spielerkollision überspringen
            }

            enemy.update(dt, this);

            if (!enemy.dead && this.player.checkCollision(enemy)) {
                const aboveNow = this.player.vy > 0 && (this.player.y + this.player.h - this.player.vy * dt) < enemy.y + enemy.h * 0.5;
                if (this.player.isStar) {
                    enemy.takeDamage(1000, this, 'FLAME');
                } else if (enemy.isShellAny && enemy.isShellAny()) {           // Koopa-Panzer
                    if (aboveNow) { enemy.takeDamage(100, this); this.player.vy = -CONFIG.JUMP_FORCE * 0.6; } // drauftreten: ruhend->fahren / fahrend->kaputt
                    else if (enemy.isIdleShell()) { enemy.kick(this.player.x < enemy.x ? 1 : -1, this); }     // ruhenden Panzer seitlich antreten
                    else { this.player.takeDamage(20, this); }                  // fahrender Panzer trifft seitlich -> verletzt (wie im Original)
                } else if (enemy.noStomp) {                                     // Piranha-Pflanze: nicht stampfbar
                    this.player.takeDamage(20, this);
                } else if (aboveNow) {
                    enemy.takeDamage(100, this);
                    this.player.vy = -CONFIG.JUMP_FORCE * (this.player.isBoosted ? 1.2 : 0.8);
                } else {
                    this.player.takeDamage(20, this);
                }
            }
        }

        if (this.player.hp <= 0 && this.state !== 'GAMEOVER') {
            if (typeof this.player.die === 'function') this.player.die(this); 
            this.triggerGameOver(); 
        }
    }

    drawBackground(levelData) {
        const ctx = this.ctx, W = this.logicalWidth, H = this.logicalHeight, theme = levelData.theme || 1;
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, levelData.SKY_TOP);
        gradient.addColorStop(1, levelData.SKY_BOTTOM);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        // weiche Sonne oben rechts
        const sunX = W * 0.82, sunY = H * 0.2;
        ctx.fillStyle = 'rgba(255,224,150,0.30)'; ctx.beginPath(); ctx.arc(sunX, sunY, 82, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(255,245,200,0.95)'; ctx.beginPath(); ctx.arc(sunX, sunY, 52, 0, 6.3); ctx.fill();

        // flauschige Wolke (Parallax)
        const cloud = (cx, cy, s, col) => {
            ctx.fillStyle = col; ctx.beginPath();
            ctx.arc(cx, cy, 24 * s, 0, 6.3); ctx.arc(cx + 30 * s, cy - 6 * s, 30 * s, 0, 6.3); ctx.arc(cx + 64 * s, cy, 24 * s, 0, 6.3);
            ctx.fill(); ctx.fillRect(cx, cy, 64 * s, 22 * s);
        };
        for (let i = 0; i < 6; i++) { let x = (i * 430 - this.camera.x * 0.15) % (W + 600); if (x < -300) x += W + 600; cloud(x, H * 0.16 + (i % 2) * 44, 1.15, 'rgba(255,255,255,0.92)'); }
        for (let i = 0; i < 5; i++) { let x = (i * 560 - this.camera.x * 0.3 + 200) % (W + 600); if (x < -300) x += W + 600; cloud(x, H * 0.33 + (i % 2) * 30, 0.8, 'rgba(255,255,255,0.7)'); }

        // große rollende Hügel, die die Landschaft formen — stark unregelmäßige Höhen, immer hoch & runter
        const hillCol = { 1: '#9BD98A', 2: '#FFB3DC', 3: '#FFFFFF', 4: '#F0B8D0' }[theme] || '#9BD98A';
        const base = H * 1.04;
        const hash = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }; // 0..1, deterministisch (kein Flackern)
        const hill = (cx, r) => { ctx.beginPath(); ctx.arc(cx, base, r, Math.PI, 0); ctx.fill(); };
        // hintere Lage: heller, langsamer, große sanfte Kuppen
        ctx.fillStyle = 'rgba(255,255,255,0.34)';
        const span1 = W + 1800;
        for (let i = 0; i < 7; i++) { let x = (i * 440 - this.camera.x * 0.18 + 180) % span1; if (x < -900) x += span1;
            hill(x + 260, H * 0.3 + hash(i + 1) * H * 0.40); }     // ~0.30..0.70 H
        // vordere Lage: Akzentfarbe, schneller, sehr unterschiedlich hoch (formt die Skyline)
        ctx.fillStyle = hillCol;
        const span2 = W + 1900;
        for (let i = 0; i < 8; i++) { let x = (i * 420 - this.camera.x * 0.40) % span2; if (x < -900) x += span2;
            const r = H * 0.40 + hash(i * 2.7 + 3) * H * 0.55;     // ~0.40..0.95 H -> mal niedrig, mal sehr hoch
            hill(x + 220, r); }
    }

    // Himmelblauer Super-Mario-Hintergrund mit Hügeln, Büschen, Wolken + Schloss
    drawClassicBackground() {
        const ctx = this.ctx, W = this.logicalWidth, camX = this.camera.x;
        const groundY = 600 - this.camera.y;

        // Wasserlevel (2-2): blauer Unterwasser-Verlauf
        if (this.levelGen.waterY != null) {
            const grad = ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
            grad.addColorStop(0, '#1a73b8'); grad.addColorStop(1, '#063556');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, W, this.logicalHeight);
            return;
        }

        // Untergrund-Level (1-2): dunkles Setting, keine Wolken/Hügel
        if (this.levelGen.classicUnder) {
            const grad = ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
            grad.addColorStop(0, '#04161a'); grad.addColorStop(1, '#000');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, W, this.logicalHeight);
            return;
        }

        const night = this.levelGen.classicNight;
        ctx.fillStyle = night ? '#000' : '#5C94FC'; ctx.fillRect(0, 0, W, this.logicalHeight);

        // Wolken (nachts dunkler/bläulich)
        ctx.fillStyle = night ? '#3a3a5a' : '#FFF';
        for (let i = 0; i < 12; i++) {
            let cx = (i * 760 - camX * 0.12) % 5800; if (cx < -200) cx += 5800;
            let cy = 110 + (i % 3) * 75 - this.camera.y * 0.05;
            ctx.beginPath();
            ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.arc(cx + 32, cy, 34, 0, Math.PI * 2);
            ctx.arc(cx + 68, cy, 26, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(cx, cy, 68, 26);
        }

        // Hügel & Büsche (grün, auf der Bodenlinie; nachts dunkler)
        ctx.fillStyle = night ? '#0a5a0a' : '#00A800';
        for (let i = 0; i < 10; i++) {
            let hx = (i * 1100 - camX * 0.3) % 7000; if (hx < -400) hx += 7000;
            ctx.beginPath(); ctx.arc(hx, groundY, 130, Math.PI, 0); ctx.fill();          // Hügel
            ctx.beginPath();
            ctx.arc(hx + 560, groundY - 4, 50, Math.PI, 0);
            ctx.arc(hx + 610, groundY - 4, 64, Math.PI, 0);
            ctx.arc(hx + 665, groundY - 4, 50, Math.PI, 0); ctx.fill();                   // Busch
        }

        this.drawClassicCastle();
    }

    // Unterwasser-Schleier + animierte Oberfläche + Luftblasen (Schwimmlevel)
    drawWater() {
        const ctx = this.ctx, W = this.logicalWidth, H = this.logicalHeight;
        const surfY = this.levelGen.waterY - this.camera.y;
        const top = Math.max(0, surfY);
        ctx.save();
        ctx.fillStyle = 'rgba(30, 110, 200, 0.26)';                 // bläulicher Schleier
        ctx.fillRect(0, top, W, H - top);
        if (surfY > -20 && surfY < H) {                            // animierte Oberfläche
            const t = performance.now() / 360;
            ctx.fillStyle = 'rgba(185, 228, 255, 0.5)';
            ctx.beginPath(); ctx.moveTo(0, surfY);
            for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, surfY + Math.sin(t + x * 0.03) * 6);
            ctx.lineTo(W, surfY + 10); ctx.lineTo(0, surfY + 10); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.22)';                   // aufsteigende Luftblasen
        const now = performance.now();
        for (let i = 0; i < 12; i++) {
            const bx = (i * 167 + now / 28) % W;
            const span = Math.max(60, H - top);
            const by = H - ((now / 22 + i * 97) % span);
            ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    drawClassicCastle() {
        const cx = this.levelGen.castleX;
        if (cx == null) return;
        const ctx = this.ctx, x = cx - this.camera.x, gy = 600 - this.camera.y;
        if (x < -260 || x > this.logicalWidth + 260) return;
        ctx.fillStyle = '#9C4A00'; ctx.fillRect(x, gy - 220, 220, 220);                   // Korpus
        for (let i = 0; i < 5; i++) ctx.fillRect(x + i * 50, gy - 250, 30, 32);           // Zinnen
        ctx.fillStyle = '#7C2C00'; ctx.fillRect(x + 85, gy - 300, 50, 90);               // Mittelturm
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 85 + i * 22, gy - 320, 12, 24);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 88, gy - 95, 44, 95);                   // Tor
        ctx.beginPath(); ctx.arc(x + 110, gy - 95, 22, Math.PI, 0); ctx.fill();
    }

    drawGoal(gx) {
        const ctx = this.ctx, x = gx - this.camera.x, groundY = 600 - this.camera.y, t = performance.now() / 200;
        ctx.fillStyle = 'rgba(255,220,80,0.18)'; ctx.fillRect(x - 26, groundY - 360, 52, 360); // Lichtsäule
        ctx.fillStyle = '#cfcfcf'; ctx.fillRect(x - 4, groundY - 360, 8, 360);                 // Mast
        ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(x, groundY - 360, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#d11100';                                                              // wehende Fahne
        ctx.beginPath(); ctx.moveTo(x + 4, groundY - 352); ctx.lineTo(x + 72 + Math.sin(t)*6, groundY - 332); ctx.lineTo(x + 4, groundY - 300); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = "bold 20px 'Fredoka', sans-serif"; ctx.textAlign = 'center';
        ctx.fillText('ZIEL', x + 30, groundY - 320); ctx.textAlign = 'left';
    }

    draw() {
        this.ctx.save();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.scale(this.zoom, this.zoom); 
        this.ctx.imageSmoothingEnabled = false;
        
        if (this.shakeTime > 0) { 
            this.ctx.translate((Math.random() - 0.5) * this.shakeMag, (Math.random() - 0.5) * this.shakeMag); 
        }
        
        const levelData = this.classicMode ? CONFIG.CLASSIC : CONFIG.LEVELS[this.level];
        if (this.classicMode) this.drawClassicBackground(); else this.drawBackground(levelData);

        const theme = this.classicMode ? 0 : (levelData.theme || 1);
        // Off-Screen-Culling: nur Sichtbares zeichnen (großer Performance-Gewinn bei vielen Elementen)
        const cL = this.camera.x - 120, cR = this.camera.x + this.logicalWidth + 120;
        const vis = (o, pad) => (o.x + (o.w || 0) + (pad || 0)) > cL && (o.x - (pad || 0)) < cR;
        for (let i = 0; i < this.levelGen.ladders.length; i++) { const l = this.levelGen.ladders[i]; if (vis(l)) l.draw(this.ctx, this.camera.x, this.camera.y, theme); }
        for (let i = 0; i < this.levelGen.platforms.length; i++) { const p = this.levelGen.platforms[i]; if (vis(p)) p.draw(this.ctx, this.camera.x, this.camera.y, levelData, theme); }
        if (this.levelGen.goalX != null) this.drawGoal(this.levelGen.goalX);
        for (let i = 0; i < this.levelGen.corpses.length; i++) { const c = this.levelGen.corpses[i]; if (vis(c, 60)) c.draw(this.ctx, this.camera.x, this.camera.y); }
        for (let i = 0; i < this.levelGen.items.length; i++) { const it = this.levelGen.items[i]; if (vis(it, 60)) it.draw(this.ctx, this.camera.x, this.camera.y); }
        for (let i = 0; i < this.levelGen.enemies.length; i++) { const e = this.levelGen.enemies[i]; if (vis(e, 120)) e.draw(this.ctx, this.camera.x, this.camera.y); }
        for (let i = 0; i < this.projectiles.length; i++) { const pr = this.projectiles[i]; if (vis(pr, 60)) pr.draw(this.ctx, this.camera.x, this.camera.y); }
        
        if (this.player) {
            this.player.draw(this.ctx, this.camera.x, this.camera.y);   // Star-Effekt jetzt günstig per Farb-Flash in drawMarioBody
        }

        this.particles.draw(this.ctx, this.camera.x, this.camera.y, this.logicalWidth, this.logicalHeight);

        if (this.levelGen.waterY != null) this.drawWater();   // Unterwasser-Schleier (Schwimmlevel)

        const time = performance.now() / 300;
        const startY = this.deathY - this.camera.y;

        if ((!this.classicMode || this.levelGen.classicTheme === 'castle') && startY < this.logicalHeight) {
            const lavaGrad = this.ctx.createLinearGradient(0, startY, 0, this.logicalHeight);
            lavaGrad.addColorStop(0, levelData.LAVA_TOP); 
            lavaGrad.addColorStop(1, levelData.LAVA_BOTTOM);
            
            this.ctx.fillStyle = lavaGrad;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.logicalHeight);
            this.ctx.lineTo(0, startY);
            for (let x = 0; x <= this.logicalWidth + 60; x += 60) {
                this.ctx.lineTo(x, startY + Math.sin(time + x * 0.03) * 25);
            }
            this.ctx.lineTo(this.logicalWidth, this.logicalHeight);
            this.ctx.fill();

            // Günstiger Glanz statt teurem shadowBlur: additive, helle Lava-Oberkante
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.globalAlpha = 0.5; this.ctx.strokeStyle = levelData.LAVA_TOP; this.ctx.lineWidth = 7;
            this.ctx.beginPath();
            for (let x = 0; x <= this.logicalWidth + 60; x += 60) {
                const yy = startY + Math.sin(time + x * 0.03) * 25;
                if (x === 0) this.ctx.moveTo(x, yy); else this.ctx.lineTo(x, yy);
            }
            this.ctx.stroke();
            this.ctx.globalAlpha = 1; this.ctx.globalCompositeOperation = 'source-over';

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (let x = 0; x <= this.logicalWidth; x += 90) {
                this.ctx.fillRect(x + Math.sin(time)*15, startY + Math.sin(time + x * 0.03) * 25 + 8, 20, 8);
            }
        }
        
        if (this.combo > 1) {
            this.ctx.fillStyle = '#FF6FA8';
            this.ctx.font = `bold ${30 + Math.sin(time*5)*5}px 'Fredoka', sans-serif`;
            this.ctx.fillText(`KNUDDEL x${this.combo}!`, this.player.x - this.camera.x - 20, this.player.y - this.camera.y - 40);
        }

        if (this.state === 'GAMEOVER') {
            let pDeathTime = this.player ? this.player.deathTimer : 0;
            // Sanfter Pastell-Schleier statt Blut-Aufstieg
            this.ctx.fillStyle = `rgba(255, 214, 236, ${Math.min(0.8, pDeathTime / 2.0)})`;
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
            // herabrieselnde Blütenblätter
            const petalCols = ['#FF9FC9', '#FFD36E', '#FFFFFF', '#C9A0FF'];
            for (let i = 0; i < 22; i++) {
                let py = ((time * 90) + i * 90) % (this.logicalHeight + 60) - 30;
                let px = (i * 97 + Math.sin(time + i) * 30) % this.logicalWidth;
                this.ctx.fillStyle = petalCols[i % petalCols.length];
                this.ctx.save(); this.ctx.translate(px, py); this.ctx.rotate(time + i);
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.restore();
            }
        }

        // Herzchen auf dem Bildschirm (kurz nach einem Treffer)
        for (let i = 0; i < this.screenBlood.length; i++) {
            let drop = this.screenBlood[i];
            const s = drop.size;
            this.ctx.fillStyle = `rgba(255, 111, 168, ${drop.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(drop.x - s * 0.4, drop.y, s * 0.45, 0, Math.PI * 2);
            this.ctx.arc(drop.x + s * 0.4, drop.y, s * 0.45, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.moveTo(drop.x - s * 0.82, drop.y + s * 0.18);
            this.ctx.lineTo(drop.x + s * 0.82, drop.y + s * 0.18);
            this.ctx.lineTo(drop.x, drop.y + s * 1.05);
            this.ctx.fill();
        }

        if (this.transitionTimer > 0 && this.state === 'PLAYING') {
            const titleTxt = this.classicMode ? ('WELT ' + (CLASSIC_LABELS[this.level] || '1-1')) : `WELT ${this.level}`;
            const decorTxt = this.classicMode ? ({ under: 'UNTERWELT', castle: 'SCHLOSS', over: 'CLASSIC' }[this.levelGen.classicTheme] || 'CLASSIC') : CONFIG.LEVELS[this.level].DECOR;
            const a = Math.min(1.0, this.transitionTimer / 1.5);
            const W = this.logicalWidth, H = this.logicalHeight, cx = W / 2, cy = H / 2;
            // Weicher Pastell-Intro-Screen
            this.ctx.fillStyle = `rgba(255, 240, 248, ${a * 0.92})`;
            this.ctx.fillRect(0, 0, W, H);
            this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            const titleSize = Math.max(22, Math.min(46, Math.floor(W / 22)));
            this.ctx.font = `${titleSize}px 'Fredoka', sans-serif`;
            this.ctx.fillStyle = `rgba(255,210,232,${a})`;                    // weicher rosa Schatten
            this.ctx.fillText(titleTxt, cx + 4, cy - 30 + 4);
            this.ctx.fillStyle = `rgba(155,108,180,${a})`;                    // lila Titel
            this.ctx.fillText(titleTxt, cx, cy - 30);
            const decorSize = Math.max(12, Math.min(20, Math.floor(W / 52)));
            this.ctx.font = `${decorSize}px 'Fredoka', sans-serif`;
            this.ctx.fillStyle = `rgba(232,111,176,${a})`;                    // Pink
            this.ctx.fillText(decorTxt, cx, cy + 26);
            this.ctx.textAlign = 'left'; this.ctx.textBaseline = 'alphabetic';
        }
        
        if (this.state === 'PAUSED') {
            const W = this.logicalWidth, H = this.logicalHeight;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(0, 0, W, H);
            this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = `${Math.max(20, Math.min(40, Math.floor(W / 26)))}px 'Fredoka', sans-serif`;
            this.ctx.fillText('PAUSED', W / 2, H / 2 - 10);
            this.ctx.fillStyle = '#d82820';
            this.ctx.font = `${Math.max(10, Math.min(16, Math.floor(W / 70)))}px 'Fredoka', sans-serif`;
            this.ctx.fillText('ESC = RESUME', W / 2, H / 2 + 40);
            this.ctx.textAlign = 'left'; this.ctx.textBaseline = 'alphabetic';
        }

        if (this.state === 'LEVELCLEAR') this.drawLevelClear();
        else if (this.state === 'VICTORY') this.drawVictory();

        if (this.levelFlashTimer > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.levelFlashTimer})`;
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        }

        this.ctx.restore();
    }

    // Süße Level-Abschluss-Statistik (mit dezentem Sarkasmus)
    drawLevelClear() {
        const ctx = this.ctx, W = this.logicalWidth, H = this.logicalHeight, t = this._celebTime;
        ctx.fillStyle = 'rgba(255, 240, 248, 0.94)'; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, s = this.lastStats || { level: this.level, kills: 0, shots: 0, hits: 0 };
        const pop = Math.min(1, t * 3);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.translate(cx, H * 0.15); ctx.scale(pop, pop);
        ctx.font = `${Math.max(24, Math.min(46, Math.floor(W / 18)))}px 'Fredoka', sans-serif`;
        ctx.fillStyle = '#FF6FA8'; ctx.fillText('🌸 WELT ' + s.level + ' GESCHAFFT! 🌸', 0, 0);
        ctx.restore();
        this._drawCelebUnicorn(cx, H * 0.36, Math.min(W, H) * 0.42, t, 0);
        const lines = [
            ['Tierchen lieb gehabt', s.kills + ' 💕'],
            ['…davon vor Glück zerplatzt', s.kills + ' 🌼'],
            ['Wattebäuschchen verschossen', s.shots + ' 🫧'],
            ['Selbst zu viel Liebe abbekommen', s.hits + ' 💔'],
        ];
        const py = H * 0.55, lh = Math.max(28, H * 0.07), fs = Math.max(15, Math.min(24, Math.floor(W / 34)));
        ctx.textBaseline = 'middle';
        for (let i = 0; i < lines.length; i++) {
            const yy = py + i * lh;
            ctx.font = `${fs}px 'Fredoka', sans-serif`;
            ctx.textAlign = 'left'; ctx.fillStyle = '#9B6CD0'; ctx.fillText(lines[i][0], cx - W * 0.34, yy);
            ctx.textAlign = 'right'; ctx.fillStyle = '#E86FB0'; ctx.fillText(lines[i][1], cx + W * 0.34, yy);
        }
        const quips = [
            'So viel Liebe halten die einfach nicht aus. 🌚',
            'Wieder ganz viele „zu Tode geknuddelt". Brav! 😇',
            'Die Blumenwiese wächst – aus Gründen. 🌷',
            'Pazifismus sieht anders aus, aber sehr niedlich.',
        ];
        ctx.textAlign = 'center'; ctx.fillStyle = '#7A5AA0';
        ctx.font = `italic ${Math.max(13, fs - 3)}px 'Fredoka', sans-serif`;
        ctx.fillText(quips[s.level % quips.length], cx, py + lines.length * lh + lh * 0.2);
        if (t > 0.7 && Math.sin(t * 5) > -0.2) {
            ctx.fillStyle = '#E86FB0'; ctx.font = `${fs}px 'Fredoka', sans-serif`;
            ctx.fillText('▶ Weiter (Leertaste / Klick)', cx, H * 0.93);
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    // Sieg-Belohnung: Regenbogen, hüpfende Einhörner, Herzchen (+ Trällerlied via Audio)
    drawVictory() {
        const ctx = this.ctx, W = this.logicalWidth, H = this.logicalHeight, t = this._celebTime;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#BFE9FF'); g.addColorStop(0.5, '#FFE9F4'); g.addColorStop(1, '#FFF3C4');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const rb = ['#FF9FC9', '#FFD36E', '#A6E88A', '#7FE3FF', '#C9A0FF'];
        for (let i = 0; i < rb.length; i++) { ctx.strokeStyle = rb[i]; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(W / 2, H * 1.15, W * 0.5 - i * 22, Math.PI, 0); ctx.stroke(); }
        for (let i = 0; i < 3; i++) this._drawCelebUnicorn(W * (0.25 + i * 0.25), H * 0.64, Math.min(W, H) * 0.40, t, i * 0.55);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const pop = 1 + Math.sin(t * 3) * 0.05;
        ctx.save(); ctx.translate(W / 2, H * 0.20); ctx.scale(pop, pop);
        ctx.font = `${Math.max(30, Math.min(58, Math.floor(W / 14)))}px 'Fredoka', sans-serif`;
        ctx.fillStyle = '#fff'; ctx.fillText('🦄 GESCHAFFT! 🦄', 0, 5);
        ctx.fillStyle = '#FF6FA8'; ctx.fillText('🦄 GESCHAFFT! 🦄', 0, 0);
        ctx.restore();
        const st = this.totalStats, fs = Math.max(15, Math.min(24, Math.floor(W / 38)));
        ctx.font = `${fs}px 'Fredoka', sans-serif`; ctx.fillStyle = '#9B6CD0';
        ctx.fillText('Insgesamt ' + st.kills + ' Tierchen vor Glück zerplatzt 🌼', W / 2, H * 0.33);
        ctx.fillStyle = '#7A5AA0'; ctx.font = `italic ${fs - 2}px 'Fredoka', sans-serif`;
        ctx.fillText(st.shots + ' Wattebäuschchen · ' + st.hits + '× selbst zu sehr geliebt · Tralala! 🎵', W / 2, H * 0.39);
        if (t > 0.7 && Math.sin(t * 5) > -0.2) {
            ctx.fillStyle = '#E86FB0'; ctx.font = `${fs}px 'Fredoka', sans-serif`;
            ctx.fillText('▶ Nochmal? (Klick)', W / 2, H * 0.93);
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    _drawCelebUnicorn(cx, cy, size, t, phase) {
        const ctx = this.ctx;
        const hop = Math.abs(Math.sin((t + phase) * 4)) * size * 0.18;
        ctx.save(); ctx.translate(cx, cy - hop);
        const w = size, h = size * 0.8, r = Math.min(w, h);
        const rb = ['#FF9FC9', '#FFD36E', '#A6E88A', '#7FE3FF', '#C9A0FF'];
        ctx.save(); ctx.lineCap = 'round'; ctx.translate(-w * 0.32, 0);
        for (let i = 0; i < 5; i++) { ctx.strokeStyle = rb[i]; ctx.lineWidth = r * 0.045; ctx.beginPath(); ctx.moveTo(0, -8 + i * 4); ctx.quadraticCurveTo(-w * 0.16, i * 5, -w * 0.1, h * 0.3 + i * 3); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = '#F0EAF6'; [-0.2, -0.05, 0.1, 0.25].forEach(lx => ctx.fillRect(lx * w, h * 0.12, w * 0.08, h * 0.26));
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.34, h * 0.3, 0, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w * 0.28, -h * 0.22, w * 0.17, h * 0.15, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#FFD36E'; ctx.beginPath(); ctx.moveTo(w * 0.30, -h * 0.34); ctx.lineTo(w * 0.34, -h * 0.62); ctx.lineTo(w * 0.39, -h * 0.34); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 4; i++) { ctx.fillStyle = rb[i]; ctx.beginPath(); ctx.ellipse(w * 0.16 - i * w * 0.04, -h * 0.2 + i * h * 0.08, w * 0.06, h * 0.1, 0.3, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.arc(w * 0.32, -h * 0.22, r * 0.028, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,170,0.5)'; ctx.beginPath(); ctx.arc(w * 0.37, -h * 0.16, r * 0.03, 0, 6.3); ctx.fill();
        ctx.restore();
    }
}