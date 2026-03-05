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

varying vec2 vUv;

#include ../common/noise.glsl
#include ../common/math.glsl

float g2(float x) { return exp(-x * x); }

#ifndef MAX_STEPS
  #define MAX_STEPS 128
#endif
#define SCHWARZSCHILD_RADIUS 1.0
#define ISCO 3.0
#define PHOTON_SPHERE 1.5
#define DISK_INNER 2.6
#define DISK_OUTER 14.0
#define DISK_HEIGHT 0.18

/* ─── Procedural Starfield — Photorealistic ─── */

vec3 starfield(vec3 rd) {
  vec3 col = vec3(0.0);

  float _ss = max(uScroll - 0.6, 0.0);
  float scrollStretch = uScroll * uScroll * 0.6 + _ss * _ss * 2.0;
  vec3 stretchDir = normalize(vec3(0.0, 0.0, -1.0));
  float spiralTwist = uScroll * uScroll * 0.3;
  vec3 twistedRd = vec3(
    rd.x * cos(spiralTwist) - rd.y * sin(spiralTwist),
    rd.x * sin(spiralTwist) + rd.y * cos(spiralTwist),
    rd.z
  );
  vec3 stretchedRd = normalize(twistedRd + stretchDir * dot(twistedRd, stretchDir) * scrollStretch);

  for (int layer = 0; layer < 4; layer++) {
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
      float colorTemp;
      if (colorSeed < 0.08) colorTemp = 2800.0 + colorSeed * 5000.0;
      else if (colorSeed < 0.22) colorTemp = 3500.0 + (colorSeed - 0.08) * 7000.0;
      else if (colorSeed < 0.5) colorTemp = 5500.0 + (colorSeed - 0.22) * 4000.0;
      else if (colorSeed < 0.78) colorTemp = 7500.0 + (colorSeed - 0.5) * 10000.0;
      else colorTemp = 14000.0 + (colorSeed - 0.78) * 26000.0;
      vec3 starColor = temperatureToColor(colorTemp);

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
      float bTemp = 4500.0 + bColorSeed * 25000.0;
      vec3 bColor = temperatureToColor(bTemp);

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
  float n2 = snoise(rd * 5.0 + vec3(uTime * 0.004, 17.0, 0.0));
  float n4 = snoise(rd * 3.8 + vec3(uTime * 0.006, 0.0, 42.0));
  float _nb1 = n1 * 0.5 + 0.5; float _nb1_2 = _nb1*_nb1; float nebula = _nb1_2 * sqrt(_nb1) * 0.14;
  float _nb2 = n2 * 0.5 + 0.5; float _nb2_2 = _nb2*_nb2; float nebula2 = _nb2_2 * _nb2_2 * 0.07;
  float _nb3 = n4 * 0.5 + 0.5; float nebula3 = _nb3 * _nb3 * _nb3 * 0.08;

  col += vec3(0.14, 0.06, 0.06) * nebula * nebulaBoost;
  col += vec3(0.03, 0.06, 0.14) * nebula2 * nebulaBoost;
  col += vec3(0.08, 0.03, 0.04) * nebula3 * nebulaBoost;

  float _nn = n4 * 0.5 + 0.5; float _nn2 = _nn*_nn; float nurseryNoise = _nn2 * _nn2 * 0.06;
  col += vec3(0.12, 0.06, 0.16) * nurseryNoise * nebulaBoost;

  float n3 = snoise(rd * 1.2 + vec3(0.0, uTime * 0.003, 31.0));
  float _dn = n3 * 0.5 + 0.5; float deepNebula = _dn * _dn * _dn * 0.08;
  col += vec3(0.05, 0.02, 0.06) * deepNebula * nebulaBoost;

  float _cg = max(1.0 - abs(rd.y - 0.1) * 1.2, 0.0); float _cg2 = _cg*_cg; float cosmicGlow = _cg2 * sqrt(_cg) * 0.04;
  col += vec3(0.06, 0.03, 0.08) * cosmicGlow * nebulaBoost;

  float _an = n3 * 0.5 + 0.5; float asymNebula = _an * _an * _an * 0.05;
  col += vec3(0.07, 0.03, 0.1) * asymNebula * nebulaBoost * smoothstep(0.0, 0.3, rd.x + 0.2);

  float _mw = max(1.0 - abs(rd.y) * 1.6, 0.0); float _mw2 = _mw*_mw; float milkyWay = _mw2 * _mw;
  float milkySeed = dot(rd, vec3(127.1, 311.7, 74.7));
  float milkyDetail = (hash(milkySeed * 8.0) - 0.5) * 0.5 + (hash(milkySeed * 16.0) - 0.5) * 0.25;
  float milkyBoost = 1.0 + smoothstep(0.2, 0.0, uScroll) * 0.8;
  col += vec3(0.04, 0.025, 0.05) * milkyWay * (0.5 + milkyDetail) * milkyBoost;

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
      vec3 bgColor = mix(vec3(0.8, 0.85, 1.0), vec3(0.95, 0.9, 1.0), bgMag);
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
  col += vec3(0.7, 0.65, 0.85) * starCluster * dustShimmer * 0.05;

  return col;
}

/* ─── Accretion Disk ─── */

vec4 accretionDisk(vec3 pos, vec3 rd) {
  float diskY = pos.y;
  if (abs(diskY) > DISK_HEIGHT * 3.0) return vec4(0.0);

  float r = length(pos.xz);
  if (r < DISK_INNER || r > DISK_OUTER) return vec4(0.0);

  float angle = atan(pos.z, pos.x);
  float diskMask = smoothstep(DISK_INNER, DISK_INNER + 0.4, r) *
                   smoothstep(DISK_OUTER, DISK_OUTER - 3.0, r);
  float heightFade = exp(-abs(diskY) * abs(diskY) / (DISK_HEIGHT * DISK_HEIGHT * 2.0));

  float orbitalSpeed = 1.0 / (r * sqrt(r));
  float rotAngle = angle + uTime * uDiskSpeed * orbitalSpeed;

  float turb1 = snoise(vec3(r * 2.5, rotAngle * 3.0, uTime * 0.25)) * 0.38;
  float turbSeed = r * 6.0 + rotAngle * 8.0 + uTime * 0.4;
  float turb2 = (hash(turbSeed) * 2.0 - 1.0) * 0.15;
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

  float density = diskMask * heightFade * (0.2 + 0.8 * spiralArm);
  density *= 1.0 + turbulence * mix(1.0, 0.7, uScroll);
  float _ga = 1.0 - spiralArm; float gapDarkening = _ga * sqrt(_ga) * mix(0.25, 0.45, smoothstep(0.15, 0.40, uScroll));
  density *= 1.0 - gapDarkening;
  density = clamp(density, 0.0, 1.0);

  float outerFadeBell = g2((uScroll - 0.62) * 5.0);
  float outerTransparency = outerFadeBell * smoothstep(DISK_INNER + 2.0, DISK_OUTER - 1.0, r) * 0.6;
  density *= 1.0 - outerTransparency;

  float iscoWidth = mix(1.5, 2.5, smoothstep(0.0, 0.35, uScroll));
  float iscoGlow = g2((r - ISCO) * iscoWidth) * 0.35;
  density += iscoGlow * heightFade;

  float temp = remap(r, DISK_INNER, DISK_OUTER, 7000.0, 1200.0);
  temp += turbulence * 1200.0;
  temp += iscoGlow * 2500.0;
  vec3 thermalColor = temperatureToColor(clamp(temp, 800.0, 12000.0));

  float radialPos = smoothstep(DISK_INNER, DISK_OUTER, r);
  vec3 diskColor = thermalColor;

  vec3 whiteHot = vec3(1.0, 0.97, 0.92);
  vec3 hotOrange = vec3(1.0, 0.55, 0.1);
  vec3 warmAmber = vec3(0.9, 0.35, 0.06);
  vec3 deepRed = vec3(0.5, 0.08, 0.02);
  vec3 outerDark = vec3(0.08, 0.04, 0.12);

  vec3 tint;
  if (radialPos < 0.12) {
    tint = mix(whiteHot, hotOrange, radialPos / 0.12);
  } else if (radialPos < 0.3) {
    tint = mix(hotOrange, warmAmber, (radialPos - 0.12) / 0.18);
  } else if (radialPos < 0.55) {
    tint = mix(warmAmber, deepRed, (radialPos - 0.3) / 0.25);
  } else {
    tint = mix(deepRed, outerDark, (radialPos - 0.55) / 0.45);
  }

  float lum = dot(diskColor, vec3(0.2126, 0.7152, 0.0722));
  float tintStrength = mix(0.55, 0.85, smoothstep(0.3, 0.8, radialPos));
  diskColor = mix(thermalColor, tint * lum * 4.5, tintStrength);
  diskColor += whiteHot * iscoGlow * 0.5;

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
  diskColor += vec3(0.06, 0.04, 0.15) * outerEdge * edgeTurb * outerEdgeIntensity;

  float midDiskDim = smoothstep(DISK_INNER + 2.0, DISK_INNER + 5.0, r) * smoothstep(DISK_OUTER - 1.0, DISK_OUTER - 4.0, r);
  diskColor *= 1.0 - midDiskDim * 0.15;

  float flarePhase1 = sin(rotAngle * 1.0 + uTime * 0.4 + r * 0.3);
  float flarePhase2 = sin(rotAngle * 3.0 - uTime * 0.25 + r * 0.8);
  float _ft = max(flarePhase1 * flarePhase2, 0.0); float _ft2 = _ft*_ft; float _ft4 = _ft2*_ft2; float flareTrigger = _ft4 * _ft4;
  float flareMask = smoothstep(DISK_INNER + 0.5, DISK_INNER + 2.5, r) * smoothstep(DISK_OUTER - 2.0, DISK_INNER + 4.0, r);
  diskColor += vec3(1.0, 0.6, 0.15) * flareTrigger * flareMask * 0.15;

  float velTangent = orbitalSpeed * r;
  vec3 orbitalDir = vec3(-sin(angle), 0.0, cos(angle));
  vec3 viewDir = normalize(rd);
  float dopplerRaw = dot(orbitalDir, viewDir) * min(velTangent * 0.15, 1.0);
  float dopplerBoost = 1.0 + dopplerRaw * 0.35;
  diskColor *= dopplerBoost;

  vec3 blueShiftColor = vec3(0.7, 0.7, 1.2);
  vec3 redShiftColor = vec3(1.3, 0.75, 0.6);
  float dopplerColorMix = clamp(dopplerRaw * 2.0, -1.0, 1.0);
  vec3 dopplerTint = dopplerColorMix > 0.0 ? mix(vec3(1.0), blueShiftColor, dopplerColorMix) : mix(vec3(1.0), redShiftColor, -dopplerColorMix);
  diskColor *= dopplerTint;

  float _ie = remap(r, DISK_INNER, DISK_INNER + 1.5, 1.0, 0.0); float innerEmission = _ie * _ie * sqrt(_ie);
  diskColor += vec3(1.0, 0.55, 0.12) * innerEmission * 0.6;
  diskColor += vec3(1.0, 0.85, 0.4) * innerEmission * 0.15;
  float _hi = remap(r, DISK_INNER, DISK_INNER + 0.5, 1.0, 0.0); float _hi2 = _hi*_hi; float hotISCO = _hi2 * _hi2;
  float iscoScrollDim = 1.0 - smoothstep(0.4, 0.8, uScroll) * 0.6;
  diskColor += vec3(1.0, 0.85, 0.5) * hotISCO * 0.3 * iscoScrollDim;
  float _ir = remap(r, DISK_INNER, DISK_INNER + 0.18, 1.0, 0.0); float _ir2 = _ir*_ir; float _ir4 = _ir2*_ir2; float innerRim = _ir4 * _ir4;
  diskColor += vec3(1.0, 0.85, 0.5) * innerRim * 0.3 * iscoScrollDim;

  float _er = max(sin(rotAngle * 1.0 + uTime * 0.08) * sin(uTime * 0.3 + r * 0.5), 0.0); float _er2 = _er*_er; float _er4 = _er2*_er2; float _er8 = _er4*_er4; float eruption = _er8 * _er8;
  float eruptionMask = smoothstep(DISK_INNER, DISK_INNER + 1.5, r) * smoothstep(DISK_INNER + 4.0, DISK_INNER + 2.0, r);
  diskColor += vec3(1.0, 0.75, 0.3) * eruption * eruptionMask * 0.4;

  float gravitationalRedshift = sqrt(max(1.0 - SCHWARZSCHILD_RADIUS / r, 0.01));
  diskColor *= gravitationalRedshift;

  float scrollDim = 1.0 - sqrt(uScroll) * 0.5;
  float closeUpDim = 1.0 - smoothstep(0.4, 0.8, uScroll) * 0.45;
  float earlyBoost = 1.0 + smoothstep(0.4, 0.0, uScroll) * 0.5;
  diskColor *= uIntensity * 0.55 * scrollDim * closeUpDim * earlyBoost;

  float deepShift = smoothstep(0.65, 0.90, uScroll);
  diskColor = mix(diskColor, diskColor * vec3(0.7, 0.75, 1.3), deepShift * 0.4);

  float diskLum = dot(diskColor, vec3(0.2126, 0.7152, 0.0722));
  float satBoost = mix(1.4, 1.05, uScroll);
  diskColor = mix(vec3(diskLum), diskColor, satBoost);
  diskColor = max(diskColor, vec3(0.0));

  return vec4(diskColor * density, density * scrollDim);
}

/* ─── Photon Ring ─── */

float photonRing(vec3 pos) {
  float r = length(pos);

  float ring1 = g2((r - PHOTON_SPHERE) * 12.0);
  float ring2 = g2((r - PHOTON_SPHERE * 1.02) * 18.0) * 0.7;
  float ring3 = g2((r - PHOTON_SPHERE * 0.98) * 22.0) * 0.35;
  float ringWide = g2((r - PHOTON_SPHERE) * 5.0) * 0.15;

  float angle = atan(pos.z, pos.x);
  float shimmer = sin(angle * 30.0 + uTime * 4.0) * 0.12;
  float shimmer2 = sin(angle * 50.0 - uTime * 6.0) * 0.05;

  float heartbeatPhase = uScroll > 0.35 ? 1.0 : 0.0;
  float hbSpeed = 50.0 + max(uScroll - 0.35, 0.0) * 200.0;
  float _hbp = sin(uTime * hbSpeed / 60.0 * 3.14159) * 0.5 + 0.5; float _hbp2 = _hbp*_hbp; float _hbp4 = _hbp2*_hbp2; float heartbeatPulse = heartbeatPhase * (_hbp4 * _hbp4 * 0.2);
  float pulse = sin(uTime * 1.5) * 0.08 + 1.0 + heartbeatPulse;
  float breathe = sin(uTime * 0.4) * 0.1 + 1.0;

  return (ring1 + ring2 + ring3 + ringWide) * (1.0 + shimmer + shimmer2) * pulse * breathe;
}

/* ─── Einstein Ring ─── */

vec3 einsteinRingColor(vec3 rd, vec3 camPos) {
  float viewAngle = acos(clamp(dot(normalize(-camPos), normalize(rd)), -1.0, 1.0));
  float einsteinAngle = sqrt(4.0 * SCHWARZSCHILD_RADIUS / length(camPos));

  float breathe = sin(uTime * 0.6) * 0.1 + 1.0;
  float breathe2 = sin(uTime * 1.1) * 0.04 + 1.0;

  float chromaticSpread = 0.004;
  float ringR = g2((viewAngle - einsteinAngle * (1.0 + chromaticSpread)) * 100.0) * 0.25 * breathe;
  float ringG = g2((viewAngle - einsteinAngle) * 100.0) * 0.18 * breathe;
  float ringB = g2((viewAngle - einsteinAngle * (1.0 - chromaticSpread)) * 100.0) * 0.12 * breathe;

  float glow = g2((viewAngle - einsteinAngle) * 40.0) * 0.1 * breathe2;
  float outerGlow = g2((viewAngle - einsteinAngle) * 18.0) * 0.035;
  float shimmer = sin(viewAngle * 200.0 + uTime * 3.0) * 0.02 + 1.0;

  vec3 ring = vec3(ringR, ringG, ringB) * shimmer + vec3(glow + outerGlow);
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
      float proximity = smoothstep(SCHWARZSCHILD_RADIUS, SCHWARZSCHILD_RADIUS * 0.5, r);
      color = accumulatedDiskColor * (1.0 - proximity * 0.9) * (1.0 - dimBell * 0.5);
      glow += mix(0.4, 0.15, dimBell);
      return;
    }

    if (r > 60.0) {
      vec3 stars = starfield(normalize(vel)) * starBoostFactor;
      vec3 eRingPrismatic = einsteinRingColor(normalize(vel), ro);
      float eRingIntensity = (eRingPrismatic.r + eRingPrismatic.g + eRingPrismatic.b) / 3.0;
      vec3 eRingTint = mix(vec3(0.9, 0.6, 0.2), vec3(0.5, 0.6, 1.0), eRingIntensity * 2.0);
      stars += eRingTint * eRingPrismatic * 2.2 * (1.0 - dimBell * 0.5);
      color = accumulatedDiskColor * (1.0 - dimBell * 0.4) + stars * (1.0 - accumulatedDisk);
      return;
    }

    if (r < 3.0) {
      float photon = photonRing(pos);
      glow = min(glow + photon * 0.065 * (1.0 - dimBell * 0.4), 2.5);
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

    float r3 = r * r * r;
    vec3 gravity = -pos / max(r3, 0.001) * SCHWARZSCHILD_RADIUS * 1.5;

    float adaptiveDt = dt * clamp(r * 0.4, 0.2, 2.0);
    vel += gravity * adaptiveDt;
    vel = normalize(vel);
    pos += vel * adaptiveDt;
  }

  vec3 stars = starfield(normalize(vel)) * starBoostFactor;
  vec3 eRingP2 = einsteinRingColor(normalize(vel), ro);
  float eRingI2 = (eRingP2.r + eRingP2.g + eRingP2.b) / 3.0;
  vec3 eRingT2 = mix(vec3(0.9, 0.6, 0.2), vec3(0.5, 0.6, 1.0), eRingI2 * 2.0);
  stars += eRingT2 * eRingP2 * 2.2 * (1.0 - dimBell * 0.5);
  color = accumulatedDiskColor * (1.0 - dimBell * 0.4) + stars * (1.0 - accumulatedDisk);
}

/* ─── Main ─── */

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

  float scrollEffect = uScroll;
  float approach = smootherstep(0.0, 1.0, scrollEffect);
  float fov = mix(1.4, 0.2, approach);

  vec3 camPos = vec3(
    sin(scrollEffect * 0.4) * 0.3 + sin(uTime * 0.03) * 0.02,
    mix(7.0, 0.06, pow(scrollEffect, 1.2)) + sin(uTime * 0.08) * 0.03,
    mix(38.0, 2.5, pow(scrollEffect, 1.05))
  );

  vec3 target = vec3(0.0, 0.0, 0.0);
  vec3 forward = normalize(target - camPos);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);

  vec2 mouseNorm = (uMouse - 0.5);
  vec2 mouseOffset = mouseNorm * mix(0.06, 0.015, scrollEffect);

  vec2 toMouse = uv - mouseNorm * mix(0.8, 0.2, scrollEffect);
  float mouseDist = length(toMouse);
  float mouseWarp = exp(-mouseDist * mouseDist * mix(8.0, 25.0, scrollEffect)) * mix(0.06, 0.02, scrollEffect);
  vec2 mouseDistort = mouseDist > 0.001 ? normalize(toMouse) * mouseWarp : vec2(0.0);

  vec3 rd = normalize(forward * fov + right * (uv.x + mouseOffset.x + mouseDistort.x) + up * (uv.y + mouseOffset.y + mouseDistort.y));

  float tilt = mix(0.45, 0.02, scrollEffect);
  rd = rotateX(tilt) * rd;

  vec3 color;
  float glow;
  traceRay(camPos, rd, color, glow);

  float scrollGlowDim = 1.0 - sqrt(scrollEffect) * 0.88;
  float glowBell = g2((scrollEffect - 0.62) * 5.0);
  scrollGlowDim *= 1.0 - glowBell * 0.4;
  float earlyGlowBoost = 1.0 + smoothstep(0.2, 0.0, scrollEffect) * 0.4;
  vec3 warmGlow = vec3(0.9, 0.45, 0.08) * glow * 0.12 * scrollGlowDim * earlyGlowBoost;
  vec3 hotGlow = vec3(1.0, 0.7, 0.2) * glow * 0.08 * scrollGlowDim * earlyGlowBoost;
  vec3 deepBlueGlow = vec3(0.08, 0.12, 0.35) * glow * 0.06 * scrollGlowDim;
  vec3 subtleCyan = vec3(0.0, 0.4, 0.45) * glow * 0.04 * scrollGlowDim;
  color += warmGlow + hotGlow + deepBlueGlow + subtleCyan;

  float diskPlaneY = uv.y + 0.12 * (1.0 - scrollEffect);
  float diskHaze = exp(-diskPlaneY * diskPlaneY * mix(15.0, 120.0, scrollEffect));
  float diskRadial = smoothstep(0.7, 0.1, abs(uv.x));
  float earlyHazeBoost = 1.0 + smoothstep(0.2, 0.0, scrollEffect) * 1.5;
  float closeHazeDim = 1.0 - smoothstep(0.4, 0.8, scrollEffect) * 0.85;
  float hazeIntensity = diskHaze * diskRadial * mix(0.18, 0.01, scrollEffect) * scrollGlowDim * earlyHazeBoost * closeHazeDim;
  vec3 hazeColor = mix(vec3(0.45, 0.18, 0.04), vec3(0.1, 0.15, 0.35), smoothstep(-0.3, 0.3, uv.x));
  float hazePulse = 1.0 + sin(uTime * 0.6) * 0.06;
  color += hazeColor * hazeIntensity * hazePulse;

  float diskGlowLine = exp(-diskPlaneY * diskPlaneY * mix(200.0, 600.0, scrollEffect));
  float glowLineRadial = smoothstep(0.55, 0.05, abs(uv.x));
  color += vec3(0.1, 0.15, 0.4) * diskGlowLine * glowLineRadial * mix(0.06, 0.01, scrollEffect);

  float lensDist = length(uv);
  float _lf = max(1.0 - lensDist * 2.0, 0.0); float _lf2 = _lf*_lf; float _lf4 = _lf2*_lf2; float lensFlare = _lf4 * _lf4 * glow * 0.04;
  float _lfe = max(1.0 - lensDist * 1.5, 0.0); float _lfe2 = _lfe*_lfe; float _lfe4 = _lfe2*_lfe2; float lensFlareEarly = _lfe4 * _lfe * glow * 0.02 * (1.0 - uScroll);
  color += vec3(0.3, 0.5, 0.8) * (lensFlare + lensFlareEarly);

  float _am = max(1.0 - abs(uv.x) * 0.5, 0.0); float anamorphic = exp(-abs(uv.y) * 8.0) * _am * _am;
  color += vec3(0.0, 0.2, 0.3) * anamorphic * glow * 0.03;

  float _da = max(1.0 - abs(uv.x) * 0.25, 0.0); float diskAnamorphic = exp(-abs(diskPlaneY) * 10.0) * _da * _da * sqrt(_da);
  float anamorphicDim = 1.0 - smoothstep(0.4, 0.75, scrollEffect) * 0.9;
  color += vec3(0.3, 0.12, 0.04) * diskAnamorphic * mix(0.12, 0.02, scrollEffect) * anamorphicDim;

  float _ll = max(1.0 - abs(uv.x) * 0.8, 0.0); float _ll2 = _ll*_ll; float lightLeak = _ll2 * _ll2 * exp(-abs(uv.y + diskPlaneY * 0.5) * 6.0);
  float lightLeakPulse = sin(uTime * 0.4) * 0.15 + 0.85;
  float lightLeakDim = 1.0 - smoothstep(0.4, 0.75, scrollEffect) * 0.9;
  color += vec3(0.15, 0.06, 0.02) * lightLeak * mix(0.06, 0.01, scrollEffect) * lightLeakPulse * lightLeakDim;

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
  color += vec3(0.3, 0.5, 0.9) * jetIntensity;

  float outerHalo = exp(-lensDist * lensDist * 2.5) * (1.0 - scrollEffect * 0.8) * 0.06;
  color += vec3(0.35, 0.15, 0.05) * outerHalo;

  if (scrollEffect < 0.35) {
    float earlyFade = smoothstep(0.35, 0.0, scrollEffect);
    float warmHalo = exp(-lensDist * lensDist * 1.2) * earlyFade * 0.06;
    color += vec3(0.4, 0.18, 0.04) * warmHalo;
    float cosmicAura = exp(-lensDist * lensDist * 0.6) * earlyFade * 0.025;
    color += vec3(0.2, 0.1, 0.05) * cosmicAura;
  }

  float gravitationalRedshift = 1.0 + smoothstep(0.0, 1.5, 1.0 / (lensDist + 0.1)) * uDistortion * 0.02;
  color *= gravitationalRedshift;

  float innerGlow = exp(-lensDist * lensDist * 8.0) * 0.05 * scrollGlowDim;
  color += vec3(0.6, 0.3, 0.08) * innerGlow;

  if (scrollEffect < 0.4) {
    float galacticCenter = exp(-lensDist * lensDist * 0.8) * smoothstep(0.4, 0.0, scrollEffect) * 0.015;
    vec3 galacticColor = mix(vec3(0.12, 0.06, 0.02), vec3(0.08, 0.05, 0.15), sin(uTime * 0.2) * 0.5 + 0.5);
    color += galacticColor * galacticCenter;
  }

  float blackHoleShadow = smoothstep(0.3, 0.0, lensDist) * (1.0 - scrollEffect * 0.5) * 0.2;
  color *= 1.0 - blackHoleShadow;

  float ehRadius = mix(0.06, 0.35, scrollEffect);
  float ehRing = g2((lensDist - ehRadius) * mix(30.0, 12.0, scrollEffect));
  float ehRingOuter = g2((lensDist - ehRadius) * mix(15.0, 6.0, scrollEffect));
  float ehPulse = sin(uTime * 1.2) * 0.12 + 0.88;
  float ehIntensity = ehRing * smoothstep(0.2, 0.5, scrollEffect) * 0.1 * ehPulse;
  float ehOuterIntensity = ehRingOuter * smoothstep(0.3, 0.6, scrollEffect) * 0.04;
  color += vec3(0.8, 0.4, 0.1) * ehIntensity;
  color += vec3(0.4, 0.18, 0.05) * ehOuterIntensity;

  color = min(color, vec3(1.0));

  float lensShimmer = exp(-lensDist * lensDist * 6.0) * 0.03 * (1.0 - scrollEffect * 0.6);
  float shimmerNoise = sin(uTime * 3.0 + lensDist * 40.0) * 0.5 + 0.5;
  color += color * lensShimmer * shimmerNoise;

  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float satBoost = 1.0 + uScroll * 0.35;
  color = mix(vec3(lum), color, satBoost);
  color = max(color, vec3(0.0));

  gl_FragColor = vec4(color, 1.0);
}
