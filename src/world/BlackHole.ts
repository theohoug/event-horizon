/**
 * @file BlackHole.ts
 * @description Raymarched black hole with accretion disk and gravitational lensing
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as THREE from 'three';
import blackholeVert from '../shaders/blackhole/blackhole.vert';
import blackholeFrag from '../shaders/blackhole/blackhole.frag';

export class BlackHole {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private resizeHandler: () => void;
  private pixelRatio: number;

  constructor(scene: THREE.Scene, maxSteps: number, qualityMedium: boolean, pixelRatio: number) {
    this.pixelRatio = pixelRatio;

    const defines: Record<string, string> = {};
    defines['MAX_STEPS'] = String(maxSteps);
    if (qualityMedium) defines['QUALITY_MEDIUM'] = '1';

    this.material = new THREE.ShaderMaterial({
      vertexShader: blackholeVert,
      fragmentShader: blackholeFrag,
      defines,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(
          (window.visualViewport?.width ?? window.innerWidth) * pixelRatio,
          (window.visualViewport?.height ?? window.innerHeight) * pixelRatio
        ) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uScroll: { value: 0 },
        uDistortion: { value: 0 },
        uDiskSpeed: { value: 1.2 },
        uIntensity: { value: 1.2 },
        uExplosion: { value: 0 },
        uAlteredTint: { value: new THREE.Vector3(0, 0, 0) },
        uPulsation: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
      transparent: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;

    scene.add(this.mesh);

    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this.resizeHandler);
    this.onResize();
  }

  private onResize() {
    const vv = window.visualViewport;
    const w = vv ? Math.round(vv.width) : window.innerWidth;
    const h = vv ? Math.round(vv.height) : window.innerHeight;
    this.material.uniforms.uResolution.value.set(
      w * this.pixelRatio,
      h * this.pixelRatio
    );
  }

  update(state: { time: number; scroll: number; mouseSmooth: THREE.Vector2; explosion?: number; isAltered?: boolean; isHardcore?: boolean }) {
    this.material.uniforms.uTime.value = state.time;
    this.material.uniforms.uScroll.value = state.scroll;
    this.material.uniforms.uMouse.value.copy(state.mouseSmooth);
    this.material.uniforms.uDistortion.value = state.scroll;
    this.material.uniforms.uIntensity.value = 1.0 + state.scroll * 0.3;
    if (state.explosion !== undefined) {
      this.material.uniforms.uExplosion.value = state.explosion;
    }
    if (state.isHardcore) {
      this.material.uniforms.uAlteredTint.value.set(0.35, -0.15, -0.25);
      this.material.uniforms.uDiskSpeed.value = 2.2;
      this.material.uniforms.uPulsation.value = 0.15;
    } else if (state.isAltered) {
      this.material.uniforms.uAlteredTint.value.set(0.2, -0.1, -0.15);
      this.material.uniforms.uDiskSpeed.value = 1.5;
      this.material.uniforms.uPulsation.value = 0;
    } else {
      this.material.uniforms.uAlteredTint.value.set(0, 0, 0);
      this.material.uniforms.uDiskSpeed.value = 1.2;
      this.material.uniforms.uPulsation.value = 0;
    }
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', this.resizeHandler);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
