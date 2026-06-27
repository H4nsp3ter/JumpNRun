// Level 1 - The Beginning of Adventure
// Advanced modular level implementation

class Level1 {
    constructor(game) {
        this.game = game;
        this.levelId = 1;
        this.name = "The Beginning of Adventure";
        this.description = "Discover the basics of the game world!";
        this.difficulty = "Beginner";
        this.playerStartPos = { x: 50, y: 50 };
        this.background = "forest";
        
        // Level modules
        this.modules = {
            playerModule: new PlayerModule(this.game),
            enemyModule: new EnemyModule(this.game),
            terrainModule: new TerrainModule(this.game),
            uiModule: new UIModule(this.game),
            soundModule: new SoundModule(this.game)
        };
        
        this.init();
    }
    
    init() {
        console.log("Initializing Level 1");
        this.setupLevel();
        this.modules.playerModule.initPlayer(this.playerStartPos);
        this.modules.enemyModule.spawnEnemies();
        this.modules.terrainModule.generateTerrain();
        this.modules.uiModule.setupUI();
        this.modules.soundModule.playBackgroundMusic();
    }
    
    setupLevel() {
        // Level-specific setup
        this.game.camera.setPosition(0, 0);
        this.game.world.setBounds(0, 0, 1000, 800);
        
        // Add level triggers and events
        this.addTriggers();
    }
    
    addTriggers() {
        // Example trigger for tutorial
        this.game.events.on('player-interact', (data) => {
            if (data.action === 'pickup' && data.item === 'sword') {
                this.modules.uiModule.showMessage("Congratulations! You've found your first weapon!");
                this.game.player.setWeapon('sword');
            }
        });
    }
    
    update(deltaTime) {
        // Update all modules
        Object.values(this.modules).forEach(module => {
            if (typeof module.update === 'function') {
                module.update(deltaTime);
            }
        });
        
        // Level-specific logic
        this.checkWinCondition();
    }
    
    checkWinCondition() {
        // Simple win condition for level 1
        if (this.game.player.hasWeapon('sword')) {
            this.game.events.emit('level-complete', { levelId: this.levelId });
        }
    }
    
    destroy() {
        // Clean up all modules
        Object.values(this.modules).forEach(module => {
            if (typeof module.destroy === 'function') {
                module.destroy();
            }
        });
    }
}

// Module classes
class PlayerModule {
    constructor(game) {
        this.game = game;
    }
    
    initPlayer(position) {
        this.game.player = new Player(position.x, position.y);
        this.game.player.setHealth(100);
        this.game.player.setSpeed(5);
        console.log("Player initialized");
    }
    
    update(deltaTime) {
        // Player movement logic
        const keys = this.game.input.keys;
        if (keys['ArrowLeft'] || keys['a']) this.game.player.moveLeft();
        if (keys['ArrowRight'] || keys['d']) this.game.player.moveRight();
        if (keys['ArrowUp'] || keys['w']) this.game.player.moveUp();
        if (keys['ArrowDown'] || keys['s']) this.game.player.moveDown();
    }
    
    destroy() {
        // Clean up player resources
        console.log("Player module destroyed");
    }
}

class EnemyModule {
    constructor(game) {
        this.game = game;
        this.enemies = [];
    }
    
    spawnEnemies() {
        // Spawn initial enemies
        for (let i = 0; i < 3; i++) {
            const enemy = new Enemy(200 + i * 100, 200, 'goblin');
            this.enemies.push(enemy);
            this.game.addEntity(enemy);
        }
        console.log("Enemies spawned");
    }
    
    update(deltaTime) {
        // Update all enemies
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime);
        });
    }
    
    destroy() {
        // Clean up enemies
        console.log("Enemy module destroyed");
    }
}

class TerrainModule {
    constructor(game) {
        this.game = game;
        this.terrain = [];
    }
    
    generateTerrain() {
        // Generate level terrain (simple example)
        const terrainElements = [
            { type: 'grass', x: 0, y: 700, width: 1000, height: 100 },
            { type: 'tree', x: 300, y: 600, width: 50, height: 100 },
            { type: 'rock', x: 700, y: 650, width: 80, height: 50 }
        ];
        
        terrainElements.forEach(element => {
            const terrain = new Terrain(element.type, element.x, element.y, element.width, element.height);
            this.terrain.push(terrain);
            this.game.addEntity(terrain);
        });
        
        console.log("Terrain generated");
    }
    
    update(deltaTime) {
        // Update terrain elements if needed
    }
    
    destroy() {
        console.log("Terrain module destroyed");
    }
}

class UIModule {
    constructor(game) {
        this.game = game;
        this.messageQueue = [];
    }
    
    setupUI() {
        // Setup UI elements
        this.game.ui.addDisplay('health', 'Health: 100');
        this.game.ui.addDisplay('weapon', 'Weapon: None');
        console.log("UI initialized");
    }
    
    showMessage(text) {
        this.messageQueue.push({
            text: text,
            time: Date.now()
        });
        console.log(`Message: ${text}`);
    }
    
    update(deltaTime) {
        // Update UI messages
        if (this.messageQueue.length > 0) {
            const now = Date.now();
            this.messageQueue = this.messageQueue.filter(msg => (now - msg.time) < 5000);
        }
    }
    
    destroy() {
        console.log("UI module destroyed");
    }
}

class SoundModule {
    constructor(game) {
        this.game = game;
        this.backgroundMusic = null;
    }
    
    playBackgroundMusic() {
        // Simulate playing background music
        this.backgroundMusic = { 
            name: "Adventure Theme", 
            volume: 0.5,
            loop: true
        };
        console.log("Playing background music: Adventure Theme");
    }
    
    update(deltaTime) {
        // Update sound effects if needed
    }
    
    destroy() {
        this.backgroundMusic = null;
        console.log("Sound module destroyed");
    }
}

// Export the new level implementation
module.exports = Level1;