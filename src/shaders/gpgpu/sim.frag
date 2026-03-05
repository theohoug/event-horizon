/**
 * @file sim.frag
 * @description GPGPU particle simulation — gravitational N-body with accretion dynamics
 * @author Cleanlystudio
 * @version 1.0.0
 */

precision highp float;

uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform float uTime;
uniform float uDeltaTime;
uniform float uScroll;
uniform vec2 uMouse;
uniform int uPass;

varying vec2 vUv;

#include ../common/noise.glsl

void main() {
  vec4 posData = texture2D(tPosition, vUv);
  vec4 velData = texture2D(tVelocity, vUv);

  vec3 pos = posData.xyz;
  float life = posData.w;
  vec3 vel = velData.xyz;
  float mass = velData.w;

  float dt = min(uDeltaTime, 0.05);
  float dist = length(pos);

  bool shouldRespawn = dist < 0.6 || dist > 58.0 || life <= 0.0;

  if (uPass == 0) {

    if (shouldRespawn) {
      float seed = vUv.x * 127.1 + vUv.y * 311.7 + floor(uTime * 7.0) * 0.001;
      float h1 = hash(seed);
      float h3 = hash(seed + 97.0);
      float theta = h1 * 6.28318;
      float r = 10.0 + h3 * 40.0;
      float orbSpeed = 0.7 / sqrt(r);
      vel = vec3(-sin(theta) * orbSpeed, 0.0, cos(theta) * orbSpeed);
      vel += vec3(hash(seed + 13.0) - 0.5, hash(seed + 29.0) - 0.5, hash(seed + 41.0) - 0.5) * 0.08;
      gl_FragColor = vec4(vel, mass);
      return;
    }

    vec3 toCenter = -pos;
    vec3 gravDir = dist > 0.01 ? toCenter / dist : vec3(0.0, -1.0, 0.0);

    float gravBase = 0.6 + uScroll * 14.0;
    float gravity = gravBase / max(dist * dist, 0.15);
    float eventHorizonPull = smoothstep(3.0, 0.8, dist) * 25.0 * uScroll;
    gravity += eventHorizonPull;
    gravity = min(gravity, 30.0);

    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 tangent = length(cross(gravDir, up)) > 0.01 ? normalize(cross(gravDir, up)) : vec3(1.0, 0.0, 0.0);
    float orbitalForce = sqrt(max(gravity * dist, 0.0)) * 0.35;
    orbitalForce *= smoothstep(1.2, 6.0, dist);

    if (orbitalForce > 0.001) {
      float secondarySpiral = sin(atan(pos.z, pos.x) * 3.0 + uTime * 0.4) * 0.15;
      orbitalForce *= 1.0 + secondarySpiral;
    }

    float yDamping = 0.6 + uScroll * 3.0;
    float diskForce = -pos.y * yDamping;
    float diskThickness = smoothstep(8.0, 3.0, dist) * 0.8;
    diskForce *= 1.0 + diskThickness;

    float turbStrength = 0.5 * smoothstep(1.5, 12.0, dist) * (1.0 - uScroll * 0.4);
    float seed = pos.x * 127.1 + pos.y * 311.7 + pos.z * 74.7;
    vec3 curl = vec3(
      hash(seed + uTime * 3.7) - 0.5,
      hash(seed + 17.0 + uTime * 2.9) - 0.5,
      hash(seed + 31.0 + uTime * 3.3) - 0.5
    ) * 1.2;

    vec3 microTurb = vec3(0.0);
    if (dist > 2.0) {
      microTurb = vec3(
        hash(seed * 1.3 + uTime * 0.15) - 0.5,
        hash(seed * 1.3 + 17.0 + uTime * 0.12) - 0.5,
        hash(seed * 1.3 + 31.0 + uTime * 0.13) - 0.5
      ) * 0.12 * smoothstep(2.0, 6.0, dist);
    }

    vec2 mouseWorld = (uMouse - 0.5) * vec2(55.0, 28.0);
    vec3 mousePos3D = vec3(mouseWorld.x, 0.0, mouseWorld.y);
    vec3 toMouse = mousePos3D - pos;
    float mouseDist = length(toMouse);
    float mouseForce = exp(-mouseDist * mouseDist * 0.005) * 5.0 * (1.0 - uScroll * 0.8);
    vec3 mouseEffect = mouseDist > 0.01 ? -normalize(toMouse) * mouseForce : vec3(0.0);

    vec3 mouseVortex = vec3(0.0);
    if (mouseDist < 12.0 && mouseDist > 0.1) {
      vec3 mouseUp = vec3(0.0, 1.0, 0.0);
      vec3 mouseTangent = normalize(cross(normalize(toMouse), mouseUp));
      mouseVortex = mouseTangent * exp(-mouseDist * 0.15) * 2.0 * (1.0 - uScroll * 0.6);
    }

    vel += gravDir * gravity * dt;
    vel.y += diskForce * dt;
    vel += tangent * orbitalForce * dt;
    vel += curl * turbStrength * dt;
    vel += microTurb * dt;
    vel += mouseEffect * dt;
    vel += mouseVortex * dt;

    float jetPhase = smoothstep(0.4, 0.7, uScroll);
    if (dist < 2.5 && jetPhase > 0.01) {
      float jetChance = smoothstep(2.5, 0.8, dist);
      float jetSeed = hash(vUv.x * 127.1 + vUv.y * 311.7 + floor(uTime * 3.0));
      if (jetSeed > 0.92) {
        float jetDir = jetSeed > 0.96 ? 1.0 : -1.0;
        vel.y += jetDir * jetChance * jetPhase * 8.0;
        vel.xz *= 0.3;
      }
    }

    float drag = 0.997 - smoothstep(3.0, 0.8, dist) * 0.015;
    vel *= drag;

    float speed = length(vel);
    float maxSpeed = 6.0 + uScroll * 4.0;
    if (speed > maxSpeed) vel = vel / speed * maxSpeed;

    gl_FragColor = vec4(vel, mass);

  } else {

    if (shouldRespawn) {
      float seed = vUv.x * 127.1 + vUv.y * 311.7 + floor(uTime * 7.0) * 0.001;
      float h1 = hash(seed);
      float h2 = hash(seed + 42.0);
      float h3 = hash(seed + 97.0);

      float theta = h1 * 6.28318;
      float phi = acos(2.0 * h2 - 1.0);
      float r = 10.0 + h3 * 40.0;

      pos.x = r * sin(phi) * cos(theta);
      pos.y = (h3 - 0.5) * r * 0.12;
      pos.z = r * sin(phi) * sin(theta);
      life = 0.6 + h1 * 0.4;
      gl_FragColor = vec4(pos, life);
      return;
    }

    pos += vel * dt;
    life -= dt * 0.002;

    gl_FragColor = vec4(pos, life);
  }
}
