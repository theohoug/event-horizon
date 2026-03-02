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

  float weights[5];
  weights[0] = 0.227027;
  weights[1] = 0.1945946;
  weights[2] = 0.1216216;
  weights[3] = 0.054054;
  weights[4] = 0.016216;

  color += texture2D(tDiffuse, vUv).rgb * weights[0];
  total += weights[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = uDirection * texel * float(i) * 2.0;
    color += texture2D(tDiffuse, vUv + offset).rgb * weights[i];
    color += texture2D(tDiffuse, vUv - offset).rgb * weights[i];
    total += weights[i] * 2.0;
  }

  gl_FragColor = vec4(color / total * uIntensity, 1.0);
}
