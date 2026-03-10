/**
 * @file render.frag
 * @description GPGPU particle render — velocity trails, absorption, spaghettification
 * @author Cleanlystudio
 * @version 1.0.0
 */

precision highp float;

varying float vBrightness;
varying float vDistToCenter;
varying vec3 vColor;
varying float vSpeed;
varying float vLife;
varying float vScroll;
varying float vCursorProximity;
varying float vDiskGlow;
varying vec3 vScrollTint;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float core = exp(-dist * dist * 100.0);
  float glow = exp(-dist * dist * 22.0);
  float outerGlow = exp(-dist * dist * 6.0);

  float alpha = (core * 0.6 + glow * 0.22 + outerGlow * 0.06) * vBrightness;

  float absorption = smoothstep(4.0, 0.8, vDistToCenter);
  alpha *= 1.0 - absorption * 0.96;

  float deepStreakBoost = smoothstep(0.65, 0.90, vScroll) * 4.0;
  float speedStretch = min(vSpeed * 0.6 + deepStreakBoost, 5.0);
  if (speedStretch > 0.08) {
    vec2 stretched = center;
    stretched.x *= 1.0 + speedStretch * 1.5;
    stretched.y *= max(0.25, 1.0 - speedStretch * 0.2);
    float stretchedDist = length(stretched);
    float trail = exp(-stretchedDist * stretchedDist * 4.0);
    float trailFade = exp(-stretchedDist * stretchedDist * 1.5);
    float streakAlpha = deepStreakBoost > 0.1 ? 0.12 : 0.08;
    alpha += (trail * streakAlpha + trailFade * 0.03) * vBrightness;
  }

  float spaghetti = smoothstep(3.5, 0.6, vDistToCenter);
  if (spaghetti > 0.01) {
    vec2 spaghettiStretch = center;
    spaghettiStretch.x *= 1.0 + spaghetti * 5.0;
    spaghettiStretch.y *= max(0.3, 1.0 - spaghetti * 0.4);
    float sDist = length(spaghettiStretch);
    float sCore = exp(-sDist * sDist * 6.0);
    float sTrail = exp(-sDist * sDist * 2.0);
    core = mix(core, sCore, spaghetti * 0.8);
    alpha += sTrail * spaghetti * vBrightness * 0.05;
  }

  vec3 color = vColor * (core * 0.55 + glow * 0.2 + outerGlow * 0.075);

  float _rc2 = core * core; color += vec3(0.85, 0.92, 1.0) * _rc2 * _rc2 * core * 0.15;

  vec3 cyanShift = vec3(0.0, 0.96, 0.83) * absorption * 0.12;
  vec3 violetShift = vec3(0.35, 0.08, 0.55) * spaghetti * 0.08;
  color += cyanShift + violetShift;

  float blueshift = smoothstep(5.0, 1.5, vDistToCenter);
  color = mix(color, color * vec3(0.65, 0.75, 1.35), blueshift * 0.45);

  float ignition = smoothstep(6.0, 2.5, vDistToCenter) * (1.0 - absorption);
  color += vec3(0.4, 0.15, 0.8) * ignition * core * 0.18;
  color += vec3(0.08, 0.25, 0.5) * ignition * glow * 0.07;

  color *= vScrollTint;

  float deepDesaturate = smoothstep(0.82, 0.95, vScroll);
  if (deepDesaturate > 0.01) {
    float cLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(cLuma * 0.85, cLuma * 0.88, cLuma * 1.05), deepDesaturate * 0.45);
  }

  if (vDiskGlow > 0.05) {
    float diskAlphaBoost = vDiskGlow * outerGlow * 0.35;
    alpha += diskAlphaBoost;
    color += vColor * vDiskGlow * 0.15;
    vec3 diskHotCore = vec3(1.0, 0.88, 0.65) * core * vDiskGlow * 0.08;
    color += diskHotCore;
  }

  float lifeFade = smoothstep(0.0, 0.1, vLife);
  alpha *= lifeFade;

  if (vCursorProximity > 0.01) {
    float cursorGlow = vCursorProximity * vCursorProximity;
    alpha += cursorGlow * 0.5 * vBrightness;
    color += vec3(0.0, 0.7, 0.55) * cursorGlow * 0.2;
    color *= 1.0 + cursorGlow * 0.6;
  }

  if (alpha < 0.0008) discard;

  gl_FragColor = vec4(color, alpha);
}
