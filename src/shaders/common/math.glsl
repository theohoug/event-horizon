/**
 * @file math.glsl
 * @description Mathematical utilities for black hole physics
 * @author Cleanlystudio
 */

#define PI 3.14159265359
#define TAU 6.28318530718
#define HALF_PI 1.57079632679

mat3 rotateX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1, 0, 0, 0, c, -s, 0, s, c);
}

float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  float range = inMax - inMin;
  float t = range > 0.0001 ? clamp((value - inMin) / range, 0.0, 1.0) : 0.0;
  return outMin + (outMax - outMin) * t;
}

float smootherstep(float edge0, float edge1, float x) {
  float range = edge1 - edge0;
  x = range > 0.0001 ? clamp((x - edge0) / range, 0.0, 1.0) : 0.0;
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

vec3 temperatureToColor(float t) {
  float tOrig = clamp(t, 1000.0, 100000.0);
  float tc = tOrig / 100.0;
  vec3 color;

  float warmR = 1.0;
  float warmG = clamp(0.39008157876 * log(tc) - 0.63184144378, 0.0, 1.0);
  float x = max(tc - 60.0, 1.0);
  float hotR = clamp(1.29293618606 * pow(x, -0.1332047592), 0.0, 1.0);
  float hotG = clamp(1.12989086089 * pow(x, -0.0755148492), 0.0, 1.0);
  float blend = smoothstep(60.0, 72.0, tc);
  color.r = mix(warmR, hotR, blend);
  color.g = mix(warmG, hotG, blend);

  float hotB = 1.0;
  float warmB = clamp(0.54320678911 * log(max(tc - 10.0, 1.0)) - 1.19625408914, 0.0, 1.0);
  float coldFade = smoothstep(15.0, 23.0, tc);
  warmB *= coldFade;
  color.b = mix(warmB, hotB, blend);

  if (tOrig > 40000.0) {
    float excess = (tOrig - 40000.0) / 60000.0;
    color.r = mix(color.r, 0.63, excess * 0.6);
    color.g = mix(color.g, 0.72, excess * 0.3);
  }
  return color;
}

