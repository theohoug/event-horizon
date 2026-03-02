/**
 * @file Starfield.ts
 * @description Instanced particle starfield with gravitational attraction
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as THREE from 'three';
import particlesVert from '../shaders/particles/particles.vert';
import particlesFrag from '../shaders/particles/particles.frag';

type Quality = 'ultra' | 'high' | 'medium';

const PARTICLE_COUNT = {
  ultra: 35000,
  high: 18000,
  medium: 8000,
};

export class Starfield {
  private points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene, quality: Quality) {
    const count = PARTICLE_COUNT[quality];

    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brightness = new Float32Array(count);
    const speeds = new Float32Array(count);
    const randomness = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.pow(Math.random(), 0.4) * 45;

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = (Math.random() - 0.5) * r * 0.25;
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      sizes[i] = 0.3 + Math.random() * 2.2;
      brightness[i] = 0.15 + Math.pow(Math.random(), 2.5) * 0.6;
      speeds[i] = 0.2 + Math.random() * 1.5;

      randomness[i3] = Math.random();
      randomness[i3 + 1] = Math.random();
      randomness[i3 + 2] = Math.random();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
    this.geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    this.geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: particlesVert,
      fragmentShader: particlesFrag,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uBlackHolePos: { value: new THREE.Vector3(0, 0, 0) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.renderOrder = 1;
    scene.add(this.points);
  }

  update(state: { time: number; scroll: number; mouseSmooth: THREE.Vector2 }) {
    this.material.uniforms.uTime.value = state.time;
    this.material.uniforms.uScroll.value = state.scroll;
    this.material.uniforms.uMouse.value.copy(state.mouseSmooth);
  }

  destroy() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
