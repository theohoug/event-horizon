/**
 * @file blackhole.frag
 * @description Raymarched black hole with accretion disk, photon sphere,
 *              gravitational lensing, Einstein ring, and procedural starfield.
 *              Physically inspired by Schwarzschild-Kerr geometry.
 * @author Cleanlystudio
 * @version 2.0.0
 */

precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uScroll;
uniform float uDistortion;
uniform float uDiskSpeed;
uniform float uIntensity;
uniform float uExplosion;
uniform vec3 uAlteredTint;
uniform float uPulsation;
uniform float uMaxSteps;

varying vec2 vUv;

#include ../common/noise.glsl
#include ../common/math.glsl

float g2(float x) { return exp(-x * x); }

#ifndef MAX_STEPS
  #define MAX_STEPS 160
#endif
#define SCHWARZSCHILD_RADIUS 1.0
#define ISCO 3.0
#define PHOTON_SPHERE 1.5
#define DISK_INNER 3.0
#define DISK_OUTER 16.0
#define DISK_HEIGHT 0.2

/* ─── Procedural Starfield — Photorealistic ─── */

vec3 starfield(vec3 rd) {
  vec3 col = vec3(0.0);

  float _ss = max(uScroll - 0.6, 0.0);
  float _deep = max(uScroll - 0.75, 0.0);
  float _warpStr = smoothstep(0.08, 0.25, uScroll) * (1.0 - smoothstep(0.38, 0.58, uScroll));
  float scrollStretch = uScroll * uScroll * 0.6 + _ss * _ss * 3.0 + _deep * _deep * 15.0 + _warpStr * 0.12;
  vec3 stretchDir = vec3(0.0, 0.0, -1.0);
  vec3 stretchedRd = normalize(rd + stretchDir * dot(rd, stretchDir) * scrollStretch);

#ifdef QUALITY_LOW
  {
    float scale = 60.0;
    vec3 p = stretchedRd * scale;
    vec3 id = floor(p);
    vec3 fd = fract(p);
    for (int ox = 0; ox <= 1; ox++) {
    for (int oy = 0; oy <= 1; oy++) {
    for (int oz = 0; oz <= 1; oz++) {
      vec3 offset = vec3(float(ox), float(oy), float(oz));
      vec3 nid = id + offset;
      vec3 h3 = hash33(nid);
      float dist = length(h3 + offset - fd);
      float h = hash(dot(nid, vec3(127.1, 311.7, 74.7)));
      if (h > 0.42) {
        float magnitude = (h - 0.42) / 0.58;
        float brightness = exp(-dist * dist * 350.0) * sqrt(magnitude);
        col += vec3(1.0, 0.93, 0.86) * brightness * 0.9;
      }
    }
    }
    }
  }
#elif defined(QUALITY_MEDIUM)
  for (int layer = 0; layer < 2; layer++) {
    float scale = 50.0 + float(layer) * 50.0;
    vec3 p = stretchedRd * scale;
    vec3 id = floor(p);
    vec3 fd = fract(p);
    float threshold = 0.38 - float(layer) * 0.04;

    for (int ox = 0; ox <= 1; ox++) {
    for (int oy = 0; oy <= 1; oy++) {
    for (int oz = 0; oz <= 1; oz++) {
      vec3 offset = vec3(float(ox), float(oy), float(oz));
      vec3 nid = id + offset;
      vec3 h3 = hash33(nid);
      float dist = length(h3 + offset - fd);
      float h = hash(dot(nid, vec3(127.1, 311.7, 74.7)));

      if (h > threshold) {
        float magnitude = (h - threshold) / (1.0 - threshold);
        float core = exp(-dist * dist * 350.0);
        float halo = exp(-dist * dist * 60.0) * 0.3;
        float softGlow = exp(-dist * dist * 14.0) * 0.04;
        float brightness = core + halo * magnitude + softGlow * magnitude;
        brightness *= sqrt(magnitude);
        float twinkle = sin(uTime * (0.5 + h * 1.2) + h * TAU) * 0.08 + 0.92;
        brightness *= twinkle;

        float colorSeed = hash(dot(nid, vec3(53.1, 97.3, 161.7)));
        vec3 starColor;
        if (colorSeed < 0.15) starColor = mix(vec3(1.0, 0.67, 0.37), vec3(1.0, 0.85, 0.72), colorSeed * 6.67);
        else if (colorSeed < 0.5) starColor = mix(vec3(1.0, 0.93, 0.86), vec3(1.0, 1.0, 1.0), (colorSeed - 0.15) * 2.86);
        else starColor = mix(vec3(1.0, 0.82, 0.65), vec3(1.0, 0.78, 0.58), (colorSeed - 0.5) * 2.0);

        float layerScale = 0.8 / float(layer + 1);
        col += starColor * brightness * layerScale * 1.1;
      }
    }
    }
    }
  }

  for (int i = 0; i < 2; i++) {
    float bScale = 18.0 + float(i) * 10.0;
    vec3 bp = stretchedRd * bScale;
    vec3 bId = floor(bp);
    vec3 bFd = fract(bp);
    float bH = hash(dot(bId, vec3(17.3, 259.1, 131.7)));

    if (bH > 0.98) {
      vec3 bCenter = hash33(bId);
      float bDist = length(bCenter - bFd);
      float core = exp(-bDist * bDist * 1800.0);
      float innerHalo = exp(-bDist * bDist * 250.0) * 0.45;
      float brightness = (core + innerHalo) * (sin(uTime * (1.2 + bH * 2.0) + bH * TAU) * 0.1 + 0.9);
      vec3 bColor = mix(vec3(1.0, 0.85, 0.72), vec3(1.0, 0.78, 0.58), hash(dot(bId, vec3(41.7, 199.3, 77.1))));

      vec2 starScreen = vec2(
        dot(bCenter - bFd, vec3(1.0, 0.0, 0.0)),
        dot(bCenter - bFd, vec3(0.0, 1.0, 0.0))
      );
      float streakFactor = 1.0 + scrollStretch * 3.0;
      float spike1 = exp(-abs(starScreen.x) * 100.0 / streakFactor) * exp(-starScreen.y * starScreen.y * 400.0);
      float spike2 = exp(-abs(starScreen.y) * 100.0) * exp(-starScreen.x * starScreen.x * 400.0 / streakFactor);
      float spikes = (spike1 + spike2) * 0.15;

      col += bColor * (brightness + spikes) * 1.1;
    }
  }
#else
  for (int layer = 0; layer < 3; layer++) {
    float scale = 50.0 + float(layer) * 45.0;
    vec3 p = stretchedRd * scale;
    vec3 id = floor(p);
    vec3 fd = fract(p);

    float threshold = 0.38 - float(layer) * 0.04;

    for (int ox = -1; ox <= 1; ox++) {
    for (int oy = -1; oy <= 1; oy++) {
    for (int oz = -1; oz <= 1; oz++) {
      vec3 offset = vec3(float(ox), float(oy), float(oz));
      vec3 nid = id + offset;
      vec3 h3 = hash33(nid);
      float dist = length(h3 + offset - fd);
      float h = hash(dot(nid, vec3(127.1, 311.7, 74.7)));

      if (h > threshold) {
        float magnitude = (h - threshold) / (1.0 - threshold);

        float core = exp(-dist * dist * 350.0);
        float halo = exp(-dist * dist * 60.0) * 0.3;
        float softGlow = exp(-dist * dist * 14.0) * 0.06;
        float brightness = core + halo * magnitude + softGlow * magnitude;
        brightness *= sqrt(magnitude);

        float twinkle = sin(uTime * (0.5 + h * 1.2) + h * TAU) * 0.08 + 0.92;
        float twinkle2 = sin(uTime * (1.8 + h * 3.0) + h * 17.0) * 0.04 + 0.96;
        brightness *= twinkle * twinkle2;

        float colorSeed = hash(dot(nid, vec3(53.1, 97.3, 161.7)));
        vec3 starColor;
        if (colorSeed < 0.08) starColor = mix(vec3(1.0, 0.67, 0.37), vec3(1.0, 0.72, 0.47), colorSeed * 12.5);
        else if (colorSeed < 0.22) starColor = mix(vec3(1.0, 0.76, 0.54), vec3(1.0, 0.85, 0.72), (colorSeed - 0.08) * 7.14);
        else if (colorSeed < 0.5) starColor = mix(vec3(1.0, 0.93, 0.86), vec3(1.0, 1.0, 1.0), (colorSeed - 0.22) * 3.57);
        else if (colorSeed < 0.78) starColor = mix(vec3(1.0, 0.92, 0.82), vec3(1.0, 0.88, 0.75), (colorSeed - 0.5) * 3.57);
        else starColor = mix(vec3(1.0, 0.82, 0.65), vec3(1.0, 0.78, 0.58), (colorSeed - 0.78) * 4.55);

        float layerScale = 0.7 / float(layer + 1);
        col += starColor * brightness * layerScale * 1.2;
      }
    }
    }
    }
  }

  for (int i = 0; i < 3; i++) {
    float bScale = 18.0 + float(i) * 8.0;
    vec3 bp = stretchedRd * bScale;
    vec3 bId = floor(bp);
    vec3 bFd = fract(bp);
    float bH = hash(dot(bId, vec3(17.3, 259.1, 131.7)));

    float bThreshold = i < 2 ? 0.98 : 0.988;
    if (bH > bThreshold) {
      vec3 bCenter = hash33(bId);
      float bDist = length(bCenter - bFd);

      float core = exp(-bDist * bDist * 1800.0);
      float innerHalo = exp(-bDist * bDist * 250.0) * 0.45;
      float outerGlow = exp(-bDist * bDist * 45.0) * 0.1;
      float brightness = core + innerHalo + outerGlow;

      float bTwinkle = sin(uTime * (1.2 + bH * 2.0) + bH * TAU) * 0.1 + 0.9;
      brightness *= bTwinkle;

      float bColorSeed = hash(dot(bId, vec3(41.7, 199.3, 77.1)));
      vec3 bColor = mix(vec3(1.0, 0.85, 0.72), vec3(1.0, 0.78, 0.58), bColorSeed);

      vec2 starScreen = vec2(
        dot(bCenter - bFd, vec3(1.0, 0.0, 0.0)),
        dot(bCenter - bFd, vec3(0.0, 1.0, 0.0))
      );

      float streakFactor = 1.0 + scrollStretch * 3.0;
      float spike1 = exp(-abs(starScreen.x) * 100.0 / streakFactor) * exp(-starScreen.y * starScreen.y * 400.0);
      float spike2 = exp(-abs(starScreen.y) * 100.0) * exp(-starScreen.x * starScreen.x * 400.0 / streakFactor);
      float _d1 = starScreen.x - starScreen.y; float _d2 = starScreen.x + starScreen.y;
      float diag1 = exp(-abs(_d2) * 150.0) * exp(-_d1 * _d1 * 600.0) * 0.5;
      float diag2 = exp(-abs(_d1) * 150.0) * exp(-_d2 * _d2 * 600.0) * 0.5;
      float spikes = (spike1 + spike2 + diag1 + diag2) * 0.22;

      col += bColor * (brightness + spikes) * 1.1;
    }
  }
#endif

  float nebulaBoost = 1.0 + smoothstep(0.3, 0.0, uScroll) * 1.5;

#ifdef QUALITY_LOW
  col += vec3(0.06, 0.04, 0.025) * 0.04 * nebulaBoost;
#elif defined(QUALITY_MEDIUM)
  float n1m = snoise(rd * 2.5 + vec3(uTime * 0.008));
  float _nb1m = n1m * 0.5 + 0.5; float _nb1m2 = _nb1m*_nb1m; float nebulaM = _nb1m2 * sqrt(_nb1m) * 0.14;
  float nebSeedM = dot(rd * 5.0, vec3(127.1, 311.7, 74.7)) + uTime * 0.004;
  float _nbM = hash(nebSeedM); float _nbM2 = _nbM*_nbM; float nebulaM2 = _nbM2 * _nbM2 * 0.07;
  col += vec3(0.12, 0.06, 0.05) * nebulaM * nebulaBoost;
  col += vec3(0.10, 0.06, 0.03) * nebulaM2 * nebulaBoost;

  float n4m = snoise(rd * 3.8 + vec3(uTime * 0.006, 0.0, 42.0));
  float _nb3m = n4m * 0.5 + 0.5; float nebula3m = _nb3m * _nb3m * _nb3m * 0.06;
  col += vec3(0.07, 0.04, 0.04) * nebula3m * nebulaBoost;
  float _nnm = n4m * 0.5 + 0.5; float nurseryM = _nnm * _nnm * _nnm * _nnm * 0.04;
  col += vec3(0.10, 0.06, 0.03) * nurseryM * nebulaBoost;

  float n3m = snoise(rd * 1.2 + vec3(0.0, uTime * 0.003, 31.0));
  float _dnm = n3m * 0.5 + 0.5; float deepNebulaM = _dnm * _dnm * _dnm * 0.07;
  col += vec3(0.05, 0.035, 0.025) * deepNebulaM * nebulaBoost;
#else
  float n1 = snoise(rd * 2.5 + vec3(uTime * 0.008));
  float _nb1 = n1 * 0.5 + 0.5; float _nb1_2 = _nb1*_nb1; float nebula = _nb1_2 * sqrt(_nb1) * 0.14;
  float nebSeed2 = dot(rd * 5.0, vec3(127.1, 311.7, 74.7)) + uTime * 0.004;
  float _nb2 = hash(nebSeed2); float _nb2_2 = _nb2*_nb2; float nebula2 = _nb2_2 * _nb2_2 * 0.07;

  col += vec3(0.12, 0.06, 0.05) * nebula * nebulaBoost;
  col += vec3(0.10, 0.06, 0.03) * nebula2 * nebulaBoost;

  float n4 = snoise(rd * 3.8 + vec3(uTime * 0.006, 0.0, 42.0));
  float _nb3 = n4 * 0.5 + 0.5; float nebula3 = _nb3 * _nb3 * _nb3 * 0.08;
  col += vec3(0.07, 0.04, 0.04) * nebula3 * nebulaBoost;

  float _nn = n4 * 0.5 + 0.5; float _nn2 = _nn*_nn; float nurseryNoise = _nn2 * _nn2 * 0.06;
  col += vec3(0.12, 0.07, 0.04) * nurseryNoise * nebulaBoost;

  float n3 = snoise(rd * 1.2 + vec3(0.0, uTime * 0.003, 31.0));
  float _dn = n3 * 0.5 + 0.5; float deepNebula = _dn * _dn * _dn * 0.08;
  col += vec3(0.05, 0.035, 0.025) * deepNebula * nebulaBoost;
#endif

#ifndef QUALITY_LOW
  float _cg = max(1.0 - abs(rd.y - 0.1) * 1.2, 0.0); float _cg2 = _cg*_cg; float cosmicGlow = _cg2 * sqrt(_cg) * 0.04;
  col += vec3(0.06, 0.04, 0.025) * cosmicGlow * nebulaBoost;

#ifdef QUALITY_MEDIUM
  float _anm = n3m * 0.5 + 0.5; float asymNebulaM = _anm * _anm * _anm * 0.04;
  col += vec3(0.07, 0.04, 0.03) * asymNebulaM * nebulaBoost * smoothstep(0.0, 0.3, rd.x + 0.2);
#else
  float _an = n3 * 0.5 + 0.5; float asymNebula = _an * _an * _an * 0.05;
  col += vec3(0.08, 0.05, 0.03) * asymNebula * nebulaBoost * smoothstep(0.0, 0.3, rd.x + 0.2);
#endif

  float _mw = max(1.0 - abs(rd.y) * 1.6, 0.0); float _mw2 = _mw*_mw; float milkyWay = _mw2 * _mw;
  float milkySeed = dot(rd, vec3(127.1, 311.7, 74.7));
  float milkyDetail = (hash(milkySeed * 8.0) - 0.5) * 0.5 + (hash(milkySeed * 16.0) - 0.5) * 0.25;
  float milkyBoost = 1.0 + smoothstep(0.2, 0.0, uScroll) * 0.8;
  col += vec3(0.045, 0.035, 0.025) * milkyWay * (0.5 + milkyDetail) * milkyBoost;
#endif

#if defined(QUALITY_LOW)
  // skip background dust stars in low quality
#elif defined(QUALITY_MEDIUM)
  {
    float bgScale = 160.0;
    vec3 bgP = rd * bgScale;
    vec3 bgId = floor(bgP);
    vec3 bgFd = fract(bgP);
    vec3 bgH3 = hash33(bgId);
    float bgDist = length(bgH3 - bgFd);
    float bgH = hash(dot(bgId, vec3(97.3, 41.7, 213.1)));
    if (bgH > 0.3) {
      float bgMag = (bgH - 0.3) / 0.7;
      float bgCore = exp(-bgDist * bgDist * 350.0);
      float bgBright = bgCore * bgMag * bgMag * 0.10;
      vec3 bgColor = mix(vec3(1.0, 0.88, 0.75), vec3(1.0, 0.95, 0.88), bgMag);
      col += bgColor * bgBright;
    }
  }

  float _dlm = max(1.0 - abs(rd.y + 0.05) * 3.0, 0.0); float _dlm2 = _dlm*_dlm; float dustLaneM = _dlm2 * _dlm2;
  float dustSeedM = dot(rd, vec3(127.1, 311.7, 74.7)) * 12.0 + 7.0;
  float dustNoiseM = hash(dustSeedM) * 0.7 + 0.15;
  col *= 1.0 - dustLaneM * dustNoiseM * 0.2;

  float clusterSeedM = dot(rd, vec3(97.3, 41.7, 213.1)) * 6.0 + 99.0;
  float _sc6m = hash(clusterSeedM); float _sc6m2 = _sc6m*_sc6m; float starClusterM = _sc6m2 * _sc6m2;
  float dustShimmerM = sin(uTime * 2.0 + dot(rd, vec3(47.0, 13.0, 91.0))) * 0.5 + 0.5;
  col += vec3(0.85, 0.7, 0.5) * starClusterM * dustShimmerM * 0.04;
#else
  for (int bgLayer = 0; bgLayer < 2; bgLayer++) {
    float bgScale = 160.0 + float(bgLayer) * 120.0;
    vec3 bgP = rd * bgScale;
    vec3 bgId = floor(bgP);
    vec3 bgFd = fract(bgP);
    vec3 bgH3 = hash33(bgId);
    float bgDist = length(bgH3 - bgFd);
    float bgH = hash(dot(bgId, vec3(97.3, 41.7, 213.1)));
    if (bgH > 0.25) {
      float bgMag = (bgH - 0.25) / 0.75;
      float bgCore = exp(-bgDist * bgDist * 350.0);
      float bgHalo = exp(-bgDist * bgDist * 80.0) * 0.15;
      float bgBright = (bgCore + bgHalo) * bgMag * bgMag * 0.12;
      vec3 bgColor = mix(vec3(1.0, 0.88, 0.75), vec3(1.0, 0.95, 0.88), bgMag);
      col += bgColor * bgBright / float(bgLayer + 1);
    }
  }

  float _dl = max(1.0 - abs(rd.y + 0.05) * 3.0, 0.0); float _dl2 = _dl*_dl; float dustLane = _dl2 * _dl2;
  float dustSeed = dot(rd, vec3(127.1, 311.7, 74.7)) * 12.0 + 7.0;
  float dustNoise = hash(dustSeed) * 0.7 + 0.15;
  col *= 1.0 - dustLane * dustNoise * 0.3;

  float clusterSeed = dot(rd, vec3(97.3, 41.7, 213.1)) * 6.0 + 99.0;
  float _sc6 = hash(clusterSeed); float _sc6_2 = _sc6*_sc6; float starCluster = _sc6_2 * _sc6_2;
  float dustShimmer = sin(uTime * 2.0 + dot(rd, vec3(47.0, 13.0, 91.0))) * 0.5 + 0.5;
  col += vec3(0.85, 0.7, 0.5) * starCluster * dustShimmer * 0.05;
#endif

  return col;
}

/* ─── Accretion Disk ─── */

vec4 accretionDisk(vec3 pos, vec3 rd) {
  float diskY = pos.y;
  if (abs(diskY) > DISK_HEIGHT * 5.0) return vec4(0.0);

  float r = length(pos.xz);
  if (r < DISK_INNER - 0.3 || r > DISK_OUTER + 0.5) return vec4(0.0);

  float angle = atan(pos.z, pos.x);
  float diskMask = smoothstep(DISK_INNER - 0.5, DISK_INNER + 2.0, r) *
                   smoothstep(DISK_OUTER + 1.0, DISK_OUTER - 3.0, r);
  float heightFade = exp(-diskY * diskY / (DISK_HEIGHT * DISK_HEIGHT));

  float orbitalSpeed = 1.0 / (r * sqrt(r));
  float rotAngle = angle + uTime * uDiskSpeed * orbitalSpeed;

  float turb1 = snoise(vec3(r * 2.0, rotAngle * 2.5, uTime * 0.25)) * 0.3;
#ifdef QUALITY_LOW
  float turbulence = turb1;
#elif defined(QUALITY_MEDIUM)
  float turb2m = snoise(vec3(r * 4.5, rotAngle * 4.0, uTime * 0.4 + 31.0)) * 0.10;
  float turbulence = turb1 + turb2m;
#else
  float turb2 = snoise(vec3(r * 4.5, rotAngle * 4.0, uTime * 0.4 + 31.0)) * 0.12;
  float turb3 = snoise(vec3(r * 10.0, rotAngle * 7.0, uTime * 0.7 + 67.0)) * 0.06;
  float turbulence = turb1 + turb2 + turb3;
#endif

  float spiralArm = sin(rotAngle * 2.5 + r * 1.4 + turbulence * 3.5) * 0.5 + 0.5;
  spiralArm = sqrt(spiralArm);
  float secondaryArm = sin(rotAngle * 5.0 + r * 2.8 - uTime * 0.3) * 0.5 + 0.5;
  spiralArm = mix(spiralArm, spiralArm * secondaryArm, 0.25);
#ifdef QUALITY_LOW
  // skip tertiary arm detail
#elif defined(QUALITY_MEDIUM)
  float tertiaryArmM = sin(rotAngle * 13.0 + r * 5.0 + uTime * 0.15) * 0.5 + 0.5;
  spiralArm = mix(spiralArm, spiralArm + tertiaryArmM * 0.10, 0.4);
#else
  float tertiaryArm = sin(rotAngle * 13.0 + r * 5.0 + uTime * 0.15) * 0.5 + 0.5;
  spiralArm = mix(spiralArm, spiralArm + tertiaryArm * 0.15, 0.5);
#endif

  float viewIncidence = abs(dot(normalize(rd), vec3(0.0, 1.0, 0.0)));
  float volumeOpacity = mix(3.0, 1.0, viewIncidence);

  float density = diskMask * heightFade * (0.5 + 0.5 * spiralArm) * volumeOpacity;
  density *= 1.0 + turbulence * 0.5;
  density = clamp(density, 0.0, 1.0);

  float outerFadeBell = g2((uScroll - 0.62) * 5.0);
  float outerTransparency = outerFadeBell * smoothstep(DISK_INNER + 2.0, DISK_OUTER - 1.0, r) * 0.2;
  density *= 1.0 - outerTransparency;

  float iscoGlow = g2((r - ISCO) * 2.0) * 0.8;
  density += iscoGlow * heightFade;

  float rNorm = clamp((r - DISK_INNER) / (DISK_OUTER - DISK_INNER), 0.0, 1.0);

  vec3 innerColor = vec3(1.0, 0.95, 0.85);
  vec3 midColor = vec3(1.0, 0.75, 0.35);
  vec3 outerColor = vec3(0.8, 0.35, 0.08);
  vec3 edgeColor = vec3(0.4, 0.12, 0.02);

  vec3 diskColor;
  if (rNorm < 0.15) {
    diskColor = mix(innerColor, midColor, rNorm / 0.15);
  } else if (rNorm < 0.5) {
    diskColor = mix(midColor, outerColor, (rNorm - 0.15) / 0.35);
  } else {
    diskColor = mix(outerColor, edgeColor, (rNorm - 0.5) / 0.5);
  }

  float innerBrightness = smoothstep(0.4, 0.0, rNorm) * 2.5 + 0.5;
  diskColor *= innerBrightness;

  diskColor *= 1.0 + turbulence * vec3(0.15, 0.05, -0.05);

#ifdef QUALITY_LOW
  float waveLow = sin(rotAngle * 8.0 + r * 5.0 - uTime * 2.0) * 0.5 + 0.5;
  float waveMaskLow = diskMask * smoothstep(DISK_INNER, DISK_INNER + 2.0, r) * smoothstep(DISK_OUTER, DISK_OUTER - 3.0, r);
  diskColor += vec3(1.0, 0.9, 0.65) * waveLow * waveMaskLow * 0.35;
#elif defined(QUALITY_MEDIUM)
  float waveM1 = sin(rotAngle * 8.0 + r * 5.0 - uTime * 2.0) * 0.5 + 0.5;
  float waveM2 = sin(rotAngle * 12.0 - r * 4.0 + uTime * 2.5 + 1.3) * 0.5 + 0.5;
  float waveM3 = sin(rotAngle * 18.0 + r * 8.0 + uTime * 1.2 + 2.7) * 0.5 + 0.5;
  float waveCrestM = pow(waveM1 * 0.6 + waveM2 * 0.3 + waveM3 * 0.1, 1.5);
  float waveMaskM = diskMask * smoothstep(DISK_INNER, DISK_INNER + 2.0, r) * smoothstep(DISK_OUTER, DISK_OUTER - 3.0, r);
  diskColor += vec3(1.0, 0.9, 0.65) * waveCrestM * waveMaskM * 0.45;

  float specM = pow(max(sin(rotAngle * 4.0 + r * 2.5 - uTime * 0.9), 0.0), 8.0);
  float specMaskM = smoothstep(DISK_INNER, DISK_INNER + 2.0, r) * smoothstep(DISK_OUTER, DISK_OUTER - 3.0, r);
  diskColor += vec3(1.0, 0.95, 0.9) * specM * 0.3 * specMaskM;
#else
  float wave1 = sin(rotAngle * 8.0 + r * 5.0 - uTime * 2.0) * 0.5 + 0.5;
  float wave2 = sin(rotAngle * 12.0 - r * 4.0 + uTime * 2.5 + 1.3) * 0.5 + 0.5;
  float wave3 = sin(rotAngle * 18.0 + r * 8.0 + uTime * 1.2 + 2.7) * 0.5 + 0.5;
  float waveCrest = pow(wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2, 1.5);
  float waveMask = diskMask * smoothstep(DISK_INNER, DISK_INNER + 2.0, r) * smoothstep(DISK_OUTER, DISK_OUTER - 3.0, r);
  diskColor += vec3(1.0, 0.9, 0.65) * waveCrest * waveMask * 0.5;

  float spec = pow(max(sin(rotAngle * 4.0 + r * 2.5 - uTime * 0.9), 0.0), 10.0);
  float spec2 = pow(max(sin(rotAngle * 6.0 - r * 1.8 + uTime * 0.7), 0.0), 14.0);
  float specMask = smoothstep(DISK_INNER, DISK_INNER + 2.0, r) * smoothstep(DISK_OUTER, DISK_OUTER - 3.0, r);
  diskColor += vec3(1.0, 0.95, 0.9) * (spec * 0.3 + spec2 * 0.2) * specMask;

  float caustic = pow(abs(sin(rotAngle * 22.0 + r * 12.0 + uTime * 3.0) * sin(rotAngle * 16.0 - r * 9.0 - uTime * 2.0)), 1.5);
  diskColor += vec3(1.0, 0.8, 0.5) * caustic * specMask * 0.18;

  float filament = pow(abs(sin(rotAngle * 30.0 + r * 15.0 + turbulence * 10.0)), 8.0);
  diskColor += vec3(1.0, 0.85, 0.55) * filament * specMask * 0.2;
#endif

  float _hs1 = max(sin(rotAngle * 2.0 + uTime * 0.15 + r * 0.5) * 0.5 + 0.5, 0.0);
  float hotSpot1 = _hs1 * _hs1 * _hs1 * _hs1 * _hs1 * _hs1;
  float _hs2 = max(sin(rotAngle * 5.0 - uTime * 0.2 + r * 1.2) * 0.5 + 0.5, 0.0);
  float hotSpot2 = _hs2 * _hs2 * _hs2 * _hs2;
  float hotSpotMask = smoothstep(DISK_INNER, DISK_INNER + 3.0, r) * smoothstep(DISK_OUTER, DISK_INNER + 5.0, r);
  diskColor += vec3(1.0, 0.8, 0.35) * hotSpot1 * hotSpotMask * 0.2;
  diskColor += vec3(1.0, 0.6, 0.15) * hotSpot2 * hotSpotMask * 0.12;

  float _er = max(sin(rotAngle * 1.0 + uTime * 0.08) * sin(uTime * 0.3 + r * 0.5), 0.0);
  float eruption = _er * _er * _er * _er; eruption *= eruption;
  float eruptionMask = smoothstep(DISK_INNER, DISK_INNER + 1.5, r) * smoothstep(DISK_INNER + 4.0, DISK_INNER + 2.0, r);
  diskColor += vec3(1.0, 0.85, 0.4) * eruption * eruptionMask * 0.3;

  float innerRim = exp(-(r - DISK_INNER) * (r - DISK_INNER) * 3.0) * heightFade;
  diskColor += vec3(1.0, 0.95, 0.8) * innerRim * 0.4;

  float beta = sqrt(SCHWARZSCHILD_RADIUS / (2.0 * r));
  float _gamma = 1.0 / sqrt(max(1.0 - beta * beta, 0.001));
  vec3 orbitalDir = normalize(vec3(-sin(angle), 0.0, cos(angle)));
  float cosTheta = dot(orbitalDir, normalize(rd));
  float D = 1.0 / (_gamma * (1.0 - beta * cosTheta));
  float beaming = D * D * D;
  beaming = mix(1.0, beaming, 0.5);
  diskColor *= beaming;

  float dopplerShift = clamp((D - 1.0) * 2.0, -1.0, 1.0);
  vec3 dopplerTint = dopplerShift > 0.0
    ? mix(vec3(1.0), vec3(1.1, 0.95, 0.8), dopplerShift)
    : mix(vec3(1.0), vec3(1.2, 0.75, 0.5), -dopplerShift);
  diskColor *= dopplerTint;

  float gravRedshiftDisk = sqrt(max(1.0 - SCHWARZSCHILD_RADIUS / r, 0.001));
  diskColor *= gravRedshiftDisk;

  float scrollDim = 1.0 - sqrt(uScroll) * 0.25;
  float closeUpDim = 1.0 - smoothstep(0.5, 0.85, uScroll) * 0.25;
  float earlyBoost = 1.0 + smoothstep(0.4, 0.0, uScroll) * 0.5;
  diskColor *= uIntensity * 0.9 * scrollDim * closeUpDim * earlyBoost;

  float deepShift = smoothstep(0.65, 0.90, uScroll);
  diskColor = mix(diskColor, diskColor * vec3(1.1, 0.9, 0.75), deepShift * 0.2);

  float diskLum = dot(diskColor, vec3(0.2126, 0.7152, 0.0722));
  float satBoost = mix(1.3, 1.1, uScroll);
  diskColor = mix(vec3(diskLum), diskColor, satBoost);
  diskColor = max(diskColor, vec3(0.0));

  diskColor += uAlteredTint * density * 0.3;

  if (uPulsation > 0.01 && uScroll > 0.7) {
    float fragStr = (uScroll - 0.7) / 0.3 * 0.3;
    float fragNoise = fract(sin(floor(rotAngle * 8.0 + r * 3.0 + uTime * 0.5) * 127.1) * 43758.5453);
    density *= 1.0 - fragStr * step(0.6, fragNoise);
  }

  return vec4(diskColor * density, density * scrollDim);
}

/* ─── Photon Ring ─── */

float photonRing(vec3 pos, float r) {
  float ring1 = g2((r - PHOTON_SPHERE) * 14.0);
  float ring2 = g2((r - PHOTON_SPHERE * 1.02) * 20.0) * 0.8;
  float ring3 = g2((r - PHOTON_SPHERE * 0.98) * 24.0) * 0.45;
  float ringWide = g2((r - PHOTON_SPHERE) * 4.0) * 0.3;

  float subRing1 = g2((r - PHOTON_SPHERE * 1.06) * 35.0) * 0.2;
  float subRing2 = g2((r - PHOTON_SPHERE * 0.94) * 40.0) * 0.15;

  float angle = atan(pos.z, pos.x);
  float shimmer = sin(angle * 30.0 + uTime * 4.0) * 0.12;
  float shimmer2 = sin(angle * 50.0 - uTime * 6.0) * 0.06;
  float shimmer3 = sin(angle * 80.0 + uTime * 8.0) * 0.03;
  float caustic = abs(sin(angle * 12.0 + r * 8.0 + uTime * 2.0)) * 0.08;

  float photonPhase = smoothstep(0.25, 0.40, uScroll) * (1.0 - smoothstep(0.50, 0.60, uScroll));
  float earlyBoost = 1.0 + smoothstep(0.15, 0.0, uScroll) * 0.4;
  float ringFade = 1.0 - smoothstep(0.40, 0.56, uScroll);
  float chapterBoost = 1.0 + photonPhase * 1.5;

  float heartbeatPhase = uScroll > 0.35 ? 1.0 : 0.0;
  float hbSpeed = 50.0 + max(uScroll - 0.35, 0.0) * 200.0;
  float _hbp = sin(uTime * hbSpeed / 60.0 * 3.14159) * 0.5 + 0.5; float _hbp2 = _hbp*_hbp; float _hbp4 = _hbp2*_hbp2; float heartbeatPulse = heartbeatPhase * (_hbp4 * _hbp4 * 0.25);
  float pulse = sin(uTime * 1.5) * 0.10 + 1.0 + heartbeatPulse;
  float breathe = sin(uTime * 0.4) * 0.12 + 1.0;

  float base = ring1 + ring2 + ring3 + ringWide + subRing1 + subRing2;
  return base * (1.0 + shimmer + shimmer2 + shimmer3 + caustic) * pulse * breathe * earlyBoost * ringFade * chapterBoost;
}

/* ─── Einstein Ring ─── */

vec3 einsteinRingColor(vec3 rd, vec3 camPos) {
  float viewAngle = acos(clamp(dot(normalize(-camPos), normalize(rd)), -1.0, 1.0));
  float einsteinAngle = sqrt(4.0 * SCHWARZSCHILD_RADIUS / length(camPos));

  float breathe = sin(uTime * 0.6) * 0.06 + 1.0;
  float breathe2 = sin(uTime * 1.1) * 0.03 + 1.0;

  float chromaticSpread = 0.005;
  float scrollReveal = smoothstep(0.05, 0.25, uScroll);
  float photonBoost = 1.0 + smoothstep(0.25, 0.38, uScroll) * (1.0 - smoothstep(0.48, 0.58, uScroll)) * 1.0;
  float eRingFade = 1.0 - smoothstep(0.50, 0.65, uScroll);
  float boost = scrollReveal * eRingFade * photonBoost * 0.4;
  float ringR = g2((viewAngle - einsteinAngle * (1.0 + chromaticSpread)) * 180.0) * 0.20 * breathe * boost;
  float ringG = g2((viewAngle - einsteinAngle) * 180.0) * 0.18 * breathe * boost;
  float ringB = g2((viewAngle - einsteinAngle * (1.0 - chromaticSpread)) * 180.0) * 0.16 * breathe * boost;

  float glow = g2((viewAngle - einsteinAngle) * 50.0) * 0.08 * breathe2 * boost;
  float shimmer = sin(viewAngle * 200.0 + uTime * 3.0) * 0.03 + 1.0;
  float shimmer2 = sin(viewAngle * 120.0 - uTime * 4.0) * 0.02 + 1.0;

  vec3 ring = vec3(ringR, ringG, ringB) * shimmer * shimmer2 + vec3(glow) * vec3(1.0, 0.8, 0.5);
  return ring;
}

float einsteinRing(vec3 rd, vec3 camPos) {
  vec3 ringCol = einsteinRingColor(rd, camPos);
  return (ringCol.r + ringCol.g + ringCol.b) / 3.0;
}

/* ─── Temperature to RGB (blackbody approximation) ─── */

vec3 tempToRGB(float temp) {
  float t = clamp(temp / 100.0, 10.0, 400.0);
  vec3 c;
  if (t <= 66.0) {
    c.r = 1.0;
    c.g = clamp(0.39 * log(t) - 0.63, 0.0, 1.0);
    c.b = t <= 19.0 ? 0.0 : clamp(0.543 * log(t - 10.0) - 1.196, 0.0, 1.0);
  } else {
    c.r = clamp(1.293 * pow(t - 60.0, -0.133), 0.0, 1.0);
    c.g = clamp(1.13 * pow(t - 60.0, -0.0755), 0.0, 1.0);
    c.b = 1.0;
  }
  return c;
}

/* ─── Cheap Value Noise 3D (8 hash lookups, ~4x faster than snoise) ─── */

float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = dot(i, vec3(1.0, 57.0, 113.0));
  return mix(
    mix(mix(hash(n), hash(n + 1.0), f.x),
        mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
    mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
        mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y),
    f.z
  );
}

/* ─── Gravitational Ray Tracing ─── */

void traceRay(vec3 ro, vec3 rd, out vec3 color, out float glow) {
  color = vec3(0.0);
  glow = 0.0;

  float ex = uExplosion;

  float bhLife = 1.0 - smoothstep(0.05, 0.40, ex);
  float dynSR = SCHWARZSCHILD_RADIUS * bhLife;
  float gravMult = bhLife;
  float instability = smoothstep(0.0, 0.10, ex) * (1.0 - smoothstep(0.30, 0.45, ex));

  float shellR = max(ex - 0.12, 0.0) * 22.0;
  float shellThick = 0.35 + shellR * 0.055;
  float shellActive = smoothstep(0.12, 0.18, ex);

  float gasActive = smoothstep(0.18, 0.30, ex) * (1.0 - smoothstep(0.85, 1.3, ex));
  float gasR = mix(0.5, max(shellR * 0.6, 2.0), smoothstep(0.20, 0.55, ex));

  float debrisActive = smoothstep(0.25, 0.35, ex) * (1.0 - smoothstep(0.80, 1.1, ex));
  float debrisR = DISK_INNER + max(ex - 0.25, 0.0) * 18.0;

  float nebActive = smoothstep(0.75, 1.1, ex);

  vec3 pos = ro;
  vec3 vel = normalize(rd);
  float dt = 0.08;
  float prevY = pos.y;

  float acc = 0.0;
  vec3 accCol = vec3(0.0);

  float dimBell = g2((uScroll - 0.62) * 5.0);
  float starBoostFactor = 1.0 + smoothstep(0.3, 0.0, uScroll) * 2.0;

  float effectiveSteps = uMaxSteps > 0.0 ? uMaxSteps : float(MAX_STEPS);
  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= effectiveSteps) break;
    float r = length(pos);

    // Early exit: if far away and moving outward, skip remaining steps
    if (i > 10 && r > 25.0) {
      float radialVel = dot(normalize(pos), vel);
      if (radialVel > 0.5) break;
    }

    float captureR = dynSR * 0.15;
    if (captureR > 0.005 && r < captureR) {
      vec3 velN = normalize(vel);
      vec3 stars = starfield(velN) * starBoostFactor;
      color = accCol * (1.0 - dimBell * 0.25) + stars * (1.0 - acc);
      return;
    }

    if (r > 60.0) {
      vec3 velN = normalize(vel);
      vec3 stars = starfield(velN) * starBoostFactor;
      if (bhLife > 0.1) {
        vec3 eRingPrismatic = einsteinRingColor(velN, ro);
        float eRingIntensity = (eRingPrismatic.r + eRingPrismatic.g + eRingPrismatic.b) / 3.0;
        vec3 eRingTint = mix(vec3(0.9, 0.6, 0.2), vec3(1.0, 0.8, 0.5), eRingIntensity * 2.0);
        stars += eRingTint * eRingPrismatic * 2.2 * (1.0 - dimBell * 0.3) * bhLife;
      }
      color = accCol * (1.0 - dimBell * 0.25) + stars * (1.0 - acc);
      return;
    }

    if (acc < 0.90 && ex > 0.10) {
      float maxExR = max(shellR + shellThick * 2.0, max(gasR, debrisR + 3.0));
      if (nebActive > 0.01) maxExR = max(maxExR, 12.0 + max(ex - 0.75, 0.0) * 20.0);
      if (r < maxExR + 1.5) {

        if (shellActive > 0.01 && shellR > 0.3) {
          float shellDist = r - shellR;
          if (abs(shellDist) < shellThick * 2.0) {
            float shellDensity = exp(-shellDist * shellDist / (shellThick * shellThick));
            float sn = snoise(pos * mix(1.8, 0.35, clamp(shellR / 18.0, 0.0, 1.0)) + vec3(0.0, 0.0, uTime * 0.3));
            shellDensity *= max(0.5 + sn * 0.5, 0.0);

            float shellTPos = clamp((r - shellR + shellThick) / (shellThick * 2.0), 0.0, 1.0);
            float temp = mix(28000.0, 3200.0, shellTPos);
            temp *= mix(1.0, 0.18, smoothstep(0.3, 1.0, ex));
            vec3 shellCol = tempToRGB(max(temp, 1000.0));

            float frontEdge = smoothstep(0.6, 1.0, shellTPos);
            shellCol = mix(shellCol, vec3(3.5, 4.0, 6.0), frontEdge * 0.5);

            float alpha = shellDensity * shellActive * 0.15;
            accCol += shellCol * alpha * (1.0 - acc) * 3.5;
            acc += alpha * (1.0 - acc);
          }
        }

        if (gasActive > 0.01 && r < gasR) {
          float gasDensity = smoothstep(gasR, gasR * 0.05, r);
          float gn = vnoise3(pos * 0.7 + vec3(uTime * 0.2, 0.0, 0.0));
          gasDensity *= gn;
          gasDensity *= gasDensity;
          float coreGlow = exp(-r * r * 0.5) * (1.0 - smoothstep(0.22, 0.50, ex));
          float gasTemp = mix(24000.0, 4500.0, r / max(gasR, 0.1));
          gasTemp *= mix(1.0, 0.22, smoothstep(0.4, 0.9, ex));
          vec3 gasCol = tempToRGB(max(gasTemp, 1000.0));
          gasCol *= 1.0 + coreGlow * 8.0;

          float alpha = gasDensity * gasActive * 0.06;
          accCol += gasCol * alpha * (1.0 - acc) * 3.0;
          acc += alpha * (1.0 - acc);
        }

        if (debrisActive > 0.01) {
          float dh = exp(-pos.y * pos.y / 0.20);
          float dr = exp(-(r - debrisR) * (r - debrisR) * 0.4);
          if (dh * dr > 0.01) {
            float angle = atan(pos.z, pos.x);
            float orbSpeed = 1.0 / max(sqrt(r), 0.5);
            float dNoise = sin(angle * 6.0 + r * 2.0 + uTime * orbSpeed * 3.0) * 0.5 + 0.5;
            float dNoise2 = sin(angle * 14.0 - r * 4.0 - uTime * orbSpeed * 5.0) * 0.3 + 0.7;
            float dDensity = dh * dr * dNoise * dNoise2;
            float clump = sin(angle * 22.0 + r * 8.0 + uTime * orbSpeed * 7.0);
            float molten = clump > 0.0 ? clump * clump * clump * clump : 0.0;
            float dTemp = mix(14000.0, 2500.0, smoothstep(0.25, 0.80, ex));
            vec3 dCol = tempToRGB(dTemp);
            dCol *= 1.0 + molten * 4.0;
            float alpha = dDensity * debrisActive * 0.09;
            accCol += dCol * alpha * (1.0 - acc) * 2.2;
            acc += alpha * (1.0 - acc);
          }
        }

        if (nebActive > 0.01) {
          float nebR = 12.0 + max(ex - 0.75, 0.0) * 20.0;
          if (r < nebR) {
            float nn = vnoise3(pos * 0.2 + vec3(uTime * 0.02));
            float nebDensity = max(nn * 2.0 - 1.0, 0.0);
            nebDensity *= nebDensity;
            nebDensity *= smoothstep(nebR, nebR * 0.15, r);
            nebDensity *= 0.04 * nebActive;
            vec3 nebCol = mix(vec3(0.55, 0.15, 1.0), vec3(1.0, 0.4, 0.7), nn);
            float nn2 = hash(dot(floor(pos * 3.0), vec3(127.1, 311.7, 74.7)));
            nebCol = mix(nebCol, vec3(0.15, 0.7, 1.0), nn2 * nn2);
            nebCol += vec3(0.15, 0.08, 0.0) * (1.0 - nn2);
            accCol += nebCol * nebDensity * (1.0 - acc);
            acc += nebDensity * 0.3 * (1.0 - acc);
          }
        }

        if (acc > 0.90) break;
      }
    }

    if (r < 3.8 && bhLife > 0.05) {
      float photon = photonRing(pos, r);
      float flickr = 1.0 + instability * (sin(uTime * 25.0 + r * 8.0) * 0.5 + 0.5);
      float photonBright = photon * 0.14 * (1.0 - dimBell * 0.25) * flickr * bhLife;
      glow = min(glow + photonBright, 3.0);

      float rNorm = smoothstep(1.3, 1.8, r);
      vec3 photonInner = vec3(1.0, 0.9, 0.7);
      vec3 photonMid = vec3(1.0, 0.75, 0.4);
      vec3 photonOuter = vec3(0.9, 0.6, 0.25);
      vec3 photonColor = mix(photonInner, mix(photonMid, photonOuter, rNorm), rNorm);

      float prismatic = sin(atan(pos.z, pos.x) * 6.0 + uTime * 1.5) * 0.5 + 0.5;
      photonColor = mix(photonColor, vec3(1.0, 0.85, 0.6), prismatic * 0.3);

      accCol += photonColor * photonBright * 0.6 * (1.0 - acc);
    }

    float currentY = pos.y;
    if (bhLife > 0.05 && (prevY * currentY < 0.0 || abs(currentY) < DISK_HEIGHT)) {
      vec4 disk = accretionDisk(pos, vel);
      if (disk.a > 0.001) {
        float diskMod = (1.0 + instability * 4.0) * bhLife;
        disk.rgb *= diskMod;
        disk.a *= bhLife;
        accCol += disk.rgb * (1.0 - acc);
        acc = min(acc + disk.a * (1.0 - acc), 1.0);
        if (acc > 0.95) break;
      }
    }
    prevY = currentY;

    vec3 crossPV = cross(pos, vel);
    float h2 = dot(crossPV, crossPV);
    float r2 = r * r;
    float r5 = r2 * r2 * r;
    vec3 accel = -1.5 * h2 * pos / max(r5, 1e-8) * gravMult;

    float baseDt = clamp((r - max(dynSR, 0.1)) * 0.4, 0.03, 1.5);
    float exBoost = 1.0 + smoothstep(0.35, 0.65, ex) * (1.0 - bhLife) * 1.5;
    float adaptiveDt = dt * baseDt * exBoost;
    vel += accel * adaptiveDt;
    vel = normalize(vel);
    pos += vel * adaptiveDt;
  }

  vec3 velN2 = normalize(vel);
  vec3 stars = starfield(velN2) * starBoostFactor;
  if (bhLife > 0.1) {
    vec3 eRingP2 = einsteinRingColor(velN2, ro);
    float eRingI2 = (eRingP2.r + eRingP2.g + eRingP2.b) / 3.0;
    vec3 eRingT2 = mix(vec3(0.9, 0.6, 0.2), vec3(1.0, 0.8, 0.5), eRingI2 * 2.0);
    stars += eRingT2 * eRingP2 * 2.2 * (1.0 - dimBell * 0.3) * bhLife;
  }
  color = accCol * (1.0 - dimBell * 0.25) + stars * (1.0 - acc);
}

/* ─── Main ─── */

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

  float scrollEffect = uScroll;
  float approach = smootherstep(0.0, 1.0, scrollEffect);
  float warpPull = smoothstep(0.08, 0.25, scrollEffect) * (1.0 - smoothstep(0.38, 0.58, scrollEffect));
  float fov = mix(1.4, 0.2, approach) * (1.0 - warpPull * 0.22);

  vec2 mouseParallax = (uMouse - 0.5);
  float mouseLen = length(mouseParallax);
  float closeFade = 1.0 - scrollEffect * scrollEffect;
  vec3 camPos = vec3(
    sin(scrollEffect * 0.4) * 0.1 * closeFade + sin(uTime * 0.03) * 0.01 * closeFade + mouseParallax.x * mix(0.4, 0.0, scrollEffect),
    mix(1.2, 0.06, scrollEffect * (0.8 + 0.2 * scrollEffect)) + sin(uTime * 0.08) * 0.02 * closeFade + mouseParallax.y * mix(0.25, 0.0, scrollEffect),
    mix(38.0, 2.5, scrollEffect + warpPull * 0.12)
  );

  vec3 target = vec3(mouseParallax.x * mix(0.1, 0.0, scrollEffect), mouseParallax.y * mix(0.06, 0.0, scrollEffect), 0.0);
  vec3 forward = normalize(target - camPos);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);

  vec3 rd = normalize(forward * fov + right * uv.x + up * uv.y);

  if (uExplosion > 0.04) {
    float shakeAmp = smoothstep(0.04, 0.08, uExplosion) * (1.0 - smoothstep(0.25, 0.55, uExplosion)) * 0.012
                   + smoothstep(0.38, 0.43, uExplosion) * (1.0 - smoothstep(0.55, 0.75, uExplosion)) * 0.006;
    rd = normalize(rd + right * sin(uTime * 90.0) * shakeAmp + up * cos(uTime * 73.0) * shakeAmp);
  }

  vec3 color;
  float glow;
  traceRay(camPos, rd, color, glow);


  float scrollGlowDim = 1.0 - sqrt(scrollEffect) * 0.4;
  float glowBell = g2((scrollEffect - 0.62) * 5.0);
  scrollGlowDim *= 1.0 - glowBell * 0.2;
  float glowReveal = smoothstep(0.05, 0.2, scrollEffect);
  vec3 warmGlow = vec3(1.0, 0.6, 0.2) * glow * 0.06 * scrollGlowDim * glowReveal;
  vec3 deepGlow = vec3(0.15, 0.10, 0.05) * glow * 0.04 * scrollGlowDim * glowReveal;
  color += warmGlow + deepGlow;

  float diskPlaneY = uv.y + 0.01 * (1.0 - scrollEffect);
  float diskHaze = exp(-diskPlaneY * diskPlaneY * mix(25.0, 150.0, scrollEffect));
  float diskRadial = smoothstep(0.6, 0.1, abs(uv.x));
  float earlyHazeBoost = 1.0 + smoothstep(0.15, 0.0, scrollEffect) * 0.3;
  float closeHazeDim = 1.0 - smoothstep(0.5, 0.85, scrollEffect) * 0.65;
  float hazeIntensity = diskHaze * diskRadial * mix(0.16, 0.006, scrollEffect) * scrollGlowDim * earlyHazeBoost * closeHazeDim;
  vec3 hazeColor = mix(vec3(0.55, 0.22, 0.06), vec3(0.35, 0.18, 0.08), smoothstep(-0.3, 0.3, uv.x));
  float hazePulse = 1.0 + sin(uTime * 0.6) * 0.08;
  color += hazeColor * hazeIntensity * hazePulse;

  float hazeWide = exp(-diskPlaneY * diskPlaneY * mix(8.0, 60.0, scrollEffect));
  float hazeWideRadial = smoothstep(0.7, 0.0, abs(uv.x));
  float hazeWideIntensity = hazeWide * hazeWideRadial * mix(0.04, 0.001, scrollEffect) * earlyHazeBoost * closeHazeDim;
  color += vec3(0.3, 0.12, 0.04) * hazeWideIntensity;

  float diskGlowLine = exp(-diskPlaneY * diskPlaneY * mix(600.0, 1200.0, scrollEffect));
  float glowLineRadial = smoothstep(0.3, 0.05, abs(uv.x));
  color += vec3(0.15, 0.08, 0.03) * diskGlowLine * glowLineRadial * mix(0.008, 0.001, scrollEffect);

  float lensDist = length(uv);
  float _lf = max(1.0 - lensDist * 2.0, 0.0); float _lf2 = _lf*_lf; float _lf4 = _lf2*_lf2; float lensFlare = _lf4 * _lf4 * glow * 0.02;
  color += vec3(0.8, 0.5, 0.2) * lensFlare;

  float _am = max(1.0 - abs(uv.x) * 0.5, 0.0); float anamorphic = exp(-abs(uv.y) * 12.0) * _am * _am;
  color += vec3(0.2, 0.1, 0.04) * anamorphic * glow * 0.015;

  float _da = max(1.0 - abs(uv.x) * 0.3, 0.0); float diskAnamorphic = exp(-abs(diskPlaneY) * 20.0) * _da * _da * sqrt(_da);
  float anamorphicDim = 1.0 - smoothstep(0.5, 0.8, scrollEffect) * 0.7;
  color += vec3(0.20, 0.08, 0.02) * diskAnamorphic * mix(0.03, 0.005, scrollEffect) * anamorphicDim;

  float _ll = max(1.0 - abs(uv.x) * 0.8, 0.0); float _ll2 = _ll*_ll; float lightLeak = _ll2 * _ll2 * exp(-abs(uv.y + diskPlaneY * 0.5) * 8.0);
  float lightLeakPulse = sin(uTime * 0.4) * 0.10 + 0.90;
  float lightLeakDim = 1.0 - smoothstep(0.5, 0.8, scrollEffect) * 0.7;
  color += vec3(0.10, 0.04, 0.015) * lightLeak * mix(0.03, 0.005, scrollEffect) * lightLeakPulse * lightLeakDim;

  float photonChapter = smoothstep(0.25, 0.38, scrollEffect) * (1.0 - smoothstep(0.48, 0.58, scrollEffect));
  if (photonChapter > 0.01) {
    float pDist = length(uv);
    float pRadius = mix(0.18, 0.12, scrollEffect);
    float pRing = g2((pDist - pRadius) * 40.0) * 0.25;
    float pAngle = atan(uv.y, uv.x);
    float pShimmer = sin(pAngle * 24.0 + uTime * 4.0) * 0.1 + 1.0;
    float pCaustic = abs(sin(pAngle * 12.0 - uTime * 3.0 + pDist * 40.0)) * 0.08;
    vec3 pColor = mix(vec3(1.0, 0.8, 0.4), vec3(1.0, 0.9, 0.6), sin(pAngle * 5.0 + uTime) * 0.5 + 0.5);
    color += pColor * pRing * (pShimmer + pCaustic) * photonChapter * 0.2;
  }

  float godRayAngle = atan(uv.y - diskPlaneY + 0.01, uv.x);
  float _gr = max(sin(godRayAngle * 8.0 + uTime * 0.3) * 0.5 + 0.5, 0.0); float _gr2 = _gr*_gr; float godRays = _gr2 * _gr2 * _gr2;
  float godRayMask = exp(-lensDist * lensDist * 3.0) * (1.0 - scrollEffect * 0.6);
  float godRayIntensity = godRays * godRayMask * 0.025 * smoothstep(0.1, 0.4, scrollEffect);
  color += vec3(0.4, 0.2, 0.08) * godRayIntensity;

  float jetAxis = abs(uv.x);
  float jetHeight = uv.y - diskPlaneY;
  float jetCone = exp(-jetAxis * jetAxis * 80.0);
  float jetLength = exp(-abs(jetHeight) * 1.5) * step(0.0, abs(jetHeight) - 0.05);
  float jetFlicker = sin(jetHeight * 30.0 - uTime * 5.0) * 0.3 + 0.7;
  float jetIntensity = jetCone * jetLength * jetFlicker * smoothstep(0.3, 0.6, scrollEffect) * 0.02;
  color += vec3(0.7, 0.4, 0.15) * jetIntensity;


  float gravitationalRedshift = 1.0 + smoothstep(0.0, 1.5, 1.0 / (lensDist + 0.1)) * uDistortion * 0.02;
  color *= gravitationalRedshift;

  float gravDistort = smoothstep(0.5, 0.0, lensDist) * scrollEffect * 0.15;
  float gravPull = exp(-lensDist * lensDist * mix(3.0, 12.0, scrollEffect));
  color = mix(color, color * vec3(1.08, 0.95, 0.85), gravPull * scrollEffect * 0.4);

  float warpPhaseBoost = smoothstep(0.08, 0.25, scrollEffect) * (1.0 - smoothstep(0.38, 0.58, scrollEffect));
  float spaceWarp = sin(lensDist * mix(15.0, 40.0, scrollEffect + warpPhaseBoost * 0.3) - uTime * 0.8) * 0.5 + 0.5;
  float warpMask = smoothstep(0.5, 0.08, lensDist) * smoothstep(0.0, 0.15, scrollEffect);
  color += vec3(0.06, 0.03, 0.01) * spaceWarp * warpMask * gravPull * (0.5 + warpPhaseBoost * 0.8);

  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float satBoost = 1.0 + uScroll * 0.20;
  color = mix(vec3(lum), color, satBoost);
  color = max(color, vec3(0.0));

  /* ── Screen-space: only flash + transitions (3D explosion is in traceRay) ── */
  if (uExplosion > 0.001) {
    float ex = uExplosion;
    float ld = length(uv);

    float flashPeak = smoothstep(0.05, 0.07, ex) * (1.0 - smoothstep(0.07, 0.14, ex));
    color += vec3(10.0, 9.5, 8.0) * flashPeak * flashPeak * exp(-ld * ld * 2.0);

    float flash2 = smoothstep(0.39, 0.41, ex) * (1.0 - smoothstep(0.41, 0.50, ex));
    color += vec3(6.0, 5.5, 4.5) * flash2 * flash2 * exp(-ld * ld * 3.0);

    float fadeW = smoothstep(0.93, 1.0, ex);
    color = mix(color, vec3(1.0, 0.98, 0.96), fadeW * fadeW * 0.85);

    if (ex > 1.0) {
      float aftermath = ex - 1.0;
      float whiteDissolve = 1.0 - smoothstep(0.0, 0.3, aftermath);
      color = mix(color, vec3(1.0, 0.98, 0.95), whiteDissolve);

      for (int ss = 0; ss < 4; ss++) {
        float ssTime = uTime * 0.25 + float(ss) * 5.3;
        float ssCycle = fract(ssTime);
        if (ssCycle < 0.25 && aftermath > 0.4) {
          float ssSeed = hash(floor(ssTime) * 127.1 + float(ss) * 311.7);
          float ssSeed2 = hash(floor(ssTime) * 41.7 + float(ss) * 199.3);
          vec2 ssStart = vec2(ssSeed * 2.0 - 1.0, ssSeed2 - 0.3) * 0.7;
          vec2 ssDir = normalize(vec2(ssSeed2 - 0.5, -0.25 - ssSeed * 0.4));
          vec2 ssPos = ssStart + ssDir * ssCycle * 2.0;
          vec2 toPoint = uv - ssPos;
          float along = dot(toPoint, ssDir);
          float perp = length(toPoint - ssDir * along);
          float trail = exp(-perp * perp * 4000.0) * smoothstep(0.0, -0.12, along) * smoothstep(-0.22, -0.04, along);
          float head = exp(-perp * perp * 6000.0) * exp(-along * along * 300.0);
          float ssAlpha = smoothstep(0.4, 0.6, aftermath) * max(1.0 - ssCycle * 4.0, 0.0);
          color += vec3(1.0, 0.95, 0.85) * (trail * 0.8 + head * 2.0) * ssAlpha;
        }
      }
    }
  }

  vec3 ditherSeed = vec3(
    hash(gl_FragCoord.x * 127.1 + gl_FragCoord.y * 311.7 + uTime * 1.7),
    hash(gl_FragCoord.x * 269.5 + gl_FragCoord.y * 183.3 + uTime * 2.3),
    hash(gl_FragCoord.x * 419.2 + gl_FragCoord.y * 371.9 + uTime * 3.1)
  );
  color += (ditherSeed - 0.5) / 128.0;

  gl_FragColor = vec4(color, 1.0);
}
