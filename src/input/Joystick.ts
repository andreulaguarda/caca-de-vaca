import { Vector2 } from 'three';
import { clamp } from '../core/math';

const RADIUS = 58;

export class Joystick {
  private readonly surface: HTMLElement;
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly value = new Vector2();
  private pointerId = -1;
  private enabled = false;
  private readonly keys = new Set<string>();
  private firstMove = false;
  onFirstMove?: () => void;

  constructor(surface: HTMLElement, base: HTMLElement, knob: HTMLElement) {
    this.surface = surface;
    this.base = base;
    this.knob = knob;
    this.surface.addEventListener('pointerdown', this.handleDown);
    this.surface.addEventListener('pointermove', this.handleMove);
    this.surface.addEventListener('pointerup', this.handleUp);
    this.surface.addEventListener('pointercancel', this.handleUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.reset);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  get vector(): Vector2 {
    if (this.pointerId >= 0) return this.value;
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    this.value.set(x, y);
    if (this.value.lengthSq() > 1) this.value.normalize();
    return this.value;
  }

  private triggerFirstMove(): void {
    if (this.firstMove) return;
    this.firstMove = true;
    this.onFirstMove?.();
  }

  private handleDown = (event: PointerEvent): void => {
    if (!this.enabled || this.pointerId >= 0) return;
    if (event.clientY < window.innerHeight * 0.16) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.surface.setPointerCapture(event.pointerId);
    const x = clamp(event.clientX, 78, window.innerWidth - 78);
    const y = clamp(event.clientY, 100, window.innerHeight - 86);
    this.base.style.left = `${x}px`;
    this.base.style.top = `${y}px`;
    this.base.dataset.x = `${x}`;
    this.base.dataset.y = `${y}`;
    this.base.classList.add('visible');
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.value.set(0, 0);
    this.triggerFirstMove();
  };

  private handleMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault();
    const baseX = Number(this.base.dataset.x ?? 0);
    const baseY = Number(this.base.dataset.y ?? 0);
    let dx = event.clientX - baseX;
    let dy = event.clientY - baseY;
    const length = Math.hypot(dx, dy);
    if (length > RADIUS) {
      dx = (dx / length) * RADIUS;
      dy = (dy / length) * RADIUS;
    }
    const nx = dx / RADIUS;
    const ny = dy / RADIUS;
    const dead = 0.14;
    const magnitude = Math.hypot(nx, ny);
    if (magnitude < dead) {
      this.value.set(0, 0);
    } else {
      const scaled = (magnitude - dead) / (1 - dead);
      this.value.set((nx / magnitude) * scaled, (ny / magnitude) * scaled);
    }
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  private handleUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    if (this.surface.hasPointerCapture(event.pointerId)) {
      this.surface.releasePointerCapture(event.pointerId);
    }
    this.reset();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
      this.keys.add(key);
      this.triggerFirstMove();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private reset = (): void => {
    this.pointerId = -1;
    this.value.set(0, 0);
    this.keys.clear();
    this.base.classList.remove('visible');
  };
}
