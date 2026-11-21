import {
  Color,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Scene,
  Vector3
} from 'three';
import { randomRange } from '../core/math';

interface Particle {
  index: number;
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  life: number;
  maxLife: number;
  size: number;
  spin: number;
  angle: number;
  drag: number;
}

const CAPACITY = 240;

export class Particles {
  private readonly mesh: InstancedMesh;
  private readonly particles: Particle[] = [];
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly quaternion = new Quaternion();
  private readonly scale = new Vector3();
  private readonly color = new Color();
  private readonly spinAxis = new Vector3(0.4, 1, 0.2).normalize();
  private cursor = 0;

  constructor(scene: Scene) {
    const geometry = new IcosahedronGeometry(0.5, 0);
    const material = new MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new InstancedMesh(geometry, material, CAPACITY);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < CAPACITY; i += 1) {
      this.particles.push({
        index: i,
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        life: 0,
        maxLife: 1,
        size: 0.1,
        spin: 0,
        angle: 0,
        drag: 0
      });
      this.matrix.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this.matrix);
      this.mesh.setColorAt(i, this.color.set(0xffffff));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    scene.add(this.mesh);
  }

  burst(
    x: number,
    y: number,
    z: number,
    colors: number[],
    count: number,
    power: number,
    size: number,
    upward = 0.65
  ): void {
    for (let i = 0; i < count; i += 1) {
      const particle = this.next();
      const angle = Math.random() * Math.PI * 2;
      const speed = power * randomRange(Math.random, 0.35, 1);
      particle.active = true;
      particle.x = x + randomRange(Math.random, -size, size);
      particle.y = y + randomRange(Math.random, 0, size * 2);
      particle.z = z + randomRange(Math.random, -size, size);
      particle.vx = Math.cos(angle) * speed;
      particle.vz = Math.sin(angle) * speed;
      particle.vy = speed * upward + randomRange(Math.random, 0.2, 1.1);
      particle.gravity = 9.8;
      particle.life = 0;
      particle.maxLife = randomRange(Math.random, 0.32, 0.7);
      particle.size = size * randomRange(Math.random, 0.55, 1.35);
      particle.spin = randomRange(Math.random, -9, 9);
      particle.angle = Math.random() * Math.PI * 2;
      particle.drag = 1.6;
      this.mesh.setColorAt(
        particle.index,
        this.color.set(colors[Math.floor(Math.random() * colors.length)])
      );
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private next(): Particle {
    for (let i = 0; i < CAPACITY; i += 1) {
      const index = (this.cursor + i) % CAPACITY;
      if (!this.particles[index].active) {
        this.cursor = (index + 1) % CAPACITY;
        return this.particles[index];
      }
    }
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % CAPACITY;
    return this.particles[index];
  }

  update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < CAPACITY; i += 1) {
      const particle = this.particles[i];
      if (!particle.active) continue;
      dirty = true;
      particle.life += dt;
      if (particle.life >= particle.maxLife) {
        particle.active = false;
        this.matrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.matrix);
        continue;
      }
      const drag = Math.exp(-particle.drag * dt);
      particle.vx *= drag;
      particle.vz *= drag;
      particle.vy -= particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      if (particle.y < 0.04) {
        particle.y = 0.04;
        particle.vy *= -0.28;
        particle.vx *= 0.7;
        particle.vz *= 0.7;
      }
      particle.angle += particle.spin * dt;
      const progress = particle.life / particle.maxLife;
      const scale = particle.size * (1 - progress * progress);
      this.position.set(particle.x, particle.y, particle.z);
      this.quaternion.setFromAxisAngle(this.spinAxis, particle.angle);
      this.scale.setScalar(Math.max(0.0001, scale));
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
