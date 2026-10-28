import { BlockType, WorldPreset, WorldAction, BLOCK_REGISTRY, BiomeType } from './types';

// 2D Perlin-like value noise with permutation table
class Noise2D {
  private perm: number[] = [];

  constructor(seed = 1337) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 7) % 2147483647;
      const j = s % (i + 1);
      const temp = p[i];
      p[i] = p[j];
      p[j] = temp;
    }
    this.perm = p.concat(p);
  }

  private fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    return (this.lerp(x1, x2, v) + 1) / 2; // normalized 0..1
  }

  public octaveNoise(x: number, y: number, octaves = 3, persistence = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }
}

export class VoxelWorld {
  // Greatly expanded map size and height depth
  public width = 88;
  public depth = 88;
  public height = 64;
  public seaLevel = 20;

  private blocks: Map<string, BlockType> = new Map();
  private undoStack: WorldAction[] = [];
  private redoStack: WorldAction[] = [];
  public onWorldChange?: () => void;

  private noiseTerrain = new Noise2D(42);
  private noiseBiome = new Noise2D(999);
  private noiseMountain = new Noise2D(777);

  constructor() {
    this.generatePreset('hills');
  }

  private getKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= this.height) return 'air';
    return this.blocks.get(this.getKey(x, y, z)) || 'air';
  }

  public setBlock(x: number, y: number, z: number, type: BlockType, recordUndo = true): boolean {
    if (y < 0 || y >= this.height) return false;
    const key = this.getKey(x, y, z);
    const prev = this.getBlock(x, y, z);

    if (prev === type) return false;

    if (type === 'air') {
      this.blocks.delete(key);
    } else {
      this.blocks.set(key, type);
    }

    if (recordUndo) {
      this.undoStack.push({
        type: type === 'air' ? 'break' : 'place',
        x,
        y,
        z,
        previousBlock: prev,
        newBlock: type,
      });
      this.redoStack = [];
    }

    this.onWorldChange?.();
    return true;
  }

  public undo(): boolean {
    const action = this.undoStack.pop();
    if (!action) return false;
    const key = this.getKey(action.x, action.y, action.z);
    if (action.previousBlock === 'air') {
      this.blocks.delete(key);
    } else {
      this.blocks.set(key, action.previousBlock);
    }
    this.redoStack.push(action);
    this.onWorldChange?.();
    return true;
  }

  public redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;
    const key = this.getKey(action.x, action.y, action.z);
    if (action.newBlock === 'air') {
      this.blocks.delete(key);
    } else {
      this.blocks.set(key, action.newBlock);
    }
    this.undoStack.push(action);
    this.onWorldChange?.();
    return true;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getAllBlocks(): Map<string, BlockType> {
    return this.blocks;
  }

  public clear() {
    this.blocks.clear();
    this.undoStack = [];
    this.redoStack = [];
  }

  // Determine biome type at coordinates (x, z)
  public getBiomeAt(x: number, z: number): BiomeType {
    // 1. Check for Island Region in north-west ocean quadrant
    const distIsland1 = Math.sqrt((x - 26) * (x - 26) + (z + 24) * (z + 24));
    const distIsland2 = Math.sqrt((x + 28) * (x + 28) + (z + 26) * (z + 26));
    if (distIsland1 < 14 || distIsland2 < 12) {
      return 'island';
    }

    // 2. High Mountains in North / North-East
    const mountainFactor = this.noiseMountain.octaveNoise(x * 0.03, z * 0.03, 3, 0.5);
    const northWeight = (-z + 20) / 40; // higher toward -z
    if (northWeight > 0.4 && mountainFactor > 0.45) {
      return 'mountains';
    }

    // 3. Desert in South-East
    const tempNoise = this.noiseBiome.octaveNoise(x * 0.025 + 50, z * 0.025 + 50, 2);
    if (x > 10 && z > 5 && tempNoise > 0.5) {
      return 'desert';
    }

    // 4. Beach or Ocean check based on height
    const baseH = this.calculateTerrainHeight(x, z);
    if (baseH < this.seaLevel) {
      return 'ocean';
    }
    if (baseH <= this.seaLevel + 2) {
      return 'beach';
    }

    // 5. Forest vs Plains
    const forestNoise = this.noiseBiome.noise(x * 0.05, z * 0.05);
    if (forestNoise > 0.48) {
      return 'forest';
    }
    return 'plains';
  }

  // Calculate terrain surface height at (x, z)
  private calculateTerrainHeight(x: number, z: number): number {
    const halfW = this.width / 2;
    const halfD = this.depth / 2;

    // Edge falloff toward world perimeter to create clean natural shores
    const edgeDistX = Math.min(x + halfW, halfW - x) / halfW;
    const edgeDistZ = Math.min(z + halfD, halfD - z) / halfD;
    const edgeFalloff = Math.min(1, Math.min(edgeDistX, edgeDistZ) * 2.8);

    // Island shapes
    const distIsland1 = Math.sqrt((x - 26) * (x - 26) + (z + 24) * (z + 24));
    const distIsland2 = Math.sqrt((x + 28) * (x + 28) + (z + 26) * (z + 26));

    if (distIsland1 < 14) {
      const islT = (1 - distIsland1 / 14);
      return Math.floor(this.seaLevel + 1 + islT * 7 + this.noiseTerrain.noise(x * 0.1, z * 0.1) * 3);
    }
    if (distIsland2 < 12) {
      const islT = (1 - distIsland2 / 12);
      return Math.floor(this.seaLevel + 1 + islT * 6 + this.noiseTerrain.noise(x * 0.1, z * 0.1) * 3);
    }

    // Mountain peak region (North / North-East)
    const mtnNoise = this.noiseMountain.octaveNoise(x * 0.025, z * 0.025, 4, 0.55);
    const isNorth = (-z + 20) / 44; // 0..1 in north
    let mtnBoost = 0;
    if (isNorth > 0.2) {
      // Steep ridges
      const ridge = 1 - Math.abs(mtnNoise * 2 - 1);
      mtnBoost = Math.pow(ridge, 1.8) * 32 * Math.min(1, isNorth * 1.5);
    }

    // Rolling continental hills
    const continent = this.noiseTerrain.octaveNoise(x * 0.035, z * 0.035, 3, 0.5);
    const detail = this.noiseTerrain.noise(x * 0.1, z * 0.1) * 3;

    let height = this.seaLevel - 4 + continent * 14 + detail + mtnBoost;

    // Apply perimeter falloff
    height = this.seaLevel + (height - this.seaLevel) * edgeFalloff;

    return Math.floor(Math.max(4, Math.min(this.height - 4, height)));
  }

  // Generate World Presets
  public generatePreset(preset: WorldPreset, seed = Math.floor(Math.random() * 10000)) {
    this.clear();
    this.noiseTerrain = new Noise2D(seed);
    this.noiseBiome = new Noise2D(seed + 101);
    this.noiseMountain = new Noise2D(seed + 202);

    const halfW = Math.floor(this.width / 2);
    const halfD = Math.floor(this.depth / 2);

    if (preset === 'hills') {
      // 🌿 GRAND MONDE MULTI-BIOMES
      // (Montagnes enneigées, plages dorées, océan profond, îles côtières, forêts denses et désert)

      for (let x = -halfW; x < halfW; x++) {
        for (let z = -halfD; z < halfD; z++) {
          const height = this.calculateTerrainHeight(x, z);
          const biome = this.getBiomeAt(x, z);

          // 1. Bedrock foundation layer (y = 0..2) with jagged teeth
          this.blocks.set(this.getKey(x, 0, z), 'bedrock');
          if (Math.sin(x * 7 + z * 13) > 0.2) {
            this.blocks.set(this.getKey(x, 1, z), 'bedrock');
          }
          if (Math.sin(x * 19 + z * 31) > 0.6) {
            this.blocks.set(this.getKey(x, 2, z), 'bedrock');
          }

          // 2. Deep Underground Crust (y = 1..18): Stone with rich diamond, gold, iron ores and caves
          for (let y = 1; y < Math.min(height - 4, 18); y++) {
            if (this.getBlock(x, y, z) === 'bedrock') continue;

            // Cavern voids in deep underground
            const caveHollow = Math.sin(x * 0.2 + y * 0.4 + z * 0.2) * Math.cos(x * 0.15 + z * 0.15);
            if (caveHollow > 0.85 && y > 3 && y < height - 6) {
              continue; // cave air pocket!
            }

            const oreSeed = Math.sin(x * 37.1 + y * 91.7 + z * 53.3);
            let b: BlockType = 'stone';

            if (y <= 12 && oreSeed > 0.89) {
              b = 'diamond_ore';
            } else if (y <= 18 && oreSeed > 0.81) {
              b = 'gold_ore';
            } else if (oreSeed > 0.72) {
              b = 'iron_ore';
            }
            this.blocks.set(this.getKey(x, y, z), b);
          }

          // 3. Upper Underground Crust (y = 18 to height-4)
          for (let y = 18; y < height - 4; y++) {
            const oreSeed = Math.sin(x * 29.3 + y * 71.1 + z * 41.9);
            let b: BlockType = 'stone';
            if (oreSeed > 0.76) b = 'iron_ore';
            if (oreSeed > 0.92 && y < 28) b = 'gold_ore';
            this.blocks.set(this.getKey(x, y, z), b);
          }

          // 4. Biome-Specific Sub-layer and Top-layer
          if (biome === 'mountains') {
            // Mountain peak biome
            for (let y = Math.max(1, height - 4); y < height; y++) {
              this.blocks.set(this.getKey(x, y, z), 'stone');
            }
            // Snow crown above y >= 40, Ice seams, Stone crags below
            if (height >= 42) {
              this.blocks.set(this.getKey(x, height, z), 'snow');
              // Snow cap depth
              if (height >= 46) {
                this.blocks.set(this.getKey(x, height - 1, z), 'snow');
              }
            } else if (height >= 34) {
              // Crag stone / gravel
              this.blocks.set(this.getKey(x, height, z), Math.sin(x * 3 + z * 5) > 0.3 ? 'gravel' : 'stone');
            } else {
              this.blocks.set(this.getKey(x, height, z), 'grass');
            }
          } else if (biome === 'desert') {
            // Warm desert with sandstone base and sand dunes
            for (let y = Math.max(1, height - 5); y < height - 1; y++) {
              this.blocks.set(this.getKey(x, y, z), 'sandstone');
            }
            this.blocks.set(this.getKey(x, height - 1, z), 'sand');
            this.blocks.set(this.getKey(x, height, z), 'sand');
          } else if (biome === 'beach') {
            // Golden sandy beach near water
            for (let y = Math.max(1, height - 3); y < height; y++) {
              this.blocks.set(this.getKey(x, y, z), 'sandstone');
            }
            this.blocks.set(this.getKey(x, height, z), 'sand');
          } else if (biome === 'ocean') {
            // Deep Ocean floor (gravel / sand)
            this.blocks.set(this.getKey(x, height, z), Math.sin(x * 5 + z * 7) > 0 ? 'gravel' : 'sand');
            // Water volume up to sea level
            for (let y = height + 1; y <= this.seaLevel; y++) {
              this.blocks.set(this.getKey(x, y, z), 'water');
            }
          } else if (biome === 'island') {
            // Tropical Island with sandy rim and lush interior
            const isRim = height <= this.seaLevel + 1;
            for (let y = Math.max(1, height - 3); y < height; y++) {
              this.blocks.set(this.getKey(x, y, z), isRim ? 'sandstone' : 'dirt');
            }
            this.blocks.set(this.getKey(x, height, z), isRim ? 'sand' : 'grass');
          } else {
            // Plains & Forest
            for (let y = Math.max(1, height - 3); y < height; y++) {
              this.blocks.set(this.getKey(x, y, z), 'dirt');
            }
            this.blocks.set(this.getKey(x, height, z), 'grass');
          }

          // Ensure any depressions below seaLevel are filled with water
          if (height < this.seaLevel && biome !== 'ocean') {
            for (let y = height + 1; y <= this.seaLevel; y++) {
              this.blocks.set(this.getKey(x, y, z), 'water');
            }
          }
        }
      }

      // Plant lush procedural vegetation across Forest, Plains & Islands
      const treeCount = 48;
      let planted = 0;
      for (let attempt = 0; attempt < 500 && planted < treeCount; attempt++) {
        const tx = Math.floor((Math.random() - 0.5) * (this.width - 16));
        const tz = Math.floor((Math.random() - 0.5) * (this.depth - 16));
        const biome = this.getBiomeAt(tx, tz);

        if (biome === 'forest' || biome === 'plains' || biome === 'island') {
          // Find surface height
          let gy = -1;
          for (let y = this.height - 1; y >= this.seaLevel; y--) {
            const b = this.getBlock(tx, y, tz);
            if (b === 'grass' || (biome === 'island' && b === 'sand')) {
              gy = y;
              break;
            }
          }

          if (gy > this.seaLevel) {
            this.spawnTree(tx, gy + 1, tz);
            planted++;
          }
        }
      }
    } else if (preset === 'flat') {
      // Superflat étendu (Bedrock y=0, 18 couches de pierre/terre, herbe au-dessus)
      for (let x = -halfW; x < halfW; x++) {
        for (let z = -halfD; z < halfD; z++) {
          this.blocks.set(this.getKey(x, 0, z), 'bedrock');
          for (let y = 1; y < 16; y++) {
            this.blocks.set(this.getKey(x, y, z), 'stone');
          }
          this.blocks.set(this.getKey(x, 16, z), 'dirt');
          this.blocks.set(this.getKey(x, 17, z), 'dirt');
          this.blocks.set(this.getKey(x, 18, z), 'grass');
        }
      }
    } else if (preset === 'floating') {
      // Archipel d'îles volantes étendu avec étagement vertical
      for (let x = -halfW; x < halfW; x++) {
        for (let z = -halfD; z < halfD; z++) {
          const dist = Math.sqrt(x * x + z * z);
          if (dist > 38) continue;

          const n = this.noiseTerrain.octaveNoise(x * 0.06, z * 0.06, 3, 0.5);
          const islandHeight = Math.floor(34 + n * 12);
          const islandDepth = Math.max(1, Math.floor((1 - dist / 38) * 10));

          for (let d = 0; d < islandDepth; d++) {
            const y = islandHeight - d;
            if (d === 0) {
              this.blocks.set(this.getKey(x, y, z), 'grass');
            } else if (d <= 3) {
              this.blocks.set(this.getKey(x, y, z), 'dirt');
            } else {
              this.blocks.set(this.getKey(x, y, z), 'stone');
            }
          }
        }
      }
      this.spawnTree(0, 42, 0);
      this.spawnTree(-12, 38, 10);
      this.spawnTree(14, 40, -8);
      this.spawnTree(-8, 36, -14);
      this.spawnTree(16, 39, 12);
    } else if (preset === 'castle') {
      // Château médiéval imposant avec douves d'eau, murailles crénelées et 4 donjons
      for (let x = -halfW; x < halfW; x++) {
        for (let z = -halfD; z < halfD; z++) {
          this.blocks.set(this.getKey(x, 0, z), 'bedrock');
          for (let y = 1; y < 14; y++) {
            this.blocks.set(this.getKey(x, y, z), 'stone');
          }
          this.blocks.set(this.getKey(x, 14, z), 'dirt');
          this.blocks.set(this.getKey(x, 15, z), 'dirt');
          this.blocks.set(this.getKey(x, 16, z), 'grass');
        }
      }

      // Douves d'eau autour du château (rayon 16 à 19)
      for (let x = -20; x <= 20; x++) {
        for (let z = -20; z <= 20; z++) {
          const r = Math.max(Math.abs(x), Math.abs(z));
          if (r >= 16 && r <= 19) {
            // Pont-levis au sud (z entre 16 et 19, |x| <= 2)
            if (z >= 16 && Math.abs(x) <= 2) {
              this.blocks.set(this.getKey(x, 16, z), 'planks');
            } else {
              this.blocks.set(this.getKey(x, 16, z), 'water');
              this.blocks.set(this.getKey(x, 15, z), 'water');
            }
          }
        }
      }

      // Murailles extérieures de la forteresse (14x14)
      const radius = 13;
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          const isEdge = Math.abs(x) === radius || Math.abs(z) === radius;
          if (isEdge) {
            if (z === radius && Math.abs(x) <= 2) continue; // porte sud
            for (let y = 17; y <= 24; y++) {
              this.blocks.set(this.getKey(x, y, z), 'cobblestone');
            }
            if ((x + z) % 2 === 0) {
              this.blocks.set(this.getKey(x, 25, z), 'stone');
            }
          }
        }
      }

      // 4 Donjons imposants aux angles
      const towers = [
        [-radius, -radius],
        [radius, -radius],
        [-radius, radius],
        [radius, radius],
      ];
      for (const [cx, cz] of towers) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            for (let y = 17; y <= 30; y++) {
              const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
              if (isWall || y === 30) {
                this.blocks.set(this.getKey(cx + dx, y, cz + dz), 'brick');
              }
            }
            // Créneaux de tour
            if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
              if ((dx + dz) % 2 === 0) {
                this.blocks.set(this.getKey(cx + dx, 31, cz + dz), 'cobblestone');
              }
            }
          }
        }
        // Pierre lumineuse au sommet
        this.blocks.set(this.getKey(cx, 30, cz), 'glowstone');
      }

      // Logis seigneurial dans la cour
      for (let x = -5; x <= 5; x++) {
        for (let z = -6; z <= -1; z++) {
          this.blocks.set(this.getKey(x, 16, z), 'cobblestone');
          const isHouseEdge = x === -5 || x === 5 || z === -6 || z === -1;
          if (isHouseEdge) {
            for (let y = 17; y <= 22; y++) {
              if (y === 19 && (x === 0 || z === -4)) {
                this.blocks.set(this.getKey(x, y, z), 'glass');
              } else {
                this.blocks.set(this.getKey(x, y, z), 'planks');
              }
            }
          }
          this.blocks.set(this.getKey(x, 23, z), 'wood');
        }
      }
      this.blocks.set(this.getKey(-3, 17, -4), 'crafting_table');
      this.blocks.set(this.getKey(-3, 17, -3), 'bookshelf');
      this.blocks.set(this.getKey(-3, 18, -3), 'bookshelf');
      this.blocks.set(this.getKey(3, 17, -4), 'glowstone');
    } else if (preset === 'desert') {
      // Grand désert avec dunes ondulantes et Grande Pyramide à degrés
      for (let x = -halfW; x < halfW; x++) {
        for (let z = -halfD; z < halfD; z++) {
          this.blocks.set(this.getKey(x, 0, z), 'bedrock');
          const n = this.noiseTerrain.octaveNoise(x * 0.03, z * 0.03, 3, 0.4);
          const duneHeight = Math.floor(16 + n * 10);

          for (let y = 1; y < duneHeight - 4; y++) {
            this.blocks.set(this.getKey(x, y, z), 'stone');
          }
          for (let y = duneHeight - 4; y < duneHeight; y++) {
            this.blocks.set(this.getKey(x, y, z), 'sandstone');
          }
          this.blocks.set(this.getKey(x, duneHeight, z), 'sand');
        }
      }

      // Grande Pyramide à degrés
      const baseR = 14;
      for (let tier = 0; tier <= baseR; tier++) {
        const r = baseR - tier;
        const y = 20 + tier;
        for (let x = -r; x <= r; x++) {
          for (let z = -r; z <= r; z++) {
            const isChamber = tier >= 1 && tier <= 5 && Math.abs(x) <= 3 && Math.abs(z) <= 3;
            if (isChamber) {
              if (tier === 1 && x === 0 && z === 0) {
                this.blocks.set(this.getKey(x, y, z), 'gold_ore');
              } else if (tier === 1 && (Math.abs(x) === 1 || Math.abs(z) === 1)) {
                this.blocks.set(this.getKey(x, y, z), 'diamond_ore');
              }
            } else {
              this.blocks.set(this.getKey(x, y, z), tier % 2 === 0 ? 'sandstone' : 'sand');
            }
          }
        }
      }
      this.blocks.set(this.getKey(0, 20 + baseR + 1, 0), 'glowstone');
    }

    this.onWorldChange?.();
  }

  // Spawn an oak tree
  private spawnTree(x: number, startY: number, z: number) {
    const trunkHeight = 5 + Math.floor(Math.random() * 2);

    for (let y = 0; y < trunkHeight; y++) {
      this.blocks.set(this.getKey(x, startY + y, z), 'wood');
    }

    const leafBase = startY + trunkHeight - 2;
    for (let ly = leafBase; ly <= startY + trunkHeight + 1; ly++) {
      const radius = ly >= startY + trunkHeight ? 1 : 2;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (Math.abs(lx) === radius && Math.abs(lz) === radius && Math.random() > 0.4) continue;
          const k = this.getKey(x + lx, ly, z + lz);
          if (!this.blocks.has(k) || this.blocks.get(k) === 'air') {
            this.blocks.set(k, 'leaves');
          }
        }
      }
    }
  }

  public explodeTNT(x: number, y: number, z: number, radius = 3.8): { x: number; y: number; z: number; type: BlockType }[] {
    const destroyed: { x: number; y: number; z: number; type: BlockType }[] = [];
    const rInt = Math.ceil(radius);

    for (let dx = -rInt; dx <= rInt; dx++) {
      for (let dy = -rInt; dy <= rInt; dy++) {
        for (let dz = -rInt; dz <= rInt; dz++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= radius) {
            const bx = x + dx;
            const by = y + dy;
            const bz = z + dz;
            const block = this.getBlock(bx, by, bz);
            if (block !== 'air' && block !== 'bedrock' && block !== 'obsidian') {
              destroyed.push({ x: bx, y: by, z: bz, type: block });
              this.setBlock(bx, by, bz, 'air', false);
            }
          }
        }
      }
    }

    this.onWorldChange?.();
    return destroyed;
  }

  public exportJSON(): string {
    const blockList: { x: number; y: number; z: number; type: BlockType }[] = [];
    for (const [key, type] of this.blocks.entries()) {
      const [x, y, z] = key.split(',').map(Number);
      blockList.push({ x, y, z, type });
    }
    return JSON.stringify({
      version: 2,
      width: this.width,
      depth: this.depth,
      height: this.height,
      blocks: blockList,
    });
  }

  public importJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.blocks)) return false;
      this.clear();
      for (const item of data.blocks) {
        if (item && BLOCK_REGISTRY[item.type as BlockType]) {
          this.blocks.set(this.getKey(item.x, item.y, item.z), item.type as BlockType);
        }
      }
      this.onWorldChange?.();
      return true;
    } catch {
      return false;
    }
  }

  public saveToLocalStorage(key = 'voxelcraft_saved_world') {
    try {
      localStorage.setItem(key, this.exportJSON());
      return true;
    } catch {
      return false;
    }
  }

  public loadFromLocalStorage(key = 'voxelcraft_saved_world'): boolean {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      return this.importJSON(raw);
    } catch {
      return false;
    }
  }
}
