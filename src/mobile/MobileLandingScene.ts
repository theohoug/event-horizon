/**
 * @file MobileLandingScene.ts
 * @description WebGL star particle scene for mobile landing — particles forming "EVENT HORIZON"
 * @author Cleanlystudio
 */

import * as THREE from 'three';

const TEXT_PARTICLE_COUNT = 900;
const BG_STAR_COUNT = 1500;
const FORMATION_DURATION = 3.5;
const CAM_FOV = 50;
const CAM_Z = 4;

interface Particle {
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  startZ: number;
  scatterX: number;
  scatterY: number;
  scatterZ: number;
  size: number;
  alpha: number;
  delay: number;
}

export class MobileLandingScene {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textParticles: THREE.Points | null = null;
  private bgStars: THREE.Points | null = null;
  private particles: Particle[] = [];
  private startTime = 0;
  private animating = false;
  private rafId = 0;
  private gyro = { x: 0, y: 0 };
  private smoothGyro = { x: 0, y: 0 };
  private scrollProgress = 0;
  private smoothScroll = 0;
  private onOrientation: ((e: DeviceOrientationEvent) => void) | null = null;
  private onResize: (() => void) | null = null;
  private scrollContainer: HTMLElement | null = null;
  private onScroll: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, scrollContainer?: HTMLElement) {
    this.canvas = canvas;
    this.scrollContainer = scrollContainer || null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x030305, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
    this.camera.position.z = CAM_Z;

    this.resize();
    this.createBgStars();
    this.createTextParticles();

    this.onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) this.gyro.x = Math.max(-1, Math.min(1, e.gamma / 30));
      if (e.beta !== null) this.gyro.y = Math.max(-1, Math.min(1, (e.beta! - 45) / 30));
    };
    window.addEventListener('deviceorientation', this.onOrientation);

    if (this.scrollContainer) {
      this.onScroll = () => {
        const st = this.scrollContainer!.scrollTop;
        const heroH = window.innerHeight * 0.45;
        this.scrollProgress = Math.min(1, st / heroH);
      };
      this.scrollContainer.addEventListener('scroll', this.onScroll, { passive: true });
    }

    this.onResize = () => {
      this.resize();
      this.rebuildTextParticles();
    };
    window.addEventListener('resize', this.onResize);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private getVisibleSize(): { w: number; h: number } {
    const vFov = CAM_FOV * Math.PI / 180;
    const h = 2 * Math.tan(vFov / 2) * CAM_Z;
    const w = h * (window.innerWidth / window.innerHeight);
    return { w, h };
  }

  private sampleTextPositions(): { x: number; y: number }[] {
    const visible = this.getVisibleSize();
    const spreadX = Math.min(5.5, visible.w * 0.88);
    const spreadY = Math.min(2.8, visible.h * 0.45);

    const offscreen = document.createElement('canvas');
    const fontSize = 120;
    offscreen.width = 900;
    offscreen.height = 400;
    const ctx = offscreen.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${fontSize}px "Cinzel", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EVENT', offscreen.width / 2, offscreen.height * 0.38);
    ctx.fillText('HORIZON', offscreen.width / 2, offscreen.height * 0.66);

    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const positions: { x: number; y: number }[] = [];
    const step = 3;

    for (let y = 0; y < offscreen.height; y += step) {
      for (let x = 0; x < offscreen.width; x += step) {
        const i = (y * offscreen.width + x) * 4;
        if (imageData.data[i] > 100) {
          positions.push({
            x: (x / offscreen.width - 0.5) * spreadX,
            y: -(y / offscreen.height - 0.5) * spreadY + spreadY * 0.15,
          });
        }
      }
    }

    return positions;
  }

  private rebuildTextParticles() {
    if (this.textParticles) {
      this.textParticles.geometry.dispose();
      (this.textParticles.material as THREE.Material).dispose();
      this.scene.remove(this.textParticles);
      this.textParticles = null;
    }
    this.createTextParticles();
  }

  private createTextParticles() {
    const textPositions = this.sampleTextPositions();
    const count = Math.min(TEXT_PARTICLE_COUNT, textPositions.length);

    const stride = Math.max(1, Math.floor(textPositions.length / count));
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    this.particles = [];

    for (let i = 0; i < count; i++) {
      const idx = (i * stride) % textPositions.length;
      const tp = textPositions[idx];

      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 4;
      const startX = Math.cos(angle) * radius;
      const startY = Math.sin(angle) * radius;
      const startZ = (Math.random() - 0.5) * 2.5;

      const scatterAngle = Math.atan2(tp.y, tp.x) + (Math.random() - 0.5) * 0.8;
      const scatterDist = 2.5 + Math.random() * 4;

      const particle: Particle = {
        targetX: tp.x,
        targetY: tp.y,
        startX,
        startY,
        startZ,
        scatterX: Math.cos(scatterAngle) * scatterDist,
        scatterY: Math.sin(scatterAngle) * scatterDist - 1.5 - Math.random() * 2,
        scatterZ: (Math.random() - 0.5) * 4,
        size: 0.8 + Math.random() * 1.0,
        alpha: 0.5 + Math.random() * 0.4,
        delay: Math.random() * 1.0,
      };
      this.particles.push(particle);

      positions[i * 3] = startX;
      positions[i * 3 + 1] = startY;
      positions[i * 3 + 2] = startZ;
      sizes[i] = particle.size;
      alphas[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.5) },
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vAlpha = alpha;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = size * uPixelRatio * (22.0 / -mvPos.z);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = smoothstep(0.5, 0.02, d);
          float core = smoothstep(0.15, 0.0, d);
          vec3 warmColor = mix(vec3(1.0, 0.72, 0.38), vec3(1.0, 0.9, 0.65), core);
          vec3 color = mix(warmColor * 0.7, vec3(1.0, 0.97, 0.92), core * 0.9);
          float alpha = (core * 1.0 + glow * glow * 0.5) * vAlpha;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.textParticles = new THREE.Points(geometry, material);
    this.scene.add(this.textParticles);
  }

  private createBgStars() {
    const positions = new Float32Array(BG_STAR_COUNT * 3);
    const sizes = new Float32Array(BG_STAR_COUNT);
    const twinklePhases = new Float32Array(BG_STAR_COUNT);

    for (let i = 0; i < BG_STAR_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = -2 - Math.random() * 18;
      sizes[i] = 0.3 + Math.random() * 1.0;
      twinklePhases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(twinklePhases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.5) },
        uScroll: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uScroll;
        void main() {
          float speed = 0.5 + uScroll * 2.0;
          vTwinkle = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * speed + phase));
          vec3 pos = position;
          pos.y -= uScroll * 0.5;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = size * uPixelRatio * (150.0 / -mvPos.z) * (1.0 + uScroll * 0.3);
        }
      `,
      fragmentShader: `
        varying float vTwinkle;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = smoothstep(0.5, 0.05, d);
          float core = smoothstep(0.12, 0.0, d);
          vec3 warmColor = mix(vec3(0.9, 0.75, 0.55), vec3(1.0, 0.7, 0.28), d * 2.0);
          vec3 color = mix(warmColor * 0.5, vec3(1.0, 0.95, 0.88), core * 0.7);
          float alpha = glow * glow * vTwinkle * 0.35;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.bgStars = new THREE.Points(geometry, material);
    this.scene.add(this.bgStars);
  }

  start() {
    this.startTime = performance.now();
    this.animating = true;
    this.animate();
  }

  private animate = () => {
    if (!this.animating) return;
    this.rafId = requestAnimationFrame(this.animate);

    const elapsed = (performance.now() - this.startTime) / 1000;

    this.smoothScroll += (this.scrollProgress - this.smoothScroll) * 0.08;

    if (this.bgStars) {
      const bgMat = this.bgStars.material as THREE.ShaderMaterial;
      bgMat.uniforms.uTime.value = elapsed;
      bgMat.uniforms.uScroll.value = this.smoothScroll;
    }

    if (this.textParticles) {
      const geo = this.textParticles.geometry;
      const pos = geo.getAttribute('position') as THREE.BufferAttribute;
      const alphaAttr = geo.getAttribute('alpha') as THREE.BufferAttribute;
      const sizeAttr = geo.getAttribute('size') as THREE.BufferAttribute;

      const scatter = this.smoothScroll;
      const scatterEase = scatter * scatter;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const t = Math.max(0, elapsed - p.delay) / FORMATION_DURATION;
        const formEase = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);

        let px = p.startX + (p.targetX - p.startX) * formEase;
        let py = p.startY + (p.targetY - p.startY) * formEase;
        let pz = p.startZ * (1 - formEase);

        if (formEase >= 1 && scatter < 0.01) {
          const drift = Math.sin(elapsed * 0.4 + i * 0.3) * 0.02;
          px += drift;
          py += Math.cos(elapsed * 0.35 + i * 0.2) * 0.015;
        }

        if (scatter > 0.01 && formEase >= 0.5) {
          const scrollSpin = elapsed * 0.3 + i * 0.5;
          px += p.scatterX * scatterEase + Math.sin(scrollSpin) * scatter * 0.3;
          py += p.scatterY * scatterEase + Math.cos(scrollSpin * 0.7) * scatter * 0.2;
          pz += p.scatterZ * scatterEase;
        }

        pos.array[i * 3] = px;
        pos.array[i * 3 + 1] = py;
        pos.array[i * 3 + 2] = pz;

        const baseAlpha = Math.min(1, t * 1.5) * p.alpha;
        const fadeOut = Math.max(0, 1 - scatter * 1.8);
        alphaAttr.array[i] = baseAlpha * fadeOut;

        sizeAttr.array[i] = p.size * (1 + scatter * 1.5);
      }

      pos.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    this.smoothGyro.x += (this.gyro.x * 0.1 - this.smoothGyro.x) * 0.03;
    this.smoothGyro.y += (this.gyro.y * 0.06 - this.smoothGyro.y) * 0.03;
    this.camera.position.x = this.smoothGyro.x;
    this.camera.position.y = this.smoothGyro.y;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    this.animating = false;
    cancelAnimationFrame(this.rafId);

    if (this.onOrientation) {
      window.removeEventListener('deviceorientation', this.onOrientation);
      this.onOrientation = null;
    }
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
      this.onResize = null;
    }
    if (this.scrollContainer && this.onScroll) {
      this.scrollContainer.removeEventListener('scroll', this.onScroll);
      this.onScroll = null;
    }

    if (this.textParticles) {
      this.textParticles.geometry.dispose();
      (this.textParticles.material as THREE.Material).dispose();
      this.scene.remove(this.textParticles);
    }
    if (this.bgStars) {
      this.bgStars.geometry.dispose();
      (this.bgStars.material as THREE.Material).dispose();
      this.scene.remove(this.bgStars);
    }

    this.renderer.dispose();
  }
}
