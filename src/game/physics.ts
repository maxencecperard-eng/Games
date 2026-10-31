import * as THREE from 'three';
import { VoxelWorld } from './world';
import { BLOCK_REGISTRY, BlockType } from './types';
import { soundEngine } from './audio';

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sneak: boolean;
  fly: boolean;
}

export class PlayerPhysics {
  public position: THREE.Vector3 = new THREE.Vector3(0, 16, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public yaw: number = 0; // horizontal angle
  public pitch: number = 0; // vertical angle (-Math.PI/2 to Math.PI/2)

  public isGrounded: boolean = false;
  public isFlying: boolean = false;
  public isSneaking: boolean = false;
  public mode: 'creative' | 'survival' = 'creative';

  public playerHeight = 1.8;
  public eyeHeight = 1.62;
  public playerRadius = 0.3; // 0.6 total width

  private stepTimer = 0;
  private lastJumpTap = 0;

  constructor(private world: VoxelWorld) {
    this.findSpawnPosition();
  }

  public findSpawnPosition() {
    // Search spiral around (0, 0) for solid surface ground above sea level
    for (let r = 0; r <= 24; r += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        for (let dz = -r; dz <= r; dz += 2) {
          const sx = dx;
          const sz = dz;
          for (let y = this.world.maxY - 1; y >= this.world.seaLevel; y--) {
            const b = this.world.getBlock(sx, y, sz);
            if (b !== 'air' && b !== 'water' && BLOCK_REGISTRY[b]?.solid) {
              this.position.set(sx + 0.5, y + 1.0, sz + 0.5);
              this.velocity.set(0, 0, 0);
              return;
            }
          }
        }
      }
    }
    this.position.set(0.5, this.world.seaLevel + 8, 0.5);
  }

  public toggleFly() {
    this.isFlying = !this.isFlying;
    this.velocity.y = 0;
  }

  public handleJumpTap() {
    const now = performance.now();
    if (now - this.lastJumpTap < 300) {
      // Double tap space toggles flying mode
      this.toggleFly();
    }
    this.lastJumpTap = now;
  }

  public update(delta: number, input: PlayerInput) {
    // Clamp delta to prevent tunneling through blocks on lag spikes
    const dt = Math.min(delta, 0.05);

    // Speed configuration
    const walkSpeed = this.isSneaking ? 3.0 : 6.0;
    const flySpeed = 12.0;
    const currentSpeed = this.isFlying ? flySpeed : walkSpeed;

    // Calculate forward & right movement vectors relative to yaw
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let moveX = 0;
    let moveZ = 0;

    if (input.forward) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (input.backward) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (input.left) {
      moveX -= rightX;
      moveZ -= rightZ;
    }
    if (input.right) {
      moveX += rightX;
      moveZ += rightZ;
    }

    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLen > 0.001) {
      moveX = (moveX / moveLen) * currentSpeed;
      moveZ = (moveZ / moveLen) * currentSpeed;
    }

    // Horizontal acceleration & damping
    const accelRate = this.isGrounded ? 15.0 : 6.0;
    this.velocity.x += (moveX - this.velocity.x) * Math.min(1, accelRate * dt);
    this.velocity.z += (moveZ - this.velocity.z) * Math.min(1, accelRate * dt);

    // Vertical Movement & Gravity
    if (this.isFlying) {
      let flyY = 0;
      if (input.jump) flyY += flySpeed;
      if (input.sneak) flyY -= flySpeed;
      this.velocity.y += (flyY - this.velocity.y) * Math.min(1, 10.0 * dt);
    } else {
      // Survival gravity
      const gravity = -24.0;
      this.velocity.y += gravity * dt;

      // Jump
      if (input.jump && this.isGrounded) {
        this.velocity.y = 8.2;
        this.isGrounded = false;
        soundEngine.playJump();
      }
    }

    // Move player with voxel AABB collision
    this.moveWithCollision(dt);

    // Footstep sounds when moving on ground
    const hSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (this.isGrounded && hSpeed > 1.0) {
      this.stepTimer += dt * (hSpeed / 4.0);
      if (this.stepTimer > 0.4) {
        this.stepTimer = 0;
        const blockBelow = this.world.getBlock(
          Math.floor(this.position.x),
          Math.floor(this.position.y - 0.1),
          Math.floor(this.position.z)
        );
        const st = BLOCK_REGISTRY[blockBelow]?.soundType || 'grass';
        if (st !== 'glass') {
          soundEngine.playFootstep(st);
        }
      }
    } else {
      this.stepTimer = 0.3;
    }
  }

  // Check if an AABB intersects any solid voxel in the world
  private isColliding(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): boolean {
    const x0 = Math.floor(minX);
    const x1 = Math.floor(maxX);
    const y0 = Math.floor(minY);
    const y1 = Math.floor(maxY);
    const z0 = Math.floor(minZ);
    const z1 = Math.floor(maxZ);

    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          const block = this.world.getBlock(x, y, z);
          if (block !== 'air' && block !== 'water' && BLOCK_REGISTRY[block].solid) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private moveWithCollision(dt: number) {
    const r = this.playerRadius;
    const h = this.playerHeight;

    // 1. Y Axis collision (floor & ceiling)
    const newY = this.position.y + this.velocity.y * dt;
    if (this.velocity.y !== 0) {
      const minY = this.velocity.y > 0 ? this.position.y : newY;
      const maxY = this.velocity.y > 0 ? newY + h : this.position.y + h;

      if (this.isColliding(this.position.x - r, newY, this.position.z - r, this.position.x + r, newY + h, this.position.z + r)) {
        if (this.velocity.y < 0) {
          // Hit floor: snap to block top
          this.position.y = Math.floor(this.position.y);
          this.isGrounded = true;
        } else {
          // Hit ceiling
          this.position.y = Math.ceil(this.position.y + h) - h - 0.001;
        }
        this.velocity.y = 0;
      } else {
        this.position.y = newY;
        this.isGrounded = false;
      }
    }

    // 2. X Axis collision
    const newX = this.position.x + this.velocity.x * dt;
    if (!this.isColliding(newX - r, this.position.y, this.position.z - r, newX + r, this.position.y + h, this.position.z + r)) {
      this.position.x = newX;
    } else {
      this.velocity.x = 0;
    }

    // 3. Z Axis collision
    const newZ = this.position.z + this.velocity.z * dt;
    if (!this.isColliding(this.position.x - r, this.position.y, newZ - r, this.position.x + r, this.position.y + h, newZ + r)) {
      this.position.z = newZ;
    } else {
      this.velocity.z = 0;
    }

    // Check grounded state if not falling
    if (this.velocity.y === 0) {
      this.isGrounded = this.isColliding(
        this.position.x - r,
        this.position.y - 0.05,
        this.position.z - r,
        this.position.x + r,
        this.position.y,
        this.position.z + r
      );
    }
  }

  public getEyePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
  }

  public getLookDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    dir.x = -Math.sin(this.yaw) * Math.cos(this.pitch);
    dir.y = Math.sin(this.pitch);
    dir.z = -Math.cos(this.yaw) * Math.cos(this.pitch);
    return dir.normalize();
  }
}
