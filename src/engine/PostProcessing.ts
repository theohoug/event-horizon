/**
 * @file PostProcessing.ts
 * @description Custom multi-pass post-processing pipeline with scene compositing
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as THREE from 'three';
import bloomFrag from '../shaders/postfx/bloom.frag';
import compositeFrag from '../shaders/postfx/composite.frag';
import fullscreenVert from '../shaders/postfx/fullscreen.vert';

type Quality = 'ultra' | 'high' | 'medium';

export class PostProcessing {
  private renderer: THREE.WebGLRenderer;
  private quality: Quality;

  bgScene: THREE.Scene;
  bgCamera: THREE.OrthographicCamera;
  particleScene: THREE.Scene;
  particleCamera: THREE.PerspectiveCamera;

  private sceneTarget: THREE.WebGLRenderTarget;
  private bloomTargetA: THREE.WebGLRenderTarget;
  private bloomTargetB: THREE.WebGLRenderTarget;

  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;

  private bloomMaterial: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;

  private bloomPasses: number;

  constructor(renderer: THREE.WebGLRenderer, quality: Quality) {
    this.renderer = renderer;
    this.quality = quality;

    this.bloomPasses = quality === 'ultra' ? 5 : quality === 'high' ? 4 : 3;

    this.bgScene = new THREE.Scene();
    this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.particleScene = new THREE.Scene();
    this.particleCamera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.particleCamera.position.set(0, 7, 38);
    this.particleCamera.lookAt(0, 0, 0);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = renderer.getPixelRatio();

    const rtParams: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };

    const sw = Math.floor(w * pr);
    const sh = Math.floor(h * pr);
    this.sceneTarget = new THREE.WebGLRenderTarget(sw, sh, rtParams);
    const bloomScale = quality === 'medium' ? 0.25 : 0.5;
    const bw = Math.max(1, Math.floor(sw * bloomScale));
    const bh = Math.max(1, Math.floor(sh * bloomScale));
    this.bloomTargetA = new THREE.WebGLRenderTarget(bw, bh, rtParams);
    this.bloomTargetB = new THREE.WebGLRenderTarget(bw, bh, rtParams);

    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();
    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geo);
    this.quadScene.add(this.quad);

    this.bloomMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: bloomFrag,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(w * pr * bloomScale, h * pr * bloomScale) },
        uThreshold: { value: 0.8 },
        uIntensity: { value: 1.0 },
        uPass: { value: 0 },
        uDirection: { value: new THREE.Vector2(1.0, 0.0) },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: compositeFrag,
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        uResolution: { value: new THREE.Vector2(w * pr, h * pr) },
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uChromaticIntensity: { value: 0.8 },
        uGrainIntensity: { value: 0.04 },
        uVignetteIntensity: { value: 0.6 },
        uBloomMix: { value: 0.4 },
        uScrollVelocity: { value: 0 },
        uChapterFlash: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  private renderQuad(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  update(state: { time: number; scroll: number; scrollVelocity: number; chapterFlash?: number; introProgress?: number }) {
    const intro = state.introProgress ?? 0;
    const introBloomBoost = intro > 0 && intro < 1 ? (1 - intro) * 0.3 : 0;

    const velBoost = Math.min(Math.abs(state.scrollVelocity) * 0.3, 1.5);
    const chromatic = 0.4 + state.scroll * 2.5 + velBoost;
    this.compositeMaterial.uniforms.uTime.value = state.time;
    this.compositeMaterial.uniforms.uScroll.value = state.scroll;
    this.compositeMaterial.uniforms.uChromaticIntensity.value = chromatic;
    this.compositeMaterial.uniforms.uGrainIntensity.value = 0.03 + state.scroll * 0.04;
    this.compositeMaterial.uniforms.uVignetteIntensity.value = 0.4 + state.scroll * 0.7 + velBoost * 0.1;
    this.compositeMaterial.uniforms.uBloomMix.value = 0.35 + state.scroll * 0.3 + introBloomBoost;
    this.bloomMaterial.uniforms.uThreshold.value = Math.max(0.45, 0.85 - state.scroll * 0.3 - introBloomBoost * 0.2);
    this.compositeMaterial.uniforms.uScrollVelocity.value = state.scrollVelocity;
    this.compositeMaterial.uniforms.uChapterFlash.value = state.chapterFlash ?? 0;
  }

  render() {
    this.renderer.setRenderTarget(this.sceneTarget);
    this.renderer.setClearColor(0x050505, 1);
    this.renderer.clear();

    this.renderer.render(this.bgScene, this.bgCamera);

    this.renderer.autoClear = false;
    this.renderer.render(this.particleScene, this.particleCamera);
    this.renderer.autoClear = true;

    this.bloomMaterial.uniforms.tDiffuse.value = this.sceneTarget.texture;
    this.bloomMaterial.uniforms.uPass.value = 0;
    this.renderQuad(this.bloomMaterial, this.bloomTargetA);

    let readTarget = this.bloomTargetA;
    let writeTarget = this.bloomTargetB;

    for (let i = 0; i < this.bloomPasses; i++) {
      this.bloomMaterial.uniforms.uPass.value = 1;

      this.bloomMaterial.uniforms.uDirection.value.set(1.0, 0.0);
      this.bloomMaterial.uniforms.tDiffuse.value = readTarget.texture;
      this.renderQuad(this.bloomMaterial, writeTarget);

      const temp = readTarget;
      readTarget = writeTarget;
      writeTarget = temp;

      this.bloomMaterial.uniforms.uDirection.value.set(0.0, 1.0);
      this.bloomMaterial.uniforms.tDiffuse.value = readTarget.texture;
      this.renderQuad(this.bloomMaterial, writeTarget);

      const temp2 = readTarget;
      readTarget = writeTarget;
      writeTarget = temp2;
    }

    this.compositeMaterial.uniforms.tDiffuse.value = this.sceneTarget.texture;
    this.compositeMaterial.uniforms.tBloom.value = readTarget.texture;
    this.renderQuad(this.compositeMaterial, null);
  }

  updateCamera(scroll: number, time?: number, introProgress?: number) {
    const t = time ?? 0;
    const intro = introProgress ?? 0;
    const isInIntro = intro > 0 && intro < 1;

    const introZoom = isInIntro ? (1 - intro) * 30 : 0;
    const introYOffset = isInIntro ? (1 - intro) * 5 : 0;

    const scrollPow = Math.pow(scroll, 1.05);
    const z = 38 - scrollPow * 35.5 + introZoom;
    const y = 7 - Math.pow(scroll, 1.2) * 6.94 + introYOffset;

    const drift = Math.sin(t * 0.15) * 0.08 * (1 - scroll * 0.5);
    const driftY = Math.cos(t * 0.12) * 0.05 * (1 - scroll * 0.5);
    const sway = Math.sin(scroll * 0.4) * 0.3;

    this.particleCamera.position.set(sway + drift, y + driftY, z);
    this.particleCamera.lookAt(drift * 0.3, driftY * 0.2, 0);

    const rollAccel = Math.pow(scroll, 1.5);
    const roll = Math.sin(scroll * Math.PI * 2) * 0.03 * rollAccel;
    const introRoll = isInIntro ? Math.sin(t * 0.3) * 0.01 * (1 - intro) : 0;
    const velocityRoll = Math.sin(t * 2.5) * 0.004 * rollAccel;
    this.particleCamera.rotation.z = roll + Math.sin(t * 0.1) * 0.003 + introRoll + velocityRoll;

    const introFov = isInIntro ? (1 - intro) * 20 : 0;
    const fovAccel = Math.pow(Math.max(0, scroll - 0.3) / 0.7, 1.5) * 10;
    const fovTarget = 45 + scroll * 15 + fovAccel + introFov;
    this.particleCamera.fov += (fovTarget - this.particleCamera.fov) * 0.05;
    this.particleCamera.updateProjectionMatrix();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = this.renderer.getPixelRatio();
    const bloomScale = this.quality === 'medium' ? 0.25 : 0.5;

    const sw = Math.floor(w * pr);
    const sh = Math.floor(h * pr);
    const bw = Math.max(1, Math.floor(sw * bloomScale));
    const bh = Math.max(1, Math.floor(sh * bloomScale));

    this.sceneTarget.setSize(sw, sh);
    this.bloomTargetA.setSize(bw, bh);
    this.bloomTargetB.setSize(bw, bh);

    this.particleCamera.aspect = w / h;
    this.particleCamera.updateProjectionMatrix();

    this.bloomMaterial.uniforms.uResolution.value.set(bw, bh);
    this.compositeMaterial.uniforms.uResolution.value.set(sw, sh);
  }

  destroy() {
    this.sceneTarget.dispose();
    this.bloomTargetA.dispose();
    this.bloomTargetB.dispose();
    this.quad.geometry.dispose();
    this.bloomMaterial.dispose();
    this.compositeMaterial.dispose();
  }
}
