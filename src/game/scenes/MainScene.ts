import Phaser from 'phaser';

const TILE_SIZE = 32;
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const PLAYER_SPEED = 200;

// Terrain types
const TERRAIN = {
  GRASS: 0,
  WATER: 1,
  SAND: 2,
  FOREST: 3,
  STONE: 4,
  FLOWER: 5,
  PATH: 6,
};

export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private mapData: number[][] = [];
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private decorations!: Phaser.GameObjects.Group;
  private positionText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    this.generateMap();
    this.createTerrain();
    this.createDecorations();
    this.createPlayer();
    this.setupCamera();
    this.setupControls();
    this.createUI();
  }

  private generateMap() {
    // Use Perlin-like noise simulation for natural terrain
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
          this.mapData[y][x] = TERRAIN.FOREST;
        }

        // Add paths
        if (x === Math.floor(MAP_WIDTH / 2) || y === Math.floor(MAP_HEIGHT / 2)) {
          if (this.mapData[y][x] !== TERRAIN.WATER) {
            this.mapData[y][x] = TERRAIN.PATH;
          }
        }

        // Add stone formations
        if (Math.random() < 0.02 && this.mapData[y][x] === TERRAIN.GRASS) {
          this.mapData[y][x] = TERRAIN.STONE;
        }
      }
    }
  }

  private createNoiseMap(): number[][] {
    const noise: number[][] = [];
    const scale = 0.08;
    
    // Simple fractal noise
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
      [TERRAIN.FOREST]: 0x2d5a2d,
      [TERRAIN.STONE]: 0x666666,
      [TERRAIN.FLOWER]: 0x5c8a4c,
      [TERRAIN.PATH]: 0x8b7355,
    };

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const terrain = this.mapData[y][x];
        const color = colors[terrain];
        
        // Add slight variation
        const variation = Phaser.Math.Between(-10, 10);
        const r = ((color >> 16) & 0xFF) + variation;
        const g = ((color >> 8) & 0xFF) + variation;
        const b = (color & 0xFF) + variation;
        const finalColor = (Math.max(0, Math.min(255, r)) << 16) | 
                          (Math.max(0, Math.min(255, g)) << 8) | 
                          Math.max(0, Math.min(255, b));
        
        this.terrainGraphics.fillStyle(finalColor);
        this.terrainGraphics.fillRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );

        // Add water shimmer effect
        if (terrain === TERRAIN.WATER) {
          this.terrainGraphics.fillStyle(0x4d95d6, 0.3);
          this.terrainGraphics.fillRect(
            x * TILE_SIZE + 4,
            y * TILE_SIZE + 4,
            8,
            4
          );
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

        // Add trees in forest areas
        if (terrain === TERRAIN.FOREST && Math.random() < 0.6) {
          this.createTree(worldX, worldY);
        }

        // Add flowers
        if (terrain === TERRAIN.FLOWER && Math.random() < 0.5) {
          this.createFlower(worldX, worldY);
        }

        // Add rocks
        if (terrain === TERRAIN.STONE) {
          this.createRock(worldX, worldY);
        }

        // Add grass tufts
        if (terrain === TERRAIN.GRASS && Math.random() < 0.1) {
          this.createGrassTuft(worldX, worldY);
        }
      }
    }
  }

  private createTree(x: number, y: number) {
    const container = this.add.container(x, y);
    
    // Trunk
    const trunk = this.add.rectangle(0, 8, 8, 16, 0x5c4033);
    
    // Foliage layers
    const foliage1 = this.add.circle(0, -8, 16, 0x228b22);
    const foliage2 = this.add.circle(-6, -4, 10, 0x2e8b2e);
    const foliage3 = this.add.circle(6, -4, 10, 0x2e8b2e);
    const foliage4 = this.add.circle(0, -16, 12, 0x32cd32);
    
    container.add([trunk, foliage1, foliage2, foliage3, foliage4]);
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
    
    // Highlight
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

  private createPlayer() {
    const startX = (MAP_WIDTH / 2) * TILE_SIZE;
    const startY = (MAP_HEIGHT / 2) * TILE_SIZE;
    
    this.player = this.add.container(startX, startY);
    
    // Shadow
    const shadow = this.add.ellipse(0, 12, 20, 8, 0x000000, 0.3);
    
    // Body
    this.playerBody = this.add.rectangle(0, 0, 20, 24, 0x4ecdc4);
    this.playerBody.setStrokeStyle(2, 0x2c3e50);
    
    // Head
    const head = this.add.circle(0, -16, 12, 0xffeaa7);
    head.setStrokeStyle(2, 0x2c3e50);
    
    // Eyes
    const leftEye = this.add.circle(-4, -18, 3, 0x2c3e50);
    const rightEye = this.add.circle(4, -18, 3, 0x2c3e50);
    
    // Hair
    const hair = this.add.arc(0, -20, 12, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false, 0x8b4513);
    
    this.player.add([shadow, this.playerBody, head, hair, leftEye, rightEye]);
    this.player.setDepth(1000);
    
    // Enable physics
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
    
    // Set world bounds
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
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let velocityX = 0;
    let velocityY = 0;

    // Horizontal movement
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -PLAYER_SPEED;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = PLAYER_SPEED;
    }

    // Vertical movement
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -PLAYER_SPEED;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = PLAYER_SPEED;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    body.setVelocity(velocityX, velocityY);

    // Update player depth for proper layering
    this.player.setDepth(this.player.y);

    // Check if player is in water (slow down)
    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor(this.player.y / TILE_SIZE);
    
    if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
      if (this.mapData[tileY][tileX] === TERRAIN.WATER) {
        body.velocity.x *= 0.5;
        body.velocity.y *= 0.5;
      }
    }

    // Update position display
    this.positionText.setText(`X: ${Math.floor(this.player.x / TILE_SIZE)} Y: ${Math.floor(this.player.y / TILE_SIZE)}`);

    // Simple bob animation when moving
    if (velocityX !== 0 || velocityY !== 0) {
      this.playerBody.y = Math.sin(this.time.now * 0.01) * 2;
    } else {
      this.playerBody.y = 0;
    }
  }
}
