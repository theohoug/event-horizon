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
#define DISK_OUTER 14.0
#define DISK_HEIGHT 0.18

/* ─── Procedural Starfield — Photorealistic ─── */

vec3 starfield(vec3 rd) {
  vec3 col = vec3(0.0);

  float _ss = max(uScroll - 0.6, 0.0);
  float scrollStretch = uScroll * uScroll * 0.6 + _ss * _ss * 2.0;
  vec3 stretchDir = vec3(0.0, 0.0, -1.0);
  float spiralTwist = uScroll * uScroll * 0.3;
  vec3 twistedRd = vec3(
    rd.x * cos(spiralTwist) - rd.y * sin(spiralTwist),
    rd.x * sin(spiralTwist) + rd.y * cos(spiralTwist),
    rd.z
  );
  vec3 stretchedRd = normalize(twistedRd + stretchDir * dot(twistedRd, stretchDir) * scrollStretch);

  for (int layer = 0; layer < 3; layer++) {
    float scale = 50.0 + float(layer) * 45.0;
    vec3 p = stretchedRd * scale;
    vec3 id = floor(p);
    vec3 fd = fract(p);

    vec3 h3 = hash33(id);
    float dist = length(h3 - fd);
    float h = hash(dot(id, vec3(127.1, 311.7, 74.7)));

    float threshold = 0.38 - float(layer) * 0.04;

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

      float colorSeed = hash(dot(id, vec3(53.1, 97.3, 161.7)));
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

  float nebulaBoost = 1.0 + smoothstep(0.3, 0.0, uScroll) * 1.5;

  float n1 = snoise(rd * 2.5 + vec3(uTime * 0.008));
  float _nb1 = n1 * 0.5 + 0.5; float _nb1_2 = _nb1*_nb1; float nebula = _nb1_2 * sqrt(_nb1) * 0.14;
  float nebSeed2 = dot(rd * 5.0, vec3(127.1, 311.7, 74.7)) + uTime * 0.004;
  float _nb2 = hash(nebSeed2); float _nb2_2 = _nb2*_nb2; float nebula2 = _nb2_2 * _nb2_2 * 0.07;

  col += vec3(0.12, 0.06, 0.05) * nebula * nebulaBoost;
  col += vec3(0.10, 0.06, 0.03) * nebula2 * nebulaBoost;

#ifndef QUALITY_MEDIUM
  float n4 = snoise(rd * 3.8 + vec3(uTime * 0.006, 0.0, 42.0));
  float _nb3 = n4 * 0.5 + 0.5; float nebula3 = _nb3 * _nb3 * _nb3 * 0.08;
  col += vec3(0.07, 0.04, 0.04) * nebula3 * nebulaBoost;

  float _nn = n4 * 0.5 + 0.5; float _nn2 = _nn*_nn; float nurseryNoise = _nn2 * _nn2 * 0.06;
  col += vec3(0.12, 0.07, 0.04) * nurseryNoise * nebulaBoost;

  float n3 = snoise(rd * 1.2 + vec3(0.0, uTime * 0.003, 31.0));
  float _dn = n3 * 0.5 + 0.5; float deepNebula = _dn * _dn * _dn * 0.08;
  col += vec3(0.05, 0.035, 0.025) * deepNebula * nebulaBoost;
#endif

  float _cg = max(1.0 - abs(rd.y - 0.1) * 1.2, 0.0); float _cg2 = _cg*_cg; float cosmicGlow = _cg2 * sqrt(_cg) * 0.04;
  col += vec3(0.06, 0.04, 0.025) * cosmicGlow * nebulaBoost;

  float _an = n3 * 0.5 + 0.5; float asymNebula = _an * _an * _an * 0.05;
  col += vec3(0.08, 0.05, 0.03) * asymNebula * nebulaBoost * smoothstep(0.0, 0.3, rd.x + 0.2);

  float _mw = max(1.0 - abs(rd.y) * 1.6, 0.0); float _mw2 = _mw*_mw; float milkyWay = _mw2 * _mw;
  float milkySeed = dot(rd, vec3(127.1, 311.7, 74.7));
  float milkyDetail = (hash(milkySeed * 8.0) - 0.5) * 0.5 + (hash(milkySeed * 16.0) - 0.5) * 0.25;
  float milkyBoost = 1.0 + smoothstep(0.2, 0.0, uScroll) * 0.8;
  col += vec3(0.045, 0.035, 0.025) * milkyWay * (0.5 + milkyDetail) * milkyBoost;

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

  return col;
}

/* ─── Accretion Disk ─── */

vec4 accretionDisk(vec3 pos, vec3 rd) {
  float diskY = pos.y;
  if (abs(diskY) > DISK_HEIGHT * 3.0) return vec4(0.0);

  float r = length(pos.xz);
  if (r < DISK_INNER || r > DISK_OUTER) return vec4(0.0);

  float angle = atan(pos.z, pos.x);
  float diskMask = smoothstep(DISK_INNER - 0.2, DISK_INNER + 1.2, r) *
                   smoothstep(DISK_OUTER + 0.5, DISK_OUTER - 4.0, r);
  float heightFade = exp(-abs(diskY) * abs(diskY) / (DISK_HEIGHT * DISK_HEIGHT * 2.0));

  float orbitalSpeed = 1.0 / (r * sqrt(r));
  float rotAngle = angle + uTime * uDiskSpeed * orbitalSpeed;

  float turb1 = snoise(vec3(r * 2.5, rotAngle * 3.0, uTime * 0.25)) * 0.38;
  float turb2 = snoise(vec3(r * 6.0, rotAngle * 5.0, uTime * 0.4 + 31.0)) * 0.15;
  float turbulence = turb1 + turb2;

  float spiralArm = sin(rotAngle * 3.0 + r * 1.8 + turbulence * 5.0) * 0.5 + 0.5;
  spiralArm = sqrt(spiralArm);
  float secondaryArm = sin(rotAngle * 7.0 + r * 3.5 - uTime * 0.3) * 0.5 + 0.5;
  float tertiaryArm = sin(rotAngle * 13.0 + r * 5.0 + uTime * 0.15) * 0.5 + 0.5;
  float quaternaryArm = sin(rotAngle * 19.0 + r * 8.0 + uTime * 0.1) * 0.5 + 0.5;
  spiralArm = mix(spiralArm, spiralArm * secondaryArm, 0.4);
  float highFreqFade = smoothstep(0.0, 0.35, uScroll);
  spiralArm += tertiaryArm * tertiaryArm * tertiaryArm * mix(0.04, 0.1, highFreqFade);
  float _q2 = quaternaryArm * quaternaryArm; spiralArm += _q2 * _q2 * mix(0.01, 0.04, highFreqFade);

  float viewIncidence = abs(dot(normalize(rd), vec3(0.0, 1.0, 0.0)));
  float volumeOpacity = mix(2.5, 1.0, viewIncidence);

  float density = diskMask * heightFade * (0.2 + 0.8 * spiralArm) * volumeOpacity;
  density *= 1.0 + turbulence * mix(1.0, 0.7, uScroll);
  float _ga = 1.0 - spiralArm; float gapDarkening = _ga * sqrt(_ga) * mix(0.25, 0.45, smoothstep(0.15, 0.40, uScroll));
  density *= 1.0 - gapDarkening;
  density = clamp(density, 0.0, 1.0);

  float outerFadeBell = g2((uScroll - 0.62) * 5.0);
  float outerTransparency = outerFadeBell * smoothstep(DISK_INNER + 2.0, DISK_OUTER - 1.0, r) * 0.25;
  density *= 1.0 - outerTransparency;

  float iscoWidth = mix(1.5, 2.5, smoothstep(0.0, 0.35, uScroll));
  float iscoGlow = g2((r - ISCO) * iscoWidth) * 0.5;
  density += iscoGlow * heightFade;

  float rRatio = ISCO / r;
  float riseFromISCO = r > ISCO ? max(1.0 - sqrt(rRatio), 0.0) : 0.0;
  float radialDecay = pow(rRatio, 0.75);
  float tempProfile = pow(max(riseFromISCO, 0.0), 0.25) * radialDecay;
  float baseTemp = 85000.0 * tempProfile / 0.1213;
  if (r < ISCO) baseTemp = 2000.0;
  baseTemp += turbulence * 3000.0;
  baseTemp += iscoGlow * 5000.0;
  baseTemp = clamp(baseTemp, 800.0, 100000.0);

  vec3 diskColor = temperatureToColor(baseTemp);
  float _tn = baseTemp / 15000.0;
  float tempBrightness = _tn * sqrt(_tn) * 0.40;
  tempBrightness = tempBrightness / (1.0 + tempBrightness * 0.3);
  diskColor *= tempBrightness;

  float turbColor = (turb1 + turb2) * 0.8;
  diskColor *= 1.0 + turbColor * vec3(0.2, -0.05, -0.1);

  float _hs1 = max(sin(rotAngle * 2.0 + uTime * 0.15 + r * 0.5) * 0.5 + 0.5, 0.0); float _hs1_2 = _hs1*_hs1; float _hs1_4 = _hs1_2*_hs1_2; float hotSpot1 = _hs1_4 * _hs1_2;
  float _hs2 = max(sin(rotAngle * 5.0 - uTime * 0.2 + r * 1.2) * 0.5 + 0.5, 0.0); float _hs2_2 = _hs2*_hs2; float _hs2_4 = _hs2_2*_hs2_2; float hotSpot2 = _hs2_4 * _hs2_4;
  float hotSpotMask = smoothstep(DISK_INNER + 0.5, DISK_INNER + 3.0, r) * smoothstep(DISK_OUTER - 2.0, DISK_INNER + 4.0, r);
  diskColor += vec3(1.0, 0.7, 0.2) * hotSpot1 * hotSpotMask * 0.12;
  diskColor += vec3(1.0, 0.45, 0.1) * hotSpot2 * hotSpotMask * 0.06;

  float _oe = smoothstep(DISK_OUTER - 2.5, DISK_OUTER - 0.5, r); float outerEdge = _oe * _oe;
  float edgeTurb = sin(rotAngle * 12.0 + r * 4.0 + uTime * 0.5) * 0.5 + 0.5;
  float outerEdgeIntensity = mix(0.10, 0.04, smoothstep(0.15, 0.40, uScroll));
  diskColor += vec3(0.10, 0.06, 0.03) * outerEdge * edgeTurb * outerEdgeIntensity;

  float midDiskDim = smoothstep(DISK_INNER + 2.0, DISK_INNER + 5.0, r) * smoothstep(DISK_OUTER - 1.0, DISK_OUTER - 4.0, r);
  diskColor *= 1.0 - midDiskDim * 0.15;

  float flarePhase1 = sin(rotAngle * 1.0 + uTime * 0.4 + r * 0.3);
  float flarePhase2 = sin(rotAngle * 3.0 - uTime * 0.25 + r * 0.8);
  float _ft = max(flarePhase1 * flarePhase2, 0.0); float _ft2 = _ft*_ft; float _ft4 = _ft2*_ft2; float flareTrigger = _ft4 * _ft4;
  float flareMask = smoothstep(DISK_INNER + 0.5, DISK_INNER + 2.5, r) * smoothstep(DISK_OUTER - 2.0, DISK_INNER + 4.0, r);
  diskColor += vec3(1.0, 0.6, 0.15) * flareTrigger * flareMask * 0.15;

  float beta = sqrt(SCHWARZSCHILD_RADIUS / (2.0 * r));
  float _gamma = 1.0 / sqrt(max(1.0 - beta * beta, 0.001));
  vec3 orbitalDir = normalize(vec3(-sin(angle), 0.0, cos(angle)));
  float cosTheta = dot(orbitalDir, normalize(rd));
  float D = 1.0 / (_gamma * (1.0 - beta * cosTheta));

  float beaming = D * D * D * D;
  diskColor *= beaming;

  float dopplerShift = clamp((D - 1.0) * 2.5, -1.0, 1.0);
  vec3 blueBoost = vec3(1.2, 0.95, 0.7);
  vec3 redBoost = vec3(1.3, 0.8, 0.6);
  vec3 dopplerTint = dopplerShift > 0.0 ? mix(vec3(1.0), blueBoost, dopplerShift) : mix(vec3(1.0), redBoost, -dopplerShift);
  diskColor *= dopplerTint;

  float gravRedshiftDisk = sqrt(max(1.0 - SCHWARZSCHILD_RADIUS / r, 0.001));
  diskColor *= gravRedshiftDisk;


  float _er = max(sin(rotAngle * 1.0 + uTime * 0.08) * sin(uTime * 0.3 + r * 0.5), 0.0); float _er2 = _er*_er; float _er4 = _er2*_er2; float _er8 = _er4*_er4; float eruption = _er8 * _er8;
  float eruptionMask = smoothstep(DISK_INNER, DISK_INNER + 1.5, r) * smoothstep(DISK_INNER + 4.0, DISK_INNER + 2.0, r);
  diskColor += vec3(1.0, 0.75, 0.3) * eruption * eruptionMask * 0.25;


  float scrollDim = 1.0 - sqrt(uScroll) * 0.3;
  float closeUpDim = 1.0 - smoothstep(0.5, 0.85, uScroll) * 0.3;
  float earlyBoost = 1.0 + smoothstep(0.4, 0.0, uScroll) * 0.4;
  diskColor *= uIntensity * 0.7 * scrollDim * closeUpDim * earlyBoost;

  float deepShift = smoothstep(0.65, 0.90, uScroll);
  diskColor = mix(diskColor, diskColor * vec3(1.1, 0.9, 0.75), deepShift * 0.25);

  float diskLum = dot(diskColor, vec3(0.2126, 0.7152, 0.0722));
  float satBoost = mix(1.35, 1.10, uScroll);
  diskColor = mix(vec3(diskLum), diskColor, satBoost);
  diskColor = max(diskColor, vec3(0.0));
  float diskPeak = max(max(diskColor.r, diskColor.g), diskColor.b);
  if (diskPeak > 1.2) {
    diskColor *= 1.2 / diskPeak;
    diskColor = mix(diskColor, vec3(dot(diskColor, vec3(0.2126, 0.7152, 0.0722))), (diskPeak - 1.2) * 0.15);
  }

  return vec4(diskColor * density, density * scrollDim);
}

/* ─── Photon Ring ─── */

float photonRing(vec3 pos, float r) {
  float ring1 = g2((r - PHOTON_SPHERE) * 12.0);
  float ring2 = g2((r - PHOTON_SPHERE * 1.02) * 18.0) * 0.7;
  float ring3 = g2((r - PHOTON_SPHERE * 0.98) * 22.0) * 0.35;
  float ringWide = g2((r - PHOTON_SPHERE) * 5.0) * 0.2;

  float angle = atan(pos.z, pos.x);
  float shimmer = sin(angle * 30.0 + uTime * 4.0) * 0.10;
  float shimmer2 = sin(angle * 50.0 - uTime * 6.0) * 0.04;

  float earlyBoost = 1.0 + smoothstep(0.3, 0.0, uScroll) * 1.5;
  float ringFade = 1.0 - smoothstep(0.40, 0.56, uScroll);

  float heartbeatPhase = uScroll > 0.35 ? 1.0 : 0.0;
  float hbSpeed = 50.0 + max(uScroll - 0.35, 0.0) * 200.0;
  float _hbp = sin(uTime * hbSpeed / 60.0 * 3.14159) * 0.5 + 0.5; float _hbp2 = _hbp*_hbp; float _hbp4 = _hbp2*_hbp2; float heartbeatPulse = heartbeatPhase * (_hbp4 * _hbp4 * 0.2);
  float pulse = sin(uTime * 1.5) * 0.08 + 1.0 + heartbeatPulse;
  float breathe = sin(uTime * 0.4) * 0.1 + 1.0;

  return (ring1 + ring2 + ring3 + ringWide) * (1.0 + shimmer + shimmer2) * pulse * breathe * earlyBoost * ringFade;
}

/* ─── Einstein Ring ─── */

vec3 einsteinRingColor(vec3 rd, vec3 camPos) {
  float viewAngle = acos(clamp(dot(normalize(-camPos), normalize(rd)), -1.0, 1.0));
  float einsteinAngle = sqrt(4.0 * SCHWARZSCHILD_RADIUS / length(camPos));

  float breathe = sin(uTime * 0.6) * 0.1 + 1.0;
  float breathe2 = sin(uTime * 1.1) * 0.04 + 1.0;

  float chromaticSpread = 0.006;
  float earlyRingBoost = 1.0 + smoothstep(0.3, 0.0, uScroll) * 2.0;
  float eRingFade = 1.0 - smoothstep(0.40, 0.56, uScroll);
  float ringR = g2((viewAngle - einsteinAngle * (1.0 + chromaticSpread)) * 80.0) * 0.30 * breathe * earlyRingBoost * eRingFade;
  float ringG = g2((viewAngle - einsteinAngle) * 80.0) * 0.28 * breathe * earlyRingBoost * eRingFade;
  float ringB = g2((viewAngle - einsteinAngle * (1.0 - chromaticSpread)) * 80.0) * 0.25 * breathe * earlyRingBoost * eRingFade;

  float glow = g2((viewAngle - einsteinAngle) * 25.0) * 0.18 * breathe2 * earlyRingBoost * eRingFade;
  float shimmer = sin(viewAngle * 200.0 + uTime * 3.0) * 0.02 + 1.0;

  vec3 ring = vec3(ringR, ringG, ringB) * shimmer + vec3(glow);
  return ring;
}

float einsteinRing(vec3 rd, vec3 camPos) {
  vec3 ringCol = einsteinRingColor(rd, camPos);
  return (ringCol.r + ringCol.g + ringCol.b) / 3.0;
}

/* ─── Gravitational Ray Tracing ─── */

void traceRay(vec3 ro, vec3 rd, out vec3 color, out float glow) {
  color = vec3(0.0);
  glow = 0.0;

  vec3 pos = ro;
  vec3 vel = normalize(rd);
  float dt = 0.08;
  float prevY = pos.y;

  float accumulatedDisk = 0.0;
  vec3 accumulatedDiskColor = vec3(0.0);

  float dimBell = g2((uScroll - 0.62) * 5.0);
  float starBoostFactor = 1.0 + smoothstep(0.3, 0.0, uScroll) * 2.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    float r = length(pos);

    if (r < SCHWARZSCHILD_RADIUS) {
      float edgeDist = smoothstep(SCHWARZSCHILD_RADIUS * 0.4, SCHWARZSCHILD_RADIUS, r);
      vec3 edgeRim = vec3(0.6, 0.35, 0.15) * edgeDist * edgeDist * 0.06;
      float captureRedshift = smoothstep(SCHWARZSCHILD_RADIUS, SCHWARZSCHILD_RADIUS * 0.3, r);
      color = accumulatedDiskColor * (1.0 - captureRedshift) + edgeRim;
      glow = edgeDist * 0.15;
      return;
    }

    if (r > 60.0) {
      vec3 velN = normalize(vel);
      vec3 stars = starfield(velN) * starBoostFactor;
      vec3 eRingPrismatic = einsteinRingColor(velN, ro);
      float eRingIntensity = (eRingPrismatic.r + eRingPrismatic.g + eRingPrismatic.b) / 3.0;
      vec3 eRingTint = mix(vec3(0.9, 0.6, 0.2), vec3(1.0, 0.8, 0.5), eRingIntensity * 2.0);
      stars += eRingTint * eRingPrismatic * 2.2 * (1.0 - dimBell * 0.3);
      color = accumulatedDiskColor * (1.0 - dimBell * 0.25) + stars * (1.0 - accumulatedDisk);
      return;
    }

    if (r < 3.5) {
      float photon = photonRing(pos, r);
      float photonBright = photon * 0.09 * (1.0 - dimBell * 0.25);
      glow = min(glow + photonBright, 2.5);
      vec3 photonColor = mix(vec3(1.0, 0.75, 0.4), vec3(1.0, 0.85, 0.6), smoothstep(1.4, 1.7, r));
      accumulatedDiskColor += photonColor * photonBright * 0.4 * (1.0 - accumulatedDisk);
    }

    float currentY = pos.y;
    if (prevY * currentY < 0.0 || abs(currentY) < DISK_HEIGHT) {
      vec4 disk = accretionDisk(pos, vel);
      if (disk.a > 0.001) {
        accumulatedDiskColor += disk.rgb * (1.0 - accumulatedDisk);
        accumulatedDisk = min(accumulatedDisk + disk.a * (1.0 - accumulatedDisk), 1.0);
        if (accumulatedDisk > 0.95) break;
      }
    }
    prevY = currentY;

    vec3 crossPV = cross(pos, vel);
    float h2 = dot(crossPV, crossPV);
    float r2 = r * r;
    float r5 = r2 * r2 * r;
    vec3 accel = -1.5 * h2 * pos / max(r5, 1e-8);

    float adaptiveDt = dt * clamp((r - 1.0) * 0.4, 0.03, 1.5);
    vel += accel * adaptiveDt;
    vel = normalize(vel);
    pos += vel * adaptiveDt;
  }

  vec3 velN2 = normalize(vel);
  vec3 stars = starfield(velN2) * starBoostFactor;
  vec3 eRingP2 = einsteinRingColor(velN2, ro);
  float eRingI2 = (eRingP2.r + eRingP2.g + eRingP2.b) / 3.0;
  vec3 eRingT2 = mix(vec3(0.9, 0.6, 0.2), vec3(1.0, 0.8, 0.5), eRingI2 * 2.0);
  stars += eRingT2 * eRingP2 * 2.2 * (1.0 - dimBell * 0.3);
  color = accumulatedDiskColor * (1.0 - dimBell * 0.25) + stars * (1.0 - accumulatedDisk);
}

/* ─── Main ─── */

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

  float scrollEffect = uScroll;
  float approach = smootherstep(0.0, 1.0, scrollEffect);
  float fov = mix(1.4, 0.2, approach);

  vec2 mouseParallax = (uMouse - 0.5);
  float mouseLen = length(mouseParallax);
  float closeFade = 1.0 - scrollEffect * scrollEffect;
  vec3 camPos = vec3(
    sin(scrollEffect * 0.4) * 0.1 * closeFade + sin(uTime * 0.03) * 0.01 * closeFade + mouseParallax.x * mix(0.4, 0.0, scrollEffect),
    mix(7.0, 0.06, scrollEffect * (0.8 + 0.2 * scrollEffect)) + sin(uTime * 0.08) * 0.02 * closeFade + mouseParallax.y * mix(0.25, 0.0, scrollEffect),
    mix(38.0, 2.5, scrollEffect)
  );

  vec3 target = vec3(mouseParallax.x * mix(0.1, 0.0, scrollEffect), mouseParallax.y * mix(0.06, 0.0, scrollEffect), 0.0);
  vec3 forward = normalize(target - camPos);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);

  vec3 rd = normalize(forward * fov + right * uv.x + up * uv.y);

  float tilt = mix(0.45, 0.02, scrollEffect) + mouseParallax.y * mix(0.02, 0.0, scrollEffect);
  rd = rotateX(tilt) * rd;

  vec3 color;
  float glow;

  float exBypass = smoothstep(0.0, 0.06, uExplosion);
  if (exBypass < 0.99) {
    traceRay(camPos, rd, color, glow);
    color *= (1.0 - exBypass);
    glow *= (1.0 - exBypass);
  } else {
    color = vec3(0.0);
    glow = 0.0;
  }

  float scrollGlowDim = 1.0 - sqrt(scrollEffect) * 0.4;
  float glowBell = g2((scrollEffect - 0.62) * 5.0);
  scrollGlowDim *= 1.0 - glowBell * 0.2;
  float earlyGlowBoost = 1.0 + smoothstep(0.2, 0.0, scrollEffect) * 0.8;
  vec3 blueWhiteGlow = vec3(0.9, 0.8, 0.65) * glow * 0.14 * scrollGlowDim * earlyGlowBoost;
  vec3 warmGlow = vec3(1.0, 0.55, 0.15) * glow * 0.18 * scrollGlowDim * earlyGlowBoost;
  vec3 deepGlow = vec3(0.15, 0.10, 0.05) * glow * 0.08 * scrollGlowDim;
  color += blueWhiteGlow + warmGlow + deepGlow;

  float diskPlaneY = uv.y + 0.01 * (1.0 - scrollEffect);
  float diskHaze = exp(-diskPlaneY * diskPlaneY * mix(25.0, 150.0, scrollEffect));
  float diskRadial = smoothstep(0.6, 0.1, abs(uv.x));
  float earlyHazeBoost = 1.0 + smoothstep(0.2, 0.0, scrollEffect) * 1.0;
  float closeHazeDim = 1.0 - smoothstep(0.5, 0.85, scrollEffect) * 0.65;
  float hazeIntensity = diskHaze * diskRadial * mix(0.12, 0.005, scrollEffect) * scrollGlowDim * earlyHazeBoost * closeHazeDim;
  vec3 hazeColor = mix(vec3(0.45, 0.18, 0.04), vec3(0.3, 0.15, 0.06), smoothstep(-0.3, 0.3, uv.x));
  float hazePulse = 1.0 + sin(uTime * 0.6) * 0.06;
  color += hazeColor * hazeIntensity * hazePulse;

  float diskGlowLine = exp(-diskPlaneY * diskPlaneY * mix(600.0, 1200.0, scrollEffect));
  float glowLineRadial = smoothstep(0.3, 0.05, abs(uv.x));
  color += vec3(0.15, 0.08, 0.03) * diskGlowLine * glowLineRadial * mix(0.008, 0.001, scrollEffect);

  float lensDist = length(uv);
  float _lf = max(1.0 - lensDist * 2.0, 0.0); float _lf2 = _lf*_lf; float _lf4 = _lf2*_lf2; float lensFlare = _lf4 * _lf4 * glow * 0.04;
  float _lfe = max(1.0 - lensDist * 1.5, 0.0); float _lfe2 = _lfe*_lfe; float _lfe4 = _lfe2*_lfe2; float lensFlareEarly = _lfe4 * _lfe * glow * 0.02 * (1.0 - uScroll);
  color += vec3(0.8, 0.5, 0.2) * (lensFlare + lensFlareEarly);

  float _am = max(1.0 - abs(uv.x) * 0.5, 0.0); float anamorphic = exp(-abs(uv.y) * 12.0) * _am * _am;
  color += vec3(0.2, 0.1, 0.04) * anamorphic * glow * 0.015;

  float _da = max(1.0 - abs(uv.x) * 0.3, 0.0); float diskAnamorphic = exp(-abs(diskPlaneY) * 20.0) * _da * _da * sqrt(_da);
  float anamorphicDim = 1.0 - smoothstep(0.5, 0.8, scrollEffect) * 0.7;
  color += vec3(0.20, 0.08, 0.02) * diskAnamorphic * mix(0.03, 0.005, scrollEffect) * anamorphicDim;

  float _ll = max(1.0 - abs(uv.x) * 0.8, 0.0); float _ll2 = _ll*_ll; float lightLeak = _ll2 * _ll2 * exp(-abs(uv.y + diskPlaneY * 0.5) * 8.0);
  float lightLeakPulse = sin(uTime * 0.4) * 0.10 + 0.90;
  float lightLeakDim = 1.0 - smoothstep(0.5, 0.8, scrollEffect) * 0.7;
  color += vec3(0.10, 0.04, 0.015) * lightLeak * mix(0.03, 0.005, scrollEffect) * lightLeakPulse * lightLeakDim;

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


  if (scrollEffect < 0.4) {
    float earlyFade = smoothstep(0.4, 0.0, scrollEffect);
    float warmHalo = exp(-lensDist * lensDist * 2.0) * earlyFade * 0.08;
    color += vec3(0.4, 0.2, 0.08) * warmHalo;
    float cosmicAura = exp(-lensDist * lensDist * 0.8) * earlyFade * 0.03;
    color += vec3(0.18, 0.10, 0.06) * cosmicAura;
    float centerPinpoint = exp(-lensDist * lensDist * 8.0) * earlyFade * 0.05;
    color += vec3(0.9, 0.85, 0.75) * centerPinpoint;
  }

  float gravitationalRedshift = 1.0 + smoothstep(0.0, 1.5, 1.0 / (lensDist + 0.1)) * uDistortion * 0.02;
  color *= gravitationalRedshift;



  /* blackHoleShadow removed — darkness comes from traceRay hitting Schwarzschild radius */


  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float satBoost = 1.0 + uScroll * 0.20;
  color = mix(vec3(lum), color, satBoost);
  color = max(color, vec3(0.0));

  if (uExplosion > 0.001) {
    float ex = uExplosion;
    float exClamped = min(ex, 1.0);

    float shakeStr = smoothstep(0.0, 0.05, ex) * (1.0 - smoothstep(0.4, 0.8, ex)) * 0.04;
    vec2 sUv = uv + vec2(
      sin(uTime * 55.0 + uv.y * 25.0) * shakeStr,
      cos(uTime * 42.0 + uv.x * 25.0) * shakeStr
    );
    float sDist = length(sUv);
    float sAngle = atan(sUv.y, sUv.x);

    float flashPeak = smoothstep(0.0, 0.015, ex) * (1.0 - smoothstep(0.015, 0.12, ex));
    color = mix(color, vec3(1.0, 0.97, 0.9) * 12.0, flashPeak);

    float expandSpeed = 2.5;
    float expandR = exClamped * expandSpeed;

    float fireballR = expandR * 0.6;
    float fireEdge = smoothstep(fireballR + 0.08, fireballR - 0.02, sDist);
    float fireActive = smoothstep(0.02, 0.08, ex) * (1.0 - smoothstep(0.5, 0.85, ex));
    float fN1 = snoise(vec3(sUv * 5.0 + ex * 3.0, uTime * 1.5)) * 0.5 + 0.5;
    float fN2 = snoise(vec3(sUv * 10.0 - ex * 2.0, uTime * 2.0 + 40.0)) * 0.5 + 0.5;
    float fN3 = snoise(vec3(sUv * 20.0 + ex * 5.0, uTime * 3.0 + 80.0)) * 0.5 + 0.5;
    float firePattern = fN1 * 0.5 + fN2 * 0.3 + fN3 * 0.2;
    float fireTemp = smoothstep(0.0, fireballR, sDist);
    vec3 fireColor = mix(vec3(1.0, 0.98, 0.9), vec3(1.0, 0.8, 0.3), fireTemp * 0.6);
    fireColor = mix(fireColor, vec3(1.0, 0.45, 0.08), fireTemp * fireTemp);
    fireColor = mix(fireColor, vec3(0.6, 0.12, 0.02), pow(fireTemp, 3.0));
    fireColor *= 0.6 + firePattern * 0.8;
    color += fireColor * fireEdge * fireActive * 4.0;

    for (int sw = 0; sw < 3; sw++) {
      float swDelay = float(sw) * 0.06;
      float swEx = max(ex - swDelay, 0.0);
      float swR = swEx * (expandSpeed + float(sw) * 0.4);
      float swW = 0.015 + float(sw) * 0.008 + swEx * 0.02;
      float swRing = exp(-(sDist - swR) * (sDist - swR) / (swW * swW));
      float swFade = smoothstep(0.0, 0.05, swEx) * (1.0 - smoothstep(0.4, 0.75, swEx));
      float swNoise = 1.0 + snoise(vec3(sAngle * 4.0, swR * 3.0, uTime)) * 0.3;
      vec3 swCol = mix(vec3(1.0, 0.9, 0.6), vec3(1.0, 0.5, 0.1), float(sw) / 3.0);
      color += swCol * swRing * swFade * swNoise * (5.0 - float(sw));
    }

    float debrisActive = smoothstep(0.03, 0.1, ex) * (1.0 - smoothstep(0.5, 0.9, ex));
    for (int d = 0; d < 24; d++) {
      float dSeed = hash(float(d) * 127.1 + 73.7);
      float dSeed2 = hash(float(d) * 311.7 + 41.3);
      float dAngle = dSeed * TAU;
      float dSpeed = 0.8 + dSeed2 * 2.5;
      float dR = ex * dSpeed;
      vec2 dPos = vec2(cos(dAngle), sin(dAngle)) * dR;
      float dDist = length(sUv - dPos);
      float dCore = exp(-dDist * dDist * 3000.0);
      float dTrail = exp(-dDist * dDist * 400.0) * 0.35;
      float dBright = (dCore + dTrail) * debrisActive;
      float dColorSeed = hash(float(d) * 53.1);
      vec3 dCol = mix(vec3(1.0, 0.9, 0.65), vec3(1.0, 0.55, 0.15), dColorSeed);
      color += dCol * dBright * 2.0;
    }

    float rayActive = smoothstep(0.01, 0.06, ex) * (1.0 - smoothstep(0.35, 0.7, ex));
    for (int r = 0; r < 16; r++) {
      float rSeed = hash(float(r) * 97.3 + 17.1);
      float rAngle = rSeed * TAU;
      float rWidth = 0.01 + rSeed * 0.02;
      float angleDiff = abs(mod(sAngle - rAngle + PI, TAU) - PI);
      float rayLine = exp(-angleDiff * angleDiff / (rWidth * rWidth));
      float rayR = smoothstep(0.0, expandR * 1.5, sDist) * smoothstep(expandR * 3.0, expandR * 0.5, sDist);
      float rBright = rayLine * rayR * rayActive;
      vec3 rCol = mix(vec3(1.0, 0.85, 0.5), vec3(1.0, 0.45, 0.1), rSeed);
      color += rCol * rBright * 2.5;
    }

    float hotCore = exp(-sDist * sDist * mix(0.5, 15.0, smoothstep(0.05, 0.5, ex)));
    float coreActive = smoothstep(0.01, 0.04, ex) * (1.0 - smoothstep(0.6, 0.95, ex));
    vec3 coreCol = mix(vec3(1.0, 0.97, 0.9), vec3(1.0, 0.75, 0.35), smoothstep(0.1, 0.5, ex));
    color += coreCol * hotCore * coreActive * 6.0;

    float smokeActive = smoothstep(0.1, 0.25, ex) * (1.0 - smoothstep(0.7, 1.0, ex));
    float smN1 = snoise(vec3(sUv * 3.0 + ex * 1.5, uTime * 0.4)) * 0.5 + 0.5;
    float smN2 = snoise(vec3(sUv * 6.0 - ex * 1.0, uTime * 0.6 + 20.0)) * 0.5 + 0.5;
    float smokeMask = smoothstep(expandR * 0.3, expandR * 1.2, sDist) * smoothstep(expandR * 2.5, expandR * 1.0, sDist);
    vec3 smokeCol = mix(vec3(0.5, 0.2, 0.06), vec3(0.8, 0.35, 0.1), smN1);
    color += smokeCol * smN1 * smN2 * smokeMask * smokeActive * 1.5;

    float fadeToWhite = smoothstep(0.8, 1.0, ex);
    color = mix(color, vec3(1.0, 0.98, 0.94), fadeToWhite * fadeToWhite * 0.85);

    if (ex > 1.0) {
      float aftermath = (ex - 1.0);

      float whiteDissolve = 1.0 - smoothstep(0.0, 0.15, aftermath);
      color = mix(color, vec3(1.0, 0.98, 0.92), whiteDissolve);

      float bgReveal = smoothstep(0.05, 0.3, aftermath);
      vec3 bgGrad = mix(vec3(0.025, 0.012, 0.004), vec3(0.012, 0.006, 0.02), uv.y * 0.5 + 0.5);
      color = mix(color, bgGrad, bgReveal * (1.0 - whiteDissolve));

      float starReveal = smoothstep(0.08, 0.4, aftermath);
      for (int sl = 0; sl < 6; sl++) {
        float slScale = 25.0 + float(sl) * 22.0;
        vec3 slP = vec3(uv * slScale, float(sl) * 17.3);
        vec3 slId = floor(slP);
        vec3 slFd = fract(slP);
        float slH = hash(dot(slId, vec3(127.1, 311.7, 74.7)));
        float thresh = 0.45 + float(sl) * 0.05;
        if (slH > thresh) {
          float slBright = (slH - thresh) / (1.0 - thresh);
          vec2 slCenter = hash33(slId).xy;
          float slDist = length(vec2(slFd.x, slFd.y) - slCenter);
          float slCore = exp(-slDist * slDist * 600.0);
          float slGlow = exp(-slDist * slDist * 100.0) * 0.4;
          float slHalo = exp(-slDist * slDist * 25.0) * 0.08;
          float slTwinkle = sin(uTime * (0.7 + slH * 2.0) + slH * 50.0) * 0.2 + 0.8;
          float cSeed = hash(dot(slId, vec3(53.1, 97.3, 161.7)));
          vec3 slCol;
          if (cSeed < 0.25) slCol = vec3(1.0, 0.82, 0.55);
          else if (cSeed < 0.55) slCol = vec3(1.0, 0.92, 0.78);
          else if (cSeed < 0.8) slCol = vec3(0.85, 0.88, 1.0);
          else slCol = vec3(1.0, 0.7, 0.4);
          float lScale = 1.6 / float(sl + 1);
          color += slCol * (slCore + slGlow + slHalo) * slBright * slTwinkle * starReveal * lScale;
        }
      }

      float nebReveal = smoothstep(0.1, 0.4, aftermath);
      float nN1 = snoise(vec3(uv * 2.5 + aftermath * 0.3, uTime * 0.1)) * 0.5 + 0.5;
      float nN2 = snoise(vec3(uv * 4.0 - aftermath * 0.2, uTime * 0.15 + 30.0)) * 0.5 + 0.5;
      float nN3 = snoise(vec3(uv * 6.5 + vec2(10.0, 20.0), uTime * 0.08 + 60.0)) * 0.5 + 0.5;
      float nN4 = snoise(vec3(uv * 1.8 + vec2(-5.0, 15.0), uTime * 0.05 + 90.0)) * 0.5 + 0.5;
      float nebMask1 = smoothstep(0.08, 0.5, lensDist) * smoothstep(0.9, 0.35, lensDist);
      float nebMask2 = smoothstep(0.04, 0.35, lensDist) * smoothstep(0.75, 0.3, lensDist);
      color += vec3(0.95, 0.35, 0.08) * nN1 * nN1 * nN1 * nebMask1 * nebReveal * 0.7;
      color += vec3(1.0, 0.65, 0.15) * nN2 * nN2 * nebMask2 * nebReveal * 0.55;
      color += vec3(0.5, 0.15, 0.55) * nN3 * nN3 * nN3 * nebMask1 * nebReveal * 0.45;
      color += vec3(0.3, 0.15, 0.06) * nN4 * nN4 * nebReveal * 0.35;

      float centerGlow = exp(-lensDist * lensDist * 4.0) * smoothstep(0.2, 0.7, aftermath);
      float centerGlow2 = exp(-lensDist * lensDist * 12.0) * smoothstep(0.3, 0.9, aftermath);
      float cPulse = sin(uTime * 0.6) * 0.06 + 0.94;
      color += vec3(1.0, 0.88, 0.6) * centerGlow * cPulse * 0.5;
      color += vec3(1.0, 0.95, 0.85) * centerGlow2 * cPulse * 0.4;

      float amAngle = atan(uv.y, uv.x);
      float gr1 = pow(max(sin(amAngle * 12.0 + uTime * 0.2) * 0.5 + 0.5, 0.0), 6.0);
      float gr2 = pow(max(sin(amAngle * 8.0 - uTime * 0.15 + 1.0) * 0.5 + 0.5, 0.0), 5.0);
      float grFade = exp(-lensDist * lensDist * 1.2);
      color += vec3(1.0, 0.8, 0.4) * gr1 * grFade * nebReveal * 0.14;
      color += vec3(0.9, 0.6, 0.25) * gr2 * grFade * nebReveal * 0.1;

      float dw1 = pow(max(sin(amAngle * 5.0 + lensDist * 8.0 + uTime * 0.12) * 0.5 + 0.5, 0.0), 3.0);
      float dw2 = pow(max(sin(amAngle * 7.0 - lensDist * 6.0 - uTime * 0.1 + 2.0) * 0.5 + 0.5, 0.0), 4.0);
      float dwMask = smoothstep(0.08, 0.25, lensDist) * smoothstep(0.75, 0.45, lensDist);
      color += vec3(0.8, 0.5, 0.2) * dw1 * dwMask * nebReveal * 0.18;
      color += vec3(0.6, 0.3, 0.5) * dw2 * dwMask * nebReveal * 0.12;

      float au1 = pow(max(sin(amAngle * 2.0 + sin(lensDist * 4.0 + uTime * 0.2) * 1.2 + uTime * 0.12) * 0.5 + 0.5, 0.0), 2.0);
      float au2 = pow(max(sin(amAngle * 3.0 - sin(lensDist * 3.0 - uTime * 0.15) * 0.8 + 1.5 - uTime * 0.08) * 0.5 + 0.5, 0.0), 2.5);
      float auR = smoothstep(0.08, 0.28, lensDist) * smoothstep(0.65, 0.32, lensDist);
      color += mix(vec3(1.0, 0.5, 0.12), vec3(0.65, 0.2, 0.6), au1) * au1 * auR * nebReveal * 0.32;
      color += mix(vec3(0.45, 0.15, 0.65), vec3(0.95, 0.55, 0.15), au2) * au2 * auR * nebReveal * 0.22;
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
