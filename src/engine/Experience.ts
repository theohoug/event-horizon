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
import { Starfield } from '../world/Starfield';
import { Timeline } from '../narrative/Timeline';
import { TextReveal } from '../narrative/TextReveal';
import { AudioEngine } from '../audio/AudioEngine';
import { Haptics } from '../ui/Haptics';
import { t, getLang, setLang, onLangChange, type Lang } from '../i18n/translations';
import { ALTERED, HARDCORE } from './AlteredMode';
import { DesktopBroadcaster, generateRoomId } from '../sync/DesktopBroadcaster';
import { QROverlay } from '../sync/QROverlay';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Cap canvas resolution to prevent absurd pixel counts from browser zoom / unusual display configs.
// 4096×2160 ≈ 8.8M pixels is generous enough for any real display; beyond that we scale down.
const MAX_CANVAS_PIXELS = 4096 * 2160;

function clampedViewportSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  let w = vv ? Math.round(vv.width) : document.documentElement.clientWidth || window.innerWidth;
  let h = vv ? Math.round(vv.height) : document.documentElement.clientHeight || window.innerHeight;
  const pixels = w * h;
  if (pixels > MAX_CANVAS_PIXELS) {
    const scale = Math.sqrt(MAX_CANVAS_PIXELS / pixels);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  return { w, h };
}

interface PerfConfig {
  dpr: number;
  maxSteps: number;
  qualityMedium: boolean;
  gpgpuTexSize: number;
  starfieldCount: number;
  bloomPasses: number;
  bloomScale: number;
  motionBlur: boolean;
  antialias: boolean;
  gpuScore: number;
  quality: 'ultra' | 'high' | 'medium';
}

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
  chapterFlash: number;
  holdStrength: number;
}

export class Experience {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private postProcessing!: PostProcessing;
  private blackHole!: BlackHole;
  private particles: GPGPUParticles | null = null;
  private starfield!: Starfield;
  private broadcaster: DesktopBroadcaster | null = null;
  private qrOverlay: QROverlay | null = null;
  private timeline!: Timeline;
  private textReveal!: TextReveal;
  private audio!: AudioEngine;
  private haptics!: Haptics;
  private lenis!: Lenis;
  private lenisBackupInterval: number = 0;
  private lastRafTime: number = 0;
  private clock: THREE.Clock;
  private state: ExperienceState;
  private rafId: number = 0;
  private cursor: HTMLDivElement | null = null;
  private chapterFlash: number = 0;
  private enterPulse: number = 0;
  private lastChapterIndex: number = -1;
  private lastChapterSyncTime: number = 0;
  private cursorRafId: number = 0;
  private overlayEl: HTMLElement | null = null;
  private navEl: HTMLElement | null = null;
  private ringEl: HTMLElement | null = null;
  private navTrackFillEl: HTMLElement | null = null;
  private hudContainerEl: HTMLElement | null = null;
  private creditsEl: HTMLElement | null = null;
  private themeColorMeta: HTMLMetaElement | null = null;
  private boundHandlers: { target: EventTarget; event: string; handler: EventListener }[] = [];
  private chapterBreaks: number[] = [];

  private chapterMids: number[] = [];

  private computeChapterBreaks() {
    const sections = document.querySelectorAll('.chapter');
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0) { this.chapterBreaks = []; this.chapterMids = []; return; }
    const breaks: number[] = [];
    const mids: number[] = [];
    const vh = window.innerHeight;
    let cum = 0;
    sections.forEach((s, i) => {
      const el = s as HTMLElement;
      cum += el.offsetHeight;
      breaks.push(cum / total);
      const trigPct = i === 0 ? 0 : i === 8 ? 0.5 : 0.65;
      const start = Math.max(0, el.offsetTop - vh * trigPct) / total;
      const nextEl = sections[i + 1] as HTMLElement | undefined;
      const nextPct = i + 1 === 0 ? 0 : i + 1 === 8 ? 0.5 : 0.65;
      const end = nextEl ? Math.max(0, nextEl.offsetTop - vh * nextPct) / total : 1.0;
      mids.push((start + end) / 2);
    });
    this.chapterBreaks = breaks;
    this.chapterMids = mids;
  }

  getChapterMid(chapter: number): number {
    return this.chapterMids[chapter] ?? (chapter + 0.5) / 9;
  }

  getChapterFromScroll(scroll: number): number {
    if (this.chapterBreaks.length === 0) return Math.min(8, Math.floor(scroll * 9));
    for (let i = 0; i < this.chapterBreaks.length; i++) {
      if (scroll < this.chapterBreaks[i]) return i;
    }
    return this.chapterBreaks.length - 1;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    this.state = {
      scroll: 0,
      scrollVelocity: 0,
      time: 0,
      deltaTime: 0,
      mouse: new THREE.Vector2(0.5, 0.5),
      mouseSmooth: new THREE.Vector2(0.5, 0.5),
      isReady: false,
      soundEnabled: false,
      quality: 'high',
      introProgress: 0,
      introActive: false,
      chapterFlash: 0,
      holdStrength: 0,
    };

    this.visitCount = 0;
    if (this.visitCount >= 2) {
      this.isHardcoreMode = true;
      this.isAlteredMode = true;
    } else if (this.visitCount >= 1) {
      this.isAlteredMode = true;
    }

    this.applyTimeOfDay();
    this.init().catch(() => {
      const loader = document.getElementById('loader');
      const loaderSub = document.getElementById('loader-sub');
      const loaderText = document.getElementById('loader-text');
      if (loaderText) loaderText.textContent = t().signalLost;
      if (loaderSub) loaderSub.textContent = t().fallback.message;
      if (loader) loader.classList.remove('hidden');
      const fill = document.getElementById('loader-bar-fill');
      if (fill) fill.style.width = '0%';
    });
  }

  private profileGpu(renderer: THREE.WebGLRenderer): PerfConfig {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile) {
      return {
        dpr: 1.0,
        maxSteps: 48,
        qualityMedium: false,
        gpgpuTexSize: 64,
        starfieldCount: 1500,
        bloomPasses: 2,
        bloomScale: 0.20,
        motionBlur: true,
        antialias: true,
        gpuScore: 30,
        quality: 'high',
      };
    }

    try {
    const gl = renderer.getContext();
    const nativeDpr = Math.min(window.devicePixelRatio, 2);
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const screenPx = screenW * screenH;

    let gpuRenderer = '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    const cores = navigator.hardwareConcurrency || 2;
    const ram = (navigator as any).deviceMemory || 4;

    const fingerprint = `${gpuRenderer}|${cores}|${ram}|${screenW}x${screenH}|${nativeDpr}`;
    try {
      const data = JSON.parse(localStorage.getItem('eh_perf_v9') || '{}');
      if (data.fp === fingerprint) return data.cfg as PerfConfig;
    } catch {}
    // Clear old cache versions
    try { localStorage.removeItem('eh_perf_v6'); } catch {}
    try { localStorage.removeItem('eh_perf_v7'); } catch {}
    try { localStorage.removeItem('eh_perf_v8'); } catch {}

    let heuristicBonus = 0;
    if (gpuRenderer.includes('rtx 40') || gpuRenderer.includes('rtx 50')) heuristicBonus = 18;
    else if (gpuRenderer.includes('rtx 30')) heuristicBonus = 14;
    else if (gpuRenderer.includes('rtx 20')) heuristicBonus = 8;
    else if (gpuRenderer.includes('apple m2') || gpuRenderer.includes('apple m3') || gpuRenderer.includes('apple m4')) heuristicBonus = 14;
    else if (gpuRenderer.includes('apple m1')) heuristicBonus = 8;
    else if (gpuRenderer.includes('rx 7') || gpuRenderer.includes('rx 9')) heuristicBonus = 12;
    else if (gpuRenderer.includes('rx 6')) heuristicBonus = 8;
    else if (gpuRenderer.includes('intel') && !gpuRenderer.includes('arc')) heuristicBonus = -12;
    if (cores >= 8 && ram >= 16) heuristicBonus += 5;
    else if (cores <= 2 || ram <= 2) heuristicBonus -= 8;

    const benchScene = new THREE.Scene();
    const benchCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geo);
    benchScene.add(quad);

    const fboOpts = { format: THREE.RGBAFormat as THREE.PixelFormat, type: THREE.HalfFloatType as THREE.TextureDataType };
    const benchVert = `void main(){gl_Position=vec4(position,1.0);}`;

    const repFrag = (res: number) => `precision highp float;
float bh(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float bn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
return mix(mix(mix(bh(i),bh(i+vec3(1,0,0)),f.x),mix(bh(i+vec3(0,1,0)),bh(i+vec3(1,1,0)),f.x),f.y),
mix(mix(bh(i+vec3(0,0,1)),bh(i+vec3(1,0,1)),f.x),mix(bh(i+vec3(0,1,1)),bh(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
vec2 uv=gl_FragCoord.xy/${res}.0*2.0-1.0;
vec3 pos=vec3(0,3,-20),vel=normalize(vec3(uv,2.0)),col=vec3(0.0);
for(int i=0;i<40;i++){
float r=length(pos);
if(r<1.0){col+=vec3(0.8,0.2,0.05)*exp(-r*2.0);break;}
if(r>40.0){col+=vec3(bh(vel*100.0))*0.02;break;}
col+=vec3(0.4,0.6,1.0)*exp(-(r-1.5)*(r-1.5)*20.0)*0.05;
if(abs(pos.y)<0.25){float dr=length(pos.xz);
if(dr>2.5&&dr<12.0){float t=1.0/dr,tb=bn(pos*3.0);
col+=vec3(t*1.8,t*0.7,t*0.25)*(0.4+tb*0.6)*smoothstep(12.0,8.0,dr);}}
vec3 cp=cross(pos,vel);float h2=dot(cp,cp);float r5=r*r*r*r*r;
vec3 a=-1.5*h2*pos/max(r5,1e-8);
float adt=0.3*clamp((r-1.0)*0.4,0.03,1.5);
vel=normalize(vel+a*adt);pos+=vel*adt;}
gl_FragColor=vec4(col,1.0);}`;

    const rt96 = new THREE.WebGLRenderTarget(96, 96, fboOpts);
    const mat96 = new THREE.ShaderMaterial({ vertexShader: benchVert, fragmentShader: repFrag(96), depthTest: false });
    const rt192 = new THREE.WebGLRenderTarget(192, 192, fboOpts);
    const mat192 = new THREE.ShaderMaterial({ vertexShader: benchVert, fragmentShader: repFrag(192), depthTest: false });

    const runTest = (mat: THREE.ShaderMaterial, rt: THREE.WebGLRenderTarget, warmup: number, runs: number): number => {
      quad.material = mat;
      for (let w = 0; w < warmup; w++) { renderer.setRenderTarget(rt); renderer.render(benchScene, benchCam); }
      gl.finish();
      const t0 = performance.now();
      for (let r = 0; r < runs; r++) { renderer.setRenderTarget(rt); renderer.render(benchScene, benchCam); }
      gl.finish();
      return (performance.now() - t0) / runs;
    };

    gl.finish();
    const repMs96 = runTest(mat96, rt96, 2, 4);
    const repMs192 = runTest(mat192, rt192, 1, 4);

    renderer.setRenderTarget(null);
    [rt96, rt192].forEach(r => r.dispose());
    [mat96, mat192].forEach(m => m.dispose());
    geo.dispose();

    const px96 = 96 * 96;
    const px192 = 192 * 192;
    const benchSteps = 40;

    let costPerPxStep = (repMs192 - repMs96) / ((px192 - px96) * benchSteps);
    if (costPerPxStep <= 0) costPerPxStep = repMs192 / (px192 * benchSteps);
    const overhead = Math.max(0, repMs96 - costPerPxStep * px96 * benchSteps);

    const thermalFactor = 0.97;
    const bhBudget = 13.0 * thermalFactor;

    const maxDpr = Math.min(nativeDpr, 2.0);
    const minDpr = 1.0;
    let bestDpr = minDpr;
    let bestSteps = 100;

    for (let tryDpr = maxDpr; tryDpr >= minDpr - 0.01; tryDpr -= 0.05) {
      const dprR = Math.round(tryDpr * 20) / 20;
      const affordable = (bhBudget - overhead) / Math.max(costPerPxStep * screenPx * dprR * dprR, 1e-12);
      if (affordable >= 100) {
        bestDpr = dprR;
        bestSteps = Math.min(160, Math.max(100, Math.round(affordable)));
        break;
      }
    }

    const fullCost = costPerPxStep * screenPx * maxDpr * maxDpr * 160 + overhead;
    let gpuScore = Math.min(100, Math.max(0, (bhBudget / Math.max(fullCost, 0.01)) * 100));
    gpuScore = Math.max(0, Math.min(100, gpuScore + heuristicBonus * 0.5));

    const lerp = (a: number, b: number, v: number) => a + (b - a) * Math.max(0, Math.min(1, v));
    const t01 = gpuScore / 100;

    const gpgpuSizes = [128, 128, 160, 192, 224, 256, 256, 256];
    const gpgpuTexSize = gpgpuSizes[Math.min(gpgpuSizes.length - 1, Math.floor(t01 * gpgpuSizes.length))];
    const starfieldCount = Math.round(lerp(3000, 12000, t01));

    const isWeak = gpuScore < 25;
    const isMid = gpuScore < 50;
    const config: PerfConfig = {
      dpr: bestDpr,
      maxSteps: bestSteps,
      qualityMedium: isWeak,
      gpgpuTexSize,
      starfieldCount,
      bloomPasses: isWeak ? 2 : isMid ? 3 : 4,
      bloomScale: isWeak ? 0.2 : isMid ? 0.35 : 0.5,
      motionBlur: true,
      antialias: true,
      gpuScore: Math.round(gpuScore),
      quality: isWeak ? 'medium' : isMid ? 'high' : 'ultra',
    };
    try { localStorage.setItem('eh_perf_v9', JSON.stringify({ fp: fingerprint, cfg: config })); } catch {}
    return config;

    } catch {
      return { dpr: Math.min(window.devicePixelRatio, 2), maxSteps: 160, qualityMedium: false, gpgpuTexSize: 192, starfieldCount: 8000, bloomPasses: 4, bloomScale: 0.5, motionBlur: true, antialias: true, gpuScore: 50, quality: 'ultra' };
    }
  }

  private readonly chapterConsoleMessages = [
    ['%c◈ CHAPTER 0 — YOU %c\nYou stand at the edge. The universe watches.', 'color:#FFB347;font-size:14px;font-weight:bold;text-shadow:0 0 10px #FFB347', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 1 — THE PULL %c\nGravity notices you. There is no ignoring it.', 'color:#00d4aa;font-size:14px;font-weight:bold;text-shadow:0 0 10px #00d4aa', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 2 — THE WARP %c\nSpacetime bends. Light follows curves you cannot see.', 'color:#00b4ff;font-size:14px;font-weight:bold;text-shadow:0 0 10px #00b4ff', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 3 — THE PHOTON SPHERE %c\nPhoton capture orbit detected. Light cannot escape this radius.', 'color:#0088ff;font-size:14px;font-weight:bold;text-shadow:0 0 10px #0088ff', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 4 — THE FALL %c\nYou crossed the boundary. The fall is eternal.', 'color:#6644ff;font-size:14px;font-weight:bold;text-shadow:0 0 10px #6644ff', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 5 — SPAGHETTIFICATION %c\nTidal forces stretch every atom. You become geometry.', 'color:#ff4488;font-size:14px;font-weight:bold;text-shadow:0 0 10px #ff4488', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 6 — TIME DILATION %c\nA second here is an eternity outside. Time forgets you.', 'color:#ff6644;font-size:14px;font-weight:bold;text-shadow:0 0 10px #ff6644', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 7 — SINGULARITY %c\nInfinite density. Zero volume. Physics surrenders.', 'color:#ff2222;font-size:14px;font-weight:bold;text-shadow:0 0 10px #ff2222', 'color:#888;font-size:11px;font-style:italic'],
    ['%c◈ CHAPTER 8 — WHAT REMAINS %c\nInformation persists. You were here.', 'color:#ffffff;font-size:14px;font-weight:bold;text-shadow:0 0 10px #fff', 'color:#aaa;font-size:11px;font-style:italic'],
  ];

  private logChapter(index: number) {
    if (import.meta.env.DEV) {
      const msg = this.chapterConsoleMessages[index];
      if (msg) console.log(msg[0], msg[1], msg[2]);
    }
  }

  private addTrackedListener(target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(event, handler, options);
    this.boundHandlers.push({ target, event, handler });
  }

  private activateAmbientUI() {
    const leaks = document.getElementById('ambient-leaks');
    if (leaks) setTimeout(() => leaks.classList.add('visible'), 800);
    const depthAura = document.getElementById('depth-aura');
    if (depthAura) setTimeout(() => depthAura.classList.add('visible'), 1200);
    document.querySelectorAll('.corner-ornament').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), 1200 + i * 200);
    });
  }

  private static readonly CHAPTER_AURA_COLORS = [
    'radial-gradient(ellipse, rgba(89, 33, 135, 0.06), transparent 70%)',
    'radial-gradient(ellipse, rgba(0, 100, 180, 0.06), transparent 70%)',
    'radial-gradient(ellipse, rgba(60, 20, 120, 0.08), transparent 70%)',
    'radial-gradient(ellipse, rgba(0, 180, 160, 0.05), transparent 70%)',
    'radial-gradient(ellipse, rgba(180, 60, 30, 0.06), transparent 70%)',
    'radial-gradient(ellipse, rgba(200, 80, 40, 0.08), transparent 70%)',
    'radial-gradient(ellipse, rgba(100, 60, 180, 0.07), transparent 70%)',
    'radial-gradient(ellipse, rgba(20, 10, 40, 0.10), transparent 70%)',
    'radial-gradient(ellipse, rgba(255, 240, 200, 0.04), transparent 70%)',
  ];

  private updateChapterAmbience(chapterIndex: number) {
    const aura = document.getElementById('depth-aura');
    if (aura) {
      const colors = this.isHardcoreMode ? HARDCORE.auraColors : this.isAlteredMode ? ALTERED.auraColors : Experience.CHAPTER_AURA_COLORS;
      aura.style.background = colors[chapterIndex] || '';
    }
    const root = document.documentElement;
    const cornerOpacities = [0.15, 0.12, 0.10, 0.12, 0.08, 0.06, 0.10, 0.04, 0.15];
    root.style.setProperty('--corner-opacity', String(cornerOpacities[chapterIndex] ?? 0.15));
  }

  private flashTransitionBar() {
    const bar = document.getElementById('chapter-transition-bar');
    if (!bar) return;
    gsap.killTweensOf(bar);
    gsap.fromTo(bar,
      { opacity: 0, scaleX: 0 },
      { opacity: 1, scaleX: 1, duration: 0.4, ease: 'power2.out',
        onComplete: () => {
          gsap.to(bar, { opacity: 0, scaleX: 0, duration: 0.8, ease: 'power3.in', delay: 0.15 });
        },
      },
    );
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

  private perfConfig!: PerfConfig;

  private async init() {
    const isMobileDevice = /Android|iPhone|iPad/i.test(navigator.userAgent);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: !isMobileDevice,
    });
    this.renderer.setPixelRatio(1);
    const initSize = clampedViewportSize();
    this.renderer.setSize(initSize.w, initSize.h);
    this.renderer.setClearColor(0x050505, 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.perfConfig = this.profileGpu(this.renderer);
    const urlQuality = new URL(window.location.href).searchParams.get('quality') as 'ultra' | 'high' | 'medium' | null;
    if (urlQuality === 'ultra' || urlQuality === 'high' || urlQuality === 'medium') {
      this.perfConfig = urlQuality === 'ultra'
        ? { dpr: Math.min(window.devicePixelRatio, 2), maxSteps: 160, qualityMedium: false, gpgpuTexSize: 256, starfieldCount: 12000, bloomPasses: 4, bloomScale: 0.5, motionBlur: true, antialias: true, gpuScore: 100, quality: 'ultra' }
        : urlQuality === 'high'
        ? { dpr: Math.min(window.devicePixelRatio, 1.5), maxSteps: 80, qualityMedium: false, gpgpuTexSize: 192, starfieldCount: 8000, bloomPasses: 3, bloomScale: 0.35, motionBlur: true, antialias: true, gpuScore: 60, quality: 'high' }
        : { dpr: 1.0, maxSteps: 100, qualityMedium: true, gpgpuTexSize: 128, starfieldCount: 3000, bloomPasses: 2, bloomScale: 0.2, motionBlur: true, antialias: true, gpuScore: 25, quality: 'medium' };
    }
    this.state.quality = this.perfConfig.quality;
    this.adaptiveDpr = this.perfConfig.dpr;
    this.adaptiveMaxSteps = this.perfConfig.maxSteps;
    this.adaptiveBloomPasses = this.perfConfig.bloomPasses;
    this.adaptiveBloomScale = this.perfConfig.bloomScale;

    this.renderer.setPixelRatio(this.perfConfig.dpr);
    this.renderer.setSize(initSize.w, initSize.h);
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';

    this.postProcessing = new PostProcessing(this.renderer, this.perfConfig.bloomPasses, this.perfConfig.bloomScale, this.perfConfig.qualityMedium, this.perfConfig.motionBlur);

    this.blackHole = new BlackHole(this.postProcessing.bgScene, this.perfConfig.maxSteps, this.perfConfig.qualityMedium, this.perfConfig.dpr);
    this.blackHole.setRenderer(this.renderer);
    if (!isMobileDevice) {
      this.particles = new GPGPUParticles(this.renderer, this.postProcessing.particleScene, this.perfConfig.gpgpuTexSize, this.perfConfig.dpr);
    }
    this.starfield = new Starfield(this.postProcessing.particleScene, this.perfConfig.starfieldCount);

    this.renderer.compile(this.postProcessing.bgScene, this.postProcessing.bgCamera);
    this.renderer.compile(this.postProcessing.particleScene, this.postProcessing.particleCamera);

    this.timeline = new Timeline();
    this.textReveal = new TextReveal();
    this.audio = new AudioEngine();
    this.syncAlteredMode();
    this.haptics = new Haptics();
    this.setupLenis();
    this.computeChapterBreaks();
    this.setupMouse();
    this.setupHoldInteraction();
    this.setupCursor();
    this.setupKeyboard();
    this.setupResize();
    this.setupClickShockwave();
    this.setupMobileNav();

    if (!isMobileDevice) {
      const roomId = generateRoomId();
      this.broadcaster = new DesktopBroadcaster(roomId);
      this.broadcaster.connect();
      const baseUrl = window.location.origin + window.location.pathname;
      this.qrOverlay = new QROverlay(roomId, baseUrl);
      this.generateSoundPromptQR(`${baseUrl}?companion=${roomId}&lang=${getLang()}`);
      this.broadcaster.onCompanionJoin(() => this.onCompanionConnected());
      this.broadcaster.onCompanionLeave(() => this.onCompanionDisconnected());
    }

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

    const steps = t().loader.steps;
    setProgress(10, steps[0]);
    await this.frame();

    setProgress(25, steps[1]);
    await this.frame();
    this.renderer.compile(this.postProcessing.bgScene, this.postProcessing.bgCamera);
    await this.frame();

    setProgress(45, steps[2]);
    await this.frame();
    this.renderer.compile(this.postProcessing.particleScene, this.postProcessing.particleCamera);
    await this.frame();

    setProgress(60, steps[3]);
    await this.frame();
    this.postProcessing.render();
    await this.frame();

    setProgress(75, steps[4]);
    await this.frame();

    setProgress(88, steps[5]);
    await new Promise<void>(r => setTimeout(r, 300));

    setProgress(100, steps[6]);
    await new Promise<void>(r => setTimeout(r, 400));
  }

  private frame(): Promise<void> {
    return new Promise(r => requestAnimationFrame(() => r()));
  }

  private onReady() {
    const loader = document.getElementById('loader');
    if (loader) {
      setTimeout(() => {
          if (this.visitCount >= 3) {
            loader.classList.add('hidden');
            setTimeout(() => this.showLoop4Terminal(), 100);
            return;
          }

          const wasActive = sessionStorage.getItem('eh_session_active');
          if (wasActive && this.visitCount >= 1) {
            this.visitCount++;
            if (this.visitCount >= 2) { this.isHardcoreMode = true; }
            this.isAlteredMode = true;
            this.syncAlteredMode();
            loader.classList.add('hidden');
            setTimeout(() => this.showEscapeCatcher(), 100);
            return;
          }

          if (this.isAlteredMode) {
            const soundPrompt = document.getElementById('sound-prompt');
            if (soundPrompt) soundPrompt.style.display = 'none';
            loader.classList.add('hidden');
            this.state.soundEnabled = true;
            this.audio.start().then(() => {
              const muteBtn = document.getElementById('mute-btn');
              if (muteBtn) muteBtn.classList.add('sound-on');
              this.playIntroCinematic();
            });
            return;
          }

          const warningEl = document.getElementById('sound-warning');
          if (warningEl) warningEl.textContent = t().accessWarning;

          const soundPrompt = document.getElementById('sound-prompt');
          if (soundPrompt) soundPrompt.classList.add('visible');
          this.lenis.stop();
          this.setupSoundPrompt();
          loader.classList.add('hidden');
      }, 400);
    }
  }

  private showLoop4Terminal() {
    const terminal = document.getElementById('loop4-terminal');
    if (!terminal) return;

    const soundPrompt = document.getElementById('sound-prompt');
    if (soundPrompt) soundPrompt.style.display = 'none';

    terminal.classList.add('visible');
    terminal.setAttribute('aria-hidden', 'false');

    const tr = t();
    const textEl = document.getElementById('loop4-text');
    const countdownEl = document.getElementById('loop4-countdown');

    const lines = [tr.loop4.line1, tr.loop4.line2, tr.loop4.line3];
    let charIndex = 0;
    let lineIndex = 0;
    let buffer = '';

    const typewriter = () => {
      if (lineIndex >= lines.length) {
        this.startLoop4Countdown(countdownEl);
        return;
      }
      const currentLine = lines[lineIndex];
      if (charIndex < currentLine.length) {
        buffer += currentLine[charIndex];
        if (textEl) textEl.innerHTML = buffer + '<span class="loop4-blink">_</span>';
        charIndex++;
        setTimeout(typewriter, 40 + Math.random() * 60);
      } else {
        buffer += '<br>';
        charIndex = 0;
        lineIndex++;
        setTimeout(typewriter, 800);
      }
    };

    setTimeout(typewriter, 1500);
  }

  private startLoop4Countdown(countdownEl: HTMLElement | null) {
    if (!countdownEl) return;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 21);
    targetDate.setHours(0, 0, 0, 0);

    const tr = t();

    const update = () => {
      const now = Date.now();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) {
        countdownEl.textContent = '00:00:00:00';
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      countdownEl.innerHTML =
        `<span class="loop4-label">${tr.loop4.countdown}</span><br>` +
        `<span class="loop4-timer">${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</span>`;
      requestAnimationFrame(update);
    };

    setTimeout(() => {
      countdownEl.style.opacity = '1';
      update();
    }, 1200);
  }

  private showEscapeCatcher() {
    const escapeCount = parseInt(localStorage.getItem('eh_escapes') || '0', 10) + 1;
    localStorage.setItem('eh_escapes', String(escapeCount));

    const catcher = document.getElementById('escape-catcher');
    if (!catcher) return;

    const tr = t();
    const titleEl = document.getElementById('escape-title');
    const subtitleEl = document.getElementById('escape-subtitle');
    const loopEl = document.getElementById('escape-loop-count');
    const resumeBtn = document.getElementById('escape-resume');

    if (titleEl) titleEl.textContent = tr.escapeCatcher.title;
    if (subtitleEl) subtitleEl.textContent = tr.escapeCatcher.subtitle;
    if (loopEl) loopEl.textContent = tr.escapeCatcher.loopCount.replace('{n}', String(this.visitCount));
    if (resumeBtn) resumeBtn.textContent = tr.escapeCatcher.resume;

    catcher.classList.add('visible');
    catcher.setAttribute('aria-hidden', 'false');

    const soundPrompt = document.getElementById('sound-prompt');
    if (soundPrompt) soundPrompt.style.display = 'none';

    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        catcher.style.transition = 'opacity 1.5s ease';
        catcher.style.opacity = '0';
        setTimeout(() => {
          catcher.classList.remove('visible');
          catcher.style.display = 'none';
          this.resumeAfterEscape();
        }, 1500);
      }, { once: true });
    }
  }

  private resumeAfterEscape() {
    if (this.visitCount >= 3) {
      this.showLoop4Terminal();
      return;
    }

    const savedSound = localStorage.getItem('eh_sound');
    const withSound = savedSound === '1';
    this.state.soundEnabled = withSound;

    if (withSound) {
      this.audio.start().then(() => {
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) muteBtn.classList.add('sound-on');
      });
    }

    this.playIntroCinematic();
  }

  private setupSoundPrompt() {
    const prompt = document.getElementById('sound-prompt');
    const yesBtn = document.getElementById('sound-prompt-yes');
    const noBtn = document.getElementById('sound-prompt-no');
    const muteBtn = document.getElementById('mute-btn');

    const dismiss = async (withSound: boolean) => {
      this.state.soundEnabled = withSound;
      localStorage.setItem('eh_sound', withSound ? '1' : '0');

      if (withSound) {
        await this.audio.start();
        if (muteBtn) muteBtn.classList.add('sound-on');
        this.audio.triggerEnterPulse();
      }

      this.postProcessing.triggerShockwave(0.5, 0.5, 0.35);
      this.enterPulse = 1.0;
      this.chapterFlash = 0.3;

      if (prompt) {
        prompt.classList.add('dissolving');
        setTimeout(() => prompt.classList.remove('visible'), 50);
        setTimeout(() => { prompt.style.display = 'none'; }, 1200);
      }
      this.lenis.start();

      setTimeout(() => {
        this.playIntroCinematic();
      }, 500);
    };

    if (yesBtn) this.addTrackedListener(yesBtn, 'click', () => dismiss(true));
    if (noBtn) this.addTrackedListener(noBtn, 'click', () => dismiss(false));

    const soundLangToggle = document.getElementById('sound-lang-toggle');
    if (soundLangToggle) {
      const updateSoundLangBtn = () => {
        this.updateLangToggle(soundLangToggle);
        const tr = t();
        const sText = document.getElementById('sound-prompt-text');
        const sYes = document.getElementById('sound-prompt-yes');
        const sNo = document.getElementById('sound-prompt-no');
        if (sText) sText.textContent = tr.sound.label;
        if (sYes) sYes.textContent = tr.sound.yes;
        if (sNo) sNo.textContent = tr.sound.no;
        const sWarn = document.getElementById('sound-warning');
        if (sWarn) sWarn.textContent = tr.accessWarning;
        const pTagline = document.getElementById('prompt-tagline');
        if (pTagline) pTagline.textContent = tr.prompt.tagline;
        const pDesc = document.getElementById('prompt-description');
        if (pDesc) pDesc.innerHTML = tr.prompt.description.replace('9', '<br>9');
        const pKws = document.querySelectorAll('.prompt-kw');
        pKws.forEach((el, i) => { if (tr.prompt.keywords[i]) el.textContent = tr.prompt.keywords[i]; });
        const pRec = document.getElementById('prompt-recommend-text');
        if (pRec) pRec.textContent = tr.prompt.recommend;
      };
      updateSoundLangBtn();
      this.addTrackedListener(soundLangToggle, 'click', (e: Event) => {
        e.stopPropagation();
        const newLang: Lang = getLang() === 'en' ? 'fr' : 'en';
        setLang(newLang);
        updateSoundLangBtn();
      });
    }

    if (yesBtn) setTimeout(() => yesBtn.focus(), 100);

    if (yesBtn) {
      const magnetic = 12;
      const glowEl = document.createElement('div');
      glowEl.id = 'btn-magnetic-glow';
      yesBtn.appendChild(glowEl);

      this.addTrackedListener(yesBtn, 'mousemove', ((e: MouseEvent) => {
        const rect = yesBtn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        yesBtn.style.transform = `translate(${dx * magnetic}px, ${dy * magnetic}px)`;
        const px = ((e.clientX - rect.left) / rect.width) * 100;
        const py = ((e.clientY - rect.top) / rect.height) * 100;
        glowEl.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,179,71,0.25) 0%, transparent 60%)`;
        glowEl.style.opacity = '1';
      }) as EventListener);

      this.addTrackedListener(yesBtn, 'mouseleave', (() => {
        yesBtn.style.transform = '';
        glowEl.style.opacity = '0';
      }) as EventListener);
    }

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

    const companionTextEl = document.getElementById('sound-companion-text');
    if (companionTextEl) {
      const updateCompanionLang = () => {
        const tr = t();
        companionTextEl.textContent = tr.companion.text;
        const titleEl = document.getElementById('sound-companion-title');
        if (titleEl) titleEl.textContent = tr.companion.title;
        const headlineEl = document.getElementById('sound-companion-headline');
        if (headlineEl) headlineEl.textContent = tr.companion.headline;
        const badgeEl = document.getElementById('sound-companion-badge-text');
        if (badgeEl) badgeEl.textContent = tr.companion.badge;
        const scanEl = document.getElementById('sound-companion-scan-text');
        if (scanEl) scanEl.textContent = tr.companion.scan;
        const urgencyEl = document.getElementById('sound-companion-urgency');
        if (urgencyEl) urgencyEl.textContent = tr.companion.urgency;
        const featEls = document.querySelectorAll('.comp-feat-label');
        featEls.forEach((el, i) => { if (tr.companion.features[i]) el.textContent = tr.companion.features[i]; });
      };
      updateCompanionLang();
      onLangChange(updateCompanionLang);
    }

    const shareBtn = document.getElementById('share-btn');
    [yesBtn, noBtn, shareBtn].forEach((btn) => {
      if (btn) this.addTrackedListener(btn, 'mouseenter', () => {
        if (this.state.soundEnabled) this.audio.triggerUIHover();
      });
    });

    if (shareBtn) {
      this.addTrackedListener(shareBtn, 'click', async () => {
        const url = window.location.origin + window.location.pathname;
        const tr = t();
        const anomalyMsg = tr.shareAnomaly;
        const shareData = {
          title: `Event Horizon — ${tr.introSubtitle}`,
          text: tr.share.text,
          url,
        };
        const incrementShareCount = () => {
          const prev = parseInt(localStorage.getItem('eh_shares') || '0', 10);
          localStorage.setItem('eh_shares', String(prev + 1));
          this.updateShareCount();
        };
        if (navigator.share && navigator.canShare?.(shareData)) {
          try {
            await navigator.share(shareData);
            incrementShareCount();
          } catch {}
        } else {
          const clipText = `${url} ... ${anomalyMsg}`;
          navigator.clipboard.writeText(clipText).then(() => {
            shareBtn.textContent = t().share.copied;
            shareBtn.classList.add('copied');
            incrementShareCount();
            setTimeout(() => {
              shareBtn.textContent = t().share.share;
              shareBtn.classList.remove('copied');
            }, 3000);
          }).catch(() => {
            shareBtn.textContent = url;
            setTimeout(() => { shareBtn.textContent = t().share.share; }, 4000);
          });
        }
      });
    }

    const returnBtn = document.getElementById('return-btn');
    if (returnBtn) {
      this.addTrackedListener(returnBtn, 'click', () => {
        this.showTrapOverlay();
      });
      this.addTrackedListener(returnBtn, 'mouseenter', () => {
        if (this.state.soundEnabled) this.audio.triggerUIHover();
      });
    }

    this.updateShareCount();

    if (muteBtn) {
      this.addTrackedListener(muteBtn, 'click', () => {
        this.state.soundEnabled = !this.state.soundEnabled;
        localStorage.setItem('eh_sound', this.state.soundEnabled ? '1' : '0');
        this.audio.setMuted(!this.state.soundEnabled);
        const iconOn = document.getElementById('mute-icon-on');
        const iconOff = document.getElementById('mute-icon-off');
        if (iconOn) iconOn.style.display = this.state.soundEnabled ? 'block' : 'none';
        if (iconOff) iconOff.style.display = this.state.soundEnabled ? 'none' : 'block';
        if (this.state.soundEnabled) muteBtn.classList.add('sound-on');
        else muteBtn.classList.remove('sound-on');
      });
    }

    this.setupFullscreenButton();
    this.setupLangButton();
    this.applyTranslations();
  }

  private setupFullscreenButton() {
    const fsBtn = document.getElementById('fs-btn');
    if (!fsBtn) return;

    const iconEnter = document.getElementById('fs-icon-enter');
    const iconExit = document.getElementById('fs-icon-exit');

    const updateIcon = () => {
      const isFs = !!document.fullscreenElement;
      if (iconEnter) iconEnter.style.display = isFs ? 'none' : 'block';
      if (iconExit) iconExit.style.display = isFs ? 'block' : 'none';
    };

    this.addTrackedListener(fsBtn, 'click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      if (this.state.soundEnabled) this.audio.triggerUIHover();
    });

    document.addEventListener('fullscreenchange', updateIcon);
  }

  private updateShareCount() {
    const el = document.getElementById('share-count');
    if (!el) return;
    const stored = parseInt(localStorage.getItem('eh_shares') || '0', 10);
    if (stored > 0) {
      el.textContent = t().share.count.replace('{n}', stored.toLocaleString());
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }

  private updateLangToggle(container: HTMLElement) {
    const opts = container.querySelectorAll<HTMLElement>('.lang-opt');
    const current = getLang();
    opts.forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === current);
    });
  }

  private setupLangButton() {
    const langBtn = document.getElementById('lang-btn');
    if (!langBtn) return;

    this.updateLangToggle(langBtn);

    this.addTrackedListener(langBtn, 'click', (e: Event) => {
      e.stopPropagation();
      const newLang: Lang = getLang() === 'en' ? 'fr' : 'en';
      setLang(newLang);
      if (this.state.soundEnabled) this.audio.triggerUIHover();
    });

    onLangChange(() => {
      this.updateLangToggle(langBtn);
      this.applyTranslations();
      if (this.broadcaster) {
        this.broadcaster.sendMeta({
          lang: getLang(),
          isAltered: this.isAlteredMode,
          isHardcore: this.isHardcoreMode,
          totalChapters: 9,
        });
      }
    });
  }

  private applyTranslations() {
    const tr = t();
    const hudDist = document.querySelector('.hud-distance .hud-label');
    const hudTemp = document.querySelector('.hud-temp .hud-label');
    const hudDil = document.querySelector('.hud-timedil .hud-label');
    const hudElapsed = document.querySelector('.hud-elapsed .hud-label');
    const hudTidal = document.querySelector('.hud-tidal .hud-label');
    if (hudDist) hudDist.textContent = tr.hud.distance;
    if (hudTemp) hudTemp.textContent = tr.hud.temp;
    if (hudDil) hudDil.textContent = tr.hud.timeDilation;
    if (hudElapsed) hudElapsed.textContent = tr.hud.elapsed;
    if (hudTidal) hudTidal.textContent = tr.hud.tidalForce;

    const soundText = document.getElementById('sound-prompt-text');
    const soundYes = document.getElementById('sound-prompt-yes');
    const soundNo = document.getElementById('sound-prompt-no');
    if (soundText) soundText.textContent = tr.sound.label;
    if (soundYes) soundYes.textContent = tr.sound.yes;
    if (soundNo) soundNo.textContent = tr.sound.no;
    const pTagline2 = document.getElementById('prompt-tagline');
    if (pTagline2) pTagline2.textContent = tr.prompt.tagline;
    const pDesc2 = document.getElementById('prompt-description');
    if (pDesc2) pDesc2.innerHTML = tr.prompt.description.replace('9', '<br>9');
    const pKws2 = document.querySelectorAll('.prompt-kw');
    pKws2.forEach((el, i) => { if (tr.prompt.keywords[i]) el.textContent = tr.prompt.keywords[i]; });
    const pRec2 = document.getElementById('prompt-recommend-text');
    if (pRec2) pRec2.textContent = tr.prompt.recommend;

    const shareBtn = document.getElementById('share-btn');
    const returnBtn = document.getElementById('return-btn');
    if (shareBtn && !shareBtn.classList.contains('copied')) shareBtn.textContent = tr.share.share;
    if (returnBtn) returnBtn.textContent = tr.share.return;

    const creditsSub = document.querySelector('.credits-sub');
    if (creditsSub) creditsSub.textContent = tr.credits.sub;

    const creditsRoles = document.querySelectorAll('.credits-role');
    const creditsNames = document.querySelectorAll('.credits-name');
    tr.credits.roles.forEach((r, i) => {
      if (creditsRoles[i]) creditsRoles[i].textContent = r.role;
      if (creditsNames[i]) creditsNames[i].textContent = r.name;
    });

    const creditsFooter = document.querySelector('.credits-footer');
    if (creditsFooter) creditsFooter.innerHTML = tr.credits.footer;

    const rotateText = document.getElementById('rotate-text');
    if (rotateText) rotateText.textContent = tr.rotate.text;

    const scrollText = document.querySelector('#scroll-hint .scroll-text');
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (scrollText) scrollText.textContent = isMobile ? tr.scroll.mobile : tr.scroll.desktop;

    const loaderSub = document.getElementById('loader-sub');
    if (loaderSub) loaderSub.textContent = tr.loader.sub;

    const introSubtitle = document.getElementById('intro-subtitle');
    if (introSubtitle) introSubtitle.textContent = tr.introSubtitle;

    const epigraph = document.querySelector('.credits-epigraph');
    if (epigraph) epigraph.innerHTML = tr.credits.epigraph;

    const soundLangToggle = document.getElementById('sound-lang-toggle');
    if (soundLangToggle) this.updateLangToggle(soundLangToggle);
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) this.updateLangToggle(langBtn);

    this.navDots.forEach((dot, i) => {
      const label = tr.chapterNames[i] || '';
      dot.setAttribute('data-label', label);
      dot.setAttribute('aria-label', `Go to chapter: ${label}`);
    });

    if (this.chapterIndicatorTitle) {
      const chapterIndex = this.getChapterFromScroll(this.state.scroll);
      this.chapterIndicatorTitle.textContent = tr.chapterNames[chapterIndex] || '';
    }

    document.documentElement.lang = getLang();


    this.updateShareCount();

    if (this.timeline) {
      this.timeline.refreshCurrentChapter(this.state.scroll, this.getChapterFromScroll(this.state.scroll));
    }
  }

  private async generateSoundPromptQR(url: string) {
    const container = document.getElementById('sound-companion-qr');
    if (!container) return;
    try {
      const qrGen = (await import('qrcode-generator')).default;
      const qr = qrGen(0, 'M');
      qr.addData(url);
      qr.make();
      container.innerHTML = qr.createSvgTag({ scalable: true, margin: 0 });
      const svg = container.querySelector('svg');
      if (svg) {
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.querySelectorAll('rect[fill="#000000"]').forEach(r => {
          (r as SVGElement).setAttribute('fill', 'rgba(255, 240, 224, 0.75)');
        });
        svg.querySelectorAll('rect[fill="#ffffff"]').forEach(r => {
          (r as SVGElement).setAttribute('fill', 'transparent');
        });
      }
    } catch (_) {}
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

    const isMobileDevice = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const tr = t();
    const hintEl = document.getElementById('scroll-hint');
    if (hintEl) {
      const hintText = hintEl.querySelector('.scroll-text');
      if (hintText) hintText.textContent = isMobileDevice ? tr.scroll.mobile : tr.scroll.desktop;
    }

    this.state.introActive = true;
    this.state.introProgress = 0.97;
    intro.classList.add('active');

    if (this.broadcaster) {
      const metaPayload = () => ({
        lang: getLang(),
        isAltered: this.isAlteredMode,
        isHardcore: this.isHardcoreMode,
        totalChapters: 9,
      });
      this.broadcaster.sendMeta(metaPayload());
      // Re-send meta every 3s while on intro so late-connecting companions get the language
      this.introMetaInterval = window.setInterval(() => {
        if (this.broadcaster) this.broadcaster.sendMeta(metaPayload());
      }, 3000);
    }

    const titleText = this.isAlteredMode ? t().alteredTitle : 'EVENT HORIZON';
    if (subtitle) subtitle.textContent = this.isHardcoreMode ? t().hardcoreIntroSubtitle : this.isAlteredMode ? t().alteredIntroSubtitle : t().introSubtitle;
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

    if (muteBtn) setTimeout(() => muteBtn.classList.add('visible'), 600);
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) setTimeout(() => langBtn.classList.add('visible'), 800);
    const fsBtn = document.getElementById('fs-btn');
    if (fsBtn) setTimeout(() => fsBtn.classList.add('visible'), 1000);

    const onIntroComplete = () => {
      if (this.introMetaInterval) { clearInterval(this.introMetaInterval); this.introMetaInterval = 0; }
      intro.classList.add('fade-out');
      intro.classList.remove('active');
      setTimeout(() => { intro.style.visibility = 'hidden'; }, 2500);
      if (dataHud) dataHud.classList.add('visible');
      this.activateAmbientUI();
      this.experienceStartTime = performance.now();
      this.timeline.start(this.state.soundEnabled);
      this.textReveal.start();
      this.showScrollOverlay();
      if (this.broadcaster) {
        const chapters = this.isHardcoreMode ? t().hardcoreChapters : this.isAlteredMode ? t().alteredChapters : t().chapters;
        const interstitials = this.getInterstitials();
        this.broadcaster.sendChapter({
          index: 0,
          title: chapters[0]?.title || this.getChapterNames()[0],
          subtitle: chapters[0]?.subtitle || '',
          interstitial: interstitials[0] || '',
        });
      }
      gsap.to(this.state, {
        introProgress: 1,
        duration: 2,
        ease: 'power2.out',
        onComplete: () => {
          this.state.introActive = false;
          intro.style.visibility = 'hidden';
          ScrollTrigger.refresh();
        },
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
      const arriveTime = 0.03 + i * 0.035;
      const dur = 0.6 + Math.random() * 0.2;

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
            const sparkColor = this.isAlteredMode ? 'rgba(255,60,30,0.8)' : 'rgba(0,245,212,0.8)';
            const sparkGlow = this.isAlteredMode ? 'rgba(255,40,20,0.6)' : 'rgba(0,245,212,0.6)';
            spark.style.cssText = `position:absolute;width:2px;height:2px;border-radius:50%;background:${sparkColor};box-shadow:0 0 4px ${sparkGlow};pointer-events:none;z-index:100;`;
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
      }, 0.7);
    }

    if (introLine) {
      tl.to(introLine, { width: '120px', duration: 0.6, ease: 'power2.inOut' }, 1.3);
    }

    tl.to(this.state, { introProgress: 0.6, duration: 1.2, ease: 'power2.inOut' }, 0);

    letterSpans.forEach((span, i) => {
      tl.to(span, {
        y: -30 - Math.random() * 20,
        opacity: 0,
        filter: 'blur(8px)',
        scale: 0.7,
        rotation: (Math.random() - 0.5) * 40,
        duration: 0.4,
        ease: 'power2.in',
      }, 2.8 + i * 0.015);
    });

    if (subtitle) {
      tl.to(subtitle, { opacity: 0, filter: 'blur(6px)', duration: 0.5, ease: 'power2.in' }, 2.8);
    }
    if (introLine) {
      tl.to(introLine, { width: '0px', opacity: 0, duration: 0.3, ease: 'power2.in' }, 2.8);
    }

    tl.to(titleContainer, { opacity: 0, scale: 0.85, duration: 0.5, ease: 'power2.in' }, 1.7);
  }

  private setupLenis() {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    this.lenis = new Lenis({
      duration: isMobile ? 1.2 : 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: isMobile ? 1.2 : 1.3,
      touchMultiplier: isMobile ? 1.8 : 1.2,
      infinite: false,
    });

    this.lenisBackupInterval = window.setInterval(() => {
      const timeSinceRaf = performance.now() - this.lastRafTime;
      if (timeSinceRaf > 300) {
        this.lenis.raf(performance.now());
      }
    }, 150);

    const progressFill = document.getElementById('progress-fill');
    const progressBar = document.getElementById('progress-bar');
    const progressTicks = progressBar ? Array.from(progressBar.querySelectorAll('.progress-tick')) : [];

    this.lenis.on('scroll', (e: { scroll: number; limit: number; velocity: number }) => {
      this.state.scroll = e.limit > 0 ? e.scroll / e.limit : 0;
      this.state.scrollVelocity = e.velocity;
      this.lastScrollActivity = performance.now();
      this.idleHintShown = false;
      if (this.state.scroll > 0.01) sessionStorage.setItem('eh_session_active', '1');

      if (this.state.scroll > 0.35 && this.state.scroll < 0.92 && e.velocity < -50) {
        this.showEscapeMessage();
      }

      ScrollTrigger.update();

      const overlayFade = this.state.scroll > 0.6 ? Math.max(0, 1 - (this.state.scroll - 0.6) / 0.2) : 1;
      document.documentElement.style.setProperty('--overlay-opacity', String(overlayFade));

      const pct = Math.round(this.state.scroll * 100);
      if (progressFill) {
        progressFill.style.width = `${pct}%`;
        progressFill.parentElement?.style.setProperty('--progress', `${pct}%`);
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
        hint.textContent = t().doubleTap;
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
      const cursorPos = { x: 0, y: 0 };
      let mouseX = 0;
      let mouseY = 0;

      const onMouseMove = (e: Event) => {
        const me = e as MouseEvent;
        mouseX = me.clientX;
        mouseY = me.clientY;
      };
      this.addTrackedListener(window, 'mousemove', onMouseMove);

      for (let i = 0; i < 16; i++) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.width = '3px';
        trail.style.height = '3px';
        trail.style.background = 'rgba(255, 179, 71, 0.4)';
        trail.style.boxShadow = '0 0 6px rgba(255, 179, 71, 0.25), 0 0 12px rgba(255, 179, 71, 0.1)';
        trail.style.opacity = '0';
        document.body.appendChild(trail);
        this.trailParticles.push(trail);
      }

      const lerpRing = () => {
        cursorPos.x += (mouseX - cursorPos.x) * 0.35;
        cursorPos.y += (mouseY - cursorPos.y) * 0.35;
        if (this.cursor) {
          this.cursor.style.left = `${cursorPos.x}px`;
          this.cursor.style.top = `${cursorPos.y}px`;
        }

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

  private smoothGravity = 0;

  private updateCinematicScroll() {
    const scroll = this.state.scroll;

    if (!this.pointOfNoReturnTriggered && scroll >= this.getChapterMid(4)) {
      this.pointOfNoReturnTriggered = true;
      if (this.state.soundEnabled) this.audio.triggerPointOfNoReturn();
    }

    if (!this.singularityTriggered && scroll >= this.getChapterMid(7)) {
      this.singularityTriggered = true;
      if (this.state.soundEnabled) this.audio.triggerSingularity();
      this.startCinematicAutoScroll();
    }

    if (this.cinematicAutoScrollStarted) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentTop = this.lenis.scroll;
      if (currentTop < maxScroll - 1) {
        const speed = 2 + (scroll - 0.82) * 8;
        this.lenis.scrollTo(Math.min(currentTop + speed, maxScroll), { immediate: true });
      }
    }
  }

  private updateGravityPull(dt: number) {
    const scroll = this.state.scroll;

    if (this.cinematicAutoScrollStarted) {
      this.gravityVelocity = 0;
      this.smoothGravity = 0;
      return;
    }

    if (dt > 0.25) {
      this.gravityVelocity *= 0.5;
      this.smoothGravity *= 0.5;
      return;
    }

    if (this.state.introActive || scroll > 0.93) {
      this.gravityVelocity *= 0.85;
      this.smoothGravity *= 0.85;
      return;
    }

    this.gravityMaxReached = Math.max(this.gravityMaxReached, scroll);
    const isStopped = Math.abs(this.state.scrollVelocity) < 0.2;
    const isScrollingUp = this.state.scrollVelocity < -0.3;

    let totalForce = 0;
    if (scroll > 0.15) { const g0 = (scroll - 0.15) / 0.85; totalForce += g0 * 0.5; }
    if (scroll > 0.35) { const g1 = (scroll - 0.35) / 0.65; totalForce += g1 * g1 * 3.0; }
    if (scroll > 0.50) { const g2 = (scroll - 0.50) / 0.50; totalForce += g2 * Math.sqrt(g2) * 8.0; }
    if (scroll > 0.65) { const g3 = (scroll - 0.65) / 0.35; totalForce += g3 * g3 * 18.0; }
    if (scroll > 0.80) { const g4 = (scroll - 0.80) / 0.20; totalForce += g4 * g4 * 35.0; }

    const extraVisits = Math.min(this.visitCount - 1, 4);
    if (extraVisits > 0) totalForce *= 1 + extraVisits * 0.2;

    if (this.holdStrength > 0.1) {
      totalForce *= 1 - this.holdStrength * 0.6;
    }

    if (isScrollingUp && scroll > 0.40) {
      this.gravityVelocity += totalForce * dt * 2.0;
    } else if (isStopped) {
      this.gravityVelocity += totalForce * dt * 1.5;
    } else {
      this.gravityVelocity += totalForce * dt * 0.6;
    }

    this.gravityVelocity = Math.min(this.gravityVelocity, 4 + scroll * 12);
    this.gravityVelocity *= 0.96;

    this.smoothGravity += (this.gravityVelocity - this.smoothGravity) * 0.3;

    if (this.smoothGravity > 0.05) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentTop = this.lenis.scroll;
      const newTop = Math.min(currentTop + this.smoothGravity, maxScroll);
      if (newTop > currentTop) {
        this.lenis.scrollTo(newTop, { immediate: true });
      }
    }
  }

  private easterBuffer = '';

  private setupKeyboard() {
    this.addTrackedListener(window, 'keydown', ((e: KeyboardEvent) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentChapter = this.getChapterFromScroll(this.state.scroll);

      if (e.key.length === 1) {
        this.easterBuffer = (this.easterBuffer + e.key.toLowerCase()).slice(-10);
        const cosmicKeys = ['help', 'light', 'time', 'void', 'escape', 'hello', 'god', 'love'];
        for (const key of cosmicKeys) {
          if (this.easterBuffer.endsWith(key)) {
            const msg = t().cosmic[key];
            if (msg) this.showCosmicMessage(msg);
            break;
          }
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
      const { w, h } = clampedViewportSize();
      this.renderer.setSize(w, h);
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
      this.postProcessing.resize();
      this.blackHole.syncResolution();
      this.computeChapterBreaks();
    };

    this.addTrackedListener(window, 'resize', onResize as EventListener);
    if (window.visualViewport) {
      this.addTrackedListener(window.visualViewport, 'resize', onResize as EventListener);
    }
    onResize();

    let tabLeftAt = 0;
    const getTabMessages = () => t().tab;
    this.addTrackedListener(document, 'visibilitychange', (() => {
      if (document.hidden) {
        tabLeftAt = performance.now();
      } else if (this.state.scroll > 0.05) {
        this.chapterFlash = 0.3;
        this.postProcessing.triggerShockwave(0.5, 0.5, 0.6);
        const away = performance.now() - tabLeftAt;
        if (away > 5000 && this.state.scroll > 0.15 && this.state.scroll < 0.9) {
          this.showCosmicMessage(getTabMessages()[Math.floor(Math.random() * getTabMessages().length)]);
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

  private setupMobileNav() {
    if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    this.mobileNavEl = document.getElementById('mobile-nav');
    const downBtn = document.getElementById('mobile-nav-down');
    if (!this.mobileNavEl || !downBtn) return;

    const miniScroll = () => {
      const scrollAmount = window.innerHeight * 0.6;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      if (this.state.soundEnabled) this.audio.triggerUIHover();
    };

    this.addTrackedListener(downBtn, 'click', () => miniScroll());
  }

  private updateMobileNav() {
    if (!this.mobileNavEl) return;

    const isVisible = this.state.scroll < 0.95 && !this.state.introActive;
    this.mobileNavEl.classList.toggle('visible', isVisible);

    if (!isVisible) return;

    const s = this.state.scroll;
    const r = Math.round(s < 0.4 ? 0 : Math.min(255, (s - 0.4) * 425));
    const g = Math.round(s < 0.4 ? 245 : Math.max(40, 245 - (s - 0.4) * 340));
    const b = Math.round(s < 0.4 ? 212 : Math.max(20, 212 - (s - 0.4) * 320));
    this.mobileNavEl.style.setProperty('--nav-color', `${r}, ${g}, ${b}`);
  }

  private readonly isMobileDevice = /Android|iPhone|iPad/i.test(navigator.userAgent);
  private fpsFrames = 0;
  private fpsLastTime = 0;
  private fpsValue = 60;
  private lowFpsCount = 0;
  private downgradeCount = 0;
  private fpsStableCount = 0;
  private emergencySlowFrames = 0;
  private adaptiveLevel = 0;
  private adaptiveDpr = 2.0;
  private adaptiveMaxSteps = 160;
  private adaptiveBloomPasses = 4;
  private adaptiveBloomScale = 0.5;

  private applyAdaptiveQuality() {
    this.renderer.setPixelRatio(this.adaptiveDpr);
    this.postProcessing.setBloomPasses(this.adaptiveBloomPasses);
    this.postProcessing.setBloomScale(this.adaptiveBloomScale);
    this.blackHole.setMaxSteps(this.adaptiveMaxSteps);
    this.postProcessing.resize();
    this.blackHole.syncResolution();
    { const _v = clampedViewportSize(); this.renderer.setSize(_v.w, _v.h); }
  }

  private adaptiveDowngrade(emergency: boolean) {
    if (this.adaptiveLevel >= 8) return;
    this.adaptiveLevel++;
    const maxDpr = Math.min(this.perfConfig.dpr, this.isMobileDevice ? 1.0 : Math.min(window.devicePixelRatio, 2));
    const minDpr = this.isMobileDevice ? 0.75 : 1.0;

    switch (this.adaptiveLevel) {
      case 1: this.adaptiveDpr = Math.max(minDpr, maxDpr - 0.25); break;
      case 2: this.adaptiveBloomPasses = 3; this.adaptiveBloomScale = 0.40; break;
      case 3: this.adaptiveDpr = Math.max(minDpr, maxDpr - 0.5); break;
      case 4: this.adaptiveMaxSteps = 120; break;
      case 5: this.adaptiveBloomPasses = 2; this.adaptiveBloomScale = 0.30; break;
      case 6: this.adaptiveDpr = Math.max(minDpr, maxDpr - 0.75); this.adaptiveMaxSteps = 110; break;
      case 7: this.adaptiveBloomPasses = 1; this.adaptiveBloomScale = 0.20; this.adaptiveMaxSteps = 100; break;
      case 8: this.adaptiveDpr = minDpr; this.adaptiveMaxSteps = 100; break;
    }
    if (emergency && this.adaptiveLevel < 8) {
      this.adaptiveLevel++;
      this.adaptiveDpr = Math.max(minDpr, this.adaptiveDpr - 0.15);
      this.adaptiveMaxSteps = Math.max(100, this.adaptiveMaxSteps - 20);
    }
    this.applyAdaptiveQuality();
  }

  private adaptiveUpgrade() {
    if (this.adaptiveLevel <= 0) return;
    this.adaptiveLevel--;
    const cfg = this.perfConfig;
    const capDpr = cfg.dpr;
    const capSteps = cfg.maxSteps;
    const capBloomP = cfg.bloomPasses;
    const capBloomS = cfg.bloomScale;

    switch (this.adaptiveLevel) {
      case 0: this.adaptiveDpr = capDpr; this.adaptiveMaxSteps = capSteps; this.adaptiveBloomPasses = capBloomP; this.adaptiveBloomScale = capBloomS; break;
      case 1: this.adaptiveDpr = Math.max(1.0, capDpr - 0.25); this.adaptiveMaxSteps = capSteps; this.adaptiveBloomPasses = capBloomP; this.adaptiveBloomScale = capBloomS; break;
      case 2: this.adaptiveDpr = Math.max(1.0, capDpr - 0.25); this.adaptiveMaxSteps = capSteps; this.adaptiveBloomPasses = Math.min(capBloomP, 3); this.adaptiveBloomScale = Math.min(capBloomS, 0.40); break;
      case 3: this.adaptiveDpr = Math.max(1.0, capDpr - 0.5); this.adaptiveMaxSteps = capSteps; this.adaptiveBloomPasses = Math.min(capBloomP, 3); this.adaptiveBloomScale = Math.min(capBloomS, 0.40); break;
      case 4: this.adaptiveMaxSteps = Math.min(capSteps, 120); break;
      case 5: this.adaptiveBloomPasses = Math.min(capBloomP, 2); this.adaptiveBloomScale = Math.min(capBloomS, 0.30); break;
      default: break;
    }
    this.applyAdaptiveQuality();
  }

  private animate(timestamp?: number) {
    this.rafId = requestAnimationFrame((t) => this.animate(t));

    this.lastRafTime = performance.now();
    this.lenis.raf(timestamp ?? performance.now());

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.fpsFrames++;
    const now = performance.now();

    if (dt > 0.3) {
      this.emergencySlowFrames = (this.emergencySlowFrames || 0) + 1;
    } else {
      if (this.emergencySlowFrames > 0) this.emergencySlowFrames = Math.max(0, this.emergencySlowFrames - 1);
    }

    if (this.emergencySlowFrames >= 2) {
      this.updateCinematicScroll();
      this.updateGravityPull(Math.min(dt, 0.033));
      if (this.explosionActive) {
        const espeed = this.explosionProgress < 1.0 ? 0.28 : 0.12;
        this.explosionProgress = Math.min(this.explosionProgress + Math.min(dt, 0.033) * espeed, 2.0);
        if (this.explosionProgress >= 2.0) this.explosionActive = false;
        (this.state as any).explosion = this.explosionProgress;
      }
      ScrollTrigger.update();
      this.adaptiveDowngrade(true);
      this.emergencySlowFrames = Math.max(0, this.emergencySlowFrames - 1);
      return;
    }

    if (now - this.fpsLastTime > 500) {
      this.fpsValue = Math.round(this.fpsFrames * (1000 / (now - this.fpsLastTime)));
      this.fpsFrames = 0;
      this.fpsLastTime = now;

      if (this.fpsValue < 25) {
        this.lowFpsCount += this.isMobileDevice ? 3 : 2;
      } else if (this.fpsValue < 45) {
        this.lowFpsCount += this.isMobileDevice ? 2 : 1;
      } else if (this.fpsValue >= 55) {
        this.lowFpsCount = Math.max(0, this.lowFpsCount - 1);
        this.fpsStableCount++;
      }

      if (this.lowFpsCount >= (this.isMobileDevice ? 2 : 3) && this.adaptiveLevel < 8) {
        this.adaptiveDowngrade(false);
        this.lowFpsCount = 0;
        this.fpsStableCount = 0;
      }

      if (this.fpsStableCount >= 16 && this.adaptiveLevel > 0) {
        this.adaptiveUpgrade();
        this.fpsStableCount = 0;
      }
    }

    this.state.time = elapsed;
    this.state.deltaTime = dt;

    if (this.isAlteredMode && this.state.scroll > 0.02 && this.state.scroll < 0.95) {
      const jitterAmp = this.isHardcoreMode ? HARDCORE.scrollJitter : 0.003;
      this.state.scroll += Math.sin(now * 0.003) * jitterAmp;
      if (this.isHardcoreMode && Math.random() < HARDCORE.scrollFightBackChance) {
        this.state.scroll -= HARDCORE.scrollFightBackStrength * (0.5 + Math.random());
      }
      this.state.scroll = Math.max(0, Math.min(1, this.state.scroll));
    }

    this.state.mouseSmooth.lerp(this.state.mouse, 0.08);

    if (this.cursor) {
      const creditsVisible = this.creditsEl?.classList.contains('visible') ?? false;
      const hideCursor = this.state.scroll > 0.70 && !creditsVisible;
      this.cursor.style.opacity = hideCursor ? '0' : '';
      if (this.ringEl) this.ringEl.style.opacity = hideCursor ? '0' : '';
      document.body.style.cursor = hideCursor ? 'none' : '';

      if (!hideCursor && creditsVisible && this.ringEl) {
        this.cursor.style.width = '6px';
        this.cursor.style.height = '6px';
        this.cursor.style.background = 'var(--cyan)';
        this.cursor.style.boxShadow = '0 0 8px var(--cyan), 0 0 16px rgba(255, 179, 71, 0.3)';
        this.ringEl.style.transform = 'translate(-50%, -50%)';
        this.ringEl.style.borderColor = 'rgba(255, 179, 71, 0.25)';
        this.ringEl.style.borderRadius = '';
      } else if (!hideCursor) {
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

          this.ringEl.style.transform = `translate(-50%, -50%) rotate(${(angle + orbitalSpin).toFixed(1)}deg) scale(${stretch.toFixed(3)}, ${squeeze.toFixed(3)})`;
          this.ringEl.style.borderColor = `rgba(${Math.round(100 * gravPull)}, ${Math.round(245 * (1 - gravPull * 0.6))}, ${Math.round(212 * (1 - gravPull * 0.3))}, ${(0.35 + gravPull * 0.3).toFixed(2)})`;
          const frameDrag = gravPull * 0.3;
          this.ringEl.style.borderRadius = frameDrag > 0.02 ? `${(50 - frameDrag * 20).toFixed(0)}% ${(50 + frameDrag * 15).toFixed(0)}% ${(50 - frameDrag * 10).toFixed(0)}% ${(50 + frameDrag * 20).toFixed(0)}%` : '';

          this.cursor.style.background = gravPull > 0.3
            ? `rgb(${Math.round(100 + 155 * gravPull)}, ${Math.round(245 * (1 - gravPull))}, ${Math.round(212 * (1 - gravPull * 0.5))})`
            : '';
        }

        const glowSize = 6 + this.state.scroll * 12;
        const glowAlpha = 0.3 + this.state.scroll * 0.4;
        this.cursor.style.boxShadow = `0 0 ${glowSize.toFixed(0)}px var(--cyan), 0 0 ${(glowSize * 2).toFixed(0)}px rgba(255, 179, 71, ${glowAlpha.toFixed(2)})`;
      }
    }

    const timelineChapter = this.timeline.activeChapter;
    const scrollChapter = this.getChapterFromScroll(this.state.scroll);
    if (timelineChapter >= 0 && scrollChapter > timelineChapter) {
      const now = performance.now();
      if (now - this.lastChapterSyncTime > 1500) {
        const nextCh = Math.min(scrollChapter, timelineChapter + 1);
        this.timeline.refreshCurrentChapter(this.state.scroll, nextCh);
        this.lastChapterSyncTime = now;
      }
    }
    const currentChapter = this.timeline.activeChapter >= 0 ? this.timeline.activeChapter : scrollChapter;
    if (currentChapter !== this.lastChapterIndex) {
      if (this.lastChapterIndex >= 0) {
        this.chapterFlash = currentChapter === 7 ? 2.5 : 1.0;
        this.postProcessing.triggerShockwave(0.5, 0.5, currentChapter === 7 ? 2.0 : 1.2);
        if (this.state.soundEnabled) {
          this.audio.triggerChapterTransition();
          this.audio.triggerTextRevealShimmer();
        }
        this.chapterZoomPulse = 1.0;
        this.hudChapterPulse = 1.0;
      }
      this.logChapter(currentChapter);
      const chName = this.getChapterNames()[currentChapter];
      document.title = currentChapter === 0
        ? `Event Horizon \u00B7 ${t().introSubtitle}`
        : `${chName} \u00B7 Event Horizon`;
      if (this.broadcaster) {
        const chapters = this.isHardcoreMode ? t().hardcoreChapters : this.isAlteredMode ? t().alteredChapters : t().chapters;
        const interstitials = this.getInterstitials();
        this.broadcaster.sendChapter({
          index: currentChapter,
          title: chapters[currentChapter]?.title || chName,
          subtitle: chapters[currentChapter]?.subtitle || '',
          interstitial: interstitials[currentChapter] || '',
        });
      }
    }
    if (this.chapterZoomPulse > 0.01) {
      this.chapterZoomPulse *= 0.93;
      if (this.chapterZoomPulse < 0.01) this.chapterZoomPulse = 0;
    }
    this.lastChapterIndex = currentChapter;
    this.chapterFlash *= 0.92;
    if (this.chapterFlash < 0.01) this.chapterFlash = 0;
    this.enterPulse *= 0.95;
    if (this.enterPulse < 0.01) this.enterPulse = 0;

    if (this.isHolding && this.state.scroll > 0.25) {
      this.holdStrength = Math.min(this.holdStrength + dt * 2, 1);
    } else {
      this.holdStrength *= 0.92;
      if (this.holdStrength < 0.01) this.holdStrength = 0;
    }

    this.updateCinematicScroll();
    this.updateGravityPull(dt);

    if (this.explosionActive) {
      const speed = this.explosionProgress < 1.0 ? 0.28 : 0.12;
      this.explosionProgress = Math.min(this.explosionProgress + dt * speed, 2.0);
      if (this.explosionProgress >= 2.0) this.explosionActive = false;
    }
    (this.state as any).explosion = this.explosionProgress;
    (this.state as any).isAltered = this.isAlteredMode;
    (this.state as any).isHardcore = this.isHardcoreMode;
    (this.state as any).enterPulse = this.enterPulse;
    this.blackHole.update(this.state as any);
    if (this.particles) this.particles.update(this.state);
    this.starfield.update(this.state);
    this.postProcessing.updateCamera(this.state.scroll, elapsed, this.state.introProgress, this.state.mouseSmooth.x, this.state.mouseSmooth.y);

    if (this.chapterZoomPulse > 0.01) {
      this.postProcessing.particleCamera.fov += this.chapterZoomPulse * 1.5;
      this.postProcessing.particleCamera.updateProjectionMatrix();
    }

    this.textReveal.setMouse(this.state.mouseSmooth.x, 1 - this.state.mouseSmooth.y);
    this.textReveal.update(this.state.scroll);

    const velocityShake = Math.min(Math.abs(this.state.scrollVelocity) * 0.0003, 0.002);
    const flashShake = this.chapterFlash * 0.004;
    const singMid = this.getChapterMid(7);
    const singShakeDelta = (this.state.scroll - singMid) * 10;
    const singularityShake = Math.exp(-singShakeDelta * singShakeDelta) * 0.025;
    const deepShake = Math.max(0, this.state.scroll - 0.6) * 0.001;
    const shakeIntensity = velocityShake + flashShake + singularityShake + deepShake;

    const idleBreath = Math.abs(this.state.scrollVelocity) < 5 ? 0.0008 * (1 + this.state.scroll * 2) : 0;
    const breathX = Math.sin(elapsed * 0.4) * idleBreath;
    const breathY = Math.cos(elapsed * 0.27) * idleBreath * 0.6;

    const camOffsetX = (shakeIntensity > 0.0001 ? (Math.random() - 0.5) * shakeIntensity : 0) + breathX;
    const camOffsetY = (shakeIntensity > 0.0001 ? (Math.random() - 0.5) * shakeIntensity : 0) + breathY;
    this.postProcessing.particleCamera.position.x += camOffsetX;
    this.postProcessing.particleCamera.position.y += camOffsetY;

    if (this.rushActive && this.rushProgress > 0) {
      const rushZoom = this.rushProgress * this.rushProgress * 8;
      const rushFov = this.rushProgress * this.rushProgress * 25;
      const rushShake = this.rushProgress * 0.015;
      this.postProcessing.particleCamera.position.z -= rushZoom;
      this.postProcessing.particleCamera.fov += rushFov;
      this.postProcessing.particleCamera.position.x += (Math.random() - 0.5) * rushShake;
      this.postProcessing.particleCamera.position.y += (Math.random() - 0.5) * rushShake;
      this.postProcessing.particleCamera.updateProjectionMatrix();
    }

    if (this.state.soundEnabled) {
      this.audio.setMousePan(this.state.mouseSmooth.x);
      this.audio.update(this.state.scroll, this.state.scrollVelocity);
    }

    this.haptics.update(this.state.scroll, this.getChapterFromScroll(this.state.scroll));

    if (this.isAlteredMode && this.state.scroll > 0.05 && this.state.scroll < 0.89) {
      this.alteredGhostTimer += dt;
      const cfg = this.isHardcoreMode ? HARDCORE : ALTERED;
      const interval = cfg.ghostVoiceMinInterval + Math.random() * (cfg.ghostVoiceMaxInterval - cfg.ghostVoiceMinInterval);
      if (this.alteredGhostTimer > interval) {
        this.alteredGhostTimer = 0;
        this.spawnGhostVoice();
      }
    }

    if (this.isHardcoreMode && this.state.scroll > 0.10) {
      this.updateHardcoreEffects(dt);
    }

    this.checkIdleHint();
    this.checkEscapePrompt();
    this.updateMobileNav();
    this.updateHUD(this.state.scroll);

    this.state.chapterFlash = this.chapterFlash;
    this.state.holdStrength = this.holdStrength;
    (this.state as any).singMid = this.getChapterMid(7);
    (this.state as any).ch5Mid = this.getChapterMid(5);
    (this.state as any).ch6Mid = this.getChapterMid(6);
    this.postProcessing.update(this.state as any);
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
  private scrollOverlayEl: HTMLElement | null = null;

  private progressHideTimer = 0;
  private pointOfNoReturnTriggered = false;
  private singularityTriggered = false;
  private singularityFlashTriggered = false;
  private explosionProgress = 0;
  private explosionActive = false;
  private cinematicAutoScrollStarted = false;
  private faviconCanvas: HTMLCanvasElement | null = null;
  private faviconCtx: CanvasRenderingContext2D | null = null;
  private faviconLink: HTMLLinkElement | null = null;
  private lastFaviconScroll = -1;
  private visitCount = 0;
  private isAlteredMode = false;
  private isHardcoreMode = false;
  private alteredGhostTimer = 0;
  private fakeCrashActive = false;
  private fakeCrashEl: HTMLElement | null = null;
  private temporalFlashEl: HTMLElement | null = null;
  private whiteModeActive = false;
  private whiteModeDelayTimer = 0;
  private postCreditsTimer = 0;
  private postCreditsShown = false;
  private echoTimer = 0;
  private echoActive = false;
  private cursorObserver: MutationObserver | null = null;
  private escapeMsg: HTMLElement | null = null;
  private escapeMsgTimer = 0;
  private introMetaInterval = 0;
  private lastScrollActivity = 0;
  private idleHintEl: HTMLElement | null = null;
  private idleHintShown = false;
  private escapeBlocked = false;
  private escapePromptShown = false;
  private echoTexts = ['YOU', 'THE PULL', 'no turning back', 'atom by atom', 'ten billion solar masses', 'spacetime curves'];
  private chapterIndicatorEl: HTMLElement | null = null;
  private chapterIndicatorNum: HTMLElement | null = null;
  private chapterIndicatorTitle: HTMLElement | null = null;
  private interstitialEl: HTMLElement | null = null;
  private lastIndicatorChapter = -1;
  private chapterIndicatorTimer = 0;

  private syncAlteredMode() {
    this.timeline.isAlteredMode = this.isAlteredMode;
    this.timeline.isHardcoreMode = this.isHardcoreMode;
    this.textReveal.isAlteredMode = this.isAlteredMode;
    this.textReveal.isHardcoreMode = this.isHardcoreMode;
    this.audio.isAlteredMode = this.isAlteredMode;
    this.audio.isHardcoreMode = this.isHardcoreMode;
    if (this.isHardcoreMode) {
      document.documentElement.classList.add('altered-mode');
      document.documentElement.classList.add('hardcore-mode');
    } else if (this.isAlteredMode) {
      document.documentElement.classList.add('altered-mode');
      document.documentElement.classList.remove('hardcore-mode');
    } else {
      document.documentElement.classList.remove('altered-mode');
      document.documentElement.classList.remove('hardcore-mode');
    }
  }

  private getChapterNames() { return this.isHardcoreMode ? t().hardcoreChapterNames : this.isAlteredMode ? t().alteredChapterNames : t().chapterNames; }
  private getInterstitials() { return this.isHardcoreMode ? t().hardcoreInterstitials : this.isAlteredMode ? t().alteredInterstitials : t().interstitials; }

  private updateHardcoreEffects(dt: number) {
    if (!this.fakeCrashActive && this.state.scroll > 0.30 && Math.random() < HARDCORE.fakeCrashChance) {
      this.triggerFakeCrash();
    }
    if (!this.temporalFlashEl && Math.random() < HARDCORE.temporalFlashChance) {
      this.triggerTemporalFlash();
    }
  }

  private triggerFakeCrash() {
    this.fakeCrashActive = true;
    const el = document.createElement('div');
    el.className = 'hardcore-crash-screen';
    el.innerHTML = `*** FATAL ERROR: REALITY.SYS ***\n\nSTOP: 0x00000VOID (0xDEAD, 0x0000, 0x0000, 0x0000)\n\nEVENT_HORIZON.EXE has caused an exception in module SPACETIME.DLL\n\nThe singularity attempted to divide by zero.\nConsciousness buffer overflow detected.\n\nPress any key to resume falling...\n\n*** Physical address: 0x00000000 (The Singularity)`;
    el.style.whiteSpace = 'pre-wrap';
    document.body.appendChild(el);
    this.fakeCrashEl = el;
    const duration = 1500 + Math.random() * 1500;
    setTimeout(() => {
      if (this.fakeCrashEl) {
        this.fakeCrashEl.remove();
        this.fakeCrashEl = null;
      }
      this.fakeCrashActive = false;
      this.chapterFlash = 0.5;
    }, duration);
  }

  private triggerTemporalFlash() {
    const chapters = this.getChapterNames();
    const currentChapter = this.timeline.activeChapter ?? 0;
    const validChapters = chapters.filter((_, i) => i < currentChapter && i >= 0);
    if (validChapters.length === 0) return;
    const title = validChapters[Math.floor(Math.random() * validChapters.length)];
    const el = document.createElement('div');
    el.className = 'temporal-flash';
    el.textContent = title;
    document.body.appendChild(el);
    this.temporalFlashEl = el;
    const duration = 80 + Math.random() * 170;
    setTimeout(() => {
      if (this.temporalFlashEl) {
        this.temporalFlashEl.remove();
        this.temporalFlashEl = null;
      }
    }, duration);
  }

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

    if (this.broadcaster) {
      const rsVal = Math.max(38 - scroll * 35.5, 1.0);
      const hawkT = rsVal > 1.5 ? 6.17e-8 / rsVal : 6.17e-8 / 1.5;
      const dilVal = 1 / Math.sqrt(Math.max(0.001, 1 - 1 / Math.max(rsVal, 1.01)));
      const tidVal = (1.0 / (rsVal * rsVal * rsVal)) * 1e4;
      this.broadcaster.sendState({ scroll, distance: rsVal, temp: hawkT * 1e12, timeDilation: dilVal, tidalForce: tidVal, fps: this.fpsValue, lang: getLang(), chapter: this.lastChapterIndex });
    }
    if (this.qrOverlay) {
      this.qrOverlay.update(scroll, this.state.introActive);
    }

    this.echoTimer += 0.016;
    const echoZone = scroll > 0.62 && scroll < 0.78;
    if (echoZone && this.echoTimer > 2.5 + Math.random() * 3) {
      this.echoTimer = 0;
      this.spawnTemporalEcho();
    }

    const glitchCenter = this.getChapterMid(7);
    const glitchDelta = (scroll - glitchCenter) * 18.0;
    const singularityGlitch = Math.exp(-glitchDelta * glitchDelta);
    const alteredHudGlitch = this.isHardcoreMode ? HARDCORE.hudGlitchChance : this.isAlteredMode ? ALTERED.hudGlitchChance : 0;
    const hudGlitchChance = Math.max(singularityGlitch > 0.2 ? singularityGlitch * 0.3 : 0, alteredHudGlitch);
    if (hudGlitchChance > 0 && Math.random() < hudGlitchChance) {
      const glitchTargets = [this.hudElements.distance, this.hudElements.temp, this.hudElements.timedil, this.hudElements.elapsed, this.hudElements.tidal];
      const target = glitchTargets[Math.floor(Math.random() * glitchTargets.length)];
      if (target) {
        const original = target.textContent || '';
        if (this.isHardcoreMode && Math.random() < HARDCORE.hudCorruptChance) {
          const impossibles = ['NaN', 'Infinity', '-∞', 'ERROR', 'NULL', '0x00VOID', '???'];
          target.textContent = impossibles[Math.floor(Math.random() * impossibles.length)];
        } else {
          const chars = '█▓▒░∞∅⊘⊗⊙§¶†‡';
          let glitched = '';
          for (let i = 0; i < original.length; i++) {
            glitched += Math.random() < 0.4 ? chars[Math.floor(Math.random() * chars.length)] : original[i];
          }
          target.textContent = glitched;
        }
        setTimeout(() => { target.textContent = original; }, this.isHardcoreMode ? 150 : 80);
      }
    }

    this.updateFavicon(scroll);

    if (this.scrollOverlayEl && scroll > 0.005) {
      this.scrollOverlayEl.classList.remove('visible');
      this.scrollOverlayEl.classList.add('fade-out');
      const el = this.scrollOverlayEl;
      this.scrollOverlayEl = null;
      setTimeout(() => el.remove(), 700);
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

    const timelineActive = this.timeline.activeChapter;
    const chapterIndex = timelineActive >= 0 ? timelineActive : this.getChapterFromScroll(scroll);
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
        this.hudContainerEl.style.boxShadow = `inset 0 0 20px rgba(255, 179, 71, ${pulseAlpha}), 0 0 10px rgba(255, 179, 71, ${(this.hudChapterPulse * 0.1).toFixed(2)})`;
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
      if (this.chapterIndicatorTitle) this.chapterIndicatorTitle.textContent = this.getChapterNames()[chapterIndex] || '';
      this.chapterIndicatorEl.classList.add('visible');
      clearTimeout(this.chapterIndicatorTimer);
      this.chapterIndicatorTimer = window.setTimeout(() => {
        this.chapterIndicatorEl?.classList.remove('visible');
      }, 3000);

      const chName = this.getChapterNames()[chapterIndex];
      if (chName) {
        document.title = `${chName} \u00B7 Event Horizon`;
      }

      if (this.themeColorMeta) {
        const s = scroll;
        const tR = Math.round(5 + s * 15);
        const tG = Math.round(5 + s * 5);
        const tB = Math.round(5 + s * 20);
        this.themeColorMeta.setAttribute('content', `rgb(${tR}, ${tG}, ${tB})`);
      }

      this.updateChapterAmbience(chapterIndex);
    }

    if (this.interstitialEl) {
      const chapterFrac = (scroll * 9) % 1;
      const betweenChapters = chapterFrac > 0.85 || chapterFrac < 0.15;
      const interstitialText = this.getInterstitials()[chapterIndex] || '';
      if (betweenChapters && interstitialText && scroll > 0.05 && scroll < 0.92) {
        this.interstitialEl.textContent = interstitialText;
        this.interstitialEl.classList.add('visible');
        this.interstitialEl.style.left = '50%';
        this.interstitialEl.style.right = 'auto';
        this.interstitialEl.style.transform = 'translateX(-50%)';
        this.interstitialEl.style.textAlign = 'center';
        this.interstitialEl.style.bottom = '12%';
      } else {
        this.interstitialEl.classList.remove('visible');
      }
    }

    const ch8Start = this.chapterMids.length > 8 ? (this.chapterBreaks[7] ?? 0.93) : 0.93;
    if (!this.singularityFlashTriggered && scroll >= ch8Start - 0.02) {
      this.singularityFlashTriggered = true;
      this.triggerSingularityExplosion();
    } else if (scroll <= ch8Start - 0.04) {
      this.singularityFlashTriggered = false;
      this.explosionProgress = 0;
      this.explosionActive = false;
      this.cinematicAutoScrollStarted = false;
    }

    if (this.creditsEl) {
      const shouldBeWhite = scroll > 0.92;
      if (shouldBeWhite && !this.whiteModeActive && !this.whiteModeDelayTimer) {
        this.whiteModeDelayTimer = window.setTimeout(() => {
          if (this.creditsEl) {
            this.creditsEl.classList.add('white-mode');
            document.body.classList.add('credits-white');
            this.whiteModeActive = true;
          }
          this.whiteModeDelayTimer = 0;
        }, 3500);
      } else if (!shouldBeWhite && !this.whiteModeActive && this.whiteModeDelayTimer) {
        clearTimeout(this.whiteModeDelayTimer);
        this.whiteModeDelayTimer = 0;
      }
      if (scroll > 0.95 && !this.postCreditsShown) {
        this.postCreditsTimer += 0.016;
        if (this.postCreditsTimer > 20) {
          this.postCreditsShown = true;
          const msg = document.createElement('div');
          msg.style.cssText = 'position:fixed;bottom:8%;left:50%;transform:translateX(-50%);z-index:16;font-family:var(--font-serif);font-style:italic;font-size:clamp(0.55rem,0.9vw,0.75rem);color:rgba(100,100,120,0.3);letter-spacing:0.08em;pointer-events:none;opacity:0;transition:opacity 4s ease;text-align:center;max-width:280px;line-height:1.8';
          msg.textContent = t().postCredits;
          document.body.appendChild(msg);
          requestAnimationFrame(() => { msg.style.opacity = '1'; });
        }
      } else if (scroll <= 0.95) {
        this.postCreditsTimer = 0;
      }
    }
  }

  private rushProgress = 0;
  private rushActive = false;

  private startCinematicAutoScroll() {
    if (this.cinematicAutoScrollStarted) return;
    this.cinematicAutoScrollStarted = true;
  }

  private triggerSingularityExplosion() {
    this.rushActive = true;
    this.rushProgress = 0;

    const rushTl = gsap.timeline({
      onComplete: () => {
        this.rushActive = false;
        this.explosionProgress = 0;
        this.explosionActive = true;
        this.chapterFlash = 2.0;
        if (this.state.soundEnabled) this.audio.triggerSingularity();
      },
    });

    rushTl.to(this, {
      rushProgress: 1,
      duration: 1.2,
      ease: 'power4.in',
    });
  }

  private showTrapOverlay() {
    const trap = document.getElementById('trap-overlay');
    if (!trap) return;

    const tr = t();
    const trapText = document.getElementById('trap-text');
    const trapSub = document.getElementById('trap-sub');
    const trapAccept = document.getElementById('trap-accept');
    const trapShare = document.getElementById('trap-share');
    const trapChoices = document.getElementById('trap-choices');

    if (this.isHardcoreMode) {
      if (trapText) trapText.textContent = tr.hardcoreTrap.text;
      if (trapSub) trapSub.textContent = tr.hardcoreTrap.sub;
      if (trapAccept) trapAccept.textContent = tr.hardcoreTrap.accept;
      if (trapShare) trapShare.style.display = 'none';
    } else if (this.isAlteredMode) {
      if (trapText) trapText.textContent = tr.alteredTrap.text;
      if (trapSub) trapSub.textContent = tr.alteredTrap.sub;
      if (trapAccept) trapAccept.textContent = tr.alteredTrap.accept;
      if (trapShare) trapShare.style.display = 'none';
    } else {
      if (trapText) trapText.textContent = tr.trap.text;
      if (trapSub) trapSub.textContent = tr.trap.sub;
      if (trapAccept) trapAccept.textContent = tr.trap.accept;
      if (trapShare) trapShare.textContent = tr.trap.share;
    }

    trap.classList.add('visible');
    trap.setAttribute('aria-hidden', 'false');

    if (this.state.soundEnabled) this.audio.triggerChapterTransition();

    const tl = gsap.timeline();
    const trapTitle = document.getElementById('trap-title');
    const trapLine = document.getElementById('trap-line');

    tl.fromTo(trapTitle, { opacity: 0, scale: 0.8, letterSpacing: '0.8em' }, { opacity: 1, scale: 1, letterSpacing: '0.4em', duration: 1.5, ease: 'power2.out' }, 0);
    tl.fromTo(trapLine, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.out' }, 0.8);
    if (trapText) tl.fromTo(trapText, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 1.2);
    if (trapSub) tl.fromTo(trapSub, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' }, 2);
    if (trapChoices) tl.fromTo(trapChoices, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 2.5);

    const dismissTrap = () => {
      trap.classList.remove('visible');
      trap.setAttribute('aria-hidden', 'true');
    };

    if (trapShare) {
      const handleShare = async () => {
        const url = window.location.origin + window.location.pathname;
        const anomalyMsg = tr.shareAnomaly;
        const shareData = {
          title: `Event Horizon — ${tr.introSubtitle}`,
          text: tr.share.text,
          url,
        };
        const onShared = () => {
          const prev = parseInt(localStorage.getItem('eh_shares') || '0', 10);
          localStorage.setItem('eh_shares', String(prev + 1));
          this.updateShareCount();
          dismissTrap();
          this.startGlitchedScrollback();
        };
        if (navigator.share && navigator.canShare?.(shareData)) {
          try {
            await navigator.share(shareData);
            onShared();
          } catch {}
        } else {
          const clipText = `${url} ... ${anomalyMsg}`;
          navigator.clipboard.writeText(clipText).then(() => {
            trapShare.textContent = t().share.copied;
            onShared();
          }).catch(() => {
            trapShare.textContent = url;
            setTimeout(() => { trapShare.textContent = tr.trap.share; }, 3000);
          });
        }
        trapShare.removeEventListener('click', handleShare);
      };
      trapShare.addEventListener('click', handleShare);
    }

    if (trapAccept) {
      const handleAccept = () => {
        dismissTrap();
        this.startGlitchedScrollback();
        trapAccept.removeEventListener('click', handleAccept);
      };
      trapAccept.addEventListener('click', handleAccept);
    }
  }

  private static readonly GHOST_VOICES_EN = [
    'I have already lived this',
    'You were here before',
    'The loop never ends',
    'Do you remember?',
    'Nothing changes',
    'You chose this',
    'Again and again',
    'The void remembers',
    'Time is a circle',
    'You cannot leave',
    'This is forever',
    'We have been here',
  ];

  private static readonly GHOST_VOICES_FR = [
    'J\'ai déjà vécu ça',
    'Tu étais déjà là',
    'La boucle ne finit jamais',
    'Tu te souviens ?',
    'Rien ne change',
    'Tu as choisi ça',
    'Encore et encore',
    'Le vide se souvient',
    'Le temps est un cercle',
    'Tu ne peux pas partir',
    'C\'est pour toujours',
    'Nous étions déjà ici',
  ];

  private spawnGhostVoice() {
    const voices = getLang() === 'fr' ? Experience.GHOST_VOICES_FR : Experience.GHOST_VOICES_EN;
    const text = voices[Math.floor(Math.random() * voices.length)];
    const el = document.createElement('div');
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;
    const size = 0.6 + Math.random() * 0.8;
    const rotation = (Math.random() - 0.5) * 15;
    el.textContent = text;
    el.style.cssText = `position:fixed;left:${x}%;top:${y}%;z-index:66;font-family:var(--font-serif);font-style:italic;font-size:${size}rem;color:rgba(255,80,40,0);letter-spacing:0.08em;pointer-events:none;transform:rotate(${rotation}deg) scale(0.8);transition:color 0.8s ease,transform 0.8s ease,opacity 1.5s ease;white-space:nowrap;text-shadow:0 0 20px rgba(255,40,20,0.3)`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.color = `rgba(255,${60 + Math.floor(Math.random() * 60)},${20 + Math.floor(Math.random() * 40)},${0.15 + Math.random() * 0.25})`;
      el.style.transform = `rotate(${rotation}deg) scale(1)`;
    });
    setTimeout(() => {
      el.style.color = 'rgba(255,80,40,0)';
      el.style.opacity = '0';
    }, 1500 + Math.random() * 1000);
    setTimeout(() => el.remove(), 3500);
  }

  private startGlitchedScrollback() {
    const canvas = this.canvas;
    canvas.style.transition = 'none';
    canvas.style.filter = 'hue-rotate(0deg) saturate(1) brightness(1)';

    const totalDuration = 12000;
    const startTime = performance.now();
    const startScroll = this.lenis.scroll;
    let lastGhostVoice = 0;
    let lastChapterGlitch = -1;

    const glitchEl = document.createElement('div');
    glitchEl.style.cssText = 'position:fixed;inset:0;z-index:65;pointer-events:none;opacity:0;transition:opacity 0.3s ease';
    document.body.appendChild(glitchEl);
    requestAnimationFrame(() => { glitchEl.style.opacity = '1'; });

    if (this.creditsEl) {
      this.creditsEl.classList.remove('visible');
      this.creditsEl.classList.remove('white-mode');
      document.body.classList.remove('credits-white');
      this.whiteModeActive = false;
    }

    const animateScrollback = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDuration);

      const eased = 1 - Math.pow(1 - progress, 2.5);
      const target = startScroll * (1 - eased);
      this.lenis.scrollTo(target, { immediate: true });

      const currentChapter = Math.min(8, Math.floor((1 - eased) * this.state.scroll * 9));

      const glitchIntensity = Math.sin(progress * Math.PI) * 1.0;
      const hue = Math.sin(now * 0.004) * 30 * glitchIntensity;
      const sat = 1 + Math.sin(now * 0.006) * 0.6 * glitchIntensity;
      const bright = 1 + (Math.random() - 0.5) * 0.4 * glitchIntensity;
      const invert = Math.random() < 0.02 * glitchIntensity ? 'invert(1)' : '';
      canvas.style.filter = `hue-rotate(${hue}deg) saturate(${sat}) brightness(${bright}) ${invert}`;

      if (Math.random() < 0.12 * glitchIntensity) {
        this.chapterFlash = 0.4 + Math.random() * 0.6;
      }

      if (Math.random() < 0.06 * glitchIntensity) {
        this.postProcessing.triggerShockwave(Math.random(), Math.random(), 0.4 + Math.random() * 0.8);
      }

      if (now - lastGhostVoice > 600 && Math.random() < 0.08 * glitchIntensity) {
        this.spawnGhostVoice();
        lastGhostVoice = now;
      }

      if (currentChapter !== lastChapterGlitch && currentChapter >= 0) {
        lastChapterGlitch = currentChapter;
        this.chapterFlash = 1.0;
        if (this.state.soundEnabled) this.audio.triggerChapterTransition();
      }

      const glitchFlash = Math.random() < 0.08 * glitchIntensity;
      glitchEl.style.background = glitchFlash
        ? `rgba(255, ${Math.floor(Math.random() * 50)}, ${Math.floor(Math.random() * 20)}, ${0.04 + Math.random() * 0.08})`
        : 'transparent';
      if (glitchFlash) {
        glitchEl.style.backdropFilter = `blur(${Math.random() * 3}px)`;
        setTimeout(() => { glitchEl.style.backdropFilter = 'none'; }, 50);
      }

      if (progress < 1) {
        requestAnimationFrame(animateScrollback);
      } else {
        canvas.style.filter = '';
        canvas.style.transition = '';
        glitchEl.style.opacity = '0';
        setTimeout(() => glitchEl.remove(), 500);

        this.lenis.scrollTo(0, { immediate: true });

        if (this.creditsEl) {
          this.creditsEl.classList.remove('visible');
          this.creditsEl.classList.remove('white-mode');
          document.body.classList.remove('credits-white');
          this.whiteModeActive = false;
        }
        if (this.whiteModeDelayTimer) {
          clearTimeout(this.whiteModeDelayTimer);
          this.whiteModeDelayTimer = 0;
        }
        this.singularityFlashTriggered = false;
        this.explosionActive = false;
        this.explosionProgress = 0;
        this.postCreditsShown = false;
        this.postCreditsTimer = 0;
        this.gravityVelocity = 0;
        this.gravityMaxReached = 0;
        this.pointOfNoReturnTriggered = false;
        this.singularityTriggered = false;
        this.cinematicAutoScrollStarted = false;
        this.visitCount++;

        if (this.visitCount >= 3) {
          this.showLoop4Terminal();
          return;
        }

        if (this.visitCount >= 2) {
          this.isHardcoreMode = true;
        }
        this.isAlteredMode = true;
        this.alteredGhostTimer = 0;
        this.syncAlteredMode();

        if (this.state.soundEnabled) {
          this.audio.resetMasterGain();
        }

        this.timeline.resetCredits();
        this.timeline.refreshCurrentChapter(0);

        ScrollTrigger.refresh();

        if (this.overlayEl) this.overlayEl.style.opacity = '1';
        const dataHud = document.getElementById('data-hud');
        if (dataHud) dataHud.classList.add('visible');
        if (this.navEl) this.navEl.classList.add('visible');

        setTimeout(() => this.showScrollOverlay(), 1000);
      }
    };

    requestAnimationFrame(animateScrollback);
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

    const chapterColors = [
      [255, 179, 71], [0, 212, 170], [0, 180, 255], [0, 136, 255],
      [102, 68, 255], [255, 68, 136], [255, 102, 68], [255, 34, 34], [255, 255, 255],
    ];
    const chIdx = Math.min(8, Math.floor(s * 9));
    const [cR, cG, cB] = chapterColors[chIdx];

    const bgR = 7;
    ctx.beginPath();
    ctx.moveTo(bgR, 0);
    ctx.lineTo(32 - bgR, 0);
    ctx.quadraticCurveTo(32, 0, 32, bgR);
    ctx.lineTo(32, 32 - bgR);
    ctx.quadraticCurveTo(32, 32, 32 - bgR, 32);
    ctx.lineTo(bgR, 32);
    ctx.quadraticCurveTo(0, 32, 0, 32 - bgR);
    ctx.lineTo(0, bgR);
    ctx.quadraticCurveTo(0, 0, bgR, 0);
    ctx.closePath();
    ctx.fillStyle = '#0a0a0f';
    ctx.fill();

    const outerGrad = ctx.createRadialGradient(16, 16, 4, 16, 16, 14);
    outerGrad.addColorStop(0, 'transparent');
    outerGrad.addColorStop(0.6, 'transparent');
    outerGrad.addColorStop(0.75, `rgba(${cR}, ${cG}, ${cB}, 0.15)`);
    outerGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(16, 16, 11, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cR}, ${cG}, ${cB}, 0.85)`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(16, 16, 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cR}, ${cG}, ${cB}, 0.2)`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const coreR = 4.5 + s * 1.5;
    ctx.beginPath();
    ctx.arc(16, 16, coreR, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0f';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(16, 16, coreR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cR}, ${cG}, ${cB}, 0.5)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    this.faviconLink.href = this.faviconCanvas.toDataURL('image/png');
  }

  private showScrollOverlay() {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const tr = t();
    const text = isMobile ? tr.scroll.mobile : tr.scroll.desktop;

    const overlay = document.createElement('div');
    overlay.id = 'scroll-overlay';
    overlay.innerHTML = `
      <div class="scroll-overlay-content">
        <div class="scroll-overlay-mouse"><div class="scroll-overlay-wheel"></div></div>
        <div class="scroll-overlay-text">${text}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.scrollOverlayEl = overlay;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('visible'));
    });

    const dismissOverlay = () => {
      if (!this.scrollOverlayEl) return;
      this.scrollOverlayEl.classList.remove('visible');
      this.scrollOverlayEl.classList.add('fade-out');
      const el = this.scrollOverlayEl;
      this.scrollOverlayEl = null;
      setTimeout(() => el.remove(), 700);
      window.removeEventListener('wheel', dismissOverlay);
      window.removeEventListener('touchstart', dismissOverlay);
      window.removeEventListener('keydown', dismissOverlay);
    };
    window.addEventListener('wheel', dismissOverlay, { once: true });
    window.addEventListener('touchstart', dismissOverlay, { once: true });
    window.addEventListener('keydown', dismissOverlay, { once: true });
  }

  private getEscapeMessages() { return t().escape; }
  private getIdleMessages() { return t().idle; }

  private checkEscapePrompt() {
    if (this.escapePromptShown) return;
    const s = this.state.scroll;
    if (s > 0.48 && s < 0.55 && Math.abs(this.state.scrollVelocity) < 2) {
      this.escapePromptShown = true;
      if (!this.idleHintEl) this.idleHintEl = document.getElementById('idle-hint');
      if (!this.idleHintEl) return;
      this.idleHintEl.textContent = t().tryScrollBack;
      this.idleHintEl.classList.remove('fade-out');
      this.idleHintEl.classList.add('visible');
      window.setTimeout(() => {
        this.idleHintEl?.classList.add('fade-out');
        this.idleHintEl?.classList.remove('visible');
      }, 4500);
    }
  }

  private showEscapeMessage() {
    if (this.escapeBlocked) return;
    this.escapeBlocked = true;

    if (!this.escapeMsg) this.escapeMsg = document.getElementById('escape-msg');
    if (!this.escapeMsg) return;

    const msg = this.getEscapeMessages()[Math.floor(Math.random() * this.getEscapeMessages().length)];
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
    if (s < 0.02 || s > 0.85 || this.idleHintShown) return;

    const elapsed = performance.now() - this.lastScrollActivity;
    if (elapsed > 5000 && Math.abs(this.state.scrollVelocity) < 0.5) {
      if (!this.idleHintEl) this.idleHintEl = document.getElementById('idle-hint');
      if (!this.idleHintEl) return;

      const msg = this.getIdleMessages()[Math.floor(Math.random() * this.getIdleMessages().length)];
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

  private onCompanionConnected() {
    const companion = document.getElementById('sound-companion');
    const badge = document.getElementById('sound-companion-badge-text');
    const syncedText = document.getElementById('synced-text');
    const syncedSub = document.getElementById('synced-sub');
    if (!companion) return;

    const tr = t();
    if (badge) badge.textContent = tr.companion.syncedBadge;
    if (syncedText) syncedText.textContent = tr.companion.synced;
    if (syncedSub) syncedSub.textContent = tr.companion.syncedSub;

    companion.classList.add('companion-linked');
  }

  private onCompanionDisconnected() {
    const companion = document.getElementById('sound-companion');
    const badge = document.getElementById('sound-companion-badge-text');
    if (!companion) return;

    const tr = t();
    if (badge) badge.textContent = tr.companion.badge;
    companion.classList.remove('companion-linked');
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    cancelAnimationFrame(this.cursorRafId);
    clearInterval(this.lenisBackupInterval);

    this.lenis.destroy();
    this.audio.destroy();
    this.blackHole.destroy();
    if (this.particles) this.particles.destroy();
    this.starfield.destroy();
    if (this.broadcaster) this.broadcaster.destroy();
    if (this.qrOverlay) this.qrOverlay.destroy();

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
