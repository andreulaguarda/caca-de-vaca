import { formatScore, formatTime } from '../core/math';
import type { GameRecord } from '../platform/storage';

export interface UIActions {
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onPauseMenu: () => void;
  onRetry: () => void;
  onResultsMenu: () => void;
  onOpenRecords: () => void;
  onCloseRecords: () => void;
  onSoundToggle: () => void;
  onSkipIntro: () => void;
}

export interface HudState {
  timeLeft: number;
  score: number;
  stageName: string;
  zone: string;
  progress: number;
  combo: number;
}

export interface ResultsView {
  score: number;
  bonus: number;
  stageName: string;
  stageIndex: number;
  won: boolean;
  isBest: boolean;
  bestScore: number;
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento ${id}`);
  return element as T;
}

export class UI {
  private readonly actions: UIActions;
  private readonly menu = byId('screen-menu');
  private readonly introUi = byId('intro-ui');
  private readonly pauseScreen = byId('screen-pause');
  private readonly recordsScreen = byId('screen-records');
  private readonly resultsScreen = byId('screen-results');
  private readonly hud = byId('hud');
  private readonly boot = byId('boot');
  private readonly timer = byId('hud-time');
  private readonly timerBox = byId('hud-timer');
  private readonly score = byId('hud-score');
  private readonly stage = byId('hud-stage');
  private readonly zone = byId('hud-zone');
  private readonly progress = byId('hud-progress');
  private readonly combo = byId('hud-combo');
  private readonly tutorial = byId('tutorial');
  private readonly phaseBanner = byId('phase-banner');
  private readonly phaseKicker = byId('phase-kicker');
  private readonly phaseName = byId('phase-name');
  private readonly phaseSub = byId('phase-sub');
  private readonly toast = byId('toast');
  private readonly fxLayer = byId('fx-layer');
  private readonly introCaption = byId('intro-caption');
  private readonly skipButton = byId('btn-skip');
  private readonly recordsList = byId('records-list');
  private readonly menuBest = byId('menu-best');
  private readonly resultsTitle = byId('results-title');
  private readonly resultsKicker = byId('results-kicker');
  private readonly resultsRecord = byId('results-record');
  private readonly resultsScore = byId('results-score');
  private readonly resultsStage = byId('results-stage');
  private readonly resultsBest = byId('results-best');
  private readonly resultsBonus = byId('results-bonus');
  private readonly pauseSoundLabel = document.querySelector<HTMLElement>('.pause-sound-label');
  private readonly soundButtons = Array.from(document.querySelectorAll<HTMLElement>('.sound-btn'));
  private readonly orientation = byId('orientation');
  private phaseTimer = 0;
  private toastTimer = 0;
  private captionTimer = 0;
  private lastHud = '';

  constructor(actions: UIActions) {
    this.actions = actions;
    byId<HTMLButtonElement>('btn-play').addEventListener('click', () => this.actions.onPlay());
    byId<HTMLButtonElement>('btn-pause').addEventListener('click', () => this.actions.onPause());
    byId<HTMLButtonElement>('btn-resume').addEventListener('click', () => this.actions.onResume());
    byId<HTMLButtonElement>('btn-pause-menu').addEventListener('click', () => this.actions.onPauseMenu());
    byId<HTMLButtonElement>('btn-retry').addEventListener('click', () => this.actions.onRetry());
    byId<HTMLButtonElement>('btn-results-menu').addEventListener('click', () => this.actions.onResultsMenu());
    byId<HTMLButtonElement>('btn-records').addEventListener('click', () => this.actions.onOpenRecords());
    byId<HTMLButtonElement>('btn-records-back').addEventListener('click', () => this.actions.onCloseRecords());
    byId<HTMLButtonElement>('btn-skip').addEventListener('click', () => this.actions.onSkipIntro());
    byId<HTMLButtonElement>('btn-pause-sound').addEventListener('click', () => this.actions.onSoundToggle());
    for (const button of this.soundButtons) {
      button.addEventListener('click', () => this.actions.onSoundToggle());
    }
  }

  bootDone(): void {
    this.boot.classList.add('done');
    window.setTimeout(() => this.boot.classList.add('hidden'), 500);
  }

  setSound(muted: boolean): void {
    for (const button of this.soundButtons) {
      button.classList.toggle('muted', muted);
      button.setAttribute('aria-label', muted ? 'Activar sonido' : 'Desactivar sonido');
    }
    if (this.pauseSoundLabel) {
      this.pauseSoundLabel.textContent = muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
    }
  }

  showMenu(bestScore: number): void {
    this.hideAllScreens();
    this.menu.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.menuBest.textContent = formatScore(bestScore);
  }

  showIntro(): void {
    this.hideAllScreens();
    this.introUi.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.skipButton.classList.add('hidden');
    this.introCaption.classList.remove('show');
  }

  showHud(): void {
    this.hideAllScreens();
    this.hud.classList.remove('hidden');
  }

  showPause(): void {
    this.pauseScreen.classList.remove('hidden');
  }

  hidePause(): void {
    this.pauseScreen.classList.add('hidden');
  }

  showRecords(records: GameRecord[]): void {
    this.hideAllScreens();
    this.recordsScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.recordsList.replaceChildren();
    if (records.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'records-empty';
      empty.textContent = 'Todavía no hay marcas. Dales al play y deja el prado sin merienda.';
      this.recordsList.append(empty);
      return;
    }
    records.slice(0, 5).forEach((record, index) => {
      const row = document.createElement('div');
      row.className = `record-row${index === 0 ? ' first' : ''}`;
      const place = document.createElement('span');
      place.className = 'record-place';
      place.textContent = `${index + 1}`;
      const info = document.createElement('div');
      info.className = 'record-info';
      const points = document.createElement('span');
      points.className = 'record-score';
      points.textContent = formatScore(record.score);
      const meta = document.createElement('span');
      meta.className = 'record-meta';
      const date = new Date(record.date);
      const dateText = Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      meta.textContent = `Fase ${record.stage + 1} · ${record.stageName}${dateText ? ` · ${dateText}` : ''}`;
      info.append(points, meta);
      const badge = document.createElement('span');
      badge.className = 'record-badge';
      badge.textContent = record.won ? 'CACA MÁXIMA' : record.stage >= 3 ? 'CRECIDA' : 'BOING';
      row.append(place, info, badge);
      this.recordsList.append(row);
    });
  }

  showResults(view: ResultsView): void {
    this.hideAllScreens();
    this.resultsScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.resultsTitle.textContent = view.won ? '¡CACA MÁXIMA!' : '¡TIEMPO!';
    this.resultsKicker.textContent = view.won ? 'TE HAS COMIDO EL MUNDO' : 'SE ACABÓ EL BOING';
    this.resultsRecord.classList.toggle('hidden', !view.isBest);
    this.resultsStage.textContent = view.stageName;
    this.resultsBest.textContent = formatScore(view.bestScore);
    this.resultsBonus.textContent = `+${formatScore(view.bonus)}`;
    this.animateNumber(this.resultsScore, view.score);
  }

  hideAllScreens(): void {
    this.menu.classList.add('hidden');
    this.introUi.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.recordsScreen.classList.add('hidden');
    this.resultsScreen.classList.add('hidden');
    this.skipButton.classList.add('hidden');
    this.introCaption.classList.remove('show');
  }

  updateHud(state: HudState): void {
    const time = formatTime(state.timeLeft);
    const points = formatScore(state.score);
    const progress = Math.round(Math.max(0, Math.min(1, state.progress)) * 100);
    const comboVisible = state.combo >= 2;
    const key = `${time}|${points}|${state.stageName}|${state.zone}|${progress}|${comboVisible ? state.combo : 0}`;
    if (key === this.lastHud) return;
    this.lastHud = key;
    this.timer.textContent = time;
    this.score.textContent = points;
    this.stage.textContent = state.stageName;
    this.zone.textContent = state.zone;
    this.progress.style.width = `${progress}%`;
    this.timerBox.classList.toggle('warning', state.timeLeft <= 10 && state.timeLeft > 0);
    this.combo.classList.toggle('hidden', !comboVisible);
    if (comboVisible) this.combo.textContent = `x${state.combo} COMBO`;
  }

  showStageBanner(kicker: string, name: string, sub: string): void {
    window.clearTimeout(this.phaseTimer);
    this.phaseKicker.textContent = kicker;
    this.phaseName.textContent = name.toUpperCase();
    this.phaseSub.textContent = sub.toUpperCase();
    this.phaseBanner.classList.remove('hidden', 'show');
    requestAnimationFrame(() => this.phaseBanner.classList.add('show'));
    this.phaseTimer = window.setTimeout(() => {
      this.phaseBanner.classList.remove('show');
      window.setTimeout(() => this.phaseBanner.classList.add('hidden'), 320);
    }, 1900);
  }

  showToast(text: string): void {
    window.clearTimeout(this.toastTimer);
    this.toast.textContent = text;
    this.toast.classList.remove('hidden');
    requestAnimationFrame(() => this.toast.classList.add('show'));
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove('show');
      window.setTimeout(() => this.toast.classList.add('hidden'), 260);
    }, 1600);
  }

  spawnScorePopup(text: string, x: number, y: number, big: boolean): void {
    if (this.fxLayer.childElementCount > 18) return;
    const element = document.createElement('span');
    element.className = `score-pop${big ? ' big' : ''}`;
    element.textContent = text;
    element.style.left = `${Math.max(30, Math.min(window.innerWidth - 30, x))}px`;
    element.style.top = `${Math.max(66, Math.min(window.innerHeight - 60, y))}px`;
    this.fxLayer.append(element);
    window.setTimeout(() => element.remove(), 800);
  }

  showTutorial(): void {
    this.tutorial.classList.remove('hidden');
  }

  hideTutorial(): void {
    this.tutorial.classList.add('hidden');
  }

  enableSkip(visible: boolean): void {
    this.skipButton.classList.toggle('hidden', !visible);
  }

  showIntroCaption(text: string, duration = 1200): void {
    window.clearTimeout(this.captionTimer);
    this.introCaption.textContent = text;
    this.introCaption.classList.remove('show');
    requestAnimationFrame(() => this.introCaption.classList.add('show'));
    this.captionTimer = window.setTimeout(() => {
      this.introCaption.classList.remove('show');
    }, duration);
  }

  setOrientation(visible: boolean): void {
    this.orientation.classList.toggle('hidden', !visible);
  }

  private animateNumber(element: HTMLElement, target: number): void {
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      element.textContent = formatScore(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else element.textContent = formatScore(target);
    };
    requestAnimationFrame(tick);
  }
}
