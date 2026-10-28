import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VoxelWorld } from './world';
import { TextureManager } from './textures';
import { PlayerPhysics } from './physics';
import { ParticleSystem } from './particles';
import { BlockType, BLOCK_REGISTRY } from './types';
import { soundEngine } from './audio';

// Pre-allocated math helpers at module scope to avoid GC spikes in animation loop
const _vec3 = new THREE.Vector3();
const _center = new THREE.Vector2(0, 0);
const _mat4 = new THREE.Matrix4();
const _dummy = new THREE.Object3D();
const _raycaster = new THREE.Raycaster();

export interface RaycastHit {
  blockPos: { x: number; y: number; z: number };
  placePos: { x: number; y: number; z: number };
  blockType: BlockType;
  faceNormal: THREE.Vector3;
}

export class GameRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public textureManager: TextureManager;
  public particles: ParticleSystem;

  private isSoftwareGl: boolean;
  private animFrameId: number = 0;
  private isDisposed = false;

  // Lighting & Sky
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private skyGroup: THREE.Group;
  private starsMesh: THREE.Points;
  private cloudsMesh: THREE.InstancedMesh;

  // Meshes & Blocks
  private blockMeshes: Map<BlockType, THREE.InstancedMesh> = new Map();
  private blockBoxGeom: THREE.BoxGeometry;
  private highlightBox: THREE.LineSegments;

  // First-person hand
  private handGroup: THREE.Group;
  private handBlockMesh: THREE.Mesh;
  private swingProgress = 0;
  private isSwinging = false;
  private walkBob = 0;

  // Primed TNTs
  private primedTNTs: { mesh: THREE.Mesh; x: number; y: number; z: number; timer: number }[] = [];

  // Day/Night Cycle (0.0: midnight, 0.25: dawn, 0.5: noon, 0.75: dusk)
  public timeOfDay: number = 0.45; // early afternoon
  public dayCycleActive: boolean = true;
  public dayCycleSpeed: number = 0.005; // ~200s full day cycle

  // Target block cache
  public currentHit: RaycastHit | null = null;

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
      240
    );

    // 4. Procedural Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Initialize Textures and Particles
    this.textureManager = new TextureManager();
    this.particles = new ParticleSystem(this.scene);
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

    // Sun: Square glowing box
    const sunGeom = new THREE.BoxGeometry(10, 10, 0.8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffa77 });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.skyGroup.add(this.sunMesh);

    // Moon: Square box
    const moonGeom = new THREE.BoxGeometry(9, 9, 0.8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xf4f6f7 });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    this.skyGroup.add(this.moonMesh);

    // Twinkling Stars
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

    // Voxel Clouds (altitude 68 above high mountains)
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
      const cy = 68 + Math.sin(i * 3) * 2;
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

    // 9. First-Person Hand holding active block
    this.handGroup = new THREE.Group();
    const handGeom = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const handMat = this.textureManager.getMaterialSet('grass')?.materials || new THREE.MeshStandardMaterial({ color: 0x559933 });
    this.handBlockMesh = new THREE.Mesh(handGeom, handMat);
    this.handBlockMesh.position.set(0.42, -0.38, -0.65);
    this.handBlockMesh.rotation.set(0.3, -0.5, 0.2);
    this.handGroup.add(this.handBlockMesh);
    this.camera.add(this.handGroup);
    this.scene.add(this.camera);

    // 10. Rebuild world meshes
    this.rebuildAllMeshes();
    this.world.onWorldChange = () => {
      this.rebuildAllMeshes();
    };

    // 11. Resize handling
    window.addEventListener('resize', this.onResize);

    // 12. Start animation loop
    this.startLoop();
  }

  public setHandBlock(blockType: BlockType) {
    const matSet = this.textureManager.getMaterialSet(blockType);
    if (matSet) {
      this.handBlockMesh.material = matSet.materials;
      this.handBlockMesh.visible = blockType !== 'air';
    }
  }

  public triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  public primeTNT(x: number, y: number, z: number) {
    // Replace TNT block with primed flashing TNT
    this.world.setBlock(x, y, z, 'air', false);
    soundEngine.playTNTFuse();

    const tntMatSet = this.textureManager.getMaterialSet('tnt');
    const mat = tntMatSet?.materials || new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(this.blockBoxGeom, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);

    this.primedTNTs.push({
      mesh,
      x,
      y,
      z,
      timer: 3.0, // 3 seconds fuse
    });
  }

  public rebuildAllMeshes() {
    // Collect visible blocks grouped by BlockType
    const blockGroups = new Map<BlockType, { x: number; y: number; z: number }[]>();
    const allBlocks = this.world.getAllBlocks();

    for (const [key, type] of allBlocks.entries()) {
      if (type === 'air') continue;
      const [x, y, z] = key.split(',').map(Number);

      // Hidden Face Culling: If completely encased by 6 opaque blocks, skip rendering
      const isEnclosed =
        this.isOpaque(x + 1, y, z) &&
        this.isOpaque(x - 1, y, z) &&
        this.isOpaque(x, y + 1, z) &&
        this.isOpaque(x, y - 1, z) &&
        this.isOpaque(x, y, z + 1) &&
        this.isOpaque(x, y, z - 1);

      if (isEnclosed) continue;

      if (!blockGroups.has(type)) {
        blockGroups.set(type, []);
      }
      blockGroups.get(type)!.push({ x, y, z });
    }

    // Update or create InstancedMesh for each type
    for (const [type, positions] of blockGroups.entries()) {
      let instMesh = this.blockMeshes.get(type);
      const count = positions.length;

      if (!instMesh || instMesh.count < count) {
        if (instMesh) {
          this.scene.remove(instMesh);
          instMesh.dispose();
        }
        const matSet = this.textureManager.getMaterialSet(type);
        const mat = matSet ? matSet.materials : new THREE.MeshStandardMaterial({ color: 0x888888 });

        // Allocate buffer with headroom to avoid frequent re-allocations
        const capacity = Math.max(count + 64, 128);
        instMesh = new THREE.InstancedMesh(this.blockBoxGeom, mat, capacity);
        instMesh.castShadow = !this.isSoftwareGl && type !== 'glass' && type !== 'water';
        instMesh.receiveShadow = !this.isSoftwareGl;
        instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(instMesh);
        this.blockMeshes.set(type, instMesh);
      }

      instMesh.count = count;
      for (let i = 0; i < count; i++) {
        const p = positions[i];
        _mat4.makeTranslation(p.x + 0.5, p.y + 0.5, p.z + 0.5);
        instMesh.setMatrixAt(i, _mat4);
      }
      instMesh.instanceMatrix.needsUpdate = true;
      instMesh.computeBoundingSphere();
    }

    // Hide any unused instanced meshes
    for (const [type, instMesh] of this.blockMeshes.entries()) {
      if (!blockGroups.has(type)) {
        instMesh.count = 0;
        instMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  private isOpaque(x: number, y: number, z: number): boolean {
    const b = this.world.getBlock(x, y, z);
    if (b === 'air') return false;
    const cfg = BLOCK_REGISTRY[b];
    return !!(cfg && cfg.solid && !cfg.transparent);
  }

  // Update Day / Night cycle colors & sun/moon positions
  private updateDayNight(delta: number) {
    if (this.dayCycleActive) {
      this.timeOfDay = (this.timeOfDay + delta * this.dayCycleSpeed) % 1.0;
    }

    const angle = this.timeOfDay * Math.PI * 2;
    const sunDist = 140;

    // Sun orbit
    const sunX = Math.cos(angle) * sunDist;
    const sunY = Math.sin(angle) * sunDist;
    this.sunMesh.position.set(sunX, sunY, 0);
    this.sunMesh.lookAt(0, 0, 0);

    // Moon opposite to Sun
    this.moonMesh.position.set(-sunX, -sunY, 0);
    this.moonMesh.lookAt(0, 0, 0);

    // Directional light tracks sun position (or moon during night)
    const isDay = sunY > -5;
    if (isDay) {
      this.dirLight.position.set(sunX, Math.max(sunY, 10), 20);
      const intensity = Math.max(0.1, Math.min(1.4, (sunY / 30) * 1.4));
      this.dirLight.intensity = intensity;
      this.dirLight.color.setHSL(0.1, 0.4, 0.95);
    } else {
      // Gentle blue moonlight
      this.dirLight.position.set(-sunX, Math.max(-sunY, 10), 20);
      this.dirLight.intensity = 0.2;
      this.dirLight.color.setHSL(0.6, 0.5, 0.7);
    }

    // Sky & Fog colors
    let skyColor: THREE.Color;
    let fogDensity = 0.007;

    if (sunY > 20) {
      // Clear daytime cyan
      skyColor = new THREE.Color(0x78a7ff);
    } else if (sunY > 0) {
      // Golden dawn / sunset
      const t = sunY / 20;
      skyColor = new THREE.Color(0xfd7e14).lerp(new THREE.Color(0x78a7ff), t);
    } else if (sunY > -15) {
      // Dusk twilight
      const t = (sunY + 15) / 15;
      skyColor = new THREE.Color(0x0d1b2a).lerp(new THREE.Color(0xfd7e14), t);
    } else {
      // Deep midnight
      skyColor = new THREE.Color(0x060b14);
    }

    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(skyColor, fogDensity);
    this.hemiLight.color.copy(skyColor);

    // Star visibility
    const starOpacity = Math.max(0, Math.min(1, (-sunY + 5) / 25));
    (this.starsMesh.material as THREE.PointsMaterial).opacity = starOpacity;
    this.starsMesh.visible = starOpacity > 0.05;

    // Drifting clouds
    this.cloudsMesh.position.x += delta * 0.8;
    if (this.cloudsMesh.position.x > 32) this.cloudsMesh.position.x = -32;
  }

  // Update raycast from screen center to find targeted voxel
  public updateRaycast(reach = 6.0) {
    _raycaster.setFromCamera(_center, this.camera);

    const activeMeshes: THREE.InstancedMesh[] = [];
    for (const mesh of this.blockMeshes.values()) {
      if (mesh.count > 0) activeMeshes.push(mesh);
    }

    const intersects = _raycaster.intersectObjects(activeMeshes, false);
    let validHit: RaycastHit | null = null;

    for (const hit of intersects) {
      if (hit.distance > reach || !hit.point || !hit.face) continue;

      // Calculate voxel center by stepping slightly along ray inside block
      const insidePoint = hit.point.clone().addScaledVector(_raycaster.ray.direction, 0.005);
      const bx = Math.floor(insidePoint.x);
      const by = Math.floor(insidePoint.y);
      const bz = Math.floor(insidePoint.z);

      const block = this.world.getBlock(bx, by, bz);
      if (block === 'air' || block === 'water') continue;

      // Position where a newly placed block would sit
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

  // Update Primed TNT explosions & flash
  private updatePrimedTNTs(delta: number) {
    for (let i = this.primedTNTs.length - 1; i >= 0; i--) {
      const t = this.primedTNTs[i];
      t.timer -= delta;

      // Expand and flash white
      const flash = Math.sin(t.timer * 20) > 0;
      const s = 1.0 + (3.0 - t.timer) * 0.08;
      t.mesh.scale.set(s, s, s);

      if (flash) {
        (t.mesh.material as THREE.Material).opacity = 0.5;
      }

      if (t.timer <= 0) {
        // Boom!
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
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

  // Hand swing and walk bobbing animation
  private updateHand(delta: number) {
    // Walking bob
    const isMoving = this.physics.velocity.lengthSq() > 0.5 && this.physics.isGrounded;
    if (isMoving) {
      this.walkBob += delta * 10;
    } else {
      this.walkBob += delta * 2;
    }
    const bobX = Math.cos(this.walkBob) * (isMoving ? 0.02 : 0.005);
    const bobY = Math.sin(this.walkBob * 2) * (isMoving ? 0.025 : 0.008);

    // Punch swing
    if (this.isSwinging) {
      this.swingProgress += delta * 5.0; // quick punch in ~0.2s
      if (this.swingProgress >= 1.0) {
        this.swingProgress = 0;
        this.isSwinging = false;
      }
    }
    const swingAngle = Math.sin(this.swingProgress * Math.PI) * 0.5;

    this.handBlockMesh.position.set(0.42 + bobX, -0.38 + bobY - swingAngle * 0.2, -0.65 - swingAngle * 0.3);
    this.handBlockMesh.rotation.set(0.3 + swingAngle * 0.8, -0.5 - swingAngle * 0.4, 0.2 + swingAngle * 0.3);
  }

  // Software WebGL pacing helper (as mandated by Three.js architectural guidelines)
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animFrameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.animFrameId = window.setTimeout(cb, 60);
      }
    };
    this.animFrameId = window.setTimeout(poll, 5);
  }

  private lastTime = performance.now();

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;

      const now = performance.now();
      const delta = Math.min((now - this.lastTime) / 1000, 0.08);
      this.lastTime = now;

      // Update camera from physics
      const eyePos = this.physics.getEyePosition();
      this.camera.position.copy(eyePos);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.physics.yaw;
      this.camera.rotation.x = this.physics.pitch;

      // Subsystem updates
      this.updateDayNight(delta);
      this.updateRaycast();
      this.updateHand(delta);
      this.updatePrimedTNTs(delta);
      this.particles.update(delta);

      // Render
      this.renderer.render(this.scene, this.camera);

      // Frame pacing: software WebGL pacing vs rAF GPU loop
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.animFrameId = requestAnimationFrame(tick);
    }
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
    if (this.isSoftwareGl) {
      clearTimeout(this.animFrameId);
    } else {
      cancelAnimationFrame(this.animFrameId);
    }
    this.particles.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
