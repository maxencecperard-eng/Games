import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VoxelWorld, CHUNK_SIZE, WORLD_MIN_Y, WORLD_MAX_Y } from './world';
import { PlayerPhysics } from './physics';
import { BLOCK_REGISTRY, BlockType, ID_TO_BLOCK } from './types';
import { TextureManager } from './textures';
import { ParticleSystem } from './particles';
import { MobManager } from './entities';
import { soundEngine } from './audio';
import { ItemId, getItem } from './items';

const _dummy = new THREE.Object3D();
const _mat4 = new THREE.Matrix4();
const _raycaster = new THREE.Raycaster();
const _center = new THREE.Vector2(0, 0);

export interface RaycastHit {
  blockPos: { x: number; y: number; z: number };
  placePos: { x: number; y: number; z: number };
  blockType: BlockType;
  faceNormal: THREE.Vector3;
}

export interface AttackResult {
  hit: boolean;
  killed: boolean;
  name: string;
  position: THREE.Vector3 | null;
}

export class GameRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public textureManager: TextureManager;
  public particles: ParticleSystem;
  public mobs: MobManager;
  public isSoftwareGl: boolean;

  private isDisposed = false;
  private animFrameId = 0;

  private hemiLight: THREE.HemisphereLight;
  private dirLight: THREE.DirectionalLight;

  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private skyGroup: THREE.Group;
  private starsMesh: THREE.Points;
  private cloudsMesh: THREE.InstancedMesh;

  // Meshes & Blocks — un groupe d'InstancedMesh par chunk
  private chunkMeshes: Map<string, Map<BlockType, THREE.InstancedMesh>> = new Map();
  private dirtyChunks: Set<string> = new Set();
  private blockBoxGeom: THREE.BoxGeometry;
  private highlightBox: THREE.LineSegments;

  // First-person hand
  private handAnchor: THREE.Group;
  private handBlockMesh: THREE.Mesh;
  private handToolGroup: THREE.Group;
  private swingProgress = 0;
  private isSwinging = false;
  private walkBob = 0;

  // Primed TNTs
  private primedTNTs: { mesh: THREE.Mesh; x: number; y: number; z: number; timer: number }[] = [];

  // Day/Night Cycle (0.0: midnight, 0.25: dawn, 0.5: noon, 0.75: dusk)
  public timeOfDay: number = 0.45; // early afternoon
  public dayCycleActive: boolean = true;
  public dayCycleSpeed: number = 1 / 360; // 6 min full cycle: 3 min of day, 3 min of night
  public isDay: boolean = true;

  /** Callback quand un monstre touche le joueur. */
  public onPlayerHit?: (damage: number, source: string) => void;

  // Target block cache
  public currentHit: RaycastHit | null = null;

  private readonly renderRadius = 4;

  constructor(
    private container: HTMLElement,
    private world: VoxelWorld,
    private physics: PlayerPhysics
  ) {
    // 1. Detect software WebGL as instructed by Three.js architectural guidelines
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Scene and Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      260
    );

    // 4. Procedural Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Initialize Textures and Particles
    this.textureManager = new TextureManager();
    this.particles = new ParticleSystem(this.scene);
    this.mobs = new MobManager(this.scene, world, !this.isSoftwareGl);
    this.blockBoxGeom = new THREE.BoxGeometry(1, 1, 1);

    // 6. Lighting
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.75);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 160;
    const d = 55;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    // 7. Sky, Sun, Moon & Clouds
    this.skyGroup = new THREE.Group();
    this.scene.add(this.skyGroup);

    const sunGeom = new THREE.BoxGeometry(10, 10, 0.8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffa77 });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.skyGroup.add(this.sunMesh);

    const moonGeom = new THREE.BoxGeometry(9, 9, 0.8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xf4f6f7 });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    this.skyGroup.add(this.moonMesh);

    const starGeom = new THREE.BufferGeometry();
    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 160;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15;
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starsMesh = new THREE.Points(
      starGeom,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.85 })
    );
    this.skyGroup.add(this.starsMesh);

    const cloudGeom = new THREE.BoxGeometry(14, 2.5, 14);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
    });
    this.cloudsMesh = new THREE.InstancedMesh(cloudGeom, cloudMat, 96);
    for (let i = 0; i < 96; i++) {
      const cx = (i % 12 - 6) * 18 + (Math.random() - 0.5) * 12;
      const cz = (Math.floor(i / 12) - 4) * 18 + (Math.random() - 0.5) * 12;
      const cy = 118 + Math.sin(i * 3) * 2;
      _dummy.position.set(cx, cy, cz);
      _dummy.scale.set(1 + Math.random() * 0.9, 0.8, 1 + Math.random() * 0.9);
      _dummy.updateMatrix();
      this.cloudsMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.cloudsMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.cloudsMesh);

    // 8. Target Highlight Wireframe Box
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.highlightBox = new THREE.LineSegments(edges, lineMat);
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);

    // 9. First-Person Hand
    this.handAnchor = new THREE.Group();
    const handGeom = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const handMat =
      this.textureManager.getMaterialSet('grass')?.materials ||
      new THREE.MeshStandardMaterial({ color: 0x559933 });
    this.handBlockMesh = new THREE.Mesh(handGeom, handMat);
    this.handToolGroup = new THREE.Group();
    this.handAnchor.add(this.handBlockMesh);
    this.handAnchor.add(this.handToolGroup);
    this.handAnchor.position.set(0.42, -0.38, -0.65);
    this.handBlockMesh.rotation.set(0.3, -0.5, 0.2);
    this.camera.add(this.handAnchor);
    this.scene.add(this.camera);

    // 10. World callbacks & initial chunk meshes
    this.world.onChunkDirty = (cx, cz) => {
      this.dirtyChunks.add(`${cx},${cz}`);
    };
    this.world.onWorldChange = () => {
      this.clearChunkMeshes();
      this.dirtyChunks.clear();
    };

    this.syncChunks(true);

    // 11. Initial creature population around the spawn point
    this.mobs.reset(this.physics.position);

    // 12. Resize handling
    window.addEventListener('resize', this.onResize);

    // 13. Start animation loop
    this.startLoop();
  }

  // -------------------------------------------------------------------------
  // Hand item
  // -------------------------------------------------------------------------

  public setHandItem(item: ItemId | null) {
    const config = getItem(item);

    if (!item || !config) {
      this.handBlockMesh.visible = false;
      this.handToolGroup.visible = false;
      return;
    }

    if (config.kind === 'block' && config.block) {
      const matSet = this.textureManager.getMaterialSet(config.block);
      if (matSet) this.handBlockMesh.material = matSet.materials;
      this.handBlockMesh.visible = true;
      this.handToolGroup.visible = false;
      return;
    }

    // Outil / arme : petit modèle voxel
    this.handBlockMesh.visible = false;
    this.handToolGroup.visible = true;
    this.handToolGroup.clear();

    const tierColors: Record<string, string> = {
      wood: '#b8945f',
      stone: '#9a9a9a',
      iron: '#e2e2e2',
      diamond: '#4dedf4',
    };
    const prefix = String(item).split('_')[0];
    const bladeColor = tierColors[prefix] || '#b8945f';

    const handleMat = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.8 });
    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeColor,
      roughness: 0.35,
      metalness: prefix === 'iron' || prefix === 'diamond' ? 0.6 : 0.15,
    });

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), handleMat);
    handle.position.set(0, -0.18, 0);
    handle.rotation.z = 0.25;
    this.handToolGroup.add(handle);

    if (config.kind === 'weapon') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.05), bladeMat);
      blade.position.set(0.09, 0.2, 0);
      blade.rotation.z = 0.25;
      this.handToolGroup.add(blade);
    } else {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), bladeMat);
      head.position.set(0.06, 0.12, 0);
      head.rotation.z = 0.25;
      this.handToolGroup.add(head);
    }

    this.handToolGroup.rotation.set(0.3, -0.4, 0.1);
  }

  public triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  public primeTNT(x: number, y: number, z: number) {
    this.world.setBlock(x, y, z, 'air', false);
    soundEngine.playTNTFuse();

    const tntMatSet = this.textureManager.getMaterialSet('tnt');
    const mat = tntMatSet?.materials || new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(this.blockBoxGeom, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);

    this.primedTNTs.push({ mesh, x, y, z, timer: 3.0 });
  }

  // -------------------------------------------------------------------------
  // Chunk meshes
  // -------------------------------------------------------------------------

  private chunkKey(cx: number, cz: number) {
    return `${cx},${cz}`;
  }

  private disposeChunkMesh(key: string) {
    const group = this.chunkMeshes.get(key);
    if (!group) return;
    for (const mesh of group.values()) {
      this.scene.remove(mesh);
      mesh.dispose();
    }
    this.chunkMeshes.delete(key);
  }

  private clearChunkMeshes() {
    for (const key of Array.from(this.chunkMeshes.keys())) this.disposeChunkMesh(key);
  }

  /** Charge les chunks visibles et reconstruit ceux marqués comme modifiés. */
  public syncChunks(force = false) {
    const pcx = Math.floor(this.physics.position.x / CHUNK_SIZE);
    const pcz = Math.floor(this.physics.position.z / CHUNK_SIZE);
    const radius = this.renderRadius;
    const wanted = new Set<string>();

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dz * dz > (radius + 0.5) * (radius + 0.5)) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = this.chunkKey(cx, cz);
        wanted.add(key);
        this.world.getChunk(cx, cz, true);
        if (!this.chunkMeshes.has(key) || this.dirtyChunks.has(key) || force) {
          this.rebuildChunk(cx, cz);
        }
      }
    }

    this.dirtyChunks.clear();

    for (const key of Array.from(this.chunkMeshes.keys())) {
      if (!wanted.has(key)) this.disposeChunkMesh(key);
    }

    // Libère la mémoire des chunks très éloignés.
    this.world.unloadFarChunks(this.physics.position.x, this.physics.position.z, radius + 5);
  }

  private blockAt(cx: number, cz: number, blocks: Uint16Array, x: number, y: number, z: number): BlockType {
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) return 'air';
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
      return ID_TO_BLOCK[blocks[(y - WORLD_MIN_Y) * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx]] ?? 'air';
    }
    return this.world.getBlock(x, y, z);
  }

  private isOpaqueBlock(type: BlockType): boolean {
    if (type === 'air') return false;
    const cfg = BLOCK_REGISTRY[type];
    return !!(cfg && cfg.solid && !cfg.transparent);
  }

  private rebuildChunk(cx: number, cz: number) {
    const blocks = this.world.getChunkBlocks(cx, cz);
    const topY = this.world.getChunkTopY(cx, cz);
    if (!blocks || !topY) return;

    this.disposeChunkMesh(this.chunkKey(cx, cz));

    const groups = new Map<BlockType, number[]>();
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = ox + lx;
        const z = oz + lz;
        const col = lz * CHUNK_SIZE + lx;
        const top = Math.min(topY[col], WORLD_MAX_Y - 1);

        for (let y = WORLD_MIN_Y; y <= top; y++) {
          const idx = (y - WORLD_MIN_Y) * CHUNK_SIZE * CHUNK_SIZE + col;
          const id = blocks[idx];
          if (id === 0) continue;
          const type = ID_TO_BLOCK[id];
          if (!type) continue;

          // Culling des blocs totalement entourés de blocs opaques.
          const surrounded =
            this.isOpaqueBlock(this.blockAt(cx, cz, blocks, x + 1, y, z)) &&
            this.isOpaqueBlock(this.blockAt(cx, cz, blocks, x - 1, y, z)) &&
            this.isOpaqueBlock(this.blockAt(cx, cz, blocks, x, y + 1, z)) &&
            this.isOpaqueBlock(this.blockAt(cx, cz, blocks, x, y - 1, z)) &&
            this.isOpaqueBlock(this.blockAt(cx, cz, blocks, x, y, z + 1)) &&
            this.isOpaqueBlock(this.blockAt(cx, cz, blocks, x, y, z - 1));
          if (surrounded) continue;

          let list = groups.get(type);
          if (!list) {
            list = [];
            groups.set(type, list);
          }
          list.push(x, y, z);
        }
      }
    }

    const chunkGroup = new Map<BlockType, THREE.InstancedMesh>();

    for (const [type, positions] of groups.entries()) {
      const count = positions.length / 3;
      if (count === 0) continue;

      const matSet = this.textureManager.getMaterialSet(type);
      const mat = matSet ? matSet.materials : new THREE.MeshStandardMaterial({ color: 0x888888 });

      const capacity = count + 16;
      const instMesh = new THREE.InstancedMesh(this.blockBoxGeom, mat, capacity);
      instMesh.castShadow = !this.isSoftwareGl && type !== 'glass' && type !== 'water';
      instMesh.receiveShadow = !this.isSoftwareGl;
      instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instMesh.frustumCulled = true;

      for (let i = 0; i < count; i++) {
        _mat4.makeTranslation(positions[i * 3] + 0.5, positions[i * 3 + 1] + 0.5, positions[i * 3 + 2] + 0.5);
        instMesh.setMatrixAt(i, _mat4);
      }
      instMesh.count = count;
      instMesh.instanceMatrix.needsUpdate = true;
      instMesh.computeBoundingSphere();

      this.scene.add(instMesh);
      chunkGroup.set(type, instMesh);
    }

    this.chunkMeshes.set(this.chunkKey(cx, cz), chunkGroup);
  }

  public rebuildAllMeshes() {
    this.syncChunks(true);
  }

  private activeBlockMeshes(): THREE.InstancedMesh[] {
    const list: THREE.InstancedMesh[] = [];
    for (const group of this.chunkMeshes.values()) {
      for (const mesh of group.values()) {
        if (mesh.count > 0) list.push(mesh);
      }
    }
    return list;
  }

  // -------------------------------------------------------------------------
  // Combat
  // -------------------------------------------------------------------------

  public tryAttack(damage: number, reach = 4.2): AttackResult {
    _raycaster.setFromCamera(_center, this.camera);
    _raycaster.far = reach;
    const result = this.mobs.hitTest(_raycaster, reach, damage);
    _raycaster.far = Infinity;
    return result;
  }

  // -------------------------------------------------------------------------
  // Day / Night
  // -------------------------------------------------------------------------

  private updateDayNight(delta: number) {
    if (this.dayCycleActive) {
      this.timeOfDay = (this.timeOfDay + delta * this.dayCycleSpeed) % 1.0;
    }

    const angle = this.timeOfDay * Math.PI * 2;
    const sunDist = 140;

    const sunX = Math.cos(angle) * sunDist;
    const sunY = Math.sin(angle) * sunDist;
    this.sunMesh.position.set(sunX, sunY, 0);
    this.sunMesh.lookAt(0, 0, 0);

    this.moonMesh.position.set(-sunX, -sunY, 0);
    this.moonMesh.lookAt(0, 0, 0);

    const isDay = sunY > 0;
    this.isDay = isDay;
    if (isDay) {
      this.dirLight.position.set(sunX, Math.max(sunY, 10), 20);
      const intensity = Math.max(0.1, Math.min(1.4, (sunY / 30) * 1.4));
      this.dirLight.intensity = intensity;
      this.dirLight.color.setHSL(0.1, 0.4, 0.95);
    } else {
      this.dirLight.position.set(-sunX, Math.max(-sunY, 10), 20);
      this.dirLight.intensity = 0.2;
      this.dirLight.color.setHSL(0.6, 0.5, 0.7);
    }

    let skyColor: THREE.Color;

    if (sunY > 20) {
      skyColor = new THREE.Color(0x78a7ff);
    } else if (sunY > 0) {
      const t = sunY / 20;
      skyColor = new THREE.Color(0xfd7e14).lerp(new THREE.Color(0x78a7ff), t);
    } else if (sunY > -15) {
      const t = (sunY + 15) / 15;
      skyColor = new THREE.Color(0x0d1b2a).lerp(new THREE.Color(0xfd7e14), t);
    } else {
      skyColor = new THREE.Color(0x060b14);
    }

    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(skyColor, 0.0075);
    this.hemiLight.color.copy(skyColor);

    const starOpacity = Math.max(0, Math.min(1, (-sunY + 5) / 25));
    (this.starsMesh.material as THREE.PointsMaterial).opacity = starOpacity;
    this.starsMesh.visible = starOpacity > 0.05;

    this.cloudsMesh.position.x += delta * 0.8;
    if (this.cloudsMesh.position.x > 32) this.cloudsMesh.position.x = -32;
    this.cloudsMesh.position.y = this.physics.position.y + 60;
  }

  // -------------------------------------------------------------------------
  // Raycast / cible
  // -------------------------------------------------------------------------

  public updateRaycast(reach = 6.0) {
    _raycaster.setFromCamera(_center, this.camera);
    this.highlightBox.position.set(0, 0, 0);

    const activeMeshes = this.activeBlockMeshes();
    const intersects = _raycaster.intersectObjects(activeMeshes, false);
    let validHit: RaycastHit | null = null;

    for (const hit of intersects) {
      if (hit.distance > reach || !hit.point || !hit.face) continue;

      const insidePoint = hit.point.clone().addScaledVector(_raycaster.ray.direction, 0.005);
      const bx = Math.floor(insidePoint.x);
      const by = Math.floor(insidePoint.y);
      const bz = Math.floor(insidePoint.z);

      const block = this.world.getBlock(bx, by, bz);
      if (block === 'air' || block === 'water') continue;

      const placeX = bx + Math.round(hit.face.normal.x);
      const placeY = by + Math.round(hit.face.normal.y);
      const placeZ = bz + Math.round(hit.face.normal.z);

      validHit = {
        blockPos: { x: bx, y: by, z: bz },
        placePos: { x: placeX, y: placeY, z: placeZ },
        blockType: block,
        faceNormal: hit.face.normal.clone(),
      };
      break;
    }

    this.currentHit = validHit;

    if (validHit) {
      this.highlightBox.position.set(
        validHit.blockPos.x + 0.5,
        validHit.blockPos.y + 0.5,
        validHit.blockPos.z + 0.5
      );
      this.highlightBox.visible = true;
    } else {
      this.highlightBox.visible = false;
    }
  }

  // -------------------------------------------------------------------------
  // TNT
  // -------------------------------------------------------------------------

  private updatePrimedTNTs(delta: number) {
    for (let i = this.primedTNTs.length - 1; i >= 0; i--) {
      const t = this.primedTNTs[i];
      t.timer -= delta;

      const flash = Math.sin(t.timer * 20) > 0;
      const s = 1.0 + (3.0 - t.timer) * 0.08;
      t.mesh.scale.set(s, s, s);

      if (flash) {
        (t.mesh.material as THREE.Material).opacity = 0.5;
      }

      if (t.timer <= 0) {
        this.scene.remove(t.mesh);
        this.primedTNTs.splice(i, 1);

        soundEngine.playExplosion();
        this.particles.emitExplosion(t.x, t.y, t.z);

        const destroyed = this.world.explodeTNT(t.x, t.y, t.z, 3.8);
        for (const d of destroyed) {
          this.particles.emitBreak(d.x, d.y, d.z, d.type);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Hand animation
  // -------------------------------------------------------------------------

  private updateHand(delta: number) {
    const isMoving = this.physics.velocity.lengthSq() > 0.5 && this.physics.isGrounded;
    if (isMoving) this.walkBob += delta * 10;
    else this.walkBob += delta * 2;

    const bobX = Math.cos(this.walkBob) * (isMoving ? 0.02 : 0.005);
    const bobY = Math.sin(this.walkBob * 2) * (isMoving ? 0.025 : 0.008);

    if (this.isSwinging) {
      this.swingProgress += delta * 5.0;
      if (this.swingProgress >= 1.0) {
        this.swingProgress = 0;
        this.isSwinging = false;
      }
    }
    const swingAngle = Math.sin(this.swingProgress * Math.PI) * 0.5;

    this.handAnchor.position.set(
      0.42 + bobX,
      -0.38 + bobY - swingAngle * 0.2,
      -0.65 - swingAngle * 0.3
    );
    this.handAnchor.rotation.set(swingAngle * 0.8, -swingAngle * 0.4, swingAngle * 0.3);
  }

  // -------------------------------------------------------------------------
  // Boucle
  // -------------------------------------------------------------------------

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const startedAt = performance.now();
    const poll = () => {
      if (this.isDisposed) return;
      let state: number = gl.SIGNALED;
      try {
        state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      } catch {
        state = gl.SIGNALED; // contexte perdu : on continue, le renderer signalera l'erreur
      }
      // Ne jamais bloquer la boucle indéfiniment si le GPU ne signale pas son fence
      // (pilote logiciel bloqué ou contexte perdu).
      if (state === gl.UNSIGNALED && performance.now() - startedAt < 1000) {
        this.animFrameId = window.setTimeout(poll, 5);
        return;
      }
      if (sync) gl.deleteSync(sync);
      this.animFrameId = window.setTimeout(cb, 60);
    };
    this.animFrameId = window.setTimeout(poll, 5);
  }

  private lastTime = performance.now();
  private lastChunkSync = 0;

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;

      const now = performance.now();
      const rawDelta = (now - this.lastTime) / 1000;
      const delta = Math.min(rawDelta, 0.08);
      this.lastTime = now;

      const eyePos = this.physics.getEyePosition();
      this.camera.position.copy(eyePos);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.physics.yaw;
      this.camera.rotation.x = this.physics.pitch;

      this.updateDayNight(Math.min(rawDelta, 1));
      this.updateRaycast();
      this.updateHand(delta);
      this.updatePrimedTNTs(delta);
      this.mobs.update(
        delta,
        this.physics.position,
        this.isDay,
        this.physics.isFlying,
        this.onPlayerHit
      );
      this.particles.update(delta);

      // Synchronisation des chunks (chargement / déchargement)
      if (now - this.lastChunkSync > 200) {
        this.lastChunkSync = now;
        this.syncChunks();
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) this.afterDraw(tick);
    else this.animFrameId = requestAnimationFrame(tick);
  }

  private onResize = () => {
    if (!this.container || this.isDisposed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose() {
    this.isDisposed = true;
    window.removeEventListener('resize', this.onResize);
    if (this.isSoftwareGl) clearTimeout(this.animFrameId);
    else cancelAnimationFrame(this.animFrameId);
    this.particles.dispose();
    this.mobs.dispose();
    this.clearChunkMeshes();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
