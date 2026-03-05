/**
 * @file BlackHole.ts
 * @description Raymarched black hole with accretion disk and gravitational lensing
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as THREE from 'three';
import blackholeVert from '../shaders/blackhole/blackhole.vert';
import blackholeFrag from '../shaders/blackhole/blackhole.frag';

type Quality = 'ultra' | 'high' | 'medium';

export class BlackHole {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private resizeHandler: () => void;
  private pixelRatio: number;

  constructor(scene: THREE.Scene, quality: Quality, pixelRatio: number) {
    this.pixelRatio = pixelRatio;

    const defines: Record<string, string> = {};
    if (quality === 'medium') {
      defines['MAX_STEPS'] = '96';
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: blackholeVert,
      fragmentShader: blackholeFrag,
      defines,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(
          window.innerWidth * pixelRatio,
          window.innerHeight * pixelRatio
        ) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uScroll: { value: 0 },
        uDistortion: { value: 0 },
        uDiskSpeed: { value: 1.2 },
        uIntensity: { value: 1.2 },
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
    this.onResize();
  }

  private onResize() {
    this.material.uniforms.uResolution.value.set(
      window.innerWidth * this.pixelRatio,
      window.innerHeight * this.pixelRatio
    );
  }

  update(state: { time: number; scroll: number; mouseSmooth: THREE.Vector2 }) {
    this.material.uniforms.uTime.value = state.time;
    this.material.uniforms.uScroll.value = state.scroll;
    this.material.uniforms.uMouse.value.copy(state.mouseSmooth);
    this.material.uniforms.uDistortion.value = state.scroll;
    this.material.uniforms.uIntensity.value = 1.0 + state.scroll * 0.3;
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
