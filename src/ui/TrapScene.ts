/**
 * @file TrapScene.ts
 * @description WebGL Three.js scene for the "Trapped" overlay — particles forming "TRAPPED"
 * @author Cleanlystudio
 */

import * as THREE from 'three';

const TEXT_PARTICLE_COUNT = 300;
const BG_STAR_COUNT = 1200;
const FORMATION_DURATION = 3.5;

interface Particle {
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  startZ: number;
  size: number;
  alpha: number;
  delay: number;
}

export class TrapScene {
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
  private mouse = { x: 0, y: 0 };
  private onMouseMove: ((e: MouseEvent) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x030305, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.z = 5;

    this.resize();
    this.createBgStars();
    this.createTextParticles();

    this.onMouseMove = (e: MouseEvent) => {
      this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', this.onMouseMove);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private sampleTextPositions(text: string): { x: number; y: number }[] {
    const offscreen = document.createElement('canvas');
    const fontSize = 120;
    offscreen.width = 1024;
    offscreen.height = 256;
    const ctx = offscreen.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${fontSize}px "Cinzel", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, offscreen.width / 2, offscreen.height / 2);

    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const positions: { x: number; y: number }[] = [];
    const step = 3;

    for (let y = 0; y < offscreen.height; y += step) {
      for (let x = 0; x < offscreen.width; x += step) {
        const i = (y * offscreen.width + x) * 4;
        if (imageData.data[i] > 128) {
          positions.push({
            x: (x / offscreen.width - 0.5) * 8,
            y: -(y / offscreen.height - 0.5) * 2,
          });
        }
      }
    }

    return positions;
  }

  private createTextParticles() {
    const textPositions = this.sampleTextPositions('TRAPPED');
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
      const radius = 4 + Math.random() * 6;
      const startX = Math.cos(angle) * radius;
      const startY = Math.sin(angle) * radius;
      const startZ = (Math.random() - 0.5) * 4;

      const particle: Particle = {
        targetX: tp.x,
        targetY: tp.y,
        startX,
        startY,
        startZ,
        size: 0.6 + Math.random() * 1.2,
        alpha: 0.3 + Math.random() * 0.7,
        delay: Math.random() * 0.6,
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
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uColor: { value: new THREE.Color(0.85, 0.55, 0.2) },
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
          gl_PointSize = size * uPixelRatio * (4.0 / -mvPos.z);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform vec3 uColor;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float glow = exp(-d * d * 3.0);
          float core = smoothstep(0.6, 0.0, d);
          float brightness = mix(glow * 0.4, 1.0, core);
          gl_FragColor = vec4(uColor * brightness, vAlpha * brightness);
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
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = -2 - Math.random() * 8;
      sizes[i] = 0.3 + Math.random() * 0.8;
      twinklePhases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(twinklePhases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vTwinkle = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * 0.8 + phase));
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = size * uPixelRatio * (3.0 / -mvPos.z);
        }
      `,
      fragmentShader: `
        varying float vTwinkle;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, d) * vTwinkle * 0.35;
          vec3 col = mix(vec3(0.5, 0.4, 0.3), vec3(0.7, 0.55, 0.35), d);
          gl_FragColor = vec4(col, a);
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

    if (this.bgStars) {
      (this.bgStars.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }

    if (this.textParticles) {
      const geo = this.textParticles.geometry;
      const pos = geo.getAttribute('position') as THREE.BufferAttribute;
      const alphaAttr = geo.getAttribute('alpha') as THREE.BufferAttribute;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const t = Math.max(0, elapsed - p.delay) / FORMATION_DURATION;
        const ease = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);

        pos.array[i * 3] = p.startX + (p.targetX - p.startX) * ease;
        pos.array[i * 3 + 1] = p.startY + (p.targetY - p.startY) * ease;
        pos.array[i * 3 + 2] = p.startZ * (1 - ease);

        if (ease >= 1) {
          const drift = Math.sin(elapsed * 0.5 + i * 0.3) * 0.02;
          pos.array[i * 3] += drift;
          pos.array[i * 3 + 1] += Math.cos(elapsed * 0.4 + i * 0.2) * 0.015;
        }

        alphaAttr.array[i] = Math.min(1, t * 2) * p.alpha;
      }

      pos.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    }

    this.camera.position.x += (this.mouse.x * 0.15 - this.camera.position.x) * 0.05;
    this.camera.position.y += (this.mouse.y * 0.1 - this.camera.position.y) * 0.05;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    this.animating = false;
    cancelAnimationFrame(this.rafId);

    if (this.onMouseMove) {
      window.removeEventListener('mousemove', this.onMouseMove);
      this.onMouseMove = null;
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
    this.renderer.forceContextLoss();
  }
}
