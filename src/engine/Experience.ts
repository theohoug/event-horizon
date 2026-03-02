/**
 * @file Experience.ts
 * @description Main experience controller — orchestrates renderer, world, narrative
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as THREE from 'three';
import { PostProcessing } from './PostProcessing';
import { BlackHole } from '../world/BlackHole';
import { Starfield } from '../world/Starfield';
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
  private starfield!: Starfield;
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

    this.init().catch((err) => {
      const loader = document.getElementById('loader');
      const loaderSub = document.getElementById('loader-sub');
      if (loaderSub) loaderSub.textContent = 'WebGL initialization failed. Please try a modern browser.';
      if (loader) loader.classList.remove('hidden');
    });
  }

  private detectQuality(): 'ultra' | 'high' | 'medium' {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) return 'medium';

    const tempCanvas = document.createElement('canvas');
    const gl = tempCanvas.getContext('webgl2') || tempCanvas.getContext('webgl');
    if (!gl) return 'medium';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();

      if (gpuRenderer.includes('apple m') || gpuRenderer.includes('rtx') || gpuRenderer.includes('rx 7')) return 'ultra';
      if (gpuRenderer.includes('gtx') || gpuRenderer.includes('rx 6') || gpuRenderer.includes('intel arc')) return 'high';
    } else {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }

    return 'high';
  }

  private async init() {
    const qualityPresets = {
      ultra: { pixelRatio: Math.min(window.devicePixelRatio, 2), antialias: true },
      high: { pixelRatio: Math.min(window.devicePixelRatio, 1.5), antialias: true },
      medium: { pixelRatio: 1, antialias: false },
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
    this.starfield = new Starfield(this.postProcessing.particleScene, this.state.quality);

    this.timeline = new Timeline();
    this.textReveal = new TextReveal();
    this.audio = new AudioEngine();
    this.haptics = new Haptics();

    this.setupLenis();
    this.setupMouse();
    this.setupCursor();
    this.setupKeyboard();
    this.setupResize();

    await this.preload();

    this.state.isReady = true;
    this.onReady();
    this.animate();
  }

  private async preload() {
    const loaderFill = document.getElementById('loader-bar-fill');
    let progress = 0;
    const tick = () => {
      progress = Math.min(progress + Math.random() * 15, 100);
      if (loaderFill) loaderFill.style.width = `${progress}%`;
    };
    const interval = setInterval(tick, 200);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        clearInterval(interval);
        if (loaderFill) loaderFill.style.width = '100%';
        resolve();
      }, 1800);
    });
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
      }

      this.playIntroCinematic();
    };

    yesBtn?.addEventListener('click', () => dismiss(true));
    noBtn?.addEventListener('click', () => dismiss(false));

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.state.soundEnabled = !this.state.soundEnabled;
        this.audio.setMuted(!this.state.soundEnabled);
        const iconOn = document.getElementById('mute-icon-on');
        const iconOff = document.getElementById('mute-icon-off');
        if (iconOn) iconOn.style.display = this.state.soundEnabled ? 'block' : 'none';
        if (iconOff) iconOff.style.display = this.state.soundEnabled ? 'none' : 'block';
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

    this.state.introActive = true;
    this.state.introProgress = 0;
    intro.classList.add('active');

    const tl = gsap.timeline({
      onComplete: () => {
        intro.classList.add('fade-out');
        intro.classList.remove('active');

        if (muteBtn) muteBtn.classList.add('visible');
        if (dataHud) dataHud.classList.add('visible');

        this.experienceStartTime = performance.now();
        this.createAmbientParticles();

        this.timeline.start(this.state.soundEnabled);
        this.textReveal.start();

        const scrollHint = document.getElementById('scroll-hint');
        if (scrollHint) {
          setTimeout(() => scrollHint.classList.add('visible'), 1500);
          const hideHint = () => {
            scrollHint.classList.remove('visible');
            window.removeEventListener('scroll', hideHint);
          };
          window.addEventListener('scroll', hideHint, { once: true });
          this.scrollHintEl = scrollHint;
        }

        gsap.to(this.state, {
          introProgress: 1,
          duration: 2,
          ease: 'power2.out',
          onComplete: () => {
            this.state.introActive = false;
            intro.style.display = 'none';
          },
        });
      },
    });

    tl.set(titleContainer, { opacity: 0, scale: 1.4 });
    tl.set(title, { opacity: 0, letterSpacing: '0.8em', filter: 'blur(20px)' });

    tl.to(titleContainer, {
      opacity: 1,
      scale: 1,
      duration: 2.5,
      ease: 'power3.out',
    }, 0.3);

    tl.to(title, {
      opacity: 1,
      letterSpacing: '0.35em',
      filter: 'blur(0px)',
      duration: 2.5,
      ease: 'power3.out',
    }, 0.3);

    if (subtitle) {
      tl.to(subtitle, {
        opacity: 0.7,
        y: 0,
        duration: 1.5,
        ease: 'power2.out',
      }, 1.8);
    }

    if (introLine) {
      tl.to(introLine, {
        width: '120px',
        duration: 1.2,
        ease: 'power2.inOut',
      }, 2.0);
    }

    tl.to(this.state, {
      introProgress: 0.6,
      duration: 3,
      ease: 'power2.inOut',
    }, 0);

    tl.to(title, {
      opacity: 0,
      letterSpacing: '0.15em',
      filter: 'blur(6px)',
      scale: 0.92,
      duration: 1.8,
      ease: 'power2.in',
    }, 3.5);

    if (subtitle) {
      tl.to(subtitle, {
        opacity: 0,
        filter: 'blur(6px)',
        duration: 1.2,
        ease: 'power2.in',
      }, 3.5);
    }

    if (introLine) {
      tl.to(introLine, {
        width: '0px',
        opacity: 0,
        duration: 1.0,
        ease: 'power2.in',
      }, 3.5);
    }

    tl.to(titleContainer, {
      opacity: 0,
      scale: 0.85,
      duration: 1.5,
      ease: 'power2.in',
    }, 3.8);
  }

  private setupLenis() {
    this.lenis = new Lenis({
      duration: 2.8,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.0,
      infinite: false,
    });

    this.lenis.on('scroll', (e: { scroll: number; limit: number; velocity: number }) => {
      this.state.scroll = e.limit > 0 ? e.scroll / e.limit : 0;
      this.state.scrollVelocity = e.velocity;
      ScrollTrigger.update();

      const fill = document.getElementById('progress-fill');
      const bar = document.getElementById('progress-bar');
      const pct = Math.round(this.state.scroll * 100);
      if (fill) fill.style.width = `${pct}%`;
      if (bar) bar.setAttribute('aria-valuenow', `${pct}`);
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
    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.state.mouse.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
    });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.state.mouse.set(
          e.touches[0].clientX / window.innerWidth,
          1.0 - e.touches[0].clientY / window.innerHeight
        );
      }
    }, { passive: true });
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

      window.addEventListener('mousemove', (e: MouseEvent) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (this.cursor) {
          this.cursor.style.left = `${mouseX}px`;
          this.cursor.style.top = `${mouseY}px`;
        }
      });

      for (let i = 0; i < 8; i++) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.width = '2px';
        trail.style.height = '2px';
        trail.style.background = 'rgba(0, 245, 212, 0.3)';
        trail.style.boxShadow = '0 0 4px rgba(0, 245, 212, 0.15)';
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
        if (this.trailFrame % 3 === 0) {
          const dx = mouseX - this.trailLastX;
          const dy = mouseY - this.trailLastY;
          const speed = Math.sqrt(dx * dx + dy * dy);
          if (speed > 3) {
            const p = this.trailParticles[this.trailIndex % this.trailParticles.length];
            p.style.left = `${mouseX}px`;
            p.style.top = `${mouseY}px`;
            p.style.opacity = `${Math.min(0.5, speed * 0.02)}`;
            p.style.transform = `translate(-50%, -50%) scale(${1 + this.state.scroll})`;
            p.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'translate(-50%, -50%) scale(0)'; }, 50);
            this.trailIndex++;
          }
          this.trailLastX = mouseX;
          this.trailLastY = mouseY;
        }

        requestAnimationFrame(lerpRing);
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

      const observer = new MutationObserver(() => {
        interactiveElements().forEach((el) => {
          el.addEventListener('mouseenter', addHover);
          el.addEventListener('mouseleave', removeHover);
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      interactiveElements().forEach((el) => {
        el.addEventListener('mouseenter', addHover);
        el.addEventListener('mouseleave', removeHover);
      });
    }
  }

  private updateGravityPull(dt: number) {
    const scroll = this.state.scroll;
    const warningEl = document.getElementById('gravity-warning');
    const warningText = document.getElementById('gravity-warning-text');
    const warningSub = document.getElementById('gravity-warning-sub');

    const figureEl = document.getElementById('falling-figure');

    if (scroll < 0.45 || scroll > 0.95 || this.state.introActive) {
      this.gravityVelocity *= 0.9;
      if (warningEl) warningEl.classList.remove('visible', 'locked', 'crossed');
      if (figureEl) figureEl.classList.remove('visible', 'sinking', 'gone');
      this.gravityWarningState = 'none';
      this.gravityFightBack = 0;
      return;
    }

    this.gravityMaxReached = Math.max(this.gravityMaxReached, scroll);
    const isScrollingUp = this.state.scrollVelocity < -0.3;
    const isStopped = Math.abs(this.state.scrollVelocity) < 0.2;

    if (scroll >= 0.45 && scroll < 0.55) {
      const gravityStrength = ((scroll - 0.45) / 0.1);
      const gentleForce = gravityStrength * 0.04;

      if (isStopped) {
        this.gravityVelocity += gentleForce * dt * 3;
      }

      if (warningEl && warningText && warningSub) {
        if (this.gravityWarningState !== 'approaching') {
          this.gravityWarningState = 'approaching';
          warningEl.classList.add('visible');
          warningEl.classList.remove('locked', 'crossed');
          warningText.textContent = '⚠ GRAVITATIONAL ANOMALY DETECTED';
          warningSub.textContent = 'Scroll up to escape';
        }
      }
    }

    if (scroll >= 0.53 && figureEl) {
      if (!figureEl.classList.contains('visible')) {
        figureEl.classList.add('visible');
        figureEl.classList.remove('sinking', 'gone');
      }
    }

    if (scroll >= 0.55 && scroll < 0.68) {
      const lockStrength = ((scroll - 0.55) / 0.13);
      const gravityForce = 0.06 + lockStrength * 0.25;

      if (isScrollingUp) {
        this.gravityFightBack = Math.min(this.gravityFightBack + dt * 0.4, 1);
        const resistForce = gravityForce * (1 + this.gravityFightBack * 0.8);
        this.gravityVelocity += resistForce * dt * 6;
      } else {
        this.gravityFightBack *= 0.98;
        if (isStopped) {
          this.gravityVelocity += gravityForce * dt * 4;
        }
      }

      if (warningEl && warningText && warningSub) {
        if (this.gravityWarningState !== 'locked') {
          this.gravityWarningState = 'locked';
          warningEl.classList.add('visible', 'locked');
          warningEl.classList.remove('crossed');
          warningText.textContent = '⚠ PULL BACK — NOW';
          warningSub.textContent = 'Event horizon approaching';
          if (figureEl) {
            figureEl.classList.add('sinking');
            figureEl.classList.remove('gone');
          }
        }
      }
    }

    if (scroll >= 0.68 && scroll < 0.82) {
      const deepStrength = ((scroll - 0.68) / 0.14);
      const gravityForce = 0.3 + deepStrength * 0.8;

      if (isScrollingUp) {
        this.gravityFightBack = Math.min(this.gravityFightBack + dt * 0.8, 1);
        this.gravityVelocity += (gravityForce + this.gravityFightBack * 1.0) * dt * 10;
      } else if (isStopped) {
        this.gravityVelocity += gravityForce * dt * 8;
      } else {
        this.gravityVelocity += gravityForce * 0.15 * dt * 6;
      }

      if (warningEl && warningText && warningSub) {
        if (this.gravityWarningState !== 'crossed') {
          this.gravityWarningState = 'crossed';
          warningEl.classList.add('visible', 'crossed');
          warningEl.classList.remove('locked');
          warningText.textContent = 'POINT OF NO RETURN';
          warningSub.textContent = '';
          if (figureEl) {
            figureEl.classList.add('gone');
            figureEl.classList.remove('sinking');
          }
        }
      }
    }

    if (scroll >= 0.82) {
      const abyssProgress = (scroll - 0.82) / 0.13;
      const abyssForce = 0.8 + Math.pow(abyssProgress, 2) * 3;
      this.gravityVelocity += abyssForce * dt * 12;
    }

    this.gravityVelocity = Math.min(this.gravityVelocity, 2 + scroll * 3);
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

  private createAmbientParticles() {
    if (this.ambientParticlesCreated) return;
    this.ambientParticlesCreated = true;

    const container = document.getElementById('ambient-particles');
    if (!container) return;

    const count = 18;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'ambient-dot';
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.setProperty('--dur', `${12 + Math.random() * 18}s`);
      dot.style.setProperty('--delay', `${Math.random() * -20}s`);
      dot.style.setProperty('--dx', `${(Math.random() - 0.5) * 80}px`);
      dot.style.setProperty('--dy', `${(Math.random() - 0.5) * 60}px`);
      dot.style.setProperty('--peak-opacity', `${0.15 + Math.random() * 0.25}`);
      dot.style.setProperty('--scale-mid', `${0.8 + Math.random() * 0.8}`);
      dot.style.width = `${1 + Math.random() * 2}px`;
      dot.style.height = dot.style.width;
      container.appendChild(dot);
    }

    setTimeout(() => container.classList.add('visible'), 2000);
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentChapter = Math.min(17, Math.floor(this.state.scroll * 18));

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        const nextChapter = Math.min(17, currentChapter + 1);
        const targetScroll = (nextChapter + 0.5) / 18;
        window.scrollTo({ top: maxScroll * targetScroll, behavior: 'smooth' });
      }

      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const prevChapter = Math.max(0, currentChapter - 1);
        const targetScroll = (prevChapter + 0.5) / 18;
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
    });
  }

  private setupResize() {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.postProcessing.resize();
    };

    window.addEventListener('resize', onResize);
    onResize();
  }

  private animate(timestamp?: number) {
    this.rafId = requestAnimationFrame((t) => this.animate(t));

    this.lenis.raf(timestamp ?? performance.now());

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.state.time = elapsed;
    this.state.deltaTime = dt;

    this.state.mouseSmooth.lerp(this.state.mouse, 0.05);

    if (this.cursor) {
      const cursorSize = 5 + this.state.scroll * 6;
      this.cursor.style.width = `${cursorSize}px`;
      this.cursor.style.height = `${cursorSize}px`;

      const ring = document.getElementById('custom-cursor-ring');
      if (ring) {
        const mx = this.state.mouseSmooth.x * window.innerWidth;
        const my = (1 - this.state.mouseSmooth.y) * window.innerHeight;
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.42;
        const dx = cx - mx;
        const dy = cy - my;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        const proximity = 1 - Math.min(distToCenter / maxDist, 1);
        const gravPull = proximity * this.state.scroll;

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const stretch = 1 + gravPull * 1.5;
        const squeeze = Math.max(0.5, 1 - gravPull * 0.4);

        ring.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scale(${stretch}, ${squeeze})`;
        ring.style.borderColor = `rgba(${Math.round(100 * gravPull)}, ${Math.round(245 * (1 - gravPull * 0.6))}, ${Math.round(212 * (1 - gravPull * 0.3))}, ${0.35 + gravPull * 0.3})`;

        this.cursor.style.background = gravPull > 0.3
          ? `rgb(${Math.round(100 + 155 * gravPull)}, ${Math.round(245 * (1 - gravPull))}, ${Math.round(212 * (1 - gravPull * 0.5))})`
          : '';
      }
    }

    const currentChapter = Math.min(17, Math.floor(this.state.scroll * 18));
    if (currentChapter !== this.lastChapterIndex && this.lastChapterIndex >= 0) {
      this.chapterFlash = 1.0;
    }
    this.lastChapterIndex = currentChapter;
    this.chapterFlash *= 0.92;
    if (this.chapterFlash < 0.01) this.chapterFlash = 0;

    this.updateGravityPull(dt);

    this.blackHole.update(this.state);
    this.starfield.update(this.state);
    this.postProcessing.updateCamera(this.state.scroll, elapsed, this.state.introProgress);
    this.textReveal.update(this.state.scroll);

    const velocityShake = Math.min(Math.abs(this.state.scrollVelocity) * 0.0003, 0.002);
    const flashShake = this.chapterFlash * 0.008;
    const shakeIntensity = velocityShake + flashShake;
    if (shakeIntensity > 0.0001) {
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;
      this.postProcessing.particleCamera.position.x += shakeX;
      this.postProcessing.particleCamera.position.y += shakeY;
    }

    if (this.state.soundEnabled) {
      this.audio.update(this.state.scroll, this.state.scrollVelocity);
    }

    this.haptics.update(this.state.scroll);
    this.updateHUD(this.state.scroll);

    this.postProcessing.update({ ...this.state, chapterFlash: this.chapterFlash, introProgress: this.state.introProgress });
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
  private ambientParticlesCreated = false;
  private trailParticles: HTMLDivElement[] = [];
  private trailIndex = 0;
  private trailLastX = 0;
  private trailLastY = 0;
  private trailFrame = 0;
  private gravityPullActive = false;
  private gravityVelocity = 0;
  private gravityWarningState: 'none' | 'approaching' | 'locked' | 'crossed' = 'none';
  private gravityMaxReached = 0;
  private gravityFightBack = 0;
  private scrollHintEl: HTMLElement | null = null;

  private lerpHudValue(key: string, target: number, speed: number): number {
    if (this.hudDisplayValues[key] === undefined) this.hudDisplayValues[key] = target;
    this.hudDisplayValues[key] += (target - this.hudDisplayValues[key]) * speed;
    return this.hudDisplayValues[key];
  }

  private updateHUD(scroll: number) {
    this.hudFrame++;
    if (this.hudFrame % 3 !== 0) return;

    if (!this.hudElements.distance) {
      this.hudElements.chapter = document.getElementById('hud-chapter');
      this.hudElements.distance = document.getElementById('hud-distance');
      this.hudElements.redshift = document.getElementById('hud-redshift');
      this.hudElements.timedil = document.getElementById('hud-timedil');
      this.hudElements.temp = document.getElementById('hud-temp');
      this.hudElements.tidal = document.getElementById('hud-tidal');
      this.hudElements.signal = document.getElementById('hud-signal');
    }

    const distance = 38 - scroll * 35.5;
    const rs = Math.max(distance, 1.0);
    const redshift = 1.0 / Math.sqrt(Math.max(1.0 - 1.0 / rs, 0.01)) - 1.0;
    const timeDilation = Math.sqrt(Math.max(1.0 - 1.0 / rs, 0.001));
    const diskTemp = Math.round(1500 + scroll * 4000);
    const tidalForce = 1.0 / (rs * rs * rs);

    const lerpRs = this.lerpHudValue('rs', rs, 0.15);
    const lerpRedshift = this.lerpHudValue('redshift', redshift, 0.12);
    const lerpTimeDil = this.lerpHudValue('timedil', timeDilation, 0.12);
    const lerpTemp = this.lerpHudValue('temp', diskTemp, 0.1);
    const lerpTidal = this.lerpHudValue('tidal', tidalForce * 1000, 0.12);

    if (diskTemp > this.hudLastTemp + 50) {
      this.hudTempPulse = 1.0;
    }
    this.hudLastTemp = diskTemp;
    this.hudTempPulse *= 0.92;

    this.hudDistGlow = Math.max(0, 1 - lerpRs / 10);

    const signalStrength = Math.max(0, Math.round((1 - scroll) * 8));
    const signalBars = '▓'.repeat(signalStrength) + '░'.repeat(8 - signalStrength);

    const chapterNum = Math.min(18, Math.floor(scroll * 18) + 1);
    const chapterStr = String(chapterNum).padStart(2, '0');
    const glitchChars = '▒░▓█╬╠╣╚╗┃─│▌▐▀▄';
    const corrupt = (text: string, intensity: number): string => {
      if (intensity < 0.1) return text;
      return text.split('').map((c) => Math.random() < intensity * 0.3 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : c).join('');
    };
    const corruptionLevel = Math.max(0, (scroll - 0.6) * 2.5);

    if (this.hudElements.chapter) this.hudElements.chapter.textContent = corrupt(`${chapterStr} / 18`, corruptionLevel);
    if (this.hudElements.distance) {
      this.hudElements.distance.textContent = corrupt(`${lerpRs.toFixed(2)} Rs`, corruptionLevel);
      const dGlow = this.hudDistGlow;
      this.hudElements.distance.style.textShadow = dGlow > 0.1
        ? `0 0 ${(6 + dGlow * 12).toFixed(0)}px rgba(255, ${Math.round(100 + 155 * (1 - dGlow))}, ${Math.round(80 * (1 - dGlow))}, ${(0.3 + dGlow * 0.5).toFixed(2)})`
        : '';
      this.hudElements.distance.style.color = dGlow > 0.3
        ? `rgba(${Math.round(180 + 75 * dGlow)}, ${Math.round(220 - 100 * dGlow)}, ${Math.round(255 - 155 * dGlow)}, 0.9)`
        : '';
    }
    if (this.hudElements.redshift) this.hudElements.redshift.textContent = corrupt(`z = ${lerpRedshift.toFixed(3)}`, corruptionLevel);
    if (this.hudElements.timedil) this.hudElements.timedil.textContent = corrupt(`τ = ${lerpTimeDil.toFixed(3)}`, corruptionLevel);
    if (this.hudElements.temp) {
      this.hudElements.temp.textContent = corrupt(`${Math.round(lerpTemp).toLocaleString()} K`, corruptionLevel);
      const tPulse = this.hudTempPulse;
      const tempHeat = Math.min(1, (lerpTemp - 2000) / 3500);
      this.hudElements.temp.style.textShadow = tempHeat > 0.1 || tPulse > 0.1
        ? `0 0 ${(6 + (tempHeat + tPulse) * 10).toFixed(0)}px rgba(255, ${Math.round(160 - 100 * tempHeat)}, ${Math.round(60 * (1 - tempHeat))}, ${(0.2 + tempHeat * 0.4 + tPulse * 0.3).toFixed(2)})`
        : '';
      this.hudElements.temp.style.color = tempHeat > 0.3
        ? `rgba(255, ${Math.round(200 - 80 * tempHeat)}, ${Math.round(180 - 130 * tempHeat)}, 0.9)`
        : '';
    }
    if (this.hudElements.tidal) this.hudElements.tidal.textContent = corrupt(`${lerpTidal.toFixed(1)} g`, corruptionLevel);
    if (this.hudElements.signal) this.hudElements.signal.textContent = signalBars;

    if (!this.hudElements.elapsed) {
      this.hudElements.elapsed = document.getElementById('hud-elapsed');
    }
    if (this.hudElements.elapsed && this.experienceStartTime > 0) {
      const elapsedMs = performance.now() - this.experienceStartTime;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      this.hudElements.elapsed.textContent = corrupt(timeStr, corruptionLevel);
    }

    if (this.scrollHintEl) {
      if (scroll > 0.02) {
        this.scrollHintEl.classList.remove('visible');
        this.scrollHintEl.style.opacity = '0';
      }
    }

    const ambientContainer = document.getElementById('ambient-particles');
    if (ambientContainer) {
      const fadeOut = scroll > 0.7 ? Math.max(0, 1 - (scroll - 0.7) * 3.3) : 1;
      ambientContainer.style.opacity = `${fadeOut}`;
    }

    if (!this.navInitialized) {
      const navEl = document.getElementById('chapter-nav');
      if (navEl) {
        this.navDots = Array.from(navEl.querySelectorAll('.nav-dot'));
        this.navDots.forEach((dot, i) => {
          dot.addEventListener('click', () => {
            const targetScroll = (i + 0.5) / 18;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({ top: maxScroll * targetScroll, behavior: 'smooth' });
          });
        });
        this.navInitialized = true;
      }
    }

    const chapterIndex = Math.min(17, Math.floor(scroll * 18));
    const navEl = document.getElementById('chapter-nav');
    if (navEl) {
      if (scroll > 0.02 && scroll < 0.96) {
        navEl.classList.add('visible');
      } else {
        navEl.classList.remove('visible');
      }
    }
    this.navDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === chapterIndex);
      dot.classList.toggle('passed', i < chapterIndex);
    });

    const hudContainer = document.getElementById('data-hud');
    if (hudContainer) {
      const glitchAmount = Math.pow(scroll, 2) * 4;
      const time = performance.now() * 0.001;
      const glitchX = Math.sin(time * 15 + scroll * 50) * glitchAmount;
      const glitchY = Math.cos(time * 12 + scroll * 40) * glitchAmount * 0.3;
      const skew = Math.sin(time * 8) * scroll * scroll * 0.5;
      hudContainer.style.transform = scroll > 0.4
        ? `translate(${glitchX}px, ${glitchY}px) skewX(${skew}deg)`
        : '';
      hudContainer.style.opacity = scroll > 0.85 ? `${Math.max(0, 1 - (scroll - 0.85) * 6)}` : '';
    }
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.lenis.destroy();
    this.audio.destroy();
    this.blackHole.destroy();
    this.starfield.destroy();
    this.postProcessing.destroy();
    this.renderer.dispose();
    ScrollTrigger.getAll().forEach((t) => t.kill());
    if (this.cursor && this.cursor.parentNode) {
      this.cursor.parentNode.removeChild(this.cursor);
    }
  }
}
