/**
 * @file blackhole.vert
 * @description Fullscreen quad vertex shader for black hole raymarching
 * @author Cleanlystudio
 */

precision highp float;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
