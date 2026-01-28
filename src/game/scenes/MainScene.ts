import Phaser from 'phaser';

const TILE_SIZE = 32;
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const PLAYER_SPEED = 400;

// Terrain types
const TERRAIN = {
  GRASS: 0,
  WATER: 1,
  SAND: 2,
  DUNGEON: 3,
  STONE: 4,
  FLOWER: 5,
  PATH: 6,
};

// Questions for interactive objects
const QUESTIONS = [
  { q: "What is 2 + 2?", a: "4" },
  { q: "What color is the sky?", a: "Blue" },
  { q: "How many days in a week?", a: "7" },
  { q: "What is the capital of France?", a: "Paris" },
  { q: "What planet are we on?", a: "Earth" },
  { q: "How many legs does a spider have?", a: "8" },
  { q: "What is H2O?", a: "Water" },
  { q: "What is 10 x 10?", a: "100" },
];

interface InteractiveObject {
  container: Phaser.GameObjects.Container;
  type: string;
  question: { q: string; a: string };
}

export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private mapData: number[][] = [];
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private decorations!: Phaser.GameObjects.Group;
  private positionText!: Phaser.GameObjects.Text;
  private interactiveObjects: InteractiveObject[] = [];
  private questionBox!: Phaser.GameObjects.Container;
  private isQuestionOpen = false;
  private interactHint!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    this.generateMap();
    this.createTerrain();
    this.createDecorations();
    this.createInteractiveObjects();
    this.createPlayer();
    this.setupCamera();
    this.setupControls();
    this.createUI();
    this.createQuestionBox();
    this.createInteractHint();
  }

  private generateMap() {
    const noise = this.createNoiseMap();
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.mapData[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        const value = noise[y][x];
        
        if (value < 0.25) {
          this.mapData[y][x] = TERRAIN.WATER;
        } else if (value < 0.35) {
          this.mapData[y][x] = TERRAIN.SAND;
        } else if (value < 0.65) {
          this.mapData[y][x] = TERRAIN.GRASS;
        } else if (value < 0.75) {
          this.mapData[y][x] = TERRAIN.FLOWER;
        } else {
          this.mapData[y][x] = TERRAIN.DUNGEON;
        }

        if (x === Math.floor(MAP_WIDTH / 2) || y === Math.floor(MAP_HEIGHT / 2)) {
          if (this.mapData[y][x] !== TERRAIN.WATER) {
            this.mapData[y][x] = TERRAIN.PATH;
          }
        }

        if (Math.random() < 0.02 && this.mapData[y][x] === TERRAIN.GRASS) {
          this.mapData[y][x] = TERRAIN.STONE;
        }
      }
    }
  }

  private createNoiseMap(): number[][] {
    const noise: number[][] = [];
    const scale = 0.08;
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
      noise[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        
        for (let octave = 0; octave < 4; octave++) {
          value += this.smoothNoise(x * frequency, y * frequency) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        
        noise[y][x] = (value + 1) / 2;
      }
    }
    
    return noise;
  }

  private smoothNoise(x: number, y: number): number {
    const seedX = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const seedY = Math.sin(x * 93.9898 + y * 67.345) * 24634.6345;
    return Math.sin(seedX + seedY);
  }

  private createTerrain() {
    this.terrainGraphics = this.add.graphics();
    
    const colors: Record<number, number> = {
      [TERRAIN.GRASS]: 0x4a7c3c,
      [TERRAIN.WATER]: 0x3d85c6,
      [TERRAIN.SAND]: 0xd4a574,
      [TERRAIN.DUNGEON]: 0x2a1a3d,
      [TERRAIN.STONE]: 0x666666,
      [TERRAIN.FLOWER]: 0x5c8a4c,
      [TERRAIN.PATH]: 0x8b7355,
    };

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const terrain = this.mapData[y][x];
        const color = colors[terrain];
        
        const variation = Phaser.Math.Between(-10, 10);
        const r = ((color >> 16) & 0xFF) + variation;
        const g = ((color >> 8) & 0xFF) + variation;
        const b = (color & 0xFF) + variation;
        const finalColor = (Math.max(0, Math.min(255, r)) << 16) | 
                          (Math.max(0, Math.min(255, g)) << 8) | 
                          Math.max(0, Math.min(255, b));
        
        this.terrainGraphics.fillStyle(finalColor);
        this.terrainGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        if (terrain === TERRAIN.WATER) {
          this.terrainGraphics.fillStyle(0x4d95d6, 0.3);
          this.terrainGraphics.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, 8, 4);
        }

        // Add dungeon floor pattern
        if (terrain === TERRAIN.DUNGEON) {
          this.terrainGraphics.fillStyle(0x3d2a5c, 0.5);
          this.terrainGraphics.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, 4, 4);
          this.terrainGraphics.fillRect(x * TILE_SIZE + 26, y * TILE_SIZE + 26, 4, 4);
        }
      }
    }
  }

  private createDecorations() {
    this.decorations = this.add.group();

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const terrain = this.mapData[y][x];
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        // Add dungeon decorations (skulls, torches)
        if (terrain === TERRAIN.DUNGEON && Math.random() < 0.15) {
          this.createDungeonDecor(worldX, worldY);
        }

        if (terrain === TERRAIN.FLOWER && Math.random() < 0.5) {
          this.createFlower(worldX, worldY);
        }

        if (terrain === TERRAIN.STONE) {
          this.createRock(worldX, worldY);
        }

        if (terrain === TERRAIN.GRASS && Math.random() < 0.1) {
          this.createGrassTuft(worldX, worldY);
        }
      }
    }
  }

  private createDungeonDecor(x: number, y: number) {
    const container = this.add.container(x, y);
    
    if (Math.random() < 0.5) {
      // Skull
      const skull = this.add.circle(0, 0, 8, 0xd4d4d4);
      const leftEye = this.add.circle(-3, -2, 2, 0x1a1a1a);
      const rightEye = this.add.circle(3, -2, 2, 0x1a1a1a);
      const jaw = this.add.rectangle(0, 4, 8, 3, 0xb0b0b0);
      container.add([skull, leftEye, rightEye, jaw]);
    } else {
      // Torch
      const pole = this.add.rectangle(0, 4, 4, 16, 0x5c4033);
      const flame1 = this.add.circle(0, -6, 6, 0xff6600);
      const flame2 = this.add.circle(0, -8, 4, 0xffcc00);
      container.add([pole, flame1, flame2]);
    }
    
    container.setDepth(y);
    this.decorations.add(container);
  }

  private createFlower(x: number, y: number) {
    const colors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff85a2];
    const color = colors[Phaser.Math.Between(0, colors.length - 1)];
    
    const flower = this.add.circle(x, y, 4, color);
    const center = this.add.circle(x, y, 2, 0xffeb3b);
    
    this.decorations.add(flower);
    this.decorations.add(center);
  }

  private createRock(x: number, y: number) {
    const rock = this.add.ellipse(x, y, 
      Phaser.Math.Between(12, 20), 
      Phaser.Math.Between(8, 14), 
      0x808080
    );
    
    const highlight = this.add.ellipse(x - 2, y - 2, 6, 4, 0xa0a0a0);
    
    this.decorations.add(rock);
    this.decorations.add(highlight);
  }

  private createGrassTuft(x: number, y: number) {
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x5a8a4a);
    
    for (let i = 0; i < 3; i++) {
      const offsetX = (i - 1) * 4;
      graphics.beginPath();
      graphics.moveTo(x + offsetX, y + 4);
      graphics.lineTo(x + offsetX + (Math.random() - 0.5) * 4, y - 8);
      graphics.strokePath();
    }
    
    this.decorations.add(graphics);
  }

  private createInteractiveObjects() {
    // Place dustbins and traffic lights on grass/path areas
    let placedCount = 0;
    const maxObjects = 30;

    for (let y = 10; y < MAP_HEIGHT - 10 && placedCount < maxObjects; y += 8) {
      for (let x = 10; x < MAP_WIDTH - 10 && placedCount < maxObjects; x += 8) {
        const terrain = this.mapData[y][x];
        if ((terrain === TERRAIN.GRASS || terrain === TERRAIN.PATH) && Math.random() < 0.4) {
          const worldX = x * TILE_SIZE + TILE_SIZE / 2;
          const worldY = y * TILE_SIZE + TILE_SIZE / 2;
          
          if (Math.random() < 0.5) {
            this.createDustbin(worldX, worldY);
          } else {
            this.createTrafficLight(worldX, worldY);
          }
          placedCount++;
        }
      }
    }
  }

  private createDustbin(x: number, y: number) {
    const container = this.add.container(x, y);
    
    // Bin body
    const body = this.add.rectangle(0, 4, 20, 28, 0x3d5a3d);
    body.setStrokeStyle(2, 0x2a3d2a);
    
    // Lid
    const lid = this.add.rectangle(0, -10, 24, 6, 0x4a6b4a);
    lid.setStrokeStyle(2, 0x2a3d2a);
    
    // Handle
    const handle = this.add.rectangle(0, -14, 8, 3, 0x666666);
    
    // Question mark indicator
    const questionMark = this.add.text(0, -24, '?', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    container.add([body, lid, handle, questionMark]);
    container.setDepth(y);
    container.setSize(24, 36);
    container.setInteractive({ useHandCursor: true });
    
    const question = QUESTIONS[Phaser.Math.Between(0, QUESTIONS.length - 1)];
    
    container.on('pointerdown', () => {
      this.showQuestion(question, 'dustbin');
    });
    
    this.interactiveObjects.push({ container, type: 'dustbin', question });
    this.decorations.add(container);
  }

  private createTrafficLight(x: number, y: number) {
    const container = this.add.container(x, y);
    
    // Pole
    const pole = this.add.rectangle(0, 20, 6, 40, 0x444444);
    
    // Light box
    const box = this.add.rectangle(0, -8, 16, 36, 0x333333);
    box.setStrokeStyle(2, 0x222222);
    
    // Lights
    const redLight = this.add.circle(0, -20, 5, 0xff3333);
    const yellowLight = this.add.circle(0, -8, 5, 0xffcc00);
    const greenLight = this.add.circle(0, 4, 5, 0x33cc33);
    
    // Question mark indicator
    const questionMark = this.add.text(0, -40, '?', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    container.add([pole, box, redLight, yellowLight, greenLight, questionMark]);
    container.setDepth(y);
    container.setSize(20, 60);
    container.setInteractive({ useHandCursor: true });
    
    const question = QUESTIONS[Phaser.Math.Between(0, QUESTIONS.length - 1)];
    
    container.on('pointerdown', () => {
      this.showQuestion(question, 'traffic light');
    });
    
    this.interactiveObjects.push({ container, type: 'traffic light', question });
    this.decorations.add(container);
  }

  private createQuestionBox() {
    this.questionBox = this.add.container(0, 0);
    this.questionBox.setScrollFactor(0);
    this.questionBox.setDepth(3000);
    this.questionBox.setVisible(false);
  }

  private showQuestion(question: { q: string; a: string }, objectType: string) {
    if (this.isQuestionOpen) return;
    this.isQuestionOpen = true;
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Clear previous content
    this.questionBox.removeAll(true);
    
    // Background overlay
    const overlay = this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
    overlay.setInteractive();
    
    // Question box background
    const boxBg = this.add.rectangle(centerX, centerY, 320, 200, 0x1a1a2e);
    boxBg.setStrokeStyle(3, 0x4ecdc4);
    
    // Title
    const title = this.add.text(centerX, centerY - 70, `📦 ${objectType.toUpperCase()}`, {
      fontSize: '14px',
      fontFamily: '"Press Start 2P"',
      color: '#4ecdc4',
    }).setOrigin(0.5);
    
    // Question text
    const questionText = this.add.text(centerX, centerY - 20, question.q, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      wordWrap: { width: 280 },
      align: 'center',
    }).setOrigin(0.5);
    
    // Answer text
    const answerText = this.add.text(centerX, centerY + 30, `Answer: ${question.a}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffd93d',
    }).setOrigin(0.5);
    
    // Close button
    const closeBtn = this.add.rectangle(centerX, centerY + 70, 100, 30, 0x4ecdc4);
    closeBtn.setInteractive({ useHandCursor: true });
    
    const closeText = this.add.text(centerX, centerY + 70, 'CLOSE', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P"',
      color: '#1a1a2e',
    }).setOrigin(0.5);
    
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x6ee0d8));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x4ecdc4));
    closeBtn.on('pointerdown', () => this.hideQuestion());
    overlay.on('pointerdown', () => this.hideQuestion());
    
    this.questionBox.add([overlay, boxBg, title, questionText, answerText, closeBtn, closeText]);
    this.questionBox.setVisible(true);
  }

  private hideQuestion() {
    this.questionBox.setVisible(false);
    this.isQuestionOpen = false;
  }

  private createInteractHint() {
    this.interactHint = this.add.container(0, 0);
    this.interactHint.setScrollFactor(0);
    this.interactHint.setDepth(2500);
    this.interactHint.setVisible(false);
    
    const hintBg = this.add.rectangle(0, 0, 140, 24, 0x000000, 0.7);
    const hintText = this.add.text(0, 0, 'Click to interact!', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ffcc00',
    }).setOrigin(0.5);
    
    this.interactHint.add([hintBg, hintText]);
    this.interactHint.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 60);
  }

  private createPlayer() {
    const startX = (MAP_WIDTH / 2) * TILE_SIZE;
    const startY = (MAP_HEIGHT / 2) * TILE_SIZE;
    
    this.player = this.add.container(startX, startY);
    
    const shadow = this.add.ellipse(0, 12, 20, 8, 0x000000, 0.3);
    this.playerBody = this.add.rectangle(0, 0, 20, 24, 0x4ecdc4);
    this.playerBody.setStrokeStyle(2, 0x2c3e50);
    
    const head = this.add.circle(0, -16, 12, 0xffeaa7);
    head.setStrokeStyle(2, 0x2c3e50);
    
    const leftEye = this.add.circle(-4, -18, 3, 0x2c3e50);
    const rightEye = this.add.circle(4, -18, 3, 0x2c3e50);
    
    const hair = this.add.arc(0, -20, 12, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false, 0x8b4513);
    
    this.player.add([shadow, this.playerBody, head, hair, leftEye, rightEye]);
    this.player.setDepth(1000);
    
    this.physics.world.enable(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 24);
    body.setOffset(-10, -12);
    body.setCollideWorldBounds(true);
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
  }

  private setupControls() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private createUI() {
    this.positionText = this.add.text(16, 16, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 6 },
    });
    this.positionText.setScrollFactor(0);
    this.positionText.setDepth(2000);
  }

  update() {
    if (this.isQuestionOpen) return; // Pause movement when question is open
    
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -PLAYER_SPEED;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = PLAYER_SPEED;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -PLAYER_SPEED;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = PLAYER_SPEED;
    }

    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    body.setVelocity(velocityX, velocityY);
    this.player.setDepth(this.player.y);

    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor(this.player.y / TILE_SIZE);
    
    if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
      if (this.mapData[tileY][tileX] === TERRAIN.WATER) {
        body.velocity.x *= 0.5;
        body.velocity.y *= 0.5;
      }
    }

    this.positionText.setText(`X: ${tileX} Y: ${tileY}`);

    if (velocityX !== 0 || velocityY !== 0) {
      this.playerBody.y = Math.sin(this.time.now * 0.01) * 2;
    } else {
      this.playerBody.y = 0;
    }

    // Check proximity to interactive objects
    let nearObject = false;
    for (const obj of this.interactiveObjects) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        obj.container.x, obj.container.y
      );
      if (dist < 60) {
        nearObject = true;
        break;
      }
    }
    this.interactHint.setVisible(nearObject);
  }
}
