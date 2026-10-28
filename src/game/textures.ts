import * as THREE from 'three';
import { BlockType } from './types';

// Helper to create a 16x16 canvas
function create16Canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

// Pseudo random seeded helper for deterministic texture noise
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Generate base textures
function generateDirtCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const baseColors = ['#866043', '#725137', '#5f422b', '#956e4f', '#6c4b31'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoRandom(x * 17 + y * 31) * baseColors.length);
      ctx.fillStyle = baseColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function generateGrassTopCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const greens = ['#5b9c33', '#4f8a2a', '#6ab53d', '#427821', '#54942d'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoRandom(x * 23 + y * 41 + 101) * greens.length);
      ctx.fillStyle = greens[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function generateGrassSideCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  // Start with dirt base
  const dirtCanvas = generateDirtCanvas();
  ctx.drawImage(dirtCanvas, 0, 0);

  // Add grass fringe on top
  const greens = ['#5b9c33', '#4f8a2a', '#6ab53d', '#427821'];
  for (let x = 0; x < 16; x++) {
    // Top 2 pixels are full grass
    for (let y = 0; y < 2; y++) {
      ctx.fillStyle = greens[Math.floor(pseudoRandom(x * 7 + y * 13) * greens.length)];
      ctx.fillRect(x, y, 1, 1);
    }
    // Grass drips down 2 to 5 pixels irregularly
    const drip = Math.floor(pseudoRandom(x * 19 + 50) * 3) + 2;
    for (let y = 2; y <= drip; y++) {
      ctx.fillStyle = greens[Math.floor(pseudoRandom(x * 11 + y * 29) * greens.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function generateStoneCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const stones = ['#808080', '#747474', '#686868', '#8c8c8c', '#5e5e5e', '#7b7b7b'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoRandom(x * 29 + y * 13 + 500) * stones.length);
      ctx.fillStyle = stones[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function generateCobblestoneCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const base = ['#696969', '#5a5a5a', '#787878', '#4f4f4f'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = base[Math.floor(pseudoRandom(x * 37 + y * 17) * base.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Draw mortar / stone outlines
  ctx.fillStyle = '#3a3a3a';
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 0) {
      ctx.fillRect(0, i, 16, 1);
      ctx.fillRect(i, 0, 1, 16);
    }
  }
  // Add some stone highlights
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(2, 2, 2, 1);
  ctx.fillRect(6, 6, 2, 1);
  ctx.fillRect(10, 2, 2, 1);
  ctx.fillRect(13, 10, 2, 1);
  return canvas;
}

function generateWoodSideCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const bark = ['#654a2a', '#543d22', '#765733', '#43311a'];
  for (let x = 0; x < 16; x++) {
    const colGroup = Math.floor(x / 2);
    for (let y = 0; y < 16; y++) {
      const seed = colGroup * 33 + y * 7;
      const idx = Math.floor(pseudoRandom(seed) * bark.length);
      ctx.fillStyle = bark[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Vertical bark fissures
  ctx.fillStyle = '#302211';
  ctx.fillRect(4, 0, 1, 16);
  ctx.fillRect(11, 0, 1, 16);
  return canvas;
}

function generateWoodTopCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  // Bark rim
  ctx.fillStyle = '#543d22';
  ctx.fillRect(0, 0, 16, 16);
  // Interior rings
  ctx.fillStyle = '#9c7746';
  ctx.fillRect(2, 2, 12, 12);
  ctx.fillStyle = '#7a5a32';
  ctx.fillRect(4, 4, 8, 8);
  ctx.fillStyle = '#b08752';
  ctx.fillRect(6, 6, 4, 4);
  ctx.fillStyle = '#654826';
  ctx.fillRect(7, 7, 2, 2);
  return canvas;
}

function generateLeavesCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const greens = ['#2e751f', '#3c9629', '#245e18', '#4bb334', '#1d4d13'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoRandom(x * 53 + y * 47 + 77) * greens.length);
      ctx.fillStyle = greens[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function generatePlanksCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const planks = ['#b8945f', '#aa8754', '#c9a46e', '#9b7a48'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = planks[Math.floor(pseudoRandom(x * 19 + y * 23) * planks.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Horizontal plank seams
  ctx.fillStyle = '#614828';
  ctx.fillRect(0, 3, 16, 1);
  ctx.fillRect(0, 7, 16, 1);
  ctx.fillRect(0, 11, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  // Vertical nail splits
  ctx.fillRect(5, 0, 1, 4);
  ctx.fillRect(11, 4, 1, 4);
  ctx.fillRect(3, 8, 1, 4);
  ctx.fillRect(9, 12, 1, 4);
  return canvas;
}

function generateSandCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const sands = ['#dccfa3', '#d2c494', '#e6dab1', '#c6b683'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = sands[Math.floor(pseudoRandom(x * 43 + y * 67 + 3) * sands.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function generateGlassCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  ctx.fillStyle = 'rgba(210, 235, 245, 0.2)';
  ctx.fillRect(0, 0, 16, 16);
  // Frame
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeRect(0.5, 0.5, 15, 15);
  // Diagonal streak reflections
  ctx.fillRect(2, 2, 2, 1);
  ctx.fillRect(3, 3, 2, 1);
  ctx.fillRect(10, 9, 3, 1);
  ctx.fillRect(12, 10, 2, 1);
  return canvas;
}

function generateBrickCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  ctx.fillStyle = '#d5c8ba'; // mortar
  ctx.fillRect(0, 0, 16, 16);
  const brickColors = ['#9b3d30', '#883328', '#b1493b', '#a63f33'];
  // Brick rows
  const drawBrick = (x: number, y: number, w: number, h: number) => {
    for (let i = x; i < x + w; i++) {
      for (let j = y; j < y + h; j++) {
        ctx.fillStyle = brickColors[Math.floor(pseudoRandom(i * 13 + j * 29) * brickColors.length)];
        ctx.fillRect(i, j, 1, 1);
      }
    }
  };
  drawBrick(0, 1, 7, 3);
  drawBrick(8, 1, 8, 3);
  drawBrick(0, 5, 3, 3);
  drawBrick(4, 5, 7, 3);
  drawBrick(12, 5, 4, 3);
  drawBrick(0, 9, 7, 3);
  drawBrick(8, 9, 8, 3);
  drawBrick(0, 13, 3, 3);
  drawBrick(4, 13, 7, 3);
  drawBrick(12, 13, 4, 3);
  return canvas;
}

function generateOreCanvas(gemColor: string, gemGlint: string): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const stone = generateStoneCanvas();
  ctx.drawImage(stone, 0, 0);

  // Draw ore specks
  const specks = [
    [3, 4], [4, 4], [4, 5],
    [9, 2], [10, 2], [10, 3],
    [12, 8], [13, 8], [12, 9],
    [5, 11], [6, 11], [6, 12], [7, 12],
    [10, 13], [11, 13], [11, 14]
  ];
  for (const [x, y] of specks) {
    ctx.fillStyle = gemColor;
    ctx.fillRect(x, y, 1, 1);
  }
  // Glints
  ctx.fillStyle = gemGlint;
  ctx.fillRect(4, 4, 1, 1);
  ctx.fillRect(10, 2, 1, 1);
  ctx.fillRect(6, 11, 1, 1);
  ctx.fillRect(11, 13, 1, 1);
  return canvas;
}

function generateGlowstoneCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const golds = ['#ffe168', '#f8c83a', '#df9a1b', '#ffec94', '#c9820f'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = golds[Math.floor(pseudoRandom(x * 71 + y * 43) * golds.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(3, 3, 2, 2);
  ctx.fillRect(10, 8, 2, 2);
  ctx.fillRect(6, 12, 1, 2);
  return canvas;
}

function generateObsidianCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const purples = ['#1d1628', '#140e1d', '#271b38', '#100b18', '#34224c'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = purples[Math.floor(pseudoRandom(x * 19 + y * 97) * purples.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Glints
  ctx.fillStyle = '#674196';
  ctx.fillRect(4, 3, 1, 1);
  ctx.fillRect(11, 7, 1, 1);
  ctx.fillRect(7, 12, 1, 1);
  return canvas;
}

function generateTNTSideCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  // Red dynamite sticks
  ctx.fillStyle = '#c92a2a';
  ctx.fillRect(0, 0, 16, 16);
  // Shading sticks
  ctx.fillStyle = '#a81c1c';
  for (let i = 0; i < 16; i += 4) {
    ctx.fillRect(i, 0, 1, 16);
  }
  // White banner
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 6, 16, 5);
  // Black text "TNT"
  ctx.fillStyle = '#000000';
  // T
  ctx.fillRect(2, 7, 3, 1);
  ctx.fillRect(3, 7, 1, 3);
  // N
  ctx.fillRect(6, 7, 1, 3);
  ctx.fillRect(7, 8, 1, 1);
  ctx.fillRect(8, 7, 1, 3);
  // T
  ctx.fillRect(10, 7, 3, 1);
  ctx.fillRect(11, 7, 1, 3);
  return canvas;
}

function generateTNTTopCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  ctx.fillStyle = '#c92a2a';
  ctx.fillRect(0, 0, 16, 16);
  // Gray center cap with fuse
  ctx.fillStyle = '#888888';
  ctx.fillRect(6, 6, 4, 4);
  ctx.fillStyle = '#333333';
  ctx.fillRect(7, 7, 2, 2);
  ctx.fillStyle = '#f59f00';
  ctx.fillRect(7, 7, 1, 1);
  return canvas;
}

function generateBookshelfCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  // Wood background
  ctx.fillStyle = '#9c7746';
  ctx.fillRect(0, 0, 16, 16);
  // Shelf dividers
  ctx.fillStyle = '#614828';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 7, 16, 2);
  ctx.fillRect(0, 15, 16, 1);

  // Books row 1
  const bookColors = ['#9c27b0', '#e91e63', '#2196f3', '#4caf50', '#ff9800', '#f44336'];
  for (let x = 1; x < 15; x += 2) {
    ctx.fillStyle = bookColors[(x * 3) % bookColors.length];
    ctx.fillRect(x, 1, 1, 6);
    ctx.fillStyle = '#e0e0e0'; // pages
    ctx.fillRect(x + 1, 2, 1, 4);
  }
  // Books row 2
  for (let x = 1; x < 15; x += 2) {
    ctx.fillStyle = bookColors[(x * 7 + 2) % bookColors.length];
    ctx.fillRect(x, 9, 1, 6);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x + 1, 10, 1, 4);
  }
  return canvas;
}

function generateCraftingTableTopCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  ctx.fillStyle = '#b8945f';
  ctx.fillRect(0, 0, 16, 16);
  // Crafting grid 3x3
  ctx.fillStyle = '#4e3b20';
  ctx.strokeRect(3.5, 3.5, 9, 9);
  ctx.fillRect(6, 4, 1, 8);
  ctx.fillRect(9, 4, 1, 8);
  ctx.fillRect(4, 6, 8, 1);
  ctx.fillRect(4, 9, 8, 1);
  return canvas;
}

function generateCraftingTableSideCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  ctx.fillStyle = '#b8945f';
  ctx.fillRect(0, 0, 16, 16);
  // Border
  ctx.fillStyle = '#614828';
  ctx.strokeRect(0.5, 0.5, 15, 15);
  // Saw / tools motif
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(4, 4, 8, 2);
  ctx.fillStyle = '#d32f2f';
  ctx.fillRect(11, 4, 2, 4);
  return canvas;
}

function generateBedrockCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const blacks = ['#1a1a1a', '#292929', '#0d0d0d', '#3d3d3d'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = blacks[Math.floor(pseudoRandom(x * 83 + y * 41) * blacks.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function generateWaterCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const blues = ['#2980b9', '#3498db', '#1f618d', '#5dade2'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = blues[Math.floor(pseudoRandom(x * 23 + y * 73) * blues.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Wave streaks
  ctx.fillStyle = '#aed6f1';
  ctx.fillRect(3, 4, 4, 1);
  ctx.fillRect(9, 10, 4, 1);
  return canvas;
}

function generateSnowCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const whites = ['#ffffff', '#f4f8fd', '#eaf2fb', '#dbe7f7', '#fdfefe'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = whites[Math.floor(pseudoRandom(x * 47 + y * 59 + 17) * whites.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function generateIceCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const ices = ['#9ad0ec', '#a8d8f0', '#8ec5e5', '#bfe3f7'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = ices[Math.floor(pseudoRandom(x * 31 + y * 83 + 99) * ices.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Crystalline cracks
  ctx.fillStyle = '#d5effc';
  ctx.fillRect(3, 2, 1, 5);
  ctx.fillRect(4, 6, 4, 1);
  ctx.fillRect(8, 7, 1, 4);
  return canvas;
}

function generateSandstoneCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const sandstones = ['#dfcf9d', '#d6c48f', '#ebdcb0', '#c8b47e'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = sandstones[Math.floor(pseudoRandom(x * 19 + y * 23 + 43) * sandstones.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Stratified geological layers
  ctx.fillStyle = '#bfa971';
  ctx.fillRect(0, 4, 16, 1);
  ctx.fillRect(0, 10, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  return canvas;
}

function generateGravelCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = create16Canvas();
  const gravels = ['#88807b', '#7a726d', '#968e89', '#6d6560', '#a39c97'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = gravels[Math.floor(pseudoRandom(x * 61 + y * 37 + 103) * gravels.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// Convert canvas to THREE.CanvasTexture with pixel-art settings
function canvasToTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface BlockMaterialSet {
  materials: THREE.Material[]; // 6 faces: [+X, -X, +Y, -Y, +Z, -Z]
  iconDataUrl: string;         // For inventory & hotbar UI preview!
}

export class TextureManager {
  private materialsCache: Map<BlockType, BlockMaterialSet> = new Map();

  constructor() {
    this.initTextures();
  }

  private initTextures() {
    const dirtCanvas = generateDirtCanvas();
    const grassTopCanvas = generateGrassTopCanvas();
    const grassSideCanvas = generateGrassSideCanvas();
    const stoneCanvas = generateStoneCanvas();
    const cobblestoneCanvas = generateCobblestoneCanvas();
    const woodSideCanvas = generateWoodSideCanvas();
    const woodTopCanvas = generateWoodTopCanvas();
    const leavesCanvas = generateLeavesCanvas();
    const planksCanvas = generatePlanksCanvas();
    const sandCanvas = generateSandCanvas();
    const glassCanvas = generateGlassCanvas();
    const brickCanvas = generateBrickCanvas();
    const diamondOreCanvas = generateOreCanvas('#4dedf4', '#ffffff');
    const goldOreCanvas = generateOreCanvas('#fcee4b', '#ffffff');
    const ironOreCanvas = generateOreCanvas('#d8af93', '#fdf3ea');
    const glowstoneCanvas = generateGlowstoneCanvas();
    const obsidianCanvas = generateObsidianCanvas();
    const tntSideCanvas = generateTNTSideCanvas();
    const tntTopCanvas = generateTNTTopCanvas();
    const bookshelfCanvas = generateBookshelfCanvas();
    const craftingTopCanvas = generateCraftingTableTopCanvas();
    const craftingSideCanvas = generateCraftingTableSideCanvas();
    const bedrockCanvas = generateBedrockCanvas();
    const waterCanvas = generateWaterCanvas();
    const snowCanvas = generateSnowCanvas();
    const iceCanvas = generateIceCanvas();
    const sandstoneCanvas = generateSandstoneCanvas();
    const gravelCanvas = generateGravelCanvas();

    // Cache textures
    const dirtTex = canvasToTexture(dirtCanvas);
    const grassTopTex = canvasToTexture(grassTopCanvas);
    const grassSideTex = canvasToTexture(grassSideCanvas);
    const stoneTex = canvasToTexture(stoneCanvas);
    const cobbleTex = canvasToTexture(cobblestoneCanvas);
    const woodSideTex = canvasToTexture(woodSideCanvas);
    const woodTopTex = canvasToTexture(woodTopCanvas);
    const leavesTex = canvasToTexture(leavesCanvas);
    const planksTex = canvasToTexture(planksCanvas);
    const sandTex = canvasToTexture(sandCanvas);
    const glassTex = canvasToTexture(glassCanvas);
    const brickTex = canvasToTexture(brickCanvas);
    const diamondOreTex = canvasToTexture(diamondOreCanvas);
    const goldOreTex = canvasToTexture(goldOreCanvas);
    const ironOreTex = canvasToTexture(ironOreCanvas);
    const glowstoneTex = canvasToTexture(glowstoneCanvas);
    const obsidianTex = canvasToTexture(obsidianCanvas);
    const tntSideTex = canvasToTexture(tntSideCanvas);
    const tntTopTex = canvasToTexture(tntTopCanvas);
    const bookshelfTex = canvasToTexture(bookshelfCanvas);
    const craftingTopTex = canvasToTexture(craftingTopCanvas);
    const craftingSideTex = canvasToTexture(craftingSideCanvas);
    const bedrockTex = canvasToTexture(bedrockCanvas);
    const waterTex = canvasToTexture(waterCanvas);
    const snowTex = canvasToTexture(snowCanvas);
    const iceTex = canvasToTexture(iceCanvas);
    const sandstoneTex = canvasToTexture(sandstoneCanvas);
    const gravelTex = canvasToTexture(gravelCanvas);

    // Uniform standard material factory
    const makeMat = (tex: THREE.Texture, transparent = false, opacity = 1.0, roughness = 0.85) =>
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness,
        metalness: 0.05,
        transparent,
        opacity,
      });

    // 1. Grass
    const grassSideMat = makeMat(grassSideTex);
    const grassTopMat = makeMat(grassTopTex);
    const dirtMat = makeMat(dirtTex);
    this.materialsCache.set('grass', {
      materials: [grassSideMat, grassSideMat, grassTopMat, dirtMat, grassSideMat, grassSideMat],
      iconDataUrl: grassSideCanvas.toDataURL(),
    });

    // 2. Dirt
    this.materialsCache.set('dirt', {
      materials: Array(6).fill(dirtMat),
      iconDataUrl: dirtCanvas.toDataURL(),
    });

    // 3. Stone
    const stoneMat = makeMat(stoneTex);
    this.materialsCache.set('stone', {
      materials: Array(6).fill(stoneMat),
      iconDataUrl: stoneCanvas.toDataURL(),
    });

    // 4. Cobblestone
    const cobbleMat = makeMat(cobbleTex);
    this.materialsCache.set('cobblestone', {
      materials: Array(6).fill(cobbleMat),
      iconDataUrl: cobblestoneCanvas.toDataURL(),
    });

    // 5. Wood
    const woodSideMat = makeMat(woodSideTex);
    const woodTopMat = makeMat(woodTopTex);
    this.materialsCache.set('wood', {
      materials: [woodSideMat, woodSideMat, woodTopMat, woodTopMat, woodSideMat, woodSideMat],
      iconDataUrl: woodSideCanvas.toDataURL(),
    });

    // 6. Leaves
    const leavesMat = makeMat(leavesTex, true, 0.95);
    this.materialsCache.set('leaves', {
      materials: Array(6).fill(leavesMat),
      iconDataUrl: leavesCanvas.toDataURL(),
    });

    // 7. Planks
    const planksMat = makeMat(planksTex);
    this.materialsCache.set('planks', {
      materials: Array(6).fill(planksMat),
      iconDataUrl: planksCanvas.toDataURL(),
    });

    // 8. Sand
    const sandMat = makeMat(sandTex);
    this.materialsCache.set('sand', {
      materials: Array(6).fill(sandMat),
      iconDataUrl: sandCanvas.toDataURL(),
    });

    // 9. Glass
    const glassMat = new THREE.MeshStandardMaterial({
      map: glassTex,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.1,
    });
    this.materialsCache.set('glass', {
      materials: Array(6).fill(glassMat),
      iconDataUrl: glassCanvas.toDataURL(),
    });

    // 10. Brick
    const brickMat = makeMat(brickTex);
    this.materialsCache.set('brick', {
      materials: Array(6).fill(brickMat),
      iconDataUrl: brickCanvas.toDataURL(),
    });

    // 11. Diamond Ore
    const diamondMat = makeMat(diamondOreTex, false, 1.0, 0.4);
    this.materialsCache.set('diamond_ore', {
      materials: Array(6).fill(diamondMat),
      iconDataUrl: diamondOreCanvas.toDataURL(),
    });

    // 12. Gold Ore
    const goldMat = makeMat(goldOreTex, false, 1.0, 0.4);
    this.materialsCache.set('gold_ore', {
      materials: Array(6).fill(goldMat),
      iconDataUrl: goldOreCanvas.toDataURL(),
    });

    // 13. Iron Ore
    const ironMat = makeMat(ironOreTex);
    this.materialsCache.set('iron_ore', {
      materials: Array(6).fill(ironMat),
      iconDataUrl: ironOreCanvas.toDataURL(),
    });

    // 14. Glowstone
    const glowMat = new THREE.MeshStandardMaterial({
      map: glowstoneTex,
      emissive: new THREE.Color('#ffe26b'),
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });
    this.materialsCache.set('glowstone', {
      materials: Array(6).fill(glowMat),
      iconDataUrl: glowstoneCanvas.toDataURL(),
    });

    // 15. Obsidian
    const obsidianMat = makeMat(obsidianTex, false, 1.0, 0.2);
    this.materialsCache.set('obsidian', {
      materials: Array(6).fill(obsidianMat),
      iconDataUrl: obsidianCanvas.toDataURL(),
    });

    // 16. TNT
    const tntSideMat = makeMat(tntSideTex);
    const tntTopMat = makeMat(tntTopTex);
    this.materialsCache.set('tnt', {
      materials: [tntSideMat, tntSideMat, tntTopMat, tntTopMat, tntSideMat, tntSideMat],
      iconDataUrl: tntSideCanvas.toDataURL(),
    });

    // 17. Bookshelf
    const bookshelfMat = makeMat(bookshelfTex);
    this.materialsCache.set('bookshelf', {
      materials: [bookshelfMat, bookshelfMat, planksMat, planksMat, bookshelfMat, bookshelfMat],
      iconDataUrl: bookshelfCanvas.toDataURL(),
    });

    // 18. Crafting Table
    const craftingTopMat = makeMat(craftingTopTex);
    const craftingSideMat = makeMat(craftingSideTex);
    this.materialsCache.set('crafting_table', {
      materials: [craftingSideMat, craftingSideMat, craftingTopMat, planksMat, craftingSideMat, craftingSideMat],
      iconDataUrl: craftingTopCanvas.toDataURL(),
    });

    // 19. Bedrock
    const bedrockMat = makeMat(bedrockCanvasToTex(bedrockCanvas));
    this.materialsCache.set('bedrock', {
      materials: Array(6).fill(bedrockMat),
      iconDataUrl: bedrockCanvas.toDataURL(),
    });

    // 20. Water
    const waterMat = new THREE.MeshStandardMaterial({
      map: waterTex,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.1,
    });
    this.materialsCache.set('water', {
      materials: Array(6).fill(waterMat),
      iconDataUrl: waterCanvas.toDataURL(),
    });

    // 21. Snow
    const snowMat = makeMat(snowTex, false, 1.0, 0.9);
    this.materialsCache.set('snow', {
      materials: Array(6).fill(snowMat),
      iconDataUrl: snowCanvas.toDataURL(),
    });

    // 22. Ice
    const iceMat = new THREE.MeshStandardMaterial({
      map: iceTex,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.05,
    });
    this.materialsCache.set('ice', {
      materials: Array(6).fill(iceMat),
      iconDataUrl: iceCanvas.toDataURL(),
    });

    // 23. Sandstone
    const sandstoneMat = makeMat(sandstoneTex);
    this.materialsCache.set('sandstone', {
      materials: Array(6).fill(sandstoneMat),
      iconDataUrl: sandstoneCanvas.toDataURL(),
    });

    // 24. Gravel
    const gravelMat = makeMat(gravelTex);
    this.materialsCache.set('gravel', {
      materials: Array(6).fill(gravelMat),
      iconDataUrl: gravelCanvas.toDataURL(),
    });
  }

  public getMaterialSet(blockType: BlockType): BlockMaterialSet | undefined {
    return this.materialsCache.get(blockType);
  }

  public getAllIconUrls(): Record<BlockType, string> {
    const icons: Partial<Record<BlockType, string>> = {};
    for (const [key, value] of this.materialsCache.entries()) {
      icons[key] = value.iconDataUrl;
    }
    return icons as Record<BlockType, string>;
  }
}

function bedrockCanvasToTex(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  return canvasToTexture(canvas);
}
