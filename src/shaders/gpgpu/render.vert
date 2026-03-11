/**
 * @file render.vert
 * @description GPGPU particle render — reads position/velocity from simulation FBOs
 * @author Cleanlystudio
 * @version 1.0.0
 */

precision highp float;

attribute vec2 aRef;
attribute vec3 aRandom;

uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform float uTime;
uniform float uScroll;
uniform float uPixelRatio;
uniform vec2 uMouse;

varying float vBrightness;
varying float vDistToCenter;
varying vec3 vColor;
varying float vSpeed;
varying float vLife;
varying float vScroll;
varying float vCursorProximity;
varying float vDiskGlow;
varying vec3 vScrollTint;

float localHash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  vec4 posData = texture2D(tPosition, aRef);
  vec4 velData = texture2D(tVelocity, aRef);

  vec3 pos = posData.xyz;
  float life = posData.w;
  vec3 vel = velData.xyz;

  float dist = length(pos);
  float speed = length(vel);
  vDistToCenter = dist;
  vSpeed = speed;
  vLife = life;
  vScroll = uScroll;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float diskAngle = atan(pos.z, pos.x);
  float diskWobble = sin(uTime * 0.4 + diskAngle * 2.0) * 0.15;
  float diskPlane = 1.0 - smoothstep(0.0, 1.5, abs(pos.y + diskWobble));
  float diskRadius = smoothstep(1.2, 2.5, dist) * smoothstep(8.0, 4.0, dist);
  float dustLane = smoothstep(0.3, 0.0, abs(sin(diskAngle * 3.0 + dist * 1.5)));
  float diskGlow = diskPlane * diskRadius * smoothstep(0.3, 0.6, uScroll) * (1.0 - dustLane * 0.3);

  float sizeBase = 0.8 + aRandom.x * 1.8;
  float sizeAttenuation = 130.0 / max(-mvPosition.z, 0.1);
  float distFade = smoothstep(0.8, 5.0, dist);
  float scrollFade = 1.0 - uScroll * 0.45;
  float earlyBoost = 1.0 + smoothstep(0.2, 0.0, uScroll) * 0.6;
  float speedScale = 1.0 + min(speed * 0.4, 2.0);
  float lifeFade = smoothstep(0.0, 0.15, life);

  float diskSizeBoost = 1.0 + diskGlow * 0.5;
  gl_PointSize = sizeBase * sizeAttenuation * uPixelRatio * distFade * scrollFade * speedScale * earlyBoost * lifeFade * diskSizeBoost;
  gl_PointSize = clamp(gl_PointSize, 0.5, 18.0);

  float nearGlow = smoothstep(6.0, 1.5, dist) * uScroll;
  vBrightness = (0.25 + aRandom.y * 0.55) * distFade * scrollFade * life * earlyBoost + nearGlow * 0.25;
  vBrightness += diskGlow * 0.35;
  vDiskGlow = diskGlow;

  float temp = aRandom.z;
  vec3 coldStar = vec3(0.9, 0.82, 0.72);
  vec3 warmStar = vec3(1.0, 0.88, 0.72);
  vec3 hotStar = vec3(1.0, 0.95, 0.88);

  vColor = mix(coldStar, mix(warmStar, hotStar, temp), temp);

  float nearShift = smoothstep(8.0, 2.0, dist);
  vec3 innerHot = vec3(1.0, 0.92, 0.80);
  vColor = mix(vColor, innerHot, nearShift * 0.4);

  float speedShift = smoothstep(1.5, 5.0, speed);
  vColor = mix(vColor, vec3(1.0, 0.8, 0.5), speedShift * 0.25);

  float deepScroll = smoothstep(0.5, 0.9, uScroll);
  vec3 deepWarm = vec3(0.8, 0.5, 0.3);
  vColor = mix(vColor, deepWarm, deepScroll * nearShift * 0.25);

  float dopplerShift = sin(diskAngle + uTime * 0.3) * 0.5 + 0.5;
  vec3 accretionCool = vec3(1.0, 0.85, 0.65);
  vec3 accretionRed = vec3(1.5, 0.65, 0.25);
  vec3 accretionColor = mix(accretionCool, accretionRed, dopplerShift);
  vColor = mix(vColor, accretionColor, diskGlow * 0.75);

  float diskWarmth = diskGlow * smoothstep(6.0, 3.0, dist);
  vec3 diskHot = vec3(1.0, 0.85, 0.6);
  vColor = mix(vColor, diskHot, diskWarmth * 0.35);

  float twinkle = sin(uTime * (1.0 + aRandom.x * 2.0) + aRandom.y * 6.28) * 0.06 + 0.94;
  vBrightness *= twinkle;

  vec2 screenPos = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
  vec2 mouseNdc = vec2(uMouse.x, uMouse.y);
  float cursorDist = length(screenPos - mouseNdc);
  vCursorProximity = smoothstep(0.22, 0.0, cursorDist);

  vec3 tint1 = vec3(1.0, 0.95, 0.88);
  vec3 tint2 = vec3(1.0, 0.92, 0.78);
  vec3 tint3 = vec3(1.0, 0.78, 0.55);
  vec3 tint4 = vec3(0.9, 0.7, 0.5);
  vec3 tint5 = vec3(0.32, 0.25, 0.18);
  vec3 ab = mix(tint1, tint2, smoothstep(0.15, 0.35, uScroll));
  vec3 cd = mix(tint3, tint4, smoothstep(0.55, 0.75, uScroll));
  vScrollTint = mix(ab, mix(cd, tint5, smoothstep(0.75, 0.95, uScroll)), smoothstep(0.35, 0.55, uScroll));
}
