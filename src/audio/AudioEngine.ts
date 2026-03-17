/**
 * @file AudioEngine.ts
 * @description Web Audio API sound engine with layered synthesis:
 *   1. Sub-bass drone (ambient foundation with harmonic overtones)
 *   2. Shepard Tone (infinite descent illusion with Gaussian envelope)
 *   3. Binaural beats (theta waves, 4Hz difference)
 *   4. Gravitational hum (filtered noise that evolves with scroll)
 *   5. Frisson crescendo (choir pad at emotional peaks)
 *   6. Procedural SFX (particle impact, whoosh, rumble)
 * @author Cleanlystudio
 * @version 2.0.0
 */

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class AudioEngine {
  isAlteredMode = false;
  isHardcoreMode = false;
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private masterTarget = 0.55;
  private bitCrusher: WaveShaperNode | null = null;
  private droneGain!: GainNode;
  private shepardGain!: GainNode;
  private binauralGain!: GainNode;
  private noiseGain!: GainNode;
  private frissonGain!: GainNode;
  private sfxGain!: GainNode;
  private compressor!: DynamicsCompressorNode;

  private droneOscillators: OscillatorNode[] = [];
  private droneGains: GainNode[] = [];
  private shepardOscillators: OscillatorNode[] = [];
  private shepardGains: GainNode[] = [];
  private binauralOscLeft: OscillatorNode | null = null;
  private binauralOscRight: OscillatorNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter!: BiquadFilterNode;
  private frissonOscillators: OscillatorNode[] = [];

  private heartbeatGain!: GainNode;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeatBpm = 0;
  private isPlaying = false;
  private lastFrissonScroll = -1;
  private frissonTriggered = new Set<number>();
  private stereoPanner!: StereoPannerNode;
  private targetPan = 0;
  private currentPan = 0;
  private lastWhooshTime = 0;

  async init() {
    if (this.ctx) return;

    this.ctx = new AudioContext({ sampleRate: 44100 });
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.ctx.destination);

    this.stereoPanner = this.ctx.createStereoPanner();
    this.stereoPanner.pan.value = 0;
    this.stereoPanner.connect(this.compressor);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    if (this.isHardcoreMode) {
      this.bitCrusher = this.ctx.createWaveShaper();
      const bits = 6;
      const n = Math.pow(2, bits);
      const samples = 8192;
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = Math.round(x * n) / n;
      }
      this.bitCrusher.curve = curve;
      const crusherGain = this.ctx.createGain();
      crusherGain.gain.value = 0.15;
      const dryGain = this.ctx.createGain();
      dryGain.gain.value = 0.85;
      const merger = this.ctx.createGain();
      this.masterGain.connect(this.bitCrusher);
      this.bitCrusher.connect(crusherGain);
      crusherGain.connect(merger);
      this.masterGain.connect(dryGain);
      dryGain.connect(merger);
      merger.connect(this.stereoPanner);
    } else {
      this.masterGain.connect(this.stereoPanner);
    }

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.12;
    this.droneGain.connect(this.masterGain);

    this.shepardGain = this.ctx.createGain();
    this.shepardGain.gain.value = 0;
    this.shepardGain.connect(this.masterGain);

    this.binauralGain = this.ctx.createGain();
    this.binauralGain.gain.value = 0;
    this.binauralGain.connect(this.masterGain);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseGain.connect(this.masterGain);

    this.frissonGain = this.ctx.createGain();
    this.frissonGain.gain.value = 0;
    this.frissonGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.25;
    this.sfxGain.connect(this.masterGain);

    this.heartbeatGain = this.ctx.createGain();
    this.heartbeatGain.gain.value = 0;
    this.heartbeatGain.connect(this.masterGain);
  }

  async start() {
    await this.init();
    if (!this.ctx || this.isPlaying) return;

    this.isPlaying = true;

    this.masterTarget = this.isHardcoreMode ? 0.35 : this.isAlteredMode ? 0.42 : 0.55;
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(this.masterTarget, this.ctx.currentTime + 4);

    this.startDrone();
    this.startShepard();
    this.startBinaural();
    this.startGravitationalNoise();
  }

  private startDrone() {
    if (!this.ctx) return;

    const harmonics = [
      { freq: 27.5, gain: 0.35, type: 'sine' as OscillatorType },
      { freq: 41.2, gain: 0.2, type: 'sine' as OscillatorType },
      { freq: 55, gain: 0.25, type: 'sine' as OscillatorType },
      { freq: 82.4, gain: 0.12, type: 'triangle' as OscillatorType },
      { freq: 110, gain: 0.06, type: 'sine' as OscillatorType },
    ];

    harmonics.forEach((h) => {
      const osc = this.ctx!.createOscillator();
      osc.type = h.type;
      osc.frequency.value = h.freq;

      const gain = this.ctx!.createGain();
      gain.gain.value = h.gain;

      if (this.isHardcoreMode) osc.detune.value = -400;
      else if (this.isAlteredMode) osc.detune.value = -200;
      osc.connect(gain);
      gain.connect(this.droneGain);
      osc.start();

      this.droneOscillators.push(osc);
      this.droneGains.push(gain);
    });

    const lfoOsc = this.ctx.createOscillator();
    lfoOsc.type = 'sine';
    lfoOsc.frequency.value = 0.04;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfoOsc.connect(lfoGain);
    lfoGain.connect(this.droneGain.gain);
    lfoOsc.start();
    this.droneOscillators.push(lfoOsc);
  }

  private startShepard() {
    if (!this.ctx) return;

    const baseFreq = 27.5;
    const numOctaves = 8;

    for (let i = 0; i < numOctaves; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * Math.pow(2, i);

      const gain = this.ctx.createGain();
      const normalizedPos = i / (numOctaves - 1);
      const envDelta = (normalizedPos - 0.5) * 3.0;
      const envelope = Math.exp(-envDelta * envDelta);
      gain.gain.value = envelope * 0.1;

      osc.connect(gain);
      gain.connect(this.shepardGain);
      osc.start();

      this.shepardOscillators.push(osc);
      this.shepardGains.push(gain);
    }
  }

  private startBinaural() {
    if (!this.ctx) return;

    const merger = this.ctx.createChannelMerger(2);
    merger.connect(this.binauralGain);

    this.binauralOscLeft = this.ctx.createOscillator();
    this.binauralOscLeft.type = 'sine';
    this.binauralOscLeft.frequency.value = this.isHardcoreMode ? 160 : this.isAlteredMode ? 180 : 200;
    const leftGain = this.ctx.createGain();
    leftGain.gain.value = 0.06;
    this.binauralOscLeft.connect(leftGain);
    leftGain.connect(merger, 0, 0);
    this.binauralOscLeft.start();

    this.binauralOscRight = this.ctx.createOscillator();
    this.binauralOscRight.type = 'sine';
    this.binauralOscRight.frequency.value = this.isHardcoreMode ? 173 : this.isAlteredMode ? 187 : 204;
    const rightGain = this.ctx.createGain();
    rightGain.gain.value = 0.06;
    this.binauralOscRight.connect(rightGain);
    rightGain.connect(merger, 0, 1);
    this.binauralOscRight.start();
  }

  private startGravitationalNoise() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.value = 80;
    this.noiseFilter.Q.value = 8;

    const noiseReverb = this.ctx.createConvolver();
    const reverbLength = this.ctx.sampleRate * 3;
    const reverbBuffer = this.ctx.createBuffer(2, reverbLength, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const chData = reverbBuffer.getChannelData(ch);
      for (let i = 0; i < reverbLength; i++) {
        chData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 2.5);
      }
    }
    noiseReverb.buffer = reverbBuffer;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(noiseReverb);
    noiseReverb.connect(this.noiseGain);
    this.noiseSource.start();
  }

  private triggerFrisson(scrollPoint: number) {
    if (!this.ctx || !this.isPlaying) return;
    if (this.frissonTriggered.has(scrollPoint)) return;
    this.frissonTriggered.add(scrollPoint);

    const now = this.ctx.currentTime;
    const baseFreqs = [261.6, 329.6, 392.0, 523.3, 659.3];

    baseFreqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 1.5 + i * 0.3);
      gain.gain.linearRampToValueAtTime(0, now + 4.0 + i * 0.3);

      osc.connect(gain);
      gain.connect(this.frissonGain);
      osc.start(now);
      osc.stop(now + 5.0);

      this.frissonOscillators.push(osc);
    });

    this.frissonGain.gain.setValueAtTime(this.frissonGain.gain.value, now);
    this.frissonGain.gain.linearRampToValueAtTime(0.8, now + 2);
    this.frissonGain.gain.linearRampToValueAtTime(0, now + 5);
  }

  private triggerHeartbeat() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.15);

    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain1);
    gain1.connect(this.heartbeatGain);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(45, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(25, now + 0.3);

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.08, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc2.connect(gain2);
    gain2.connect(this.heartbeatGain);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
  }

  triggerImpact() {
    if (!this.ctx || !this.isPlaying) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 + Math.random() * 1500, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  triggerWhoosh(intensity: number) {
    if (!this.ctx || !this.isPlaying) return;
    const elapsed = performance.now() - this.lastWhooshTime;
    if (elapsed < 250) return;
    this.lastWhooshTime = performance.now();

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.linearRampToValueAtTime(2000 * intensity, now + 0.15);
    filter.frequency.linearRampToValueAtTime(100, now + 0.6);
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08 * intensity, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + 0.6);
  }

  setMousePan(mouseX: number) {
    this.targetPan = (mouseX - 0.5) * 0.3;
  }

  update(scrollProgress: number, scrollVelocity: number) {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;

    this.currentPan += (this.targetPan - this.currentPan) * 0.05;
    const panIntensity = Math.min(scrollProgress * 2, 1);
    this.stereoPanner.pan.linearRampToValueAtTime(this.currentPan * panIntensity, now + 0.05);

    const voidDipDelta = (scrollProgress - 0.88) * 12.0;
    const voidDip = 1.0 - Math.exp(-voidDipDelta * voidDipDelta) * 0.6;
    const droneLevel = (0.08 + scrollProgress * 0.35) * voidDip;
    this.droneGain.gain.linearRampToValueAtTime(droneLevel, now + 0.1);


    const shepardLevel = 0.03 + scrollProgress * 0.3;
    this.shepardGain.gain.linearRampToValueAtTime(shepardLevel, now + 0.1);

    const baseFreq = 27.5;
    const shepardShift = scrollProgress * 3.0;
    this.shepardOscillators.forEach((osc, i) => {
      const shiftedOctave = i - shepardShift;
      const wrappedOctave = ((shiftedOctave % 8) + 8) % 8;
      const freq = baseFreq * Math.pow(2, wrappedOctave);

      const normalizedPos = wrappedOctave / 7;
      const envDelta = (normalizedPos - 0.5) * 3.0;
      const envelope = Math.exp(-envDelta * envDelta);

      osc.frequency.linearRampToValueAtTime(Math.max(20, freq), now + 0.15);
      if (i < this.shepardGains.length) {
        this.shepardGains[i].gain.linearRampToValueAtTime(envelope * 0.1, now + 0.15);
      }
    });

    const binauralActive = scrollProgress > 0.2 && scrollProgress < 0.8;
    const binauralLevel = binauralActive ? 0.4 + scrollProgress * 0.3 : 0;
    this.binauralGain.gain.linearRampToValueAtTime(binauralLevel, now + 0.5);

    if (this.binauralOscLeft && this.binauralOscRight) {
      const binauralBase = this.isHardcoreMode ? 160 : this.isAlteredMode ? 180 : 200;
      const beatFreq = (this.isHardcoreMode ? 13 : this.isAlteredMode ? 7 : 4) + scrollProgress * 6;
      this.binauralOscRight.frequency.linearRampToValueAtTime(
        binauralBase + beatFreq,
        now + 0.2
      );
    }

    const noiseMult = this.isHardcoreMode ? 2.5 : this.isAlteredMode ? 1.5 : 1.0;
    const noiseLevel = scrollProgress * scrollProgress * 0.15 * noiseMult;
    this.noiseGain.gain.linearRampToValueAtTime(noiseLevel, now + 0.1);
    if (this.noiseFilter) {
      const filterBoost = this.isHardcoreMode ? 200 : this.isAlteredMode ? 400 : 300;
      const filterFreq = 60 + scrollProgress * filterBoost;
      this.noiseFilter.frequency.linearRampToValueAtTime(filterFreq, now + 0.1);
    }

    const dropoutChance = this.isHardcoreMode ? 0.006 : this.isAlteredMode ? 0.002 : 0;
    if (dropoutChance > 0 && Math.random() < dropoutChance) {
      this.masterGain.gain.setValueAtTime(0, now);
      this.masterGain.gain.setValueAtTime(this.masterTarget, now + 0.08 + Math.random() * 0.12);
    }

    if (this.isHardcoreMode && Math.random() < 0.004) {
      const stutterCount = 3 + Math.floor(Math.random() * 3);
      const duration = (40 + Math.random() * 100) / 1000;
      const interval = duration / stutterCount;
      for (let s = 0; s < stutterCount; s++) {
        this.masterGain.gain.setValueAtTime(s % 2 === 0 ? 0 : this.masterTarget, now + s * interval);
      }
      this.masterGain.gain.setValueAtTime(this.masterTarget, now + duration);
    }

    if (scrollProgress > 0.15 && scrollProgress < 0.20) this.triggerFrisson(1);
    if (scrollProgress > 0.33 && scrollProgress < 0.38) this.triggerFrisson(2);
    if (scrollProgress > 0.55 && scrollProgress < 0.60) this.triggerFrisson(3);
    if (scrollProgress > 0.75 && scrollProgress < 0.80) this.triggerFrisson(4);
    if (scrollProgress > 0.90 && scrollProgress < 0.94) this.triggerFrisson(5);

    const finalCrescendo = smoothstep(0.88, 0.96, scrollProgress);
    const finalSilence = smoothstep(0.96, 1.0, scrollProgress);
    if (finalCrescendo > 0.01 && finalSilence < 0.99) {
      const crescendoLevel = finalCrescendo * 0.15 * (1 - finalSilence);
      this.frissonGain.gain.linearRampToValueAtTime(crescendoLevel, now + 0.2);
      this.droneGain.gain.linearRampToValueAtTime(droneLevel * (1 + finalCrescendo * 0.8) * (1 - finalSilence), now + 0.1);
    }

    if (finalSilence > 0.01) {
      const silenceAmount = finalSilence * finalSilence;
      this.masterGain.gain.linearRampToValueAtTime(this.masterTarget * (1 - silenceAmount * 0.95), now + 0.3);
    }

    const velocityFactor = Math.min(Math.abs(scrollVelocity) * 0.02, 1.0);
    const detuneAmount = scrollVelocity * -8;
    const alteredDetuneOffset = this.isHardcoreMode ? -400 : this.isAlteredMode ? -200 : 0;
    this.droneOscillators.forEach((osc, i) => {
      if (i < this.droneGains.length) {
        osc.detune.linearRampToValueAtTime(
          alteredDetuneOffset + detuneAmount + scrollProgress * -50 + Math.sin(now * 0.2 + i) * 2,
          now + 0.1
        );
      }
    });

    this.shepardOscillators.forEach((osc) => {
      const currentDetune = detuneAmount * 0.5;
      osc.detune.linearRampToValueAtTime(currentDetune, now + 0.15);
    });

    if (Math.abs(scrollVelocity) > 2) {
      this.triggerWhoosh(Math.min(Math.abs(scrollVelocity) * 0.1, 1.0));
    }

    const heartbeatActive = scrollProgress > 0.35 && scrollProgress < 0.95;
    if (heartbeatActive) {
      const hbBase = (scrollProgress - 0.35) / 0.6;
      const heartbeatVolume = hbBase * Math.sqrt(hbBase) * 0.7;
      this.heartbeatGain.gain.linearRampToValueAtTime(heartbeatVolume * voidDip, now + 0.1);

      const bpm = 50 + (scrollProgress - 0.35) * 120;
      const intervalMs = 60000 / bpm;

      if (!this.heartbeatInterval || Math.abs(bpm - this.lastHeartbeatBpm) > 5) {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.lastHeartbeatBpm = bpm;
        this.heartbeatInterval = setInterval(() => this.triggerHeartbeat(), intervalMs);
      }
    } else {
      this.heartbeatGain.gain.linearRampToValueAtTime(0, now + 0.5);
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        this.lastHeartbeatBpm = 0;
      }
    }
  }

  triggerTextRevealShimmer() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const freqs = [2000, 3000, 4500];
    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.03, now + i * 0.04 + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.4 + i * 0.04);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.5 + i * 0.04);
    });
  }

  triggerChapterTransition() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const chord = [261.6, 329.6, 392.0];
    chord.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.8);
      gain.gain.linearRampToValueAtTime(0, now + 2.5);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 2.6);
    });
  }

  triggerPointOfNoReturn() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 3);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 3);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 3.1);
  }

  triggerSingularity() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;

    this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, now);
    this.sfxGain.gain.linearRampToValueAtTime(0.7, now + 0.05);
    this.sfxGain.gain.linearRampToValueAtTime(0.25, now + 4.0);

    const subBoom = this.ctx.createOscillator();
    subBoom.type = 'sine';
    subBoom.frequency.setValueAtTime(80, now);
    subBoom.frequency.exponentialRampToValueAtTime(18, now + 2.5);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.linearRampToValueAtTime(1.0, now + 0.08);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    subBoom.connect(subGain).connect(this.sfxGain);
    subBoom.start(now);
    subBoom.stop(now + 3.7);

    const impact = this.ctx.createOscillator();
    impact.type = 'sawtooth';
    impact.frequency.setValueAtTime(150, now);
    impact.frequency.exponentialRampToValueAtTime(25, now + 1.0);
    const impactGain = this.ctx.createGain();
    impactGain.gain.setValueAtTime(0.6, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    const impactFilter = this.ctx.createBiquadFilter();
    impactFilter.type = 'lowpass';
    impactFilter.frequency.setValueAtTime(1200, now);
    impactFilter.frequency.exponentialRampToValueAtTime(60, now + 1.8);
    impact.connect(impactFilter).connect(impactGain).connect(this.sfxGain);
    impact.start(now);
    impact.stop(now + 2.0);

    const crack = this.ctx.createOscillator();
    crack.type = 'square';
    crack.frequency.setValueAtTime(400, now);
    crack.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.4, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    crack.connect(crackGain).connect(this.sfxGain);
    crack.start(now);
    crack.stop(now + 0.5);

    const noiseLen = this.ctx.sampleRate * 5;
    const noiseBuf = this.ctx.createBuffer(2, noiseLen, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = noiseBuf.getChannelData(ch);
      for (let i = 0; i < noiseLen; i++) d[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuf;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.03);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
    const noiseFilt = this.ctx.createBiquadFilter();
    noiseFilt.type = 'bandpass';
    noiseFilt.frequency.setValueAtTime(600, now);
    noiseFilt.frequency.exponentialRampToValueAtTime(40, now + 3.5);
    noiseFilt.Q.setValueAtTime(0.7, now);
    noiseSource.connect(noiseFilt).connect(noiseGain).connect(this.sfxGain);
    noiseSource.start(now);
    noiseSource.stop(now + 5.0);

    for (let i = 0; i < 4; i++) {
      const shimmer = this.ctx.createOscillator();
      shimmer.type = 'sine';
      const freq = [1800, 2600, 3600, 5000][i];
      shimmer.frequency.setValueAtTime(freq, now + 0.2);
      shimmer.frequency.exponentialRampToValueAtTime(freq * 0.3, now + 4.5);
      const sGain = this.ctx.createGain();
      sGain.gain.setValueAtTime(0, now);
      sGain.gain.linearRampToValueAtTime(0.05, now + 0.4);
      sGain.gain.linearRampToValueAtTime(0.08, now + 1.5);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 5.5);
      shimmer.connect(sGain).connect(this.sfxGain);
      shimmer.start(now + 0.2);
      shimmer.stop(now + 5.7);
    }

    const rumble = this.ctx.createOscillator();
    rumble.type = 'triangle';
    rumble.frequency.setValueAtTime(40, now + 0.5);
    rumble.frequency.linearRampToValueAtTime(20, now + 5.0);
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.3, now + 1.0);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 6.5);
    rumble.connect(rumbleGain).connect(this.sfxGain);
    rumble.start(now + 0.3);
    rumble.stop(now + 7.0);
  }

  triggerEnterPulse() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(40, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 1.5);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.08, now + 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    sub.connect(subGain).connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 1.6);
    [1200, 1800, 2400].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, now + 0.05 + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.015, now + 0.15 + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now + 0.05 + i * 0.03);
      osc.stop(now + 0.9);
    });
  }

  triggerUIHover() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  setMuted(muted: boolean) {
    if (!this.ctx) return;
    const target = muted ? 0 : (this.isHardcoreMode ? 0.35 : this.isAlteredMode ? 0.42 : 0.55);
    this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.3);
  }

  resetMasterGain() {
    if (!this.ctx) return;
    this.masterTarget = this.isHardcoreMode ? 0.35 : this.isAlteredMode ? 0.42 : 0.55;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(this.masterTarget, this.ctx.currentTime + 1.5);
  }

  destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.droneOscillators.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    this.droneGains.forEach((g) => { try { g.disconnect(); } catch {} });
    this.shepardOscillators.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    this.shepardGains.forEach((g) => { try { g.disconnect(); } catch {} });
    this.frissonOscillators.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    try { this.binauralOscLeft?.stop(); this.binauralOscLeft?.disconnect(); } catch {}
    try { this.binauralOscRight?.stop(); this.binauralOscRight?.disconnect(); } catch {}
    try { this.noiseSource?.stop(); this.noiseSource?.disconnect(); } catch {}
    try { this.noiseFilter?.disconnect(); } catch {}
    try { this.stereoPanner?.disconnect(); } catch {}
    try { this.droneGain?.disconnect(); } catch {}
    try { this.shepardGain?.disconnect(); } catch {}
    try { this.binauralGain?.disconnect(); } catch {}
    try { this.noiseGain?.disconnect(); } catch {}
    try { this.frissonGain?.disconnect(); } catch {}
    try { this.sfxGain?.disconnect(); } catch {}
    try { this.heartbeatGain?.disconnect(); } catch {}
    try { this.compressor?.disconnect(); } catch {}
    try { this.masterGain?.disconnect(); } catch {}
    this.ctx?.close();
    this.ctx = null;
    this.isPlaying = false;
    this.frissonTriggered.clear();
  }
}
