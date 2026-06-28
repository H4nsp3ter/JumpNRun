class Player extends Entity {
    constructor(x, y, charKey) {
        super(x, y, 80, 140);
        this.standH = 140; this.crouchH = 80;   // Grundhöhen (im Classic-Modus skaliert)
        this.char = (CONFIG.CHARACTERS && CONFIG.CHARACTERS[charKey]) || CONFIG.CHARACTERS.MARIO;
        this.airJumpsLeft = 0;                   // für Doppelsprung (z.B. Sonic)
        this.hp = CONFIG.MAX_HP;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false; this.isClimbing = false; this.facingRight = true;
        this.invincibleTimer = 0; this.shootCooldown = 0; 
        
        this.weapon = 'BAT';
        this.inventory = { 'BAT': Infinity };
        this.score = 0; this.coins = 0;

        this.flashTimer = 0; this.lastSafePlatform = null; this.animTimer = 0;
        
        this.isStar = false; 
        this.starTimer = 0;
        this.isBoosted = false;
        this.boostTimer = 0;
        
        this.isCrouching = false;
        this.isDead = false;
        this.deathTimer = 0;

        // Roundhouse-Kick (nur Chuck)
        this.kickTimer = 0;   // Animations-Dauer
        this.kickDur = 0.32;  // Gesamtdauer der Spezial-Animation (für Fortschritt 0..1)
        this.kickCd = 0;      // Abklingzeit
        // Jetpack-Power-up
        this.hasJetpack = false;
        this.jetpackFuel = 0;
        this.jetpackMax = CONFIG.JETPACK_FUEL;
        this.jetpackActive = false;     // für Antriebs-Sound/Effekt diesen Frame
        this.jetpackLife = 0;           // Sekunden bis das Jetpack wieder verschwindet (~60s)
        // PUPSI: eingebauter Pups-Flug mit begrenztem Vorrat (eigener Treibstoff, kein Item)
        this.fartMax = CONFIG.FART_FUEL;
        this.fartFuel = CONFIG.FART_FUEL;   // startet voll
        this.fartFlying = false;            // diesen Frame im Pups-Flug? (für Sitz-Pose)
        // Schwimmen
        this.inWater = false;
    }

    get ammo() { return this.inventory[this.weapon] || 0; }

    die(game) {
        this.isDead = true;
        this.deathTimer = 0;
        this.vy = -600; 
        this.vx = (this.facingRight ? -1 : 1) * 300; 
        this.isClimbing = false;
        game.audio.playDeathScream('PLAYER');
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 100);
        game.triggerShake(50, 1.5);
    }

    updateDeath(dt, game) {
        this.deathTimer += dt;
        this.vy += CONFIG.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        for (let p of game.levelGen.platforms) {
            if (p.isHazard || (p.isCrumbling && p.crumbleTimer <= 0)) continue;
            if (this.x < p.x + p.w && this.x + this.w > p.x && this.y + this.h > p.y && this.vy > 0) {
                this.y = p.y - this.h;
                this.vy *= -0.5; 
                this.vx *= 0.5;
            }
        }
        if (Math.abs(this.vy) < 10 && Math.random() > 0.5) {
            game.particles.spawnBlood(this.x + this.w/2, this.y + this.h - 10, 1);
        }
    }

    update(dt, input, game) {
        if (this.isDead) return;
        this.animTimer += dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.kickTimer > 0) this.kickTimer -= dt;
        if (this.kickCd > 0) this.kickCd -= dt;
        this.jetpackActive = false;
        this.fartFlying = false;
        // Jetpack verschwindet nach ~60s wieder
        if (this.hasJetpack) {
            this.jetpackLife -= dt;
            if (this.jetpackLife <= 0) {
                this.hasJetpack = false; this.jetpackFuel = 0;
                if (game.particles) game.particles.spawn(this.x + this.w / 2, this.y, '#FFFFFF', 18, 260, 0.6, true);
            }
        }

        // Wasser-Erkennung (Level kann eine Wasseroberfläche waterY definieren)
        const waterY = game.levelGen ? game.levelGen.waterY : null;
        this.inWater = (waterY != null) && (this.y + this.h * 0.5 > waterY);
        
        if (this.isStar) {
            this.starTimer -= dt;
            if (Math.random() > 0.5) game.particles.spawn(this.x + Math.random()*this.w, this.y + Math.random()*this.h, '#FF6600', 1, 50, 0.5, true);
            if (this.starTimer <= 0) this.isStar = false;
        }
        if (this.isBoosted) {
            this.boostTimer -= dt;
            if (this.grounded && Math.random() > 0.7) game.particles.spawn(this.x + this.w/2, this.y + this.h, '#00FFCC', 2, 100, 0.3, true);
            if (this.boostTimer <= 0) this.isBoosted = false;
        }
        
        let moveDirX = 0, moveDirY = 0;
        this.isCrouching = (input.isDown('KeyS') || input.isDown('ArrowDown')) && this.grounded && !this.isClimbing;
        if (!this.isCrouching) {
            if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveDirX = 1;
            if (input.isDown('KeyA') || input.isDown('ArrowLeft')) moveDirX = -1;
        }
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveDirY = -1;
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveDirY = 1;
        
        let activeLadder = null;
        for(let l of game.levelGen.ladders) { if (this.checkCollision(l)) { activeLadder = l; break; } }
        if (activeLadder && (moveDirY !== 0 || this.isClimbing)) {
            this.isClimbing = true; this.grounded = false; this.isCrouching = false;
            if(moveDirX === 0) this.x += (((activeLadder.x + activeLadder.w/2) - (this.w/2)) - this.x) * 10 * dt;
        } else { this.isClimbing = false; }
        
        let currentSpeed = (this.isStar ? CONFIG.PLAYER_SPEED * 1.5 : CONFIG.PLAYER_SPEED) * this.char.speed;
        if (this.weapon === 'MINIGUN' && this.shootCooldown > 0) currentSpeed *= 0.1;
        if (this.weapon === 'FLAMETHROWER' && this.shootCooldown > 0) currentSpeed *= 0.5;
        if (this.hp < (CONFIG.MAX_HP * 0.3) && !this.isStar) {
            currentSpeed *= 0.6;
            if (Math.random() < 0.2 && (moveDirX !== 0 || !this.grounded)) game.particles.spawnBlood(this.x + this.w/2, this.y + this.h - 5, 3);
        }
        
        if (this.isClimbing) {
            this.vy = moveDirY * CONFIG.CLIMB_SPEED; this.vx = moveDirX * currentSpeed * 0.5;
            if (input.isJustPressed('Space')) { this.isClimbing = false; this.vy = -CONFIG.JUMP_FORCE; game.audio.playJump(); }
        } else {
            const moveCap = this.inWater ? currentSpeed * CONFIG.SWIM_SPEED_MUL : currentSpeed;
            if (moveDirX !== 0) {
                this.facingRight = moveDirX === 1;
                this.vx += moveDirX * CONFIG.PLAYER_ACCEL * dt;
                if (Math.abs(this.vx) > moveCap) this.vx = Math.sign(this.vx) * moveCap;
            } else {
                const fr = this.inWater ? CONFIG.PLAYER_FRICTION * 1.7 : CONFIG.PLAYER_FRICTION;
                if (this.vx > 0) { this.vx -= fr * dt; if (this.vx < 0) this.vx = 0; }
                else if (this.vx < 0) { this.vx += fr * dt; if (this.vx > 0) this.vx = 0; }
            }

            if (this.inWater) {
                // --- Schwimmen: sanftes Sinken, Sprungtaste = Schwimmzug nach oben ---
                this.vy += CONFIG.SWIM_GRAVITY * dt;
                if (this.vy > CONFIG.SWIM_MAX_SINK) this.vy = CONFIG.SWIM_MAX_SINK;
                if (input.isJustPressed('Space')) {
                    this.vy = -CONFIG.SWIM_STROKE; game.audio.playJump();
                    game.particles.spawn(this.x + this.w/2, this.y + this.h, '#9fdcff', 8, 130, 0.4, true);
                }
                if (moveDirY < 0) this.vy -= CONFIG.SWIM_STROKE * 1.4 * dt;     // Hoch-Taste: stetig auftauchen
                if (this.vy < -CONFIG.SWIM_MAX_RISE) this.vy = -CONFIG.SWIM_MAX_RISE;
            } else {
                // --- normale Schwerkraft + Sprung ---
                this.vy += CONFIG.GRAVITY * dt;
                let maxFall = CONFIG.MAX_FALL_SPEED;
                if (this.char.hover && this.vy > 150) maxFall = 150;        // BRUMMEL: sanftes Gleiten
                if (this.vy > maxFall) this.vy = maxFall;
                const jForce = CONFIG.JUMP_FORCE * this.char.jump * (this.isBoosted ? 1.5 : 1);
                // Flug: Item-Jetpack ODER eingebaut (PUPSI Pups-Flug / BRUMMEL Schweben)
                const canFly = (this.hasJetpack && this.jetpackFuel > 0) || (this.char.fartFly && this.fartFuel > 0) || this.char.hover;
                if (input.isJustPressed('Space') && this.grounded && !this.isCrouching) {
                    this.vy = -jForce; this.grounded = false; game.audio.playJump();
                    game.particles.spawn(this.x + this.w/2, this.y + this.h, this.isBoosted ? '#00FFCC' : '#CCC', 30, 200);
                } else if (input.isJustPressed('Space') && !this.grounded && this.airJumpsLeft > 0 && !canFly) { // Mehrfachsprung (entfällt bei Flug)
                    this.vy = -jForce * 0.92; this.airJumpsLeft--; game.audio.playJump();
                    game.particles.spawn(this.x + this.w/2, this.y + this.h, '#FFF', 18, 240);
                }
                if (input.isJustReleased('Space') && this.vy < 0) this.vy *= 0.5;

                // --- Flug: Sprungtaste in der Luft GEHALTEN -> Schub nach oben ---
                if (canFly && !this.grounded && input.isDown('Space') && !input.isJustPressed('Space')) {
                    let thr = CONFIG.JETPACK_THRUST, maxR = CONFIG.JETPACK_MAX_RISE;
                    if (this.char.hover) { thr *= 0.6; maxR *= 0.55; }     // Hummel: sanfter Auftrieb
                    this.vy -= thr * dt;
                    if (this.vy < -maxR) this.vy = -maxR;
                    if (this.hasJetpack && !this.char.fartFly && !this.char.hover) this.jetpackFuel = Math.max(0, this.jetpackFuel - dt);
                    this.jetpackActive = true;
                    if (this.char.fartFly) {                                // PUPSI: sitzt, deutliche braune Pups-Wolke aus dem Hintern
                        this.fartFuel = Math.max(0, this.fartFuel - dt);    // Pups-Vorrat verbrauchen
                        this.fartFlying = true;                             // Sitz-Pose in _drawCritter
                        const dirF = this.facingRight ? 1 : -1;
                        const buttX = this.x + this.w * 0.5 - dirF * this.w * 0.32;   // Hintern (hinten)
                        const buttY = this.y + this.h - 6;
                        game.particles.spawn(buttX, buttY, '#8a5a2c', 4, 150, 0.75, false);   // dunkelbraun
                        game.particles.spawn(buttX, buttY + 4, '#b07b3c', 3, 110, 0.6, false); // hellbraun
                        if (game.audio.playFart) game.audio.playFart();
                    } else if (this.char.hover) {                           // BRUMMEL: Summen
                        if (game.audio.playJetpack) game.audio.playJetpack();
                    } else {                                                // Item-Jetpack: Flamme
                        game.particles.spawnFire(this.x + this.w * 0.5, this.y + this.h, 2, this.w * 0.5, 8);
                        if (game.audio.playJetpack) game.audio.playJetpack();
                    }
                }
            }
        }
        
        const fullH = this.standH, crouchH = this.crouchH, shift = fullH - crouchH;
        if (this.isCrouching && this.h !== crouchH) { this.y += shift; this.h = crouchH; }
        else if (!this.isCrouching && this.h !== fullH) { this.y -= shift; this.h = fullH; }
        
        this.x += this.vx * dt; this.handleCollisions(game.levelGen.platforms, 'x', dt, game);
        if (this.x < game.camera.x) { this.x = game.camera.x; this.vx = 0; }
        this.y += this.vy * dt; this.grounded = false; this.handleCollisions(game.levelGen.platforms, 'y', dt, game);
        if (this.grounded) this.airJumpsLeft = this.char.airJumps;   // Luftsprünge am Boden auffüllen
        if (this.grounded && this.hasJetpack && this.jetpackFuel < this.jetpackMax) {
            this.jetpackFuel = Math.min(this.jetpackMax, this.jetpackFuel + CONFIG.JETPACK_REFUEL * dt);
        }
        if (this.grounded && this.char.fartFly && this.fartFuel < this.fartMax) {   // PUPSI: Pups-Vorrat am Boden auffüllen
            this.fartFuel = Math.min(this.fartMax, this.fartFuel + CONFIG.FART_REFUEL * dt);
        }

        if (this.grounded && !this.isClimbing) {
            for (let p of game.levelGen.platforms) {
                if (p.isHazard || (p.isCrumbling && p.crumbleTimer <= 0)) continue;
                if (this.x + this.w > p.x && this.x < p.x + p.w && Math.abs(this.y + this.h - p.y) < 2) { 
                    this.lastSafePlatform = p; 
                    break; 
                }
            }
        }
        
        if (this.isClimbing) this.state = 'CLIMB'; 
        else if (this.isCrouching) this.state = 'CROUCH';
        else if (!this.grounded) this.state = 'AIR'; 
        else if (Math.abs(this.vx) > 5) this.state = 'WALK'; 
        else this.state = 'IDLE';
        
        // Pistole & Schrotflinte feuern halbautomatisch (ein Schuss pro Trigger-Druck), der Rest ist Dauerfeuer
        const semiAuto = (this.weapon === 'PISTOL' || this.weapon === 'SHOTGUN');
        const firePressed = semiAuto
            ? (input.isJustPressed('KeyF') || input.isJustPressed('MouseLeft'))
            : (input.isDown('KeyF') || input.isDown('MouseLeft'));
        if (firePressed && this.shootCooldown <= 0) this.fireWeapon(game, input);
        if (input.isJustPressed('KeyQ')) {
            const weaponsList = Object.keys(this.inventory);
            if (weaponsList.length > 1) {
                let currentIndex = weaponsList.indexOf(this.weapon);
                let nextIndex = (currentIndex + 1) % weaponsList.length;
                this.weapon = weaponsList[nextIndex];
                if (game.audio.playWeaponPickup) game.audio.playWeaponPickup();
                game.updateHUD();
            }
        }

        // --- SPEZIAL (E): wegpusten / knuddeln / Klebezunge — je nach Figur ---
        const hasSpecial = this.char.cuddle || this.char.roundhouse || this.char.fartBlast || this.char.honey || this.char.carrot || this.char.tongue;
        if (hasSpecial && this.kickCd <= 0 && input.isJustPressed('KeyE') && !this.isClimbing && !this.isDead) {
            // Spezial-Aktionen deutlich langsamer animieren, damit man den Witz sieht
            const dur = (this.char.kind ? 0.95 : 0.5);
            this.kickTimer = dur; this.kickDur = dur; this.kickCd = dur + 0.35;
            const range = this.char.tongue ? 380 : (this.char.carrot ? 300 : (this.char.fartBlast ? 260 : 200));
            const dir = this.facingRight ? 1 : -1;
            const cxp = this.x + this.w / 2, cyp = this.y + this.h / 2;
            if (this.char.fartBlast && game.audio.playFart) game.audio.playFart();
            else if (game.audio.playRoundhouse) game.audio.playRoundhouse();
            game.triggerShake(this.char.fartBlast ? 26 : 20, 0.3);
            if (this.char.fartBlast) {
                // PUPSI: dreht sich um, bückt sich -> dicke braune Pups-Wolke in Richtung Gegner (vorn)
                const byp = this.y + this.h * 0.62;                        // Hintern-Höhe
                game.particles.spawn(cxp + dir * 50, byp, '#8a5a2c', 22, 460, 0.7, true);
                game.particles.spawn(cxp + dir * 90, byp, '#b07b3c', 16, 380, 0.6, true);
                game.particles.spawn(cxp + dir * 130, byp, '#caa06a', 10, 300, 0.55, true);
            } else {
                const col = this.char.honey ? '#FFD36E' : (this.char.carrot ? '#FF9F4D' : (this.char.tongue ? '#FF6FA8' : '#ffffff'));
                game.particles.spawn(cxp + dir * 70, cyp, col, 16, 360, 0.5, true);
            }
            for (const e of game.levelGen.enemies) {
                if (e.dead) continue;
                const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                const dx = (ex - cxp) * dir;
                const inRange = (dx > -40 && dx < range && Math.abs(ey - cyp) < 150);   // gerichtet nach vorn
                if (!inRange) continue;
                if (e.isBoss) { if (e.takeDamage) e.takeDamage(120, game, 'FLAME'); }   // Boss fliegt nicht, kassiert aber
                else {
                    e.kicked = true; e.kickDir = dir; e.noStomp = false;
                    const sp = 1650 + Math.random() * 350;
                    const ang = (20 + Math.random() * 10) * Math.PI / 180;  // 20–30° nach oben -> Bogenflug
                    e.vx = e.kickDir * sp; e.vy = -sp * Math.tan(ang); e.spin = 0;
                }
            }
            // QUAKI: Klebezunge zieht Bonbons/Items heran (werden im nächsten Frame eingesammelt)
            if (this.char.tongue && game.levelGen.items) {
                for (const it of game.levelGen.items) {
                    if (Math.hypot((it.x + it.w / 2) - cxp, (it.y + it.h / 2) - cyp) < range) { it.x = cxp - it.w / 2; it.y = cyp - it.h / 2; }
                }
            }
        }
    }

    fireWeapon(game, input) {
        const dirX = this.facingRight ? 1 : -1;
        let py = this.y + this.h * (this.isCrouching ? 0.28 : 0.20); // Schulterhöhe, proportional zur Spielergröße
        let px = this.facingRight ? this.x + this.w + 10 : this.x - 30;
        let vx = 0, vy = 0;
        let speed = 1200;
        let up = input && (input.isDown('KeyW') || input.isDown('ArrowUp'));
        let down = input && (input.isDown('KeyS') || input.isDown('ArrowDown'));
        let right = input && (input.isDown('KeyD') || input.isDown('ArrowRight'));
        let left = input && (input.isDown('KeyA') || input.isDown('ArrowLeft'));
        let side = right || left;
        
        if (up && side) { vx = (right ? 1 : -1) * speed * 0.7; vy = -speed * 0.7; px = this.x + this.w/2 + (right ? 20 : -20); py = this.y - 10; }
        else if (down && side && !this.grounded) { vx = (right ? 1 : -1) * speed * 0.7; vy = speed * 0.7; px = this.x + this.w/2 + (right ? 20 : -20); py = this.y + this.h; }
        else if (up) { vx = 0; vy = -speed; px = this.x + this.w/2; py = this.y - 20; }
        else if (down && !this.grounded) { vx = 0; vy = speed; px = this.x + this.w/2; py = this.y + this.h + 20; }
        else { vx = dirX * speed; vy = 0; }
        
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        this.flashTimer = 0.1;
        let pushback = 0; 
        
        const spawnShells = (count = 1) => {
            if (!game.particles.spawnCasing) return; 
            let ejectX = this.facingRight ? this.x + this.w / 2 : this.x + this.w / 2;
            for (let i = 0; i < count; i++) game.particles.spawnCasing(ejectX, py - 10, dirX);
        };
        
        if (isMelee) {
            if (this.weapon === 'CHAINSAW') game.audio.playChainsaw(); else game.audio.playSwing();
            let hW = 140, hH = 160, hX = this.facingRight ? this.x + this.w : this.x - hW, hY = this.y;
            game.particles.spawn(hX + hW/2, hY + hH/2, '#FFF', 15, 200, 0.2);
            let damage = this.weapon === 'CHAINSAW' ? 150 : (this.weapon === 'AXE' ? 80 : 50), hitSomething = false;
            for (let enemy of game.levelGen.enemies) {
                if (!enemy.dead && hX < enemy.x + enemy.w && hX + hW > enemy.x && hY < enemy.y + enemy.h && hY + hH > enemy.y) {
                    enemy.takeDamage(damage, game); hitSomething = true;
                }
            }
            if (hitSomething) { game.triggerShake(12, 0.2); game.audio.playMeleeHit(this.weapon); }
            this.shootCooldown = this.weapon === 'CHAINSAW' ? 0.08 : 0.3;
        } else {
            if (game.levelStats) game.levelStats.shots++;   // ein Wattebäuschchen/Geschoss verschossen
            if (this.weapon === 'MOLOTOV') {
                game.triggerShake(5, 0.1); game.audio.playJump();
                game.projectiles.push(new Projectile(px, py - 20, vx * 0.6, vy ? vy * 0.8 : -500, false, 'MOLOTOV', true)); 
                this.shootCooldown = 1.0; this.inventory[this.weapon]--;
            } 
            else if (this.weapon === 'FLAMETHROWER') {
                game.triggerShake(2, 0.02); game.audio.playFlamethrower(); 
                for(let i=0; i<3; i++) { 
                    game.projectiles.push(new Projectile(px + (Math.random()-0.5)*20, py + (Math.random()-0.5)*20, vx * (0.6 + Math.random()*0.4), vy * (0.6 + Math.random()*0.4) + (vx !== 0 ? (Math.random()-0.5)*300 : 0), false, 'FLAME'));
                }
                this.shootCooldown = 0.04; this.inventory[this.weapon]--; pushback = 10; 
            } else {
                game.audio.playShoot(this.weapon);
                if (this.weapon === 'PISTOL') {            // Wasserspritzpistole: schnelle Wassertropfen
                    game.triggerShake(5, 0.05); game.projectiles.push(new Projectile(px, py, vx * 1.5, vy * 1.5, false, 'WATER')); this.shootCooldown = 0.16; spawnShells(1); this.inventory[this.weapon]--;
                } else if (this.weapon === 'UZI') {        // Seifenblasen-Pistole: viele sehr schnelle Bläschen
                    game.triggerShake(6, 0.05); game.projectiles.push(new Projectile(px, py, vx * 1.9 + (Math.random() - 0.5) * 200, vy * 1.9 + (Math.random() - 0.5) * 200, false, 'BUBBLE'));
                    this.shootCooldown = 0.07; this.inventory[this.weapon]--; spawnShells(1);
                } else if (this.weapon === 'ROCKET') {     // Riesen-Wattebausch: langsam & wuchtig
                    this.vx = vx ? -Math.sign(vx) * 800 : 0; this.vy = vy ? -Math.sign(vy) * 400 : -100;
                    game.projectiles.push(new Projectile(px, py, vx * 0.55, vy * 0.55, false, 'ROCKET'));
                    this.shootCooldown = 1.0; this.inventory[this.weapon]--; game.triggerShake(40, 0.8); pushback = 200;
                } else if (this.weapon === 'SHOTGUN') {    // Bonbonkanone: 6 bunte Bonbons im Kegel, eher langsam
                    this.vx = vx ? -Math.sign(vx) * 800 : 0; this.vy = vy ? -Math.sign(vy) * 400 : -150;
                    for (let i = 0; i < 6; i++) game.projectiles.push(new Projectile(px, py, vx * 0.85 + (Math.random() - 0.5)*160, vy * 0.85 + (Math.random() - 0.5)*320, false, 'CANDY'));
                    this.shootCooldown = 0.85; this.inventory[this.weapon]--; game.triggerShake(25, 0.3); pushback = 250; spawnShells(2);
                } else if (this.weapon === 'ASSAULT_RIFLE') {  // Wattebäuschchen-Werfer: schnelle Watte-Puschel
                    game.triggerShake(8, 0.05); game.projectiles.push(new Projectile(px, py, vx * 1.5 + (Math.random() - 0.5)*80, vy * 1.5 + (Math.random() - 0.5)*80, false, 'COTTON')); this.shootCooldown = 0.09; this.inventory[this.weapon]--; pushback = 40; spawnShells(1);
                } else if (this.weapon === 'MINIGUN') {    // Glitzer-Schleuder: ultraschnelle Sternchen
                    game.triggerShake(15, 0.1);
                    game.projectiles.push(new Projectile(px + (Math.random()-0.5)*20, py + (Math.random()-0.5)*20, vx * 2.4 + (Math.random() - 0.5) * 220, vy * 2.4 + (Math.random() - 0.5) * 220, false, 'STARLET'));
                    game.particles.spawn(px, py, '#FFE56B', 3, 400, 0.1, true);
                    this.shootCooldown = 0.02; this.inventory[this.weapon]--; pushback = 20; spawnShells(1);
                } else if (this.weapon === 'GRENADE') {    // Puddingwerfer: langsamer hoher Bogen
                    game.projectiles.push(new Projectile(px, py - 20, vx * 0.55, vy ? vy * 0.8 : -600, false, 'GRENADE', true)); this.shootCooldown = 1.0; this.inventory[this.weapon]--;
                }
            }
            if (this.inventory[this.weapon] <= 0) { delete this.inventory[this.weapon]; this.weapon = 'BAT'; }
            if (pushback > 0 && !this.isCrouching) { if (vx) this.vx -= Math.sign(vx) * pushback; }
        }
        game.updateHUD();
    }
    
    handleCollisions(platforms, axis, dt, game) {
        for (let p of platforms) {
            if (p.isCrumbling && this.checkCollision(p) && axis === 'y' && this.vy >= 0) p.touched = true; 
            if (p.isHazard || p.isSpiky) {
                if (this.checkCollision(p)) this.takeDamage(10, game);
                if (p.isHazard) continue;
            }
            if (p.isCrumbling && p.crumbleTimer <= 0) continue;

            if (p.angle !== 0) {
                if (this.x + this.w > p.x && this.x < p.x + p.w) {
                    let relX = (this.x + this.w/2) - p.x;
                    let targetY = p.y - (relX * Math.tan(p.angle));
                    if (axis === 'y' && this.vy >= 0 && this.y + this.h > targetY - 20 && this.y + this.h < targetY + 50) {
                        this.y = targetY - this.h; this.grounded = true; this.vy = 0; continue;
                    }
                }
                if (axis === 'x' && this.checkCollision(p)) continue; 
            }

            if (this.checkCollision(p)) {
                if (!p.isSolidGround) {
                    if (axis === 'y' && this.vy > 0 && ((this.y - this.vy * dt) + this.h) <= p.y + 15) { 
                        this.y = p.y - this.h; this.grounded = true; this.vy = 0; 
                        if (p.isBouncy) { this.vy = -1500; this.grounded = false; }
                    }
                } else {
                    if (axis === 'x') {
                        const step = (this.y + this.h) - p.y;   // wie hoch ist die Kante über den Füßen
                        if (this.grounded && this.vy >= -1 && step > 12 && step <= 74) {
                            // sanftes Hochstufen auf den Hügel -> begehbares, rollendes Terrain (hoch & runter)
                            this.y = p.y - this.h; this.vy = 0; this.grounded = true;
                        } else if (this.y + this.h > p.y + 12 && this.y < p.y + p.h - 4) {
                            // echte Seitenkollision (hohe Wand/Pfeiler) auflösen
                            this.x = this.vx > 0 ? p.x - this.w : p.x + p.w; this.vx = 0;
                        }
                    }
                    else if (axis === 'y') {
                        if (this.vy > 0) { this.y = p.y - this.h; this.grounded = true; this.vy = 0; }
                        else if (this.vy < 0) {
                            // Kopf-Anschlag NUR bei normalen Blöcken/dünnen Plattformen (kleine Höhe).
                            // Hohe Röhren/Wände (h bis ~2100) NICHT nach unten teleportieren —
                            // das war die Ursache für "plötzliche Verwundung beim Hochspringen": ein
                            // seitlicher Streifer wird stattdessen horizontal weggeschoben, Sprung läuft weiter.
                            if (p.h < 200) {
                                this.y = p.y + p.h; this.vy = 0;
                                if (p.bumpable && !p.used && game && game.bumpBlock) game.bumpBlock(p);
                            } else {
                                this.x = (this.x + this.w / 2 < p.x + p.w / 2) ? p.x - this.w : p.x + p.w;
                            }
                        }
                    }
                }
            }
        }
    }
    
    takeDamage(amount, game) {
        if (this.invincibleTimer > 0 || this.isStar) return;
        if (game.levelStats) game.levelStats.hits++;   // zu viel Liebe abbekommen
        this.hp = Math.max(0, this.hp - amount * this.char.dmg); this.invincibleTimer = 1.5; this.vy = -500; this.vx = (this.facingRight ? -1 : 1) * 400; this.isClimbing = false;
        game.particles.spawnBlood(this.x + this.w/2, this.y + this.h/2, 60); game.triggerShake(30, 0.4); game.updateHUD();
        if (game.audio.playPainScream) game.audio.playPainScream();   // Schmerzensschrei
    }
    
    // Prozedurale Spielerfigur (Bad-Mario, böse). Zeichnet im selben lokalen Raum wie das alte
    // Sprite (Füße bei ~ y=+83). Blickrichtung = +x (Spiegelung übernimmt der Aufrufer).
    drawMarioBody(ctx, frame) {
        const crouch = this.isCrouching;
        const air = !this.grounded && !crouch;
        const walk = (this.state === 'WALK');
        const cyc = walk ? (frame / 8) * Math.PI * 2 : 0;
        const bob = walk ? -Math.abs(Math.sin(cyc)) * 4 : 0;

        let SKIN = this.char.skin, RED = this.char.shirt, BLUE = this.char.overall;
        const SKINSH = '#c98d54', REDDK = this.char.shirtDk, SHOE = this.char.boots || '#3f2713', MUST = '#241405', BTN = '#f5c542';
        const bare = this.char.bare;
        if (this.isStar) {                          // günstiger Stern-Flash (kein filter/shadowBlur)
            const c = ['#ffffff', '#ffe14d', '#54d8ff', '#9dff54'][Math.floor(performance.now() / 70) % 4];
            RED = c; BLUE = c; SKIN = c;
        }

        ctx.save();
        ctx.translate(0, bob);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        // LINA: zarte Feenflügel (hinter dem Körper)
        if (this.char.wings) {
            const flap = Math.sin(performance.now() / 120) * 0.25;
            ctx.save(); ctx.globalAlpha = 0.72;
            for (const sgn of [-1, 1]) {
                ctx.save(); ctx.translate(sgn * 6, -18); ctx.rotate(sgn * (0.5 + flap));
                const wg = ctx.createLinearGradient(0, 0, sgn * 40, 30);
                wg.addColorStop(0, '#FFFFFF'); wg.addColorStop(1, '#C9A0FF');
                ctx.fillStyle = wg;
                ctx.beginPath(); ctx.ellipse(sgn * 22, -6, 22, 13, sgn * 0.5, 0, 6.3); ctx.fill();   // oberer Flügel
                ctx.beginPath(); ctx.ellipse(sgn * 16, 16, 16, 10, sgn * 0.7, 0, 6.3); ctx.fill();   // unterer Flügel
                ctx.restore();
            }
            ctx.restore();
        }

        const shoe = (fx, fy, ang) => {
            ctx.save(); ctx.translate(fx, fy); if (ang) ctx.rotate(ang);
            ctx.fillStyle = SHOE; ctx.beginPath(); ctx.roundRect(-9, -3, 26, 12, 5); ctx.fill();
            ctx.fillStyle = '#1f130a'; ctx.beginPath(); ctx.roundRect(-9, 6, 26, 3, 1); ctx.fill();   // abgenutzte Sohle
            ctx.strokeStyle = 'rgba(210,200,180,0.16)'; ctx.lineWidth = 1.4;                          // Schrammen
            ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(7, 1); ctx.stroke();
            ctx.restore();
        };
        // Zweigliedriges Bein (Hüfte -> Knie -> Fuß) für dynamische Gangart
        const leg = (hipX, thigh, knee) => {
            const hx = hipX, hy = 12;
            const kx = hx + Math.sin(thigh) * 28, ky = hy + Math.cos(thigh) * 28;
            const fx = kx + Math.sin(knee) * 32,  fy = ky + Math.cos(knee) * 32;
            ctx.strokeStyle = BLUE; ctx.lineWidth = 16;
            ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
            shoe(fx, fy - 1, Math.sin(thigh) * 0.25);
        };

        if (crouch) {
            // ---- HOCKE: tiefer Kampf-Hock, Knie hoch, Waffe nach vorn ----
            const cleg = (footX, hipX, kneeX) => {
                ctx.strokeStyle = BLUE; ctx.lineWidth = 16;
                ctx.beginPath(); ctx.moveTo(hipX, 52); ctx.lineTo(kneeX, 34); ctx.lineTo(footX, 70); ctx.stroke();
                shoe(footX, 70);
            };
            cleg(-18, -8, -16); cleg(10, 6, 18);
            ctx.strokeStyle = REDDK; ctx.lineWidth = 12;                     // hinterer Arm (stützt ab)
            ctx.beginPath(); ctx.moveTo(-6, 24); ctx.lineTo(-20, 44); ctx.stroke();
            ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(-20, 46, 5.5, 0, 7); ctx.fill();
            ctx.fillStyle = RED;                                            // nach vorn gelehnter Oberkörper
            ctx.beginPath(); ctx.roundRect(-20, 12, 44, 38, 13); ctx.fill();
            ctx.fillStyle = BLUE;
            ctx.beginPath(); ctx.roundRect(-15, 30, 32, 24, 8); ctx.fill();
            ctx.fillStyle = BTN; ctx.beginPath(); ctx.arc(-8, 36, 3.2, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(9, 36, 3.2, 0, 7); ctx.fill();
            this._drawHead(ctx, 4, -2, SKIN, SKINSH, RED, REDDK, MUST);
            ctx.restore();
            return;
        }

        // ---- STEHEN / LAUFEN / SPRINGEN ----  (l0 = hinten, l1 = vorne)
        const kickPose = this.kickTimer > 0 && (this.char.roundhouse || this.char.cuddle);
        let l0, l1;
        if (kickPose) {                              // KARATE-ROUNDHOUSE: Trittbein waagerecht ausgestreckt
            l0 = { h: -6, t: -0.35, k: -0.45 };      // Standbein leicht gebeugt
            l1 = { h: 6,  t: 1.5,   k: 1.5 };        // Trittbein ~waagerecht nach vorn
        } else if (air) {                            // Sprung: vorderes Bein angezogen, hinteres gestreckt
            l0 = { h: -7, t: -0.6, k: -0.95 };       // hinteres Bein nach hinten gestreckt
            l1 = { h: 8,  t: 1.2,  k: -0.1 };        // vorderes Bein: Knie hoch, Schienbein getuckt
        } else if (walk) {                           // Gang mit nach HINTEN knickendem Knie (natürlich)
            const mk = (p, h) => { const t = Math.cos(p) * 0.5; const fold = Math.max(0, -Math.sin(p)) * 1.1; return { h, t, k: t - fold }; };
            l0 = mk(cyc, -7); l1 = mk(cyc + Math.PI, 8);
        } else {                                     // Stand: ruhiger Stand
            l0 = { h: -8, t: -0.12, k: -0.12 }; l1 = { h: 8, t: 0.12, k: 0.12 };
        }

        leg(l0.h, l0.t, l0.k);                                              // hinteres Bein
        const bax = -13 + (walk ? Math.cos(cyc) * -8 : (air ? -6 : 0));      // hinterer Arm schwingt gegengleich
        ctx.strokeStyle = REDDK; ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(bax, 6); ctx.stroke();
        ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(bax, 8, 5.5, 0, 7); ctx.fill();

        if (this.char.hat === 'spikes') {                                  // Sonic: Stacheln auf dem Rücken
            ctx.fillStyle = REDDK;
            [-34, -16, 2].forEach(sy => { ctx.beginPath(); ctx.moveTo(-16, sy); ctx.lineTo(-42, sy + 9); ctx.lineTo(-14, sy + 22); ctx.closePath(); ctx.fill(); });
        }

        if (this.char.wings) {
            // ---- LINA: Pastell-Feenkleid ----
            ctx.fillStyle = RED;                                            // Oberteil
            ctx.beginPath(); ctx.roundRect(-18, -40, 36, 34, 12); ctx.fill();
            ctx.fillStyle = BLUE;                                           // ausgestellter Rock
            ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(18, -8); ctx.lineTo(30, 20); ctx.lineTo(-30, 20); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.55)';                       // heller Rocksaum
            ctx.beginPath(); ctx.moveTo(-30, 20); ctx.lineTo(30, 20); ctx.lineTo(27, 13); ctx.lineTo(-27, 13); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#FFD36E'; ctx.beginPath(); ctx.arc(0, -18, 3.6, 0, 7); ctx.fill();   // Blümchen-Knopf
        } else if (bare) {
            // ---- CHUCK: nackter, muskulöser Oberkörper + Camo-Shorts + Kampfstiefel ----
            ctx.fillStyle = RED;                                            // Torso (Hautton)
            ctx.beginPath(); ctx.roundRect(-21, -40, 42, 52, 12); ctx.fill();
            ctx.strokeStyle = SKINSH; ctx.lineWidth = 2.2;                  // Muskeldefinition
            ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, -4); ctx.stroke();          // Mittellinie
            ctx.beginPath(); ctx.arc(-10, -27, 8, 0.1, 2.5); ctx.stroke();                 // Brust links
            ctx.beginPath(); ctx.arc(10, -27, 8, 0.6, 3.0); ctx.stroke();                  // Brust rechts
            for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(-11, -14 + r * 8); ctx.lineTo(11, -14 + r * 8); ctx.stroke(); } // Bauchmuskeln
            ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(-9, -5, 6, 4, 0.3, 0, 7); ctx.fill(); // Schweiß/Dreck
            // Camo-Shorts
            ctx.fillStyle = BLUE; ctx.beginPath(); ctx.roundRect(-19, -6, 38, 24, 6); ctx.fill();
            ctx.fillStyle = '#3f4d22'; [[-11, 2], [4, 9], [11, 1], [-3, 13], [8, 14]].forEach(c => { ctx.beginPath(); ctx.ellipse(c[0], c[1], 5, 4, 0.3, 0, 7); ctx.fill(); });
            ctx.fillStyle = '#7a8f4e'; [[-6, 6], [9, 5], [0, 15]].forEach(c => { ctx.beginPath(); ctx.ellipse(c[0], c[1], 3, 3, 0, 0, 7); ctx.fill(); });
            ctx.fillStyle = '#222'; ctx.fillRect(-19, -6, 38, 4);          // Gürtel
            ctx.fillStyle = '#c9a227'; ctx.fillRect(-3, -6, 6, 4);         // Gürtelschnalle
        } else {
            ctx.fillStyle = RED;                                                // Oberkörper (rotes Shirt)
            ctx.beginPath(); ctx.roundRect(-20, -40, 40, 56, 13); ctx.fill();
            ctx.fillStyle = BLUE;                                               // Latzhose
            ctx.beginPath(); ctx.roundRect(-18, -8, 36, 28, 7); ctx.fill();
            ctx.fillRect(-15, -34, 7, 28); ctx.fillRect(8, -34, 7, 28);         // Träger
            ctx.fillStyle = BTN; ctx.beginPath(); ctx.arc(-11, -6, 3.5, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(11, -6, 3.5, 0, 7); ctx.fill();
            // --- Verschleiß (dezent): Flicken, Riss, Dreck ---
            ctx.fillStyle = '#1d3290'; ctx.fillRect(2, 2, 12, 10);             // aufgenähter Flicken auf dem Latz
            ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
            ctx.strokeRect(2, 2, 12, 10); ctx.setLineDash([]);
            ctx.strokeStyle = REDDK; ctx.lineWidth = 2;                        // Riss im Shirt (Schulter)
            ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-9, -22); ctx.lineTo(-13, -15); ctx.stroke();
            ctx.fillStyle = 'rgba(0,0,0,0.16)';                               // Dreckflecken
            ctx.beginPath(); ctx.ellipse(-6, 8, 7, 5, 0.3, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse(9, -24, 5, 4, -0.4, 0, 7); ctx.fill();
        }

        leg(l1.h, l1.t, l1.k);                                              // vorderes Bein (vor dem Körper)
        if (kickPose) {                                                    // Speed-Lines hinter dem Trittbein
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.moveTo(40, 6); ctx.lineTo(86, 4); ctx.lineTo(40, 14); ctx.fill();
        }
        this._drawHead(ctx, 0, -58, SKIN, SKINSH, RED, REDDK, MUST);
        ctx.restore();
    }

    // --- Tier-Figuren (PUPSI/ZOTTEL/BRUMMEL/HOPPEL/QUAKI): süße, prozedural gezeichnete Tierchen ---
    // Gleicher lokaler Raum wie drawMarioBody (Füße ~y68, Kopf oben), damit Fuß-Ausrichtung
    // und Waffenarm (sX=0, sY≈-21) weiter passen.
    _drawCritter(ctx, frame) {
        const kind = this.char.kind;
        const crouch = this.isCrouching;
        const air = !this.grounded && !crouch;
        const walk = (this.state === 'WALK');
        const cyc = walk ? (frame / 8) * Math.PI * 2 : 0;
        const bob = walk ? -Math.abs(Math.sin(cyc)) * 4 : (air ? 0 : Math.sin(performance.now() / 600) * 1.5);

        let BODY = this.char.shirt, DARK = this.char.shirtDk, BELLY = this.char.skin, ACC = this.char.overall;
        if (this.isStar) {                                  // Stern-Flash (unverwundbar)
            const c = ['#ffffff', '#ffe14d', '#54d8ff', '#9dff54'][Math.floor(performance.now() / 70) % 4];
            BODY = c; DARK = c; BELLY = c; ACC = c;
        }
        ctx.save();
        ctx.translate(0, bob);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        // PUPSI Pups-Blast (E): dreht sich um, bückt sich, dicke braune Wolke nach vorn (+x)
        if (this.kickTimer > 0 && this.char.fartBlast) {
            this._drawSquirrelFart(ctx, BODY, DARK, BELLY, ACC);
            ctx.restore();
            return;
        }

        // Hummel: Flügelchen hinter dem Körper (flattern schnell)
        if (kind === 'bee') {
            const flap = Math.sin(performance.now() / 45) * 0.4;
            ctx.save(); ctx.globalAlpha = 0.6;
            for (const sgn of [-1, 1]) {
                ctx.save(); ctx.translate(sgn * 8, -18); ctx.rotate(sgn * (0.45 + flap));
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.beginPath(); ctx.ellipse(sgn * 20, -8, 20, 12, sgn * 0.4, 0, 6.3); ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }
        // Eichhörnchen: große buschige Schwanzkringel hinter dem Körper
        if (kind === 'squirrel') {
            ctx.save(); ctx.fillStyle = DARK;
            ctx.beginPath(); ctx.moveTo(-12, 30);
            ctx.quadraticCurveTo(-58, 24, -44, -18);
            ctx.quadraticCurveTo(-36, -54, -8, -44);
            ctx.quadraticCurveTo(-30, -34, -26, -8);
            ctx.quadraticCurveTo(-22, 18, -12, 30); ctx.fill();
            ctx.fillStyle = BODY; ctx.globalAlpha = 0.55;
            ctx.beginPath(); ctx.ellipse(-34, -18, 9, 22, -0.3, 0, 7); ctx.fill();
            ctx.restore();
        }

        // --- Beine / Füße ---
        const sw = walk ? Math.sin(cyc) * 9 : 0;
        const footY = 68;
        const web = (kind === 'frog');
        // Fuß an beliebiger Position (für gegliederte Beine)
        const footAt = (fx, fy, ang) => {
            ctx.save(); ctx.translate(fx, fy); if (ang) ctx.rotate(ang);
            ctx.fillStyle = DARK;
            if (web) { ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.lineTo(7, 9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); }
            else { ctx.beginPath(); ctx.roundRect(-9, -1, 20, 11, 5); ctx.fill(); }
            ctx.restore();
        };
        // Gegliedertes Bein (Hüfte -> Knie -> Fuß), wie bei Lina
        const legA = (hipX, hy, thigh, knee) => {
            const kx = hipX + Math.sin(thigh) * 18, ky = hy + Math.cos(thigh) * 18;
            const fx = kx + Math.sin(knee) * 18, fy = ky + Math.cos(knee) * 18;
            ctx.strokeStyle = BODY; ctx.lineWidth = 13;
            ctx.beginPath(); ctx.moveTo(hipX, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
            footAt(fx, fy - 1, Math.sin(thigh) * 0.25);
        };

        let bodyDrop = 0;
        if (this.fartFlying) {
            // PUPSI Pups-Flug: Sitz-Pose — Beinchen nach VORNE (+x) angezogen
            ctx.strokeStyle = BODY; ctx.lineWidth = 13;
            ctx.beginPath(); ctx.moveTo(-4, 26); ctx.lineTo(22, 18); ctx.lineTo(40, 30); ctx.stroke();   // unteres Bein
            ctx.beginPath(); ctx.moveTo(2, 24); ctx.lineTo(26, 10); ctx.lineTo(44, 20); ctx.stroke();    // oberes Bein
            ctx.fillStyle = DARK;
            ctx.beginPath(); ctx.roundRect(34, 26, 20, 11, 5); ctx.fill();
            ctx.beginPath(); ctx.roundRect(38, 16, 20, 11, 5); ctx.fill();
        } else if (crouch) {
            // Duck/Hocke: tief geduckt, Knie weit nach außen, Körper sinkt zwischen die Beinchen
            bodyDrop = 38;
            ctx.strokeStyle = BODY; ctx.lineWidth = 13;
            ctx.beginPath(); ctx.moveTo(-7, 44); ctx.lineTo(-32, 52); ctx.lineTo(-22, footY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(7, 44); ctx.lineTo(32, 52); ctx.lineTo(22, footY); ctx.stroke();
            footAt(-22, footY, 0); footAt(22, footY, 0);
        } else if (air && !this.char.fartFly) {
            // Sprung: gegliederte Beine wie bei Lina (hinten gestreckt, vorne angezogen)
            legA(-8, 22, -0.6, -0.95);    // hinteres Bein gestreckt
            legA(8, 22, 1.2, -0.1);       // vorderes Bein: Knie hoch, Schienbein getuckt
        } else {
            // Stehen / Laufen: kurze Stummelbeinchen mit Schwung
            ctx.strokeStyle = BODY; ctx.lineWidth = 13;
            ctx.beginPath(); ctx.moveTo(-9, 28); ctx.lineTo(-12 - sw, footY + 3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(9, 28); ctx.lineTo(12 + sw, footY + 3); ctx.stroke();
            footAt(-12 - sw, footY + 3, 0); footAt(12 + sw, footY + 3, 0);
        }
        if (bodyDrop) ctx.translate(0, bodyDrop);   // Körper/Kopf/Arme beim Ducken absenken

        // --- Hinterer Arm (gegengleich schwingend) ---
        const bax = -16 + (walk ? Math.cos(cyc) * -6 : 0);
        ctx.strokeStyle = DARK; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(bax, 10); ctx.stroke();
        ctx.fillStyle = BODY; ctx.beginPath(); ctx.arc(bax, 12, 5, 0, 7); ctx.fill();

        // --- Rumpf (pummeliger Bauch) ---
        ctx.fillStyle = BODY;
        ctx.beginPath(); ctx.ellipse(0, 2, 24, 32, 0, 0, 7); ctx.fill();
        ctx.fillStyle = BELLY;                              // heller Bauchfleck
        ctx.beginPath(); ctx.ellipse(0, 8, 14, 22, 0, 0, 7); ctx.fill();
        if (kind === 'bee') {                               // Hummel-Streifen
            ctx.fillStyle = DARK; ctx.globalAlpha = 0.9;
            for (const yy of [-12, 2, 16]) { ctx.beginPath(); ctx.ellipse(0, yy, 24 - Math.abs(yy) * 0.25, 5, 0, 0, 7); ctx.fill(); }
            ctx.globalAlpha = 1;
        }

        // --- Vorderer Arm (Waffenarm wird separat gezeichnet; hier nur ein Pfötchen vorn) ---
        const fax = 16 + (walk ? Math.cos(cyc) * 6 : 0);
        ctx.strokeStyle = BODY; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(8, -14); ctx.lineTo(fax, 10); ctx.stroke();
        ctx.fillStyle = BELLY; ctx.beginPath(); ctx.arc(fax, 12, 5, 0, 7); ctx.fill();

        // --- Kopf ---
        this._drawCritterHead(ctx, kind, BODY, DARK, BELLY, ACC);

        // --- Spezial-Effekt (E): Honig-Klecks / Möhren-Wurf / Klebezunge sichtbar nach vorn (+x) ---
        if (this.kickTimer > 0 && (this.char.honey || this.char.carrot || this.char.tongue)) {
            this._drawCritterSpecial(ctx);
        }

        ctx.restore();
    }

    // Sichtbares Spezial-Objekt während der E-Attacke (lokaler Raum, +x = Blickrichtung)
    _drawCritterSpecial(ctx) {
        const prog = 1 - Math.max(0, this.kickTimer) / (this.kickDur || 0.32);     // 0 -> 1
        const reach = Math.sin(prog * Math.PI);                  // 0..1..0 Ausfahr-Schwung
        if (this.char.tongue) {
            // QUAKI: lange rosa Klebezunge aus dem Mund (Kopf bei y≈-42)
            const len = 30 + reach * 110;
            ctx.strokeStyle = '#FF6FA8'; ctx.lineWidth = 11; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(8, -34); ctx.quadraticCurveTo(len * 0.6, -30 + reach * 8, len, -26 + reach * 6); ctx.stroke();
            ctx.strokeStyle = '#FF9CC6'; ctx.lineWidth = 4;       // heller Mittelstreifen
            ctx.beginPath(); ctx.moveTo(8, -34); ctx.quadraticCurveTo(len * 0.6, -30 + reach * 8, len, -26 + reach * 6); ctx.stroke();
            ctx.fillStyle = '#FF5E9E'; ctx.beginPath(); ctx.arc(len, -26 + reach * 6, 9, 0, 7); ctx.fill();   // klebrige Spitze
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(len - 3, -29 + reach * 6, 3, 0, 7); ctx.fill();
        } else if (this.char.carrot) {
            // HOPPEL: dicke orange Möhre fliegt waagerecht nach vorn (Spitze voran)
            const cx = 34 + reach * 78, cy = 2 - reach * 4;
            // Flugspur
            ctx.fillStyle = 'rgba(255,159,77,0.4)'; ctx.beginPath(); ctx.arc(cx - 26, cy, 6, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(cx - 40, cy + 2, 4, 0, 7); ctx.fill();
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2 - 0.15);    // liegend, Spitze nach vorn (+x)
            ctx.fillStyle = '#FF8A2B'; ctx.beginPath(); ctx.moveTo(-11, -22); ctx.lineTo(11, -22); ctx.lineTo(0, 26); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#E06A12'; ctx.lineWidth = 2;       // Rillen
            for (const ry of [-14, -6, 2]) { ctx.beginPath(); ctx.moveTo(-7, ry); ctx.lineTo(7, ry); ctx.stroke(); }
            ctx.fillStyle = '#4Fae3E'; for (const lx of [-6, 0, 6]) { ctx.beginPath(); ctx.ellipse(lx, -25, 3.4, 11, lx * 0.07, 0, 7); ctx.fill(); }   // grünes Kraut
            ctx.restore();
        } else if (this.char.honey) {
            // BRUMMEL: goldener Honig-Klecks spritzt nach vorn (mit Tropfen)
            const hx = 28 + reach * 80;
            ctx.fillStyle = '#E8A93A';
            ctx.beginPath(); ctx.arc(hx, 0, 13 + reach * 5, 0, 7); ctx.fill();
            ctx.fillStyle = '#FFD36E'; ctx.beginPath(); ctx.arc(hx, 0, 9 + reach * 4, 0, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(hx - 4, -4, 3.5, 0, 7); ctx.fill();
            ctx.strokeStyle = '#E8A93A'; ctx.lineWidth = 5; ctx.lineCap = 'round';   // klebriger Faden zur Pfote
            ctx.beginPath(); ctx.moveTo(16, 8); ctx.quadraticCurveTo((hx + 16) / 2, 14, hx, 2); ctx.stroke();
            ctx.fillStyle = '#FFD36E';                              // herabtropfende Klekse
            ctx.beginPath(); ctx.arc(hx + 6, 14 + reach * 8, 4, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(hx - 8, 12 + reach * 5, 3, 0, 7); ctx.fill();
        }
    }

    // PUPSI Pups-Blast: umgedreht & gebückt — Hintern zeigt nach vorn (+x, zum Gegner),
    // Kopf nach hinten/unten, dicke braune Wolke schießt nach vorn. Lokaler Raum wie _drawCritter.
    _drawSquirrelFart(ctx, BODY, DARK, BELLY, ACC) {
        const prog = 1 - Math.max(0, this.kickTimer) / (this.kickDur || 0.32);      // 0 -> 1
        const push = Math.sin(prog * Math.PI);                    // Bück-Schwung 0..1..0

        // Beine: gespreizt aufgestützt (gebückt)
        ctx.strokeStyle = BODY; ctx.lineWidth = 13;
        ctx.beginPath(); ctx.moveTo(-2, 22); ctx.lineTo(-18, 50); ctx.lineTo(-22, 68); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, 24); ctx.lineTo(20, 50); ctx.lineTo(18, 68); ctx.stroke();
        ctx.fillStyle = DARK;
        ctx.beginPath(); ctx.roundRect(-31, 66, 20, 11, 5); ctx.fill();
        ctx.beginPath(); ctx.roundRect(9, 66, 20, 11, 5); ctx.fill();

        // Vorderpfötchen am Boden abgestützt (vorgebeugt) — vorne unten
        ctx.strokeStyle = DARK; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-30, 40); ctx.stroke();
        ctx.fillStyle = BELLY; ctx.beginPath(); ctx.arc(-30, 42, 5, 0, 7); ctx.fill();

        // Buschelschwanz hoch über dem Rücken (nach hinten/oben gekringelt)
        ctx.save(); ctx.fillStyle = DARK;
        ctx.beginPath(); ctx.moveTo(-6, -18);
        ctx.quadraticCurveTo(-44, -36, -30, -68);
        ctx.quadraticCurveTo(-16, -92, 14, -78);
        ctx.quadraticCurveTo(-8, -70, -8, -44);
        ctx.quadraticCurveTo(-4, -28, -6, -18); ctx.fill();
        ctx.fillStyle = BODY; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.ellipse(-22, -58, 8, 20, -0.5, 0, 7); ctx.fill();
        ctx.restore();

        // Rumpf schräg: Hintern dick nach vorn-oben (+x), Schultern nach hinten-unten (-x)
        ctx.save(); ctx.rotate(-0.5 - push * 0.15);
        ctx.fillStyle = BODY;
        ctx.beginPath(); ctx.ellipse(0, -2, 26, 30, 0, 0, 7); ctx.fill();
        ctx.fillStyle = BELLY; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.ellipse(-6, 2, 12, 18, 0, 0, 7); ctx.fill();
        ctx.restore();

        // dicker, runder Po nach vorn (+x) — Pups-Düse
        const buttX = 22 + push * 8;
        ctx.fillStyle = BODY;
        ctx.beginPath(); ctx.arc(buttX, 4, 20, 0, 7); ctx.fill();
        ctx.fillStyle = DARK; ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.ellipse(buttX + 8, 4, 7, 12, 0, 0, 7); ctx.fill();   // Po-Spalte-Schattierung
        ctx.globalAlpha = 1;

        // kleiner Kopf hinten unten (er bückt sich, schaut zwischen den Beinen durch)
        ctx.fillStyle = BODY; ctx.beginPath(); ctx.arc(-20, 16, 14, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-26, 14, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#2a1a0f'; ctx.beginPath(); ctx.arc(-27, 15, 2.2, 0, 7); ctx.fill();
        ctx.strokeStyle = DARK; ctx.lineWidth = 2;                                // schelmisches Grinsen
        ctx.beginPath(); ctx.arc(-22, 20, 5, 0.1, Math.PI - 0.1); ctx.stroke();

        // dicke braune Pups-Wolke nach vorn (+x) — deutlich sichtbar (zusätzlich zu Partikeln)
        ctx.save();
        const alpha = 0.55 + push * 0.35;
        const browns = ['rgba(138,90,44,A)', 'rgba(176,123,60,A)', 'rgba(202,160,106,A)'];
        const puffs = [[40, 2, 16], [58, -6, 13], [60, 14, 12], [78, 4, 15], [96, -4, 12], [98, 12, 11], [116, 4, 13]];
        puffs.forEach((p, i) => {
            ctx.fillStyle = browns[i % 3].replace('A', (alpha * (1 - i * 0.07)).toFixed(2));
            ctx.beginPath(); ctx.arc(p[0] + push * 26, p[1], p[2] * (0.6 + push * 0.6), 0, 7); ctx.fill();
        });
        ctx.restore();
    }

    // Tierkopf je nach Art (Ohren/Augen/Schnauze) — Kopfmitte bei (0, -42)
    _drawCritterHead(ctx, kind, BODY, DARK, BELLY, ACC) {
        const hx = 0, hy = -42, r = 21;

        // Ohren / Antennen HINTER dem Kopf
        if (kind === 'bunny') {                             // lange Hasenohren
            for (const sgn of [-1, 1]) {
                ctx.fillStyle = BODY; ctx.save(); ctx.translate(hx + sgn * 8, hy - 14); ctx.rotate(sgn * 0.18);
                ctx.beginPath(); ctx.ellipse(0, -30, 8, 32, 0, 0, 7); ctx.fill();
                ctx.fillStyle = ACC; ctx.beginPath(); ctx.ellipse(0, -30, 4, 24, 0, 0, 7); ctx.fill();
                ctx.restore();
            }
        } else if (kind === 'squirrel') {                   // runde Eichhörnchen-Ohren + Eichel-Mütze
            ctx.fillStyle = BODY;
            for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + sgn * 15, hy - 14, 8, 0, 7); ctx.fill(); }
        } else if (kind === 'bee') {                        // Antennen
            ctx.strokeStyle = DARK; ctx.lineWidth = 2.6;
            for (const sgn of [-1, 1]) {
                ctx.beginPath(); ctx.moveTo(hx + sgn * 7, hy - 16); ctx.quadraticCurveTo(hx + sgn * 16, hy - 32, hx + sgn * 22, hy - 30); ctx.stroke();
                ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(hx + sgn * 22, hy - 30, 3.5, 0, 7); ctx.fill();
            }
        } else if (kind === 'sloth' || kind === 'frog') {   // kleine runde Öhrchen / Frosch: Augen kommen oben drauf
            if (kind === 'sloth') { ctx.fillStyle = BODY; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + sgn * 17, hy - 8, 7, 0, 7); ctx.fill(); } }
        }

        // Kopf-Grundform
        ctx.fillStyle = BODY;
        ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.fill();

        if (kind === 'squirrel') {                          // Eichel-Mütze
            ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(hx, hy - r + 4, 16, Math.PI, 0); ctx.fill();
            ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(hx, hy - r + 2, 4, 0, 7); ctx.fill();
        }

        // Helle Schnauzen-/Wangenpartie
        ctx.fillStyle = BELLY;
        ctx.beginPath(); ctx.ellipse(hx, hy + 7, 13, 10, 0, 0, 7); ctx.fill();

        // Augen
        const eye = (ex, ey, er) => {
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill();
            ctx.fillStyle = '#2a1a0f'; ctx.beginPath(); ctx.arc(ex + er * 0.25, ey + er * 0.1, er * 0.55, 0, 7); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex + er * 0.5, ey - er * 0.3, er * 0.22, 0, 7); ctx.fill();
        };
        if (kind === 'frog') {                              // Frosch: dicke Glubschaugen OBEN auf dem Kopf
            for (const sgn of [-1, 1]) {
                ctx.fillStyle = BODY; ctx.beginPath(); ctx.arc(hx + sgn * 11, hy - r + 2, 11, 0, 7); ctx.fill();
                eye(hx + sgn * 11, hy - r + 1, 7);
            }
            ctx.strokeStyle = DARK; ctx.lineWidth = 2.6;    // breites Froschlächeln
            ctx.beginPath(); ctx.arc(hx, hy + 4, 13, 0.15, Math.PI - 0.15); ctx.stroke();
        } else if (kind === 'sloth') {                      // Faultier: dunkle Augenflecken, verschlafen
            ctx.fillStyle = DARK; ctx.globalAlpha = 0.5;
            for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + sgn * 8, hy - 1, 7, 9, sgn * 0.3, 0, 7); ctx.fill(); }
            ctx.globalAlpha = 1;
            for (const sgn of [-1, 1]) eye(hx + sgn * 8, hy, 4);
            ctx.strokeStyle = DARK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy + 9, 6, 0.2, Math.PI - 0.2); ctx.stroke();   // träges Lächeln
        } else {
            for (const sgn of [-1, 1]) eye(hx + sgn * 8, hy - 1, 5.5);
            // Nase + Mund
            ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(hx, hy + 6, 3.2, 0, 7); ctx.fill();
            ctx.strokeStyle = DARK; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(hx, hy + 7, 6, 0.25, Math.PI - 0.25); ctx.stroke();
            if (kind === 'squirrel' || kind === 'bunny') {  // Hasenzähnchen / Nagezähne
                ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(hx - 4, hy + 11, 8, 7, 1.5); ctx.fill();
                ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy + 11); ctx.lineTo(hx, hy + 18); ctx.stroke();
            }
        }
        // rosa Wangen
        ctx.fillStyle = 'rgba(255,140,170,0.5)';
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + sgn * 15, hy + 6, 4, 0, 7); ctx.fill(); }
    }

    // LINA die Blumenfee: süßer Kopf mit großen Augen, Lächeln, Blütenkranz
    _drawFairyHead(ctx, cx, cy, SKIN) {
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = '#FFCE7A';                                          // Haar (hinter dem Gesicht)
        ctx.beginPath(); ctx.arc(0, -1, 21, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#FFC152';                                          // Zöpfe seitlich
        ctx.beginPath(); ctx.arc(-18, 8, 7, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(18, 8, 7, 0, 6.3); ctx.fill();
        ctx.fillStyle = SKIN;                                              // Gesicht
        ctx.beginPath(); ctx.arc(0, 1, 16, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(255,150,190,0.6)';                          // rosa Wangen
        ctx.beginPath(); ctx.arc(-8, 6, 3.8, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 6, 3.8, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#43303f';                                         // große, süße Augen
        ctx.beginPath(); ctx.ellipse(-6, 0, 3.2, 4.6, 0, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.ellipse(6, 0, 3.2, 4.6, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#fff';                                            // Glanzpunkte
        ctx.beginPath(); ctx.arc(-5, -2, 1.3, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -2, 1.3, 0, 6.3); ctx.fill();
        ctx.strokeStyle = '#C24A6A'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';   // Lächeln
        ctx.beginPath(); ctx.arc(0, 5, 5, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
        const crownCols = ['#FF9FC9', '#FFD36E', '#FFFFFF', '#C9A0FF'];     // Blütenkranz oben
        for (let i = 0; i < 6; i++) {
            const ang = Math.PI + (i / 5) * Math.PI, fx = Math.cos(ang) * 19, fy = -1 + Math.sin(ang) * 19;
            ctx.fillStyle = crownCols[i % crownCols.length];
            for (let a = 0; a < 5; a++) { const aa = a * 1.2566; ctx.beginPath(); ctx.arc(fx + Math.cos(aa) * 3, fy + Math.sin(aa) * 3, 2, 0, 6.3); ctx.fill(); }
            ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, 6.3); ctx.fill();
        }
        ctx.restore();
    }

    // Böser Bad-Mario-Kopf: finsterer Blick, glühendes Auge, Narbe, fieser Schnauzer, Grinsen
    _drawHead(ctx, cx, cy, SKIN, SKINSH, RED, REDDK, MUST) {
        if (this.char && this.char.hat === 'crown') { this._drawFairyHead(ctx, cx, cy, SKIN); return; }
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = SKIN;                                                // Gesicht
        ctx.beginPath(); ctx.roundRect(-17, -15, 34, 37, 11); ctx.fill();
        ctx.beginPath(); ctx.arc(-15, 6, 6, 0, 7); ctx.fill();              // Ohr
        ctx.beginPath(); ctx.arc(16, 5, 8, 0, 7); ctx.fill();              // Nase
        ctx.fillStyle = SKINSH; ctx.beginPath(); ctx.arc(17, 7, 4.5, 0, 7); ctx.fill();
        // Bartstoppeln
        ctx.fillStyle = 'rgba(20,10,2,0.45)';
        for (let i = 0; i < 16; i++) ctx.fillRect(-12 + (i % 6) * 5, 9 + ((i * 5) % 9), 1.6, 1.6);
        // dunkle Augenhöhle + glühend rotes Auge (böse)
        ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(6, -4, 9, 8, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5, -3, 4.5, 5.5, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.shadowBlur = 7; ctx.shadowColor = '#ff2a00';
        ctx.fillStyle = '#e21000'; ctx.beginPath(); ctx.arc(6, -3, 3, 0, 7); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(7, -3, 1.5, 0, 7); ctx.fill();
        // steile, zornige Augenbraue (V zur Nase)
        ctx.save(); ctx.translate(4, -9); ctx.rotate(-0.55);
        ctx.fillStyle = MUST; ctx.fillRect(-9, -3, 21, 6); ctx.restore();
        // Narbe übers Auge
        ctx.strokeStyle = '#9a5238'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(1, -14); ctx.lineTo(11, 3); ctx.stroke();
        // fieser, spitzer Schnauzer
        ctx.fillStyle = MUST; ctx.beginPath();
        ctx.moveTo(-5, 8); ctx.quadraticCurveTo(15, 5, 27, 10);
        ctx.quadraticCurveTo(22, 14, 15, 13); ctx.quadraticCurveTo(20, 17, 11, 17);
        ctx.quadraticCurveTo(3, 17, -5, 13); ctx.closePath(); ctx.fill();
        ctx.fillRect(-15, -2, 5, 12);                                       // Koteletten
        // fieses Grinsen mit Zähnen (unter dem Schnauzer)
        ctx.fillStyle = '#160803'; ctx.beginPath(); ctx.roundRect(1, 17, 15, 5, 2); ctx.fill();
        ctx.fillStyle = '#e8e0c0'; ctx.fillRect(4, 17, 3, 4); ctx.fillRect(9, 17, 3, 4); ctx.fillRect(13, 18, 2, 3);
        ctx.fillStyle = 'rgba(120,0,0,0.6)'; ctx.beginPath(); ctx.arc(22, 12, 1.8, 0, 7); ctx.fill(); // Blutspritzer am Schnauzer
        if (this.char && this.char.beard) {
            // Chuck: ikonischer Vollbart (überdeckt Schnauzer/Grinsen)
            ctx.fillStyle = '#3a2412';
            ctx.beginPath();
            ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-17, 18, -2, 24);
            ctx.quadraticCurveTo(14, 25, 19, 6);
            ctx.lineTo(14, 7); ctx.quadraticCurveTo(9, 15, 1, 15);
            ctx.quadraticCurveTo(-7, 15, -11, 2); ctx.closePath(); ctx.fill();
            ctx.fillRect(-7, 3, 24, 5);                                      // Schnauzteil
            ctx.fillStyle = '#2a1a0c';                                       // Bart-Struktur
            for (let i = 0; i < 5; i++) ctx.fillRect(-10 + i * 5, 12 + (i % 2) * 3, 2, 6);
        }
        if (this.char && this.char.hat === 'spikes') {
            // Stachel-"Frisur" (Überraschungs-Charakter) statt Mütze
            ctx.fillStyle = RED;
            ctx.beginPath();
            ctx.moveTo(-20, -8);
            ctx.lineTo(-26, -26); ctx.lineTo(-12, -16);
            ctx.lineTo(-16, -34); ctx.lineTo(-2, -18);
            ctx.lineTo(-2, -38); ctx.lineTo(10, -16);
            ctx.lineTo(16, -32); ctx.lineTo(18, -10);
            ctx.closePath(); ctx.fill();
        } else if (this.char && this.char.hat === 'headband') {
            // Chuck: zurückgekämmtes Haar + rotes Stirnband mit flatternden Enden
            ctx.fillStyle = '#3a2412';
            ctx.beginPath(); ctx.roundRect(-19, -27, 38, 17, 7); ctx.fill();        // Haar
            ctx.fillStyle = '#c0202a'; ctx.fillRect(-20, -16, 40, 8);               // Stirnband
            ctx.fillStyle = '#8a1018'; ctx.fillRect(-20, -10, 40, 2);
            ctx.fillStyle = '#c0202a';                                              // Band-Enden hinten
            ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(-32, -7); ctx.lineTo(-29, -2); ctx.lineTo(-18, -8); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-18, -10); ctx.lineTo(-31, -2); ctx.lineTo(-28, 3); ctx.lineTo(-18, -4); ctx.closePath(); ctx.fill();
        } else {
            // Mütze (tief über die Augen für finsteren Blick)
            ctx.fillStyle = RED; ctx.beginPath(); ctx.roundRect(-20, -27, 40, 17, 8); ctx.fill();
            ctx.beginPath(); ctx.roundRect(7, -15, 24, 7, 3); ctx.fill();       // Schirm tief
            ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-17, -11, 30, 4);  // Schattenkante unter dem Schirm
            ctx.fillStyle = REDDK; ctx.fillRect(-20, -12, 40, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(-10, -20, 5, 3, 0, 0, 7); ctx.fill(); // abgewetzte Stelle
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -18, 6, 0, 7); ctx.fill(); // Emblem
            ctx.fillStyle = RED; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText((this.char && this.char.name[0]) || 'M', -3, -17.5); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }
        ctx.restore();
    }

    draw(ctx, camX, camY) {
        if (!this.isDead && this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 15) % 2 === 0) return;
        let frame = 0;
        if (this.state === 'WALK') frame = Math.floor(this.animTimer * 10) % 8;
        else if (this.state === 'AIR') frame = 2;
        else if (this.state === 'CLIMB') frame = Math.floor(this.animTimer * 5) % 2 === 0 ? 3 : 4; 
        else if (this.state === 'CROUCH') frame = 6; 

        let maxCd = 0.4;
        if (this.weapon === 'PISTOL') maxCd = 0.25; else if (this.weapon === 'UZI') maxCd = 0.05; else if (this.weapon === 'ROCKET') maxCd = 1.0;
        else if (this.weapon === 'CHAINSAW') maxCd = 0.08; else if (this.weapon === 'SHOTGUN') maxCd = 0.8; else if (this.weapon === 'ASSAULT_RIFLE') maxCd = 0.08;
        else if (this.weapon === 'MINIGUN') maxCd = 0.02; else if (this.weapon === 'GRENADE') maxCd = 1.0;
        else if (this.weapon === 'FLAMETHROWER') maxCd = 0.04;

        let progress = Math.max(0, Math.min(1, this.shootCooldown > 0 ? this.shootCooldown / maxCd : 0));
        let isMelee = ['KNIFE', 'AXE', 'BAT', 'CHAINSAW'].includes(this.weapon);
        let lunge = 0;
        if (isMelee && progress > 0) {
            if (this.weapon === 'KNIFE') lunge = Math.sin((1 - progress) * Math.PI) * 40;
            else if (this.weapon === 'BAT' || this.weapon === 'AXE') lunge = Math.sin((1 - progress) * Math.PI) * 60;
        }

        ctx.save(); 
        if (this.isDead) {
            ctx.translate(this.x - camX + this.w / 2, this.y - camY + this.h);
            ctx.rotate(this.facingRight ? -Math.PI/2 : Math.PI/2);
            ctx.translate(0, -this.h/2);
        } else {
            ctx.translate(this.x - camX + this.w / 2 + (this.facingRight ? lunge : -lunge), this.y - camY + this.h / 2);
        }
        // Roundhouse: Drehung um die EIGENE (senkrechte) Achse — in 2D-Seitenansicht als
        // horizontale Stauchung (Pirouette), Körper bleibt aufrecht, kein Überschlag.
        const kicking = this.kickTimer > 0 && this.char.roundhouse;
        if (kicking && !this.isDead) {
            const prog = 1 - Math.max(0, this.kickTimer) / (this.kickDur || 0.32);          // 0 -> 1
            let sx = Math.cos(prog * Math.PI * 2) * (this.facingRight ? 1 : -1);
            sx = sx >= 0 ? Math.max(0.08, sx) : Math.min(-0.08, sx);      // nie ganz flach (degeneriert)
            ctx.scale(sx, 1);
        } else if (!this.facingRight) {
            ctx.scale(-1, 1);
        }
        // Im Classic-Modus ist der Spieler kleiner (standH < 140): Grafik mitskalieren
        // und die Füße exakt auf die Hitbox-Unterkante (Bodenlinie) setzen.
        const vis = this.standH / 140;
        if (!this.isDead) { ctx.translate(0, this.h / 2 - 82.8 * vis + 5); ctx.scale(vis, vis); } // Schuhe exakt auf Bodenlinie (+5px Feinabgleich); vis=1 in Story = neutral
        ctx.save();
        if (this.char.kind) this._drawCritter(ctx, frame);   // Tier-Figuren (Eichhörnchen/Faultier/Hummel/Hase/Frosch)
        else this.drawMarioBody(ctx, frame);                 // Feen-/Menschfigur (Lina); Star-Flash intern
        ctx.restore();
        
        ctx.scale(1.5, 1.5);
        let up = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyW') || window.inputHandlerRef.isDown('ArrowUp'));
        let down = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyS') || window.inputHandlerRef.isDown('ArrowDown'));
        let right = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyD') || window.inputHandlerRef.isDown('ArrowRight'));
        let left = window.inputHandlerRef && (window.inputHandlerRef.isDown('KeyA') || window.inputHandlerRef.isDown('ArrowLeft'));
        let side = right || left;

        let cycle = (this.state === 'WALK') ? (frame / 8) * Math.PI * 2 : 0;
        let walkArmAngle = Math.sin(cycle + Math.PI) * 0.5; 
        let walkBob = -Math.abs(Math.sin(cycle)) * 5;
        if (this.isCrouching) walkBob += 20; 

        let sX = 0, sY = -21;                         // Schulter etwas tiefer (gibt den Mund frei)
        if (this.char.kind) sY = -8;                  // Tierchen: Körper sitzt tiefer -> Schulter/Arm tiefer ansetzen
        if (this.isCrouching) { sX = 1; sY = this.char.kind ? 2 : 1; }   // Hocke: Schulter auf Brusthöhe der Hocke
        sY += walkBob;
        
        let attackRot = 0, distHand = 45;
        if (this.state === 'CLIMB') { attackRot = -Math.PI / 2; distHand = 30; }
        else if (isMelee) {
            attackRot = walkArmAngle;
            if (this.weapon === 'KNIFE') {
                let t = 1 - progress;
                if (progress > 0) {
                    if (t < 0.2) { attackRot = -Math.PI/4 * (t/0.2); distHand = 30 + 10*(t/0.2); }
                    else if (t < 0.4) { let thrust = (t-0.2)/0.2; attackRot = -Math.PI/4 + (Math.PI/2)*thrust; distHand = 40 + 40*thrust; }
                    else { let rec = (t-0.4)/0.6; attackRot = Math.PI/4 * (1-rec); distHand = 80 * (1-rec/2); }
                } 
            } 
            else if (this.weapon === 'AXE' || this.weapon === 'BAT') {
                let t = 1 - progress;
                if (progress > 0) {
                    if (t < 0.3) { let wind = t/0.3; attackRot = -Math.PI/4 - Math.PI*0.6*wind; distHand = 45 + 10*wind; }
                    else { let smash = Math.min(1, (t-0.3)/0.3); attackRot = -Math.PI*0.85 + Math.PI*1.6*smash; distHand = 55; }
                } else { attackRot = Math.PI/8 + walkArmAngle * 0.5; distHand = 40; }  // Schläger näher am Körper halten
            }
            else if (this.weapon === 'CHAINSAW') {
                attackRot = Math.PI / 12 + walkArmAngle * 0.2;
                distHand = 45 + (progress > 0 ? 20 : 0);
            }
        } else {
            distHand = 28; // Schusswaffen näher am Körper halten (nicht so weit vorgestreckt)
            attackRot = progress * -0.2 + walkArmAngle * 0.1;
            if (up && side) attackRot -= Math.PI / 4; 
            else if (down && side && !this.grounded) attackRot += Math.PI / 4;
            else if (up) attackRot -= Math.PI / 2.1;
            else if (down && !this.grounded) attackRot += Math.PI / 2.1;
        }

        if (kicking && !this.isDead) { attackRot = -Math.PI / 2; distHand = 48; }   // Roundhouse: Waffe nach oben recken

        let fhx = sX + Math.cos(attackRot) * distHand;
        let fhy = sY + Math.sin(attackRot) * distHand;

        const drawArm = (sx, sy, hx, hy) => {
            let dx = hx - sx, dy = hy - sy;
            let d = Math.max(0.1, Math.hypot(dx, dy));
            let L1 = 20, L2 = 20; 
            if (d > L1 + L2 - 0.5) { hx = sx + (dx/d)*(L1+L2 - 0.5); dy = sy + (dy/d)*(L1+L2 - 0.5); dx = hx - sx; dy = hy - sy; d = L1 + L2 - 0.5; }
            let a = Math.max(-1, Math.min(1, (L1*L1 + d*d - L2*L2) / (2*L1*d)));
            let angleOffset = Math.acos(a);
            let angle1 = Math.atan2(dy, dx) + angleOffset; 
            let ex = sx + Math.cos(angle1) * L1, ey = sy + Math.sin(angle1) * L1;
            ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.lineWidth = 14; ctx.strokeStyle = this.char.shirtDk; ctx.stroke();   // Ärmel in Charakterfarbe
            ctx.lineWidth = 10; ctx.strokeStyle = this.char.shirt; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy);
            ctx.lineWidth = 10; ctx.strokeStyle = '#C18D5D'; ctx.stroke();
            ctx.lineWidth = 6; ctx.strokeStyle = '#E8B682'; ctx.stroke();
            ctx.fillStyle = '#C18D5D'; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        };

        // Arm/Hand ZUERST zeichnen, damit die Waffe darüber liegt (Hand verdeckt sie nicht mehr)
        if (!this.isDead) drawArm(sX, sY, fhx, fhy);

        ctx.save();
        ctx.translate(fhx, fhy);
        ctx.rotate(attackRot);
        ctx.scale(isMelee ? 0.92 : 0.8, isMelee ? 0.92 : 0.8); // Waffen insgesamt etwas kleiner

        if (!this.isDead) {
            if (this.weapon === 'KNIFE') {
                // --- Zuckerstange (rot-weiß gestreift) ---
                ctx.translate(-2, -8); ctx.lineCap = 'round';
                const cane = () => { ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, -20); ctx.quadraticCurveTo(0, -34, 13, -34); ctx.quadraticCurveTo(24, -34, 24, -22); };
                ctx.lineWidth = 10; ctx.strokeStyle = '#FF5E7A'; cane(); ctx.stroke();
                ctx.lineWidth = 10; ctx.strokeStyle = '#FFFFFF'; ctx.setLineDash([6, 6]); cane(); ctx.stroke(); ctx.setLineDash([]);
            } else if (this.weapon === 'BAT') {
                // --- Kuschelstab: Pastell-Zauberstab mit Plüsch-Stern ---
                ctx.translate(0, -6);
                ctx.fillStyle = '#C9A0FF'; ctx.beginPath(); ctx.roundRect(-3, -40, 6, 62, 3); ctx.fill();   // Stiel
                ctx.fillStyle = '#E0C8FF'; ctx.fillRect(-3, -40, 2, 62);                                    // Glanzkante
                ctx.strokeStyle = '#FF9FC9'; ctx.lineWidth = 2;                                             // Bändchen
                ctx.beginPath(); ctx.moveTo(0, -36); ctx.quadraticCurveTo(11, -30, 6, -20); ctx.stroke();
                ctx.save(); ctx.translate(0, -52);                                                          // Plüsch-Stern oben
                ctx.rotate(Math.sin(performance.now() / 500) * 0.15);
                ctx.fillStyle = '#FFE56B'; ctx.beginPath();
                for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 === 0) ? 20 : 9; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#FFF6C8'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 6.3); ctx.fill();           // Glanzkern
                ctx.fillStyle = '#FFFFFF';                                                                  // Glitzer
                ctx.beginPath(); ctx.arc(14, -12, 2, 0, 6.3); ctx.arc(-15, -8, 1.6, 0, 6.3); ctx.arc(10, 16, 1.6, 0, 6.3); ctx.fill();
                ctx.restore();
            } else if (this.weapon === 'AXE') {
                // --- Lolli-Hammer (Bonbon-Kopf am Stiel mit Spirale) ---
                ctx.translate(0, 16);
                ctx.fillStyle = '#E0C8FF'; ctx.fillRect(-4, -40, 8, 70);          // Stiel
                ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-4, -40, 2, 70);
                ctx.save(); ctx.translate(0, -46); ctx.rotate(performance.now() / 700);
                ctx.fillStyle = '#FF9FC9'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.3); ctx.fill();   // Lolli
                ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;                   // Spirale
                ctx.beginPath(); for (let a = 0; a < 13; a += 0.2) { const r = a * 1.55; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
                ctx.restore();
            } else if (this.weapon === 'CHAINSAW') {
                // --- Kitzelfeder (flauschige Feder) ---
                ctx.translate(-6, 0);
                const ft = performance.now() / 300;
                ctx.save(); ctx.rotate(-0.4 + Math.sin(ft) * 0.05);
                ctx.strokeStyle = '#FFE0A8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(64, -30); ctx.stroke();   // Kiel
                for (let i = 0; i < 10; i++) { const x = -6 + i * 6.5, y = 14 - i * 4.8;
                    ctx.fillStyle = i % 2 ? '#C9A0FF' : '#FFC2E2';
                    ctx.beginPath(); ctx.ellipse(x, y, 12 - i * 0.4, 6, -0.7, 0, 6.3); ctx.fill(); }
                ctx.restore();
            } else if (this.weapon === 'PISTOL') {
                // --- Wasserspritzpistole (knallbunt) ---
                ctx.fillStyle = '#FF6FA8'; ctx.beginPath(); ctx.roundRect(-12, -10, 30, 12, 4); ctx.fill();   // Korpus
                ctx.fillStyle = '#FFC2E2'; ctx.fillRect(-12, -10, 30, 3);                                      // Highlight
                ctx.fillStyle = '#7FE3FF'; ctx.beginPath(); ctx.roundRect(16, -8, 15, 7, 3); ctx.fill();       // Düse
                ctx.fillStyle = '#FF6FA8'; ctx.beginPath(); ctx.roundRect(-8, 0, 9, 18, 3); ctx.fill();        // Griff
                ctx.fillStyle = '#9FE8D0'; ctx.beginPath(); ctx.arc(-2, -16, 7, 0, 6.3); ctx.fill();           // Wassertank
                ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-4, -18, 2.4, 0, 6.3); ctx.fill();
                ctx.strokeStyle = '#C24A8A'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(2, 6, 5, Math.PI*0.1, Math.PI*0.9); ctx.stroke(); // Abzugsbügel
            } else if (this.weapon === 'UZI') {
                // --- Seifenblasen-Pistole ---
                ctx.fillStyle = '#7FE3FF'; ctx.beginPath(); ctx.roundRect(-16, -12, 38, 20, 6); ctx.fill();   // Korpus
                ctx.fillStyle = '#BFF0FF'; ctx.fillRect(-16, -12, 38, 3);
                ctx.fillStyle = '#5AC8E8'; ctx.beginPath(); ctx.roundRect(-12, 4, 9, 16, 3); ctx.fill();      // Griff
                ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(30, -2, 10, 0, 6.3); ctx.stroke();   // Blasenring
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath(); ctx.arc(44, -6, 4, 0, 6.3); ctx.arc(52, -12, 3, 0, 6.3); ctx.arc(40, 2, 2.5, 0, 6.3); ctx.fill();
            } else if (this.weapon === 'SHOTGUN') {
                // --- Bonbonkanone (dicke bunte Röhre) ---
                ctx.fillStyle = '#C9A0FF'; ctx.beginPath(); ctx.roundRect(-30, -9, 40, 18, 6); ctx.fill();   // Korpus
                ctx.fillStyle = '#E0C8FF'; ctx.fillRect(-30, -9, 40, 3);                                     // Highlight
                ctx.fillStyle = '#FF9FC9'; ctx.beginPath(); ctx.roundRect(8, -11, 26, 22, 8); ctx.fill();    // weite Mündung
                ctx.fillStyle = '#9FE8D0'; ctx.fillRect(12, -11, 4, 22); ctx.fillStyle = '#7FE3FF'; ctx.fillRect(20, -11, 4, 22); // Streifen
                ctx.fillStyle = '#FFE56B'; ctx.beginPath(); ctx.arc(30, 0, 8, 0, 6.3); ctx.fill();           // Bonbon in der Mündung
                ctx.fillStyle = '#C9A0FF'; ctx.beginPath(); ctx.roundRect(-20, 6, 10, 16, 3); ctx.fill();    // Griff
            } else if (this.weapon === 'ASSAULT_RIFLE') {
                // --- Wattebäuschchen-Werfer (mint) ---
                ctx.fillStyle = '#9FE8D0'; ctx.beginPath(); ctx.roundRect(-30, -9, 50, 18, 6); ctx.fill();   // Korpus
                ctx.fillStyle = '#C8F5E6'; ctx.fillRect(-30, -9, 50, 3);
                ctx.fillStyle = '#7FD0B8'; ctx.beginPath(); ctx.roundRect(-26, 6, 26, 7, 3); ctx.fill();      // Magazin
                ctx.fillStyle = '#7FD0B8'; ctx.beginPath(); ctx.roundRect(-12, 6, 9, 16, 3); ctx.fill();      // Griff
                ctx.fillStyle = '#7FD0B8'; ctx.beginPath(); ctx.roundRect(16, -11, 14, 22, 6); ctx.fill();    // weite Mündung
                ctx.fillStyle = '#FFFFFF';                                                                    // Wattebausch
                for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; ctx.beginPath(); ctx.arc(30 + Math.cos(a) * 5, Math.sin(a) * 5, 7, 0, 6.3); ctx.fill(); }
            } else if (this.weapon === 'MINIGUN') {
                // --- Glitzer-Schleuder (Sternchen-Streuer) ---
                ctx.fillStyle = '#C9A0FF'; ctx.beginPath(); ctx.ellipse(-8, 0, 22, 22, 0, 0, 6.3); ctx.fill();   // runde Trommel
                ctx.fillStyle = '#E0C8FF'; ctx.beginPath(); ctx.arc(-12, -6, 8, 0, 6.3); ctx.fill();
                ctx.fillStyle = '#9B6CD0'; ctx.beginPath(); ctx.roundRect(8, -10, 40, 20, 8); ctx.fill();         // Streurohr
                const gt = performance.now() / 200;                                                               // Sternchen am Auslass
                ctx.fillStyle = '#FFE56B';
                for (let i = 0; i < 3; i++) { const a = gt + i * 2.1, x = 50 + Math.cos(a) * 6, y = Math.sin(a) * 8;
                    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
                    ctx.beginPath(); for (let k = 0; k < 10; k++) { const aa = -Math.PI / 2 + k * Math.PI / 5, r = (k % 2 === 0) ? 6 : 2.6; ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
                ctx.fillStyle = '#9B6CD0'; ctx.beginPath(); ctx.roundRect(-22, 6, 12, 16, 3); ctx.fill();          // Griff
            } else if (this.weapon === 'ROCKET') {
                // --- Riesen-Wattebausch-Werfer ---
                ctx.fillStyle = '#FFB3DC'; ctx.beginPath(); ctx.roundRect(-34, -12, 78, 24, 10); ctx.fill();      // Rohr
                ctx.fillStyle = '#FFD0E8'; ctx.fillRect(-34, -12, 78, 4);
                ctx.fillStyle = '#E86FB0'; ctx.beginPath(); ctx.moveTo(-34, -13); ctx.lineTo(-46, -18); ctx.lineTo(-46, 18); ctx.lineTo(-34, 13); ctx.closePath(); ctx.fill(); // Trichter
                ctx.fillStyle = '#FFFFFF';                                                                          // geladener Wattebausch
                for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; ctx.beginPath(); ctx.arc(50 + Math.cos(a) * 8, Math.sin(a) * 8, 11, 0, 6.3); ctx.fill(); }
                ctx.fillStyle = '#FFC2E2'; ctx.beginPath(); ctx.arc(50, 0, 8, 0, 6.3); ctx.fill();
                ctx.fillStyle = '#E86FB0'; ctx.fillRect(0, 9, 22, 8);            // Griff
            } else if (this.weapon === 'MOLOTOV') {
                // --- Seifenblase (zum Werfen) ---
                ctx.fillStyle = 'rgba(127,227,255,0.5)'; ctx.beginPath(); ctx.arc(0, -2, 13, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#BFF0FF'; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(-4, -7, 4, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(255,182,222,0.5)'; ctx.beginPath(); ctx.arc(4, 2, 4, 0, Math.PI*2); ctx.fill();
            } else if (this.weapon === 'GRENADE') {
                // --- Puddingwerfer (Pudding-Becher mit Sahne) ---
                ctx.fillStyle = '#FFD9A0'; ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(11, -8); ctx.lineTo(8, 14); ctx.lineTo(-8, 14); ctx.closePath(); ctx.fill();  // Becher
                ctx.fillStyle = '#C98A4A'; ctx.beginPath(); ctx.ellipse(0, -8, 11, 4, 0, 0, Math.PI*2); ctx.fill();   // Pudding
                ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, -10, 5, Math.PI, 0); ctx.fill();               // Sahnehaube
                ctx.fillStyle = '#FF5E7A'; ctx.beginPath(); ctx.arc(0, -14, 2.6, 0, Math.PI*2); ctx.fill();           // Kirsche
            } else if (this.weapon === 'FLAMETHROWER') {
                // --- Seifenblasen-Bläser ---
                ctx.fillStyle = '#7FE3FF'; ctx.beginPath(); ctx.ellipse(-16, 2, 14, 20, 0, 0, Math.PI*2); ctx.fill(); // Seifentank
                ctx.fillStyle = '#BFF0FF'; ctx.beginPath(); ctx.ellipse(-19, -4, 6, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#5AC8E8'; ctx.fillRect(2, -6, 48, 12);            // Rohr
                ctx.fillStyle = '#9FE8D0'; ctx.beginPath(); ctx.roundRect(50, -10, 12, 20, 5); ctx.fill();           // Düse
                ctx.fillStyle = 'rgba(255,255,255,0.7)';                                                              // Bläschen
                ctx.beginPath(); ctx.arc(70, -4, 5, 0, Math.PI*2); ctx.arc(80, -12, 4, 0, Math.PI*2); ctx.arc(74, 6, 3, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#5AC8E8'; ctx.fillRect(-6, 0, 12, 12);           // Griff
            }


            if (this.flashTimer > 0 && this.weapon !== 'GRENADE') {
                let flashX = ['ROCKET', 'MINIGUN', 'ASSAULT_RIFLE', 'FLAMETHROWER', 'SHOTGUN'].includes(this.weapon) ? 70 : 35;
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.beginPath(); ctx.arc(flashX, -2, 12 + Math.random()*14, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(255,159,201,0.6)';
                ctx.beginPath(); ctx.arc(flashX, -2, 8 + Math.random()*8, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();

        ctx.restore();

        // --- Jetpack: Rucksack, Düsenflamme & Treibstoffanzeige (Bildschirmkoordinaten) ---
        if (this.hasJetpack && !this.isDead) {
            const sx = this.x - camX, sy = this.y - camY, w = this.w, h = this.h;
            const bx = this.facingRight ? sx - 12 : sx + w - 4;     // Tank auf dem Rücken
            ctx.fillStyle = '#b8bcc4'; ctx.fillRect(bx, sy + h * 0.26, 16, h * 0.42);
            ctx.fillStyle = '#7a7e86'; ctx.fillRect(bx + (this.facingRight ? 11 : 0), sy + h * 0.26, 5, h * 0.42);
            ctx.fillStyle = '#e02828'; ctx.fillRect(bx, sy + h * 0.26, 16, 5);   // roter Deckel
            if (this.jetpackActive) {                              // Düsenflamme
                const fx = bx + 8, fy = sy + h * 0.68;
                ctx.fillStyle = '#ffd23a';
                ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx, fy + 26 + Math.random() * 16); ctx.lineTo(fx + 8, fy); ctx.fill();
                ctx.fillStyle = '#ff7a18';
                ctx.beginPath(); ctx.moveTo(fx - 4, fy); ctx.lineTo(fx, fy + 16 + Math.random() * 10); ctx.lineTo(fx + 4, fy); ctx.fill();
            }
            // Treibstoffbalken über dem Kopf
            const by = sy - 16, f = this.jetpackFuel / this.jetpackMax;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, by, w, 8);
            ctx.fillStyle = f > 0.3 ? '#33d6ff' : '#ff5454'; ctx.fillRect(sx + 1, by + 1, (w - 2) * Math.max(0, f), 6);
        }

        // --- PUPSI: Pups-Vorrat-Balken (wie Jetpack) — sichtbar im Flug oder solange nicht voll ---
        if (this.char.fartFly && !this.isDead && (!this.grounded || this.fartFuel < this.fartMax - 0.01)) {
            const sx = this.x - camX, sy = this.y - camY, w = this.w;
            const by = sy - 16, f = this.fartFuel / this.fartMax;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, by, w, 8);
            ctx.fillStyle = f > 0.3 ? '#b07b3c' : '#ff5454'; ctx.fillRect(sx + 1, by + 1, (w - 2) * Math.max(0, f), 6);   // braun = Pups
        }

    }
}