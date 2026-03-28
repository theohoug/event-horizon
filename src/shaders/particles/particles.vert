/**
 * @file particles.vert
 * @description Starfield vertex shader with smooth accumulated flow and gravitational attraction
 * @author Cleanlystudio
 */

precision highp float;

uniform float uTime;
uniform float uScroll;
uniform float uFlow;
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
varying float vFlybySpeed;

#include ../common/noise.glsl

void main() {
  vec3 pos = position;

  float cameraZ = 38.0 - uScroll * 35.5;
  float cameraY = 7.0 - uScroll * 6.94;

  float r = length(pos - uBlackHolePos);
  vDistToCenter = r;

  float orbitFade = max(1.0 - uScroll * 3.0, 0.0);
  float angle = atan(pos.z, pos.x) + uTime * aSpeed * 0.06 * orbitFade;
  float orbitR = length(pos.xz);
  pos.x = cos(angle) * orbitR;
  pos.z = sin(angle) * orbitR;

  float noiseFade = max(1.0 - uScroll * 2.5, 0.0);
  if (noiseFade > 0.01) {
    vec3 curlP = pos * 0.12 + vec3(uTime * 0.06);
    float cn1 = snoise(curlP);
    float cn2 = snoise(curlP + vec3(31.416, 47.853, 12.793));
    float cn3 = snoise(curlP + vec3(113.5, 271.9, 124.6));
    vec3 curlVel = cross(vec3(cn1, cn2, cn3), vec3(cn3, cn1, cn2));
    pos += curlVel * 0.4 * noiseFade;
  }

  vec3 camPos = vec3(0.0, cameraY, cameraZ);
  vec3 starToCam = camPos - pos;
  float starDepth = length(starToCam);

  vec2 mouseNDC = (uMouse - 0.5) * 2.0;
  vec3 mouseRayDir = normalize(vec3(mouseNDC.x * 1.3, mouseNDC.y * 0.8, -1.0));
  vec3 mouseTarget = camPos + mouseRayDir * starDepth;
  vec3 awayFromMouse = pos - mouseTarget;
  float mouse3DDist = length(awayFromMouse);

  float depthFactor = 1.0 / max(starDepth * 0.07, 0.12);
  float mouseForce = exp(-mouse3DDist * mouse3DDist * 0.006) * 2.5 * (1.0 - uScroll * 0.7) * depthFactor;
  vec3 pushDir = mouse3DDist > 0.01 ? normalize(awayFromMouse) : vec3(0.0);
  pos += pushDir * mouseForce;

  float mouseLens = exp(-mouse3DDist * mouse3DDist * 0.012) * 1.5 * (1.0 - uScroll * 0.5);
  float mouseBright = exp(-mouse3DDist * mouse3DDist * 0.018) * 0.4 * (1.0 - uScroll * 0.6);

  float individualSpeed = 0.2 + aSpeed * 0.8;
  float zFlow = uFlow * individualSpeed;
  pos.z += zFlow;

  float rangeAhead = mix(28.0, 18.0, uScroll);
  float rangeBehind = mix(22.0, 50.0, uScroll);
  float totalRange = rangeAhead + rangeBehind;
  float tunnelFront = cameraZ - rangeAhead;
  float relZ = pos.z - tunnelFront;
  relZ = mod(relZ, totalRange);
  pos.z = tunnelFront + relZ;

  float inFrontOfCamera = smoothstep(0.0, 6.0, cameraZ - pos.z);
  float tunnelConverge = inFrontOfCamera * uScroll * 0.45;
  float xyLen = length(pos.xy);
  if (xyLen > 0.5) {
    pos.xy -= normalize(pos.xy) * tunnelConverge * xyLen;
  }

  float behindCamera = smoothstep(0.0, -10.0, pos.z - cameraZ);
  pos.x += pos.x * behindCamera * uScroll * 0.5;
  pos.y += pos.y * behindCamera * uScroll * 0.5;

  r = length(pos - uBlackHolePos);
  vDistToCenter = r;

  vFlybySpeed = uScroll * uScroll * individualSpeed;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float camDist = abs(pos.z - cameraZ);

  float sizeAttenuation = 180.0 / max(-mvPosition.z, 0.1);
  float distFade = smoothstep(1.5, 5.0, r);
  float scrollGrow = 1.0 + uScroll * 0.4;
  float speedSizeBoost = 1.0 + vFlybySpeed * 2.0;

  float proximityBoost = smoothstep(10.0, 0.3, camDist) * (1.5 + uScroll * 10.0);

  gl_PointSize = aSize * sizeAttenuation * uPixelRatio * distFade * scrollGrow * speedSizeBoost * 1.35;
  gl_PointSize *= (1.0 + proximityBoost);
  gl_PointSize *= (1.0 + mouseLens);
  gl_PointSize = clamp(gl_PointSize, 0.8, 32.0);

  float nearCamera = smoothstep(12.0, 1.5, camDist);
  float flybyBright = nearCamera * uScroll * 0.8;
  float proxFlash = smoothstep(4.0, 0.3, camDist) * (0.15 + uScroll * 0.7);
  float twinkle = sin(uTime * (1.5 + aRandomness.y * 4.0) + aRandomness.x * 43.0) * 0.5 + 0.5;
  twinkle = 0.8 + twinkle * 0.2;

  vBrightness = (aBrightness * distFade * 0.9 + flybyBright + proxFlash + mouseBright) * twinkle;

  float temp = hash(aRandomness.x * 127.1 + aRandomness.y * 311.7);
  vec3 coolBlue = vec3(0.7, 0.82, 1.0);
  vec3 pureWhite = vec3(1.0, 0.98, 0.95);
  vec3 warmGold = vec3(1.0, 0.9, 0.7);
  vColor = temp < 0.5
    ? mix(coolBlue, pureWhite, temp * 2.0)
    : mix(pureWhite, warmGold, (temp - 0.5) * 2.0);
}
