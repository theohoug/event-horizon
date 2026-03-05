/**
 * @file particles.frag
 * @description Particle fragment shader with soft glow, gravitational trails,
 *              absorption near black hole, and Void Sublime color palette
 * @author Cleanlystudio
 * @version 2.0.0
 */

precision highp float;

varying float vBrightness;
varying float vDistToCenter;
varying vec3 vColor;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float core = exp(-dist * dist * 50.0);
  float glow = exp(-dist * dist * 10.0);
  float outerGlow = exp(-dist * dist * 3.0);

  float alpha = (core * 0.55 + glow * 0.18 + outerGlow * 0.04) * vBrightness;

  float absorption = smoothstep(4.0, 1.0, vDistToCenter);
  alpha *= 1.0 - absorption * 0.98;

  float spaghetti = smoothstep(3.0, 0.8, vDistToCenter);
  vec2 stretch = center;
  stretch.x *= 1.0 + spaghetti * 4.0;
  stretch.y *= 1.0 - spaghetti * 0.3;
  float stretchedDist = length(stretch);
  float stretchedCore = exp(-stretchedDist * stretchedDist * 8.0);
  float trail = exp(-stretchedDist * stretchedDist * 3.0);
  core = mix(core, stretchedCore, spaghetti * 0.7);
  alpha += trail * spaghetti * vBrightness * 0.04;

  vec3 color = vColor * (core * 0.5 + glow * 0.16 + outerGlow * 0.05);

  vec3 cyanShift = vec3(0.0, 0.96, 0.83) * absorption * 0.1;
  vec3 violetShift = vec3(0.3, 0.05, 0.5) * spaghetti * 0.06;
  color += cyanShift + violetShift;

  float _c2 = core * core; float hotCenter = _c2 * _c2 * core * 0.12;
  color += vec3(0.7, 0.85, 1.0) * hotCenter;

  float blueshift = smoothstep(5.0, 2.0, vDistToCenter);
  color = mix(color, color * vec3(0.7, 0.8, 1.3), blueshift * 0.4);

  float ignition = smoothstep(6.0, 3.0, vDistToCenter) * (1.0 - absorption);
  color += vec3(0.4, 0.15, 0.8) * ignition * core * 0.15;
  color += vec3(0.1, 0.3, 0.5) * ignition * glow * 0.06;

  if (alpha < 0.001) discard;

  gl_FragColor = vec4(color, alpha);
}
