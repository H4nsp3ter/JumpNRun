class SpriteGenerator {
        static generate(type, variant = null, level = 1) {
        // Größerer Canvas für alle Entities, um Clipping zu vermeiden
        const W = 512;
        const H = 512;
        const FRAMES = type === 'ITEM' ? 1 : 8; 
        
        const cvs = document.createElement('canvas');
        cvs.width = W * FRAMES; cvs.height = H;
        const ctx = cvs.getContext('2d');
        ctx.imageSmoothingEnabled = true; 

        for (let f = 0; f < FRAMES; f++) {
            ctx.save();
            
            // Zentrierung und Grundskalierung
            ctx.translate(f * W + W / 2, H / 2);
            
            if (type === 'PLAYER') {
                ctx.translate(0, 40);
                ctx.scale(2, 2);
            } else if (type === 'ITEM') {
                ctx.scale(2.5, 2.5); // Items deutlich größer im Canvas
            } else {
                // Enemies
                ctx.translate(0, 80);
                ctx.scale(2, 2);
            }
            
            const cycle = type === 'ITEM' ? 0 : (f / FRAMES) * Math.PI * 2;
            let legAngle = Math.sin(cycle) * 0.9;
            let armAngle = Math.sin(cycle + Math.PI) * 0.9;
            let bob = type === 'ITEM' ? 0 : -Math.abs(Math.sin(cycle)) * 16;

            if (type === 'PLAYER') {
                legAngle = Math.sin(cycle) * 1.3;
                armAngle = Math.sin(cycle + Math.PI) * 1.3;
            } else if (type === 'SOLDIER') {
                legAngle = Math.sin(cycle) * 1.1;
                armAngle = Math.sin(cycle + Math.PI) * 1.1; 
            } else if (type === 'SPIDER') {
                bob = -Math.abs(Math.sin(cycle * 2)) * 20; 
            } else if (type === 'ZOMBIE') {
                if (variant === 'RUNNER') {
                    legAngle = Math.sin(cycle * 2) * 1.5; 
                    bob = -Math.abs(Math.sin(cycle * 2)) * 10;
                } else if (variant === 'TANK' || variant === 'GIANT') {
                    legAngle = Math.sin(cycle * 0.5) * 0.6; 
                    bob = -Math.abs(Math.sin(cycle * 0.5)) * 5;
                } else if (variant === 'CRAWLER') {
                    legAngle = Math.sin(cycle) * 0.5;
                    armAngle = Math.sin(cycle) * 0.8; 
                    bob = -Math.abs(Math.sin(cycle)) * 5;
                } else {
                    bob = -Math.abs(Math.sin(cycle)) * 10; 
                }
            }
            
            ctx.translate(0, bob);

            const drawMuscle = (x, y, r1, r2, color, rot=0) => {
                ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
                ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, r1, r2, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            };

            if (type === 'PLAYER') {
                const isSkel = variant === 'SKELETON'; 
                const skin = isSkel ? '#FFF' : '#E8B682', skinShadow = isSkel ? '#CCC' : '#C18D5D', deepShadow = isSkel ? '#555' : '#905A32';
                const shirt = isSkel ? '#500' : '#D11100', shirtShadow = isSkel ? '#300' : '#8A0500';
                const overalls = isSkel ? '#002255' : '#0044CC', overallsShadow = isSkel ? '#001133' : '#002277', deepBlue = isSkel ? '#000' : '#001144'; 
                const shoes = '#331100', shoesShadow = '#110000'; 
                
                if (isSkel) { ctx.shadowBlur = 40; ctx.shadowColor = '#FF4400'; }

                ctx.save(); ctx.translate(-5, 20); ctx.rotate(-legAngle);
                if(isSkel) { drawMuscle(-5, 10, 8, 30, skinShadow); drawMuscle(-5, 40, 6, 25, skinShadow); } 
                else {
                    ctx.fillStyle = overallsShadow; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-25, 50); ctx.lineTo(15, 50); ctx.lineTo(20, -10); ctx.fill();
                    ctx.fillStyle = deepBlue; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 50); ctx.lineTo(15, 50); ctx.lineTo(20, -10); ctx.fill();
                }
                ctx.fillStyle = shoesShadow; ctx.beginPath(); ctx.ellipse(-10, 60, 26, 18, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-20, 68, 22, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();

                if (isSkel) {
                    drawMuscle(0, -25, 10, 35, skinShadow); 
                    for(let i=0; i<4; i++) { ctx.fillStyle = skin; ctx.fillRect(-25, -40 + i*12, 50, 6); }
                } else {
                    drawMuscle(-12, -40, 35, 45, shirtShadow); drawMuscle(-14, -40, 22, 18, shirt); drawMuscle(14, -40, 22, 18, shirt);
                    ctx.fillStyle = shirtShadow; ctx.beginPath(); ctx.ellipse(-16, -26, 18, 8, -0.2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(16, -26, 18, 8, 0.2, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = shirt; ctx.fillRect(-20, -25, 40, 35); 
                    for(let i=0; i<3; i++) { ctx.fillStyle = shirtShadow; ctx.beginPath(); ctx.ellipse(-10, -14 + i*12, 9, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(10, -14 + i*12, 9, 3, 0, 0, Math.PI*2); ctx.fill(); }
                    ctx.fillStyle = shirtShadow; ctx.fillRect(-2, -25, 4, 38); 

                    ctx.fillStyle = overallsShadow; ctx.beginPath(); ctx.moveTo(-35, 5); ctx.quadraticCurveTo(0, -10, 35, 5); ctx.lineTo(30, 30); ctx.lineTo(-30, 30); ctx.fill();
                    ctx.fillStyle = overalls; ctx.beginPath(); ctx.moveTo(-30, 5); ctx.quadraticCurveTo(0, -5, 30, 5); ctx.lineTo(25, 30); ctx.lineTo(-25, 30); ctx.fill();

                    ctx.lineWidth = 12; ctx.strokeStyle = overalls; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-16, -38); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(16, -38); ctx.stroke();
                    drawMuscle(-16, -38, 6, 6, '#FFD700'); drawMuscle(16, -38, 6, 6, '#FFD700');
                }

                ctx.save(); ctx.translate(0, -85); ctx.rotate(Math.sin(cycle*2)*0.05); 
                if (isSkel) {
                    drawMuscle(0, 0, 24, 26, skin); ctx.fillStyle = '#000'; 
                    ctx.beginPath(); ctx.ellipse(-10, -5, 8, 10, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(10, -5, 8, 10, 0, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(0, 10, 5, 8, 0, 0, Math.PI*2); ctx.fill(); for(let i=0; i<4; i++) ctx.fillRect(-15 + i*8, 20, 4, 8); 
                } else {
                    drawMuscle(0, 0, 26, 28, skin); drawMuscle(10, 0, 24, 26, skin); drawMuscle(0, 12, 28, 20, skinShadow); 
                    drawMuscle(28, 5, 12, 12, '#FF9999'); drawMuscle(30, 8, 8, 8, '#CC7777'); 
                    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.ellipse(10, -5, 8, 6, -0.2, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(14, -5, 3, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(25, -6); ctx.lineTo(20, -14); ctx.fill(); 
                    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.quadraticCurveTo(20, 5, 38, 14); ctx.quadraticCurveTo(20, 25, -10, 16); ctx.fill(); 
                }
                
                ctx.fillStyle = '#D11100'; ctx.beginPath(); ctx.arc(-2, -16, 28, 0, Math.PI, true); ctx.fill(); 
                ctx.fillStyle = '#8A0500'; ctx.beginPath(); ctx.ellipse(12, -12, 34, 8, 0, 0, Math.PI*2); ctx.fill(); 
                ctx.fillStyle = '#D11100'; ctx.beginPath(); ctx.ellipse(16, -16, 34, 8, 0, 0, Math.PI*2); ctx.fill(); 
                ctx.fillStyle = '#DDD'; ctx.beginPath(); ctx.arc(0, -22, 10, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#D11100'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.fillText('M', 0, -16);
                ctx.restore();

                ctx.save(); ctx.translate(10, 20); ctx.rotate(legAngle);
                if (isSkel) { drawMuscle(-5, 10, 8, 30, skinShadow); drawMuscle(-5, 40, 6, 25, skinShadow); } 
                else { ctx.fillStyle = overalls; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-25, 50); ctx.lineTo(15, 50); ctx.lineTo(20, -10); ctx.fill(); }
                ctx.fillStyle = shoes; ctx.beginPath(); ctx.ellipse(-5, 60, 28, 20, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(-15, 68, 24, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
                
            } else if (type === 'SOLDIER') {
                const uniform = '#3A4D23', uniformLight = '#4F6630', uniformShadow = '#253316';
                const boots = '#1A1A1A', vest = '#111', vestLight = '#222';
                
                ctx.save(); ctx.translate(3, -12); ctx.rotate(armAngle);
                ctx.fillStyle = uniform; ctx.fillRect(-6, 0, 12, 18);
                ctx.fillStyle = '#111'; ctx.fillRect(-4, 2, 6, 6);
                ctx.fillStyle = '#333'; ctx.fillRect(-7, 16, 14, 12); 
                ctx.restore();

                ctx.save(); ctx.translate(0, 8); ctx.rotate(-legAngle);
                ctx.fillStyle = uniformShadow; ctx.beginPath(); ctx.moveTo(-15, -10); ctx.lineTo(-20, 50); ctx.lineTo(10, 50); ctx.lineTo(15, -10); ctx.fill();
                ctx.fillStyle = boots; ctx.beginPath(); ctx.ellipse(-10, 60, 26, 16, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();

                drawMuscle(0, -30, 30, 45, uniform); drawMuscle(0, -30, 32, 25, vest); drawMuscle(0, -30, 28, 22, vestLight); 
                ctx.fillStyle = '#333'; ctx.fillRect(-15, -10, 10, 15); ctx.fillRect(5, -10, 10, 15); ctx.fillRect(-10, -40, 6, 20); ctx.fillRect(15, -40, 6, 20); 

                ctx.save(); ctx.translate(0, -75); ctx.rotate(Math.sin(cycle*2)*0.05);
                drawMuscle(0, 0, 20, 25, '#FFCBA4'); drawMuscle(5, 5, 20, 20, '#D9A066'); 
                ctx.fillStyle = uniformShadow; ctx.beginPath(); ctx.arc(-2, -5, 26, 0, Math.PI, true); ctx.fill();
                ctx.fillStyle = uniform; ctx.beginPath(); ctx.arc(-2, -5, 24, 0, Math.PI, true); ctx.fill();
                ctx.fillRect(-26, -5, 52, 10);
                ctx.fillStyle = '#000'; ctx.fillRect(0, -5, 25, 12);
                ctx.shadowBlur = 15; ctx.shadowColor = '#F00'; ctx.fillStyle = '#F00'; ctx.fillRect(5, -3, 18, 8); ctx.shadowBlur = 0;
                ctx.restore();

                ctx.save(); ctx.translate(10, 20); ctx.rotate(legAngle);
                ctx.fillStyle = uniform; ctx.beginPath(); ctx.moveTo(-15, -10); ctx.lineTo(-20, 50); ctx.lineTo(10, 50); ctx.lineTo(15, -10); ctx.fill();
                ctx.fillStyle = boots; ctx.beginPath(); ctx.ellipse(-5, 60, 28, 18, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-15, 68, 24, 8, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();

                ctx.save(); ctx.translate(-5, -30); ctx.rotate(-armAngle);
                drawMuscle(0, 15, 16, 25, uniformLight); 
                drawMuscle(10, 35, 12, 20, uniform); 
                ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(15, 50, 10, 0, Math.PI*2); ctx.fill(); 
                ctx.restore();

                        } else if (type === 'ZOMBIE') {
                            const isGiant = variant === 'GIANT';
                
                            // Deutlich mehr Farbvariationen pro Zombie-Typ
                            let baseColor, eyeColor, bloodColor, ribColor, clothColor;
                
                            if (variant === 'RUNNER') {
                                baseColor = '#A4907C'; // Fahl / Hautfarben
                                eyeColor = '#FFF'; bloodColor = '#8A0500'; ribColor = '#D2C3B3'; clothColor = '#3A4D23';
                            } else if (variant === 'CRAWLER') {
                                baseColor = '#6d5a72'; // Violett/Lila verwesend
                                eyeColor = '#FF0'; bloodColor = '#4A0000'; ribColor = '#8b7d8f'; clothColor = '#222';
                            } else if (variant === 'SPITTER') {
                                baseColor = '#506644'; // Giftgrün
                                eyeColor = '#0F0'; bloodColor = '#006400'; ribColor = '#8c9c80'; clothColor = '#4A1B22';
                            } else {
                                // Normal / Tank
                                if (level === 1) { baseColor = '#735849'; eyeColor = '#FFF'; bloodColor = '#600'; ribColor = '#947a6b'; clothColor = '#1A0B05'; }        // Forest
                                else if (level === 2) { baseColor = '#5c636e'; eyeColor = '#0FF'; bloodColor = '#300'; ribColor = '#828a96'; clothColor = '#111'; }       // Scrap
                                else if (level === 3) { baseColor = '#8fa6b2'; eyeColor = '#bdf'; bloodColor = '#26506b'; ribColor = '#c2d2da'; clothColor = '#2a3540'; }   // Frost
                                else if (level === 4) { baseColor = '#5a504a'; eyeColor = '#f80'; bloodColor = '#3a1a08'; ribColor = '#8a7e70'; clothColor = '#22201c'; }   // City
                                else { baseColor = '#3f2d24'; eyeColor = '#FF0000'; bloodColor = '#5a0303'; ribColor = '#735849'; clothColor = '#2B1B17'; }                 // Hell
                            }
                
                            const boneColor = '#DDCCBB';

                            if (variant === 'CRAWLER') {
                                ctx.translate(0, 80); ctx.rotate(Math.PI / 2.2);
                            }

                            const zombieArmFront = variant === 'RUNNER' ? -0.8 + armAngle * 0.2 : -0.1 + armAngle * 0.1;
                            const zombieArmBack = variant === 'RUNNER' ? -1.0 + armAngle * 0.2 : 0.4 + armAngle * 0.1;

                            // Hinten: Arm
                            ctx.save(); ctx.translate(10, -50); ctx.rotate(zombieArmBack);
                            if (variant === 'CRAWLER') {
                                drawMuscle(0, 30, 6, 40, baseColor); // Längere Arme zum Kriechen
                                drawMuscle(0, 70, 8, 12, bloodColor);
                            } else if (variant === 'TANK' || isGiant) {
                                drawMuscle(0, 30, 15, 35, baseColor); 
                                drawMuscle(0, 60, 12, 25, baseColor); 
                            } else {
                                drawMuscle(0, 20, 6, 30, baseColor); // Dürr
                                ctx.fillStyle = boneColor; ctx.fillRect(-2, 40, 4, 30); // Langer Knochen
                                ctx.fillStyle = bloodColor; ctx.fillRect(-4, 65, 8, 8);
                            }
                            ctx.restore();

                            // Hinten: Bein
                            ctx.save(); ctx.translate(-5, 20); ctx.rotate(-legAngle * (variant === 'RUNNER' ? 1.5 : 0.5)); 
                            ctx.fillStyle = clothColor; ctx.fillRect(-12, -10, 24, 25); 
                            if (variant === 'TANK' || isGiant) {
                                drawMuscle(0, 40, 15, 30, baseColor); 
                            } else {
                                drawMuscle(-2, 40, 5, 35, baseColor); // Sehr dünnes Bein
                                ctx.fillStyle = bloodColor; ctx.fillRect(-5, 5, 10, 20); 
                            }
                            ctx.restore();

                            // Rumpf
                            if (variant === 'TANK' || isGiant) {
                                // Tank ist fett/breit
                                drawMuscle(0, -20, 45, 60, baseColor); 
                                drawMuscle(0, -10, 48, 45, baseColor); 
                            } else if (variant === 'SPITTER') {
                                // Spitter hat geschwollenen Hals/Brust
                                drawMuscle(-10, -40, 25, 30, baseColor, -0.5); 
                                drawMuscle(0, -10, 20, 35, baseColor); 
                                drawMuscle(-15, -45, 14, 14, '#0F0'); 
                            } else {
                                // Extrem dürrer, gekrümmter Rumpf
                                ctx.save(); ctx.rotate(0.2);
                                drawMuscle(0, -30, 15, 45, baseColor); 
                                // Offenliegende Wirbelsäule hinten
                                ctx.fillStyle = boneColor; 
                                for(let i=0; i<6; i++) ctx.fillRect(-15, -60 + i*10, 8, 4);
                                // Rippen vorne
                                ctx.fillStyle = ribColor;
                                for(let i=0; i<5; i++) {
                                    ctx.beginPath(); ctx.moveTo(0, -50 + i*9); ctx.quadraticCurveTo(12, -45 + i*9, 15, -35 + i*9);
                                    ctx.lineWidth = 3; ctx.strokeStyle = ribColor; ctx.stroke();
                                }
                                ctx.restore();
                            }
                
                            // Blutspritzer am Rumpf
                            ctx.fillStyle = bloodColor;
                            ctx.beginPath(); ctx.ellipse(5, 5, 12, 25, 0.5, 0, Math.PI*2); ctx.fill();

                            // Kopf
                            ctx.save(); 
                            if (variant === 'SPITTER') ctx.translate(15, -70);
                            else if (variant === 'CRAWLER') ctx.translate(15, -50);
                            else ctx.translate(10, -90); 
                
                            ctx.rotate(variant === 'RUNNER' ? 0.8 : 0.3); 
                
                            if (variant === 'TANK' || isGiant) {
                                drawMuscle(0, 0, 25, 30, baseColor); 
                            } else {
                                // Normaler Schädel - Länger, schmaler, oben knochig
                                drawMuscle(2, -10, 18, 16, boneColor); // Nackte Schädeldecke
                                drawMuscle(-5, 5, 15, 20, baseColor); // Haut unten
                                drawMuscle(10, 10, 12, 10, baseColor); // Kiefer
                            }
                
                            // Augenhöhlen
                            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(14, -5, 6, 6, 0, 0, Math.PI*2); ctx.fill();
                            ctx.shadowBlur = 15; ctx.shadowColor = eyeColor; 
                            ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.ellipse(14, -5, 2, 2, 0, 0, Math.PI*2); ctx.fill();
                            ctx.shadowBlur = 0;
                
                            // Hängender Kiefer
                            const jaw = (f%4 === 0 || variant === 'SPITTER') ? 18 : 6; 
                            drawMuscle(8, 15 + jaw, 12, 6, baseColor, 0.3); 
                            ctx.fillStyle = boneColor; 
                            for(let i=0; i<4; i++) ctx.fillRect(10+i*4, 10+jaw, 2, 6); // Zähne
                
                            ctx.restore();

                            // Vorne: Bein
                            ctx.save(); ctx.translate(10, 20); ctx.rotate(legAngle * (variant === 'RUNNER' ? 1.5 : 0.5));
                            ctx.fillStyle = clothColor; ctx.fillRect(-12, -10, 20, 25); 
                            if (variant === 'TANK' || isGiant) {
                                drawMuscle(-2, 45, 18, 30, baseColor); 
                                drawMuscle(-2, 70, 16, 12, baseColor); 
                            } else {
                                drawMuscle(-2, 35, 5, 35, baseColor); 
                                drawMuscle(-2, 60, 10, 6, boneColor); // Knochenfuß
                            }
                            ctx.restore();

                            // Vorne: Arm
                            ctx.save(); ctx.translate(0, -45); ctx.rotate(zombieArmFront);
                            if (variant === 'TANK' || isGiant) {
                                drawMuscle(10, 30, 18, 40, baseColor); 
                                drawMuscle(20, 70, 16, 30, baseColor); 
                            } else if (variant === 'CRAWLER') {
                                drawMuscle(10, 35, 6, 45, baseColor); 
                                drawMuscle(15, 80, 8, 15, baseColor); 
                            } else {
                                drawMuscle(5, 25, 5, 35, baseColor); // Dürrer Arm
                                ctx.translate(5, 45); ctx.rotate(variant === 'RUNNER' ? -0.5 : -1.0); 
                                ctx.fillStyle = boneColor; ctx.fillRect(-3, -5, 6, 35); // Knochen
                                drawMuscle(0, 30, 8, 10, bloodColor); // Blut
                            }
                            ctx.restore();

            } else if (type === 'SPIDER') {
                let legBob = Math.sin(cycle * 6) * 30; 
                
                const drawSpiderLeg = (startX, startY, midX, midY, endX, endY, isFront) => {
                    ctx.strokeStyle = isFront ? '#111' : '#050505';
                    ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke();
                    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
                    for(let i=0; i<1; i+=0.2) {
                        let hx = startX + (midX-startX)*i; let hy = startY + (midY-startY)*i;
                        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 10, hy - 10); ctx.stroke();
                    }
                };

                drawSpiderLeg(0, 0, -40, -60 - legBob, -90, 40, false);
                drawSpiderLeg(0, 0, 20, -50 + legBob, 60, 50, false);
                
                let pulse = Math.sin(cycle*2) * 5;
                drawMuscle(30, 0, 55 + pulse, 45 + pulse, '#0a0a0a'); 
                drawMuscle(30, 0, 45 + pulse, 35 + pulse, '#1a0505'); 
                ctx.fillStyle = '#0F0'; ctx.globalAlpha = 0.6; 
                ctx.beginPath(); ctx.ellipse(40, -10, 8, 12, 0.5, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(20, 15, 6, 10, -0.3, 0, Math.PI*2); ctx.fill();
                ctx.globalAlpha = 1.0;

                drawMuscle(-25, 10, 30, 25, '#111'); 
                
                let bite = Math.abs(Math.sin(cycle * 4)) * 10;
                ctx.fillStyle = '#DDD'; 
                ctx.beginPath(); ctx.moveTo(-45, 15 - bite); ctx.quadraticCurveTo(-60, 25, -45, 30); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-45, 15 + bite); ctx.quadraticCurveTo(-60, 5, -45, 0); ctx.fill();
                ctx.fillStyle = '#0F0'; ctx.beginPath(); ctx.arc(-55, 30 + bite, 4, 0, Math.PI*2); ctx.fill();

                ctx.shadowBlur = 15; ctx.shadowColor = '#F00'; ctx.fillStyle = '#F00';
                drawMuscle(-40, 5, 6, 6, '#F00'); drawMuscle(-35, -2, 5, 5, '#F00');
                drawMuscle(-28, -6, 4, 4, '#F00'); drawMuscle(-20, -8, 3, 3, '#F00');
                drawMuscle(-40, 15, 6, 6, '#F00'); drawMuscle(-35, 22, 5, 5, '#F00');
                ctx.shadowBlur = 0;

                drawSpiderLeg(0, 5, -50, -70 + legBob, -100, 30, true);
                drawSpiderLeg(0, 5, 30, -60 - legBob, 80, 40, true);

            } else if (type === 'TRIDENT_DEMON') {
                const skinColor = '#8b0000';
                const hornColor = '#111';
                const eyeColor = '#FFDD00';
                
                ctx.save(); ctx.translate(10, 20); ctx.rotate(legAngle);
                drawMuscle(0, 10, 8, 20, skinColor); drawMuscle(-5, 30, 6, 25, skinColor); drawMuscle(-5, 55, 12, 6, hornColor); 
                ctx.restore();

                ctx.save(); ctx.translate(-5, 20); ctx.rotate(-legAngle); 
                drawMuscle(0, 10, 8, 20, skinColor); drawMuscle(-5, 30, 6, 25, skinColor); drawMuscle(-5, 55, 12, 6, hornColor); 
                ctx.restore();
                
                // Torso
                drawMuscle(0, -10, 25, 35, skinColor);
                drawMuscle(0, -35, 30, 25, skinColor);
                
                // Kopf
                ctx.save(); ctx.translate(10, -70); ctx.rotate(0.2);
                drawMuscle(0, 0, 18, 22, skinColor); // Kopf
                
                // Hörner
                ctx.fillStyle = hornColor;
                ctx.beginPath(); ctx.moveTo(-10, -15); ctx.quadraticCurveTo(-30, -30, -10, -50); ctx.quadraticCurveTo(-15, -20, 5, -15); ctx.fill();
                ctx.beginPath(); ctx.moveTo(10, -15); ctx.quadraticCurveTo(30, -30, 10, -50); ctx.quadraticCurveTo(15, -20, -5, -15); ctx.fill();
                
                // Gesicht
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(12, -2, 5, 4, 0.2, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 10; ctx.shadowColor = eyeColor; ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.ellipse(12, -2, 2, 2, 0.2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
                
                // Böses Grinsen
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(5, 10); ctx.quadraticCurveTo(15, 15, 20, 8); ctx.lineTo(15, 12); ctx.fill();
                ctx.restore();
                
                // Arm Hinten
                ctx.save(); ctx.translate(15, -45); ctx.rotate(armAngle);
                drawMuscle(0, 15, 6, 20, skinColor); drawMuscle(5, 35, 5, 20, skinColor);
                ctx.restore();

                // Arm Vorne & Dreizack
                ctx.save(); ctx.translate(-10, -40); 
                if (f === 3) {
                    ctx.rotate(-Math.PI / 2); // Stich-Attacke!
                    ctx.translate(20, -20);
                } else {
                    ctx.rotate(-armAngle);
                }
                
                drawMuscle(0, 15, 8, 22, skinColor); 
                drawMuscle(10, 35, 6, 20, skinColor); 
                
                // Dreizack (Waffe)
                ctx.save(); ctx.translate(10, 45); ctx.rotate(-Math.PI / 4);
                ctx.fillStyle = '#331100'; ctx.fillRect(-4, -60, 8, 120); // Stab
                ctx.fillStyle = '#444';
                ctx.beginPath(); ctx.moveTo(-15, -60); ctx.quadraticCurveTo(0, -50, 15, -60); ctx.lineTo(15, -65); ctx.lineTo(10, -80); ctx.lineTo(5, -65); ctx.lineTo(-5, -65); ctx.lineTo(-10, -80); ctx.lineTo(-15, -65); ctx.fill(); // Zacken
                ctx.fillStyle = '#888'; ctx.beginPath(); ctx.moveTo(-2, -60); ctx.lineTo(0, -90); ctx.lineTo(2, -60); ctx.fill(); // Mittelspitze
                ctx.restore();
                
                ctx.restore();

                        } else if (type === 'DEMON') {
                let wingFlap = Math.sin(cycle * 6) * 0.8; 
                
                ctx.save(); ctx.translate(0, -30); ctx.rotate(wingFlap);
                ctx.fillStyle = '#300'; 
                ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(80, -120, 140, -40); ctx.quadraticCurveTo(100, -20, 80, 10); ctx.quadraticCurveTo(40, -20, 0, 0); ctx.fill();
                ctx.strokeStyle = '#100'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(40, -60, 140, -40); ctx.stroke();
                ctx.restore();

                drawMuscle(-5, -10, 40, 60, '#800', 0.2); 
                drawMuscle(-10, -10, 30, 50, '#A00', 0.2); 
                for(let i=0; i<3; i++) drawMuscle(-15 + i*3, 10 + i*15, 15, 8, '#600', 0.2);

                ctx.save(); ctx.translate(0, 40); ctx.rotate(0.2 + Math.sin(cycle)*0.1);
                drawMuscle(0, 20, 12, 30, '#500'); 
                drawMuscle(-10, 50, 10, 25, '#300', 0.5); 
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-15, 70); ctx.lineTo(-25, 90); ctx.lineTo(-5, 85); ctx.fill(); 
                ctx.restore();

                ctx.save(); ctx.translate(-20, -20); ctx.rotate(-wingFlap);
                ctx.fillStyle = '#500'; 
                ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(100, -140, 160, -20); ctx.quadraticCurveTo(120, 0, 90, 30); ctx.quadraticCurveTo(50, -10, 0, 0); ctx.fill();
                ctx.strokeStyle = '#200'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(50, -70, 160, -20); ctx.stroke();
                ctx.restore();

                drawMuscle(-20, -65, 25, 30, '#800'); 
                ctx.fillStyle = '#111'; 
                ctx.beginPath(); ctx.moveTo(-15, -85); ctx.quadraticCurveTo(-20, -140, 30, -150); ctx.quadraticCurveTo(0, -110, -5, -85); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-35, -85); ctx.quadraticCurveTo(-60, -120, -80, -90); ctx.quadraticCurveTo(-50, -90, -30, -75); ctx.fill();
                
                ctx.shadowBlur = 30; ctx.shadowColor = '#FF0';
                drawMuscle(-30, -65, 8, 6, '#FF0', -0.2); 
                drawMuscle(-35, -45, 15, 12, '#FF0'); 
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.ellipse(-35, -45, 8, 6, 0, 0, Math.PI*2); ctx.fill();

            } else if (type === 'BOSS') {
                if (variant === 'GOLEM') {
                    // Boss: Genähte Fleisch-Abscheulichkeit
                    const flesh1 = '#5a1e22', flesh2 = '#7a2626', flesh3 = '#3a1218', bone = '#d8c9b0', gum = '#2a0808', geye = '#ffe14a';
                    ctx.save(); ctx.translate(0, 40);
                    // klobige, asymmetrische Stampfer-Beine
                    ctx.save(); ctx.rotate(legAngle * 0.7); drawMuscle(22, 0, 34, 46, flesh1); drawMuscle(22, 38, 28, 40, flesh2); ctx.fillStyle = '#1a0a0a'; ctx.fillRect(0, 72, 46, 18); ctx.restore();
                    ctx.save(); ctx.rotate(-legAngle * 0.7); drawMuscle(-24, 0, 30, 42, flesh2); drawMuscle(-24, 36, 24, 38, flesh1); ctx.fillStyle = '#1a0a0a'; ctx.fillRect(-46, 70, 46, 18); ctx.restore();
                    // riesiger unförmiger Rumpf
                    drawMuscle(0, -60, 96, 116, flesh1);
                    drawMuscle(-26, -44, 46, 54, flesh2, -0.2);
                    drawMuscle(34, -74, 52, 42, flesh3, 0.3);
                    // freiliegende Rippen
                    ctx.strokeStyle = bone; ctx.lineWidth = 6; ctx.lineCap = 'round';
                    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-40, -100 + i * 22); ctx.quadraticCurveTo(0, -92 + i * 22, 46, -104 + i * 22); ctx.stroke(); }
                    // klaffendes Maul mitten im Rumpf
                    ctx.fillStyle = gum; ctx.beginPath(); ctx.ellipse(0, -30, 34, 20 + Math.abs(Math.sin(cycle * 2)) * 10, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = bone; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 9, -46); ctx.lineTo(i * 9 + 4, -30); ctx.lineTo(i * 9 + 8, -46); ctx.fill(); ctx.beginPath(); ctx.moveTo(i * 9, -14); ctx.lineTo(i * 9 + 4, -28); ctx.lineTo(i * 9 + 8, -14); ctx.fill(); }
                    // fette Nähte
                    ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-64, -30); ctx.lineTo(44, -92); ctx.stroke();
                    ctx.fillStyle = '#000'; for (let i = 0; i < 9; i++) ctx.fillRect(-54 + i * 12, -26 - i * 7, 12, 4);
                    // mehrere glühende Augen
                    ctx.shadowBlur = 14; ctx.shadowColor = geye; ctx.fillStyle = geye;
                    [[-30, -86, 6], [6, -92, 7], [34, -78, 5], [-8, -70, 4]].forEach(function(e) { ctx.beginPath(); ctx.arc(e[0], e[1], e[2], 0, Math.PI * 2); ctx.fill(); });
                    ctx.shadowBlur = 0;
                    // Mini-Kopf, im Fleisch versunken, mit Hörnchen + roten Augen
                    drawMuscle(0, -150, 22, 26, flesh2);
                    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-12, -160); ctx.lineTo(-20, -184); ctx.lineTo(-4, -164); ctx.fill(); ctx.beginPath(); ctx.moveTo(12, -160); ctx.lineTo(20, -184); ctx.lineTo(4, -164); ctx.fill();
                    ctx.shadowBlur = 12; ctx.shadowColor = '#f30'; ctx.fillStyle = '#f30'; ctx.beginPath(); ctx.arc(-7, -152, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(7, -152, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                    // Arme mit Knochenklauen
                    ctx.save(); ctx.translate(64, -80); ctx.rotate(armAngle); drawMuscle(0, 40, 26, 62, flesh1); drawMuscle(0, 94, 30, 30, flesh2); ctx.strokeStyle = bone; ctx.lineWidth = 5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 12, 110); ctx.lineTo(i * 14, 142); ctx.stroke(); } ctx.restore();
                    ctx.save(); ctx.translate(-64, -80); ctx.rotate(-armAngle); drawMuscle(0, 40, 26, 62, flesh2); drawMuscle(0, 94, 30, 30, flesh1); ctx.strokeStyle = bone; ctx.lineWidth = 5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 12, 110); ctx.lineTo(i * 14, 142); ctx.stroke(); } ctx.restore();
                    ctx.restore();
                } 
                else if (variant === 'MECH') {
                    // Boss: Schädel-Cyborg / Kriegsmaschine
                    const metal = '#5a6675', darkM = '#222d38', darkM2 = '#161e26', mglow = '#ff2a2a', warn = '#caa11a';
                    ctx.save(); ctx.translate(0, 20);
                    // hydraulische Beine
                    ctx.save(); ctx.translate(16, 20); ctx.rotate(legAngle * 0.6); ctx.fillStyle = darkM; ctx.fillRect(-16, 0, 32, 62); ctx.fillStyle = '#454f59'; ctx.fillRect(-6, 4, 5, 54); ctx.fillStyle = metal; ctx.fillRect(-22, 62, 52, 20); ctx.restore();
                    ctx.save(); ctx.translate(-16, 20); ctx.rotate(-legAngle * 0.6); ctx.fillStyle = darkM; ctx.fillRect(-16, 0, 32, 62); ctx.fillStyle = '#454f59'; ctx.fillRect(1, 4, 5, 54); ctx.fillStyle = metal; ctx.fillRect(-30, 62, 52, 20); ctx.restore();
                    // gepanzerter Torso mit Warnstreifen
                    ctx.fillStyle = metal; ctx.fillRect(-62, -82, 124, 104);
                    ctx.fillStyle = darkM; ctx.fillRect(-44, -72, 88, 84);
                    ctx.fillStyle = warn; for (let i = 0; i < 5; i++) ctx.fillRect(-44 + i * 20, -72, 10, 8);
                    ctx.fillStyle = '#111'; for (let i = 0; i < 5; i++) ctx.fillRect(-34 + i * 20, -72, 10, 8);
                    // glühender Brustkern + Risse
                    ctx.shadowBlur = 18; ctx.shadowColor = mglow; ctx.fillStyle = mglow; ctx.beginPath(); ctx.arc(0, -30, 12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                    ctx.strokeStyle = darkM2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(0, -30); ctx.lineTo(22, -6); ctx.stroke();
                    // Schädel-Kopf
                    ctx.save(); ctx.translate(0, -92);
                    ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(0, 0, 40, Math.PI, 0); ctx.fill(); ctx.fillRect(-40, 0, 80, 26);
                    ctx.fillStyle = darkM2; ctx.fillRect(-30, 2, 60, 10);
                    ctx.shadowBlur = 20; ctx.shadowColor = mglow; ctx.fillStyle = mglow; ctx.fillRect(-26, 4, 18, 6); ctx.fillRect(8, 4, 18, 6); ctx.shadowBlur = 0;
                    ctx.fillStyle = '#111'; for (let i = 0; i < 6; i++) ctx.fillRect(-28 + i * 10, 16, 7, 10); // Zahn-Gitter
                    ctx.fillStyle = '#777'; ctx.fillRect(-6, -42, 12, 16);
                    ctx.restore();
                    // Minigun-Arm
                    ctx.save(); ctx.translate(72, -44); ctx.rotate(armAngle * 0.5);
                    ctx.fillStyle = darkM; ctx.fillRect(-16, 0, 32, 46);
                    ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(0, 52, 18, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#111'; for (let i = 0; i < 4; i++) ctx.fillRect(-13 + i * 8, 56, 5, 64);
                    ctx.restore();
                    // Raketenwerfer-Arm
                    ctx.save(); ctx.translate(-72, -44); ctx.rotate(-armAngle * 0.5);
                    ctx.fillStyle = darkM; ctx.fillRect(-26, -18, 52, 84);
                    ctx.fillStyle = warn; ctx.fillRect(-26, -18, 52, 6);
                    ctx.fillStyle = '#900'; ctx.beginPath(); ctx.arc(0, 64, 20, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 14; ctx.shadowColor = '#f80'; ctx.fillStyle = '#f80'; ctx.beginPath(); ctx.arc(0, 64, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                    ctx.restore();
                    ctx.restore();
                }
                else if (variant === 'HELL') {
                    // Boss: Höllenfürst (Endboss) — detaillierter & furchteinflößender
                    const skin = '#8B0000', darkSkin = '#4A0000', horn = '#0a0606', fire = '#FF6600';
                    ctx.save(); ctx.translate(0, 10);
                    // Hufe-Beine
                    ctx.save(); ctx.translate(26, 40); ctx.rotate(legAngle); drawMuscle(0, 30, 26, 42, skin); drawMuscle(0, 82, 20, 30, darkSkin); ctx.fillStyle = horn; ctx.beginPath(); ctx.moveTo(-22, 92); ctx.lineTo(22, 92); ctx.lineTo(10, 118); ctx.lineTo(-10, 118); ctx.fill(); ctx.restore();
                    ctx.save(); ctx.translate(-26, 40); ctx.rotate(-legAngle); drawMuscle(0, 30, 26, 42, skin); drawMuscle(0, 82, 20, 30, darkSkin); ctx.fillStyle = horn; ctx.beginPath(); ctx.moveTo(-22, 92); ctx.lineTo(22, 92); ctx.lineTo(10, 118); ctx.lineTo(-10, 118); ctx.fill(); ctx.restore();
                    // massiver Rumpf
                    drawMuscle(0, -60, 82, 124, darkSkin);
                    drawMuscle(0, -82, 102, 72, skin);
                    // freiliegende Rippen
                    ctx.strokeStyle = '#c8b29a'; ctx.lineWidth = 5;
                    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-36, -110 + i * 20); ctx.quadraticCurveTo(0, -104 + i * 20, 40, -112 + i * 20); ctx.stroke(); }
                    // glühender Riss-Brustkorb (Ofen)
                    ctx.shadowBlur = 30; ctx.shadowColor = fire; ctx.fillStyle = fire;
                    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(26, -86); ctx.lineTo(-8, -66); ctx.lineTo(-38, -100); ctx.lineTo(2, -60); ctx.fill();
                    ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(-4, -72, 8, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                    // Kopf
                    drawMuscle(0, -162, 32, 40, skin);
                    // große geschwungene Hörner + Stirn-Hörner
                    ctx.fillStyle = horn;
                    ctx.beginPath(); ctx.moveTo(22, -182); ctx.quadraticCurveTo(92, -258, 46, -320); ctx.quadraticCurveTo(58, -228, 12, -192); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(-22, -182); ctx.quadraticCurveTo(-92, -258, -46, -320); ctx.quadraticCurveTo(-58, -228, -12, -192); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(8, -196); ctx.lineTo(4, -222); ctx.lineTo(16, -198); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(-8, -196); ctx.lineTo(-4, -222); ctx.lineTo(-16, -198); ctx.fill();
                    // brennende Augen
                    ctx.shadowBlur = 15; ctx.shadowColor = '#FF0'; ctx.fillStyle = '#FF0';
                    ctx.beginPath(); ctx.ellipse(15, -166, 8, 5, -0.3, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(-15, -166, 8, 5, 0.3, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                    // fauchendes Maul mit Reißzähnen
                    ctx.fillStyle = '#1a0000'; ctx.beginPath(); ctx.ellipse(0, -146, 18, 8 + Math.abs(Math.sin(cycle * 2)) * 6, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#e8e0d0'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7, -152); ctx.lineTo(i * 7 + 3, -142); ctx.lineTo(i * 7 + 6, -152); ctx.fill(); }
                    // Riesen-Arme mit Klauen
                    ctx.save(); ctx.translate(90, -100); ctx.rotate(armAngle); drawMuscle(0, 40, 30, 60, skin); drawMuscle(0, 100, 34, 50, darkSkin); ctx.fillStyle = horn; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 12, 140); ctx.lineTo(-14 + i * 12, 170); ctx.lineTo(-10 + i * 12, 140); ctx.fill(); } ctx.restore();
                    ctx.save(); ctx.translate(-90, -100); ctx.rotate(-armAngle); drawMuscle(0, 40, 30, 60, skin); drawMuscle(0, 100, 34, 50, darkSkin); ctx.fillStyle = horn; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 12, 140); ctx.lineTo(-14 + i * 12, 170); ctx.lineTo(-10 + i * 12, 140); ctx.fill(); } ctx.restore();
                    ctx.restore();
                }
            } else if (type === 'HELLHOUND') {
                // Höllenhund: verkohlter Vierbeiner, klaffendes Maul, glühende Augen
                const hide  = (level === 2 || level === 4) ? '#33333a' : (level === 3 ? '#3a4654' : '#3a1410');
                const hide2 = (level === 2 || level === 4) ? '#1d1d24' : (level === 3 ? '#222a33' : '#230a08');
                const eye = '#ff3', fang = '#e8e0d0';
                const sw = Math.sin(cycle) * 16, sw2 = Math.sin(cycle + Math.PI) * 16;
                ctx.translate(0, 14);
                // Beine (hinten -x, vorne +x)
                ctx.strokeStyle = hide2; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); ctx.moveTo(-34, -4); ctx.lineTo(-42 + sw, 20); ctx.lineTo(-42 + sw, 40); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-28, -4); ctx.lineTo(-34 - sw, 20); ctx.lineTo(-34 - sw, 40); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(34, -2); ctx.lineTo(42 + sw2, 20); ctx.lineTo(42 + sw2, 40); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(28, -2); ctx.lineTo(34 - sw2, 20); ctx.lineTo(34 - sw2, 40); ctx.stroke();
                // Schwanz
                ctx.strokeStyle = hide; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-40, -8); ctx.quadraticCurveTo(-66, -16, -58, -38 + Math.sin(cycle*2)*6); ctx.stroke();
                // Körper
                drawMuscle(0, -6, 44, 24, hide); drawMuscle(8, -8, 36, 20, hide2);
                // Rückenstacheln
                ctx.fillStyle = '#111';
                for (let i = -3; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i*13, -26); ctx.lineTo(i*13 + 6, -44); ctx.lineTo(i*13 + 12, -26); ctx.fill(); }
                // Kopf vorne
                ctx.save(); ctx.translate(46, 2);
                drawMuscle(0, -6, 20, 18, hide);
                ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-16, -40); ctx.lineTo(-2, -24); ctx.fill(); // Ohr/Horn
                const jaw = Math.abs(Math.sin(cycle*2)) * 11 + 4;
                ctx.fillStyle = '#1a0000'; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(30, 0 - jaw*0.3); ctx.lineTo(30, 8 + jaw); ctx.lineTo(0, 12 + jaw*0.4); ctx.fill(); // offenes Maul
                ctx.fillStyle = fang;
                for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(6 + i*6, 1); ctx.lineTo(8 + i*6, 8); ctx.lineTo(11 + i*6, 1); ctx.fill(); ctx.beginPath(); ctx.moveTo(6 + i*6, 12 + jaw*0.4); ctx.lineTo(8 + i*6, 5 + jaw*0.5); ctx.lineTo(11 + i*6, 12 + jaw*0.4); ctx.fill(); }
                ctx.shadowBlur = 14; ctx.shadowColor = eye; ctx.fillStyle = eye;
                ctx.beginPath(); ctx.ellipse(2, -10, 4, 3, -0.3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(-9, -9, 3, 2.5, -0.3, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            } else if (type === 'BLOATER') {
                // Aufgedunsener Pestzombie: riesiger Wanst mit Beulen, dünne Glieder, kleiner Kopf
                const skin = level === 5 ? '#566a36' : (level === 3 ? '#7a8a92' : '#6c784a'), skinSh = level === 3 ? '#46545c' : '#3c4824', boil = '#9cb04a', pus = '#dcec80';
                // dünne Beine
                ctx.save(); ctx.translate(-12, 32); ctx.rotate(-legAngle*0.4); drawMuscle(0, 10, 5, 22, skinSh); ctx.restore();
                ctx.save(); ctx.translate(12, 32); ctx.rotate(legAngle*0.4); drawMuscle(0, 10, 5, 22, skinSh); ctx.restore();
                // dünne Arme hinter dem Wanst
                ctx.save(); ctx.translate(-34, -8); ctx.rotate(0.5 + armAngle*0.2); drawMuscle(0, 16, 5, 22, skinSh); ctx.restore();
                ctx.save(); ctx.translate(34, -8); ctx.rotate(-0.5 - armAngle*0.2); drawMuscle(0, 16, 5, 22, skinSh); ctx.restore();
                // RIESEN-Wanst
                drawMuscle(0, 8, 46, 44, skin); drawMuscle(-6, 12, 36, 36, skinSh);
                // Beulen / Pusteln
                ctx.fillStyle = boil; [[-18,2,11],[16,8,13],[-2,26,10],[22,-10,9],[-26,18,8]].forEach(function(b){ ctx.beginPath(); ctx.arc(b[0],b[1],b[2],0,Math.PI*2); ctx.fill(); });
                ctx.fillStyle = pus;  [[-18,-1,4],[16,4,5],[22,-13,3]].forEach(function(b){ ctx.beginPath(); ctx.arc(b[0],b[1],b[2],0,Math.PI*2); ctx.fill(); });
                // kleiner, eingesunkener Kopf
                ctx.save(); ctx.translate(2, -42);
                drawMuscle(0, 0, 14, 13, skin);
                ctx.shadowBlur = 8; ctx.shadowColor = '#3f3';
                ctx.fillStyle = '#5f5'; ctx.beginPath(); ctx.arc(5, -2, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-5, -2, 2.5, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#1a0000'; ctx.beginPath(); ctx.ellipse(2, 8, 8, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            } else if (type === 'ITEM') {
                ctx.translate(0, Math.sin(performance.now() / 200) * 10);
                
                if (variant === 'HEART') {
                    ctx.shadowBlur = 30; ctx.shadowColor = '#F03'; ctx.fillStyle = '#F03';
                    const p = new Path2D(); p.moveTo(0, 25);
                    p.bezierCurveTo(-50, 0, -50, -40, -15, -40); p.bezierCurveTo(0, -40, 0, -15, 0, -15);
                    p.bezierCurveTo(0, -40, 15, -40, 50, -40); p.bezierCurveTo(50, 0, 0, 25, 0, 25); ctx.fill(p);
                    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-15, -20, 10, 5, -0.5, 0, Math.PI*2); ctx.fill();
                } else if (variant === 'STAR') {
                    ctx.shadowBlur = 40; ctx.shadowColor = '#FD0'; ctx.fillStyle = '#FD0';
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        ctx.lineTo(Math.cos((18+i*72)*Math.PI/180)*45, -Math.sin((18+i*72)*Math.PI/180)*45);
                        ctx.lineTo(Math.cos((54+i*72)*Math.PI/180)*20, -Math.sin((54+i*72)*Math.PI/180)*20);
                    }
                    ctx.closePath(); ctx.fill();
                    ctx.fillStyle = '#000'; ctx.fillRect(-10, -10, 5, 15); ctx.fillRect(5, -10, 5, 15);
                } else if (variant === 'BOOSTER') {
                    ctx.shadowBlur = 30; ctx.shadowColor = '#0FC'; ctx.fillStyle = '#FFF';
                    ctx.beginPath(); ctx.moveTo(-10, -20); ctx.quadraticCurveTo(-40, -50, -20, -10); ctx.fill(); 
                    ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(-30, -30, -10, 0); ctx.fill(); 
                    ctx.fillStyle = '#D11100'; ctx.fillRect(-20, -10, 40, 25); 
                    ctx.fillStyle = '#111'; ctx.fillRect(-25, 15, 50, 10); 
                    ctx.fillStyle = '#FFD700'; ctx.fillRect(-15, -10, 10, 25); 
                } else if (variant === 'MOLOTOV') {
                    ctx.shadowBlur = 20; ctx.shadowColor = '#0F0'; ctx.fillStyle = '#004400';
                    ctx.fillRect(-15, -10, 30, 40); ctx.fillRect(-8, -35, 16, 25); 
                    ctx.fillStyle = '#FFF'; ctx.fillRect(-10, -30, 20, 10); 
                    ctx.shadowColor = '#F40'; ctx.fillStyle = '#F40'; ctx.beginPath(); ctx.arc(0, -45, 15, 0, Math.PI*2); ctx.fill(); 
                } else if (variant === 'BEER') {
                    // Bonbon (rosa, eingewickelt)
                    ctx.shadowBlur = 22; ctx.shadowColor = '#FF9FC9';
                    ctx.fillStyle = '#FFC2E2';
                    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(42, -15); ctx.lineTo(42, 15); ctx.closePath(); ctx.fill();   // Wickel rechts
                    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-42, -15); ctx.lineTo(-42, 15); ctx.closePath(); ctx.fill(); // Wickel links
                    ctx.fillStyle = '#FF9FC9';
                    ctx.beginPath(); ctx.ellipse(0, 0, 23, 17, 0, 0, Math.PI*2); ctx.fill();        // Kern
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.beginPath(); ctx.ellipse(-7, -6, 8, 5, -0.5, 0, Math.PI*2); ctx.fill();      // Glanz
                } else if (variant === 'LIQUOR') {
                    // Lutscher (Lolli mit Spirale)
                    ctx.shadowBlur = 22; ctx.shadowColor = '#C9A0FF';
                    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-3, -4, 6, 44);                          // Stiel
                    ctx.fillStyle = '#C9A0FF'; ctx.beginPath(); ctx.arc(0, -10, 23, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;                                  // Spirale
                    ctx.beginPath(); for (let a = 0; a < 13; a += 0.2) { const r = a*1.65; ctx.lineTo(Math.cos(a)*r, -10 + Math.sin(a)*r); } ctx.stroke();
                } else if (variant === 'JETPACK') {
                    ctx.shadowBlur = 26; ctx.shadowColor = '#33d6ff';
                    // zwei Tanks
                    ctx.fillStyle = '#c4c8d0'; ctx.fillRect(-28, -32, 22, 56); ctx.fillRect(6, -32, 22, 56);
                    ctx.fillStyle = '#8a8e96'; ctx.fillRect(-28, -32, 6, 56); ctx.fillRect(6, -32, 6, 56);
                    ctx.fillStyle = '#e02828'; ctx.fillRect(-28, -32, 22, 8); ctx.fillRect(6, -32, 22, 8); // rote Deckel
                    ctx.fillStyle = '#3a3e46'; ctx.fillRect(-8, -22, 16, 36);   // Mittelgehäuse
                    // Düsen unten + Flamme
                    ctx.fillStyle = '#22252b'; ctx.fillRect(-24, 24, 14, 10); ctx.fillRect(10, 24, 14, 10);
                    ctx.shadowColor = '#ff8a18'; ctx.fillStyle = '#ffd23a';
                    ctx.beginPath(); ctx.moveTo(-24, 34); ctx.lineTo(-17, 56); ctx.lineTo(-10, 34); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(10, 34);  ctx.lineTo(17, 56);  ctx.lineTo(24, 34);  ctx.fill();
                } else {
                    ctx.shadowBlur = 30; ctx.shadowColor = '#FFF'; ctx.fillStyle = '#222';
                    ctx.fillRect(-45, -30, 90, 60); // Breiterer Koffer
                    ctx.fillStyle = '#444'; ctx.fillRect(-35, -20, 70, 40);
                    ctx.fillStyle = '#666'; ctx.fillRect(-15, -40, 30, 10); // Griff
                    
                    // Waffenspezifische Details wiederherstellen
                    ctx.fillStyle = '#0F0'; 
                    ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; 
                    let label = variant.substring(0,3);
                    if (variant === 'ASSAULT_RIFLE') label = 'AR';
                    if (variant === 'FLAMETHROWER') label = 'FLM';
                    if (variant === 'CHAINSAW') label = 'SAW';
                    ctx.fillText(label, 0, 8);
                    
                    // Kleine Waffen-Silhouette oder Farbakzent
                    ctx.fillStyle = '#FF0';
                    ctx.fillRect(-25, 15, 50, 4);
                }
            }
            ctx.restore();
        }
        const img = new Image(); img.src = cvs.toDataURL(); return img;
    }
}

const Assets = {
    playerWalk: new Image(), playerStar: new Image(), 
    zombieL1: {}, giantZombieL1: new Image(), spiderL1: new Image(), demonL1: new Image(),
    zombieL2: {}, giantZombieL2: new Image(), soldierL2: new Image(), spiderL2: new Image(), demonL2: new Image(),
    zombieL3: {}, giantZombieL3: new Image(), soldierL3: new Image(), spiderL3: new Image(), demonL3: new Image(),
    items: {}, enemies: { 1: {}, 2: {}, 3: {} },
    init: function() {
        this.playerWalk = SpriteGenerator.generate('PLAYER', 'NORMAL');
        this.playerStar = SpriteGenerator.generate('PLAYER', 'SKELETON'); 
        
        ['HEART', 'STAR', 'BOOSTER', 'JETPACK', 'MOLOTOV', 'BEER', 'LIQUOR', 'PISTOL', 'UZI', 'SHOTGUN', 'ASSAULT_RIFLE', 'MINIGUN', 'ROCKET', 'FLAMETHROWER', 'GRENADE', 'KNIFE', 'AXE', 'CHAINSAW'].forEach(type => {
            this.items[type] = SpriteGenerator.generate('ITEM', type);
        });

        const G = (type, variant, lvl) => SpriteGenerator.generate(type, variant, lvl);
        // Bosse sind level-unabhängig -> einmal erzeugen und teilen
        const bossG = G('BOSS', 'GOLEM'), bossM = G('BOSS', 'MECH'), bossH = G('BOSS', 'HELL');

        // Vollständiges Gegner-Sprite-Set je Setting (1..5)
        const makeSet = (t) => ({
            normal: G('ZOMBIE', 'NORMAL', t), runner: G('ZOMBIE', 'RUNNER', t), spitter: G('ZOMBIE', 'SPITTER', t),
            tank: G('ZOMBIE', 'TANK', t), crawler: G('ZOMBIE', 'CRAWLER', t), giant: G('ZOMBIE', 'GIANT', t),
            soldier: G('SOLDIER', 'NORMAL', t), spider: G('SPIDER', 'NORMAL', t), demon: G('DEMON', 'NORMAL', t),
            trident_demon: G('TRIDENT_DEMON', 'NORMAL', t), hellhound: G('HELLHOUND', null, t), bloater: G('BLOATER', null, t),
            boss_golem: bossG, boss_mech: bossM, boss_hell: bossH
        });
        const sets = { 1: makeSet(1), 2: makeSet(2), 3: makeSet(3), 4: makeSet(4), 5: makeSet(5) };

        // Level 1..10 -> Theme ceil(level/2): jeder Level hat damit gültige Sprites (Fix: keine unsichtbaren Gegner mehr)
        this.enemies = {};
        for (let lvl = 1; lvl <= 10; lvl++) this.enemies[lvl] = sets[Math.min(5, Math.ceil(lvl / 2))];
    }
};