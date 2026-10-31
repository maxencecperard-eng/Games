import {
  BlockType,
  BiomeType,
  WorldPreset,
  WorldAction,
  BLOCK_REGISTRY,
  BLOCK_IDS,
  ID_TO_BLOCK,
} from './types';

// ---------------------------------------------------------------------------
// Constantes du monde
// ---------------------------------------------------------------------------

export const CHUNK_SIZE = 16;
/** Le monde descend désormais très profond (couches supplémentaires). */
export const WORLD_MIN_Y = -64;
export const WORLD_MAX_Y = 128;
export const WORLD_HEIGHT = WORLD_MAX_Y - WORLD_MIN_Y;
export const SEA_LEVEL = 20;

const CHUNK_AREA = CHUNK_SIZE * CHUNK_SIZE;

// ---------------------------------------------------------------------------
// Bruit 2D / 3D déterministe
// ---------------------------------------------------------------------------

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
    return (this.lerp(x1, x2, v) + 1) / 2;
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

class Noise3D {
  private perm: number[];

  constructor(seed = 4242) {
    this.perm = new Array(512);
    let s = seed | 0;
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 11) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private fade(t: number) {
    return t * t * (3 - 2 * t);
  }

  private value(ix: number, iy: number, iz: number): number {
    const h = this.perm[(this.perm[(this.perm[ix & 255] + (iy & 255)) & 255] + (iz & 255)) & 255];
    return h / 255;
  }

  public noise(x: number, y: number, z: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = this.fade(x - xi);
    const yf = this.fade(y - yi);
    const zf = this.fade(z - zi);

    const c000 = this.value(xi, yi, zi);
    const c100 = this.value(xi + 1, yi, zi);
    const c010 = this.value(xi, yi + 1, zi);
    const c110 = this.value(xi + 1, yi + 1, zi);
    const c001 = this.value(xi, yi, zi + 1);
    const c101 = this.value(xi + 1, yi, zi + 1);
    const c011 = this.value(xi, yi + 1, zi + 1);
    const c111 = this.value(xi + 1, yi + 1, zi + 1);

    const x00 = c000 + (c100 - c000) * xf;
    const x10 = c010 + (c110 - c010) * xf;
    const x01 = c001 + (c101 - c001) * xf;
    const x11 = c011 + (c111 - c011) * xf;
    const y0 = x00 + (x10 - x00) * yf;
    const y1 = x01 + (x11 - x01) * yf;
    return y0 + (y1 - y0) * zf;
  }
}

/** Hash déterministe 3D renvoyant une valeur 0..1. */
function hash3(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function hash2(x: number, z: number, seed: number): number {
  return hash3(x, 0, z, seed);
}

// ---------------------------------------------------------------------------
// Chunks
// ---------------------------------------------------------------------------

interface Chunk {
  cx: number;
  cz: number;
  blocks: Uint16Array;
  /** Hauteur du bloc plein le plus haut de chaque colonne (pour le rendu). */
  topY: Int16Array;
  loadedBlocks: number;
}

export interface ChunkPos {
  cx: number;
  cz: number;
}

export class VoxelWorld {
  public seed = 1337;
  public preset: WorldPreset = 'hills';
  public seaLevel = SEA_LEVEL;
  public readonly minY = WORLD_MIN_Y;
  public readonly maxY = WORLD_MAX_Y;
  /** Conservé pour compatibilité avec l'ancien code (monde infini). */
  public get height() {
    return WORLD_MAX_Y;
  }
  public get width() {
    return Infinity;
  }
  public get depth() {
    return Infinity;
  }

  private chunks: Map<string, Chunk> = new Map();
  /** Modifications du joueur, persistées et ré-appliquées à la génération. */
  private edits: Map<string, BlockType> = new Map();
  private editsByChunk: Map<string, Map<string, BlockType>> = new Map();
  private undoStack: WorldAction[] = [];
  private redoStack: WorldAction[] = [];

  private noiseTerrain = new Noise2D(42);
  private noiseBiome = new Noise2D(999);
  private noiseMountain = new Noise2D(777);
  private noiseCave = new Noise3D(2024);

  private loadedBlockCount = 0;

  /** Appelé quand un chunk (ou son voisin) doit être reconstruit. */
  public onChunkDirty?: (cx: number, cz: number) => void;
  /** Appelé après une régénération / un import complet. */
  public onWorldChange?: () => void;

  constructor(preset: WorldPreset = 'hills', seed = Math.floor(Math.random() * 100000)) {
    this.reset(preset, seed);
  }

  // -------------------------------------------------------------------------
  // Accès de base
  // -------------------------------------------------------------------------

  private chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  private blockKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private chunkCoordOf(v: number): number {
    return Math.floor(v / CHUNK_SIZE);
  }

  private localIndex(x: number, y: number, z: number): number {
    const lx = x - this.chunkCoordOf(x) * CHUNK_SIZE;
    const lz = z - this.chunkCoordOf(z) * CHUNK_SIZE;
    return (y - WORLD_MIN_Y) * CHUNK_AREA + lz * CHUNK_SIZE + lx;
  }

  public getChunk(cx: number, cz: number, generate = true): Chunk | null {
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk && generate) {
      chunk = this.createChunk(cx, cz);
    }
    return chunk ?? null;
  }

  public isChunkLoaded(cx: number, cz: number): boolean {
    return this.chunks.has(this.chunkKey(cx, cz));
  }

  public getLoadedChunkCount(): number {
    return this.chunks.size;
  }

  public getLoadedBlockCount(): number {
    return this.loadedBlockCount;
  }

  public getChunkTopY(cx: number, cz: number): Int16Array | null {
    return this.getChunk(cx, cz, false)?.topY ?? null;
  }

  public getChunkBlocks(cx: number, cz: number): Uint16Array | null {
    return this.getChunk(cx, cz, false)?.blocks ?? null;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) return 'air';
    const chunk = this.getChunk(this.chunkCoordOf(x), this.chunkCoordOf(z), true);
    if (!chunk) return 'air';
    return ID_TO_BLOCK[chunk.blocks[this.localIndex(x, y, z)]] ?? 'air';
  }

  /** Comme getBlock mais ne génère jamais de chunk (renvoie 'air' sinon). */
  public peekBlock(x: number, y: number, z: number): BlockType {
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) return 'air';
    const chunk = this.getChunk(this.chunkCoordOf(x), this.chunkCoordOf(z), false);
    if (!chunk) return 'air';
    return ID_TO_BLOCK[chunk.blocks[this.localIndex(x, y, z)]] ?? 'air';
  }

  private writeRaw(x: number, y: number, z: number, type: BlockType): boolean {
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) return false;
    const cx = this.chunkCoordOf(x);
    const cz = this.chunkCoordOf(z);
    const chunk = this.getChunk(cx, cz, true);
    if (!chunk) return false;

    const idx = this.localIndex(x, y, z);
    const prev = ID_TO_BLOCK[chunk.blocks[idx]] ?? 'air';
    if (prev === type) return false;

    const id = BLOCK_IDS[type] ?? 0;
    chunk.blocks[idx] = id;
    if (prev === 'air' && type !== 'air') this.loadedBlockCount++;
    if (prev !== 'air' && type === 'air') this.loadedBlockCount--;

    if (type !== 'air') {
      // Met à jour la hauteur maximale de la colonne.
      const lx = x - cx * CHUNK_SIZE;
      const lz = z - cz * CHUNK_SIZE;
      const col = lz * CHUNK_SIZE + lx;
      if (y > chunk.topY[col]) chunk.topY[col] = y;
    } else {
      const lx = x - cx * CHUNK_SIZE;
      const lz = z - cz * CHUNK_SIZE;
      const col = lz * CHUNK_SIZE + lx;
      if (chunk.topY[col] === y) {
        let ny = y - 1;
        while (ny >= WORLD_MIN_Y && ID_TO_BLOCK[chunk.blocks[this.localIndex(x, ny, z)]] === 'air') ny--;
        chunk.topY[col] = ny;
      }
    }

    return true;
  }

  public setBlock(x: number, y: number, z: number, type: BlockType, recordUndo = true): boolean {
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) return false;
    const prev = this.getBlock(x, y, z);
    if (prev === type) return false;

    const cx = this.chunkCoordOf(x);
    const cz = this.chunkCoordOf(z);

    this.writeRaw(x, y, z, type);

    // Persistance (l'air est conservé pour que les trous restent des trous).
    const key = this.blockKey(x, y, z);
    this.edits.set(key, type);
    const ck = this.chunkKey(cx, cz);
    let map = this.editsByChunk.get(ck);
    if (!map) {
      map = new Map();
      this.editsByChunk.set(ck, map);
    }
    map.set(key, type);

    if (recordUndo) {
      this.undoStack.push({
        type: type === 'air' ? 'break' : 'place',
        x,
        y,
        z,
        previousBlock: prev,
        newBlock: type,
      });
      if (this.undoStack.length > 400) this.undoStack.shift();
      this.redoStack = [];
    }

    this.markDirtyAt(x, z);
    return true;
  }

  /** Le maillage d'un chunk dépend aussi des chunks voisins (faces cachées). */
  private markDirtyAt(x: number, z: number) {
    if (!this.onChunkDirty) return;
    const cx = this.chunkCoordOf(x);
    const cz = this.chunkCoordOf(z);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;

    this.onChunkDirty(cx, cz);
    if (lx === 0) this.onChunkDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.onChunkDirty(cx + 1, cz);
    if (lz === 0) this.onChunkDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.onChunkDirty(cx, cz + 1);
    if (lx === 0 && lz === 0) this.onChunkDirty(cx - 1, cz - 1);
    if (lx === 0 && lz === CHUNK_SIZE - 1) this.onChunkDirty(cx - 1, cz + 1);
    if (lx === CHUNK_SIZE - 1 && lz === 0) this.onChunkDirty(cx + 1, cz - 1);
    if (lx === CHUNK_SIZE - 1 && lz === CHUNK_SIZE - 1) this.onChunkDirty(cx + 1, cz + 1);
  }

  public undo(): boolean {
    const action = this.undoStack.pop();
    if (!action) return false;
    this.applyEdit(action.x, action.y, action.z, action.previousBlock);
    this.redoStack.push(action);
    return true;
  }

  public redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;
    this.applyEdit(action.x, action.y, action.z, action.newBlock);
    this.undoStack.push(action);
    return true;
  }

  private applyEdit(x: number, y: number, z: number, type: BlockType) {
    this.writeRaw(x, y, z, type);
    const key = this.blockKey(x, y, z);
    const cx = this.chunkCoordOf(x);
    const cz = this.chunkCoordOf(z);
    this.edits.set(key, type);
    const ck = this.chunkKey(cx, cz);
    let map = this.editsByChunk.get(ck);
    if (!map) {
      map = new Map();
      this.editsByChunk.set(ck, map);
    }
    map.set(key, type);
    this.markDirtyAt(x, z);
  }

  public canUndo() {
    return this.undoStack.length > 0;
  }

  public canRedo() {
    return this.redoStack.length > 0;
  }

  // -------------------------------------------------------------------------
  // Régénération / preset
  // -------------------------------------------------------------------------

  public reset(preset: WorldPreset, seed: number) {
    this.preset = preset;
    this.seed = Math.floor(seed) || 1;
    this.chunks.clear();
    this.edits.clear();
    this.editsByChunk.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.loadedBlockCount = 0;

    this.noiseTerrain = new Noise2D(this.seed);
    this.noiseBiome = new Noise2D(this.seed + 101);
    this.noiseMountain = new Noise2D(this.seed + 202);
    this.noiseCave = new Noise3D(this.seed + 303);

    this.onWorldChange?.();
  }

  public generatePreset(preset: WorldPreset, seed = Math.floor(Math.random() * 100000)) {
    this.reset(preset, seed);
  }

  // -------------------------------------------------------------------------
  // Biome & relief
  // -------------------------------------------------------------------------

  public calculateTerrainHeight(x: number, z: number): number {
    if (this.preset === 'flat' || this.preset === 'castle') return SEA_LEVEL;

    const continent = this.noiseTerrain.octaveNoise(x * 0.006, z * 0.006, 4, 0.5);
    let height = SEA_LEVEL + 3 + (continent - 0.5) * 38;

    // Chaînes de montagnes
    const ridgeNoise = this.noiseMountain.octaveNoise(x * 0.005 + 100, z * 0.005, 3, 0.55);
    if (ridgeNoise > 0.52) {
      const ridge = 1 - Math.abs(ridgeNoise * 2 - 1);
      height += Math.pow(ridge, 1.6) * 62 * (ridgeNoise - 0.52) * 4;
    }

    // Dunes de désert (évaluées directement pour éviter toute récursion)
    const temp = this.noiseBiome.octaveNoise(x * 0.0035 + 40, z * 0.0035 + 40, 2, 0.5);
    if (this.preset === 'desert' || temp > 0.57) {
      const dune = this.noiseTerrain.octaveNoise(x * 0.03 + 10, z * 0.03, 3, 0.45);
      height += dune * 5 - 2;
    }

    const detail = (this.noiseTerrain.noise(x * 0.12, z * 0.12) - 0.5) * 3;
    height += detail;

    return Math.floor(Math.max(WORLD_MIN_Y + 6, Math.min(WORLD_MAX_Y - 8, height)));
  }

  public getBiomeAt(x: number, z: number): BiomeType {
    if (this.preset === 'desert') return 'desert';
    if (this.preset === 'flat') return 'plains';
    if (this.preset === 'castle') return 'plains';

    const h = this.calculateTerrainHeight(x, z);

    if (h >= 56) return 'mountains';
    if (h < SEA_LEVEL - 1) {
      return h > SEA_LEVEL - 6 ? 'island' : 'ocean';
    }
    if (h <= SEA_LEVEL + 1) return 'beach';

    const temp = this.noiseBiome.octaveNoise(x * 0.0035 + 40, z * 0.0035 + 40, 2, 0.5);
    if (temp > 0.57) return 'desert';

    const forest = this.noiseBiome.octaveNoise(x * 0.008, z * 0.008, 2, 0.5);
    return forest > 0.5 ? 'forest' : 'plains';
  }

  // -------------------------------------------------------------------------
  // Génération de chunk
  // -------------------------------------------------------------------------

  private createChunk(cx: number, cz: number): Chunk {
    const chunk: Chunk = {
      cx,
      cz,
      blocks: new Uint16Array(CHUNK_AREA * WORLD_HEIGHT),
      topY: new Int16Array(CHUNK_AREA).fill(WORLD_MIN_Y - 1),
      loadedBlocks: 0,
    };

    this.generateTerrain(chunk);
    this.plantTrees(chunk);
    this.applySavedEdits(chunk);
    this.recountChunk(chunk);

    this.chunks.set(this.chunkKey(cx, cz), chunk);
    this.loadedBlockCount += chunk.loadedBlocks;
    return chunk;
  }

  private recountChunk(chunk: Chunk) {
    let count = 0;
    for (let i = 0; i < chunk.blocks.length; i++) if (chunk.blocks[i] !== 0) count++;
    chunk.loadedBlocks = count;
  }

  private setLocal(chunk: Chunk, x: number, y: number, z: number, type: BlockType) {
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) return;
    const lx = x - chunk.cx * CHUNK_SIZE;
    const lz = z - chunk.cz * CHUNK_SIZE;
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) return;
    const idx = (y - WORLD_MIN_Y) * CHUNK_AREA + lz * CHUNK_SIZE + lx;
    chunk.blocks[idx] = BLOCK_IDS[type] ?? 0;
    const col = lz * CHUNK_SIZE + lx;
    if (type !== 'air' && y > chunk.topY[col]) chunk.topY[col] = y;
  }

  private generateTerrain(chunk: Chunk) {
    const ox = chunk.cx * CHUNK_SIZE;
    const oz = chunk.cz * CHUNK_SIZE;
    const isFlat = this.preset === 'flat' || this.preset === 'castle';

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const x = ox + lx;
        const z = oz + lz;
        const height = this.calculateTerrainHeight(x, z);
        const biome = this.getBiomeAt(x, z);

        // Fondation indestructible
        for (let y = WORLD_MIN_Y; y <= WORLD_MIN_Y + 2; y++) {
          this.setLocal(chunk, x, y, z, 'bedrock');
        }
        if (hash3(x, 0, z, this.seed) > 0.55) {
          this.setLocal(chunk, x, WORLD_MIN_Y + 3, z, 'bedrock');
        }

        const soilDepth = biome === 'desert' ? 4 : 3;

        for (let y = WORLD_MIN_Y + 3; y <= height; y++) {
          if (y === WORLD_MIN_Y + 3) {
            this.setLocal(chunk, x, y, z, 'stone');
            continue;
          }

          const depth = height - y;
          let block: BlockType = 'stone';

          if (depth <= soilDepth) {
            if (biome === 'desert' || biome === 'beach') {
              block = depth <= 1 ? 'sand' : 'sandstone';
            } else if (biome === 'ocean') {
              block = depth === 0 ? (hash3(x, y, z, 7) > 0.5 ? 'gravel' : 'sand') : 'stone';
            } else if (biome === 'mountains') {
              block = height >= 52 && depth === 0 ? 'snow' : 'stone';
            } else {
              block = depth === 0 ? 'grass' : 'dirt';
            }
          }

          this.setLocal(chunk, x, y, z, block);

          // Minage : filons de minerais par profondeur
          if (block === 'stone') {
            const ore = this.oreAt(x, y, z, biome);
            if (ore) this.setLocal(chunk, x, y, z, ore);
          }
        }

        // Grottes (uniquement sous la surface, jamais dans le bedrock)
        if (!isFlat) {
          const caveTop = height - 3;
          for (let y = WORLD_MIN_Y + 4; y <= caveTop; y++) {
            const n = this.noiseCave.noise(x * 0.075, y * 0.11, z * 0.075);
            const tunnel = Math.abs(n - 0.5) < 0.028;
            const cavern = n > 0.68;
            if (tunnel || cavern) {
              this.setLocal(chunk, x, y, z, 'air');
            }
          }
        }

        // Océans, mers et plages
        if (height < SEA_LEVEL && biome !== 'desert') {
          for (let y = height + 1; y <= SEA_LEVEL; y++) {
            this.setLocal(chunk, x, y, z, 'water');
          }
        }

        // Îles flottantes du preset dédié
        if (this.preset === 'floating') {
          const n = this.noiseTerrain.octaveNoise(x * 0.02 + 300, z * 0.02, 3, 0.5);
          if (n > 0.6) {
            const islandTop = 58 + Math.floor((n - 0.6) * 60);
            for (let d = 0; d < 4; d++) {
              const y = islandTop - d;
              this.setLocal(chunk, x, y, z, d === 0 ? 'grass' : d <= 1 ? 'dirt' : 'stone');
            }
          }
        }

        // Château du preset "castle"
        if (this.preset === 'castle') {
          this.buildCastleColumn(chunk, x, z, height);
        }
      }
    }
  }

  private oreAt(x: number, y: number, z: number, biome: BiomeType): BlockType | null {
    const r = hash3(x, y, z, this.seed + 17);
    if (y < 8 && r < 0.0016) return 'diamond_ore';
    if (y < 16 && r < 0.0035) return 'redstone_ore';
    if (y < 30 && r < 0.006) return 'gold_ore';
    if (y < 56 && r < 0.013) return 'iron_ore';
    if (y < 90 && r < 0.024) return 'coal_ore';
    if (biome === 'mountains' && y > 20 && y < 70 && hash3(x, y, z, this.seed + 71) < 0.0022) {
      return 'emerald_ore';
    }
    return null;
  }

  private buildCastleColumn(chunk: Chunk, x: number, z: number, ground: number) {
    // Le château est construit autour de l'origine, sur un terrain plat.
    const r = Math.max(Math.abs(x), Math.abs(z));
    if (r > 20) return;

    // Douves
    if (r >= 16 && r <= 19) {
      const isBridge = z >= 16 && Math.abs(x) <= 2;
      if (!isBridge) this.setLocal(chunk, x, ground, z, 'water');
      else this.setLocal(chunk, x, ground, z, 'planks');
    }

    // Muraille 13x13
    if (r === 13) {
      const isGate = z === 13 && Math.abs(x) <= 2;
      if (!isGate) {
        for (let y = ground + 1; y <= ground + 8; y++) {
          this.setLocal(chunk, x, y, z, 'cobblestone');
        }
        if ((x + z) % 2 === 0) this.setLocal(chunk, x, ground + 9, z, 'stone');
      }
    }

    // Donjons d'angle
    const corners = [
      [-13, -13],
      [13, -13],
      [-13, 13],
      [13, 13],
    ];
    for (const [cx, cz] of corners) {
      const dx = x - cx;
      const dz = z - cz;
      if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) {
        const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        for (let y = ground + 1; y <= ground + 14; y++) {
          if (isWall || y === ground + 14) this.setLocal(chunk, x, y, z, 'brick');
        }
        if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
          if ((dx + dz) % 2 === 0) this.setLocal(chunk, x, ground + 15, z, 'cobblestone');
        }
        if (dx === 0 && dz === 0) this.setLocal(chunk, x, ground + 14, z, 'glowstone');
      }
    }

    // Logis seigneurial
    if (x >= -5 && x <= 5 && z >= -6 && z <= -1) {
      this.setLocal(chunk, x, ground, z, 'cobblestone');
      const isHouseEdge = x === -5 || x === 5 || z === -6 || z === -1;
      if (isHouseEdge) {
        for (let y = ground + 1; y <= ground + 6; y++) {
          if (y === ground + 3 && (x === 0 || z === -4)) {
            this.setLocal(chunk, x, y, z, 'glass');
          } else {
            this.setLocal(chunk, x, y, z, 'planks');
          }
        }
      }
      this.setLocal(chunk, x, ground + 7, z, 'wood');
    }
    if (x === -3 && z === -4) this.setLocal(chunk, x, ground + 1, z, 'crafting_table');
    if (x === -3 && z === -3) {
      this.setLocal(chunk, x, ground + 1, z, 'bookshelf');
      this.setLocal(chunk, x, ground + 2, z, 'bookshelf');
    }
    if (x === 3 && z === -4) this.setLocal(chunk, x, ground + 1, z, 'glowstone');
  }

  // -------------------------------------------------------------------------
  // Arbres
  // -------------------------------------------------------------------------

  private plantTrees(chunk: Chunk) {
    const margin = 3;
    const ox = chunk.cx * CHUNK_SIZE;
    const oz = chunk.cz * CHUNK_SIZE;

    for (let x = ox - margin; x < ox + CHUNK_SIZE + margin; x++) {
      for (let z = oz - margin; z < oz + CHUNK_SIZE + margin; z++) {
        const biome = this.getBiomeAt(x, z);
        if (biome !== 'forest' && biome !== 'plains' && biome !== 'island') continue;
        const density = biome === 'forest' ? 0.028 : biome === 'plains' ? 0.006 : 0.012;
        if (hash2(x, z, this.seed + 900) > density) continue;

        const ground = this.calculateTerrainHeight(x, z);
        if (ground <= SEA_LEVEL + 1) continue;

        const trunk = 4 + Math.floor(hash2(x, z, this.seed + 901) * 3);
        for (let y = 1; y <= trunk; y++) {
          this.setLocal(chunk, x, ground + y, z, 'wood');
        }

        const leafBase = ground + trunk - 2;
        for (let ly = leafBase; ly <= ground + trunk + 1; ly++) {
          const radius = ly >= ground + trunk ? 1 : 2;
          for (let lx = -radius; lx <= radius; lx++) {
            for (let lz = -radius; lz <= radius; lz++) {
              if (Math.abs(lx) === radius && Math.abs(lz) === radius) {
                if (hash2(x + lx, z + lz, this.seed + 902) > 0.4) continue;
              }
              const idx = this.localIndexOf(chunk, x + lx, ly, z + lz);
              if (idx < 0) continue;
              if (chunk.blocks[idx] === 0) {
                chunk.blocks[idx] = BLOCK_IDS.leaves;
                const col = (z + lz - chunk.cz * CHUNK_SIZE) * CHUNK_SIZE + (x + lx - chunk.cx * CHUNK_SIZE);
                if (ly > chunk.topY[col]) chunk.topY[col] = ly;
              }
            }
          }
        }
      }
    }
  }

  private localIndexOf(chunk: Chunk, x: number, y: number, z: number): number {
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) return -1;
    const lx = x - chunk.cx * CHUNK_SIZE;
    const lz = z - chunk.cz * CHUNK_SIZE;
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) return -1;
    return (y - WORLD_MIN_Y) * CHUNK_AREA + lz * CHUNK_SIZE + lx;
  }

  // -------------------------------------------------------------------------
  // Persistance & édition
  // -------------------------------------------------------------------------

  private applySavedEdits(chunk: Chunk) {
    const map = this.editsByChunk.get(this.chunkKey(chunk.cx, chunk.cz));
    if (!map) return;
    for (const [key, type] of map.entries()) {
      const [x, y, z] = key.split(',').map(Number);
      this.setLocal(chunk, x, y, z, type);
    }
  }

  public getSurfaceY(x: number, z: number): number {
    // Cherche le premier bloc solide en partant du haut (inclut les arbres).
    for (let y = WORLD_MAX_Y - 1; y >= WORLD_MIN_Y; y--) {
      const b = this.getBlock(x, y, z);
      if (b !== 'air' && b !== 'water' && b !== 'leaves' && b !== 'wood') {
        return y;
      }
    }
    return WORLD_MIN_Y;
  }

  public explodeTNT(
    x: number,
    y: number,
    z: number,
    radius = 3.8
  ): { x: number; y: number; z: number; type: BlockType }[] {
    const destroyed: { x: number; y: number; z: number; type: BlockType }[] = [];
    const rInt = Math.ceil(radius);

    for (let dx = -rInt; dx <= rInt; dx++) {
      for (let dy = -rInt; dy <= rInt; dy++) {
        for (let dz = -rInt; dz <= rInt; dz++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > radius) continue;
          const bx = x + dx;
          const by = y + dy;
          const bz = z + dz;
          const block = this.getBlock(bx, by, bz);
          if (block !== 'air' && block !== 'bedrock' && block !== 'obsidian' && block !== 'water') {
            destroyed.push({ x: bx, y: by, z: bz, type: block });
            this.setBlock(bx, by, bz, 'air', false);
          }
        }
      }
    }
    return destroyed;
  }

  public exportJSON(): string {
    const editList: { x: number; y: number; z: number; type: BlockType }[] = [];
    for (const [key, type] of this.edits.entries()) {
      const [x, y, z] = key.split(',').map(Number);
      editList.push({ x, y, z, type });
    }
    return JSON.stringify({
      version: 3,
      seed: this.seed,
      preset: this.preset,
      minY: WORLD_MIN_Y,
      maxY: WORLD_MAX_Y,
      edits: editList,
    });
  }

  public importJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (!data) return false;

      // Ancien format (v2) : monde fini 88x88x64 → on le convertit en éditions.
      if (!Array.isArray(data.edits) && Array.isArray(data.blocks)) {
        this.reset('flat', Math.floor(Math.random() * 100000));
        for (const item of data.blocks) {
          if (item && BLOCK_REGISTRY[item.type as BlockType]) {
            this.setBlock(item.x, item.y, item.z, item.type as BlockType, false);
          }
        }
        this.onWorldChange?.();
        return true;
      }

      if (!Array.isArray(data.edits)) return false;

      const preset = (data.preset as WorldPreset) || 'hills';
      this.reset(preset, Number(data.seed) || 1);

      for (const item of data.edits) {
        if (!item || !BLOCK_REGISTRY[item.type as BlockType]) continue;
        this.setBlock(item.x, item.y, item.z, item.type as BlockType, false);
      }

      this.onWorldChange?.();
      return true;
    } catch {
      return false;
    }
  }

  public saveToLocalStorage(key = 'voxelcraft_saved_world'): boolean {
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

  /** Libère les chunks trop éloignés pour garder la mémoire sous contrôle. */
  public unloadFarChunks(centerX: number, centerZ: number, maxChunkDistance: number) {
    const ccx = this.chunkCoordOf(centerX);
    const ccz = this.chunkCoordOf(centerZ);
    for (const [key, chunk] of this.chunks.entries()) {
      const dist = Math.max(Math.abs(chunk.cx - ccx), Math.abs(chunk.cz - ccz));
      if (dist > maxChunkDistance) {
        this.loadedBlockCount -= chunk.loadedBlocks;
        this.chunks.delete(key);
      }
    }
  }
}
