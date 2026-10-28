import * as THREE from 'three';
import { BLOCK_REGISTRY, BlockType } from './types';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private instancedMesh: THREE.InstancedMesh;
  private maxParticles = 600;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    const geom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.instancedMesh = new THREE.InstancedMesh(geom, mat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.count = 0;
    this.instancedMesh.frustumCulled = false;
    scene.add(this.instancedMesh);
  }

  public emitBreak(x: number, y: number, z: number, blockType: BlockType) {
    const config = BLOCK_REGISTRY[blockType];
    const color = new THREE.Color(config?.color || '#888888');

    const count = 16;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const p: Particle = {
        pos: new THREE.Vector3(
          x + 0.2 + Math.random() * 0.6,
          y + 0.2 + Math.random() * 0.6,
          z + 0.2 + Math.random() * 0.6
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 5.0,
          Math.random() * 4.0 + 1.5,
          (Math.random() - 0.5) * 5.0
        ),
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
        // slight color variation per particle
        color: color.clone().offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1),
        size: 0.08 + Math.random() * 0.08,
      };
      this.particles.push(p);
    }
  }

  public emitExplosion(x: number, y: number, z: number) {
    const count = 80;
    const fireColors = [new THREE.Color('#ff4500'), new THREE.Color('#ffa500'), new THREE.Color('#ffff00'), new THREE.Color('#444444')];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const c = fireColors[Math.floor(Math.random() * fireColors.length)];
      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI;
      const speed = 4.0 + Math.random() * 10.0;

      const p: Particle = {
        pos: new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5),
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(pitch) * speed,
          Math.sin(pitch) * speed + 3,
          Math.sin(angle) * Math.cos(pitch) * speed
        ),
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        color: c.clone(),
        size: 0.15 + Math.random() * 0.2,
      };
      this.particles.push(p);
    }
  }

  public update(delta: number) {
    const dt = Math.min(delta, 0.05);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.vel.y -= 14.0 * dt; // Gravity
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += p.vel.z * dt;
      p.vel.x *= 0.95;
      p.vel.z *= 0.95;
    }

    // Update instances
    const count = this.particles.length;
    this.instancedMesh.count = count;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const scale = p.size * (1 - p.life / p.maxLife);
      this.dummy.position.copy(p.pos);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, p.color);
    }

    if (count > 0) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public dispose() {
    this.instancedMesh.geometry.dispose();
    if (Array.isArray(this.instancedMesh.material)) {
      this.instancedMesh.material.forEach((m) => m.dispose());
    } else {
      this.instancedMesh.material.dispose();
    }
  }
}
