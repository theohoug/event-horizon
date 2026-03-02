/**
 * @file math.glsl
 * @description Mathematical utilities for black hole physics
 * @author Cleanlystudio
 */

#define PI 3.14159265359
#define TAU 6.28318530718
#define HALF_PI 1.57079632679

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

mat3 rotateX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1, 0, 0, 0, c, -s, 0, s, c);
}

mat3 rotateY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
}

mat3 rotateZ(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, -s, 0, s, c, 0, 0, 0, 1);
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
  t = clamp(t, 1000.0, 40000.0);
  t /= 100.0;
  vec3 color;
  if (t <= 66.0) {
    color.r = 1.0;
    color.g = clamp(0.39008157876 * log(t) - 0.63184144378, 0.0, 1.0);
  } else {
    color.r = clamp(1.29293618606 * pow(t - 60.0, -0.1332047592), 0.0, 1.0);
    color.g = clamp(1.12989086089 * pow(t - 60.0, -0.0755148492), 0.0, 1.0);
  }
  if (t >= 66.0) {
    color.b = 1.0;
  } else if (t <= 19.0) {
    color.b = 0.0;
  } else {
    color.b = clamp(0.54320678911 * log(t - 10.0) - 1.19625408914, 0.0, 1.0);
  }
  return color;
}

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}
