class InputHandler {
    constructor() {
        this.keys = {};
        this.previousKeys = {};
        this.gamepadKeys = {}; 
        
        window.inputHandlerRef = this; // Macht das Objekt global für das Diagonal-Zielen zugänglich
        
        window.addEventListener('keydown', e => {
            if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        // Firefox & Safari Gamepad Connect Events
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
              e.gamepad.index, e.gamepad.id,
              e.gamepad.buttons.length, e.gamepad.axes.length);
        });

        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const bindButton = (btnId, keyName) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            const startEvent = (e) => {
                e.preventDefault();
                this.keys[keyName] = true;
                btn.classList.add('active');
            };
            const endEvent = (e) => {
                e.preventDefault();
                this.keys[keyName] = false;
                btn.classList.remove('active');
            };
            btn.addEventListener('touchstart', startEvent, {passive: false});
            btn.addEventListener('mousedown', startEvent);
            btn.addEventListener('touchend', endEvent);
            btn.addEventListener('mouseup', endEvent);
            btn.addEventListener('mouseleave', endEvent);
        };
        bindButton('btn-up', 'KeyW');
        bindButton('btn-down', 'KeyS');
        bindButton('btn-left', 'KeyA');
        bindButton('btn-right', 'KeyD');
        
        bindButton('btn-b', 'Space'); 
        bindButton('btn-a', 'KeyF');   
        bindButton('btn-x', 'KeyQ');  
        bindButton('btn-y', 'KeyE');   // Roundhouse-Kick (nur Chuck)
    }

        update() {
            this.previousKeys = { ...this.keys, ...this.gamepadKeys };
            this.gamepadKeys = {}; 

            // Cross-browser gamepad fetching
            let gamepads = [];
            if (typeof navigator.getGamepads === 'function') {
                gamepads = navigator.getGamepads();
            } else if (typeof navigator.webkitGetGamepads === 'function') {
                gamepads = navigator.webkitGetGamepads();
            }
        
            if (!gamepads || gamepads.length === 0) return;

            // Loop through all gamepads to find an active one
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i];
            
                // Skip invalid or disconnected gamepads
                if (!gp || !gp.connected) continue;

                const threshold = 0.4; 
            
                // Safe helper function to check button state
                const isPressed = (btnIndex) => {
                    if (!gp.buttons || btnIndex >= gp.buttons.length) return false;
                    const b = gp.buttons[btnIndex];
                    if (!b) return false;
                    if (typeof b === "object") {
                        return b.pressed || b.value > 0.5;
                    }
                    return b > 0.5; // Fallback for very old browsers where buttons array contains raw numbers
                };

                // Axes
                if (gp.axes && gp.axes.length >= 2) {
                    if (gp.axes[0] < -threshold) this.gamepadKeys['KeyA'] = true; 
                    if (gp.axes[0] > threshold) this.gamepadKeys['KeyD'] = true; 
                    if (gp.axes[1] < -threshold) this.gamepadKeys['KeyW'] = true; 
                    if (gp.axes[1] > threshold) this.gamepadKeys['KeyS'] = true; 
                }

                // D-Pad Fallback
                if (isPressed(14)) this.gamepadKeys['KeyA'] = true; 
                if (isPressed(15)) this.gamepadKeys['KeyD'] = true; 
                if (isPressed(12)) this.gamepadKeys['KeyW'] = true; 
                if (isPressed(13)) this.gamepadKeys['KeyS'] = true; 

                // Action Buttons
                if (isPressed(0)) this.gamepadKeys['Space'] = true;

                // Roundhouse-Kick (Chuck) — freier "A"-Knopf (Face-Button Index 1)
                if (isPressed(1)) this.gamepadKeys['KeyE'] = true;

                // Shoot
                if (isPressed(2) || isPressed(5) || isPressed(7)) {
                    this.gamepadKeys['KeyF'] = true; 
                }
            
                // Secondary Action
                if (isPressed(3) || isPressed(4) || isPressed(6)) {
                    this.gamepadKeys['KeyQ'] = true; 
                }

                // Start & Select
                if (isPressed(9)) this.gamepadKeys['Enter'] = true; 
                if (isPressed(8)) this.gamepadKeys['Escape'] = true; 

                // Feature: JEDER Knopf auf dem Gamepad kann das Spiel im Menü starten
                if (window.gameInstance && window.gameInstance.state !== 'PLAYING') {
                    for (let b = 0; b < (gp.buttons ? gp.buttons.length : 0); b++) {
                        if (isPressed(b)) {
                            this.gamepadKeys['Enter'] = true;
                            break;
                        }
                    }
                }
            
                // Native Custom Events feuern anstatt KeyboardEvents zu simulieren
                if (this.gamepadKeys['Enter'] && !this.previousKeys['Enter']) {
                    window.dispatchEvent(new Event('gamepadStart'));
                }
                if (this.gamepadKeys['Escape'] && !this.previousKeys['Escape']) {
                    window.dispatchEvent(new Event('gamepadPause'));
                }
            
                break;
        }
    }

    isDown(code) {
        return !!(this.keys[code] || this.gamepadKeys[code]);
    }
    
    isJustPressed(code) {
        const current = !!(this.keys[code] || this.gamepadKeys[code]);
        const previous = !!this.previousKeys[code];
        return current && !previous;
    }
    
    isJustReleased(code) {
        const current = !!(this.keys[code] || this.gamepadKeys[code]);
        const previous = !!this.previousKeys[code];
        return !current && previous;
    }
}