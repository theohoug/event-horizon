/**
 * @file bloom.frag
 * @description Dual-pass Kawase bloom with threshold extraction
 * @author Cleanlystudio
 */

precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uThreshold;
uniform float uIntensity;
uniform int uPass;
uniform vec2 uDirection;
uniform float uPassIndex;

varying vec2 vUv;

vec3 threshold(vec3 color, float t) {
  float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return color * smoothstep(t, t + 0.5, brightness);
}

void main() {
  vec2 texel = 1.0 / uResolution;

  if (uPass == 0) {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    gl_FragColor = vec4(threshold(color, uThreshold), 1.0);
    return;
  }

  vec3 color = vec3(0.0);
  float total = 0.0;

  float weights[7];
  weights[0] = 0.1964825502;
  weights[1] = 0.2969069646;
  weights[2] = 0.2969069646;
  weights[3] = 0.0944703978;
  weights[4] = 0.0944703978;
  weights[5] = 0.0103813596;
  weights[6] = 0.0103813596;

  float spread = 1.0 + uPassIndex * 0.8;

  color += texture2D(tDiffuse, vUv).rgb * weights[0];
  total += weights[0];

  for (int i = 1; i <= 3; i++) {
    float w1 = i == 1 ? weights[1] : i == 2 ? weights[3] : weights[5];
    float w2 = i == 1 ? weights[2] : i == 2 ? weights[4] : weights[6];
    vec2 offset = uDirection * texel * float(i) * 2.0 * spread;
    color += texture2D(tDiffuse, vUv + offset).rgb * w1;
    color += texture2D(tDiffuse, vUv - offset).rgb * w2;
    total += w1 + w2;
  }

  gl_FragColor = vec4(color / total * uIntensity, 1.0);
}
