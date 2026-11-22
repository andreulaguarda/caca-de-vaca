import {
  BufferAttribute,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3
} from 'three';
import { clamp, damp, easeOutBack, lerp } from '../core/math';
import { speedForRadius } from '../config/balance';
import {
  blushMaterial,
  eyeHighlightMaterial,
  eyeWhiteMaterial,
  mouthMaterial,
  outlineMaterial,
  propMaterial,
  pupilMaterial,
  shadowMaterial
} from '../render/materials';
import { cylinder, mergeParts, part } from '../render/geometry';

interface EyeRig {
  group: Group;
  pupil: Mesh;
  eye: Mesh;
}

function createPoopBodyGeometry(): LatheGeometry {
  const profile = [
    [0, 0],
    [0.62, 0.005],
    [0.94, 0.06],
    [1.025, 0.23],
    [1.035, 0.43],
    [0.985, 0.6],
    [0.89, 0.71],
    [0.82, 0.78],
    [0.8, 0.86],
    [0.86, 0.98],
    [0.875, 1.08],
    [0.82, 1.22],
    [0.73, 1.35],
    [0.65, 1.44],
    [0.64, 1.52],
    [0.68, 1.6],
    [0.66, 1.7],
    [0.585, 1.82],
    [0.47, 1.92],
    [0.33, 2.0],
    [0.19, 2.05],
    [0.075, 2.08],
    [0, 2.1]
  ].map(([radius, y]) => new Vector2(radius, y));
  const geometry = new LatheGeometry(profile, 32);
  const positions = geometry.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < positions.count; i += 1) {
    const y = positions.getY(i);
    if (y > 1.52) {
      const t = Math.min(1, (y - 1.52) / 0.58);
      const bend = t * t * 0.34;
      positions.setX(i, positions.getX(i) + bend);
      positions.setZ(i, positions.getZ(i) - bend * 0.12);
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.deleteAttribute('uv');
  const colors = new Float32Array(positions.count * 3);
  const low = new Color(0xc95f78);
  const mid = new Color(0xed8ca0);
  const high = new Color(0xffb6c3);
  const mixed = new Color();
  for (let i = 0; i < positions.count; i += 1) {
    const y = positions.getY(i);
    const t = Math.max(0, Math.min(1, y / 2.1));
    if (t < 0.58) {
      mixed.lerpColors(low, mid, t / 0.58);
    } else {
      mixed.lerpColors(mid, high, (t - 0.58) / 0.42);
    }
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

export class Player {
  readonly root = new Group();
  readonly visual = new Group();
  readonly bodyPivot = new Group();
  readonly facePivot = new Group();
  readonly shadow: Mesh;
  private readonly scene: Scene;
  private readonly body: Mesh;
  private readonly outline: Mesh;
  private readonly eyes: EyeRig[] = [];
  private readonly closedEyes: Mesh[] = [];
  private readonly mouth: Mesh;
  private readonly shadowMaterial: MeshBasicMaterial;
  private readonly velocity = new Vector2();
  private readonly knockback = new Vector2();
  private readonly inputSmoothed = new Vector2();
  private radius = 0.35;
  private hopClock = 0;
  private idleClock = 0;
  private elapsed = 0;
  private facing = 0;
  private moving = 0;
  private bounceCooldown = 0;
  private blinkTimer = 3;
  private blinkPhase = -1;
  private eyeOpenTarget = 1;
  private eyeOpenAmount = 1;
  private hopSoundCooldown = 0;
  private frozen = false;
  onHop?: (strength: number) => void;

  constructor(scene: Scene) {
    this.scene = scene;
    this.root.name = 'CacaPlayer';
    this.bodyPivot.name = 'BodyPivot';
    this.visual.add(this.bodyPivot);
    this.root.add(this.visual);

    const bodyGeometry = createPoopBodyGeometry();
    this.body = new Mesh(bodyGeometry, propMaterial);
    this.bodyPivot.add(this.body);
    this.outline = new Mesh(bodyGeometry, outlineMaterial);
    this.outline.scale.setScalar(1.028);
    this.bodyPivot.add(this.outline);

    this.facePivot.position.set(0, 1.12, 0.82);
    this.facePivot.rotation.x = -0.32;
    this.facePivot.scale.setScalar(1.05);
    this.bodyPivot.add(this.facePivot);

    const eyeWhiteGeometry = new SphereGeometry(0.33, 16, 12);
    const pupilGeometry = new SphereGeometry(0.098, 12, 10);
    const highlightGeometry = new SphereGeometry(0.034, 8, 6);
    for (const side of [-1, 1]) {
      const group = new Group();
      group.position.set(side * 0.335, 0.19, 0.105);
      const eye = new Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
      eye.scale.set(1.03, 1.3, 0.5);
      group.add(eye);
      const pupil = new Mesh(pupilGeometry, pupilMaterial);
      pupil.position.set(side * -0.012, 0.01, 0.15);
      pupil.scale.set(1.0, 1.32, 0.5);
      group.add(pupil);
      const highlight = new Mesh(highlightGeometry, eyeHighlightMaterial);
      highlight.position.set(side * 0.045, 0.065, 0.188);
      group.add(highlight);
      this.facePivot.add(group);
      this.eyes.push({ group, pupil, eye });
    }

    for (const side of [-1, 1]) {
      const brow = new Mesh(
        mergeParts([
          part(cylinder(0.026, 0.033, 0.2, 5), {
            color: 0x4a2232,
            pos: [0, 0, 0],
            rot: [0, 0, Math.PI / 2]
          })
        ]),
        propMaterial
      );
      brow.position.set(side * 0.35, 0.68, 0.075);
      brow.rotation.z = side * 0.2;
      this.facePivot.add(brow);
    }

    this.mouth = new Mesh(new TorusGeometry(0.19, 0.04, 5, 16, Math.PI), mouthMaterial);
    this.mouth.rotation.z = Math.PI;
    this.mouth.position.set(0, -0.06, 0.18);
    this.facePivot.add(this.mouth);

    const blushGeometry = new CircleGeometry(0.105, 14);
    for (const side of [-1, 1]) {
      const blush = new Mesh(blushGeometry, blushMaterial);
      blush.position.set(side * 0.65, -0.03, 0.15);
      blush.scale.set(1, 0.7, 1);
      this.facePivot.add(blush);
    }

    for (const side of [-1, 1]) {
      const line = new Mesh(
        new TorusGeometry(0.15, 0.026, 4, 10, Math.PI * 0.7),
        new MeshBasicMaterial({ color: 0x4a2232, side: DoubleSide })
      );
      line.rotation.z = side * -0.2 + Math.PI * 0.85;
      line.position.set(side * 0.335, 0.19, 0.195);
      line.visible = false;
      this.facePivot.add(line);
      this.closedEyes.push(line);
    }

    this.shadowMaterial = shadowMaterial.clone();
    this.shadow = new Mesh(new CircleGeometry(1, 28), this.shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 1;
    scene.add(this.shadow);
    this.scene.add(this.root);
    this.setRadius(0.35);
    this.setVisible(false);
  }

  get position(): Vector3 {
    return this.root.position;
  }

  get currentRadius(): number {
    return this.radius;
  }

  get isMoving(): boolean {
    return this.moving > 0.15;
  }

  get bounceReady(): boolean {
    return this.bounceCooldown <= 0;
  }

  setRadius(radius: number): void {
    this.radius = radius;
    this.root.scale.setScalar(radius * 1.15);
    this.outline.scale.setScalar(1.028);
    const shadowScale = radius * 1.12;
    this.shadow.scale.set(shadowScale, shadowScale, 1);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
    this.shadow.visible = visible;
  }

  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
  }

  setEyesOpen(open: boolean): void {
    this.eyeOpenTarget = open ? 1 : 0;
    this.applyEyeVisibility(open ? 1 : 0);
  }

  setEyeLids(value: number): void {
    this.eyeOpenAmount = this.eyeOpenTarget = clamp(value, 0, 1);
    this.applyEyeVisibility(this.eyeOpenAmount);
  }

  private applyEyeVisibility(value: number): void {
    const showEyes = value > 0.18;
    const lid = Math.max(value, 0.05);
    for (const rig of this.eyes) {
      rig.group.scale.y = lid;
      rig.group.visible = showEyes;
    }
    for (const line of this.closedEyes) {
      line.visible = !showEyes;
    }
  }

  placeAt(x: number, z: number, y = 0): void {
    this.root.position.set(x, y, z);
    this.shadow.position.set(x, 0.12, z);
  }

  resetForRun(x: number, z: number): void {
    this.velocity.set(0, 0);
    this.knockback.set(0, 0);
    this.inputSmoothed.set(0, 0);
    this.hopClock = 0;
    this.idleClock = 0;
    this.blinkTimer = 2.5;
    this.blinkPhase = -1;
    this.eyeOpenTarget = 1;
    this.eyeOpenAmount = 1;
    this.bounceCooldown = 0;
    this.facing = Math.PI;
    this.bodyPivot.rotation.set(0, this.facing, 0);
    this.facePivot.rotation.set(-0.32, 0, 0);
    this.visual.scale.setScalar(1);
    this.visual.rotation.set(0, 0, 0);
    this.root.rotation.set(0, 0, 0);
    this.root.position.set(x, 0, z);
    this.shadow.position.set(x, 0.12, z);
    this.shadowMaterial.opacity = 0.24;
    this.applyEyeVisibility(1);
    this.facePivot.visible = true;
    this.setVisible(true);
  }

  applyKnockback(nx: number, nz: number, strength: number): void {
    if (!this.bounceReady) return;
    this.knockback.set(nx * strength, nz * strength);
    this.bounceCooldown = 0.55;
    this.visual.scale.set(1.18, 0.78, 1.18);
    this.moving = 0;
  }

  refreshFace(_cameraPosition: Vector3): void {
    const jitterY = Math.cos(this.elapsed * 2.1) * 0.01;
    for (const rig of this.eyes) {
      rig.pupil.position.y = 0.01 + jitterY;
    }
  }

  setIntroSquash(x: number, y: number, z: number): void {
    this.visual.scale.set(x, y, z);
  }

  update(dt: number, input: Vector2, cameraPosition: Vector3): void {
    if (this.frozen) {
      this.refreshFace(cameraPosition);
      this.updateShadow();
      return;
    }
    this.elapsed += dt;
    this.idleClock += dt;
    this.bounceCooldown = Math.max(0, this.bounceCooldown - dt);
    this.hopSoundCooldown = Math.max(0, this.hopSoundCooldown - dt);
    const magnitude = Math.min(1, input.length());
    this.inputSmoothed.copy(input);
    const speed = speedForRadius(this.radius);
    const targetX = input.x * speed;
    const targetZ = input.y * speed;
    this.velocity.x = damp(this.velocity.x, targetX, magnitude > 0.05 ? 36 : 18, dt);
    this.velocity.y = damp(this.velocity.y, targetZ, magnitude > 0.05 ? 36 : 18, dt);
    this.knockback.multiplyScalar(Math.exp(-5.5 * dt));

    this.root.position.x += (this.velocity.x + this.knockback.x) * dt;
    this.root.position.z += (this.velocity.y + this.knockback.y) * dt;
    this.moving = damp(this.moving, magnitude, 10, dt);

    if (magnitude > 0.08) {
      const desiredFacing = Math.atan2(this.inputSmoothed.x, this.inputSmoothed.y);
      let delta = desiredFacing - this.facing;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.facing += delta * Math.min(1, dt * 18);
    }
    this.bodyPivot.rotation.y = this.facing;
    const cameraDx = cameraPosition.x - this.root.position.x;
    const cameraDz = cameraPosition.z - this.root.position.z;
    const cameraLength = Math.hypot(cameraDx, cameraDz) || 1;
    const facingCamera =
      (Math.sin(this.facing) * cameraDx + Math.cos(this.facing) * cameraDz) / cameraLength;
    this.facePivot.visible = facingCamera > 0.08;
    this.bodyPivot.rotation.z = damp(
      this.bodyPivot.rotation.z,
      -this.inputSmoothed.x * 0.14 * magnitude,
      12,
      dt
    );
    this.bodyPivot.rotation.x = damp(
      this.bodyPivot.rotation.x,
      this.inputSmoothed.y * 0.12 * magnitude,
      12,
      dt
    );

    const movingNow = clamp(this.moving * 1.25, 0, 1);
    let hopHeight = 0;
    let squashX = 1;
    let squashY = 1;
    let squashZ = 1;
    if (movingNow > 0.12) {
      const hopDuration = clamp(0.52 - this.radius * 0.012, 0.32, 0.52);
      const previous = this.hopClock;
      this.hopClock += dt * (0.75 + movingNow * 0.35);
      if (this.hopClock >= hopDuration) {
        this.hopClock %= hopDuration;
        if (this.onHop && this.hopSoundCooldown <= 0) {
          this.onHop(movingNow);
          this.hopSoundCooldown = 0.13;
        }
      } else if (previous === 0 && this.onHop && this.hopSoundCooldown <= 0) {
        this.onHop(movingNow);
        this.hopSoundCooldown = 0.13;
      }
      const phase = this.hopClock / hopDuration;
      const arc = Math.sin(phase * Math.PI);
      hopHeight = arc * (0.16 + this.radius * 0.18) * movingNow;
      if (phase < 0.16) {
        const t = phase / 0.16;
        squashX = lerp(1.12, 0.96, t);
        squashZ = lerp(1.12, 0.96, t);
        squashY = lerp(0.84, 1.09, t);
      } else if (phase > 0.78) {
        const t = (phase - 0.78) / 0.22;
        squashX = lerp(0.97, 1.09, t);
        squashZ = lerp(0.97, 1.09, t);
        squashY = lerp(1.06, 0.88, t);
      } else {
        squashX = 0.96;
        squashZ = 0.96;
        squashY = 1.09;
      }
    } else {
      this.hopClock = 0;
      const breathe = Math.sin(this.idleClock * 2.4);
      squashX = 1 + breathe * 0.015;
      squashY = 1 - breathe * 0.02;
      squashZ = 1 + breathe * 0.015;
    }

    this.visual.position.y = hopHeight;
    this.visual.scale.x = damp(this.visual.scale.x, squashX, 20, dt);
    this.visual.scale.y = damp(this.visual.scale.y, squashY, 20, dt);
    this.visual.scale.z = damp(this.visual.scale.z, squashZ, 20, dt);

    this.updateBlink(dt);
    this.refreshFace(cameraPosition);
    this.updateShadow(hopHeight);
  }

  private updateBlink(dt: number): void {
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt;
      if (this.blinkPhase > 0.17) {
        this.blinkPhase = -1;
        this.blinkTimer = 2.4 + Math.random() * 3.2;
      }
    } else {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0 && this.eyeOpenTarget > 0.5) {
        this.blinkPhase = 0;
      }
    }
    this.eyeOpenAmount = damp(this.eyeOpenAmount, this.eyeOpenTarget, 16, dt);
    const closing = this.blinkPhase >= 0 ? Math.abs(0.5 - Math.min(1, this.blinkPhase / 0.17)) * 2 : 1;
    const lid = Math.min(this.eyeOpenAmount, closing);
    this.applyEyeVisibility(lid);
  }

  private updateShadow(hopHeight = 0): void {
    const height = Math.max(0, hopHeight);
    const scale = this.radius * (1.12 + height * 0.8);
    this.shadow.position.set(this.root.position.x, 0.12, this.root.position.z);
    this.shadow.scale.set(scale, scale, 1);
    this.shadowMaterial.opacity = clamp(0.26 - height * 0.45, 0.08, 0.26);
  }
}
