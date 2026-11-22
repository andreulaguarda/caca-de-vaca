import {
  NoToneMapping,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three';
import {
  COMBO_SECONDS,
  MAX_COMBO,
  PROPS,
  STAGES,
  START_RADIUS,
  WORLD_RADIUS,
  playerRadiusFor,
  scoreFor,
  speedBonusFor,
  type PropId
} from '../config/balance';
import { clamp } from '../core/math';
import { AudioManager } from '../audio/AudioManager';
import { CowActor } from '../entities/Cow';
import { Player } from '../entities/Player';
import { Joystick } from '../input/Joystick';
import { ads } from '../platform/ads';
import { storage } from '../platform/storage';
import { Environment } from '../render/environment';
import { Particles } from '../render/particles';
import { UI } from '../ui/UI';
import { CameraRig } from './CameraRig';
import { Intro } from './Intro';
import { World, type WorldItem } from './World';

type GameState = 'menu' | 'intro' | 'playing' | 'paused' | 'results' | 'records';

const ORIGIN = new Vector3(0, 0.8, 0);

const PARTICLE_COLORS: Record<PropId, number[]> = {
  grass: [0x6bbf4d, 0x4f9b3b, 0x9bd65b],
  flower: [0xffe27a, 0xfff4dd, 0xf49f88],
  mushroom: [0xdd5a48, 0xfff4dd, 0x8d5a36],
  mouse: [0x9a9c9e, 0xd8aeb0, 0x6d4729],
  rabbit: [0xfffaf0, 0xf1a49c, 0x9bd65b],
  sheep: [0xfffaf0, 0x4f4a42, 0x9bd65b],
  fence: [0xa9794b, 0x7d5734, 0x6bbf4d],
  farmer: [0xb34f3f, 0x355f8e, 0xe1b75b],
  person: [0x4f94a5, 0x525a65, 0xf1c29a],
  cow: [0xfffaf0, 0x2d2925, 0xf0a19a],
  car: [0xdd5a48, 0x8ed7e8, 0x33363a],
  tree: [0x4f9a3b, 0x67b94a, 0x80532f],
  house: [0xc4694c, 0xf4e4bd, 0x8ed7e8],
  building: [0xd8c9a8, 0x8ed7e8, 0xb56f53]
};

export class Game {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly cameraRig: CameraRig;
  private readonly environment: Environment;
  private readonly particles: Particles;
  private readonly world: World;
  private readonly player: Player;
  private readonly cow: CowActor;
  private readonly audio = new AudioManager();
  private readonly ui: UI;
  private readonly joystick: Joystick;
  private readonly intro: Intro;
  private state: GameState = 'menu';
  private score = 0;
  private stageIndex = 0;
  private growth = 0;
  private elapsedSeconds = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private lastFrame = 0;
  private tutorialTimer = 0;
  private eatSoundAt = 0;
  private lastBounceToast = 0;
  private lowQuality = false;
  private qualityCheckTime = 0;
  private qualityFrames = 0;
  private qualityElapsed = 0;
  private readonly projected = new Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.setClearColor(0x9fe3ff, 1);
    this.cameraRig = new CameraRig(window.innerWidth / Math.max(1, window.innerHeight));
    this.environment = new Environment(this.scene);
    this.particles = new Particles(this.scene);
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.cow = new CowActor(this.scene);
    this.ui = new UI({
      onPlay: () => void this.playFromMenu(),
      onPause: () => this.pauseGame(),
      onResume: () => void this.resumeGame(),
      onPauseMenu: () => this.returnToMenu(),
      onRetry: () => this.retry(),
      onResultsMenu: () => this.returnToMenu(),
      onOpenRecords: () => this.openRecords(),
      onCloseRecords: () => this.closeRecords(),
      onSoundToggle: () => this.toggleSound(),
      onSkipIntro: () => this.skipIntro()
    });
    this.intro = new Intro(
      this.player,
      this.cow,
      this.cameraRig,
      this.audio,
      this.ui,
      this.particles
    );
    this.intro.onComplete = () => this.beginPlaying();
    this.joystick = new Joystick(
      document.getElementById('touch-layer') as HTMLElement,
      document.getElementById('joystick-base') as HTMLElement,
      document.getElementById('joystick-knob') as HTMLElement
    );
    this.joystick.onFirstMove = () => this.ui.hideTutorial();
    this.player.onHop = (strength) => {
      this.audio.hop(strength);
      if (this.state === 'playing') {
        const size = 0.035 + this.player.currentRadius * 0.025;
        this.particles.burst(
          this.player.position.x,
          0.08,
          this.player.position.z,
          [0xd7c38e, 0x9b8a5d, 0x6bbf4d],
          3,
          0.8 + strength * 0.5,
          size,
          0.28
        );
      }
    };
    this.ui.setSound(this.audio.isMuted());
    this.setupMenu();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationChange);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  start(): void {
    this.renderer.setAnimationLoop(this.loop);
    requestAnimationFrame(() => {
      this.ui.bootDone();
      window.setTimeout(() => {
        if (this.state === 'menu' || this.state === 'records') {
          void ads.showBanner();
        }
      }, 700);
    });
  }

  private setupMenu(): void {
    this.state = 'menu';
    this.world.reset();
    this.player.setVisible(false);
    this.player.setFrozen(true);
    this.cow.place(-1.6, -2.2, Math.PI);
    this.cow.setVisible(true);
    this.cow.setMode('idle');
    this.cow.setGraze(1);
    this.cow.root.position.y = 0;
    this.cameraRig.snapMenu();
    this.joystick.setEnabled(false);
    this.audio.stopMusic();
    this.ui.showMenu(storage.getBest()?.score ?? 0);
  }

  private resetRunData(): void {
    this.score = 0;
    this.stageIndex = 0;
    this.growth = 0;
    this.elapsedSeconds = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.eatSoundAt = 0;
    this.player.setRadius(START_RADIUS);
  }

  private async playFromMenu(): Promise<void> {
    if (this.state !== 'menu') return;
    this.audio.ui();
    await this.audio.unlock();
    this.audio.resume();
    this.resetRunData();
    this.world.reset();
    this.player.resetForRun(0, 0);
    this.player.setFrozen(true);
    void ads.hideBanner();
    this.state = 'intro';
    this.joystick.setEnabled(false);
    this.intro.start();
  }

  private beginPlaying(): void {
    if (this.state !== 'intro') return;
    this.state = 'playing';
    this.player.setFrozen(false);
    this.player.setEyesOpen(true);
    this.ui.showHud();
    this.ui.hideTutorial();
    this.ui.showTutorial();
    window.clearTimeout(this.tutorialTimer);
    this.tutorialTimer = window.setTimeout(() => this.ui.hideTutorial(), 5500);
    this.joystick.setEnabled(true);
    this.joystick.vector.set(0, 0);
    this.audio.stopMusic();
    this.audio.startMusic();
    void ads.prepareInterstitial();
    this.updateHud();
  }

  private startDirect(): void {
    this.resetRunData();
    this.world.reset();
    this.player.resetForRun(0, 0);
    this.player.setFrozen(false);
    this.player.setEyesOpen(true);
    this.cow.setVisible(false);
    this.cameraRig.snapToPlayer(this.player);
    this.state = 'playing';
    this.ui.showHud();
    this.ui.showTutorial();
    window.clearTimeout(this.tutorialTimer);
    this.tutorialTimer = window.setTimeout(() => this.ui.hideTutorial(), 5000);
    this.joystick.setEnabled(true);
    this.joystick.vector.set(0, 0);
    this.audio.resume();
    this.audio.startMusic();
    void ads.hideBanner();
    void ads.prepareInterstitial();
    this.updateHud();
  }

  private retry(): void {
    if (this.state !== 'results') return;
    this.audio.ui();
    this.startDirect();
  }

  private pauseGame(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.player.setFrozen(true);
    this.joystick.setEnabled(false);
    this.ui.showPause();
    this.audio.stopMusic();
    this.audio.suspend();
    this.audio.ui();
  }

  private async resumeGame(): Promise<void> {
    if (this.state !== 'paused') return;
    await this.audio.unlock();
    this.audio.resume();
    this.state = 'playing';
    this.player.setFrozen(false);
    this.ui.hidePause();
    this.joystick.setEnabled(true);
    this.audio.startMusic();
    this.audio.ui();
  }

  private skipIntro(): void {
    if (this.state !== 'intro') return;
    this.audio.ui();
    this.intro.skip();
  }

  private returnToMenu(): void {
    if (this.state === 'menu') return;
    this.audio.ui();
    this.audio.stopMusic();
    this.audio.resume();
    this.setupMenu();
    void ads.showBanner();
  }

  private openRecords(): void {
    if (this.state !== 'menu') return;
    this.audio.ui();
    this.state = 'records';
    this.ui.showRecords(storage.getRecords());
    void ads.showBanner();
  }

  private closeRecords(): void {
    if (this.state !== 'records') return;
    this.audio.ui();
    this.state = 'menu';
    this.ui.showMenu(storage.getBest()?.score ?? 0);
    void ads.showBanner();
  }

  private toggleSound(): void {
    const muted = !this.audio.isMuted();
    this.audio.setMuted(muted);
    this.ui.setSound(muted);
    if (!muted) {
      void this.audio.unlock().then(() => {
        if (this.state === 'playing') this.audio.startMusic();
        this.audio.ui();
      });
    }
  }

  private endRun(won: boolean): void {
    if (this.state !== 'playing') return;
    this.state = 'results';
    this.joystick.setEnabled(false);
    this.player.setFrozen(true);
    this.audio.stopMusic();
    const stage = STAGES[this.stageIndex];
    const speedBonus = won ? speedBonusFor(this.score, this.elapsedSeconds) : 0;
    this.score += speedBonus;
    const bestBefore = storage.getBest();
    const record = {
      score: this.score,
      stage: this.stageIndex,
      stageName: stage.name,
      won,
      date: new Date().toISOString(),
      timeSeconds: this.elapsedSeconds,
      speedBonus
    };
    const result = storage.addRecord(record);
    const completedRuns = storage.addPlay();
    const bestScore = Math.max(bestBefore?.score ?? 0, record.score);
    this.ui.showResults({
      score: record.score,
      bonus: speedBonus,
      stageName: stage.name,
      stageIndex: this.stageIndex,
      won,
      isBest: result.isBest,
      bestScore,
      timeSeconds: this.elapsedSeconds
    });
    void ads.showBanner();
    if (won) {
      this.audio.win();
      this.particles.burst(
        this.player.position.x,
        1.5,
        this.player.position.z,
        [0xffd34d, 0xfff4dd, 0x6bbf4d, 0xf49f88],
        38,
        6,
        0.35,
        0.8
      );
    } else {
      this.audio.lose();
    }
    window.setTimeout(() => {
      if (this.state === 'results') {
        void ads.maybeShowInterstitial(completedRuns);
      }
    }, 1300);
  }

  private applyGrowth(amount: number): void {
    this.growth += amount;
    const lastIndex = STAGES.length - 1;
    while (this.stageIndex < lastIndex && this.growth >= STAGES[this.stageIndex].goal) {
      const finished = this.stageIndex;
      this.growth -= STAGES[finished].goal;
      this.stageIndex += 1;
      if (this.stageIndex >= lastIndex) {
        this.growth = 0;
        this.syncRadius();
        this.endRun(true);
        return;
      }
      this.audio.stageUp();
      this.cameraRig.pulseZoom(3 + this.player.currentRadius * 0.6);
      this.showStageBanner(this.stageIndex);
      this.particles.burst(
        this.player.position.x,
        0.8,
        this.player.position.z,
        [0xffd34d, 0xfff4dd, 0x6bbf4d],
        14,
        3.2,
        0.08 + this.player.currentRadius * 0.03,
        0.8
      );
    }
    this.syncRadius();
  }

  private syncRadius(): void {
    const stage = STAGES[this.stageIndex];
    const progress = stage.goal > 0 ? clamp(this.growth / stage.goal, 0, 1) : 1;
    this.player.setRadius(playerRadiusFor(this.stageIndex, progress));
  }

  private showStageBanner(index: number): void {
    const stage = STAGES[index];
    if (index === STAGES.length - 2) {
      this.ui.showStageBanner('OBJETIVO FINAL', stage.name, 'COME EDIFICIOS HASTA SER LEYENDA');
      return;
    }
    const labels = stage.unlock.map((id) => PROPS[id].label).join(' · ');
    this.ui.showStageBanner(`FASE ${index + 1}`, stage.name, labels);
  }

  private comboMultiplier(): number {
    if (this.comboCount <= 0) return 1;
    return Math.min(MAX_COMBO, 1 + Math.floor((this.comboCount - 1) / 3));
  }

  private eatItem(item: WorldItem): void {
    this.comboCount += 1;
    this.comboTimer = COMBO_SECONDS;
    const multiplier = this.comboMultiplier();
    const points = scoreFor(item.spec, multiplier);
    this.score += points;
    this.world.consume(item);
    this.applyGrowth(item.spec.growth);
    const particleSize = clamp(0.05 + item.radius * 0.08, 0.05, 0.7);
    this.particles.burst(
      item.x,
      Math.max(0.1, item.radius * 0.8),
      item.z,
      PARTICLE_COLORS[item.typeId],
      Math.min(14, 3 + Math.round(item.radius * 1.7)),
      1.3 + Math.min(3.5, item.radius * 0.6),
      particleSize,
      0.55
    );
    const now = performance.now();
    if (now - this.eatSoundAt > 55) {
      this.audio.eat(item.radius * 2.2, this.comboCount);
      this.eatSoundAt = now;
    }
    const screen = this.project(item.x, item.radius * 1.1 + 0.2, item.z);
    if (screen) {
      this.ui.spawnScorePopup(
        `+${points}`,
        screen.x,
        screen.y,
        item.radius > 1.5 || points >= 300
      );
    }
  }

  private project(x: number, y: number, z: number): { x: number; y: number } | null {
    this.projected.set(x, y, z).project(this.cameraRig.camera);
    if (this.projected.z > 1 || this.projected.z < -1) return null;
    return {
      x: (this.projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this.projected.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  private handleBlocker(item: WorldItem): void {
    if (!this.player.bounceReady) return;
    const dx = this.player.position.x - item.x;
    const dz = this.player.position.z - item.z;
    const length = Math.hypot(dx, dz) || 0.001;
    const nx = dx / length;
    const nz = dz / length;
    const minDistance = this.player.currentRadius * 0.92 + item.radius * 0.68;
    const newX = item.x + nx * minDistance;
    const newZ = item.z + nz * minDistance;
    this.player.placeAt(newX, newZ);
    const strength = 2.6 + Math.min(7, item.radius / Math.max(0.25, this.player.currentRadius));
    this.player.applyKnockback(nx, nz, strength);
    this.audio.bounce();
    this.cameraRig.shake(0.55 + Math.min(0.8, item.radius / 18));
    this.comboCount = 0;
    this.comboTimer = 0;
    const now = performance.now();
    if (now - this.lastBounceToast > 2600) {
      this.ui.showToast(`${item.spec.label} demasiado grande`);
      this.lastBounceToast = now;
    }
  }

  private updateRun(dt: number, rawDt: number): void {
    this.elapsedSeconds += rawDt;
    this.syncRadius();
    this.player.update(dt, this.joystick.vector, this.cameraRig.camera.position);
    const maxRadius = WORLD_RADIUS - Math.min(20, this.player.currentRadius * 0.8) - 2;
    const distance = Math.hypot(this.player.position.x, this.player.position.z);
    if (distance > maxRadius) {
      const scale = maxRadius / distance;
      this.player.position.x *= scale;
      this.player.position.z *= scale;
    }
    const interactions = this.world.interact(
      this.player.position.x,
      this.player.position.z,
      this.player.currentRadius
    );
    for (const item of interactions.eaten) {
      this.eatItem(item);
      if (this.state !== 'playing') break;
    }
    if (this.state === 'playing' && interactions.blocker) {
      this.handleBlocker(interactions.blocker);
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }
    this.world.update(dt, this.player);
    this.cameraRig.follow(dt, this.player);
    this.updateHud();
  }

  private updateHud(): void {
    const stage = STAGES[this.stageIndex];
    this.ui.updateHud({
      score: this.score,
      stageName: stage.name,
      zone: stage.zone,
      progress: clamp(this.growth / stage.goal, 0, 1),
      combo: this.comboMultiplier()
    });
  }

  private adaptQuality(dt: number): void {
    if (this.lowQuality || this.state !== 'playing') return;
    this.qualityCheckTime += dt;
    this.qualityFrames += 1;
    this.qualityElapsed += dt;
    if (this.qualityCheckTime < 4 || this.qualityElapsed < 2) return;
    const fps = this.qualityFrames / this.qualityElapsed;
    if (fps < 42) {
      this.lowQuality = true;
      this.renderer.setPixelRatio(Math.min(1.4, window.devicePixelRatio));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    this.qualityFrames = 0;
    this.qualityElapsed = 0;
  }

  private readonly loop = (time: number): void => {
    const rawDt = this.lastFrame > 0 ? Math.max(0, (time - this.lastFrame) / 1000) : 0;
    const dt = Math.min(0.05, rawDt);
    this.lastFrame = time;
    this.environment.update(dt);
    this.particles.update(dt);
    if (this.state === 'menu' || this.state === 'records') {
      this.cow.update(Math.min(0.1, rawDt));
      this.cameraRig.menu(dt);
    } else if (this.state === 'intro') {
      this.intro.update(Math.min(0.25, rawDt));
    } else if (this.state === 'playing') {
      this.updateRun(dt, Math.min(1, rawDt));
      this.adaptQuality(dt);
    }
    const focus = this.state === 'menu' || this.state === 'records' ? ORIGIN : this.player.position;
    this.environment.setFogForCamera(this.cameraRig.camera.position.distanceTo(focus));
    this.renderer.render(this.scene, this.cameraRig.camera);
  };

  private handleResize = (): void => {
    const width = window.innerWidth;
    const height = Math.max(1, window.innerHeight);
    const dpr = this.lowQuality ? Math.min(1.4, window.devicePixelRatio) : Math.min(2, window.devicePixelRatio);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height);
    this.cameraRig.resize(width / height);
    this.handleOrientationChange();
  };

  private handleOrientationChange = (): void => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const landscape = window.innerWidth > window.innerHeight;
    const show = coarse && landscape && window.innerHeight < 620;
    this.ui.setOrientation(show);
    if (show && this.state === 'playing') {
      this.pauseGame();
    }
  };

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.lastFrame = 0;
      this.audio.suspend();
      if (this.state === 'playing') {
        this.pauseGame();
      }
    }
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
      if (this.state === 'playing') {
        event.preventDefault();
        this.pauseGame();
      } else if (this.state === 'paused') {
        event.preventDefault();
        void this.resumeGame();
      }
    }
  };
}
