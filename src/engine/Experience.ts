/**
 * @file Experience.ts
 * @description Main experience controller — orchestrates renderer, world, narrative
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as THREE from 'three';
import { PostProcessing } from './PostProcessing';
import { disposeScene } from './disposeScene';
import { BlackHole } from '../world/BlackHole';
import { GPGPUParticles } from '../world/GPGPUParticles';
import { Timeline } from '../narrative/Timeline';
import { TextReveal } from '../narrative/TextReveal';
import { AudioEngine } from '../audio/AudioEngine';
import { Haptics } from '../ui/Haptics';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ExperienceState {
  scroll: number;
  scrollVelocity: number;
  time: number;
  deltaTime: number;
  mouse: THREE.Vector2;
  mouseSmooth: THREE.Vector2;
  isReady: boolean;
  soundEnabled: boolean;
  quality: 'ultra' | 'high' | 'medium';
  introProgress: number;
  introActive: boolean;
}

export class Experience {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private postProcessing!: PostProcessing;
  private blackHole!: BlackHole;
  private particles!: GPGPUParticles;
  private timeline!: Timeline;
  private textReveal!: TextReveal;
  private audio!: AudioEngine;
  private haptics!: Haptics;
  private lenis!: Lenis;
  private clock: THREE.Clock;
  private state: ExperienceState;
  private rafId: number = 0;
  private cursor: HTMLDivElement | null = null;
  private chapterFlash: number = 0;
  private lastChapterIndex: number = -1;
  private cursorRafId: number = 0;
  private overlayEl: HTMLElement | null = null;
  private navEl: HTMLElement | null = null;
  private ringEl: HTMLElement | null = null;
  private navTrackFillEl: HTMLElement | null = null;
  private hudContainerEl: HTMLElement | null = null;
  private creditsEl: HTMLElement | null = null;
  private themeColorMeta: HTMLMetaElement | null = null;
  private boundHandlers: { target: EventTarget; event: string; handler: EventListener }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    this.state = {
      scroll: 0,
      scrollVelocity: 0,
      time: 0,
      deltaTime: 0,
      mouse: new THREE.Vector2(0.5, 0.5),
      mouseSmooth: new THREE.Vector2(0.5, 0.5),
      isReady: false,
      soundEnabled: false,
      quality: this.detectQuality(),
      introProgress: 0,
      introActive: false,
    };

    this.visitCount = parseInt(localStorage.getItem('eh_visits') || '0', 10);

    this.applyTimeOfDay();
    this.init().catch(() => {
      const loader = document.getElementById('loader');
      const loaderSub = document.getElementById('loader-sub');
      const loaderText = document.getElementById('loader-text');
      if (loaderText) loaderText.textContent = 'SIGNAL LOST';
      if (loaderSub) loaderSub.textContent = 'WebGL 2.0 required. Please update your browser or enable hardware acceleration.';
      if (loader) loader.classList.remove('hidden');
      const fill = document.getElementById('loader-bar-fill');
      if (fill) fill.style.width = '0%';
    });
  }

  private detectQuality(): 'ultra' | 'high' | 'medium' {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    const tempCanvas = document.createElement('canvas');
    const gl = tempCanvas.getContext('webgl2') || tempCanvas.getContext('webgl');
    if (!gl) return 'medium';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let gpuRenderer = '';
    if (debugInfo) {
      gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    }
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();

    if (isMobile) {
      if (gpuRenderer.includes('apple gpu') || gpuRenderer.includes('apple a1') || gpuRenderer.includes('apple m')) return 'high';
      if (gpuRenderer.includes('adreno 7') || gpuRenderer.includes('adreno 6') || gpuRenderer.includes('mali-g7')) return 'high';
      if (window.devicePixelRatio >= 3) return 'high';
      return 'medium';
    }

    if (gpuRenderer.includes('apple m') || gpuRenderer.includes('rtx') || gpuRenderer.includes('rx 7')) return 'ultra';
    if (gpuRenderer.includes('gtx') || gpuRenderer.includes('rx 6') || gpuRenderer.includes('intel arc')) return 'high';

    return 'high';
  }

  private readonly chapterConsoleMessages = [
    ['%c◈ CHAPTER 0 — YOU %c\nYou stand at the edge. The universe watches.', 'color:#00f5d4;font-size:14px;font-weight:bold;text-shadow:0 0 10px #00f5d4', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 1 — THE PULL %c\nGravity notices you. There is no ignoring it.', 'color:#00d4aa;font-size:14px;font-weight:bold;text-shadow:0 0 10px #00d4aa', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 2 — THE WARP %c\nSpacetime bends. Light follows curves you cannot see.', 'color:#00b4ff;font-size:14px;font-weight:bold;text-shadow:0 0 10px #00b4ff', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 3 — THE FALL %c\nYou crossed the boundary. The fall is eternal.', 'color:#6644ff;font-size:14px;font-weight:bold;text-shadow:0 0 10px #6644ff', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 4 — SPAGHETTIFICATION %c\nTidal forces stretch every atom. You become geometry.', 'color:#ff4488;font-size:14px;font-weight:bold;text-shadow:0 0 10px #ff4488', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 5 — TIME DILATION %c\nA second here is an eternity outside. Time forgets you.', 'color:#ff6644;font-size:14px;font-weight:bold;text-shadow:0 0 10px #ff6644', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 6 — SINGULARITY %c\nInfinite density. Zero volume. Physics surrenders.', 'color:#ff2222;font-size:14px;font-weight:bold;text-shadow:0 0 10px #ff2222', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 7 — THE VOID %c\nBeyond mathematics. Beyond language. Beyond.', 'color:#440066;font-size:14px;font-weight:bold;text-shadow:0 0 10px #440066', 'color:#ccc;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 8 — WHAT REMAINS %c\nInformation persists. You were here.', 'color:#ffffff;font-size:14px;font-weight:bold;text-shadow:0 0 10px #fff', 'color:#aaa;font-size:11px;font-style:italic'],
  ];

  private logChapter(index: number) {
    const msg = this.chapterConsoleMessages[index];
    if (msg) console.log(msg[0], msg[1], msg[2]);
  }

  private addTrackedListener(target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(event, handler, options);
    this.boundHandlers.push({ target, event, handler });
  }

  private applyTimeOfDay() {
    const hour = new Date().getHours();
    const root = document.documentElement;
    if (hour >= 5 && hour < 9) {
      root.style.setProperty('--tod-hue', '10');
      root.style.setProperty('--tod-warmth', '0.03');
    } else if (hour >= 17 && hour < 21) {
      root.style.setProperty('--tod-hue', '15');
      root.style.setProperty('--tod-warmth', '0.04');
    } else if (hour >= 21 || hour < 5) {
      root.style.setProperty('--tod-hue', '-5');
      root.style.setProperty('--tod-warmth', '0.02');
    } else {
      root.style.setProperty('--tod-hue', '0');
      root.style.setProperty('--tod-warmth', '0');
    }
  }

  private async init() {
    const isMobileDevice = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const qualityPresets = {
      ultra: { pixelRatio: Math.min(window.devicePixelRatio, 2), antialias: true },
      high: { pixelRatio: Math.min(window.devicePixelRatio, isMobileDevice ? 2 : 1.5), antialias: !isMobileDevice },
      medium: { pixelRatio: Math.min(window.devicePixelRatio, 1.5), antialias: false },
    };
    const preset = qualityPresets[this.state.quality];

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: preset.antialias,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setPixelRatio(preset.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x050505, 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.postProcessing = new PostProcessing(this.renderer, this.state.quality);

    this.blackHole = new BlackHole(this.postProcessing.bgScene, this.state.quality, preset.pixelRatio);
    this.particles = new GPGPUParticles(this.renderer, this.postProcessing.particleScene, this.state.quality, preset.pixelRatio);

    this.timeline = new Timeline();
    this.textReveal = new TextReveal();
    this.audio = new AudioEngine();
    this.haptics = new Haptics();
    this.setupLenis();
    this.setupMouse();
    this.setupHoldInteraction();
    this.setupCursor();
    this.setupKeyboard();
    this.setupResize();
    this.setupClickShockwave();
    this.setupMobileNav();

    await this.preload();

    this.overlayEl = document.getElementById('overlay');
    this.navEl = document.getElementById('chapter-nav');
    this.ringEl = document.getElementById('custom-cursor-ring');
    this.navTrackFillEl = document.getElementById('nav-track-fill');
    this.hudContainerEl = document.getElementById('data-hud');
    this.creditsEl = document.getElementById('credits');
    this.themeColorMeta = document.querySelector('meta[name="theme-color"]');

    this.state.isReady = true;
    this.onReady();
    this.animate();
  }

  private async preload() {
    const loaderFill = document.getElementById('loader-bar-fill');
    const loaderPct = document.getElementById('loader-pct');
    const loaderSub = document.getElementById('loader-sub');

    let displayPct = 0;
    const loaderBar = document.getElementById('loader-bar');
    const setProgress = (pct: number, label: string) => {
      const target = pct;
      const animatePct = () => {
        displayPct += (target - displayPct) * 0.15;
        if (Math.abs(displayPct - target) < 0.5) displayPct = target;
        const rounded = Math.round(displayPct);
        if (loaderFill) loaderFill.style.width = `${displayPct}%`;
        if (loaderPct) loaderPct.textContent = `${rounded}`;
        if (loaderBar) loaderBar.setAttribute('aria-valuenow', `${rounded}`);
        if (displayPct < target) requestAnimationFrame(animatePct);
      };
      animatePct();
      if (loaderSub) loaderSub.textContent = label;
    };

    setProgress(10, 'Initializing WebGL context...');
    await this.frame();

    setProgress(25, 'Compiling ray tracing shaders...');
    await this.frame();
    this.renderer.compile(this.postProcessing.bgScene, this.postProcessing.bgCamera);
    await this.frame();

    setProgress(45, 'Building GPGPU particle system...');
    await this.frame();
    this.renderer.compile(this.postProcessing.particleScene, this.postProcessing.particleCamera);
    await this.frame();

    setProgress(60, 'Warming up gravitational sim...');
    await this.frame();
    this.postProcessing.render();
    await this.frame();

    setProgress(75, 'Calibrating accretion disk...');
    await this.frame();

    setProgress(88, 'Synchronizing spacetime...');
    await new Promise<void>(r => setTimeout(r, 300));

    setProgress(100, 'Event horizon locked');
    await new Promise<void>(r => setTimeout(r, 400));
  }

  private frame(): Promise<void> {
    return new Promise(r => requestAnimationFrame(() => r()));
  }

  private onReady() {
    const loader = document.getElementById('loader');
    if (loader) {
      setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => {
          const soundPrompt = document.getElementById('sound-prompt');
          if (soundPrompt) soundPrompt.classList.add('visible');
          this.setupSoundPrompt();
        }, 600);
      }, 400);
    }
  }

  private setupSoundPrompt() {
    const prompt = document.getElementById('sound-prompt');
    const yesBtn = document.getElementById('sound-prompt-yes');
    const noBtn = document.getElementById('sound-prompt-no');
    const muteBtn = document.getElementById('mute-btn');

    const dismiss = async (withSound: boolean) => {
      this.state.soundEnabled = withSound;
      if (prompt) {
        prompt.classList.remove('visible');
        setTimeout(() => { prompt.style.display = 'none'; }, 500);
      }
      if (withSound) {
        await this.audio.start();
        if (muteBtn) muteBtn.classList.add('sound-on');
      }

      this.playIntroCinematic();
    };

    if (yesBtn) this.addTrackedListener(yesBtn, 'click', () => dismiss(true));
    if (noBtn) this.addTrackedListener(noBtn, 'click', () => dismiss(false));

    if (yesBtn) setTimeout(() => yesBtn.focus(), 100);

    const promptKeyHandler = (e: KeyboardEvent) => {
      if (!prompt || prompt.style.display === 'none') return;
      if (e.key === 'Enter') { dismiss(true); window.removeEventListener('keydown', promptKeyHandler); }
      if (e.key === 'Escape') { dismiss(false); window.removeEventListener('keydown', promptKeyHandler); }
      if (e.key === 'Tab' && yesBtn && noBtn) {
        e.preventDefault();
        const active = document.activeElement;
        (active === yesBtn ? noBtn : yesBtn).focus();
      }
    };
    this.addTrackedListener(window, 'keydown', promptKeyHandler as EventListener);

    const shareBtn = document.getElementById('share-btn');
    [yesBtn, noBtn, shareBtn].forEach((btn) => {
      if (btn) this.addTrackedListener(btn, 'mouseenter', () => {
        if (this.state.soundEnabled) this.audio.triggerUIHover();
      });
    });

    if (shareBtn) {
      this.addTrackedListener(shareBtn, 'click', async () => {
        const url = window.location.href;
        const shareData = {
          title: 'Event Horizon — An Interactive Journey Into a Black Hole',
          text: 'Experience the cosmic sublime. Scroll through 9 chapters into a black hole.',
          url,
        };
        if (navigator.share && navigator.canShare?.(shareData)) {
          try {
            await navigator.share(shareData);
          } catch {}
        } else {
          navigator.clipboard.writeText(url).then(() => {
            shareBtn.textContent = 'Link copied';
            shareBtn.classList.add('copied');
            setTimeout(() => {
              shareBtn.textContent = 'Share this journey';
              shareBtn.classList.remove('copied');
            }, 3000);
          }).catch(() => {
            shareBtn.textContent = url;
            setTimeout(() => { shareBtn.textContent = 'Share this journey'; }, 4000);
          });
        }
      });
    }

    const returnBtn = document.getElementById('return-btn');
    if (returnBtn) {
      this.addTrackedListener(returnBtn, 'click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      this.addTrackedListener(returnBtn, 'mouseenter', () => {
        if (this.state.soundEnabled) this.audio.triggerUIHover();
      });
    }

    if (muteBtn) {
      this.addTrackedListener(muteBtn, 'click', () => {
        this.state.soundEnabled = !this.state.soundEnabled;
        this.audio.setMuted(!this.state.soundEnabled);
        const iconOn = document.getElementById('mute-icon-on');
        const iconOff = document.getElementById('mute-icon-off');
        if (iconOn) iconOn.style.display = this.state.soundEnabled ? 'block' : 'none';
        if (iconOff) iconOff.style.display = this.state.soundEnabled ? 'none' : 'block';
        if (this.state.soundEnabled) muteBtn.classList.add('sound-on');
        else muteBtn.classList.remove('sound-on');
      });
    }
  }

  private playIntroCinematic() {
    const intro = document.getElementById('intro-cinematic');
    const titleContainer = document.getElementById('intro-title-container');
    const title = document.getElementById('intro-title');
    const subtitle = document.getElementById('intro-subtitle');
    const introLine = document.getElementById('intro-line');
    const muteBtn = document.getElementById('mute-btn');
    const dataHud = document.getElementById('data-hud');

    if (!intro || !titleContainer || !title) return;

    localStorage.setItem('eh_visits', String(this.visitCount + 1));

    const isMobileDevice = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const hintEl = document.getElementById('scroll-hint');
    if (hintEl && isMobileDevice) {
      const hintText = hintEl.querySelector('.scroll-text');
      if (hintText) hintText.textContent = 'Swipe to begin';
    }

    if (this.visitCount > 0) {
      intro.style.display = 'none';
      if (muteBtn) muteBtn.classList.add('visible');
      if (dataHud) dataHud.classList.add('visible');
      this.experienceStartTime = performance.now();
      this.timeline.start(this.state.soundEnabled);
      this.textReveal.start();
      this.state.introProgress = 1;
      this.state.introActive = false;
      if (hintEl) {
        setTimeout(() => hintEl.classList.add('visible'), 500);
        const hideHint = () => { hintEl.classList.remove('visible'); window.removeEventListener('scroll', hideHint); };
        window.addEventListener('scroll', hideHint, { once: true });
        this.scrollHintEl = hintEl;
      }
      return;
    }

    this.state.introActive = true;
    this.state.introProgress = 0;
    intro.classList.add('active');

    const titleText = 'EVENT HORIZON';
    title.innerHTML = '';
    title.style.opacity = '1';
    title.style.letterSpacing = '0.35em';
    title.style.filter = 'none';
    const letterSpans: HTMLElement[] = [];
    titleText.split('').forEach((ch) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform, opacity, filter';
      title.appendChild(span);
      letterSpans.push(span);
    });

    const onIntroComplete = () => {
      intro.classList.add('fade-out');
      intro.classList.remove('active');
      if (muteBtn) muteBtn.classList.add('visible');
      if (dataHud) dataHud.classList.add('visible');
      this.experienceStartTime = performance.now();
      this.timeline.start(this.state.soundEnabled);
      this.textReveal.start();
      if (hintEl) {
        setTimeout(() => hintEl.classList.add('visible'), 1500);
        const hideHint = () => { hintEl.classList.remove('visible'); window.removeEventListener('scroll', hideHint); };
        window.addEventListener('scroll', hideHint, { once: true });
        this.scrollHintEl = hintEl;
      }
      gsap.to(this.state, {
        introProgress: 1,
        duration: 2,
        ease: 'power2.out',
        onComplete: () => { this.state.introActive = false; intro.style.display = 'none'; },
      });
    };

    const tl = gsap.timeline({ onComplete: onIntroComplete });

    let introSkipped = false;
    const skipIntro = () => {
      if (introSkipped) return;
      introSkipped = true;
      tl.progress(1);
      window.removeEventListener('keydown', skipIntro);
      window.removeEventListener('click', skipIntro);
    };
    setTimeout(() => {
      window.addEventListener('keydown', skipIntro, { once: true });
      window.addEventListener('click', skipIntro, { once: true });
    }, 1000);

    tl.set(titleContainer, { opacity: 1, scale: 1 });

    letterSpans.forEach((span, i) => {
      const angle = (Math.random() - 0.5) * 360;
      const radius = 150 + Math.random() * 250;
      const startX = Math.cos(angle * Math.PI / 180) * radius;
      const startY = Math.sin(angle * Math.PI / 180) * radius;
      const startRot = (Math.random() - 0.5) * 180;
      const startScale = 0.3 + Math.random() * 0.5;
      const arriveTime = 0.05 + i * 0.06;
      const dur = 1.0 + Math.random() * 0.3;

      tl.fromTo(span, {
        x: startX,
        y: startY,
        rotation: startRot,
        scale: startScale,
        opacity: 0,
        filter: 'blur(12px)',
      }, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: dur,
        ease: 'back.out(1.2)',
        onComplete: () => {
          for (let p = 0; p < 6; p++) {
            const spark = document.createElement('div');
            spark.style.cssText = `position:absolute;width:2px;height:2px;border-radius:50%;background:rgba(0,245,212,0.8);box-shadow:0 0 4px rgba(0,245,212,0.6);pointer-events:none;z-index:100;`;
            const rect = span.getBoundingClientRect();
            const tcRect = titleContainer!.getBoundingClientRect();
            spark.style.left = `${rect.left - tcRect.left + rect.width * 0.5}px`;
            spark.style.top = `${rect.top - tcRect.top + rect.height * 0.5}px`;
            titleContainer!.appendChild(spark);
            const sa = Math.random() * Math.PI * 2;
            const sd = 20 + Math.random() * 40;
            gsap.to(spark, {
              x: Math.cos(sa) * sd,
              y: Math.sin(sa) * sd,
              opacity: 0,
              scale: 0,
              duration: 0.4 + Math.random() * 0.3,
              ease: 'power2.out',
              onComplete: () => spark.remove(),
            });
          }
        },
      }, arriveTime);
    });

    if (subtitle) {
      tl.fromTo(subtitle, {
        opacity: 0, y: 20, filter: 'blur(8px)',
      }, {
        opacity: 0.7, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out',
      }, 1.2);
    }

    if (introLine) {
      tl.to(introLine, { width: '120px', duration: 0.6, ease: 'power2.inOut' }, 1.3);
    }

    tl.to(this.state, { introProgress: 0.6, duration: 2.0, ease: 'power2.inOut' }, 0);

    letterSpans.forEach((span, i) => {
      tl.to(span, {
        y: -30 - Math.random() * 20,
        opacity: 0,
        filter: 'blur(8px)',
        scale: 0.7,
        rotation: (Math.random() - 0.5) * 40,
        duration: 0.6,
        ease: 'power2.in',
      }, 2.2 + i * 0.02);
    });

    if (subtitle) {
      tl.to(subtitle, { opacity: 0, filter: 'blur(6px)', duration: 0.5, ease: 'power2.in' }, 2.2);
    }
    if (introLine) {
      tl.to(introLine, { width: '0px', opacity: 0, duration: 0.4, ease: 'power2.in' }, 2.2);
    }

    tl.to(titleContainer, { opacity: 0, scale: 0.85, duration: 0.6, ease: 'power2.in' }, 2.5);
  }

  private setupLenis() {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    this.lenis = new Lenis({
      duration: isMobile ? 1.4 : 1.8,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: isMobile ? 1.8 : 1.0,
      infinite: false,
    });

    const progressFill = document.getElementById('progress-fill');
    const progressBar = document.getElementById('progress-bar');
    const progressTicks = progressBar ? Array.from(progressBar.querySelectorAll('.progress-tick')) : [];

    this.lenis.on('scroll', (e: { scroll: number; limit: number; velocity: number }) => {
      this.state.scroll = e.limit > 0 ? e.scroll / e.limit : 0;
      this.state.scrollVelocity = e.velocity;
      this.lastScrollActivity = performance.now();
      this.idleHintShown = false;

      if (this.state.scroll > 0.38 && this.state.scroll < 0.85 && e.velocity < -80) {
        this.showEscapeMessage();
      }

      ScrollTrigger.update();

      const overlayFade = this.state.scroll > 0.6 ? Math.max(0, 1 - (this.state.scroll - 0.6) / 0.2) : 1;
      document.documentElement.style.setProperty('--overlay-opacity', String(overlayFade));

      const pct = Math.round(this.state.scroll * 100);
      if (progressFill) {
        progressFill.style.width = `${pct}%`;
        const s = this.state.scroll;
        const r = Math.round(s < 0.4 ? 0 : Math.min(255, (s - 0.4) * 425));
        const g = Math.round(s < 0.4 ? 245 : Math.max(40, 245 - (s - 0.4) * 340));
        const b = Math.round(s < 0.4 ? 212 : Math.max(20, 212 - (s - 0.4) * 320));
        progressFill.style.background = `linear-gradient(90deg, rgba(${r},${g},${b},0.6), rgba(${r},${g},${b},1))`;
        progressFill.style.boxShadow = `0 0 6px rgba(${r},${g},${b},0.6), 0 0 12px rgba(${r},${g},${b},0.3)`;
      }
      if (progressBar) {
        progressBar.setAttribute('aria-valuenow', `${pct}`);
        progressBar.classList.add('show');
        clearTimeout(this.progressHideTimer);
        this.progressHideTimer = window.setTimeout(() => progressBar.classList.remove('show'), 2000);
        progressTicks.forEach((tick, i) => {
          const tickPos = (i + 1) / 9;
          tick.classList.toggle('passed', this.state.scroll >= tickPos);
        });
      }
    });

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop: (value?: number) => {
        if (typeof value === 'number') {
          this.lenis.scrollTo(value, { immediate: true });
        }
        return this.lenis.scroll;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
    });

    ScrollTrigger.defaults({ scroller: document.body });
  }

  private setupMouse() {
    this.addTrackedListener(window, 'mousemove', ((e: MouseEvent) => {
      this.state.mouse.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
    }) as EventListener);

    this.addTrackedListener(window, 'touchmove', ((e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.state.mouse.set(
          e.touches[0].clientX / window.innerWidth,
          1.0 - e.touches[0].clientY / window.innerHeight
        );
      }
    }) as EventListener, { passive: true });

    if ('DeviceOrientationEvent' in window) {
      this.addTrackedListener(window, 'deviceorientation', ((e: DeviceOrientationEvent) => {
        if (e.gamma !== null && e.beta !== null) {
          const gx = Math.max(-45, Math.min(45, e.gamma)) / 45;
          const gy = Math.max(-45, Math.min(45, e.beta - 45)) / 45;
          this.state.mouse.set(0.5 + gx * 0.4, 0.5 + gy * 0.4);
        }
      }) as EventListener, { passive: true });
    }
  }

  private setupHoldInteraction() {
    const onDown = () => {
      if (this.state.scroll > 0.25) this.isHolding = true;
    };
    const onUp = () => { this.isHolding = false; };

    this.addTrackedListener(window, 'mousedown', onDown as EventListener);
    this.addTrackedListener(window, 'mouseup', onUp as EventListener);
    this.addTrackedListener(window, 'touchstart', onDown as EventListener, { passive: true });
    this.addTrackedListener(window, 'touchend', onUp as EventListener, { passive: true });

    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      let touchHintShown = false;
      this.addTrackedListener(window, 'touchstart', (() => {
        if (touchHintShown || this.state.scroll < 0.05) return;
        touchHintShown = true;
        const hint = document.createElement('div');
        hint.style.cssText = 'position:fixed;bottom:6rem;left:50%;transform:translateX(-50%);z-index:50;font-family:var(--font-mono);font-size:0.55rem;color:rgba(0,245,212,0.4);letter-spacing:0.1em;pointer-events:none;opacity:0;transition:opacity 1s ease';
        hint.textContent = 'Double-tap for shockwave';
        document.body.appendChild(hint);
        requestAnimationFrame(() => { hint.style.opacity = '1'; });
        setTimeout(() => { hint.style.opacity = '0'; }, 4000);
        setTimeout(() => hint.remove(), 5500);
      }) as EventListener, { passive: true });
    }

    this.addTrackedListener(window, 'click', ((e: MouseEvent) => {
      if (this.state.scroll > 0.15) {
        const x = e.clientX / window.innerWidth;
        const y = 1.0 - e.clientY / window.innerHeight;
        this.postProcessing.triggerShockwave(x, y, 0.6);
      }
    }) as EventListener);

    this.addTrackedListener(window, 'dblclick', ((e: MouseEvent) => {
      e.preventDefault();
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      this.postProcessing.triggerShockwave(x, y, 1.5);
      this.postProcessing.triggerShockwave(x, y, 0.4);
      this.chapterFlash = 0.8;
      if (this.state.soundEnabled) {
        this.audio.triggerChapterTransition();
      }
      this.triggerTextCollapse();
    }) as EventListener);

    let lastTapTime = 0;
    this.addTrackedListener(window, 'touchend', ((e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTapTime < 350) {
        const touch = e.changedTouches[0];
        if (touch) {
          const x = touch.clientX / window.innerWidth;
          const y = 1.0 - touch.clientY / window.innerHeight;
          this.postProcessing.triggerShockwave(x, y, 1.5);
          this.postProcessing.triggerShockwave(x, y, 0.4);
          this.chapterFlash = 0.8;
          if (this.state.soundEnabled) this.audio.triggerChapterTransition();
          this.triggerTextCollapse();
        }
      }
      lastTapTime = now;
    }) as EventListener, { passive: true });
  }

  private triggerTextCollapse() {
    const container = document.getElementById('chapter-text');
    if (!container) return;
    const chars = container.querySelectorAll<HTMLElement>('.char');
    if (chars.length === 0) return;
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.42;
    chars.forEach((char) => {
      const rect = char.getBoundingClientRect();
      const dx = cx - (rect.left + rect.width * 0.5);
      const dy = cy - (rect.top + rect.height * 0.5);
      gsap.to(char, {
        x: `+=${dx * 0.6}`,
        y: `+=${dy * 0.6}`,
        scale: 0.3,
        opacity: 0.2,
        filter: 'blur(4px)',
        duration: 0.6,
        ease: 'power3.in',
      });
    });
    gsap.delayedCall(0.8, () => {
      chars.forEach((char) => {
        gsap.to(char, {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          ease: 'elastic.out(1, 0.5)',
        });
      });
    });
  }

  private setupCursor() {
    if (window.matchMedia('(pointer: fine)').matches) {
      this.cursor = document.createElement('div');
      this.cursor.id = 'custom-cursor';

      const ring = document.createElement('div');
      ring.id = 'custom-cursor-ring';

      document.body.appendChild(this.cursor);
      document.body.appendChild(ring);
      setTimeout(() => {
        this.cursor?.classList.add('visible');
        ring.classList.add('visible');
      }, 2000);

      const ringPos = { x: 0, y: 0 };
      let mouseX = 0;
      let mouseY = 0;

      const onMouseMove = (e: Event) => {
        const me = e as MouseEvent;
        mouseX = me.clientX;
        mouseY = me.clientY;
        if (this.cursor) {
          this.cursor.style.left = `${mouseX}px`;
          this.cursor.style.top = `${mouseY}px`;
        }
      };
      this.addTrackedListener(window, 'mousemove', onMouseMove);

      for (let i = 0; i < 16; i++) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.width = '3px';
        trail.style.height = '3px';
        trail.style.background = 'rgba(0, 245, 212, 0.4)';
        trail.style.boxShadow = '0 0 6px rgba(0, 245, 212, 0.25), 0 0 12px rgba(0, 245, 212, 0.1)';
        trail.style.opacity = '0';
        document.body.appendChild(trail);
        this.trailParticles.push(trail);
      }

      const lerpRing = () => {
        ringPos.x += (mouseX - ringPos.x) * 0.12;
        ringPos.y += (mouseY - ringPos.y) * 0.12;
        ring.style.left = `${ringPos.x}px`;
        ring.style.top = `${ringPos.y}px`;

        this.trailFrame++;
        if (this.trailFrame % 2 === 0) {
          const dx = mouseX - this.trailLastX;
          const dy = mouseY - this.trailLastY;
          const speed = Math.sqrt(dx * dx + dy * dy);
          if (speed > 2) {
            const p = this.trailParticles[this.trailIndex % this.trailParticles.length];
            const s = this.state.scroll;
            const tR = Math.round(s * 180);
            const tG = Math.round(245 * (1 - s * 0.7));
            const tB = Math.round(212 * (1 - s * 0.5));
            const size = 3 + s * 3;
            p.style.left = `${mouseX}px`;
            p.style.top = `${mouseY}px`;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.background = `rgba(${tR}, ${tG}, ${tB}, 0.5)`;
            p.style.boxShadow = `0 0 6px rgba(${tR}, ${tG}, ${tB}, 0.3), 0 0 14px rgba(${tR}, ${tG}, ${tB}, 0.1)`;
            p.style.opacity = `${Math.min(0.7, speed * 0.03)}`;
            p.style.transform = `translate(-50%, -50%) scale(${1 + s * 0.5})`;
            p.style.transition = 'opacity 0.8s ease, transform 0.8s ease, width 0.8s ease, height 0.8s ease';
            setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'translate(-50%, -50%) scale(0)'; p.style.width = '1px'; p.style.height = '1px'; }, 80);
            this.trailIndex++;
          }
          this.trailLastX = mouseX;
          this.trailLastY = mouseY;
        }

        this.cursorRafId = requestAnimationFrame(lerpRing);
      };
      lerpRing();

      const interactiveElements = () => document.querySelectorAll('button, a, [data-cursor-hover]');
      const addHover = () => {
        this.cursor?.classList.add('hover');
        ring.classList.add('hover');
      };
      const removeHover = () => {
        this.cursor?.classList.remove('hover');
        ring.classList.remove('hover');
      };

      const taggedSet = new WeakSet<Element>();
      const tagInteractive = () => {
        interactiveElements().forEach((el) => {
          if (taggedSet.has(el)) return;
          taggedSet.add(el);
          this.addTrackedListener(el, 'mouseenter', addHover);
          this.addTrackedListener(el, 'mouseleave', removeHover);
        });
      };
      this.cursorObserver = new MutationObserver(tagInteractive);
      this.cursorObserver.observe(document.body, { childList: true, subtree: true });
      tagInteractive();
    }
  }

  private updateGravityPull(dt: number) {
    const scroll = this.state.scroll;

    if (this.state.introActive || scroll > 0.95) {
      this.gravityVelocity *= 0.9;
      return;
    }

    this.gravityMaxReached = Math.max(this.gravityMaxReached, scroll);
    const isStopped = Math.abs(this.state.scrollVelocity) < 0.2;
    const isScrollingUp = this.state.scrollVelocity < -0.3;

    let totalForce = 0;
    totalForce += Math.pow(scroll, 2) * 2;
    if (scroll > 0.15) totalForce += Math.pow((scroll - 0.15) / 0.85, 1.5) * 5;
    if (scroll > 0.35) totalForce += Math.pow((scroll - 0.35) / 0.65, 1.5) * 12;
    if (scroll > 0.55) totalForce += Math.pow((scroll - 0.55) / 0.45, 2) * 25;
    if (scroll > 0.75) totalForce += Math.pow((scroll - 0.75) / 0.25, 2) * 40;

    const extraVisits = Math.min(this.visitCount - 1, 4);
    if (extraVisits > 0) totalForce *= 1 + extraVisits * 0.2;

    if (this.holdStrength > 0.1) {
      totalForce *= 1 - this.holdStrength * 0.6;
    }

    const voidResistance = Math.exp(-Math.pow((scroll - 0.82) * 12.0, 2.0));
    if (voidResistance > 0.01) {
      totalForce *= 1 - voidResistance * 0.7;
    }

    if (isScrollingUp && scroll > 0.40) {
      this.gravityVelocity += totalForce * dt * 8;
    } else if (isStopped) {
      this.gravityVelocity += totalForce * dt * 5;
    } else {
      this.gravityVelocity += totalForce * dt * 2;
    }

    if (!this.pointOfNoReturnTriggered && scroll >= 0.65) {
      this.pointOfNoReturnTriggered = true;
      if (this.state.soundEnabled) this.audio.triggerPointOfNoReturn();
    }

    if (!this.singularityTriggered && scroll >= 0.88) {
      this.singularityTriggered = true;
      if (this.state.soundEnabled) this.audio.triggerSingularity();
    }

    this.gravityVelocity = Math.min(this.gravityVelocity, 5 + scroll * 20);
    this.gravityVelocity *= 0.97;

    if (this.gravityVelocity > 0.02) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentTop = this.lenis.scroll;
      const newTop = Math.min(currentTop + this.gravityVelocity, maxScroll);
      if (newTop > currentTop) {
        this.lenis.scrollTo(newTop, { immediate: true });
      }
    }
  }

  private easterBuffer = '';

  private setupKeyboard() {
    this.addTrackedListener(window, 'keydown', ((e: KeyboardEvent) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentChapter = Math.min(8, Math.floor(this.state.scroll * 9));

      if (e.key.length === 1) {
        this.easterBuffer = (this.easterBuffer + e.key.toLowerCase()).slice(-10);
        if (this.easterBuffer.endsWith('help')) {
          this.showCosmicMessage('There is no help here. Only the void.');
        } else if (this.easterBuffer.endsWith('light')) {
          this.showCosmicMessage('Light cannot escape. Neither can you.');
        } else if (this.easterBuffer.endsWith('time')) {
          this.showCosmicMessage('Time is an illusion. The singularity is forever.');
        } else if (this.easterBuffer.endsWith('void')) {
          this.showCosmicMessage('You are already inside.');
        } else if (this.easterBuffer.endsWith('escape')) {
          this.showCosmicMessage('The event horizon was crossed long ago.');
        } else if (this.easterBuffer.endsWith('hello')) {
          this.showCosmicMessage('The universe does not answer.');
        } else if (this.easterBuffer.endsWith('god')) {
          this.showCosmicMessage('Even gods fall into black holes.');
        } else if (this.easterBuffer.endsWith('love')) {
          this.showCosmicMessage('Love is the only force that transcends dimensions.');
        }
      }

      if (e.key === '?') {
        this.toggleKeyboardOverlay();
      }

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        const nextChapter = Math.min(8, currentChapter + 1);
        const targetScroll = (nextChapter + 0.5) / 9;
        window.scrollTo({ top: maxScroll * targetScroll, behavior: 'smooth' });
      }

      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const prevChapter = Math.max(0, currentChapter - 1);
        const targetScroll = (prevChapter + 0.5) / 9;
        window.scrollTo({ top: maxScroll * targetScroll, behavior: 'smooth' });
      }

      if (e.key === 'Escape') {
        this.state.soundEnabled = !this.state.soundEnabled;
        this.audio.setMuted(!this.state.soundEnabled);
        const iconOn = document.getElementById('mute-icon-on');
        const iconOff = document.getElementById('mute-icon-off');
        if (iconOn) iconOn.style.display = this.state.soundEnabled ? 'block' : 'none';
        if (iconOff) iconOff.style.display = this.state.soundEnabled ? 'none' : 'block';
      }

      if (e.key === 'Home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (e.key === 'End') {
        e.preventDefault();
        window.scrollTo({ top: maxScroll, behavior: 'smooth' });
      }
    }) as EventListener);
  }

  private setupResize() {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.postProcessing.resize();
    };

    this.addTrackedListener(window, 'resize', onResize as EventListener);
    onResize();

    let tabLeftAt = 0;
    const TAB_MESSAGES = [
      'You cannot leave the void',
      'Time continued without you',
      'The black hole waited',
      'Nothing escapes — not even your attention',
      'Gravity does not pause',
    ];
    this.addTrackedListener(document, 'visibilitychange', (() => {
      if (document.hidden) {
        tabLeftAt = performance.now();
      } else if (this.state.scroll > 0.05) {
        this.chapterFlash = 0.3;
        this.postProcessing.triggerShockwave(0.5, 0.5, 0.6);
        const away = performance.now() - tabLeftAt;
        if (away > 5000 && this.state.scroll > 0.15 && this.state.scroll < 0.9) {
          this.showCosmicMessage(TAB_MESSAGES[Math.floor(Math.random() * TAB_MESSAGES.length)]);
        }
      }
    }) as EventListener);
  }

  private setupClickShockwave() {
    this.addTrackedListener(this.canvas, 'dblclick', ((e: MouseEvent) => {
      if (this.state.scroll < 0.03 || this.state.scroll > 0.95) return;
      const nx = e.clientX / window.innerWidth;
      const ny = 1 - e.clientY / window.innerHeight;
      this.postProcessing.triggerShockwave(nx, ny, 0.8);
      this.chapterFlash = 0.3;
      if (this.state.soundEnabled) this.audio.triggerChapterTransition();
    }) as EventListener);
  }

  private mobileNavEl: HTMLElement | null = null;
  private mobileNavChapterEl: HTMLElement | null = null;

  private setupMobileNav() {
    if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    this.mobileNavEl = document.getElementById('mobile-nav');
    this.mobileNavChapterEl = document.getElementById('mobile-nav-chapter');
    const upBtn = document.getElementById('mobile-nav-up');
    const downBtn = document.getElementById('mobile-nav-down');
    if (!this.mobileNavEl || !upBtn || !downBtn) return;

    const navigateChapter = (direction: 1 | -1) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentChapter = Math.min(8, Math.floor(this.state.scroll * 9));
      const targetChapter = Math.max(0, Math.min(8, currentChapter + direction));
      const targetScroll = (targetChapter + 0.5) / 9;
      window.scrollTo({ top: maxScroll * targetScroll, behavior: 'smooth' });

      if (this.state.soundEnabled) this.audio.triggerUIHover();
    };

    this.addTrackedListener(upBtn, 'click', () => navigateChapter(-1));
    this.addTrackedListener(downBtn, 'click', () => navigateChapter(1));
  }

  private updateMobileNav() {
    if (!this.mobileNavEl) return;

    const isVisible = this.state.scroll > 0.01 && this.state.scroll < 0.95 && !this.state.introActive;
    this.mobileNavEl.classList.toggle('visible', isVisible);

    if (!isVisible) return;

    const currentChapter = Math.min(8, Math.floor(this.state.scroll * 9));
    const upBtn = document.getElementById('mobile-nav-up');
    const downBtn = document.getElementById('mobile-nav-down');
    if (upBtn) upBtn.classList.toggle('disabled', currentChapter <= 0);
    if (downBtn) downBtn.classList.toggle('disabled', currentChapter >= 8);

    if (this.mobileNavChapterEl) {
      this.mobileNavChapterEl.textContent = `${currentChapter + 1}/9`;
    }

    const s = this.state.scroll;
    const r = Math.round(s < 0.4 ? 0 : Math.min(255, (s - 0.4) * 425));
    const g = Math.round(s < 0.4 ? 245 : Math.max(40, 245 - (s - 0.4) * 340));
    const b = Math.round(s < 0.4 ? 212 : Math.max(20, 212 - (s - 0.4) * 320));
    this.mobileNavEl.style.setProperty('--nav-color', `${r}, ${g}, ${b}`);
  }

  private fpsFrames = 0;
  private fpsLastTime = 0;
  private fpsValue = 60;
  private lowFpsCount = 0;

  private animate(timestamp?: number) {
    this.rafId = requestAnimationFrame((t) => this.animate(t));

    this.lenis.raf(timestamp ?? performance.now());

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime > 1000) {
      this.fpsValue = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsLastTime = now;
      if (this.fpsValue < 30 && this.state.quality !== 'medium') {
        this.lowFpsCount = (this.lowFpsCount ?? 0) + 1;
        if (this.lowFpsCount >= 3) {
          const newPr = Math.max(1, this.renderer.getPixelRatio() - 0.25);
          this.renderer.setPixelRatio(newPr);
          this.postProcessing.resize();
          this.renderer.setSize(window.innerWidth, window.innerHeight);
          this.lowFpsCount = 0;
        }
      } else {
        this.lowFpsCount = 0;
      }
    }

    this.state.time = elapsed;
    this.state.deltaTime = dt;

    this.state.mouseSmooth.lerp(this.state.mouse, 0.05);

    if (this.cursor) {
      const hideCursor = this.state.scroll > 0.70;
      this.cursor.style.opacity = hideCursor ? '0' : '';
      if (this.ringEl) this.ringEl.style.opacity = hideCursor ? '0' : '';
      document.body.style.cursor = hideCursor ? 'none' : '';

      const cursorSize = 5 + this.state.scroll * 6;
      this.cursor.style.width = `${cursorSize}px`;
      this.cursor.style.height = `${cursorSize}px`;

      if (this.ringEl) {
        const mx = this.state.mouseSmooth.x * window.innerWidth;
        const my = (1 - this.state.mouseSmooth.y) * window.innerHeight;
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.42;
        const dx = cx - mx;
        const dy = cy - my;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        const proximity = 1 - Math.min(distToCenter / maxDist, 1);
        const earlyHint = this.state.scroll > 0.05 ? Math.min((this.state.scroll - 0.05) * 2.5, 1) : 0;
        const gravPull = proximity * this.state.scroll + proximity * earlyHint * 0.08;

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const breathe = 1 + Math.sin(performance.now() * 0.002) * earlyHint * 0.03;
        const stretch = (1 + gravPull * 1.5) * breathe;
        const squeeze = Math.max(0.5, 1 - gravPull * 0.4) / breathe;
        const orbitalSpin = elapsed * (0.5 + this.state.scroll * 6) * 57.2958 * proximity;

        this.ringEl.style.transform = `translate(-50%, -50%) rotate(${angle + orbitalSpin}deg) scale(${stretch}, ${squeeze})`;
        this.ringEl.style.borderColor = `rgba(${Math.round(100 * gravPull)}, ${Math.round(245 * (1 - gravPull * 0.6))}, ${Math.round(212 * (1 - gravPull * 0.3))}, ${0.35 + gravPull * 0.3})`;
        const frameDrag = gravPull * 0.3;
        this.ringEl.style.borderRadius = frameDrag > 0.02 ? `${(50 - frameDrag * 20).toFixed(0)}% ${(50 + frameDrag * 15).toFixed(0)}% ${(50 - frameDrag * 10).toFixed(0)}% ${(50 + frameDrag * 20).toFixed(0)}%` : '';

        this.cursor.style.background = gravPull > 0.3
          ? `rgb(${Math.round(100 + 155 * gravPull)}, ${Math.round(245 * (1 - gravPull))}, ${Math.round(212 * (1 - gravPull * 0.5))})`
          : '';
      }

      const glowSize = 6 + this.state.scroll * 12;
      const glowAlpha = 0.3 + this.state.scroll * 0.4;
      this.cursor.style.boxShadow = `0 0 ${glowSize}px var(--cyan), 0 0 ${glowSize * 2}px rgba(0, 245, 212, ${glowAlpha.toFixed(2)})`;
    }

    const currentChapter = Math.min(8, Math.floor(this.state.scroll * 9));
    if (currentChapter !== this.lastChapterIndex && this.lastChapterIndex >= 0) {
      this.chapterFlash = 1.0;
      this.postProcessing.triggerShockwave(0.5, 0.5, 1.2);
      if (this.state.soundEnabled) {
        this.audio.triggerChapterTransition();
        this.audio.triggerTextRevealShimmer();
      }
      this.chapterZoomPulse = 1.0;
      this.hudChapterPulse = 1.0;
      this.logChapter(currentChapter);
      const chName = Experience.CHAPTER_NAMES[currentChapter];
      document.title = currentChapter === 0
        ? 'Event Horizon \u2014 An Interactive Journey Into a Black Hole'
        : `${chName} \u2014 Event Horizon`;
    }
    if (this.chapterZoomPulse > 0.01) {
      this.chapterZoomPulse *= 0.93;
      if (this.chapterZoomPulse < 0.01) this.chapterZoomPulse = 0;
    }
    this.lastChapterIndex = currentChapter;
    this.chapterFlash *= 0.92;
    if (this.chapterFlash < 0.01) this.chapterFlash = 0;

    if (this.isHolding && this.state.scroll > 0.25) {
      this.holdStrength = Math.min(this.holdStrength + dt * 2, 1);
    } else {
      this.holdStrength *= 0.92;
      if (this.holdStrength < 0.01) this.holdStrength = 0;
    }

    this.updateGravityPull(dt);

    this.blackHole.update(this.state);
    this.particles.update(this.state);
    this.postProcessing.updateCamera(this.state.scroll, elapsed, this.state.introProgress, this.state.mouseSmooth.x, this.state.mouseSmooth.y);

    if (this.chapterZoomPulse > 0.01) {
      this.postProcessing.particleCamera.fov += this.chapterZoomPulse * 1.5;
      this.postProcessing.particleCamera.updateProjectionMatrix();
    }

    this.textReveal.setMouse(this.state.mouseSmooth.x, 1 - this.state.mouseSmooth.y);
    this.textReveal.update(this.state.scroll);

    const velocityShake = Math.min(Math.abs(this.state.scrollVelocity) * 0.0003, 0.002);
    const flashShake = this.chapterFlash * 0.004;
    const singularityShake = Math.exp(-Math.pow((this.state.scroll - 0.77) * 12, 2)) * 0.012;
    const deepShake = Math.max(0, this.state.scroll - 0.6) * 0.001;
    const shakeIntensity = velocityShake + flashShake + singularityShake + deepShake;

    const idleBreath = Math.abs(this.state.scrollVelocity) < 5 ? 0.0008 * (1 + this.state.scroll * 2) : 0;
    const breathX = Math.sin(elapsed * 0.4) * idleBreath;
    const breathY = Math.cos(elapsed * 0.27) * idleBreath * 0.6;

    const camOffsetX = (shakeIntensity > 0.0001 ? (Math.random() - 0.5) * shakeIntensity : 0) + breathX;
    const camOffsetY = (shakeIntensity > 0.0001 ? (Math.random() - 0.5) * shakeIntensity : 0) + breathY;
    this.postProcessing.particleCamera.position.x += camOffsetX;
    this.postProcessing.particleCamera.position.y += camOffsetY;

    if (this.state.soundEnabled) {
      this.audio.setMousePan(this.state.mouseSmooth.x);
      this.audio.update(this.state.scroll, this.state.scrollVelocity);
    }

    this.haptics.update(this.state.scroll);
    this.checkIdleHint();
    this.updateMobileNav();
    this.updateHUD(this.state.scroll);

    this.postProcessing.update({ ...this.state, chapterFlash: this.chapterFlash, introProgress: this.state.introProgress, holdStrength: this.holdStrength });
    this.postProcessing.render();
  }

  private hudElements: Record<string, HTMLElement | null> = {};
  private hudFrame = 0;
  private navDots: HTMLElement[] = [];
  private navInitialized = false;
  private hudDisplayValues: Record<string, number> = {};
  private hudTargetValues: Record<string, number> = {};
  private hudLastTemp = 0;
  private hudTempPulse = 0;
  private hudDistGlow = 0;
  private experienceStartTime = 0;
  private trailParticles: HTMLDivElement[] = [];
  private trailIndex = 0;
  private trailLastX = 0;
  private trailLastY = 0;
  private trailFrame = 0;
  private gravityVelocity = 0;
  private gravityMaxReached = 0;
  private holdStrength = 0;
  private isHolding = false;
  private chapterZoomPulse = 0;
  private hudChapterPulse = 0;
  private scrollHintEl: HTMLElement | null = null;
  private scrollHintLastUpdate = 0;

  private progressHideTimer = 0;
  private pointOfNoReturnTriggered = false;
  private singularityTriggered = false;
  private faviconCanvas: HTMLCanvasElement | null = null;
  private faviconCtx: CanvasRenderingContext2D | null = null;
  private faviconLink: HTMLLinkElement | null = null;
  private lastFaviconScroll = -1;
  private visitCount = 0;
  private whiteModeActive = false;
  private postCreditsTimer = 0;
  private postCreditsShown = false;
  private echoTimer = 0;
  private echoActive = false;
  private cursorObserver: MutationObserver | null = null;
  private escapeMsg: HTMLElement | null = null;
  private escapeMsgTimer = 0;
  private lastScrollActivity = 0;
  private idleHintEl: HTMLElement | null = null;
  private idleHintShown = false;
  private escapeBlocked = false;
  private echoTexts = ['YOU', 'THE PULL', 'no turning back', 'atom by atom', 'ten billion solar masses', 'spacetime curves'];
  private chapterIndicatorEl: HTMLElement | null = null;
  private chapterIndicatorNum: HTMLElement | null = null;
  private chapterIndicatorTitle: HTMLElement | null = null;
  private interstitialEl: HTMLElement | null = null;
  private lastIndicatorChapter = -1;
  private chapterIndicatorTimer = 0;

  private static CHAPTER_NAMES = ['YOU', 'THE PULL', 'THE WARP', 'THE FALL', 'SPAGHETTIFICATION', 'TIME DILATION', 'SINGULARITY', 'THE VOID', 'WHAT REMAINS'];
  private static INTERSTITIALS = [
    '',
    'ten billion solar masses',
    'spacetime curves',
    'no turning back',
    'atom by atom',
    'one heartbeat — an eternity',
    'where physics breaks',
    'silence',
    '',
  ];

  private lerpHudValue(key: string, target: number, speed: number): number {
    if (this.hudDisplayValues[key] === undefined) this.hudDisplayValues[key] = target;
    this.hudDisplayValues[key] += (target - this.hudDisplayValues[key]) * speed;
    return this.hudDisplayValues[key];
  }

  private updateHUD(scroll: number) {
    this.hudFrame++;
    if (this.hudFrame % 3 !== 0) return;

    if (this.hudChapterPulse > 0.01) {
      this.hudChapterPulse *= 0.94;
      if (this.hudChapterPulse < 0.01) this.hudChapterPulse = 0;
    }

    if (!this.hudElements.distance) {
      this.hudElements.distance = document.getElementById('hud-distance');
      this.hudElements.distLabel = document.querySelector('.hud-distance .hud-label');
      this.hudElements.tempLabel = document.querySelector('.hud-temp .hud-label');
      this.hudElements.dilLabel = document.querySelector('.hud-timedil .hud-label');
    }

    const danger = Math.min(1, scroll * 1.2);
    const labelR = Math.round(200 + 55 * danger);
    const labelG = Math.round(200 - 120 * danger);
    const labelB = Math.round(220 - 160 * danger);
    const labelAlpha = 0.35 + danger * 0.25;
    const dangerColor = `rgba(${labelR}, ${labelG}, ${labelB}, ${labelAlpha.toFixed(2)})`;
    if (this.hudElements.distLabel) (this.hudElements.distLabel as HTMLElement).style.color = dangerColor;
    if (this.hudElements.tempLabel) (this.hudElements.tempLabel as HTMLElement).style.color = dangerColor;
    if (this.hudElements.dilLabel) (this.hudElements.dilLabel as HTMLElement).style.color = dangerColor;

    const chapterJolt = this.hudChapterPulse;
    const distance = 38 - scroll * 35.5;
    const distJolt = chapterJolt > 0.1 ? distance * (1 - chapterJolt * 0.1) : distance;
    const rs = Math.max(distJolt, 1.0);

    const lerpRs = this.lerpHudValue('rs', rs, 0.15);

    this.hudDistGlow = Math.max(0, 1 - lerpRs / 10);

    if (this.hudElements.distance) {
      this.hudElements.distance.textContent = `${lerpRs.toFixed(2)} Rs`;
      const dGlow = Math.max(this.hudDistGlow, chapterJolt * 0.8);
      this.hudElements.distance.style.textShadow = dGlow > 0.1
        ? `0 0 ${(6 + dGlow * 16).toFixed(0)}px rgba(255, ${Math.round(100 + 155 * (1 - dGlow))}, ${Math.round(80 * (1 - dGlow))}, ${(0.3 + dGlow * 0.5).toFixed(2)})`
        : '';
      this.hudElements.distance.style.color = dGlow > 0.3
        ? `rgba(${Math.round(180 + 75 * dGlow)}, ${Math.round(220 - 100 * dGlow)}, ${Math.round(255 - 155 * dGlow)}, 0.9)`
        : '';
      this.hudElements.distance.style.transform = chapterJolt > 0.1 ? `scale(${(1 + chapterJolt * 0.05).toFixed(3)})` : '';
    }

    if (!this.hudElements.temp) {
      this.hudElements.temp = document.getElementById('hud-temp');
    }
    if (this.hudElements.temp) {
      const hawkingTemp = lerpRs > 1.5 ? 6.17e-8 / lerpRs : 6.17e-8 / 1.5;
      const tempSpike = chapterJolt > 0.1 ? 1 + chapterJolt * 1.5 : 1;
      const displayTemp = hawkingTemp * 1e12 * tempSpike;
      const lerpTemp = this.lerpHudValue('temp', displayTemp, chapterJolt > 0.1 ? 0.4 : 0.12);
      const tempStr = lerpTemp > 100 ? `${lerpTemp.toFixed(0)}` : lerpTemp > 10 ? `${lerpTemp.toFixed(1)}` : `${lerpTemp.toFixed(2)}`;
      this.hudElements.temp.textContent = `${tempStr} nK`;

      const tempIntensity = Math.min(1, lerpTemp / 50);
      if (tempIntensity > 0.3) {
        this.hudElements.temp.style.color = `rgba(${Math.round(180 + 75 * tempIntensity)}, ${Math.round(200 - 80 * tempIntensity)}, ${Math.round(255 - 180 * tempIntensity)}, 0.9)`;
        this.hudElements.temp.style.textShadow = `0 0 ${(6 + tempIntensity * 10).toFixed(0)}px rgba(255, ${Math.round(180 - 100 * tempIntensity)}, ${Math.round(60)}, ${(0.2 + tempIntensity * 0.4).toFixed(2)})`;
      } else {
        this.hudElements.temp.style.color = '';
        this.hudElements.temp.style.textShadow = '';
      }
    }

    if (!this.hudElements.timedil) {
      this.hudElements.timedil = document.getElementById('hud-timedil');
    }
    if (this.hudElements.timedil) {
      const rsRatio = Math.max(lerpRs, 1.01);
      const timeDilation = 1 / Math.sqrt(Math.max(0.001, 1 - 1 / rsRatio));
      const dilSpike = chapterJolt > 0.1 ? timeDilation * chapterJolt * 2.5 : 0;
      const lerpDil = this.lerpHudValue('timedil', timeDilation + dilSpike, chapterJolt > 0.1 ? 0.35 : 0.1);
      const dilStr = lerpDil > 1000 ? `${(lerpDil / 1000).toFixed(1)}k` : lerpDil > 100 ? `${lerpDil.toFixed(0)}` : lerpDil > 10 ? `${lerpDil.toFixed(1)}` : `${lerpDil.toFixed(2)}`;
      this.hudElements.timedil.textContent = `\u00D7${dilStr}`;

      const dilIntensity = Math.min(1, Math.log10(Math.max(1, lerpDil)) / 3);
      if (dilIntensity > 0.2) {
        this.hudElements.timedil.style.color = `rgba(${Math.round(100 + 155 * dilIntensity)}, ${Math.round(245 - 120 * dilIntensity)}, ${Math.round(212 - 140 * dilIntensity)}, 0.9)`;
      } else {
        this.hudElements.timedil.style.color = '';
      }
    }

    if (!this.hudElements.elapsed) {
      this.hudElements.elapsed = document.getElementById('hud-elapsed');
    }
    if (this.hudElements.elapsed && this.experienceStartTime > 0) {
      const elapsedMs = performance.now() - this.experienceStartTime;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      this.hudElements.elapsed.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      const timePanic = Math.max(0, (scroll - 0.55) * 2.2);
      if (timePanic > 0.1) {
        const flicker = Math.sin(performance.now() * 0.008) * 0.15 * timePanic;
        this.hudElements.elapsed.style.opacity = `${(1 - flicker).toFixed(2)}`;
      } else {
        this.hudElements.elapsed.style.opacity = '';
      }
    }

    if (!this.hudElements.tidal) {
      this.hudElements.tidal = document.getElementById('hud-tidal');
    }
    if (this.hudElements.tidal) {
      const tidalR = Math.max(lerpRs, 1.01);
      const tidalForce = 1.0 / (tidalR * tidalR * tidalR);
      const tidalDisplay = tidalForce * 1e4;
      const lerpTidal = this.lerpHudValue('tidal', tidalDisplay, 0.12);
      const tidalStr = lerpTidal > 1e6 ? `${(lerpTidal / 1e6).toFixed(1)}M` : lerpTidal > 1000 ? `${(lerpTidal / 1000).toFixed(1)}k` : lerpTidal > 10 ? `${lerpTidal.toFixed(0)}` : `${lerpTidal.toFixed(1)}`;
      this.hudElements.tidal.textContent = `${tidalStr} g`;

      const tidalIntensity = Math.min(1, Math.log10(Math.max(1, lerpTidal)) / 5);
      if (tidalIntensity > 0.2) {
        this.hudElements.tidal.style.color = `rgba(${Math.round(255)}, ${Math.round(200 - 140 * tidalIntensity)}, ${Math.round(100 - 80 * tidalIntensity)}, 0.9)`;
        this.hudElements.tidal.style.textShadow = `0 0 ${(4 + tidalIntensity * 14).toFixed(0)}px rgba(255, ${Math.round(120 - 80 * tidalIntensity)}, 20, ${(0.2 + tidalIntensity * 0.5).toFixed(2)})`;
      } else {
        this.hudElements.tidal.style.color = '';
        this.hudElements.tidal.style.textShadow = '';
      }
    }

    this.echoTimer += 0.016;
    const echoZone = scroll > 0.62 && scroll < 0.78;
    if (echoZone && this.echoTimer > 2.5 + Math.random() * 3) {
      this.echoTimer = 0;
      this.spawnTemporalEcho();
    }

    const singularityGlitch = Math.exp(-Math.pow((scroll - 0.72) * 18.0, 2.0));
    if (singularityGlitch > 0.2 && Math.random() < singularityGlitch * 0.3) {
      const glitchTargets = [this.hudElements.distance, this.hudElements.temp, this.hudElements.timedil, this.hudElements.elapsed, this.hudElements.tidal];
      const target = glitchTargets[Math.floor(Math.random() * glitchTargets.length)];
      if (target) {
        const original = target.textContent || '';
        const chars = '█▓▒░∞∅⊘⊗⊙§¶†‡';
        let glitched = '';
        for (let i = 0; i < original.length; i++) {
          glitched += Math.random() < 0.4 ? chars[Math.floor(Math.random() * chars.length)] : original[i];
        }
        target.textContent = glitched;
        setTimeout(() => { target.textContent = original; }, 80);
      }
    }

    this.updateFavicon(scroll);

    if (this.scrollHintEl) {
      if (scroll > 0.02 && scroll < 0.85) {
        this.scrollHintEl.classList.remove('visible');
        this.scrollHintEl.style.opacity = '0';
      } else if (scroll >= 0.85) {
        this.scrollHintEl.style.opacity = '0';
      }
      const hintText = this.scrollHintEl.querySelector('.scroll-text');
      if (hintText && scroll < 0.02) {
        const isStopped = Math.abs(this.state.scrollVelocity) < 0.5;
        if (isStopped && this.scrollHintLastUpdate !== 0 && performance.now() - this.scrollHintLastUpdate > 5000) {
          hintText.textContent = this.state.quality === 'medium' ? 'Swipe to begin your descent' : 'Scroll to begin your descent';
          this.scrollHintLastUpdate = performance.now();
        }
      }
    }

    if (this.overlayEl) {
      const depthGlow = scroll < 0.5 ? 1 : Math.max(0, 1 - (scroll - 0.5) * 4);
      this.overlayEl.style.setProperty('--depth-glow-opacity', `${depthGlow}`);
      const mx = (this.state.mouseSmooth.x - 0.5) * 2;
      const my = (this.state.mouseSmooth.y - 0.5) * 2;
      this.overlayEl.style.setProperty('--mouse-x', `${(mx * 3).toFixed(1)}%`);
      this.overlayEl.style.setProperty('--mouse-y', `${(-my * 3).toFixed(1)}%`);
    }

    if (!this.navInitialized) {
      if (this.navEl) {
        this.navDots = Array.from(this.navEl.querySelectorAll('.nav-dot'));
        this.navDots.forEach((dot, i) => {
          const navigate = () => {
            const targetScroll = (i + 0.5) / 9;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({ top: maxScroll * targetScroll, behavior: 'smooth' });
          };
          this.addTrackedListener(dot, 'click', navigate);
          this.addTrackedListener(dot, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter' || ke.key === ' ') { ke.preventDefault(); navigate(); }
          });
        });
        this.navInitialized = true;
      }
    }

    const chapterIndex = Math.min(8, Math.floor(scroll * 9));
    if (this.navEl) {
      if (scroll > 0.02 && scroll < 0.96) {
        this.navEl.classList.add('visible');
        this.navEl.style.opacity = '';
        this.navEl.style.pointerEvents = '';
      } else {
        this.navEl.classList.remove('visible');
      }
    }
    this.navDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === chapterIndex);
      dot.classList.toggle('passed', i < chapterIndex);
    });

    if (this.navTrackFillEl) {
      const fillPct = Math.min(100, (scroll / 0.96) * 100);
      this.navTrackFillEl.style.height = `${fillPct.toFixed(1)}%`;
    }

    if (this.hudContainerEl) {
      this.hudContainerEl.style.opacity = scroll > 0.85 ? `${Math.max(0, 1 - (scroll - 0.85) * 6)}` : '';
      if (this.hudChapterPulse > 0.3) {
        const pulseAlpha = (this.hudChapterPulse * 0.25).toFixed(2);
        this.hudContainerEl.style.boxShadow = `inset 0 0 20px rgba(0, 245, 212, ${pulseAlpha}), 0 0 10px rgba(0, 245, 212, ${(this.hudChapterPulse * 0.1).toFixed(2)})`;
      } else {
        this.hudContainerEl.style.boxShadow = '';
      }
    }

    if (!this.chapterIndicatorEl) {
      this.chapterIndicatorEl = document.getElementById('chapter-indicator');
      this.chapterIndicatorNum = document.getElementById('chapter-indicator-num');
      this.chapterIndicatorTitle = document.getElementById('chapter-indicator-title');
      this.interstitialEl = document.getElementById('interstitial');
    }

    if (chapterIndex !== this.lastIndicatorChapter && this.chapterIndicatorEl) {
      this.lastIndicatorChapter = chapterIndex;
      if (this.chapterIndicatorNum) this.chapterIndicatorNum.textContent = `${String(chapterIndex + 1).padStart(2, '0')}`;
      if (this.chapterIndicatorTitle) this.chapterIndicatorTitle.textContent = Experience.CHAPTER_NAMES[chapterIndex] || '';
      this.chapterIndicatorEl.classList.add('visible');
      clearTimeout(this.chapterIndicatorTimer);
      this.chapterIndicatorTimer = window.setTimeout(() => {
        this.chapterIndicatorEl?.classList.remove('visible');
      }, 3000);

      const chName = Experience.CHAPTER_NAMES[chapterIndex];
      if (chName) {
        document.title = `${chName} — Event Horizon`;
      }

      if (this.themeColorMeta) {
        const s = scroll;
        const tR = Math.round(5 + s * 15);
        const tG = Math.round(5 + s * 5);
        const tB = Math.round(5 + s * 20);
        this.themeColorMeta.setAttribute('content', `rgb(${tR}, ${tG}, ${tB})`);
      }
    }

    if (this.interstitialEl) {
      const chapterFrac = (scroll * 9) % 1;
      const betweenChapters = chapterFrac > 0.85 || chapterFrac < 0.15;
      const interstitialText = Experience.INTERSTITIALS[chapterIndex] || '';
      if (betweenChapters && interstitialText && scroll > 0.05 && scroll < 0.92) {
        this.interstitialEl.textContent = interstitialText;
        this.interstitialEl.classList.add('visible');
        const positions = ['12%', '18%', '8%', '22%', '15%', '10%', '20%', '14%', '16%'];
        const aligns = ['center', 'left', 'right', 'center', 'right', 'left', 'center', 'right', 'center'];
        this.interstitialEl.style.bottom = positions[chapterIndex] || '15%';
        this.interstitialEl.style.textAlign = aligns[chapterIndex] || 'center';
        if (aligns[chapterIndex] === 'left') {
          this.interstitialEl.style.left = '8%';
          this.interstitialEl.style.transform = 'none';
        } else if (aligns[chapterIndex] === 'right') {
          this.interstitialEl.style.left = 'auto';
          this.interstitialEl.style.right = '8%';
          this.interstitialEl.style.transform = 'none';
        } else {
          this.interstitialEl.style.left = '50%';
          this.interstitialEl.style.right = 'auto';
          this.interstitialEl.style.transform = 'translateX(-50%)';
        }
      } else {
        this.interstitialEl.classList.remove('visible');
      }
    }

    if (this.creditsEl) {
      const shouldBeWhite = scroll > 0.90;
      if (shouldBeWhite && !this.whiteModeActive) {
        this.creditsEl.classList.add('white-mode');
        this.whiteModeActive = true;
      } else if (!shouldBeWhite && this.whiteModeActive) {
        this.creditsEl.classList.remove('white-mode');
        this.whiteModeActive = false;
      }
      if (scroll > 0.97 && !this.postCreditsShown) {
        this.postCreditsTimer += 0.016;
        if (this.postCreditsTimer > 20) {
          this.postCreditsShown = true;
          const msg = document.createElement('div');
          msg.style.cssText = 'position:fixed;bottom:8%;left:50%;transform:translateX(-50%);z-index:16;font-family:var(--font-serif);font-style:italic;font-size:clamp(0.55rem,0.9vw,0.75rem);color:rgba(100,100,120,0.3);letter-spacing:0.08em;pointer-events:none;opacity:0;transition:opacity 4s ease;text-align:center;max-width:280px;line-height:1.8';
          msg.textContent = 'Some journeys end where they began. Press Home to return.';
          document.body.appendChild(msg);
          requestAnimationFrame(() => { msg.style.opacity = '1'; });
        }
      } else if (scroll <= 0.97) {
        this.postCreditsTimer = 0;
      }
    }
  }

  private spawnTemporalEcho() {
    const text = this.echoTexts[Math.floor(Math.random() * this.echoTexts.length)];
    const echo = document.createElement('div');
    const isLeft = Math.random() > 0.5;
    const vPos = 15 + Math.random() * 70;
    echo.textContent = text;
    echo.style.cssText = `position:fixed;top:${vPos}%;${isLeft ? 'left:3%' : 'right:3%'};z-index:14;font-family:var(--font-serif);font-style:italic;font-size:clamp(0.6rem,1.2vw,0.9rem);color:rgba(200,220,255,0.06);letter-spacing:0.15em;pointer-events:none;opacity:0;transition:opacity 1.5s ease;text-shadow:0 0 30px rgba(89,33,135,0.15);writing-mode:${Math.random() > 0.7 ? 'vertical-rl' : 'horizontal-tb'};transform:scale(${0.8 + Math.random() * 0.4})`;
    document.body.appendChild(echo);
    requestAnimationFrame(() => { echo.style.opacity = '1'; echo.style.color = 'rgba(200,220,255,0.12)'; });
    setTimeout(() => { echo.style.opacity = '0'; echo.style.color = 'rgba(200,220,255,0)'; }, 1500 + Math.random() * 1500);
    setTimeout(() => echo.remove(), 4000);
  }

  private toggleKeyboardOverlay() {
    const existing = document.getElementById('keyboard-overlay');
    if (existing) {
      existing.style.opacity = '0';
      setTimeout(() => existing.remove(), 500);
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'keyboard-overlay';
    overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:998;background:rgba(5,5,5,0.92);border:1px solid rgba(0,245,212,0.15);padding:2rem 3rem;font-family:var(--font-mono);font-size:0.7rem;color:rgba(232,232,255,0.6);letter-spacing:0.05em;line-height:2.2;pointer-events:none;opacity:0;transition:opacity 0.5s ease;backdrop-filter:blur(8px)';
    overlay.innerHTML = [
      '<div style="color:var(--cyan);font-size:0.8rem;letter-spacing:0.2em;margin-bottom:1rem">CONTROLS</div>',
      '<div>↑ ↓  Navigate chapters</div>',
      '<div>Home  Jump to start</div>',
      '<div>End   Jump to finish</div>',
      '<div>Esc   Toggle sound</div>',
      '<div style="margin-top:0.8rem;color:rgba(89,33,135,0.7);font-style:italic">Try typing secret words...</div>',
      '<div style="margin-top:0.8rem;color:rgba(232,232,255,0.3)">?  Close this overlay</div>',
    ].join('');
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 500); }, 6000);
  }

  private showCosmicMessage(text: string) {
    const existing = document.getElementById('cosmic-msg');
    if (existing) existing.remove();
    const msg = document.createElement('div');
    msg.id = 'cosmic-msg';
    msg.textContent = text;
    msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;font-family:var(--font-serif);font-style:italic;font-size:clamp(0.8rem,1.5vw,1.1rem);color:rgba(0,245,212,0.6);letter-spacing:0.1em;text-shadow:0 0 20px rgba(0,245,212,0.3);pointer-events:none;opacity:0;transition:opacity 1s ease';
    document.body.appendChild(msg);
    requestAnimationFrame(() => { msg.style.opacity = '1'; });
    setTimeout(() => { msg.style.opacity = '0'; }, 3000);
    setTimeout(() => { msg.remove(); }, 4500);
  }

  private updateFavicon(scroll: number) {
    const quantized = Math.round(scroll * 20) / 20;
    if (quantized === this.lastFaviconScroll) return;
    this.lastFaviconScroll = quantized;

    if (!this.faviconCanvas) {
      this.faviconCanvas = document.createElement('canvas');
      this.faviconCanvas.width = 32;
      this.faviconCanvas.height = 32;
      this.faviconCtx = this.faviconCanvas.getContext('2d');
      this.faviconLink = document.querySelector('link[rel="icon"]');
    }
    if (!this.faviconCtx || !this.faviconLink) return;

    const ctx = this.faviconCtx;
    const s = scroll;

    ctx.clearRect(0, 0, 32, 32);

    const ehR = 3 + s * 5;

    const grad = ctx.createRadialGradient(16, 16, ehR, 16, 16, 15);
    const ringR = Math.round(s < 0.4 ? 0 : Math.min(255, (s - 0.4) * 425));
    const ringG = Math.round(s < 0.4 ? 245 : Math.max(40, 245 - (s - 0.4) * 340));
    const ringB = Math.round(s < 0.4 ? 212 : Math.max(20, 212 - (s - 0.4) * 320));
    grad.addColorStop(0, '#050505');
    grad.addColorStop(0.5, `rgba(${ringR}, ${ringG}, ${ringB}, 0.8)`);
    grad.addColorStop(0.7, `rgba(89, 33, 135, 0.4)`);
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(16, 16, ehR, 0, Math.PI * 2);
    ctx.fillStyle = '#050505';
    ctx.fill();

    ctx.save();
    ctx.translate(16, 16);
    ctx.rotate(-0.26);
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ringR}, ${ringG}, ${ringB}, 0.6)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();

    this.faviconLink.href = this.faviconCanvas.toDataURL('image/png');
  }

  private static ESCAPE_MESSAGES = [
    'You cannot escape',
    'There is no going back',
    'The pull is absolute',
    'Resistance is meaningless',
    'Gravity has already decided',
    'Light itself cannot leave',
    'Even time bends toward the center',
    'The horizon was crossed long ago',
  ];

  private static IDLE_MESSAGES = [
    'Keep scrolling to descend',
    'The void awaits below',
    'Continue your descent',
    'Scroll deeper into the unknown',
    'Gravity is patient',
    'The singularity calls',
    'There is more below',
  ];

  private showEscapeMessage() {
    if (this.escapeBlocked) return;
    this.escapeBlocked = true;

    if (!this.escapeMsg) this.escapeMsg = document.getElementById('escape-msg');
    if (!this.escapeMsg) return;

    const msg = Experience.ESCAPE_MESSAGES[Math.floor(Math.random() * Experience.ESCAPE_MESSAGES.length)];
    this.escapeMsg.textContent = msg;
    this.escapeMsg.classList.remove('fade-out');
    this.escapeMsg.classList.add('visible');

    clearTimeout(this.escapeMsgTimer);
    this.escapeMsgTimer = window.setTimeout(() => {
      this.escapeMsg?.classList.add('fade-out');
      this.escapeMsg?.classList.remove('visible');
      window.setTimeout(() => { this.escapeBlocked = false; }, 2000);
    }, 2200);
  }

  private checkIdleHint() {
    if (!this.lastScrollActivity) return;
    const s = this.state.scroll;
    if (s < 0.02 || s > 0.88 || this.idleHintShown) return;

    const elapsed = performance.now() - this.lastScrollActivity;
    if (elapsed > 8000 && Math.abs(this.state.scrollVelocity) < 0.5) {
      if (!this.idleHintEl) this.idleHintEl = document.getElementById('idle-hint');
      if (!this.idleHintEl) return;

      const msg = Experience.IDLE_MESSAGES[Math.floor(Math.random() * Experience.IDLE_MESSAGES.length)];
      this.idleHintEl.textContent = msg;
      this.idleHintEl.classList.remove('fade-out');
      this.idleHintEl.classList.add('visible');
      this.idleHintShown = true;

      window.setTimeout(() => {
        this.idleHintEl?.classList.add('fade-out');
        this.idleHintEl?.classList.remove('visible');
      }, 4000);
    }
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    cancelAnimationFrame(this.cursorRafId);

    this.lenis.destroy();
    this.audio.destroy();
    this.blackHole.destroy();
    this.particles.destroy();

    disposeScene(this.postProcessing.bgScene);
    disposeScene(this.postProcessing.particleScene);
    this.postProcessing.destroy();

    this.renderer.dispose();
    this.renderer.forceContextLoss();

    ScrollTrigger.getAll().forEach((t) => t.kill());
    gsap.killTweensOf('*');

    if (this.cursor && this.cursor.parentNode) {
      this.cursor.parentNode.removeChild(this.cursor);
    }
    if (this.ringEl) this.ringEl.remove();
    this.trailParticles.forEach(p => p.remove());
    this.trailParticles = [];
    this.faviconCanvas = null;
    this.faviconCtx = null;

    if (this.cursorObserver) {
      this.cursorObserver.disconnect();
      this.cursorObserver = null;
    }

    this.boundHandlers.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.boundHandlers = [];
  }
}
