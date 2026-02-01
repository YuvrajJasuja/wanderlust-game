import Phaser from 'phaser';

const TILE_SIZE = 32;
const MAP_WIDTH = 120;
const MAP_HEIGHT = 120;
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
  { q: "What does DNS stand for?", a: "domain name system", hint: "Networking", points: 15 },
  { q: "What is the default MySQL port?", a: "3306", hint: "Databases", points: 20 },
  { q: "What does RAM stand for?", a: "random access memory", hint: "Hardware", points: 10 },
  { q: "What is 0b1010 in decimal?", a: "10", hint: "Binary", points: 15 },
  { q: "What hash algorithm produces 128-bit digest?", a: "md5", hint: "Cryptography", points: 25 },
];

interface InteractiveObject {
  container: Phaser.GameObjects.Container;
  type: string;
  question: { q: string; a: string; hint: string; points: number };
  solved: boolean;
}

interface MovingCar {
  container: Phaser.GameObjects.Container;
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;
  startX: number;
  startY: number;
  maxTravel: number;
}

interface NPC {
  container: Phaser.GameObjects.Container;
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;
  walkTimer: number;
  pauseTimer: number;
  isPaused: boolean;
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
  private buildingBodies: Phaser.Physics.Arcade.StaticGroup | null = null;
  private movingCars: MovingCar[] = [];
  private npcs: NPC[] = [];
  private htmlInput: HTMLInputElement | null = null;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    this.generateCityMap();
    this.createTerrain();
    this.createBuildingColliders();
    this.createCityDecorations();
    this.createMovingCars();
    this.createNPCs();
    this.createInteractiveObjects();
    this.createPlayer();
    this.setupCollisions();
    this.setupCamera();
    this.setupControls();
    this.createUI();
    this.createQuestionBox();
    this.createInteractHint();
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
    const roadSpacing = 15;
    for (let i = 0; i < MAP_WIDTH; i++) {
      for (let road = roadSpacing; road < MAP_WIDTH; road += roadSpacing) {
        if (road < MAP_WIDTH) {
          this.mapData[i][road] = TERRAIN.ROAD;
          this.mapData[i][road + 1] = TERRAIN.ROAD;
          if (road + 2 < MAP_WIDTH) this.mapData[i][road + 2] = TERRAIN.ROAD;
        }
        if (road < MAP_HEIGHT && i < MAP_HEIGHT) {
          this.mapData[road][i] = TERRAIN.ROAD;
          this.mapData[road + 1][i] = TERRAIN.ROAD;
          if (road + 2 < MAP_HEIGHT) this.mapData[road + 2][i] = TERRAIN.ROAD;
        }
      }
    }

    // Add crosswalks at intersections
    for (let roadY = roadSpacing; roadY < MAP_HEIGHT; roadY += roadSpacing) {
      for (let roadX = roadSpacing; roadX < MAP_WIDTH; roadX += roadSpacing) {
        for (let dy = -1; dy <= 3; dy++) {
          for (let dx = -1; dx <= 3; dx++) {
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
        const buildingSize = Phaser.Math.Between(4, 7);
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
      { x: 25, y: 25 },
      { x: 70, y: 45 },
      { x: 15, y: 80 },
      { x: 90, y: 25 },
      { x: 55, y: 90 },
    ];
    
    for (const park of parkLocations) {
      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
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

  private createBuildingColliders() {
    this.buildingBodies = this.physics.add.staticGroup();
    
    // Track which building tiles we've already processed
    const processed: boolean[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      processed[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        processed[y][x] = false;
      }
    }

    // Find building clusters and create colliders
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.mapData[y][x] === TERRAIN.BUILDING && !processed[y][x]) {
          // Find the extent of this building
          let maxX = x;
          let maxY = y;
          
          // Find width
          while (maxX + 1 < MAP_WIDTH && this.mapData[y][maxX + 1] === TERRAIN.BUILDING && !processed[y][maxX + 1]) {
            maxX++;
          }
          
          // Find height
          let validRow = true;
          while (validRow && maxY + 1 < MAP_HEIGHT) {
            for (let checkX = x; checkX <= maxX; checkX++) {
              if (this.mapData[maxY + 1][checkX] !== TERRAIN.BUILDING || processed[maxY + 1][checkX]) {
                validRow = false;
                break;
              }
            }
            if (validRow) maxY++;
          }
          
          // Mark as processed
          for (let py = y; py <= maxY; py++) {
            for (let px = x; px <= maxX; px++) {
              processed[py][px] = true;
            }
          }
          
          // Create collider for this building
          const width = (maxX - x + 1) * TILE_SIZE;
          const height = (maxY - y + 1) * TILE_SIZE;
          const centerX = x * TILE_SIZE + width / 2;
          const centerY = y * TILE_SIZE + height / 2;
          
          const collider = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0);
          this.buildingBodies.add(collider);
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

        // Buildings (visual only - collision handled separately)
        if (terrain === TERRAIN.BUILDING) {
          this.createBuilding(worldX, worldY);
        }

        // Park decorations
        if (terrain === TERRAIN.PARK && Math.random() < 0.12) {
          this.createParkDecor(worldX, worldY);
        }

        // Street trees
        if (terrain === TERRAIN.SIDEWALK && Math.random() < 0.02) {
          this.createStreetTree(worldX, worldY);
        }
      }
    }
  }

  private createMovingCars() {
    const carColors = [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa, 0xff6f00, 0x00897b];
    let carCount = 0;
    const maxCars = 25;
    const roadSpacing = 15;

    // Place cars on main roads
    for (let roadIdx = roadSpacing; roadIdx < MAP_WIDTH && carCount < maxCars; roadIdx += roadSpacing) {
      // Horizontal roads
      if (Math.random() < 0.7) {
        const y = roadIdx + 1;
        const x = Phaser.Math.Between(5, MAP_WIDTH - 10);
        if (y < MAP_HEIGHT && this.mapData[y]?.[x] === TERRAIN.ROAD) {
          const worldX = x * TILE_SIZE;
          const worldY = y * TILE_SIZE + TILE_SIZE / 2;
          const direction = Math.random() < 0.5 ? 'left' : 'right';
          this.createMovingCar(worldX, worldY, carColors[carCount % carColors.length], true, direction);
          carCount++;
        }
      }
      
      // Vertical roads
      if (Math.random() < 0.7 && carCount < maxCars) {
        const x = roadIdx + 1;
        const y = Phaser.Math.Between(5, MAP_HEIGHT - 10);
        if (x < MAP_WIDTH && this.mapData[y]?.[x] === TERRAIN.ROAD) {
          const worldX = x * TILE_SIZE + TILE_SIZE / 2;
          const worldY = y * TILE_SIZE;
          const direction = Math.random() < 0.5 ? 'up' : 'down';
          this.createMovingCar(worldX, worldY, carColors[carCount % carColors.length], false, direction);
          carCount++;
        }
      }
    }
  }

  private createMovingCar(x: number, y: number, color: number, isHorizontal: boolean, direction: 'up' | 'down' | 'left' | 'right') {
    const container = this.add.container(x, y);
    
    if (isHorizontal) {
      const flipX = direction === 'left' ? -1 : 1;
      const body = this.add.rectangle(0, 0, 48, 24, color);
      body.setStrokeStyle(2, 0x1a1a1a);
      const roof = this.add.rectangle(0, 0, 24, 18, this.darkenColor(color, 30));
      const frontLight = this.add.rectangle(22 * flipX, -6, 4, 6, 0xffffaa);
      const frontLight2 = this.add.rectangle(22 * flipX, 6, 4, 6, 0xffffaa);
      const rearLight = this.add.rectangle(-22 * flipX, -6, 4, 6, 0xff3333);
      const rearLight2 = this.add.rectangle(-22 * flipX, 6, 4, 6, 0xff3333);
      const wheel1 = this.add.rectangle(-14, -12, 10, 6, 0x1a1a1a);
      const wheel2 = this.add.rectangle(14, -12, 10, 6, 0x1a1a1a);
      const wheel3 = this.add.rectangle(-14, 12, 10, 6, 0x1a1a1a);
      const wheel4 = this.add.rectangle(14, 12, 10, 6, 0x1a1a1a);
      container.add([wheel1, wheel2, wheel3, wheel4, body, roof, frontLight, frontLight2, rearLight, rearLight2]);
    } else {
      const flipY = direction === 'up' ? -1 : 1;
      const body = this.add.rectangle(0, 0, 24, 48, color);
      body.setStrokeStyle(2, 0x1a1a1a);
      const roof = this.add.rectangle(0, 0, 18, 24, this.darkenColor(color, 30));
      const frontLight = this.add.rectangle(-6, -22 * flipY, 6, 4, 0xffffaa);
      const frontLight2 = this.add.rectangle(6, -22 * flipY, 6, 4, 0xffffaa);
      const rearLight = this.add.rectangle(-6, 22 * flipY, 6, 4, 0xff3333);
      const rearLight2 = this.add.rectangle(6, 22 * flipY, 6, 4, 0xff3333);
      const wheel1 = this.add.rectangle(-12, -14, 6, 10, 0x1a1a1a);
      const wheel2 = this.add.rectangle(-12, 14, 6, 10, 0x1a1a1a);
      const wheel3 = this.add.rectangle(12, -14, 6, 10, 0x1a1a1a);
      const wheel4 = this.add.rectangle(12, 14, 6, 10, 0x1a1a1a);
      container.add([wheel1, wheel2, wheel3, wheel4, body, roof, frontLight, frontLight2, rearLight, rearLight2]);
    }
    
    container.setDepth(y);
    this.decorations.add(container);
    
    this.movingCars.push({
      container,
      direction,
      speed: Phaser.Math.Between(60, 120),
      startX: x,
      startY: y,
      maxTravel: Phaser.Math.Between(300, 600),
    });
  }

  private createNPCs() {
    const skinColors = [0xffeaa7, 0xf5cba7, 0xd4a574, 0x8b6914, 0x5d4e37];
    const shirtColors = [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa, 0xff6f00, 0x00897b, 0xff69b4, 0x9c27b0];
    const hairColors = [0x000000, 0x5d4037, 0xffd54f, 0x8b0000, 0x2d2d2d, 0xff8c00];
    let npcCount = 0;
    const maxNPCs = 35;

    for (let y = 5; y < MAP_HEIGHT - 5 && npcCount < maxNPCs; y += 6) {
      for (let x = 5; x < MAP_WIDTH - 5 && npcCount < maxNPCs; x += 8) {
        const terrain = this.mapData[y]?.[x];
        if ((terrain === TERRAIN.SIDEWALK || terrain === TERRAIN.PARK) && Math.random() < 0.35) {
          const worldX = x * TILE_SIZE + TILE_SIZE / 2;
          const worldY = y * TILE_SIZE + TILE_SIZE / 2;
          
          const skinColor = skinColors[Phaser.Math.Between(0, skinColors.length - 1)];
          const shirtColor = shirtColors[Phaser.Math.Between(0, shirtColors.length - 1)];
          const hairColor = hairColors[Phaser.Math.Between(0, hairColors.length - 1)];
          
          this.createNPC(worldX, worldY, skinColor, shirtColor, hairColor);
          npcCount++;
        }
      }
    }
  }

  private createNPC(x: number, y: number, skinColor: number, shirtColor: number, hairColor: number) {
    const container = this.add.container(x, y);
    
    // Shadow
    const shadow = this.add.ellipse(0, 10, 16, 6, 0x000000, 0.3);
    
    // Body
    const body = this.add.rectangle(0, 0, 14, 18, shirtColor);
    body.setStrokeStyle(1, this.darkenColor(shirtColor, 40));
    
    // Legs (will animate)
    const leftLeg = this.add.rectangle(-3, 12, 5, 10, 0x3d3d3d);
    leftLeg.setName('leftLeg');
    const rightLeg = this.add.rectangle(3, 12, 5, 10, 0x3d3d3d);
    rightLeg.setName('rightLeg');
    
    // Head
    const head = this.add.circle(0, -12, 8, skinColor);
    head.setStrokeStyle(1, this.darkenColor(skinColor, 30));
    
    // Hair
    const hair = this.add.arc(0, -14, 8, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false, hairColor);
    
    // Eyes
    const leftEye = this.add.circle(-3, -13, 2, 0x2c3e50);
    const rightEye = this.add.circle(3, -13, 2, 0x2c3e50);
    
    container.add([shadow, leftLeg, rightLeg, body, head, hair, leftEye, rightEye]);
    container.setDepth(y);
    this.decorations.add(container);
    
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
    
    this.npcs.push({
      container,
      direction: directions[Phaser.Math.Between(0, 3)],
      speed: Phaser.Math.Between(30, 60),
      walkTimer: Phaser.Math.Between(2000, 5000),
      pauseTimer: 0,
      isPaused: false,
    });
  }

  private updateMovingCars(delta: number) {
    for (const car of this.movingCars) {
      const moveAmount = car.speed * (delta / 1000);
      
      switch (car.direction) {
        case 'left':
          car.container.x -= moveAmount;
          if (car.container.x < car.startX - car.maxTravel) {
            car.direction = 'right';
          }
          break;
        case 'right':
          car.container.x += moveAmount;
          if (car.container.x > car.startX + car.maxTravel) {
            car.direction = 'left';
          }
          break;
        case 'up':
          car.container.y -= moveAmount;
          if (car.container.y < car.startY - car.maxTravel) {
            car.direction = 'down';
          }
          break;
        case 'down':
          car.container.y += moveAmount;
          if (car.container.y > car.startY + car.maxTravel) {
            car.direction = 'up';
          }
          break;
      }
      
      car.container.setDepth(car.container.y);
    }
  }

  private updateNPCs(delta: number) {
    for (const npc of this.npcs) {
      if (npc.isPaused) {
        npc.pauseTimer -= delta;
        if (npc.pauseTimer <= 0) {
          npc.isPaused = false;
          // Pick new random direction
          const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
          npc.direction = directions[Phaser.Math.Between(0, 3)];
          npc.walkTimer = Phaser.Math.Between(2000, 5000);
        }
        continue;
      }
      
      npc.walkTimer -= delta;
      if (npc.walkTimer <= 0) {
        npc.isPaused = true;
        npc.pauseTimer = Phaser.Math.Between(1000, 3000);
        continue;
      }
      
      const moveAmount = npc.speed * (delta / 1000);
      let newX = npc.container.x;
      let newY = npc.container.y;
      
      switch (npc.direction) {
        case 'left':
          newX -= moveAmount;
          break;
        case 'right':
          newX += moveAmount;
          break;
        case 'up':
          newY -= moveAmount;
          break;
        case 'down':
          newY += moveAmount;
          break;
      }
      
      // Check if new position is walkable (sidewalk or park)
      const tileX = Math.floor(newX / TILE_SIZE);
      const tileY = Math.floor(newY / TILE_SIZE);
      
      if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
        const terrain = this.mapData[tileY]?.[tileX];
        if (terrain === TERRAIN.SIDEWALK || terrain === TERRAIN.PARK || terrain === TERRAIN.CROSSWALK) {
          npc.container.x = newX;
          npc.container.y = newY;
        } else {
          // Turn around
          const opposites: Record<string, 'up' | 'down' | 'left' | 'right'> = {
            'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'
          };
          npc.direction = opposites[npc.direction];
        }
      } else {
        // Turn around at map edge
        const opposites: Record<string, 'up' | 'down' | 'left' | 'right'> = {
          'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'
        };
        npc.direction = opposites[npc.direction];
      }
      
      // Animate legs
      const leftLeg = npc.container.getByName('leftLeg') as Phaser.GameObjects.Rectangle;
      const rightLeg = npc.container.getByName('rightLeg') as Phaser.GameObjects.Rectangle;
      if (leftLeg && rightLeg) {
        const legSwing = Math.sin(this.time.now * 0.01) * 3;
        leftLeg.y = 12 + legSwing;
        rightLeg.y = 12 - legSwing;
      }
      
      npc.container.setDepth(npc.container.y);
    }
  }

  private darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xFF) - amount);
    const g = Math.max(0, ((color >> 8) & 0xFF) - amount);
    const b = Math.max(0, (color & 0xFF) - amount);
    return (r << 16) | (g << 8) | b;
  }

  private createBuilding(x: number, y: number) {
    const container = this.add.container(x, y);
    const height = Phaser.Math.Between(50, 100);
    const colors = [0x8b7355, 0x9a8b7a, 0x7a6b5a, 0xa08070, 0x6a5a4a, 0x5a6a7a, 0x7a5a6a];
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
    const maxObjects = 30;

    for (let y = 5; y < MAP_HEIGHT - 5 && placedCount < maxObjects; y += 8) {
      for (let x = 5; x < MAP_WIDTH - 5 && placedCount < maxObjects; x += 8) {
        const terrain = this.mapData[y][x];
        if ((terrain === TERRAIN.SIDEWALK || terrain === TERRAIN.PARK) && Math.random() < 0.4) {
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
    
    // Remove existing HTML input if any
    this.removeHtmlInput();
    
    // Overlay
    const overlay = this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8);
    overlay.setInteractive();
    overlay.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    
    // Question box
    const boxBg = this.add.rectangle(centerX, centerY, 380, 300, 0x1a1a2e);
    boxBg.setStrokeStyle(3, 0x00ff88);
    
    // Header
    const header = this.add.rectangle(centerX, centerY - 125, 380, 40, 0x00ff88);
    const headerText = this.add.text(centerX, centerY - 125, `🚩 CTF CHALLENGE [${obj.question.points} pts]`, {
      fontSize: '14px',
      fontFamily: '"Press Start 2P"',
      color: '#1a1a2e',
    }).setOrigin(0.5);
    
    // Category/hint
    const hintText = this.add.text(centerX, centerY - 85, `Category: ${obj.question.hint}`, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#00ff88',
    }).setOrigin(0.5);
    
    // Question
    const questionText = this.add.text(centerX, centerY - 40, obj.question.q, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      wordWrap: { width: 340 },
      align: 'center',
    }).setOrigin(0.5);
    
    // Input display (visual only)
    const inputBg = this.add.rectangle(centerX, centerY + 25, 320, 40, 0x2a2a4e);
    inputBg.setStrokeStyle(2, 0x00ff88);
    
    this.inputText = this.add.text(centerX, centerY + 25, '> Click here to type...', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#888888',
    }).setOrigin(0.5);
    
    // Create HTML input for actual typing
    this.createHtmlInput(centerX, centerY + 25);
    
    // Submit button
    const submitBtn = this.add.rectangle(centerX - 70, centerY + 85, 110, 40, 0x00ff88);
    submitBtn.setInteractive({ useHandCursor: true });
    const submitText = this.add.text(centerX - 70, centerY + 85, 'SUBMIT', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P"',
      color: '#1a1a2e',
    }).setOrigin(0.5);
    
    submitBtn.on('pointerover', () => submitBtn.setFillStyle(0x44ffaa));
    submitBtn.on('pointerout', () => submitBtn.setFillStyle(0x00ff88));
    submitBtn.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.submitAnswer();
    });
    
    // Close button
    const closeBtn = this.add.rectangle(centerX + 70, centerY + 85, 110, 40, 0xff4444);
    closeBtn.setInteractive({ useHandCursor: true });
    const closeText = this.add.text(centerX + 70, centerY + 85, 'CLOSE', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P"',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0xff6666));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0xff4444));
    closeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.hideQuestion();
    });
    
    // Instructions
    const instructions = this.add.text(centerX, centerY + 130, 'Type your answer and press SUBMIT or ENTER', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#666666',
    }).setOrigin(0.5);
    
    this.questionBox.add([overlay, boxBg, header, headerText, hintText, questionText, inputBg, this.inputText, submitBtn, submitText, closeBtn, closeText, instructions]);
    this.questionBox.setVisible(true);
  }

  private createHtmlInput(x: number, y: number) {
    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate position relative to canvas
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    
    const inputX = canvasRect.left + (x - 160) * scaleX;
    const inputY = canvasRect.top + (y - 20) * scaleY;
    const inputWidth = 320 * scaleX;
    const inputHeight = 40 * scaleY;
    
    this.htmlInput = document.createElement('input');
    this.htmlInput.type = 'text';
    this.htmlInput.placeholder = 'Type your answer here...';
    this.htmlInput.style.cssText = `
      position: fixed;
      left: ${inputX}px;
      top: ${inputY}px;
      width: ${inputWidth}px;
      height: ${inputHeight}px;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      background: rgba(42, 42, 78, 0.95);
      border: 2px solid #00ff88;
      color: #00ff88;
      padding: 8px 12px;
      box-sizing: border-box;
      outline: none;
      z-index: 10000;
      border-radius: 4px;
    `;
    
    this.htmlInput.addEventListener('input', () => {
      if (this.htmlInput) {
        this.answerInput = this.htmlInput.value;
        this.updateInputDisplay();
      }
    });
    
    this.htmlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitAnswer();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hideQuestion();
      }
    });
    
    document.body.appendChild(this.htmlInput);
    
    // Focus the input after a short delay
    setTimeout(() => {
      if (this.htmlInput) {
        this.htmlInput.focus();
      }
    }, 100);
  }

  private removeHtmlInput() {
    if (this.htmlInput && this.htmlInput.parentNode) {
      this.htmlInput.parentNode.removeChild(this.htmlInput);
      this.htmlInput = null;
    }
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
        if (this.htmlInput) {
          this.htmlInput.value = '';
          this.htmlInput.focus();
        }
        this.updateInputDisplay();
      }
    });
  }

  private hideQuestion() {
    this.removeHtmlInput();
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
    const startX = 18 * TILE_SIZE;
    const startY = 18 * TILE_SIZE;
    
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
    body.setSize(16, 20);
    body.setOffset(-8, -10);
    body.setCollideWorldBounds(true);
  }

  private setupCollisions() {
    // Collide with buildings
    if (this.buildingBodies) {
      this.physics.add.collider(this.player, this.buildingBodies);
    }
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

  update(_time: number, delta: number) {
    // Update moving entities regardless of question state
    this.updateMovingCars(delta);
    this.updateNPCs(delta);
    
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

  shutdown() {
    this.removeHtmlInput();
  }
}
