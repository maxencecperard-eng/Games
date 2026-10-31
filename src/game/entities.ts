import * as THREE from 'three';
import { VoxelWorld } from './world';
import { BLOCK_REGISTRY, BlockType } from './types';

/**
 * Simple living entities (mobs).
 *
 * - Passive during the day: pigs & cows graze and wander.
 * - Hostile at night: zombies & skeletons roam.
 *
 * Each mob walks with a random heading, is blocked by solid voxels,
 * can step up a single block, avoids water and cliffs, and turns
 * around when it bumps into something.
 */

export type MobType = 'pig' | 'cow' | 'zombie' | 'skeleton';

interface MobStats {
  name: string;
  emoji: string;
  hostile: boolean;
  radius: number;
  height: number;
  speed: number;
  maxHealth: number;
  damage: number;
}

const MOB_STATS: Record<MobType, MobStats> = {
  pig: {
    name: 'Cochon',
    emoji: '🐷',
    hostile: false,
    radius: 0.36,
    height: 1.25,
    speed: 1.7,
    maxHealth: 10,
    damage: 0,
  },
  cow: {
    name: 'Vache',
    emoji: '🐮',
    hostile: false,
    radius: 0.42,
    height: 1.45,
    speed: 1.5,
    maxHealth: 10,
    damage: 0,
  },
  zombie: {
    name: 'Zombie',
    emoji: '🧟',
    hostile: true,
    radius: 0.34,
    height: 1.95,
    speed: 1.6,
    maxHealth: 20,
    damage: 2,
  },
  skeleton: {
    name: 'Squelette',
    emoji: '💀',
    hostile: true,
    radius: 0.3,
    height: 1.9,
    speed: 1.9,
    maxHealth: 20,
    damage: 3,
  },
};

const TAU = Math.PI * 2;
const ARM_ANGLE = Math.PI / 2 - 0.18;
const GRAVITY = 26;
const MAX_FALL_SPEED = 30;
/** Hauteur du joueur (pieds -> sommet du crâne), pour les contacts. */
const PLAYER_HEIGHT = 1.8;
/** Tolérance verticale de contact (évite les faux positifs d'arrondi). */
const VERTICAL_CONTACT_TOLERANCE = 0.05;
/** Écart vertical maximal pour qu'une créature hostile poursuive le joueur. */
const MAX_CHASE_HEIGHT = 6;

interface MobHealthBar {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  sprite: THREE.Sprite;
}

interface Mob {
  type: MobType;
  root: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  pos: THREE.Vector3; // feet center
  vel: THREE.Vector3;
  wanderYaw: number; // desired heading
  facing: number; // current visual yaw
  wanderTimer: number;
  idle: boolean;
  grounded: boolean;
  walkPhase: number;
  turnCooldown: number;
  stuckTime: number;
  health: number;
  maxHealth: number;
  attackCooldown: number;
  bar: MobHealthBar;
}

function angleDelta(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/**
 * Vrai si les volumes verticaux du mob (pieds -> sommet) et du joueur se
 * chevauchent : condition nécessaire pour qu'un coup porte.
 */
export function mobTouchesPlayer(mobFeetY: number, mobHeight: number, playerFeetY: number): boolean {
  const gap = Math.max(
    mobFeetY - (playerFeetY + PLAYER_HEIGHT),
    playerFeetY - (mobFeetY + mobHeight)
  );
  return gap < VERTICAL_CONTACT_TOLERANCE;
}

/** Vrai si l'écart vertical permet encore à un mob hostile de poursuivre. */
export function isWithinChaseHeight(dy: number): boolean {
  return Math.abs(dy) <= MAX_CHASE_HEIGHT;
}

export class MobManager {
  private mobs: Mob[] = [];
  private group: THREE.Group;
  private unitBox = new THREE.BoxGeometry(1, 1, 1);
  private materialCache = new Map<string, THREE.MeshStandardMaterial>();

  private isDay = true;
  private spawnTimer = 1.5;
  private maxPassive = 8;
  private maxHostile = 10;
  private despawnDistance = 62;
  private onPlayerHit?: (damage: number, source: string) => void;

  constructor(
    private scene: THREE.Scene,
    private world: VoxelWorld,
    private castShadow: boolean
  ) {
    this.group = new THREE.Group();
    this.group.name = 'mobs';
    this.scene.add(this.group);
  }

  /** Remove every mob and spawn a fresh batch suited to the current phase. */
  public reset(near: THREE.Vector3) {
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      this.removeMob(i);
    }
    this.spawnTimer = 0.8;
    for (let i = 0; i < 6; i++) {
      if (!this.spawnOne(near)) break;
    }
  }

  public getSummary(): string {
    const counts: Record<MobType, number> = { pig: 0, cow: 0, zombie: 0, skeleton: 0 };
    for (const mob of this.mobs) counts[mob.type]++;
    return (Object.keys(counts) as MobType[])
      .filter((t) => counts[t] > 0)
      .map((t) => `${MOB_STATS[t].emoji} ${counts[t]}`)
      .join('  ');
  }

  public getCount(): number {
    return this.mobs.length;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isDay: boolean,
    onPlayerHit?: (damage: number, source: string) => void
  ) {
    this.onPlayerHit = onPlayerHit;

    // Day <-> night transition: swap the whole population.
    if (isDay !== this.isDay) {
      this.isDay = isDay;
      this.reset(playerPos);
    }

    const dt = Math.min(delta, 0.05);

    // Ambient spawning up to the phase cap.
    const cap = this.isDay ? this.maxPassive : this.maxHostile;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.mobs.length < cap) {
      this.spawnOne(playerPos);
      this.spawnTimer = 1.6 + Math.random() * 2.4;
    }

    // Drop mobs that wandered too far from the player.
    const maxDistSq = this.despawnDistance * this.despawnDistance;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      if (this.mobs[i].pos.distanceToSquared(playerPos) > maxDistSq) {
        this.removeMob(i);
      }
    }

    for (let i = this.mobs.length - 1; i >= 0; i--) {
      if (!this.updateMob(this.mobs[i], dt, playerPos)) {
        this.removeMob(i);
      }
    }
  }

  public dispose() {
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      this.removeMob(i);
    }
    this.scene.remove(this.group);
    this.unitBox.dispose();
    for (const mat of this.materialCache.values()) mat.dispose();
    this.materialCache.clear();
  }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

  private updateMob(mob: Mob, dt: number, playerPos: THREE.Vector3): boolean {
    const stats = MOB_STATS[mob.type];

    // If a block was placed inside the mob, lift it out; give up if truly buried.
    if (this.collidesAt(mob.pos.x, mob.pos.y, mob.pos.z, stats.radius, stats.height)) {
      let lifted = false;
      for (let step = 1; step <= 3; step++) {
        if (!this.collidesAt(mob.pos.x, mob.pos.y + step, mob.pos.z, stats.radius, stats.height)) {
          mob.pos.y += step;
          mob.vel.y = 0;
          lifted = true;
          break;
        }
      }
      mob.stuckTime = lifted ? 0 : mob.stuckTime + dt;
      if (mob.stuckTime > 1.5) return false;
    } else {
      mob.stuckTime = 0;
    }

    // Random wandering decisions.
    mob.wanderTimer -= dt;
    mob.turnCooldown = Math.max(0, mob.turnCooldown - dt);
    if (mob.wanderTimer <= 0) {
      this.decide(mob);
    }

    // Don't walk into water or off a cliff.
    if (!mob.idle && mob.turnCooldown === 0 && !this.isPathSafe(mob)) {
      mob.wanderYaw += Math.PI * (0.6 + Math.random() * 0.8);
      mob.turnCooldown = 0.6;
      mob.wanderTimer = Math.max(mob.wanderTimer, 0.9);
    }

    // Desired horizontal velocity from heading + local avoidance.
    const toPlayerX = playerPos.x - mob.pos.x;
    const toPlayerZ = playerPos.z - mob.pos.z;
    const distToPlayerSq = toPlayerX * toPlayerX + toPlayerZ * toPlayerZ;
    const dy = playerPos.y - mob.pos.y;

    // Les corps doivent se chevaucher verticalement pour qu'il y ait contact :
    // un joueur en l'air (vol, pilier, corniche) reste hors de portée.
    const inVerticalContact = mobTouchesPlayer(mob.pos.y, stats.height, playerPos.y);

    // Hostile mobs hunt the player and strike when close.
    let chasing = false;
    if (stats.hostile && distToPlayerSq < 14 * 14 && isWithinChaseHeight(dy)) {
      chasing = true;
      mob.idle = false;
      mob.wanderTimer = Math.max(mob.wanderTimer, 0.5);
      if (distToPlayerSq > 1.7 * 1.7) {
        mob.wanderYaw = Math.atan2(-toPlayerX, -toPlayerZ);
      }
    }

    mob.attackCooldown = Math.max(0, mob.attackCooldown - dt);
    if (chasing && inVerticalContact && distToPlayerSq < 2.1 * 2.1 && mob.attackCooldown === 0) {
      mob.attackCooldown = 1.2;
      this.onPlayerHit?.(stats.damage, stats.name);
    }

    const speed =
      mob.idle || (chasing && distToPlayerSq < 1.7 * 1.7) ? 0 : stats.speed * (chasing ? 1.35 : 1);
    let targetX = -Math.sin(mob.wanderYaw) * speed;
    let targetZ = -Math.cos(mob.wanderYaw) * speed;

    // Keep a little distance from the player (passive mobs only).
    const pdx = mob.pos.x - playerPos.x;
    const pdz = mob.pos.z - playerPos.z;
    const pdSq = pdx * pdx + pdz * pdz;
    if (!stats.hostile && pdSq > 1e-4 && pdSq < 2.25) {
      const f = 1.6 / Math.sqrt(pdSq);
      targetX += pdx * f;
      targetZ += pdz * f;
    }

    // Keep a little distance from other mobs.
    for (const other of this.mobs) {
      if (other === mob) continue;
      const dx = mob.pos.x - other.pos.x;
      const dz = mob.pos.z - other.pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq > 1e-4 && dSq < 0.9) {
        const f = 0.9 / Math.sqrt(dSq);
        targetX += dx * f;
        targetZ += dz * f;
      }
    }

    const lerp = Math.min(1, 9 * dt);
    mob.vel.x += (targetX - mob.vel.x) * lerp;
    mob.vel.z += (targetZ - mob.vel.z) * lerp;

    // Gravity.
    mob.vel.y = Math.max(mob.vel.y - GRAVITY * dt, -MAX_FALL_SPEED);

    // Vertical movement with collision.
    if (mob.vel.y !== 0) {
      const newY = mob.pos.y + mob.vel.y * dt;
      if (this.collidesAt(mob.pos.x, newY, mob.pos.z, stats.radius, stats.height)) {
        if (mob.vel.y < 0) {
          mob.pos.y = Math.ceil(newY - 1e-4);
          mob.grounded = true;
        } else {
          mob.pos.y = Math.ceil(mob.pos.y + stats.height) - stats.height - 0.001;
        }
        mob.vel.y = 0;
      } else {
        mob.pos.y = newY;
        mob.grounded = false;
      }
    }

    // Horizontal movement: slide along walls, step up one block, else turn.
    const dx = mob.vel.x * dt;
    const dz = mob.vel.z * dt;
    if (Math.abs(dx) > 1e-5 || Math.abs(dz) > 1e-5) {
      const nx = mob.pos.x + dx;
      const nz = mob.pos.z + dz;
      const r = stats.radius;
      const h = stats.height;

      if (!this.collidesAt(nx, mob.pos.y, nz, r, h)) {
        mob.pos.x = nx;
        mob.pos.z = nz;
      } else if (mob.grounded && !this.collidesAt(nx, mob.pos.y + 1, nz, r, h)) {
        // Step up a single block (Minecraft-style).
        mob.pos.y += 1;
        mob.pos.x = nx;
        mob.pos.z = nz;
      } else {
        let slid = false;
        if (Math.abs(dx) > 1e-5 && !this.collidesAt(mob.pos.x + dx, mob.pos.y, mob.pos.z, r, h)) {
          mob.pos.x += dx;
          slid = true;
        }
        if (Math.abs(dz) > 1e-5 && !this.collidesAt(mob.pos.x, mob.pos.y, mob.pos.z + dz, r, h)) {
          mob.pos.z += dz;
          slid = true;
        }

        if (!slid) {
          mob.vel.x = 0;
          mob.vel.z = 0;
          // Collision reaction: turn away and pick a new heading.
          if (mob.turnCooldown === 0) {
            mob.wanderYaw += Math.PI * (0.65 + Math.random() * 0.7);
            mob.turnCooldown = 0.45;
            mob.wanderTimer = Math.max(mob.wanderTimer, 0.9);
            mob.idle = false;
          }
        }
      }
    }

    if (mob.vel.y === 0) {
      mob.grounded = this.collidesAt(
        mob.pos.x,
        mob.pos.y - 0.06,
        mob.pos.z,
        stats.radius,
        stats.height
      );
    }

    // Animation & transforms.
    const hSpeed = Math.sqrt(mob.vel.x * mob.vel.x + mob.vel.z * mob.vel.z);
    const moving = hSpeed > 0.25;
    if (moving) {
      const heading = Math.atan2(-mob.vel.x, -mob.vel.z);
      mob.facing += angleDelta(mob.facing, heading) * Math.min(1, 10 * dt);
      mob.walkPhase += hSpeed * dt * 4.2;
    } else {
      mob.walkPhase += dt * 1.5;
      mob.facing += angleDelta(mob.facing, mob.wanderYaw) * Math.min(1, 3 * dt);
    }

    for (let i = 0; i < mob.legs.length; i++) {
      const offset = (i % 2 === 0 ? 0 : Math.PI) + (i >= 2 ? Math.PI : 0);
      const target = moving ? Math.sin(mob.walkPhase + offset) * 0.55 : 0;
      mob.legs[i].rotation.x += (target - mob.legs[i].rotation.x) * Math.min(1, 14 * dt);
    }
    for (const arm of mob.arms) {
      arm.rotation.x = ARM_ANGLE + (moving ? Math.sin(mob.walkPhase * 0.5) * 0.08 : 0);
    }

    const bob = moving ? Math.abs(Math.sin(mob.walkPhase)) * 0.03 : 0;
    mob.root.position.set(mob.pos.x, mob.pos.y + bob, mob.pos.z);
    mob.root.rotation.y = mob.facing;
    return true;
  }

  private decide(mob: Mob) {
    if (Math.random() < 0.35) {
      mob.idle = true;
      mob.wanderTimer = 1.5 + Math.random() * 3.0;
    } else {
      mob.idle = false;
      mob.wanderYaw = Math.random() * TAU;
      mob.wanderTimer = 1.8 + Math.random() * 3.5;
    }
  }

  /** Look ahead for water or a drop bigger than 3 blocks. */
  private isPathSafe(mob: Mob): boolean {
    const look = 0.75;
    const x = Math.floor(mob.pos.x - Math.sin(mob.wanderYaw) * look);
    const z = Math.floor(mob.pos.z - Math.cos(mob.wanderYaw) * look);
    const feetY = Math.floor(mob.pos.y + 0.1);

    if (this.world.getBlock(x, feetY, z) === 'water') return false;

    for (let d = 1; d <= 3; d++) {
      if (this.isSolidBlock(this.world.getBlock(x, feetY - d, z))) return true;
    }
    return false;
  }

  private collidesAt(x: number, y: number, z: number, radius: number, height: number): boolean {
    const x0 = Math.floor(x - radius);
    const x1 = Math.floor(x + radius);
    const y0 = Math.floor(y);
    const y1 = Math.floor(y + height);
    const z0 = Math.floor(z - radius);
    const z1 = Math.floor(z + radius);

    for (let bx = x0; bx <= x1; bx++) {
      for (let by = y0; by <= y1; by++) {
        for (let bz = z0; bz <= z1; bz++) {
          if (this.isSolidBlock(this.world.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  private isSolidBlock(block: BlockType): boolean {
    return block !== 'air' && block !== 'water' && !!BLOCK_REGISTRY[block]?.solid;
  }

  // ---------------------------------------------------------------------------
  // Spawning
  // ---------------------------------------------------------------------------

  private spawnOne(center: THREE.Vector3): boolean {
    const pool: MobType[] = this.isDay ? ['pig', 'cow'] : ['zombie', 'skeleton'];
    const type = pool[Math.floor(Math.random() * pool.length)];
    const spot = this.findSpawnSpot(center, this.isDay ? 5 : 8, this.isDay ? 24 : 30);
    if (!spot) return false;
    this.addMob(type, spot.x, spot.y, spot.z);
    return true;
  }

  private findSpawnSpot(
    center: THREE.Vector3,
    minRadius: number,
    maxRadius: number
  ): { x: number; y: number; z: number } | null {
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * TAU;
      const dist = minRadius + Math.random() * (maxRadius - minRadius);
      const x = Math.floor(center.x + Math.cos(angle) * dist);
      const z = Math.floor(center.z + Math.sin(angle) * dist);

      for (let y = this.world.maxY - 3; y >= this.world.minY + 1; y--) {
        const block = this.world.getBlock(x, y, z);
        if (!this.isSolidBlock(block)) continue;
        // Trees and water columns are not valid ground for spawning.
        if (block === 'leaves' || block === 'wood' || block === 'water') break;

        const feet = y + 1;
        if (
          this.world.getBlock(x, feet, z) === 'air' &&
          this.world.getBlock(x, feet + 1, z) === 'air'
        ) {
          return { x: x + 0.5, y: feet, z: z + 0.5 };
        }
        break;
      }
    }
    return null;
  }

  private addMob(type: MobType, x: number, y: number, z: number) {
    const root = new THREE.Group();
    const legs: THREE.Group[] = [];
    const arms: THREE.Group[] = [];
    this.buildModel(type, root, legs, arms);

    const stats = MOB_STATS[type];
    const bar = this.createHealthBar(stats.height);

    const mob: Mob = {
      type,
      root,
      legs,
      arms,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(),
      wanderYaw: Math.random() * TAU,
      facing: Math.random() * TAU,
      wanderTimer: 0.5 + Math.random() * 2,
      idle: false,
      grounded: false,
      walkPhase: Math.random() * TAU,
      turnCooldown: 0,
      stuckTime: 0,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      attackCooldown: 0.6,
      bar,
    };

    root.position.copy(mob.pos);
    root.rotation.y = mob.facing;
    root.add(bar.sprite);
    this.updateHealthBar(mob);

    this.group.add(root);
    this.mobs.push(mob);
  }

  private createHealthBar(mobHeight: number): MobHealthBar {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 10;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    sprite.scale.set(0.95, 0.15, 1);
    sprite.position.set(0, mobHeight + 0.4, 0);
    sprite.renderOrder = 999;

    return { canvas, ctx, texture, sprite };
  }

  private updateHealthBar(mob: Mob) {
    const { ctx, canvas, texture } = mob.bar;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(1, 1, canvas.width - 2, canvas.height - 2);

    const ratio = Math.max(0, Math.min(1, mob.health / mob.maxHealth));
    ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ef4444';
    ctx.fillRect(1, 1, Math.round((canvas.width - 2) * ratio), canvas.height - 2);
    texture.needsUpdate = true;
  }

  /** Teste un rayon (attaque au clic gauche) contre les mobs. */
  public hitTest(
    raycaster: THREE.Raycaster,
    reach: number,
    damage: number
  ): { hit: boolean; killed: boolean; name: string; position: THREE.Vector3 | null } {
    const roots = this.mobs.map((m) => m.root);
    const hits = raycaster.intersectObjects(roots, true);

    for (const hit of hits) {
      if (hit.distance > reach) continue;
      const mob = this.mobFromObject(hit.object);
      if (!mob) continue;

      mob.health -= damage;
      this.updateHealthBar(mob);

      // Petit recul
      const dir = new THREE.Vector3(hit.point.x - mob.pos.x, 0, hit.point.z - mob.pos.z);
      if (dir.lengthSq() > 0.0001) dir.normalize();
      mob.vel.x -= dir.x * 3.5;
      mob.vel.z -= dir.z * 3.5;
      mob.vel.y = 2.5;

      const name = MOB_STATS[mob.type].name;
      if (mob.health <= 0) {
        const pos = mob.pos.clone();
        const index = this.mobs.indexOf(mob);
        if (index >= 0) this.removeMob(index);
        return { hit: true, killed: true, name, position: pos };
      }
      return { hit: true, killed: false, name, position: mob.pos.clone() };
    }

    return { hit: false, killed: false, name: '', position: null };
  }

  private mobFromObject(object: THREE.Object3D): Mob | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      const mob = this.mobs.find((m) => m.root === current);
      if (mob) return mob;
      current = current.parent;
    }
    return null;
  }

  private removeMob(index: number) {
    const mob = this.mobs[index];
    if (!mob) return;
    this.group.remove(mob.root);
    mob.bar.texture.dispose();
    (mob.bar.sprite.material as THREE.SpriteMaterial).dispose();
    this.mobs.splice(index, 1);
  }

  // ---------------------------------------------------------------------------
  // Voxel models (feet at y = 0, looking toward -Z)
  // ---------------------------------------------------------------------------

  private material(color: string): THREE.MeshStandardMaterial {
    let mat = this.materialCache.get(color);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 });
      this.materialCache.set(color, mat);
    }
    return mat;
  }

  private part(
    parent: THREE.Object3D,
    color: string,
    size: [number, number, number],
    pos: [number, number, number]
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.unitBox, this.material(color));
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = this.castShadow;
    parent.add(mesh);
    return mesh;
  }

  private limb(
    parent: THREE.Object3D,
    color: string,
    size: [number, number, number],
    x: number,
    pivotY: number,
    z: number,
    extended = false
  ): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.set(x, pivotY, z);
    if (extended) pivot.rotation.x = ARM_ANGLE;
    this.part(pivot, color, size, [0, -size[1] / 2, 0]);
    parent.add(pivot);
    return pivot;
  }

  private buildModel(
    type: MobType,
    root: THREE.Group,
    legs: THREE.Group[],
    arms: THREE.Group[]
  ) {
    switch (type) {
      case 'pig': {
        this.part(root, '#f2a3a8', [0.85, 0.55, 0.62], [0, 0.8, 0]);
        this.part(root, '#f7b6ba', [0.48, 0.48, 0.44], [0, 0.92, -0.5]);
        this.part(root, '#d97f86', [0.24, 0.18, 0.12], [0, 0.86, -0.78]);
        this.part(root, '#e08d93', [0.14, 0.16, 0.08], [-0.17, 1.18, -0.44]);
        this.part(root, '#e08d93', [0.14, 0.16, 0.08], [0.17, 1.18, -0.44]);
        this.part(root, '#141414', [0.09, 0.1, 0.03], [-0.15, 0.98, -0.725]);
        this.part(root, '#141414', [0.09, 0.1, 0.03], [0.15, 0.98, -0.725]);
        this.part(root, '#e08d93', [0.08, 0.08, 0.16], [0, 0.98, 0.36]);
        legs.push(
          this.limb(root, '#e89197', [0.2, 0.5, 0.2], -0.3, 0.5, -0.22),
          this.limb(root, '#e89197', [0.2, 0.5, 0.2], 0.3, 0.5, -0.22),
          this.limb(root, '#e89197', [0.2, 0.5, 0.2], -0.3, 0.5, 0.22),
          this.limb(root, '#e89197', [0.2, 0.5, 0.2], 0.3, 0.5, 0.22)
        );
        break;
      }
      case 'cow': {
        this.part(root, '#f2f0ea', [1.0, 0.6, 0.66], [0, 0.88, 0]);
        this.part(root, '#2b2b2b', [1.02, 0.24, 0.68], [0, 0.98, 0.06]);
        this.part(root, '#2b2b2b', [1.02, 0.2, 0.52], [0, 0.74, -0.16]);
        this.part(root, '#3a3a3a', [0.5, 0.46, 0.44], [0, 1.06, -0.55]);
        this.part(root, '#e0b0b0', [0.3, 0.2, 0.12], [0, 1.0, -0.8]);
        this.part(root, '#e8e0c8', [0.09, 0.24, 0.09], [-0.2, 1.34, -0.5]);
        this.part(root, '#e8e0c8', [0.09, 0.24, 0.09], [0.2, 1.34, -0.5]);
        this.part(root, '#141414', [0.09, 0.1, 0.03], [-0.16, 1.12, -0.78]);
        this.part(root, '#141414', [0.09, 0.1, 0.03], [0.16, 1.12, -0.78]);
        legs.push(
          this.limb(root, '#e8e8e2', [0.22, 0.58, 0.22], -0.32, 0.58, -0.22),
          this.limb(root, '#e8e8e2', [0.22, 0.58, 0.22], 0.32, 0.58, -0.22),
          this.limb(root, '#e8e8e2', [0.22, 0.58, 0.22], -0.32, 0.58, 0.22),
          this.limb(root, '#e8e8e2', [0.22, 0.58, 0.22], 0.32, 0.58, 0.22)
        );
        break;
      }
      case 'zombie': {
        this.part(root, '#2f7d7d', [0.5, 0.7, 0.3], [0, 1.2, 0]);
        this.part(root, '#5d8a4a', [0.44, 0.44, 0.44], [0, 1.76, 0]);
        this.part(root, '#141414', [0.1, 0.1, 0.03], [-0.11, 1.82, -0.225]);
        this.part(root, '#141414', [0.1, 0.1, 0.03], [0.11, 1.82, -0.225]);
        this.part(root, '#2a5f5f', [0.52, 0.16, 0.32], [0, 1.5, 0]);
        legs.push(
          this.limb(root, '#2b3a6b', [0.22, 0.85, 0.22], -0.13, 0.85, 0),
          this.limb(root, '#2b3a6b', [0.22, 0.85, 0.22], 0.13, 0.85, 0)
        );
        arms.push(
          this.limb(root, '#5d8a4a', [0.17, 0.62, 0.17], -0.34, 1.48, 0, true),
          this.limb(root, '#5d8a4a', [0.17, 0.62, 0.17], 0.34, 1.48, 0, true)
        );
        break;
      }
      case 'skeleton': {
        this.part(root, '#e6e6dc', [0.42, 0.7, 0.24], [0, 1.15, 0]);
        this.part(root, '#9a9a8e', [0.36, 0.05, 0.03], [0, 1.08, -0.13]);
        this.part(root, '#9a9a8e', [0.36, 0.05, 0.03], [0, 1.22, -0.13]);
        this.part(root, '#9a9a8e', [0.36, 0.05, 0.03], [0, 1.36, -0.13]);
        this.part(root, '#e6e6dc', [0.44, 0.42, 0.42], [0, 1.7, 0]);
        this.part(root, '#141414', [0.1, 0.1, 0.03], [-0.11, 1.76, -0.215]);
        this.part(root, '#141414', [0.1, 0.1, 0.03], [0.11, 1.76, -0.215]);
        legs.push(
          this.limb(root, '#e6e6dc', [0.13, 0.8, 0.13], -0.11, 0.8, 0),
          this.limb(root, '#e6e6dc', [0.13, 0.8, 0.13], 0.11, 0.8, 0)
        );
        arms.push(
          this.limb(root, '#e6e6dc', [0.11, 0.58, 0.11], -0.29, 1.43, 0, true),
          this.limb(root, '#e6e6dc', [0.11, 0.58, 0.11], 0.29, 1.43, 0, true)
        );
        break;
      }
    }
  }
}
