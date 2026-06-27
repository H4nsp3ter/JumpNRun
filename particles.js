class ParticleManager {
    constructor() {
        this.particles = [];
    }

    // generische runde Glitzer-/Funken-Partikel
    spawn(x, y, color, count, speed = 100, life = 0.5, glow = false) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * speed;
            this.particles.push({
                type: 'NORMAL',
                x: x, y: y,
                vx: Math.cos(angle) * vel,
                vy: Math.sin(angle) * vel,
                life: life + Math.random() * 0.4,
                maxLife: life,
                color: color,
                size: Math.random() * 10 + 5,
                glow: glow,
                stopped: false
            });
        }
    }

    // Seifenblasen-Bläser (früher Flammenwerfer/Molotov): weiche, steigende Pastell-Blasen
    spawnFire(x, y, count, spreadX, spreadY) {
        const cols = ['#BFE3FF', '#FFD6EC', '#D9FBF0', '#E7DBFF'];
        for (let i = 0; i < count; i++) {
            let pX = x + (Math.random() - 0.5) * spreadX;
            let pY = y + (Math.random() - 0.5) * spreadY;
            this.particles.push({
                type: 'BUBBLE',
                x: pX, y: pY,
                vx: (Math.random() - 0.5) * 60,
                vy: -40 - Math.random() * 120,           // steigt sanft auf
                life: 0.6 + Math.random() * 1.4,
                maxLife: 2.0,
                color: cols[(Math.random() * cols.length) | 0],
                size: Math.random() * 22 + 12,
                stopped: false
            });
        }
    }

    // "Blut" -> Blütenblätter & Herzchen (Name beibehalten, damit ALLE Aufrufer süß werden)
    spawnBlood(x, y, count) {
        const cols = ['#FF9FC9', '#FFD36E', '#FFFFFF', '#C9A0FF', '#9FE8D0', '#FFB3DC'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = 80 + Math.random() * 280;
            this.particles.push({
                type: 'PETAL',
                shape: Math.random() < 0.35 ? 'heart' : 'petal',
                x: x, y: y,
                vx: Math.cos(angle) * vel,
                vy: Math.sin(angle) * vel - 140,         // ploppt erst hoch, rieselt dann runter
                life: 1.0 + Math.random() * 1.3,
                maxLife: 1.7,
                color: cols[(Math.random() * cols.length) | 0],
                size: 7 + Math.random() * 8,
                spin: Math.random() * 6.3,
                spinV: (Math.random() - 0.5) * 7,
                sway: Math.random() * 6.3
            });
        }
    }

    // Großes Blümchen-Plopp, wenn ein Gegner vor Glück zerplatzt
    spawnFlowerBurst(x, y) {
        this.spawnBlood(x, y, 24);
        this.spawn(x, y, '#FFFFFF', 7, 520, 0.5, true);
        this.particles.push({ type: 'SHOCKWAVE', x: x, y: y, size: 8, maxSize: 170, life: 0.4, maxLife: 0.4, ring: '#FFD9EC' });
    }

    // Glitzer-Fünkchen (früher Patronenhülsen) beim Schießen
    spawnCasing(x, y, dirX) {
        this.particles.push({
            type: 'SPARKLE',
            x: x, y: y,
            vx: -dirX * (60 + Math.random() * 90),
            vy: -120 - Math.random() * 120,
            life: 0.7, maxLife: 0.7,
            color: Math.random() < 0.5 ? '#FFFFFF' : '#FFE56B',
            size: 5 + Math.random() * 4,
            spin: Math.random() * 6.3, spinV: (Math.random() - 0.5) * 16
        });
    }

    // Sanfte Pastell-Wolke statt Feuer-Explosion (Riesen-Wattebausch / Bonbon platzt)
    spawnExplosion(x, y, game) {
        this.spawnBlood(x, y, 30);
        this.spawn(x, y, '#FFFFFF', 12, 900, 0.5, true);
        this.spawn(x, y, '#BFE3FF', 10, 700, 0.7, true);
        this.particles.push({ type: 'SHOCKWAVE', x: x, y: y, size: 10, maxSize: 600, life: 0.45, maxLife: 0.45, ring: '#FFFFFF' });

        if (game) {
            game.triggerShake(40, 0.5);
            game.audio.playExplosion();
            for (let e of game.levelGen.enemies) {
                if (!e.dead && Math.hypot(e.x - x, e.y - y) < 600) e.takeDamage(2000, game, 'FLAME');
            }
        }
    }

    spawnLevelUp(x, y) {
        this.spawnBlood(x, y, 16);
        this.spawn(x, y, '#FFFFFF', 8, 700, 1.0, true);
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                type: 'LEVELUP_TEXT',
                x: x, y: y - 50,
                vx: (Math.random() - 0.5) * 150,
                vy: -380 - Math.random() * 180,
                life: 2.2, maxLife: 2.2,
                text: '+❤'
            });
        }
    }

    update(dt, platforms) {
        if (this.particles.length > 550) {
            this.particles.splice(0, this.particles.length - 550);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }

            if (p.type === 'SHOCKWAVE') {
                p.size += (p.maxSize - p.size) * 15 * dt;
                continue;
            }
            if (p.type === 'LEVELUP_TEXT') {
                p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt;
                continue;
            }
            if (p.type === 'BUBBLE') {
                p.x += (p.vx + Math.sin(p.life * 6) * 24) * dt;
                p.y += p.vy * dt; p.vy *= 0.99;
                p.size *= 0.992;
                continue;
            }
            if (p.type === 'SPARKLE') {
                p.vy += CONFIG.GRAVITY * 0.4 * dt;
                p.x += p.vx * dt; p.y += p.vy * dt;
                p.spin += p.spinV * dt;
                continue;
            }
            if (p.type === 'PETAL') {
                p.sway += dt * 4;
                p.x += (p.vx + Math.sin(p.sway) * 45) * dt;
                p.vx *= 0.97;
                p.vy += 240 * dt; if (p.vy > 150) p.vy = 150;   // sanftes Rieseln
                p.y += p.vy * dt;
                p.spin += p.spinV * dt;
                continue;
            }

            // NORMAL (Glitzer/Funken)
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vy += CONFIG.GRAVITY * 0.2 * dt;
            if (p.size) p.size = Math.max(0, p.size * 0.95);
        }
    }

    _heart(ctx, cx, cy, s, col) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx - s * 0.4, cy, s * 0.45, 0, 6.3); ctx.arc(cx + s * 0.4, cy, s * 0.45, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - s * 0.82, cy + s * 0.18); ctx.lineTo(cx + s * 0.82, cy + s * 0.18); ctx.lineTo(cx, cy + s * 1.05); ctx.fill();
    }

    draw(ctx, camX, camY, viewW = Infinity, viewH = Infinity) {
        const m = 120;
        for (let p of this.particles) {
            if (p.type !== 'SHOCKWAVE' && (p.x < camX - m || p.x > camX + viewW + m || p.y < camY - m || p.y > camY + viewH + m)) continue;
            ctx.globalAlpha = Math.min(1, p.life / p.maxLife);
            const dx = p.x - camX, dy = p.y - camY;

            if (p.type === 'SHOCKWAVE') {
                ctx.beginPath();
                ctx.arc(dx, dy, p.size, 0, Math.PI * 2);
                ctx.lineWidth = 14 * ctx.globalAlpha;
                ctx.strokeStyle = p.ring || '#FFF';
                ctx.stroke();
            }
            else if (p.type === 'LEVELUP_TEXT') {
                ctx.fillStyle = '#FF6FA8';
                ctx.font = 'bold 30px monospace';
                ctx.fillText(p.text, dx, dy);
            }
            else if (p.type === 'BUBBLE') {
                ctx.globalAlpha *= 0.55;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(dx, dy, p.size, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = Math.min(1, p.life / p.maxLife);
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath(); ctx.arc(dx - p.size * 0.3, dy - p.size * 0.3, p.size * 0.22, 0, Math.PI * 2); ctx.fill();
            }
            else if (p.type === 'SPARKLE') {
                ctx.save(); ctx.translate(dx, dy); ctx.rotate(p.spin);
                ctx.fillStyle = p.color;
                const s = p.size;
                ctx.beginPath();
                ctx.moveTo(0, -s); ctx.lineTo(s * 0.25, -s * 0.25); ctx.lineTo(s, 0); ctx.lineTo(s * 0.25, s * 0.25);
                ctx.lineTo(0, s); ctx.lineTo(-s * 0.25, s * 0.25); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.25, -s * 0.25);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
            else if (p.type === 'PETAL') {
                if (p.shape === 'heart') {
                    this._heart(ctx, dx, dy, p.size * 0.9, p.color);
                } else {
                    ctx.save(); ctx.translate(dx, dy); ctx.rotate(p.spin);
                    ctx.fillStyle = p.color;
                    ctx.beginPath(); ctx.ellipse(0, 0, p.size * 0.5, p.size * 0.28, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            }
            else {
                // NORMAL: rundes Glitzern (additiv)
                ctx.fillStyle = p.color;
                if (p.glow) ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath(); ctx.arc(dx, dy, p.size, 0, Math.PI * 2); ctx.fill();
                if (p.glow) ctx.globalCompositeOperation = 'source-over';
            }
        }
        ctx.globalAlpha = 1.0;
    }
}
