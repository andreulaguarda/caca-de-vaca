import { Vector3 } from 'three';
import { easeInCubic, easeInOutCubic, easeOutBack, easeOutCubic, lerp } from '../core/math';
import type { CowActor } from '../entities/Cow';
import type { Player } from '../entities/Player';
import type { Particles } from '../render/particles';
import type { AudioManager } from '../audio/AudioManager';
import type { UI } from '../ui/UI';
import type { CameraRig } from './CameraRig';

const ENTRY_TARGET = new Vector3(0, 1.05, -1.4);
const SHOT_A = new Vector3(4.2, 2.35, 7.4);
const TARGET_A = new Vector3(-0.5, 1.05, -1.4);
const SHOT_B = new Vector3(3.1, 1.85, 5.6);
const TARGET_B = new Vector3(-0.3, 0.88, -0.7);
const SHOT_C = new Vector3(1.55, 1.15, 3.0);
const TARGET_C = new Vector3(0, 0.48, 0.1);

export class Intro {
  private readonly player: Player;
  private readonly cow: CowActor;
  private readonly cameraRig: CameraRig;
  private readonly audio: AudioManager;
  private readonly ui: UI;
  private readonly particles: Particles;
  private active = false;
  private time = 0;
  private complete = false;
  private fired = new Set<string>();
  private readonly entry = new Vector3();
  private readonly cinematicPosition = new Vector3();
  private readonly cinematicTarget = new Vector3();
  private readonly playerStart = new Vector3(-1.55, 0.72, -1.05);
  onComplete?: () => void;

  constructor(
    player: Player,
    cow: CowActor,
    cameraRig: CameraRig,
    audio: AudioManager,
    ui: UI,
    particles: Particles
  ) {
    this.player = player;
    this.cow = cow;
    this.cameraRig = cameraRig;
    this.audio = audio;
    this.ui = ui;
    this.particles = particles;
  }

  start(): void {
    this.active = true;
    this.complete = false;
    this.time = 0;
    this.fired.clear();
    this.entry.copy(this.cameraRig.camera.position);
    this.player.placeAt(0, 0);
    this.player.setVisible(false);
    this.player.shadow.visible = false;
    this.player.setEyeLids(0.02);
    this.player.facePivot.visible = true;
    this.player.visual.position.set(0, 0, 0);
    this.player.visual.scale.set(1, 1, 1);
    this.player.visual.rotation.set(0, 0, 0);
    this.player.bodyPivot.rotation.set(0, 0, 0);
    this.cow.place(-1.6, -2.2, Math.PI);
    this.cow.setVisible(true);
    this.cow.setMode('idle');
    this.cow.setGraze(1);
    this.cow.typeStrain(0);
    this.cow.liftTail(0);
    this.ui.showIntro();
    this.updateCamera(0);
  }

  skip(): void {
    if (!this.active) return;
    this.finish(true);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    const t = this.time;
    this.fire('moo', t > 0.9, () => {
      this.audio.moo();
      this.ui.showIntroCaption('MOO...', 900);
    });
    this.fire('ready', t > 1.25, () => {
      this.cow.setMode('strain');
      this.audio.strain();
    });
    if (t > 1.25 && t < 2.65) {
      const strain = Math.min(1, (t - 1.25) / 0.75);
      this.cow.typeStrain(strain * 0.9);
      this.cow.liftTail(strain);
    }
    this.fire('strain2', t > 2.0, () => this.audio.strain());
    this.fire('skip', t > 0.8, () => this.ui.enableSkip(true));
    if (t > 2.55 && t < 3.1) {
      this.fire('drop', true, () => {
        this.player.setVisible(true);
        this.player.shadow.visible = false;
        this.player.setEyeLids(0.02);
        this.player.facePivot.visible = true;
        this.player.bodyPivot.rotation.y = 0;
        this.player.root.position.copy(this.playerStart);
        this.player.visual.scale.setScalar(0.08);
        this.particles.burst(
          this.playerStart.x,
          0.78,
          this.playerStart.z + 0.1,
          [0x6b4125, 0x8d5c33, 0xf3d6a2],
          10,
          1.1,
          0.06,
          0.45
        );
      });
      const emerge = Math.min(1, (t - 2.55) / 0.24);
      const fall = Math.min(1, (t - 2.79) / 0.3);
      const x = lerp(this.playerStart.x, 0, easeOutCubic(fall));
      const z = lerp(this.playerStart.z, 0, easeOutCubic(fall));
      const y = fall <= 0
        ? lerp(this.playerStart.y, this.playerStart.y + 0.28, easeOutCubic(emerge))
        : lerp(this.playerStart.y + 0.28, 0, easeInCubic(fall));
      const pop = 0.08 + 0.92 * easeOutBack(emerge);
      this.player.root.position.set(x, Math.max(0, y), z);
      this.player.visual.scale.set(pop * (fall > 0.55 ? 0.9 : 1), pop * (fall > 0.55 ? 1.15 : 1), pop * (fall > 0.55 ? 0.9 : 1));
      this.player.shadow.position.set(x, 0.055, z);
    }
    if (t >= 3.08) {
      this.fire('land', true, () => {
        this.player.bodyPivot.rotation.y = 0;
        this.player.root.position.set(0, 0, 0);
        this.player.placeAt(0, 0);
        this.player.setVisible(true);
        this.player.shadow.visible = true;
        this.player.visual.scale.set(1.32, 0.62, 1.32);
        this.audio.plop();
        this.cameraRig.shake(1.2);
        this.ui.showIntroCaption('¡PLOP!', 700);
        this.particles.burst(-0.9, 0.1, -0.8, [0x704526, 0x8d5931, 0x4f9b3b, 0xd8b77d], 16, 2.2, 0.11, 0.7);
        this.cow.setMode('walk');
        this.cow.typeStrain(0);
        this.cow.liftTail(0);
      });
    }
    if (t > 3.08 && t < 3.55) {
      const settle = (t - 3.08) / 0.47;
      const squash = easeOutBack(settle);
      this.player.visual.scale.set(
        lerp(1.32, 1, squash),
        lerp(0.62, 1, squash),
        lerp(1.32, 1, squash)
      );
    }
    this.fire('open', t > 3.95, () => {
      this.audio.eyeOpen();
      this.ui.showIntroCaption('¡HOLA!', 620);
    });
    if (t > 5.28) {
      this.player.facePivot.visible = false;
    }
    if (t > 3.95 && t < 4.35) {
      const open = Math.min(1, (t - 3.95) / 0.3);
      this.player.setEyeLids(Math.min(1, easeOutBack(open)));
    }
    if (t > 4.3 && t < 4.75) {
      const hop = (t - 4.3) / 0.45;
      const arc = Math.sin(hop * Math.PI);
      this.player.root.position.y = arc * 0.38;
      this.player.visual.scale.set(0.92, 1.12, 0.92);
      this.fire('boing', true, () => {
        this.audio.hop(1);
        this.ui.showIntroCaption('¡BOING!', 700);
      });
    } else if (t >= 4.75) {
      this.player.root.position.y = 0;
      this.player.visual.scale.set(1, 1, 1);
    }
    if (t > 3.15 && t < 5.4) {
      this.cow.root.position.z -= dt * 1.45;
    }
    if (t > 5.35) {
      this.cow.setVisible(false);
    }
    this.cow.update(dt);
    this.updateCamera(t);
    if (t >= 2.55) {
      const dx = this.cameraRig.camera.position.x - this.player.root.position.x;
      const dz = this.cameraRig.camera.position.z - this.player.root.position.z;
      const lookYaw = Math.atan2(dx, dz);
      if (t < 4.78) {
        this.player.bodyPivot.rotation.y = lookYaw;
      } else {
        const turn = Math.min(1, (t - 4.78) / 0.62);
        let delta = Math.PI - lookYaw;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        this.player.bodyPivot.rotation.y = lookYaw + delta * easeInOutCubic(turn);
      }
    }
    this.player.refreshFace(this.cameraRig.camera.position);
    if (t >= 5.95) {
      this.finish(false);
    }
  }

  private updateCamera(t: number): void {
    if (t < 1.2) {
      const k = easeInOutCubic(t / 1.2);
      this.cinematicPosition.lerpVectors(this.entry, SHOT_A, k);
      this.cinematicTarget.lerpVectors(ENTRY_TARGET, TARGET_A, k);
    } else if (t < 3.15) {
      const k = easeInOutCubic((t - 1.2) / 1.95);
      this.cinematicPosition.lerpVectors(SHOT_A, SHOT_B, k);
      this.cinematicTarget.lerpVectors(TARGET_A, TARGET_B, k);
    } else if (t < 4.35) {
      const k = easeInOutCubic((t - 3.15) / 1.2);
      this.cinematicPosition.lerpVectors(SHOT_B, SHOT_C, k);
      this.cinematicTarget.lerpVectors(TARGET_B, TARGET_C, k);
    } else {
      const pose = this.cameraRig.followPoseFor(this.player);
      const k = easeInOutCubic((t - 4.35) / 1.6);
      this.cinematicPosition.lerpVectors(SHOT_C, pose.position, k);
      this.cinematicTarget.lerpVectors(TARGET_C, pose.target, k);
    }
    this.cameraRig.setCinematic(this.cinematicPosition, this.cinematicTarget);
  }

  private fire(key: string, condition: boolean, callback: () => void): void {
    if (!condition || this.fired.has(key)) return;
    this.fired.add(key);
    callback();
  }

  private finish(skipped: boolean): void {
    if (this.complete) return;
    this.complete = true;
    this.active = false;
    this.ui.enableSkip(false);
    this.cow.setVisible(false);
    this.player.setVisible(true);
    this.player.shadow.visible = true;
    this.player.placeAt(0, 0);
    this.player.root.position.y = 0;
    this.player.visual.scale.set(1, 1, 1);
    this.player.visual.position.set(0, 0, 0);
    this.player.visual.rotation.set(0, 0, 0);
    this.player.bodyPivot.rotation.set(0, Math.PI, 0);
    this.player.facePivot.visible = false;
    this.player.setEyeLids(1);
    this.player.refreshFace(this.cameraRig.camera.position);
    if (skipped) {
      this.audio.hop(0.6);
    }
    this.cameraRig.snapToPlayer(this.player);
    this.onComplete?.();
  }
}
