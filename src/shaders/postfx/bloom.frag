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

  float spread = 1.0 + uPassIndex * 0.8;

  float w0 = 0.1964825502;
  float w12 = 0.3913773624;
  float w3 = 0.0103813596;

  float off1 = 1.2414 * 2.0 * spread;
  float off2 = 3.0 * 2.0 * spread;

  vec2 d1 = uDirection * texel * off1;
  vec2 d2 = uDirection * texel * off2;

  vec3 color = texture2D(tDiffuse, vUv).rgb * w0
             + texture2D(tDiffuse, vUv + d1).rgb * w12
             + texture2D(tDiffuse, vUv - d1).rgb * w12
             + texture2D(tDiffuse, vUv + d2).rgb * w3
             + texture2D(tDiffuse, vUv - d2).rgb * w3;

  float total = w0 + w12 * 2.0 + w3 * 2.0;

  gl_FragColor = vec4(color / total * uIntensity, 1.0);
}
