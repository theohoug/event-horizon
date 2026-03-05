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
  private shockwaves: { x: number; y: number; radius: number; strength: number; speed: number }[] = [];

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
        uThreshold: { value: 0.92 },
        uIntensity: { value: 1.0 },
        uPass: { value: 0 },
        uDirection: { value: new THREE.Vector2(1.0, 0.0) },
        uPassIndex: { value: 0 },
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
        uBloomMix: { value: 0.28 },
        uScrollVelocity: { value: 0 },
        uChapterFlash: { value: 0 },
        uShockwaves: { value: [
          new THREE.Vector4(0, 0, 0, 0),
          new THREE.Vector4(0, 0, 0, 0),
          new THREE.Vector4(0, 0, 0, 0),
          new THREE.Vector4(0, 0, 0, 0),
        ] },
        uHoldStrength: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uMotionBlur: { value: quality === 'medium' ? 0.0 : 1.0 },
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

  triggerShockwave(x: number, y: number, speed?: number) {
    this.shockwaves.push({ x, y, radius: 0, strength: 1, speed: speed ?? 0.8 });
    if (this.shockwaves.length > 4) this.shockwaves.shift();
  }

  update(state: { time: number; deltaTime: number; scroll: number; scrollVelocity: number; chapterFlash?: number; introProgress?: number; holdStrength?: number; mouseSmooth?: { x: number; y: number } }) {
    const intro = state.introProgress ?? 0;
    const introBloomBoost = intro > 0 && intro < 1 ? (1 - intro) * 0.3 : 0;

    const velBoost = Math.min(Math.abs(state.scrollVelocity) * 0.3, 1.5);
    const s = state.scroll;

    const climaxT = s > 0.65 ? (s - 0.65) / 0.35 : 0;
    const climaxBoost = climaxT * Math.sqrt(climaxT);
    const singDelta = (s - 0.77) * 18;
    const singularityPeak = Math.exp(-singDelta * singDelta);

    const hbActive = s > 0.33 ? 1 : 0;
    const hbBpm = 50 + Math.max(s - 0.35, 0) * 200;
    const hbPhase = state.time * hbBpm / 60 * Math.PI;
    const hbSin = Math.max(Math.sin(hbPhase), 0);
    const hbSin2 = hbSin * hbSin; const hbSin4 = hbSin2 * hbSin2; const hbSin8 = hbSin4 * hbSin4;
    const hbPulse = hbActive * hbSin8 * hbSin4 * 0.08;

    const breathD1 = (s - 0.45) * 16; const breathZone1 = Math.exp(-breathD1 * breathD1);
    const breathD2 = (s - 0.72) * 16; const breathZone2 = Math.exp(-breathD2 * breathD2);
    const breathCalm = Math.max(breathZone1, breathZone2) * 0.4;

    const hbChroma = hbPulse * 3.5;
    const chapterFlashChroma = (state.chapterFlash ?? 0) * 6;
    const whiteOutT = s > 0.82 ? (s - 0.82) / 0.18 : 0;
    const whiteOutFade = whiteOutT * whiteOutT;
    const chromatic = (0.25 + s * 1.8 + velBoost * 0.7 + climaxBoost * 1.2 + singularityPeak * 5.0 + hbChroma + chapterFlashChroma) * (1 - breathCalm) * Math.max(0, 1 - whiteOutFade * 1.1);

    this.compositeMaterial.uniforms.uTime.value = state.time;
    this.compositeMaterial.uniforms.uScroll.value = s;
    this.compositeMaterial.uniforms.uChromaticIntensity.value = chromatic;
    this.compositeMaterial.uniforms.uGrainIntensity.value = (0.035 + s * 0.04 + climaxBoost * 0.025) * (1 - breathCalm * 0.5);

    const vignetteBase = s < 0.5 ? 0.3 + s * 0.35 : 0.475 + (s - 0.5) * 0.85;
    this.compositeMaterial.uniforms.uVignetteIntensity.value = (vignetteBase + velBoost * 0.1 + hbPulse) * (1 - breathCalm * 0.3);
    this.compositeMaterial.uniforms.uBloomMix.value = 0.30 + s * 0.30 + introBloomBoost + climaxBoost * 0.25;
    this.bloomMaterial.uniforms.uThreshold.value = Math.max(0.38, 0.88 - s * 0.28 - introBloomBoost * 0.15 - climaxBoost * 0.15);
    this.compositeMaterial.uniforms.uScrollVelocity.value = state.scrollVelocity;
    this.compositeMaterial.uniforms.uChapterFlash.value = state.chapterFlash ?? 0;
    this.compositeMaterial.uniforms.uHoldStrength.value = state.holdStrength ?? 0;
    this.compositeMaterial.uniforms.uMouse.value.set(state.mouseSmooth?.x ?? 0.5, state.mouseSmooth?.y ?? 0.5);

    const dt = state.deltaTime ?? 0.016;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.strength *= 0.96;
      if (sw.strength < 0.01) this.shockwaves.splice(i, 1);
    }

    const swUniforms = this.compositeMaterial.uniforms.uShockwaves.value as THREE.Vector4[];
    for (let i = 0; i < 4; i++) {
      if (i < this.shockwaves.length) {
        const sw = this.shockwaves[i];
        swUniforms[i].set(sw.x, sw.y, sw.radius, sw.strength);
      } else {
        swUniforms[i].set(0, 0, 0, 0);
      }
    }
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
      this.bloomMaterial.uniforms.uPassIndex.value = i;

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

  updateCamera(scroll: number, time?: number, introProgress?: number, mouseX?: number, mouseY?: number) {
    const t = time ?? 0;
    const intro = introProgress ?? 0;
    const isInIntro = intro > 0 && intro < 1;
    const mx = (mouseX ?? 0.5) - 0.5;
    const my = (mouseY ?? 0.5) - 0.5;

    const introZoom = isInIntro ? (1 - intro) * 30 : 0;
    const introYOffset = isInIntro ? (1 - intro) * 5 : 0;

    const scrollPow = Math.pow(scroll, 1.05);
    const z = 38 - scrollPow * 35.5 + introZoom;
    const y = 7 - Math.pow(scroll, 1.2) * 6.94 + introYOffset;

    const parallaxStrength = Math.max(0, 1 - scroll * 1.5) * 0.8;
    const parallaxX = mx * parallaxStrength;
    const parallaxY = my * parallaxStrength * 0.5;

    const drift = Math.sin(t * 0.15) * 0.08 * (1 - scroll * 0.5);
    const driftY = Math.cos(t * 0.12) * 0.05 * (1 - scroll * 0.5);
    const sway = Math.sin(scroll * 0.4) * 0.3;

    this.particleCamera.position.set(sway + drift + parallaxX, y + driftY + parallaxY, z);
    this.particleCamera.lookAt(drift * 0.3 + parallaxX * 0.2, driftY * 0.2 + parallaxY * 0.2, 0);

    const rollAccel = Math.pow(scroll, 1.5);
    const roll = Math.sin(scroll * Math.PI * 2) * 0.03 * rollAccel;
    const introRoll = isInIntro ? Math.sin(t * 0.3) * 0.01 * (1 - intro) : 0;
    const velocityRoll = Math.sin(t * 2.5) * 0.004 * rollAccel;
    this.particleCamera.rotation.z = roll + Math.sin(t * 0.1) * 0.003 + introRoll + velocityRoll;

    const introFov = isInIntro ? (1 - intro) * 20 : 0;
    const fovAccel = Math.pow(Math.max(0, scroll - 0.35) / 0.65, 1.8) * 8;
    const fovTarget = 45 + scroll * 12 + fovAccel + introFov;
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
    this.sceneTarget.texture.dispose();
    this.sceneTarget.dispose();
    this.bloomTargetA.texture.dispose();
    this.bloomTargetA.dispose();
    this.bloomTargetB.texture.dispose();
    this.bloomTargetB.dispose();
    this.quad.geometry.dispose();
    this.bloomMaterial.dispose();
    this.compositeMaterial.dispose();
  }
}
