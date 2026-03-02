/**
 * @file particles.vert
 * @description Instanced particle vertex shader with gravitational attraction
 * @author Cleanlystudio
 */

precision highp float;

uniform float uTime;
uniform float uScroll;
uniform float uPixelRatio;
uniform vec3 uBlackHolePos;
uniform vec2 uMouse;

attribute float aSize;
attribute float aBrightness;
attribute float aSpeed;
attribute vec3 aRandomness;

varying float vBrightness;
varying float vDistToCenter;
varying vec3 vColor;

#include ../common/noise.glsl

void main() {
  vec3 pos = position;

  float r = length(pos - uBlackHolePos);
  vDistToCenter = r;

  vec3 toCenter = normalize(uBlackHolePos - pos);
  float gravitationalPull = uScroll * 2.0 / max(r * r, 0.5);
  gravitationalPull = min(gravitationalPull, 0.8);
  pos += toCenter * gravitationalPull;

  float angle = atan(pos.z, pos.x) + uTime * aSpeed * 0.1;
  float orbitR = length(pos.xz);
  pos.x = cos(angle) * orbitR;
  pos.z = sin(angle) * orbitR;

  vec3 noiseInput = pos * 0.1 + uTime * 0.05;
  float nx = snoise(noiseInput);
  float ny = snoise(noiseInput + vec3(31.416, 0.0, 0.0));
  float nz = snoise(noiseInput + vec3(0.0, 0.0, 47.853));
  pos += vec3(nx, ny, nz) * 0.2 * (1.0 - uScroll * 0.5);

  pos.y += sin(uTime * aSpeed * 0.3 + aRandomness.x * 6.28) * 0.1;

  vec2 mouseWorld = (uMouse - 0.5) * vec2(40.0, 20.0);
  vec2 toMouse = mouseWorld - pos.xz;
  float mouseDist = length(toMouse);
  float mouseRepel = exp(-mouseDist * mouseDist * 0.01) * 1.5 * (1.0 - uScroll);
  pos.xz -= normalize(toMouse + vec2(0.001)) * mouseRepel;
  pos.y += mouseRepel * 0.3;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float sizeAttenuation = 140.0 / max(-mvPosition.z, 0.1);
  float distFade = smoothstep(1.5, 5.0, r);
  float scrollFade = 1.0 - uScroll * 0.6;
  float earlyBoost = 1.0 + smoothstep(0.2, 0.0, uScroll) * 0.8;
  gl_PointSize = aSize * sizeAttenuation * uPixelRatio * distFade * scrollFade * earlyBoost;
  gl_PointSize = min(max(gl_PointSize, 0.5), 12.0);

  float nearGlow = smoothstep(6.0, 2.0, r) * uScroll;
  vBrightness = aBrightness * distFade * scrollFade * 0.65 * earlyBoost + nearGlow * 0.18;

  float temp = hash(aRandomness.x * 127.1 + aRandomness.y * 311.7);
  vec3 coldStar = vec3(0.7, 0.8, 1.0);
  vec3 hotStar = vec3(0.9, 0.85, 1.0);
  vec3 cyanStar = vec3(0.5, 0.9, 0.95);
  vColor = mix(coldStar, mix(hotStar, cyanStar, temp * temp), temp);
}
