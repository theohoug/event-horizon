/**
 * @file disposeScene.ts
 * @description Recursive GPU memory cleanup for Three.js scenes
 * @author Cleanlystudio
 */

import * as THREE from 'three';

function disposeMaterial(material: THREE.Material) {
  if (material instanceof THREE.ShaderMaterial || material instanceof THREE.RawShaderMaterial) {
    const uniforms = material.uniforms;
    if (uniforms) {
      for (const key of Object.keys(uniforms)) {
        const value = uniforms[key].value;
        if (value instanceof THREE.Texture) value.dispose();
        if (value instanceof THREE.WebGLRenderTarget) value.dispose();
      }
    }
  }

  if ('map' in material && (material as THREE.MeshStandardMaterial).map) {
    (material as THREE.MeshStandardMaterial).map!.dispose();
  }

  material.dispose();
}

export function disposeScene(scene: THREE.Scene | THREE.Object3D) {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
      if (obj.geometry) obj.geometry.dispose();

      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(obj.material);
        }
      }
    }
  });

  if (scene instanceof THREE.Scene) {
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
    if (scene.background instanceof THREE.Texture) {
      scene.background.dispose();
      scene.background = null;
    }
    if (scene.environment instanceof THREE.Texture) {
      scene.environment.dispose();
      scene.environment = null;
    }
  }
}

export function disposeRenderTargets(...targets: (THREE.WebGLRenderTarget | null)[]) {
  for (const rt of targets) {
    if (rt) {
      rt.texture?.dispose();
      rt.dispose();
    }
  }
}
