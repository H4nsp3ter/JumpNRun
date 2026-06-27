// ============================================================================
//  AudioManager — 100% prozedural (Web Audio), KEINE MP3s.
//  Süße "Blümchen-Land"-Sounds: Wasserspritzer, Pops, Glitzer, Küsschen,
//  Glucksen + fröhliche Chiptune-Melodien je Welt. Alle Methodennamen wie
//  zuvor, damit Aufrufer in game/player/enemies unverändert funktionieren.
// ============================================================================
class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sustains = {};        // dauerhafte Loop-Sounds (Sprudel-/Kitzel-Waffen)
        this.lastSfx = {};         // Throttle-Zeitpunkte
        this.isMuted = false;
        this.audioTheme = 'METAL'; // beibehalten (egal welcher Wert -> immer süßer Chiptune)
        this.chipName = '';
        this.chipTimer = null;
        // Kompat-Felder (werden nicht mehr befüllt, da keine MP3s)
        this.bgmBuffers = {};
        this.sfxBuffers = {};
    }

    init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.5;
                this.masterGain.connect(this.ctx.destination);
            } catch (e) { console.error('AudioContext Error:', e); }
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    // ---- kleine Bausteine -------------------------------------------------
    _now() { return this.ctx.currentTime; }
    cleanupNode(node) { if (node) { try { node.stop(); } catch (e) {} try { node.disconnect(); } catch (e) {} } }

    // Eine Ton-"Blip": Frequenz (optional gleitend zu 'to'), Hüllkurve, sanfte Wellenform
    _blip(freq, t, dur, opt = {}) {
        if (!this.ctx || this.isMuted || !freq) return;
        const type = opt.type || 'sine', vol = opt.vol == null ? 0.2 : opt.vol, attack = opt.attack || 0.006;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.masterGain);
        o.start(t); o.stop(t + dur + 0.02);
        setTimeout(() => this.cleanupNode(o), (t - this._now() + dur + 0.1) * 1000);
        // weiches Glöckchen-Obertöne (Oktave) für süßen Glockenspiel-Klang
        if (opt.bell) {
            const o2 = this.ctx.createOscillator(), g2 = this.ctx.createGain();
            o2.type = 'sine'; o2.frequency.setValueAtTime(freq * 2, t);
            g2.gain.setValueAtTime(0.0001, t);
            g2.gain.exponentialRampToValueAtTime(vol * 0.32, t + attack);
            g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
            o2.connect(g2).connect(this.masterGain);
            o2.start(t); o2.stop(t + dur + 0.02);
            setTimeout(() => this.cleanupNode(o2), (t - this._now() + dur + 0.1) * 1000);
        }
    }

    // Weiße-Rausch-Quelle (einmalig, Dauer = dur)
    _noise(dur) {
        const len = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource(); src.buffer = buf; return src;
    }
    _noiseLoop() {
        const len = Math.floor(this.ctx.sampleRate * 1.0);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
    }

    // Kleiner Glitzer-Akkord (aufsteigend), z.B. für Pops/Belohnungen
    _twinkle(t, base = 880, vol = 0.12) {
        [0, 4, 7, 12].forEach((semi, i) => this._blip(base * Math.pow(2, semi / 12), t + i * 0.05, 0.24, { type: 'sine', vol, bell: true }));
    }

    _throttle(name, ms) {
        const now = (this.ctx ? this._now() : 0) * 1000;
        if (this.lastSfx[name] && now - this.lastSfx[name] < ms) return false;
        this.lastSfx[name] = now; return true;
    }

    // ---- SCHUSS-SOUNDS (süß) ----------------------------------------------
    playShoot(weaponType = 'PISTOL') {
        if (!this.ctx || this.isMuted) return;
        const t = this._now();
        switch (weaponType) {
            case 'PISTOL':  this._squirt(0.5); break;                         // Wasserspritzpistole
            case 'SHOTGUN': this._pop(0.6); this._twinkle(t, 660, 0.1); break;// Bonbonkanone
            case 'ROCKET':  this._blip(620, t, 0.35, { type: 'sine', vol: 0.35, to: 180 });   // Riesen-Wattebausch
                            { const n = this._noise(0.3), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
                              f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                              n.connect(f).connect(g).connect(this.masterGain); n.start(t); n.stop(t + 0.3); setTimeout(() => this.cleanupNode(n), 360); } break;
            case 'GRENADE': this._blip(300, t, 0.22, { type: 'sine', vol: 0.3, to: 140 }); break;  // Puddingwerfer "blubb"
            case 'UZI':           this.playLoop('SFX_UZI', 0.4); break;       // Sprudel-Dauerstrom
            case 'ASSAULT_RIFLE': this.playLoop('SFX_AR', 0.42); break;
            case 'MINIGUN':       this.playLoop('SFX_MINIGUN', 0.4); break;   // Glitzer-Schleuder
            default:        this._squirt(0.45);
        }
    }

    // Wasserspritzer: abfallendes Bandpass-Rauschen + kleiner Gleit-Blip
    _squirt(vol = 0.5) {
        const t = this._now();
        const n = this._noise(0.18), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        f.type = 'bandpass'; f.Q.value = 1.4;
        f.frequency.setValueAtTime(2800, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.16);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        n.connect(f).connect(g).connect(this.masterGain); n.start(t); n.stop(t + 0.18);
        this._blip(900, t, 0.12, { type: 'sine', vol: 0.12, to: 1600 });
        setTimeout(() => this.cleanupNode(n), 260);
    }

    // Knuddel-"Pop" (Bonbon/Korken)
    _pop(vol = 0.5) {
        const t = this._now();
        this._blip(700, t, 0.1, { type: 'sine', vol: vol, to: 1500 });
        const n = this._noise(0.05), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        f.type = 'lowpass'; f.frequency.value = 1800; g.gain.setValueAtTime(vol * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        n.connect(f).connect(g).connect(this.masterGain); n.start(t); n.stop(t + 0.05);
        setTimeout(() => this.cleanupNode(n), 120);
    }

    // ---- Dauer-Loops (Sprudel- / Kitzel-Waffen) ---------------------------
    playLoop(name, volume = 0.45) {
        if (!this.ctx || this.isMuted) return;
        let s = this.sustains[name];
        if (!s || !s.nodes) s = this.sustains[name] = { nodes: this._makeSustain(name, volume) };
        s.until = this._now() + 0.13;
    }
    _makeSustain(name, vol) {
        const t = this._now();
        const out = this.ctx.createGain(); out.gain.value = vol; out.connect(this.masterGain);
        if (name === 'SFX_CHAINSAW') {
            // Kitzelfeder: weiches, schnelles Tremolo (kein Motor)
            const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 430;
            const lfo = this.ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 22;
            const lg = this.ctx.createGain(); lg.gain.value = vol * 0.6;
            const base = this.ctx.createGain(); base.gain.value = vol * 0.4;
            lfo.connect(lg).connect(out.gain); o.connect(base).connect(out);
            o.start(t); lfo.start(t);
            return { srcs: [o, lfo], all: [o, lfo, lg, base, out] };
        }
        // Sprudelstrom: gefiltertes Rauschen mit LFO auf der Filterfrequenz (Seifenblasen)
        const src = this._noiseLoop();
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 3;
        const lfo = this.ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = (name === 'SFX_FLAME') ? 7 : 16;
        const lg = this.ctx.createGain(); lg.gain.value = 800;
        lfo.connect(lg).connect(f.frequency);
        src.connect(f).connect(out);
        src.start(t); lfo.start(t);
        return { srcs: [src, lfo], all: [src, lfo, f, lg, out] };
    }
    tickSustains() {
        if (!this.ctx) return;
        const now = this._now();
        for (const name in this.sustains) {
            const s = this.sustains[name];
            if (s && s.nodes && now > s.until) {
                s.nodes.srcs.forEach(o => { try { o.stop(); } catch (e) {} });
                s.nodes.all.forEach(o => { try { o.disconnect(); } catch (e) {} });
                this.sustains[name] = null;
            }
        }
    }
    stopAllSustains() {
        for (const name in this.sustains) {
            const s = this.sustains[name];
            if (s && s.nodes) {
                s.nodes.srcs.forEach(o => { try { o.stop(); } catch (e) {} });
                s.nodes.all.forEach(o => { try { o.disconnect(); } catch (e) {} });
            }
            this.sustains[name] = null;
        }
    }

    playChainsaw() { this.playLoop('SFX_CHAINSAW', 0.4); }     // Kitzelfeder
    playFlamethrower() { this.playLoop('SFX_FLAME', 0.45); }   // Seifenblasen-Bläser

    // ---- Explosion: weiche Pastell-"Poff"-Wolke ---------------------------
    playExplosion() {
        if (!this.ctx || this.isMuted) return;
        const t = this._now();
        const n = this._noise(0.35), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        f.type = 'lowpass'; f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.3);
        g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        n.connect(f).connect(g).connect(this.masterGain); n.start(t); n.stop(t + 0.35);
        this._twinkle(t + 0.02, 523, 0.14);                   // aufsteigender Glitzer
        setTimeout(() => this.cleanupNode(n), 420);
    }

    // ---- Gegner zerplatzt zu Blümchen: fröhliches Pop + Glitzer -----------
    playDeathScream(type) { this.playSplatter(type === 'GIANT' || type === 'DEMON' || type === 'PLAYER'); }
    playSplatter(isHuge = false) {
        if (!this.ctx || this.isMuted) return;
        const t = this._now();
        this._blip(isHuge ? 500 : 760, t, 0.12, { type: 'sine', vol: 0.32, to: isHuge ? 900 : 1500 });
        this._twinkle(t + 0.02, isHuge ? 440 : 660, 0.11);
    }

    // ---- Nahkampf (Kuschelstab): weiches "Pomf" + Glitzer -----------------
    playMeleeHit(weapon) {
        if (!this.ctx || this.isMuted) return;
        const t = this._now();
        this._blip(260, t, 0.14, { type: 'sine', vol: 0.3, to: 150 });
        this._twinkle(t + 0.01, 700, 0.09);
    }
    playSwing() {
        if (!this.ctx || this.isMuted) return;
        const t = this._now();
        const n = this._noise(0.16), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        f.type = 'highpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.14);
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        n.connect(f).connect(g).connect(this.masterGain); n.start(t); n.stop(t + 0.16);
        setTimeout(() => this.cleanupNode(n), 220);
    }

    // ---- ITEMS / Belohnungen ----------------------------------------------
    playPickup(isPowerup = false) {
        if (!this.ctx || this.isMuted) return;
        const t = this._now();
        if (isPowerup) [523, 659, 784, 1047].forEach((f, i) => this._blip(f, t + i * 0.06, 0.3, { type: 'sine', vol: 0.2, bell: true }));
        else { this._blip(1047, t, 0.18, { type: 'sine', vol: 0.18, bell: true }); this._blip(1319, t + 0.07, 0.22, { type: 'sine', vol: 0.18, bell: true }); }
    }
    playWeaponPickup() {
        if (!this.ctx || this.isMuted) return;
        const t = this._now();
        [440, 587, 880].forEach((f, i) => this._blip(f, t + i * 0.05, 0.16, { type: 'triangle', vol: 0.24 }));
    }
    playCoin() { this.playPickup(false); }
    playJump() {
        if (!this.ctx || this.isMuted) return;
        this._blip(280, this._now(), 0.16, { type: 'sine', vol: 0.18, to: 620 });
    }
    playJetpack() {
        if (!this.ctx || this.isMuted || !this._throttle('jetpack', 60)) return;
        const t = this._now();
        const n = this._noise(0.12), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        f.type = 'highpass'; f.frequency.value = 1200; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        n.connect(f).connect(g).connect(this.masterGain); n.start(t); n.stop(t + 0.12);
        setTimeout(() => this.cleanupNode(n), 180);
    }
    playBump() {
        if (!this.ctx || this.isMuted) return;
        this._blip(220, this._now(), 0.09, { type: 'sine', vol: 0.24, to: 130 });
    }
    playBlockBreak() {
        if (!this.ctx || this.isMuted) return;
        this._twinkle(this._now(), 784, 0.14);
    }

    // ---- Charakter/Gegner-Stimmen (süß) -----------------------------------
    playRoar() {   // Boss: freundliches "Tatü" statt Monster-Brüllen
        if (!this.ctx || this.isMuted || !this._throttle('roar', 200)) return;
        const t = this._now();
        this._blip(330, t, 0.18, { type: 'triangle', vol: 0.3 });
        this._blip(262, t + 0.16, 0.26, { type: 'triangle', vol: 0.3 });
    }
    playRoundhouse() {   // Lina Knutsch-Knuddel: Küsschen "mwah" + Herz-Glitzer
        if (!this.ctx || this.isMuted) return;
        const t = this._now();
        this._blip(520, t, 0.12, { type: 'sine', vol: 0.28, to: 300 });
        this._twinkle(t + 0.05, 880, 0.13);
    }
    playEvilLaugh() {   // Kill-Streak: fröhliches Glucksen "hihihi"
        if (!this.ctx || this.isMuted || !this._throttle('giggle', 1200)) return;
        const t = this._now();
        [784, 880, 988, 1047, 1175].forEach((f, i) => this._blip(f, t + i * 0.08, 0.1, { type: 'triangle', vol: 0.16 }));
    }
    playPainScream() {   // Held getroffen: zartes "Auwe" (zwei fallende Töne)
        if (!this.ctx || this.isMuted || !this._throttle('pain', 300)) return;
        const t = this._now();
        this._blip(660, t, 0.12, { type: 'triangle', vol: 0.22 });
        this._blip(494, t + 0.1, 0.16, { type: 'triangle', vol: 0.22 });
    }

    // ======================================================================
    //  BGM — fröhliche Chiptune-Melodien je Welt (Dur), Boss = lebhafter
    // ======================================================================
    chipNote(freq, time, dur, type = 'triangle', vol = 0.16) {
        if (!this.ctx || this.isMuted || !freq) return;
        const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(vol, time + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(g).connect(this.masterGain);
        osc.start(time); osc.stop(time + dur + 0.02);
        setTimeout(() => this.cleanupNode(osc), (time - this._now() + dur + 0.1) * 1000);
    }

    playChiptune(which) {
        if (!this.ctx || this.chipName === which) return;
        this.stopChiptune();
        this.chipName = which;
        const _ = 0;
        // C-Dur/Pentatonik, hüpfig & fröhlich. lead = Melodie, bass = Begleitung.
        const songs = {
            '1': { step: 0.19,   // Blümchen-Land: sonnig
                lead: [523,_,659,_,784,_,659,_, 587,_,659,_,523,_,_,_, 659,_,784,_,880,_,784,_, 659,_,587,_,523,_,_,_],
                bass: [131,_,196,_,165,_,196,_, 147,_,196,_,131,_,196,_] },
            '2': { step: 0.17,   // Bonbon-Land: verspielt
                lead: [659,_,587,659,784,_,880,_, 784,659,587,_,523,_,587,_, 659,_,784,880,988,_,880,_, 784,_,659,_,587,_,_,_],
                bass: [165,_,165,_,147,_,147,_, 131,_,131,_,196,_,196,_] },
            '3': { step: 0.21,   // Wolken-Land: luftig, träumerisch
                lead: [784,_,_,880,_,_,1047,_, 988,_,880,_,784,_,_,_, 659,_,_,784,_,_,880,_, 784,_,659,_,587,_,_,_],
                bass: [196,_,_,165,_,_,220,_, 196,_,_,147,_,_,196,_] },
            '4': { step: 0.18,   // Plüsch-Königreich: warm, schaukelnd
                lead: [440,_,523,_,659,_,523,_, 587,_,523,_,440,_,_,_, 523,_,659,_,698,_,659,_, 587,_,523,_,440,_,_,_],
                bass: [110,_,165,_,131,_,165,_, 147,_,165,_,110,_,165,_] },
            'BOSS': { step: 0.14,   // lieber Endboss: lebhaft, aber fröhlich
                lead: [659,784,659,587,659,784,880,784, 988,880,784,880,988,_,1047,_, 880,784,659,784,880,988,1047,988, 880,_,784,_,659,_,587,_],
                bass: [165,165,_,196,147,147,_,196, 165,165,_,220,196,_,196,_] }
        };
        const song = songs[which] || songs['1'];
        const step = song.step, n = song.lead.length;
        const scheduleBar = () => {
            if (this.chipName !== which || !this.ctx) return;
            const now = this._now();
            for (let i = 0; i < n; i++) {
                const t = now + i * step;
                const ld = song.lead[i % song.lead.length];
                this.chipNote(ld, t, step * 0.9, 'sine', 0.12);                                  // weiche Melodie
                this.chipNote(song.bass[i % song.bass.length], t, step * 0.95, 'sine', 0.15);     // sanfter Bass
                if (ld && i % 4 === 0) this.chipNote(ld * 2, t, step * 0.5, 'sine', 0.05);         // Glöckchen-Schimmer
            }
            this.chipTimer = setTimeout(scheduleBar, n * step * 1000);
        };
        scheduleBar();
    }
    stopChiptune() { if (this.chipTimer) { clearTimeout(this.chipTimer); this.chipTimer = null; } this.chipName = ''; }

    // Kurzer fröhlicher Glockenspiel-Jingle beim Level-Abschluss
    playLevelClear() {
        this.init(); if (!this.ctx || this.isMuted) return;
        const t = this._now();
        [523, 659, 784, 1047, 1319].forEach((f, i) => this._blip(f, t + i * 0.09, 0.32, { type: 'sine', vol: 0.22, bell: true }));
    }

    // Sieg-Belohnung: fröhliches "Trallala"-Lied (Dur), loopt bis zum Verlassen des Sieg-Screens
    playVictorySong() {
        this.init(); if (!this.ctx) return;
        this.stopChiptune(); this.chipName = 'VICTORY';
        const _ = 0;
        const lead = [523, 659, 784, 659, 523, 587, 659, _, 587, 523, 587, 659, 784, _, 1047, _, 784, 880, 1047, 880, 784, 659, _, _, 523, 587, 659, 784, 1047, _, _, _];
        const bass = [131, _, 196, _, 165, _, 196, _, 147, _, 196, _, 131, _, 196, _];
        const step = 0.2, n = lead.length;
        const bar = () => {
            if (this.chipName !== 'VICTORY' || !this.ctx) return;
            const now = this._now();
            for (let i = 0; i < n; i++) {
                const t = now + i * step, ld = lead[i % lead.length];
                this.chipNote(ld, t, step * 0.9, 'sine', 0.14);
                if (ld) this.chipNote(ld * 2, t, step * 0.5, 'sine', 0.05);   // Glöckchen-Schimmer
                this.chipNote(bass[i % bass.length], t, step * 0.95, 'sine', 0.16);
            }
            this.chipTimer = setTimeout(bar, n * step * 1000);
        };
        bar();
    }

    // ---- BGM-Steuerung (immer prozedural) ---------------------------------
    startBGM() { this.init(); this.playChiptune('1'); }
    stopBGM() { this.stopAllSustains(); this.stopChiptune(); }
    updateBGM(level, isBossActive = false) {
        if (!this.ctx) return;
        this.playChiptune(isBossActive ? 'BOSS' : String(((level - 1) % 4) + 1));
    }
    // Kompat-Stubs (früher MP3-Tracks) — jetzt no-op / Chiptune
    playMusicTrack() {}
    playRandomLevelTrack() { this.playChiptune('1'); }
    loadTrack() {}
    playSfx() {}

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) this.masterGain.gain.value = this.isMuted ? 0 : 0.5;
        if (this.isMuted) { this.stopAllSustains(); this.stopChiptune(); }
        return this.isMuted;
    }
}
