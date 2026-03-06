/**
 * @file particles.frag
 * @description Particle fragment shader with flyby speed-lines, soft glow,
 *              gravitational trails, and absorption near black hole
 * @author Cleanlystudio
 * @version 3.0.0
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

  float flyStretch = vFlybySpeed * 4.0;
  vec2 flyCenter = center;
  flyCenter.y *= 1.0 + flyStretch;
  float flyDist = length(flyCenter);

  float core = exp(-dist * dist * 50.0);
  float glow = exp(-dist * dist * 10.0);
  float outerGlow = exp(-dist * dist * 3.0);

  float flyBlend = min(vFlybySpeed * 1.8, 0.85);
  if (flyBlend > 0.01) {
    float flyCore = exp(-flyDist * flyDist * max(12.0, 50.0 - flyStretch * 8.0));
    float flyGlow = exp(-flyDist * flyDist * max(3.0, 10.0 - flyStretch * 2.0));
    core = mix(core, flyCore, flyBlend);
    glow = mix(glow, flyGlow, flyBlend * 0.6);
  }

  float alpha = (core * 0.55 + glow * 0.18 + outerGlow * 0.04) * vBrightness;

  if (flyBlend > 0.01) {
    float flyTrail = exp(-flyDist * flyDist * max(1.5, 5.0 - flyStretch * 1.5)) * flyBlend * 0.08;
    alpha += flyTrail * vBrightness;
  }

  float absorption = smoothstep(4.0, 1.0, vDistToCenter);
  alpha *= 1.0 - absorption * 0.98;

  float spaghetti = smoothstep(3.0, 0.8, vDistToCenter);
  if (spaghetti > 0.01) {
    vec2 stretch = center;
    stretch.x *= 1.0 + spaghetti * 4.0;
    stretch.y *= 1.0 - spaghetti * 0.3;
    float stretchedDist = length(stretch);
    float stretchedCore = exp(-stretchedDist * stretchedDist * 8.0);
    float trail = exp(-stretchedDist * stretchedDist * 3.0);
    core = mix(core, stretchedCore, spaghetti * 0.7);
    alpha += trail * spaghetti * vBrightness * 0.04;
  }

  vec3 color = vColor * (core * 0.5 + glow * 0.16 + outerGlow * 0.05);

  vec3 cyanShift = vec3(0.0, 0.91, 0.784) * absorption * 0.1;
  vec3 violetShift = vec3(0.3, 0.05, 0.5) * spaghetti * 0.06;
  color += cyanShift + violetShift;

  float _c2 = core * core; float hotCenter = _c2 * _c2 * core * 0.12;
  color += vec3(0.7, 0.85, 1.0) * hotCenter;

  float blueshift = smoothstep(5.0, 2.0, vDistToCenter);
  color = mix(color, color * vec3(0.7, 0.8, 1.3), blueshift * 0.4);

  float ignition = smoothstep(6.0, 3.0, vDistToCenter) * (1.0 - absorption);
  color += vec3(0.4, 0.15, 0.8) * ignition * core * 0.15;
  color += vec3(0.1, 0.3, 0.5) * ignition * glow * 0.06;

  vec3 speedTint = vec3(0.6, 0.75, 1.0);
  color = mix(color, color * speedTint, flyBlend * 0.3);

  if (alpha < 0.001) discard;

  gl_FragColor = vec4(color, alpha);
}
