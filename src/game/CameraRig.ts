import { Camera, PerspectiveCamera, Vector3 } from 'three';
import { clamp, damp, lerp } from '../core/math';
import type { Player } from '../entities/Player';

const PITCH = (52 * Math.PI) / 180;

export class CameraRig {
  readonly camera: PerspectiveCamera;
  private readonly focus = new Vector3();
  private readonly desiredFocus = new Vector3();
  private readonly offset = new Vector3();
  private smoothedDistance = 14;
  private menuAngle = 0.7;
  private shakeAmount = 0;
  private zoomPulse = 0;
  private elapsed = 0;
  private cinematicTarget = new Vector3();

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(56, aspect, 1, 2600);
    this.camera.position.set(0, 12, 8);
    this.snapMenu();
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  shake(amount: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  pulseZoom(amount = 1): void {
    this.zoomPulse = Math.max(this.zoomPulse, amount);
  }

  followPoseFor(player: Player): { position: Vector3; target: Vector3 } {
    const radius = player.currentRadius;
    const distance = 12 + Math.max(0, radius - 0.35) * 22;
    const target = new Vector3(player.position.x, player.position.y + radius * 1.05, player.position.z);
    const position = new Vector3(
      player.position.x,
      target.y + Math.sin(PITCH) * distance,
      player.position.z + Math.cos(PITCH) * distance
    );
    return { position, target };
  }

  snapToPlayer(player: Player): void {
    const pose = this.followPoseFor(player);
    this.camera.position.copy(pose.position);
    this.focus.copy(pose.target);
    this.desiredFocus.copy(pose.target);
    this.smoothedDistance = this.camera.position.distanceTo(pose.target);
    this.lookAtWithShake(pose.target, 0);
  }

  snapMenu(): void {
    this.menuAngle = 0.8;
    const position = new Vector3(
      Math.sin(this.menuAngle) * 24,
      12.5,
      Math.cos(this.menuAngle) * 24
    );
    this.camera.position.copy(position);
    this.camera.lookAt(0, 1.1, -1.4);
  }

  setCinematic(position: Vector3, target: Vector3): void {
    this.camera.position.copy(position);
    this.cinematicTarget.copy(target);
    this.camera.lookAt(target);
  }

  menu(dt: number): void {
    this.elapsed += dt;
    this.menuAngle += dt * 0.055;
    const radius = 24 + Math.sin(this.elapsed * 0.16) * 1.2;
    this.camera.position.set(
      Math.sin(this.menuAngle) * radius,
      12.2 + Math.sin(this.elapsed * 0.22) * 0.4,
      Math.cos(this.menuAngle) * radius
    );
    this.camera.lookAt(0, 1.05, -1.4);
  }

  follow(dt: number, player: Player): void {
    this.elapsed += dt;
    const radius = player.currentRadius;
    const distance = 12 + Math.max(0, radius - 0.35) * 22 + this.zoomPulse;
    this.desiredFocus.set(
      player.position.x,
      player.position.y + radius * 1.05,
      player.position.z
    );
    const followRate = radius > 8 ? 7.5 : 11;
    this.focus.x = damp(this.focus.x, this.desiredFocus.x, followRate, dt);
    this.focus.y = damp(this.focus.y, this.desiredFocus.y, followRate, dt);
    this.focus.z = damp(this.focus.z, this.desiredFocus.z, followRate, dt);
    this.smoothedDistance = damp(this.smoothedDistance, distance, 3.4, dt);
    this.zoomPulse = damp(this.zoomPulse, 0, 3, dt);
    this.offset.set(
      0,
      Math.sin(PITCH) * this.smoothedDistance,
      Math.cos(PITCH) * this.smoothedDistance
    );
    this.camera.position.copy(this.focus).add(this.offset);
    this.lookAtWithShake(this.focus, dt);
  }

  private lookAtWithShake(target: Vector3, dt: number): void {
    this.shakeAmount = damp(this.shakeAmount, 0, 9, dt);
    const shake = this.shakeAmount;
    const sx = Math.sin(this.elapsed * 89) * shake * 0.11;
    const sy = Math.cos(this.elapsed * 71) * shake * 0.08;
    this.camera.position.x += sx;
    this.camera.position.y += sy;
    this.camera.lookAt(target.x, target.y + sy * 0.1, target.z);
  }

  getAspect(): number {
    return this.camera.aspect;
  }
}
