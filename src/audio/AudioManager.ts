import { storage } from '../platform/storage';

type Wave = OscillatorType;

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  type?: Wave;
  duration: number;
  gain?: number;
  delay?: number;
  filter?: number;
  filterEnd?: number;
}

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 659.25, 587.33, 523.25];
const BASS = [130.81, 110, 87.31, 98];

export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private muted = storage.getMuted();
  private musicWanted = false;

  isMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 20;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.22;
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
      this.master.connect(this.compressor);
      this.compressor.connect(this.context.destination);
      this.buildNoise();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    storage.setMuted(muted);
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.72, now, 0.04);
    if (!muted && this.musicWanted) {
      this.startMusicScheduler();
    }
    if (muted) {
      this.stopMusicScheduler();
    }
  }

  private buildNoise(): void {
    if (!this.context) return;
    const length = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private get ready(): boolean {
    return !!this.context && !!this.master && this.context.state === 'running' && !this.muted;
  }

  private tone(options: ToneOptions): void {
    if (!this.ready || !this.context || !this.master) return;
    const context = this.context;
    const start = context.currentTime + (options.delay ?? 0);
    const oscillator = context.createOscillator();
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(Math.max(20, options.frequency), start);
    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.endFrequency),
        start + options.duration
      );
    }
    const gain = context.createGain();
    const peak = options.gain ?? 0.08;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
    let last: AudioNode = oscillator;
    if (options.filter !== undefined) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(options.filter, start);
      if (options.filterEnd !== undefined) {
        filter.frequency.exponentialRampToValueAtTime(options.filterEnd, start + options.duration);
      }
      last.connect(filter);
      last = filter;
    }
    last.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + options.duration + 0.03);
  }

  private noise(duration: number, gainValue: number, filter: number, endFilter: number, delay = 0): void {
    if (!this.ready || !this.context || !this.master || !this.noiseBuffer) return;
    const context = this.context;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filterNode = context.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(filter, start);
    filterNode.frequency.exponentialRampToValueAtTime(Math.max(40, endFilter), start + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filterNode);
    filterNode.connect(gain);
    gain.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  hop(strength: number): void {
    const pitch = 185 + Math.random() * 45 - strength * 22;
    this.tone({
      frequency: pitch,
      endFrequency: pitch * 1.85,
      type: 'triangle',
      duration: 0.11,
      gain: 0.055 + strength * 0.02,
      filter: 1900,
      filterEnd: 900
    });
    this.tone({
      frequency: pitch * 0.5,
      endFrequency: pitch * 0.9,
      type: 'sine',
      duration: 0.095,
      gain: 0.045,
      delay: 0.008
    });
  }

  eat(tier: number, combo: number): void {
    const pitch = Math.max(120, 310 - tier * 17 + Math.min(combo, 8) * 15);
    this.tone({
      frequency: pitch,
      endFrequency: pitch * 0.42,
      type: 'sine',
      duration: 0.09,
      gain: 0.075
    });
    this.tone({
      frequency: pitch * 1.9,
      endFrequency: pitch * 0.8,
      type: 'triangle',
      duration: 0.055,
      gain: 0.035,
      delay: 0.012
    });
    this.noise(0.045, 0.022, 1400, 400);
  }

  bounce(): void {
    this.tone({
      frequency: 120,
      endFrequency: 42,
      type: 'sine',
      duration: 0.28,
      gain: 0.13
    });
    this.tone({
      frequency: 250,
      endFrequency: 160,
      type: 'triangle',
      duration: 0.16,
      gain: 0.04,
      delay: 0.02
    });
    this.noise(0.13, 0.06, 500, 100);
  }

  stageUp(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        endFrequency: frequency * 1.02,
        type: 'triangle',
        duration: 0.16,
        gain: 0.07,
        delay: index * 0.085
      });
    });
    this.noise(0.28, 0.035, 6000, 800, 0.12);
  }

  countdown(last = false): void {
    this.tone({
      frequency: last ? 1040 : 760,
      endFrequency: last ? 980 : 700,
      type: 'triangle',
      duration: 0.08,
      gain: 0.055
    });
  }

  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        type: 'triangle',
        duration: 0.24,
        gain: 0.08,
        delay: index * 0.11
      });
    });
    this.noise(0.55, 0.04, 8000, 1200, 0.2);
  }

  lose(): void {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        endFrequency: frequency * 0.96,
        type: 'sawtooth',
        duration: 0.22,
        gain: 0.035,
        filter: 900,
        delay: index * 0.12
      });
    });
  }

  ui(): void {
    this.tone({
      frequency: 620,
      endFrequency: 820,
      type: 'sine',
      duration: 0.055,
      gain: 0.045
    });
  }

  moo(): void {
    if (!this.ready || !this.context) return;
    const context = this.context;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(128, start);
    oscillator.frequency.linearRampToValueAtTime(142, start + 0.12);
    oscillator.frequency.linearRampToValueAtTime(96, start + 0.72);
    const lfo = context.createOscillator();
    lfo.frequency.value = 6.5;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 5.5;
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, start);
    filter.frequency.exponentialRampToValueAtTime(300, start + 0.8);
    const formant = context.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = 380;
    formant.Q.value = 1.4;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.11, start + 0.06);
    gain.gain.setValueAtTime(0.1, start + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.85);
    oscillator.connect(filter);
    filter.connect(formant);
    formant.connect(gain);
    gain.connect(this.master!);
    oscillator.start(start);
    lfo.start(start);
    oscillator.stop(start + 0.9);
    lfo.stop(start + 0.9);
    this.noise(0.5, 0.02, 700, 220, 0.04);
  }

  strain(): void {
    this.tone({
      frequency: 82,
      endFrequency: 52,
      type: 'sawtooth',
      duration: 0.38,
      gain: 0.055,
      filter: 320
    });
    this.noise(0.36, 0.035, 240, 80);
  }

  plop(): void {
    this.tone({
      frequency: 96,
      endFrequency: 36,
      type: 'sine',
      duration: 0.24,
      gain: 0.14
    });
    this.noise(0.22, 0.09, 700, 90);
    this.tone({
      frequency: 190,
      endFrequency: 72,
      type: 'triangle',
      duration: 0.14,
      gain: 0.045,
      delay: 0.025
    });
  }

  sparkle(): void {
    [880, 1174.66, 1567.98].forEach((frequency, index) => {
      this.tone({
        frequency,
        type: 'sine',
        duration: 0.2,
        gain: 0.045,
        delay: index * 0.055
      });
    });
  }

  eyeOpen(): void {
    this.tone({
      frequency: 400,
      endFrequency: 980,
      type: 'sine',
      duration: 0.17,
      gain: 0.06
    });
    this.sparkle();
  }

  whoosh(): void {
    this.noise(0.35, 0.045, 400, 2800);
  }

  startMusic(): void {
    this.musicWanted = true;
    this.startMusicScheduler();
  }

  stopMusic(): void {
    this.musicWanted = false;
    this.stopMusicScheduler();
  }

  private startMusicScheduler(): void {
    if (!this.ready || this.musicTimer !== null) return;
    this.nextNoteTime = Math.max(this.nextNoteTime, this.context!.currentTime + 0.08);
    this.musicTimer = window.setInterval(this.scheduleMusic, 90);
  }

  private stopMusicScheduler(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic = (): void => {
    if (!this.ready || !this.context || !this.musicGain) {
      this.stopMusicScheduler();
      return;
    }
    const context = this.context;
    while (this.nextNoteTime < context.currentTime + 0.3) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += 0.2578;
      this.step = (this.step + 1) % 32;
    }
  };

  private scheduleStep(step: number, time: number): void {
    if (!this.context || !this.musicGain) return;
    const melody = PENTATONIC[step % PENTATONIC.length];
    if (step % 2 === 0 && step % 8 !== 6) {
      this.musicNote(melody * (step % 8 === 4 ? 2 : 1), time, 0.22, 0.034, 'triangle');
    }
    if (step % 4 === 0) {
      const bass = BASS[Math.floor(step / 8) % BASS.length];
      this.musicNote(bass, time, 0.48, 0.06, 'sine');
    }
    if (step % 8 === 3) {
      this.musicNote(melody * 1.5, time + 0.02, 0.12, 0.018, 'sine');
    }
  }

  private musicNote(frequency: number, time: number, duration: number, gainValue: number, type: Wave): void {
    if (!this.context || !this.musicGain) return;
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainValue, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(this.musicGain);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  suspend(): void {
    this.stopMusicScheduler();
    if (this.context && this.context.state === 'running') {
      void this.context.suspend();
    }
  }

  resume(): void {
    if (this.context && this.context.state === 'suspended') {
      void this.context.resume();
    }
    if (this.musicWanted) this.startMusicScheduler();
  }
}
