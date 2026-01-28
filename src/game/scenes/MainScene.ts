import Phaser from 'phaser';

const TILE_SIZE = 32;
const MAP_WIDTH = 60;
const MAP_HEIGHT = 60;
const PLAYER_SPEED = 400;

// City terrain types
const TERRAIN = {
  ROAD: 0,
  SIDEWALK: 1,
  GRASS: 2,
  BUILDING: 3,
  PARK: 4,
  CROSSWALK: 5,
};

// CTF Questions with varying difficulty
const CTF_QUESTIONS = [
  { q: "What does HTML stand for?", a: "hypertext markup language", hint: "Web basics", points: 10 },
  { q: "What port does HTTP use by default?", a: "80", hint: "Networking", points: 15 },
  { q: "What is 0x1F in decimal?", a: "31", hint: "Hex conversion", points: 20 },
  { q: "What command lists files in Linux?", a: "ls", hint: "Linux basics", points: 10 },
  { q: "What does SQL stand for?", a: "structured query language", hint: "Databases", points: 15 },
  { q: "What is the binary of 42?", a: "101010", hint: "Binary conversion", points: 20 },
  { q: "What protocol encrypts HTTP?", a: "https", hint: "Security", points: 15 },
  { q: "What port does SSH use?", a: "22", hint: "Networking", points: 15 },
  { q: "What is 2^10?", a: "1024", hint: "Powers of 2", points: 10 },
  { q: "What does CPU stand for?", a: "central processing unit", hint: "Hardware", points: 10 },
  { q: "What is the localhost IP?", a: "127.0.0.1", hint: "Networking", points: 15 },
  { q: "What encoding uses A-Z, a-z, 0-9, +, /?", a: "base64", hint: "Encoding", points: 20 },
  { q: "What does API stand for?", a: "application programming interface", hint: "Development", points: 15 },
  { q: "What is ROT13 of 'hello'?", a: "uryyb", hint: "Cipher", points: 25 },
  { q: "What file extension do Python scripts use?", a: "py", hint: "Programming", points: 10 },
];

interface InteractiveObject {
  container: Phaser.GameObjects.Container;
  type: string;
  question: { q: string; a: string; hint: string; points: number };
  solved: boolean;
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
  private scoreText!: Phaser.GameObjects.Text;
  private interactiveObjects: InteractiveObject[] = [];
  private questionBox!: Phaser.GameObjects.Container;
  private isQuestionOpen = false;
  private interactHint!: Phaser.GameObjects.Container;
  private currentQuestion: InteractiveObject | null = null;
  private answerInput = '';
  private score = 0;
  private inputText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    this.generateCityMap();
    this.createTerrain();
    this.createCityDecorations();
    this.createInteractiveObjects();
    this.createPlayer();
    this.setupCamera();
    this.setupControls();
    this.createUI();
    this.createQuestionBox();
    this.createInteractHint();
    this.setupKeyboardInput();
  }

  private generateCityMap() {
    // Initialize with grass
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.mapData[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.mapData[y][x] = TERRAIN.GRASS;
      }
    }

    // Create main roads (grid pattern)
    const roadSpacing = 12;
    for (let i = 0; i < MAP_WIDTH; i++) {
      for (let road = roadSpacing; road < MAP_WIDTH; road += roadSpacing) {
        if (road < MAP_WIDTH) {
          this.mapData[i][road] = TERRAIN.ROAD;
          this.mapData[i][road + 1] = TERRAIN.ROAD;
        }
        if (road < MAP_HEIGHT && i < MAP_HEIGHT) {
          this.mapData[road][i] = TERRAIN.ROAD;
          this.mapData[road + 1][i] = TERRAIN.ROAD;
        }
      }
    }

    // Add crosswalks at intersections
    for (let roadY = roadSpacing; roadY < MAP_HEIGHT; roadY += roadSpacing) {
      for (let roadX = roadSpacing; roadX < MAP_WIDTH; roadX += roadSpacing) {
        for (let dy = -1; dy <= 2; dy++) {
          for (let dx = -1; dx <= 2; dx++) {
            const y = roadY + dy;
            const x = roadX + dx;
            if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
              this.mapData[y][x] = TERRAIN.CROSSWALK;
            }
          }
        }
      }
    }

    // Add sidewalks next to roads
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.mapData[y][x] === TERRAIN.ROAD || this.mapData[y][x] === TERRAIN.CROSSWALK) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
                if (this.mapData[ny][nx] === TERRAIN.GRASS) {
                  this.mapData[ny][nx] = TERRAIN.SIDEWALK;
                }
              }
            }
          }
        }
      }
    }

    // Add building blocks
    for (let blockY = 3; blockY < MAP_HEIGHT - 3; blockY += roadSpacing) {
      for (let blockX = 3; blockX < MAP_WIDTH - 3; blockX += roadSpacing) {
        // Create building footprints in each block
        const buildingSize = Phaser.Math.Between(3, 5);
        for (let by = 0; by < buildingSize; by++) {
          for (let bx = 0; bx < buildingSize; bx++) {
            const y = blockY + by;
            const x = blockX + bx;
            if (y < MAP_HEIGHT && x < MAP_WIDTH && this.mapData[y][x] === TERRAIN.GRASS) {
              this.mapData[y][x] = TERRAIN.BUILDING;
            }
          }
        }
      }
    }

    // Add parks (larger green areas)
    const parkLocations = [
      { x: 20, y: 20 },
      { x: 45, y: 35 },
      { x: 8, y: 45 },
    ];
    
    for (const park of parkLocations) {
      for (let py = 0; py < 6; py++) {
        for (let px = 0; px < 6; px++) {
          const y = park.y + py;
          const x = park.x + px;
          if (y < MAP_HEIGHT && x < MAP_WIDTH && this.mapData[y][x] !== TERRAIN.ROAD) {
            this.mapData[y][x] = TERRAIN.PARK;
          }
        }
      }
    }
  }

  private createTerrain() {
    this.terrainGraphics = this.add.graphics();
    
    const colors: Record<number, number> = {
      [TERRAIN.ROAD]: 0x3d3d3d,
      [TERRAIN.SIDEWALK]: 0xa0a0a0,
      [TERRAIN.GRASS]: 0x4a7c3c,
      [TERRAIN.BUILDING]: 0x5a5a6a,
      [TERRAIN.PARK]: 0x5c8a4c,
      [TERRAIN.CROSSWALK]: 0x4d4d4d,
    };

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const terrain = this.mapData[y][x];
        const color = colors[terrain];
        
        const variation = Phaser.Math.Between(-8, 8);
        const r = ((color >> 16) & 0xFF) + variation;
        const g = ((color >> 8) & 0xFF) + variation;
        const b = (color & 0xFF) + variation;
        const finalColor = (Math.max(0, Math.min(255, r)) << 16) | 
                          (Math.max(0, Math.min(255, g)) << 8) | 
                          Math.max(0, Math.min(255, b));
        
        this.terrainGraphics.fillStyle(finalColor);
        this.terrainGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Road markings
        if (terrain === TERRAIN.ROAD) {
          if ((x + y) % 4 === 0) {
            this.terrainGraphics.fillStyle(0xffff00, 0.8);
            this.terrainGraphics.fillRect(x * TILE_SIZE + 14, y * TILE_SIZE + 14, 4, 4);
          }
        }

        // Crosswalk stripes
        if (terrain === TERRAIN.CROSSWALK) {
          this.terrainGraphics.fillStyle(0xffffff, 0.9);
          for (let stripe = 0; stripe < 4; stripe++) {
            this.terrainGraphics.fillRect(x * TILE_SIZE + stripe * 8, y * TILE_SIZE + 2, 6, TILE_SIZE - 4);
          }
        }

        // Sidewalk texture
        if (terrain === TERRAIN.SIDEWALK) {
          this.terrainGraphics.fillStyle(0x909090, 0.3);
          this.terrainGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, 1, TILE_SIZE);
          this.terrainGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, 1);
        }
      }
    }
  }

  private createCityDecorations() {
    this.decorations = this.add.group();

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const terrain = this.mapData[y][x];
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        // Buildings
        if (terrain === TERRAIN.BUILDING) {
          this.createBuilding(worldX, worldY);
        }

        // Park decorations
        if (terrain === TERRAIN.PARK && Math.random() < 0.15) {
          this.createParkDecor(worldX, worldY);
        }

        // Street trees
        if (terrain === TERRAIN.SIDEWALK && Math.random() < 0.03) {
          this.createStreetTree(worldX, worldY);
        }
      }
    }
  }

  private createBuilding(x: number, y: number) {
    const container = this.add.container(x, y);
    const height = Phaser.Math.Between(40, 80);
    const colors = [0x8b7355, 0x9a8b7a, 0x7a6b5a, 0xa08070, 0x6a5a4a];
    const color = colors[Phaser.Math.Between(0, colors.length - 1)];
    
    // Building body
    const body = this.add.rectangle(0, -height / 2 + 16, 28, height, color);
    body.setStrokeStyle(2, 0x3a3a3a);
    
    // Windows
    const windowColor = Math.random() < 0.3 ? 0xffffaa : 0x87ceeb;
    for (let wy = 0; wy < Math.floor(height / 16); wy++) {
      for (let wx = -1; wx <= 1; wx += 2) {
        const window = this.add.rectangle(wx * 8, -height + 20 + wy * 14, 5, 8, windowColor);
        container.add(window);
      }
    }
    
    // Roof
    const roof = this.add.rectangle(0, -height + 10, 32, 6, 0x4a4a4a);
    
    container.add([body, roof]);
    container.setDepth(y + height);
    this.decorations.add(container);
  }

  private createParkDecor(x: number, y: number) {
    if (Math.random() < 0.5) {
      // Tree
      const trunk = this.add.rectangle(x, y + 8, 6, 16, 0x5d4037);
      const leaves = this.add.circle(x, y - 8, 14, 0x2e7d32);
      leaves.setDepth(y);
      trunk.setDepth(y - 1);
      this.decorations.add(trunk);
      this.decorations.add(leaves);
    } else {
      // Flower bed
      const colors = [0xff6b6b, 0xffd93d, 0xff85a2, 0x9b59b6];
      for (let i = 0; i < 5; i++) {
        const flower = this.add.circle(
          x + Phaser.Math.Between(-8, 8),
          y + Phaser.Math.Between(-8, 8),
          3,
          colors[Phaser.Math.Between(0, colors.length - 1)]
        );
        flower.setDepth(y);
        this.decorations.add(flower);
      }
    }
  }

  private createStreetTree(x: number, y: number) {
    const container = this.add.container(x, y);
    const trunk = this.add.rectangle(0, 6, 4, 12, 0x5d4037);
    const leaves = this.add.circle(0, -6, 10, 0x388e3c);
    container.add([trunk, leaves]);
    container.setDepth(y);
    this.decorations.add(container);
  }

  private createInteractiveObjects() {
    const objectTypes = ['mailbox', 'phone_booth', 'newspaper', 'trash_can', 'bench', 'atm', 'vending_machine', 'sign'];
    let questionIndex = 0;
    let placedCount = 0;
    const maxObjects = 15;

    for (let y = 5; y < MAP_HEIGHT - 5 && placedCount < maxObjects; y += 6) {
      for (let x = 5; x < MAP_WIDTH - 5 && placedCount < maxObjects; x += 6) {
        const terrain = this.mapData[y][x];
        if ((terrain === TERRAIN.SIDEWALK || terrain === TERRAIN.PARK) && Math.random() < 0.5) {
          const worldX = x * TILE_SIZE + TILE_SIZE / 2;
          const worldY = y * TILE_SIZE + TILE_SIZE / 2;
          const type = objectTypes[placedCount % objectTypes.length];
          const question = CTF_QUESTIONS[questionIndex % CTF_QUESTIONS.length];
          
          this.createCityObject(worldX, worldY, type, question);
          questionIndex++;
          placedCount++;
        }
      }
    }
  }

  private createCityObject(x: number, y: number, type: string, question: { q: string; a: string; hint: string; points: number }) {
    const container = this.add.container(x, y);
    
    switch (type) {
      case 'mailbox':
        this.drawMailbox(container);
        break;
      case 'phone_booth':
        this.drawPhoneBooth(container);
        break;
      case 'newspaper':
        this.drawNewspaper(container);
        break;
      case 'trash_can':
        this.drawTrashCan(container);
        break;
      case 'bench':
        this.drawBench(container);
        break;
      case 'atm':
        this.drawATM(container);
        break;
      case 'vending_machine':
        this.drawVendingMachine(container);
        break;
      case 'sign':
        this.drawSign(container);
        break;
    }
    
    // CTF flag indicator
    const flag = this.add.text(0, -35, '🚩', { fontSize: '16px' }).setOrigin(0.5);
    container.add(flag);
    
    container.setDepth(y);
    container.setSize(30, 40);
    container.setInteractive({ useHandCursor: true });
    
    const obj: InteractiveObject = { container, type, question, solved: false };
    
    container.on('pointerdown', () => {
      if (!obj.solved) {
        this.showQuestion(obj);
      }
    });
    
    this.interactiveObjects.push(obj);
    this.decorations.add(container);
  }

  private drawMailbox(container: Phaser.GameObjects.Container) {
    const post = this.add.rectangle(0, 10, 4, 20, 0x444444);
    const box = this.add.rectangle(0, -4, 16, 20, 0x1e88e5);
    box.setStrokeStyle(2, 0x1565c0);
    const slot = this.add.rectangle(0, -2, 10, 2, 0x0d47a1);
    container.add([post, box, slot]);
  }

  private drawPhoneBooth(container: Phaser.GameObjects.Container) {
    const booth = this.add.rectangle(0, 0, 20, 40, 0xc62828);
    booth.setStrokeStyle(2, 0x8e0000);
    const window = this.add.rectangle(0, -5, 14, 20, 0x87ceeb);
    const phone = this.add.circle(0, 10, 4, 0x333333);
    container.add([booth, window, phone]);
  }

  private drawNewspaper(container: Phaser.GameObjects.Container) {
    const stand = this.add.rectangle(0, 8, 20, 16, 0xff8f00);
    stand.setStrokeStyle(2, 0xe65100);
    const papers = this.add.rectangle(0, -2, 18, 8, 0xffffff);
    const headline = this.add.rectangle(0, -2, 14, 2, 0x333333);
    container.add([stand, papers, headline]);
  }

  private drawTrashCan(container: Phaser.GameObjects.Container) {
    const can = this.add.rectangle(0, 4, 18, 24, 0x4caf50);
    can.setStrokeStyle(2, 0x2e7d32);
    const lid = this.add.rectangle(0, -10, 22, 4, 0x388e3c);
    const recycle = this.add.text(0, 4, '♻', { fontSize: '12px' }).setOrigin(0.5);
    container.add([can, lid, recycle]);
  }

  private drawBench(container: Phaser.GameObjects.Container) {
    const seat = this.add.rectangle(0, 4, 30, 6, 0x795548);
    const leg1 = this.add.rectangle(-10, 12, 4, 12, 0x5d4037);
    const leg2 = this.add.rectangle(10, 12, 4, 12, 0x5d4037);
    const back = this.add.rectangle(0, -6, 28, 4, 0x795548);
    container.add([leg1, leg2, seat, back]);
  }

  private drawATM(container: Phaser.GameObjects.Container) {
    const machine = this.add.rectangle(0, 0, 22, 36, 0x37474f);
    machine.setStrokeStyle(2, 0x263238);
    const screen = this.add.rectangle(0, -8, 16, 12, 0x4fc3f7);
    const keypad = this.add.rectangle(0, 8, 14, 10, 0x607d8b);
    container.add([machine, screen, keypad]);
  }

  private drawVendingMachine(container: Phaser.GameObjects.Container) {
    const machine = this.add.rectangle(0, 0, 24, 40, 0xe53935);
    machine.setStrokeStyle(2, 0xb71c1c);
    const window = this.add.rectangle(0, -6, 18, 20, 0x263238);
    const slot = this.add.rectangle(0, 14, 8, 4, 0x333333);
    container.add([machine, window, slot]);
  }

  private drawSign(container: Phaser.GameObjects.Container) {
    const post = this.add.rectangle(0, 12, 4, 24, 0x757575);
    const sign = this.add.rectangle(0, -6, 24, 16, 0xffc107);
    sign.setStrokeStyle(2, 0xffa000);
    const text = this.add.text(0, -6, 'CTF', { fontSize: '10px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
    container.add([post, sign, text]);
  }

  private createQuestionBox() {
    this.questionBox = this.add.container(0, 0);
    this.questionBox.setScrollFactor(0);
    this.questionBox.setDepth(3000);
    this.questionBox.setVisible(false);
  }

  private showQuestion(obj: InteractiveObject) {
    if (this.isQuestionOpen) return;
    this.isQuestionOpen = true;
    this.currentQuestion = obj;
    this.answerInput = '';
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    this.questionBox.removeAll(true);
    
    // Overlay
    const overlay = this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8);
    overlay.setInteractive();
    
    // Question box
    const boxBg = this.add.rectangle(centerX, centerY, 380, 280, 0x1a1a2e);
    boxBg.setStrokeStyle(3, 0x00ff88);
    
    // Header
    const header = this.add.rectangle(centerX, centerY - 115, 380, 40, 0x00ff88);
    const headerText = this.add.text(centerX, centerY - 115, `🚩 CTF CHALLENGE [${obj.question.points} pts]`, {
      fontSize: '14px',
      fontFamily: '"Press Start 2P"',
      color: '#1a1a2e',
    }).setOrigin(0.5);
    
    // Category/hint
    const hintText = this.add.text(centerX, centerY - 75, `Category: ${obj.question.hint}`, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#00ff88',
    }).setOrigin(0.5);
    
    // Question
    const questionText = this.add.text(centerX, centerY - 30, obj.question.q, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      wordWrap: { width: 340 },
      align: 'center',
    }).setOrigin(0.5);
    
    // Answer input box
    const inputBg = this.add.rectangle(centerX, centerY + 30, 320, 36, 0x2a2a4e);
    inputBg.setStrokeStyle(2, 0x00ff88);
    
    this.inputText = this.add.text(centerX - 150, centerY + 30, '> Type your answer...', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#888888',
    }).setOrigin(0, 0.5);
    
    // Submit button
    const submitBtn = this.add.rectangle(centerX - 60, centerY + 85, 100, 36, 0x00ff88);
    submitBtn.setInteractive({ useHandCursor: true });
    const submitText = this.add.text(centerX - 60, centerY + 85, 'SUBMIT', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P"',
      color: '#1a1a2e',
    }).setOrigin(0.5);
    
    submitBtn.on('pointerover', () => submitBtn.setFillStyle(0x44ffaa));
    submitBtn.on('pointerout', () => submitBtn.setFillStyle(0x00ff88));
    submitBtn.on('pointerdown', () => this.submitAnswer());
    
    // Close button
    const closeBtn = this.add.rectangle(centerX + 60, centerY + 85, 100, 36, 0xff4444);
    closeBtn.setInteractive({ useHandCursor: true });
    const closeText = this.add.text(centerX + 60, centerY + 85, 'CLOSE', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P"',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0xff6666));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0xff4444));
    closeBtn.on('pointerdown', () => this.hideQuestion());
    
    // Instructions
    const instructions = this.add.text(centerX, centerY + 120, 'Type your answer and press SUBMIT or ENTER', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#666666',
    }).setOrigin(0.5);
    
    this.questionBox.add([overlay, boxBg, header, headerText, hintText, questionText, inputBg, this.inputText, submitBtn, submitText, closeBtn, closeText, instructions]);
    this.questionBox.setVisible(true);
  }

  private setupKeyboardInput() {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (!this.isQuestionOpen) return;
      
      if (event.key === 'Enter') {
        this.submitAnswer();
      } else if (event.key === 'Escape') {
        this.hideQuestion();
      } else if (event.key === 'Backspace') {
        this.answerInput = this.answerInput.slice(0, -1);
        this.updateInputDisplay();
      } else if (event.key.length === 1 && this.answerInput.length < 50) {
        this.answerInput += event.key;
        this.updateInputDisplay();
      }
    });
  }

  private updateInputDisplay() {
    if (this.inputText) {
      this.inputText.setText(this.answerInput.length > 0 ? `> ${this.answerInput}_` : '> Type your answer...');
      this.inputText.setColor(this.answerInput.length > 0 ? '#00ff88' : '#888888');
    }
  }

  private submitAnswer() {
    if (!this.currentQuestion || this.answerInput.trim() === '') return;
    
    const correct = this.answerInput.toLowerCase().trim() === this.currentQuestion.question.a.toLowerCase();
    
    if (correct) {
      this.score += this.currentQuestion.question.points;
      this.currentQuestion.solved = true;
      this.scoreText.setText(`SCORE: ${this.score}`);
      
      // Mark as solved visually
      const flag = this.currentQuestion.container.list.find((obj) => obj instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text;
      if (flag) {
        flag.setText('✅');
      }
      
      this.showResult(true, this.currentQuestion.question.points);
    } else {
      this.showResult(false, 0);
    }
  }

  private showResult(correct: boolean, points: number) {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const resultBg = this.add.rectangle(centerX, centerY, 300, 100, correct ? 0x00aa00 : 0xaa0000);
    resultBg.setStrokeStyle(3, correct ? 0x00ff00 : 0xff0000);
    resultBg.setScrollFactor(0);
    resultBg.setDepth(4000);
    
    const resultText = this.add.text(centerX, centerY - 15, correct ? '🎉 CORRECT!' : '❌ WRONG!', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P"',
      color: '#ffffff',
    }).setOrigin(0.5);
    resultText.setScrollFactor(0);
    resultText.setDepth(4000);
    
    const subText = this.add.text(centerX, centerY + 20, correct ? `+${points} points` : 'Try again!', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    subText.setScrollFactor(0);
    subText.setDepth(4000);
    
    this.time.delayedCall(1500, () => {
      resultBg.destroy();
      resultText.destroy();
      subText.destroy();
      if (correct) {
        this.hideQuestion();
      } else {
        this.answerInput = '';
        this.updateInputDisplay();
      }
    });
  }

  private hideQuestion() {
    this.questionBox.setVisible(false);
    this.isQuestionOpen = false;
    this.currentQuestion = null;
    this.answerInput = '';
  }

  private createInteractHint() {
    this.interactHint = this.add.container(0, 0);
    this.interactHint.setScrollFactor(0);
    this.interactHint.setDepth(2500);
    this.interactHint.setVisible(false);
    
    const hintBg = this.add.rectangle(0, 0, 180, 28, 0x000000, 0.8);
    hintBg.setStrokeStyle(1, 0x00ff88);
    const hintText = this.add.text(0, 0, '🚩 Click to solve CTF!', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#00ff88',
    }).setOrigin(0.5);
    
    this.interactHint.add([hintBg, hintText]);
    this.interactHint.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 50);
  }

  private createPlayer() {
    const startX = 14 * TILE_SIZE;
    const startY = 14 * TILE_SIZE;
    
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

    this.scoreText = this.add.text(16, 45, 'SCORE: 0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      color: '#00ff88',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 6 },
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(2000);
  }

  update() {
    if (this.isQuestionOpen) return;
    
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
    this.positionText.setText(`X: ${tileX} Y: ${tileY}`);

    if (velocityX !== 0 || velocityY !== 0) {
      this.playerBody.y = Math.sin(this.time.now * 0.01) * 2;
    } else {
      this.playerBody.y = 0;
    }

    // Check proximity to unsolved interactive objects
    let nearObject = false;
    for (const obj of this.interactiveObjects) {
      if (obj.solved) continue;
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
