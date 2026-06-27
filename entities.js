class Entity {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.vx = 0; this.vy = 0; this.dead = false; this.state = 'IDLE';
    }
    checkCollision(other) {
        return this.x < other.x + other.w && this.x + this.w > other.x &&
               this.y < other.y + other.h && this.y + this.h > other.y;
    }
}

class Platform extends Entity {
    constructor(x, y, w, h, isSolidGround = false) { 
        super(x, y, w, h); 
        this.isSolidGround = isSolidGround; 
        
        this.isBouncy = false; 
        this.isCrumbling = false;
        this.crumbleTimer = 1.0; 
        this.isHazard = false; 
        this.angle = 0; 

        // Neue Gimmicks
        this.isSpiky = false; 
        this.isMoving = false;
        this.moveRange = 200;
        this.moveSpeed = 2;
        this.startX = x;
        this.startY = y;
        this.isFireTrap = false;
        this.fireTimer = 0;
        this.isCannon = false;      // CLASSIC: Bullet-Bill-Kanone (feuert Geschosse auf den Spieler)
        this.cannonTimer = 0;
        this.shabby = false;        // STORY: schäbiger/verfallener Zombie-Look der Bibliotheks-Elemente
        this.stemLen = 0;           // MUSHROOM: Stiellänge bis zum Boden
    }
    
        update(dt) {
        if (this.bumpTimer > 0) this.bumpTimer -= dt;   // CLASSIC: Anschlag-Hop läuft aus

        if (this.isCrumbling && this.touched) {
            this.crumbleTimer -= dt;
            this.x += (Math.random() - 0.5) * 10;
            if (this.crumbleTimer <= 0) {
                this.y += 1000 * dt; 
            }
        }

        if (this.isMoving) {
            const newY = this.startY + Math.sin(performance.now() / 1000 * this.moveSpeed) * this.moveRange;
            const delta = newY - this.y;
            this.y = newY;
            // Spieler aktiv MITTRAGEN, wenn er auf der Plattform steht — auch nach unten,
            // sonst löst er sich beim Absinken und fällt plötzlich (Stabilitätsproblem).
            const g = window.gameInstance;
            if (g && g.player && !g.player.isDead) {
                const pl = g.player;
                const onTop = pl.x + pl.w > this.x + 4 && pl.x < this.x + this.w - 4
                           && (pl.y + pl.h) > this.y - 26 && (pl.y + pl.h) < this.y + 24
                           && pl.vy >= -1;          // nicht beim Hochspringen
                if (onTop) {
                    pl.y = this.y - pl.h;            // exakt auf die Plattform-Oberkante setzen
                    pl.vy = 0;
                    pl.grounded = true;
                    pl.lastSafePlatform = this;
                }
            }
        }

        // Wölkchen-Plattform: sinkt langsam, wenn der Spieler draufsteht; steigt sonst zurück
        if (this.isCloud) {
            const g = window.gameInstance;
            let standing = false;
            if (g && g.player && !g.player.isDead) {
                const pl = g.player;
                standing = pl.x + pl.w > this.x + 4 && pl.x < this.x + this.w - 4
                        && (pl.y + pl.h) > this.y - 20 && (pl.y + pl.h) < this.y + 26 && pl.vy >= -1;
            }
            const target = standing ? this.startY + 160 : this.startY;
            this.y += (target - this.y) * Math.min(1, dt * (standing ? 2.0 : 1.5));
            if (standing) { const pl = g.player; pl.y = this.y - pl.h; pl.vy = 0; pl.grounded = true; pl.lastSafePlatform = this; }
        }

        if (this.isCannon) {
            this.cannonTimer -= dt;
            const g = window.gameInstance;
            if (g && g.player && !g.player.isDead && this.cannonTimer <= 0) {
                const dx = (g.player.x + g.player.w / 2) - (this.x + this.w / 2);
                const dy = (g.player.y + g.player.h / 2) - (this.y + 16);
                // FAIR: nur feuern, wenn die Kanone im Bild ist (Spieler sieht sie) UND der Spieler
                // ungefähr auf Mündungshöhe ist — verhindert "unsichtbare" Treffer aus anderer Höhe/off-screen.
                const onScreen = g.camera && (this.x + this.w > g.camera.x) && (this.x < g.camera.x + g.logicalWidth);
                if (onScreen && Math.abs(dx) < 1000 && Math.abs(dx) > 150 && Math.abs(dy) < 170) {
                    const dir = dx < 0 ? -1 : 1;
                    g.projectiles.push(new Projectile(this.x + this.w / 2, this.y + 16, dir * 470, 0, true, 'BULLET'));
                    if (g.audio && g.audio.playExplosion) g.audio.playExplosion();
                    this.cannonTimer = 2.0 + Math.random() * 1.6;
                }
            }
        }

        if (this.isFireTrap) {
            this.fireTimer += dt;
            if (Math.floor(this.fireTimer * 2) % 2 === 0 && Math.random() > 0.7) {
                if (window.gameInstance) {
                    // Mächtigere Flammen!
                    for(let i=0; i<3; i++) {
                        window.gameInstance.projectiles.push(new Projectile(this.x + this.w/2 + (Math.random()-0.5)*40, this.y, (Math.random()-0.5)*100, -800 - Math.random()*400, true, 'FLAME'));
                    }
                }
            }
        }
    }

    draw(ctx, camX, camY, levelData, levelIndex) {
        const drawX = this.x - camX, drawY = this.y - camY, now = performance.now() / 1000;

        // CLASSIC-Modus: Plattformen mit eigenem Stil (Röhre, ?-Block, Ziegel, Boden, Treppe)
        if (this.style) { this.drawClassic(ctx, drawX, drawY, now); return; }

        if (this.isCloud) {                                  // flauschiges Wölkchen (begehbar, sinkt)
            const n = Math.max(3, Math.floor(this.w / 55));
            ctx.fillStyle = 'rgba(214,228,255,0.85)';
            ctx.beginPath(); ctx.ellipse(drawX + this.w / 2, drawY + 24, this.w * 0.55, 20, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i <= n; i++) { const cx = drawX + (i / n) * this.w, rr = 22 + (i % 2) * 9; ctx.beginPath(); ctx.arc(cx, drawY + 14, rr, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(drawX, drawY + 8, this.w, 14);
            return;
        }

        if (this.isSpiky) {
            ctx.fillStyle = '#6FBF52';                       // weiche grüne Dornenbüschel
            for(let i=0; i<this.w; i+=40) {
                ctx.beginPath();
                ctx.moveTo(drawX + i, drawY + this.h);
                ctx.lineTo(drawX + i + 20, drawY);
                ctx.lineTo(drawX + i + 40, drawY + this.h);
                ctx.fill();
            }
            ctx.fillStyle = '#FF9FC9';                       // rosa Blütenspitzen (Aua-Kitzel)
            for(let i=20; i<this.w; i+=40) { ctx.beginPath(); ctx.arc(drawX+i, drawY+5, 5, 0, 6.3); ctx.fill(); }
            return;
        }

                if (this.isFireTrap) {
            ctx.fillStyle = '#333';
            ctx.fillRect(drawX, drawY, this.w, this.h);
            ctx.fillStyle = '#666';
            ctx.fillRect(drawX + 10, drawY + 10, this.w - 20, this.h - 20);
            
            // Glüheffekt
            let glow = (Math.sin(performance.now() / 100) + 1) / 2;
            ctx.fillStyle = `rgba(255, 68, 0, ${0.3 + glow * 0.7})`;
            ctx.fillRect(drawX + 15, drawY + 5, this.w - 30, 5);
            return;
        }

        if (this.isBouncy) {
            // Trampolin: dunkler Rahmen + elastische, leuchtende Sprungfläche
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(drawX, drawY + this.h - 10, this.w, 10);
            ctx.fillRect(drawX + 4, drawY + 6, 12, this.h - 6);
            ctx.fillRect(drawX + this.w - 16, drawY + 6, 12, this.h - 6);
            const bt = performance.now() / 140;
            ctx.strokeStyle = '#00FFAA'; ctx.lineWidth = 9;
            ctx.shadowBlur = 18; ctx.shadowColor = '#00FFAA';
            ctx.beginPath();
            ctx.moveTo(drawX + 6, drawY + 8);
            ctx.quadraticCurveTo(drawX + this.w / 2, drawY + 14 + Math.sin(bt) * 4, drawX + this.w - 6, drawY + 8);
            ctx.stroke();
            ctx.shadowBlur = 0;
            return;
        }

                if (this.angle !== 0) {
            ctx.save();
            ctx.translate(drawX, drawY);
            // Optik-Fix: Wir zeichnen ein Polygon, das die Schräge füllt
            ctx.fillStyle = levelData.PLATFORM_GRAD[1];
            ctx.beginPath();
            ctx.moveTo(0, 0);
            let endY = -Math.tan(this.angle) * this.w;
            ctx.lineTo(this.w, endY);
            ctx.lineTo(this.w, endY + this.h);
            ctx.lineTo(0, this.h);
            ctx.closePath();
            ctx.fill();
            
            // Top-Line der Schräge
            ctx.strokeStyle = levelData.PLATFORM_TOP;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.w, endY);
            ctx.stroke();
            
            ctx.restore();
            return;
        }

        if (this.isHazard) {
            ctx.fillStyle = ({1:'#FF2200',2:'#33cc33',3:'#2AA6E0',4:'#FF6A00',5:'#FF2200'})[levelIndex] || '#FF2200';
            ctx.shadowBlur = 20; ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.moveTo(drawX, drawY + 20);
            for(let i=0; i<=this.w; i+=20) {
                ctx.lineTo(drawX + i, drawY + 10 + Math.sin(i*0.1 + now*5)*10);
            }
            ctx.lineTo(drawX + this.w, drawY + this.h);
            ctx.lineTo(drawX, drawY + this.h);
            ctx.fill();
            ctx.shadowBlur = 0;
            return;
        }

        if (this.isCrumbling) {
            ctx.fillStyle = '#4A2B12'; 
            ctx.fillRect(drawX, drawY, this.w, this.h);
            ctx.fillStyle = '#2A1B02';
            for(let i=0; i<this.w; i+=30) ctx.fillRect(drawX + i, drawY, 2, this.h); 
            
            if (this.touched) {
                ctx.fillStyle = '#F00';
                ctx.fillRect(drawX, drawY + this.h, this.w * (this.crumbleTimer/1.0), 5); 
            }
            return;
        }

        const grad = ctx.createLinearGradient(0, drawY, 0, drawY + this.h);
        grad.addColorStop(0, levelData.PLATFORM_GRAD[0]); 
        grad.addColorStop(1, levelData.PLATFORM_GRAD[1]);
        ctx.fillStyle = grad; 
        ctx.fillRect(drawX, drawY, this.w, this.h);
        
        ctx.fillStyle = levelData.PLATFORM_TOP; 
        ctx.fillRect(drawX, drawY, this.w, 24);
        
        if (levelIndex === 1) {
            ctx.fillStyle = '#2b5500';
            for (let i = 0; i < this.w - 15; i += 30) {
                const hDrop = 15 + Math.sin(i * 0.1 + now) * 10;
                ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24); 
                ctx.lineTo(drawX + i + 10, drawY + 24 + hDrop); 
                ctx.lineTo(drawX + i + 20, drawY + 24); ctx.fill();
            }
        } else if (levelIndex === 2) {
            ctx.fillStyle = '#111';
            for (let by = 24; by < this.h; by += 48) ctx.fillRect(drawX, drawY + by, this.w, 4);
            if (this.w > 150) {
                ctx.fillStyle = '#555'; const cx = drawX + this.w/2, cy = drawY + this.h/2;
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(now * 2);
                ctx.fillRect(-20, -5, 40, 10); ctx.fillRect(-5, -20, 10, 40);
                ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#883300'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill(); ctx.restore();
            }
        } else if (levelIndex === 3) {
            // Frost: Schneekante + Eiszapfen
            ctx.fillStyle = '#eef7ff';
            for (let i = 0; i < this.w; i += 26) ctx.fillRect(drawX + i, drawY, 16, 6);
            ctx.fillStyle = '#bfe0f0';
            for (let i = 12; i < this.w; i += 44) { ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24); ctx.lineTo(drawX + i + 5, drawY + 24 + 13); ctx.lineTo(drawX + i + 10, drawY + 24); ctx.fill(); }
        } else if (levelIndex === 4) {
            // Burning City: Beton-Fugen, Risse, rostige Bewehrung
            ctx.fillStyle = '#1c1c22'; for (let by = 24; by < this.h; by += 40) ctx.fillRect(drawX, drawY + by, this.w, 3);
            ctx.fillStyle = '#6a3416'; for (let i = 8; i < this.w; i += 52) ctx.fillRect(drawX + i, drawY + 6, 3, 15);
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
            for (let i = 34; i < this.w; i += 76) { ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24); ctx.lineTo(drawX + i + 16, drawY + this.h * 0.55); ctx.stroke(); }
        } else if (levelIndex === 5) {
            ctx.strokeStyle = '#880000'; ctx.lineWidth = 3 + Math.sin(now * 5) * 1.5;
            for (let i = 20; i < this.w; i += 60) {
                ctx.beginPath(); ctx.moveTo(drawX + i, drawY + 24);
                ctx.bezierCurveTo(drawX + i - 20, drawY + this.h/3, drawX + i + 20, drawY + this.h*0.66, drawX + i, drawY + this.h); ctx.stroke();
            }
        }
    }

    // CLASSIC-Plattform-Rendering im (leicht ranzigen) Super-Mario-Stil
    drawClassic(ctx, x, y, now) {
        const w = this.w, h = this.h;
        if (this.bumpTimer > 0) y += -Math.sin((this.bumpTimer / 0.18) * Math.PI) * 14; // Anschlag-Hop

        // Theme-Palette: over (Tag/orange), under (Untergrund/türkis), castle (Burg/grau)
        const PAL = this.shabby
            // STORY-Variante: weiche Wiese (Erde + Gras) statt morbide
            ? { body: '#C68A52', dark: '#9C6736', stair: '#7FC85A', edge: '#BCEB94', used: '#B5793F', dot: '#8A5A2C' }
            : ({
                over:   { body: '#C68A52', dark: '#9C6736', stair: '#7FC85A', edge: '#BCEB94', used: '#D8A86A', dot: '#7A5230' },
                under:  { body: '#7FB6E0', dark: '#3D6E9C', stair: '#A6D2F0', edge: '#D4ECFF', used: '#5A8FC0', dot: '#2E527A' },
                castle: { body: '#C9A0D8', dark: '#8A5EA0', stair: '#E0BFF0', edge: '#F0DAFF', used: '#A878C0', dot: '#5E3E72' }
              })[this.ctheme || 'over'];
        const G_BODY = PAL.body, G_DARK = PAL.dark, STAIR_BODY = PAL.stair, STAIR_EDGE = PAL.edge;

        if (this.style === 'HIDDEN') return;      // unsichtbar bis von unten ausgelöst (wird dann USED)

        if (this.style === 'USED') {              // ausgelöster Block (leer, solide)
            ctx.fillStyle = PAL.used; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = PAL.dot;
            ctx.fillRect(x + 6, y + 6, 7, 7); ctx.fillRect(x + w - 13, y + 6, 7, 7);
            ctx.fillRect(x + 6, y + h - 13, 7, 7); ctx.fillRect(x + w - 13, y + h - 13, 7, 7);
            return;
        }

        if (this.style === 'CANNON') {            // Bullet-Bill-Kanone (schwarzer Turm + Mündung)
            ctx.fillStyle = '#16161b'; ctx.fillRect(x, y, w, Math.min(h, 600));
            ctx.fillStyle = '#34343e'; ctx.fillRect(x + 3, y, w - 6, 16);              // Mündungsband
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 8, w * 0.30, 9, 0, 0, 7); ctx.fill(); // Mündungsloch
            ctx.fillStyle = '#4a4a56'; ctx.fillRect(x + 6, y + 22, 6, Math.min(h, 600) - 22); // Glanzkante
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, Math.min(h, 600));
            return;
        }

        if (this.style === 'GROUND') {
            // sanfter Wiesenboden: weicher Erd-Verlauf + welliger Grasrand (keine eckigen Klötzchen)
            const grad = ctx.createLinearGradient(0, y, 0, y + Math.min(h, 320));
            grad.addColorStop(0, '#D9A86A'); grad.addColorStop(1, '#9A6638');
            ctx.fillStyle = grad; ctx.fillRect(x, y + 8, w, h);
            this._grunge(ctx, x, y, w, h);
            return;
        }

        if (this.style === 'PIPE') {
            // Mündung (oben, breiter)
            ctx.fillStyle = '#00A800'; ctx.fillRect(x - 4, y, w + 8, 30);
            ctx.fillStyle = '#58D854'; ctx.fillRect(x - 2, y + 2, 12, 26);    // Glanz
            ctx.fillStyle = '#006000'; ctx.fillRect(x + w - 10, y + 2, 8, 26);// Schatten
            ctx.strokeStyle = '#003000'; ctx.lineWidth = 2; ctx.strokeRect(x - 4, y, w + 8, 30);
            // Körper
            ctx.fillStyle = '#00A800'; ctx.fillRect(x + 6, y + 30, w - 12, h);
            ctx.fillStyle = '#58D854'; ctx.fillRect(x + 12, y + 30, 10, h);
            ctx.fillStyle = '#006000'; ctx.fillRect(x + w - 18, y + 30, 10, h);
            return;
        }

        if (this.style === 'STAIR') {
            const dh = Math.min(h, 1600);
            // sanfter Hügel mit abgerundeter Oberkante (statt eckigem Klötzchen)
            const grad = ctx.createLinearGradient(0, y, 0, y + Math.min(dh, 220));
            grad.addColorStop(0, '#D9A86A'); grad.addColorStop(1, '#9A6638');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x, y + 16); ctx.quadraticCurveTo(x, y + 2, x + 16, y + 2);
            ctx.lineTo(x + w - 16, y + 2); ctx.quadraticCurveTo(x + w, y + 2, x + w, y + 16);
            ctx.lineTo(x + w, y + dh); ctx.lineTo(x, y + dh); ctx.closePath(); ctx.fill();
            this._grunge(ctx, x, y, w, dh);
            return;
        }

        if (this.style === 'MUSHROOM') {
            // EIN Element: oranger Stiel (bis zum Boden) + grüne, gerundete Kappe (begehbar).
            const stemLen = this.stemLen || 0;
            const stemW = Math.min(w * 0.30, 56);
            const sx = x + w / 2 - stemW / 2;
            const stemTop = y + h * 0.5;
            ctx.fillStyle = '#cf8a3a'; ctx.fillRect(sx, stemTop, stemW, stemLen);                 // Stiel
            ctx.fillStyle = '#9c5e1e'; ctx.fillRect(sx, stemTop, stemW * 0.30, stemLen);          // Schatten links
            ctx.fillStyle = '#eebb73'; ctx.fillRect(sx + stemW * 0.72, stemTop, stemW * 0.20, stemLen); // Glanz rechts
            ctx.fillStyle = '#7a4a14'; ctx.fillRect(sx, stemTop + stemLen - 6, stemW, 6);         // Fußkante
            // Kappe
            const capR = w / 2;
            ctx.fillStyle = '#1f9e1f';
            ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 14);
            ctx.quadraticCurveTo(x, y - 6, x + 22, y - 6);
            ctx.lineTo(x + w - 22, y - 6);
            ctx.quadraticCurveTo(x + w, y - 6, x + w, y + 14);
            ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#46c846'; ctx.fillRect(x + 6, y - 2, w - 12, 7);                     // heller Grasrand
            ctx.fillStyle = '#0e6b0e'; ctx.fillRect(x, y + h - 6, w, 6);                          // Unterkante Schatten
            ctx.strokeStyle = '#0a4a0a'; ctx.lineWidth = 2; ctx.strokeRect(x, y - 4, w, h + 4);
            if (this.shabby) this._grunge(ctx, x, y, w, h);
            return;
        }

        if (this.style === 'BRICK') {
            // Original-SMB-Ziegel: voller Körper, heller Rand oben/links, dunkler unten/rechts,
            // versetztes 2-reihiges Mauerwerk mit schwarzen Fugen
            ctx.fillStyle = G_BODY; ctx.fillRect(x, y, w, h);
            ctx.fillStyle = PAL.edge; ctx.fillRect(x, y, w, 4); ctx.fillRect(x, y, 4, h);   // Highlight oben/links
            ctx.fillStyle = G_DARK;  ctx.fillRect(x, y + h - 5, w, 5); ctx.fillRect(x + w - 5, y, 5, h); // Schatten
            ctx.fillStyle = '#000';
            ctx.fillRect(x, y + Math.floor(h / 2) - 1, w, 3);                 // mittlere horizontale Fuge
            ctx.fillRect(x + Math.floor(w / 2) - 1, y, 3, Math.floor(h / 2)); // obere Reihe: 1 Stoßfuge mittig
            ctx.fillRect(x + Math.floor(w / 4) - 1, y + Math.floor(h / 2), 3, Math.ceil(h / 2));     // untere Reihe versetzt
            ctx.fillRect(x + Math.floor(3 * w / 4) - 1, y + Math.floor(h / 2), 3, Math.ceil(h / 2));
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            if (this.shabby) this._grunge(ctx, x, y, w, h);
            return;
        }

        if (this.style === 'QUESTION') {
            // Original-SMB-?-Block: solides Gold (kein Durchscheinen), animiertes Blinken zwischen 2 Gold-Tönen
            const blink = (Math.sin(now * 5) > 0.4);
            ctx.fillStyle = blink ? '#FCA800' : '#E59400';
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = '#FFD060'; ctx.fillRect(x, y, w, 4); ctx.fillRect(x, y, 4, h);  // Highlight
            ctx.fillStyle = '#A85000'; ctx.fillRect(x, y + h - 5, w, 5); ctx.fillRect(x + w - 5, y, 5, h); // Schatten
            ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#FFF';                                           // Niet-Ecken
            ctx.fillRect(x + 7, y + 7, 6, 6); ctx.fillRect(x + w - 13, y + 7, 6, 6);
            ctx.fillRect(x + 7, y + h - 13, 6, 6); ctx.fillRect(x + w - 13, y + h - 13, 6, 6);
            // "?" mit Schatten für Tiefe
            ctx.font = `bold ${Math.floor(h * 0.66)}px monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#7C3000'; ctx.fillText('?', x + w / 2 + 2, y + h / 2 + 4);     // Schatten
            ctx.fillStyle = '#FFF';    ctx.fillText('?', x + w / 2, y + h / 2 + 2);
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            return;
        }
    }

    // STORY: süßer Wiesen-Overlay (deterministisch -> kein Flackern): Grasrand + kleine Blümchen
    _grunge(ctx, x, y, w, h) {
        const s = Math.abs((this.x * 0.137) % 1) + 0.05;
        ctx.fillStyle = '#7FC85A';                                       // welliger Grasrand (sanfter Hügel)
        ctx.beginPath(); ctx.moveTo(x, y + 20);
        for (let bx = 0; bx <= w; bx += 22) ctx.lineTo(x + bx, y + 6 + Math.sin((this.x + bx) * 0.035) * 7);
        ctx.lineTo(x + w, y + 20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#A6E085';                                       // hellerer Grasglanz
        ctx.beginPath(); ctx.moveTo(x, y + 12);
        for (let bx = 0; bx <= w; bx += 22) ctx.lineTo(x + bx, y - 1 + Math.sin((this.x + bx) * 0.035 + 1) * 6);
        ctx.lineTo(x + w, y + 12); ctx.closePath(); ctx.fill();
        const petals = ['#FF9FC9', '#FFD36E', '#FFFFFF', '#C9A0FF'];     // Blümchen am Rand
        for (let i = 0; i < 3; i++) {
            const fx = x + ((s * 911 * (i + 1)) % Math.max(10, w - 14)) + 6;
            ctx.fillStyle = petals[(Math.floor(s * 10) + i) % petals.length];
            for (let a = 0; a < 5; a++) { const ang = a * 1.2566; ctx.beginPath(); ctx.arc(fx + Math.cos(ang) * 4, y + 2 + Math.sin(ang) * 4, 2.6, 0, 6.3); ctx.fill(); }
            ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(fx, y + 2, 2.4, 0, 6.3); ctx.fill();   // Blütenmitte
        }
    }
}

class Ladder extends Entity {
    constructor(x, y, w, h) { super(x, y, w, h); }
    draw(ctx, camX, camY, level) {
        const drawX = this.x - camX, drawY = this.y - camY;
        if (level === 1) {
            ctx.fillStyle = '#3E2723'; ctx.fillRect(drawX + this.w/2 - 4, drawY, 8, this.h);
            ctx.fillStyle = '#2b5500';
            for (let ry = 0; ry < this.h; ry += 16) {
                const offX = Math.sin(ry * 0.5 + performance.now()/200) * 12;
                ctx.beginPath(); ctx.arc(drawX + this.w/2 + offX, drawY + ry, 6, 0, Math.PI*2); ctx.fill();
            }
        } else if (level === 5) {
            ctx.strokeStyle = '#4A0808'; ctx.lineWidth = 6;
            for (let ry = 0; ry < this.h; ry += 30) { ctx.beginPath(); ctx.ellipse(drawX + this.w/2, drawY + ry + 15, 12, 8, 0, 0, Math.PI*2); ctx.stroke(); }
        } else {
            // Metall-Leiter (Scrap / Frost / City)
            ctx.fillStyle = '#556677'; ctx.fillRect(drawX, drawY, 12, this.h); ctx.fillRect(drawX + this.w - 12, drawY, 12, this.h);
            for (let ry = 20; ry < this.h; ry += 40) { ctx.fillStyle = '#778899'; ctx.fillRect(drawX + 12, drawY + ry, this.w - 24, 8); }
        }
    }
}

class Collectible extends Entity {
    constructor(x, y, type, w = 80, h = 80) { 
        super(x, y, w, h); 
        this.type = type; 
        this.time = Math.random() * 10; 
        this.startY = y; 
    }
        update(dt) {
        if (this.fallTo != null) {                  // CLASSIC: aus dem Block herausfallen, bis zum Boden
            this.vy = (this.vy || 0) + 2200 * dt;
            this.y += this.vy * dt;
            if (this.y >= this.fallTo) { this.y = this.fallTo; this.startY = this.fallTo; this.fallTo = null; this.vy = 0; }
            return;
        }
        this.time += dt;
        this.y = this.startY + Math.sin(this.time * 4) * 15;
    }
        draw(ctx, camX, camY) {
            const cx = this.x - camX + this.w / 2, cy = this.y - camY + this.h / 2;
        
            ctx.save();
            ctx.translate(cx, cy);
        
            if (Assets && Assets.items && Assets.items[this.type]) {
                // kein per-Frame shadowBlur (teuer bei vielen Items) — der Glow steckt bereits im Sprite
                ctx.drawImage(Assets.items[this.type], 0, 0, 512, 512, -this.w*0.8, -this.h*0.8, this.w*1.6, this.h*1.6);
            } else {
            ctx.fillStyle = '#FF0'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        }
        
        ctx.restore();
    }
}

class Projectile extends Entity {
    constructor(x, y, vx, vy, isEnemy = false, type = 'PISTOL', isBallistic = false) {
        let w = 28, h = 28;                                  // viel größer & plakativer
        if (type === 'ROCKET') { w = 52; h = 40; }           // Riesen-Wattebausch
        if (type === 'GORE') { w = 38; h = 38; }             // Liebes-Pollen
        if (type === 'BULLET') { w = 34; h = 30; }           // Liebes-Herzchen
        if (type === 'FLAME') { w = 46; h = 46; }
        if (type === 'MOLOTOV') { w = 30; h = 38; isBallistic = true; }
        if (type === 'MOLOTOV_FIRE') { w = 100; h = 80; }
        if (type === 'WATER')   { w = 24; h = 28; }          // Wassertropfen
        if (type === 'BUBBLE')  { w = 30; h = 30; }          // Seifenblase
        if (type === 'CANDY')   { w = 30; h = 24; }          // Bonbon
        if (type === 'COTTON')  { w = 34; h = 34; }          // Wattebausch
        if (type === 'STARLET') { w = 30; h = 30; }          // Glitzer-Sternchen

        super(x, y, w, h);
        this.vx = vx; this.vy = vy; this.isEnemy = isEnemy; this.type = type; this.isBallistic = isBallistic;
        this.angle = Math.atan2(vy, vx); 
        
        this.color = '#FFF';
        if (this.type === 'GORE') this.color = '#FF6FA8';            // Liebes-Pollen (pink)
        else if (this.type === 'BULLET') this.color = '#FF6FA8';     // Liebes-Herzchen
        else if (this.type === 'GRENADE') this.color = '#FFD9A0';    // Puddingwerfer (Karamell)
        else if (this.type === 'FLAME' || this.type === 'MOLOTOV_FIRE') this.color = '#BFE3FF'; // Seifenblasen
        else if (this.type === 'WATER')   this.color = '#7FE3FF';
        else if (this.type === 'BUBBLE')  this.color = '#BFF0FF';
        else if (this.type === 'CANDY')   this.color = ['#FF9FC9', '#FFD36E', '#A6E88A', '#C9A0FF', '#7FE3FF'][Math.floor(Math.random() * 5)];
        else if (this.type === 'COTTON')  this.color = '#FFFFFF';
        else if (this.type === 'STARLET') this.color = '#FFE56B';
        else if (CONFIG.COLORS) this.color = isEnemy ? CONFIG.COLORS.PROJECTILE_ENEMY : (type === 'ROCKET' ? CONFIG.COLORS.PROJECTILE_ROCKET : CONFIG.COLORS.PROJECTILE_PLAYER);
        
        this.life = (type === 'FLAME') ? 0.6 : ((type === 'MOLOTOV_FIRE') ? 4.0 : 99); 
    }
    
    update(dt, particles) {
        if (this.isBallistic) {
            this.vy += CONFIG.GRAVITY * 0.6 * dt; 
            this.angle += 10 * dt; 
        } else {
            this.angle = Math.atan2(this.vy, this.vx);
        }

        if (this.type === 'FLAME') { 
            this.vy -= 150 * dt; 
            this.life -= dt; 
        } else if (this.type === 'MOLOTOV_FIRE') {
            this.vx = 0; this.vy = 0; 
            this.life -= dt;
        }

        this.x += this.vx * dt; 
        this.y += this.vy * dt;
        
        if (this.type === 'ROCKET') {
            particles.spawn(this.x, this.y + this.h/2, '#555', 2, 50, 0.5); 
            particles.spawn(this.x, this.y + this.h/2, '#F60', 1, 100, 0.2, true); 
        }
        else if (this.type === 'GORE' && Math.random() > 0.2) {
            particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 1);
        }
        else if (this.type === 'FLAME' && Math.random() > 0.3) {
            particles.spawn(this.x, this.y, '#FFFF00', 1, 50, 0.2, true);
        }
        else if (this.type === 'MOLOTOV_FIRE' && Math.random() > 0.5) {
            particles.spawn(this.x + Math.random()*this.w, this.y + Math.random()*this.h, '#FF4400', 1, 150, 0.4, true); 
        }
        else if (this.type === 'MOLOTOV') {
            particles.spawn(this.x, this.y, '#F60', 1, 20, 0.1, true); 
        }
    }
    
        draw(ctx, camX, camY) {
        const drawX = this.x - camX, drawY = this.y - camY;
        ctx.save(); ctx.translate(drawX + this.w/2, drawY + this.h/2);
        
        if (this.type === 'FLAME' || this.type === 'MOLOTOV_FIRE') {
            const maxL = this.type === 'FLAME' ? 0.6 : 4.0;
            const alpha = Math.max(0, this.life / maxL);
            ctx.globalAlpha = alpha;
            ctx.globalCompositeOperation = 'lighter';      // additiver Feuer-Glow statt teurem shadowBlur
            let pulse = Math.random() * 15;
            ctx.fillStyle = '#F40';
            ctx.beginPath(); ctx.ellipse(0, 0, (this.w + pulse) * alpha, (this.h + pulse) * alpha, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FF0';
            ctx.beginPath(); ctx.ellipse(0, 0, (this.w/2 + pulse) * alpha, (this.h/2 + pulse) * alpha, 0, 0, Math.PI*2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }
        else if (this.type === 'ROCKET') {
            // Riesen-Wattebausch: weiße Puschelwolke mit rosa Kern
            const r = this.h / 2;
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.62, 0, 6.3); ctx.fill(); }
            ctx.fillStyle = '#FFC2E2'; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 6.3); ctx.fill();
            ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.22, r * 0.28, 0, 6.3); ctx.fill();
        }
        else if (this.type === 'BULLET') {
            // dickes Liebes-Herzchen (Gegner), bleibt aufrecht
            const s = this.w;
            ctx.fillStyle = '#FF6FA8';
            ctx.beginPath();
            ctx.arc(-s * 0.24, -s * 0.1, s * 0.3, 0, 6.283); ctx.arc(s * 0.24, -s * 0.1, s * 0.3, 0, 6.283);
            ctx.moveTo(-s * 0.52, 0.02); ctx.lineTo(s * 0.52, 0.02); ctx.lineTo(0, s * 0.66);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-s * 0.18, -s * 0.16, s * 0.1, 0, 6.283); ctx.fill();
        }
        else if (this.type === 'MOLOTOV') {
            ctx.rotate(this.angle);
            ctx.fillStyle = '#004400'; ctx.fillRect(-6, -10, 12, 20);
            ctx.fillStyle = '#FFF'; ctx.fillRect(-4, -15, 8, 5);
        }
        else if (this.type === 'WATER') {                 // Wassertropfen (spitz in Flugrichtung)
            ctx.rotate(this.angle);
            ctx.fillStyle = 'rgba(127,227,255,0.35)'; ctx.beginPath(); ctx.arc(0, 0, this.w * 0.8, 0, 6.283); ctx.fill();
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.moveTo(this.w * 0.75, 0); ctx.quadraticCurveTo(-this.w * 0.2, -this.h * 0.5, -this.w * 0.5, 0); ctx.quadraticCurveTo(-this.w * 0.2, this.h * 0.5, this.w * 0.75, 0); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(-this.w * 0.05, -this.h * 0.12, this.w * 0.16, 0, 6.283); ctx.fill();
        }
        else if (this.type === 'BUBBLE') {                // Seifenblase (transparent, glänzend)
            const r = this.w / 2;
            ctx.fillStyle = 'rgba(191,240,255,0.45)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, 6.283); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.22, 0, 6.283); ctx.fill();
        }
        else if (this.type === 'CANDY') {                 // buntes Bonbon (eingewickelt)
            ctx.rotate(this.angle); const s = this.w;
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.moveTo(s * 0.3, 0); ctx.lineTo(s * 0.6, -s * 0.3); ctx.lineTo(s * 0.6, s * 0.3); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(-s * 0.6, -s * 0.3); ctx.lineTo(-s * 0.6, s * 0.3); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, 0, s * 0.36, s * 0.3, 0, 0, 6.283); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.08, s * 0.1, 0, 6.283); ctx.fill();
        }
        else if (this.type === 'COTTON') {                // weißer Wattebausch
            const r = this.w / 2; ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.5, 0, 6.283); ctx.fill(); }
            ctx.fillStyle = 'rgba(200,225,255,0.5)'; ctx.beginPath(); ctx.arc(r * 0.2, r * 0.2, r * 0.25, 0, 6.283); ctx.fill();
        }
        else if (this.type === 'STARLET') {               // Glitzer-Sternchen (rotiert)
            ctx.rotate(performance.now() / 120 + this.angle);
            ctx.fillStyle = 'rgba(255,229,107,0.4)'; ctx.beginPath(); ctx.arc(0, 0, this.w * 0.7, 0, 6.283); ctx.fill();
            ctx.fillStyle = this.color; const r = this.w * 0.55;
            ctx.beginPath(); for (let k = 0; k < 10; k++) { const aa = -Math.PI / 2 + k * Math.PI / 5, rr = (k % 2 === 0) ? r : r * 0.42; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#FFF6C8'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 6.283); ctx.fill();
        }
        else if (this.isEnemy) {
            // dickes Liebes-Herzchen der Gegner (mit Glow + Glanz)
            const s = this.w;
            ctx.fillStyle = 'rgba(255,111,168,0.3)'; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, 6.283); ctx.fill();
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(-s * 0.26, -s * 0.12, s * 0.32, 0, 6.283); ctx.arc(s * 0.26, -s * 0.12, s * 0.32, 0, 6.283);
            ctx.moveTo(-s * 0.56, 0); ctx.lineTo(s * 0.56, 0); ctx.lineTo(0, s * 0.72);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.18, s * 0.1, 0, 6.283); ctx.fill();
        }
        else {
            // Spieler-Geschoss: dicker Wassertropfen/Wattebausch mit Glow + weißer Kontur
            const r = this.w / 2;
            ctx.fillStyle = 'rgba(127,227,255,0.35)';
            ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.28, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }
}

class Corpse extends Entity {
    constructor(x, y, w, h, state, type, level, facingLeft, vx = 0, vy = 0) { 
        // Wir nehmen eine feste, flache Höhe für die Leichen-Hitbox
        const corpseH = 40;
        super(x, y + h - corpseH, w, corpseH); 
        this.originalH = h; // Merken für das Zeichnen
        this.state = state; 
        this.type = type;
        this.level = level;
        this.facingLeft = facingLeft;
        
        this.vx = vx || (Math.random() - 0.5) * 300;
        this.vy = vy || -200 - Math.random() * 300; 
        
        this.angle = 0;
        this.angularVelocity = (Math.random() - 0.5) * 20; 
        
        this.life = 15.0; 
        this.hasBled = false; 
    }
    
    update(dt, platforms) {
        this.life -= dt;
        
        if (this.state === 'ASH') {
            this.vx += 50 * dt; 
            this.vy += CONFIG.GRAVITY * 0.1 * dt; 
        } else {
            this.vy += CONFIG.GRAVITY * dt; 
            if (Math.abs(this.vy) > 20 || Math.abs(this.vx) > 20) {
                this.angle += this.angularVelocity * dt;
            }
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        for (let plat of platforms) {
            if (this.checkCollision(plat)) {
                if (this.vy > 0 && this.y + this.h - this.vy * dt <= plat.y + 25) {
                    this.y = plat.y - this.h; 
                    
                    if (this.vy > 150) {
                        this.vy *= -0.4; 
                        this.vx *= 0.7; 
                        this.angularVelocity *= 0.6;
                    } else {
                        this.vy = 0;
                        this.vx *= 0.9;
                        this.angularVelocity *= 0.8;
                        
                        // Flach legen: Der Winkel muss 90 Grad (PI/2) sein, damit sie liegen
                        let targetAngle = Math.PI / 2;
                        let currentAngleNormalized = this.angle % (Math.PI * 2);
                        // Je nachdem wie er rotiert ist, legen wir ihn auf den Bauch oder Rücken
                        if (currentAngleNormalized < 0) currentAngleNormalized += Math.PI * 2;
                        
                        if (currentAngleNormalized > Math.PI) targetAngle = Math.PI * 1.5;
                        
                        this.angle += (targetAngle - this.angle) * 10 * dt;
                        if (Math.abs(targetAngle - this.angle) < 0.1) {
                            this.angle = targetAngle;
                            this.angularVelocity = 0;
                        }
                    }

                    if (!this.hasBled && this.state !== 'ASH') {
                        this.hasBled = true;
                        if (window.gameInstance && window.gameInstance.particles) {
                            for(let i=0; i<12; i++) {
                                window.gameInstance.particles.particles.push({
                                    type: 'BLOOD',
                                    x: this.x + Math.random() * this.w, 
                                    y: this.y + this.h - 2, 
                                    vx: (Math.random() - 0.5) * 300, 
                                    vy: -100 - Math.random() * 150,
                                    life: 6,
                                    maxLife: 6,
                                    color: Math.random() > 0.3 ? '#700' : '#A00',
                                    size: Math.random() * 25 + 15, 
                                    glow: false, 
                                    isBlood: true, 
                                    stopped: false 
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    draw(ctx, camX, camY) {
        if (this.life <= 0) return; 
        
        const drawX = this.x - camX, drawY = this.y - camY;
        ctx.globalAlpha = Math.min(1.0, this.life); 
        
        if (this.state === 'ASH') {
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.ellipse(drawX + this.w/2, drawY + this.h - 5, this.w/2, 5, 0, 0, Math.PI*2); ctx.fill();
        } else {
            let spriteObj = Assets && Assets.enemies && Assets.enemies[this.level];
            let spriteToDraw = null;
            if (spriteObj) {
                const map = {
                    'NORMAL': spriteObj.normal, 'RUNNER': spriteObj.runner, 'TANK': spriteObj.tank,
                    'SPITTER': spriteObj.spitter, 'CRAWLER': spriteObj.crawler, 'GIANT': spriteObj.giant,
                    'SOLDIER': spriteObj.soldier, 'SPIDER': spriteObj.spider, 'DEMON': spriteObj.demon,
                    'HELLHOUND': spriteObj.hellhound, 'BLOATER': spriteObj.bloater
                };
                spriteToDraw = map[this.type];
            }

                        if (spriteToDraw) {
                ctx.save();
                ctx.translate(drawX + this.w/2, drawY + this.h/2); 
                if (this.facingLeft) ctx.scale(-1, 1);
                ctx.rotate(this.angle);

                if (this.type === 'GORE_CHUNK') {
                    // Zerfetzter Fleischklumpen Look
                    ctx.fillStyle = '#600';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, this.w*0.5, this.h*0.5, 0, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle = '#900';
                    ctx.beginPath();
                    ctx.ellipse(2, -2, this.w*0.3, this.h*0.3, 0, 0, Math.PI*2);
                    ctx.fill();
                } else {
                    ctx.filter = 'brightness(0.4) sepia(1) saturate(3) hue-rotate(-50deg)';
                    const drawW = this.w * 1.5;
                    const drawH = this.originalH * 1.2;
                    ctx.drawImage(spriteToDraw, 0, 0, 512, 512, -drawW/2, -drawH/2, drawW, drawH);
                    
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = '#400';
                    for(let i=0; i<3; i++) {
                        ctx.beginPath();
                        ctx.arc((Math.random()-0.5)*this.w, (Math.random()-0.5)*this.h, 10+Math.random()*20, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1.0;
    }
}