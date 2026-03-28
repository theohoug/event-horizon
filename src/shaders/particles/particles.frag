/**
 * @file particles.frag
 * @description Clean star rendering with sharp core, subtle glow, and diffraction
 * @author Cleanlystudio
 * @version 4.0.0
 */

precision highp float;

varying float vBrightness;
varying float vDistToCenter;
varying vec3 vColor;
varying float vFlybySpeed;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float core = exp(-dist * dist * 90.0);
  float glow = exp(-dist * dist * 16.0);
  float outerGlow = exp(-dist * dist * 5.0) * 0.35;

  float crossX = exp(-center.y * center.y * 800.0) * exp(-center.x * center.x * 8.0);
  float crossY = exp(-center.x * center.x * 800.0) * exp(-center.y * center.y * 8.0);
  float diffraction = (crossX + crossY) * 0.07 * smoothstep(0.4, 1.0, vBrightness);

  float flyBlend = min(vFlybySpeed * 2.0, 0.7);
  if (flyBlend > 0.01) {
    vec2 flyCenter = center;
    flyCenter.y *= 1.0 + vFlybySpeed * 5.0;
    float flyDist = length(flyCenter);
    float flyCore = exp(-flyDist * flyDist * 30.0);
    float flyGlow = exp(-flyDist * flyDist * 5.0);
    float flyTrail = exp(-flyCenter.x * flyCenter.x * 200.0) * exp(-max(flyCenter.y, 0.0) * 4.0) * flyBlend * 0.3;
    core = mix(core, flyCore, flyBlend);
    glow = mix(glow, flyGlow, flyBlend * 0.6);
    glow += flyTrail;
  }

  float alpha = (core * 0.7 + glow * 0.15 + outerGlow * 0.03 + diffraction) * vBrightness;

  float absorption = smoothstep(4.0, 1.0, vDistToCenter);
  alpha *= 1.0 - absorption * 0.98;

  float spaghetti = smoothstep(3.0, 0.8, vDistToCenter);
  if (spaghetti > 0.01) {
    vec2 stretch = center;
    stretch.x *= 1.0 + spaghetti * 3.0;
    float stretchedDist = length(stretch);
    float stretchedCore = exp(-stretchedDist * stretchedDist * 12.0);
    core = mix(core, stretchedCore, spaghetti * 0.6);
  }

  vec3 color = vColor * (core * 0.6 + glow * 0.15 + outerGlow * 0.04 + diffraction * 0.5);

  float _c2 = core * core;
  float hotCenter = _c2 * _c2 * 0.15;
  color += vec3(0.8, 0.9, 1.0) * hotCenter;

  float blueshift = smoothstep(5.0, 2.0, vDistToCenter);
  color = mix(color, color * vec3(0.75, 0.82, 1.2), blueshift * 0.3);

  color = mix(color, color * vec3(0.7, 0.85, 1.15), flyBlend * 0.35);

  if (alpha < 0.001) discard;

  gl_FragColor = vec4(color, alpha);
}
