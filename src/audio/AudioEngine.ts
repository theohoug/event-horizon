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
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
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

    try {
      this.ctx = new AudioContext({ sampleRate: 44100 });
    } catch {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
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
    this.masterGain.connect(this.stereoPanner);

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

    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 4);

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
    this.binauralOscLeft.frequency.value = 200;
    const leftGain = this.ctx.createGain();
    leftGain.gain.value = 0.06;
    this.binauralOscLeft.connect(leftGain);
    leftGain.connect(merger, 0, 0);
    this.binauralOscLeft.start();

    this.binauralOscRight = this.ctx.createOscillator();
    this.binauralOscRight.type = 'sine';
    this.binauralOscRight.frequency.value = 204;
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
      const beatFreq = 4 + scrollProgress * 6;
      this.binauralOscRight.frequency.linearRampToValueAtTime(
        200 + beatFreq,
        now + 0.2
      );
    }

    const noiseLevel = scrollProgress * scrollProgress * 0.15;
    this.noiseGain.gain.linearRampToValueAtTime(noiseLevel, now + 0.1);
    if (this.noiseFilter) {
      const filterFreq = 60 + scrollProgress * 300;
      this.noiseFilter.frequency.linearRampToValueAtTime(filterFreq, now + 0.1);
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
      this.masterGain.gain.linearRampToValueAtTime(0.55 * (1 - silenceAmount * 0.95), now + 0.3);
    }

    const velocityFactor = Math.min(Math.abs(scrollVelocity) * 0.02, 1.0);
    const detuneAmount = scrollVelocity * -8;
    this.droneOscillators.forEach((osc, i) => {
      if (i < this.droneGains.length) {
        osc.detune.linearRampToValueAtTime(
          detuneAmount + scrollProgress * -50 + Math.sin(now * 0.2 + i) * 2,
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
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 2.5);
    gain.gain.setValueAtTime(0, now + 2.8);
    source.connect(gain).connect(this.sfxGain);
    source.start(now);
    source.stop(now + 3);
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
    this.masterGain.gain.linearRampToValueAtTime(
      muted ? 0 : 0.55,
      this.ctx.currentTime + 0.3
    );
  }

  destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.droneOscillators.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    this.droneGains.forEach((g) => { try { g.disconnect(); } catch {} });
    this.shepardOscillators.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    this.shepardGains.forEach((g) => { try { g.disconnect(); } catch {} });
    this.frissonOscillators.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    this.droneOscillators.length = 0;
    this.droneGains.length = 0;
    this.shepardOscillators.length = 0;
    this.shepardGains.length = 0;
    this.frissonOscillators.length = 0;
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
