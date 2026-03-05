/**
 * @file GPGPUParticles.ts
 * @description GPGPU particle simulation with gravitational N-body dynamics,
 *              accretion disk formation, curl noise turbulence, and velocity trails
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as THREE from 'three';
import fullscreenVert from '../shaders/postfx/fullscreen.vert';
import simFrag from '../shaders/gpgpu/sim.frag';
import renderVert from '../shaders/gpgpu/render.vert';
import renderFrag from '../shaders/gpgpu/render.frag';

type Quality = 'ultra' | 'high' | 'medium';

const TEXTURE_SIZES: Record<Quality, number> = {
  ultra: 256,
  high: 200,
  medium: 160,
};

export class GPGPUParticles {
  private renderer: THREE.WebGLRenderer;
  private textureSize: number;

  private posRT: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private velRT: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private currentIndex = 0;

  private simScene: THREE.Scene;
  private simCamera: THREE.OrthographicCamera;
  private simQuad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private simMaterial: THREE.ShaderMaterial;
  private copyMaterial: THREE.ShaderMaterial;

  private points!: THREE.Points;
  private renderMaterial!: THREE.ShaderMaterial;
  private renderGeometry!: THREE.BufferGeometry;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, quality: Quality, pixelRatio: number) {
    this.renderer = renderer;
    this.textureSize = TEXTURE_SIZES[quality];

    const fboOpts: THREE.RenderTargetOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    };

    this.posRT = [
      new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, fboOpts),
      new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, fboOpts),
    ];
    this.velRT = [
      new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, fboOpts),
      new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, fboOpts),
    ];

    this.simScene = new THREE.Scene();
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.copyMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: [
        'precision highp float;',
        'uniform sampler2D tSource;',
        'varying vec2 vUv;',
        'void main() { gl_FragColor = texture2D(tSource, vUv); }',
      ].join('\n'),
      uniforms: { tSource: { value: null } },
      depthTest: false,
      depthWrite: false,
    });

    this.simMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: simFrag,
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uTime: { value: 0 },
        uDeltaTime: { value: 0.016 },
        uScroll: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uPass: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    const simGeo = new THREE.PlaneGeometry(2, 2);
    this.simQuad = new THREE.Mesh(simGeo, this.simMaterial);
    this.simScene.add(this.simQuad);

    this.initFBOs();
    this.setupRender(scene, pixelRatio);
  }

  private initFBOs() {
    const count = this.textureSize * this.textureSize;
    const posData = new Float32Array(count * 4);
    const velData = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      const i4 = i * 4;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.pow(Math.random(), 0.4) * 45;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = (Math.random() - 0.5) * r * 0.2;
      const z = r * Math.sin(phi) * Math.sin(theta);

      posData[i4] = x;
      posData[i4 + 1] = y;
      posData[i4 + 2] = z;
      posData[i4 + 3] = 0.5 + Math.random() * 0.5;

      const dist = Math.sqrt(x * x + z * z);
      const orbSpeed = 0.7 / Math.sqrt(Math.max(dist, 1.0));

      velData[i4] = -Math.sin(theta) * orbSpeed + (Math.random() - 0.5) * 0.08;
      velData[i4 + 1] = (Math.random() - 0.5) * 0.03;
      velData[i4 + 2] = Math.cos(theta) * orbSpeed + (Math.random() - 0.5) * 0.08;
      velData[i4 + 3] = 0.5 + Math.random() * 0.5;
    }

    const posTex = new THREE.DataTexture(posData, this.textureSize, this.textureSize, THREE.RGBAFormat, THREE.FloatType);
    posTex.needsUpdate = true;
    const velTex = new THREE.DataTexture(velData, this.textureSize, this.textureSize, THREE.RGBAFormat, THREE.FloatType);
    velTex.needsUpdate = true;

    const prevRT = this.renderer.getRenderTarget();
    this.simQuad.material = this.copyMaterial;

    this.copyMaterial.uniforms.tSource.value = posTex;
    this.renderer.setRenderTarget(this.posRT[0]);
    this.renderer.render(this.simScene, this.simCamera);
    this.renderer.setRenderTarget(this.posRT[1]);
    this.renderer.render(this.simScene, this.simCamera);

    this.copyMaterial.uniforms.tSource.value = velTex;
    this.renderer.setRenderTarget(this.velRT[0]);
    this.renderer.render(this.simScene, this.simCamera);
    this.renderer.setRenderTarget(this.velRT[1]);
    this.renderer.render(this.simScene, this.simCamera);

    this.simQuad.material = this.simMaterial;
    this.renderer.setRenderTarget(prevRT);

    posTex.dispose();
    velTex.dispose();
  }

  private setupRender(scene: THREE.Scene, pixelRatio: number) {
    const count = this.textureSize * this.textureSize;
    this.renderGeometry = new THREE.BufferGeometry();

    const refs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      refs[i * 2] = (i % this.textureSize) / this.textureSize + 0.5 / this.textureSize;
      refs[i * 2 + 1] = Math.floor(i / this.textureSize) / this.textureSize + 0.5 / this.textureSize;
    }
    this.renderGeometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2));

    const randoms = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      randoms[i] = Math.random();
    }
    this.renderGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));

    const positions = new Float32Array(count * 3);
    this.renderGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.renderMaterial = new THREE.ShaderMaterial({
      vertexShader: renderVert,
      fragmentShader: renderFrag,
      uniforms: {
        tPosition: { value: this.posRT[0].texture },
        tVelocity: { value: this.velRT[0].texture },
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.points = new THREE.Points(this.renderGeometry, this.renderMaterial);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    scene.add(this.points);
  }

  update(state: { time: number; deltaTime: number; scroll: number; mouseSmooth: THREE.Vector2 }) {
    const read = this.currentIndex;
    const write = 1 - read;

    const prevRT = this.renderer.getRenderTarget();
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = true;

    this.simMaterial.uniforms.tPosition.value = this.posRT[read].texture;
    this.simMaterial.uniforms.tVelocity.value = this.velRT[read].texture;
    this.simMaterial.uniforms.uTime.value = state.time;
    this.simMaterial.uniforms.uDeltaTime.value = Math.min(state.deltaTime, 0.05);
    this.simMaterial.uniforms.uScroll.value = state.scroll;
    this.simMaterial.uniforms.uMouse.value.set(state.mouseSmooth.x, state.mouseSmooth.y);

    this.simMaterial.uniforms.uPass.value = 0;
    this.renderer.setRenderTarget(this.velRT[write]);
    this.renderer.render(this.simScene, this.simCamera);

    this.simMaterial.uniforms.tVelocity.value = this.velRT[write].texture;
    this.simMaterial.uniforms.uPass.value = 1;
    this.renderer.setRenderTarget(this.posRT[write]);
    this.renderer.render(this.simScene, this.simCamera);

    this.renderer.setRenderTarget(prevRT);
    this.renderer.autoClear = prevAutoClear;

    this.renderMaterial.uniforms.tPosition.value = this.posRT[write].texture;
    this.renderMaterial.uniforms.tVelocity.value = this.velRT[write].texture;
    this.renderMaterial.uniforms.uTime.value = state.time;
    this.renderMaterial.uniforms.uScroll.value = state.scroll;
    this.renderMaterial.uniforms.uMouse.value.set(state.mouseSmooth.x, state.mouseSmooth.y);

    this.currentIndex = write;
  }

  destroy() {
    this.posRT[0].texture.dispose();
    this.posRT[0].dispose();
    this.posRT[1].texture.dispose();
    this.posRT[1].dispose();
    this.velRT[0].texture.dispose();
    this.velRT[0].dispose();
    this.velRT[1].texture.dispose();
    this.velRT[1].dispose();
    this.simQuad.geometry.dispose();
    this.renderGeometry.dispose();
    this.renderMaterial.dispose();
    this.simMaterial.dispose();
    this.copyMaterial.dispose();
  }
}
