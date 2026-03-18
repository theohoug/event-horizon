/**
 * @file composite.frag
 * @description Final composite pass: bloom, chromatic aberration,
 *              film grain, vignette, ACES tonemapping, color grading
 * @author Cleanlystudio
 */

precision highp float;

uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScroll;
uniform float uChromaticIntensity;
uniform float uGrainIntensity;
uniform float uVignetteIntensity;
uniform float uBloomMix;
uniform float uScrollVelocity;
uniform float uChapterFlash;
uniform vec4 uShockwaves[4];
uniform float uHoldStrength;
uniform vec2 uMouse;
uniform float uMotionBlur;
uniform float uExplosion;
uniform vec3 uColorShift;
uniform float uInvert;
uniform float uScanLineHardcore;
uniform float uCrtCurvature;
uniform float uRgbSplit;
uniform float uScreenTilt;
uniform float uGlitchBlock;

varying vec2 vUv;

float g2(float x) { return exp(-x * x); }

vec3 acesFilm(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float grain(vec2 uv, float t) {
  float frame = floor(t * 24.0);
  vec2 pixel = uv * uResolution;
  float n1 = hash12(pixel + frame * 17.13);
  float n2 = hash12(pixel * 1.7 + frame * 31.71 + 7.0);
  float deviation = (n1 + n2) * 0.5 - 0.5;
  return 0.5 + deviation * 1.4;
}

vec3 radialBlur(sampler2D tex, vec2 uv, vec2 blurCenter, float strength) {
  vec2 dir = uv - blurCenter;
  float d = length(dir);
  float expStr = strength * (1.0 + pow(d, 3.0) * 8.0);
  vec3 c0 = texture2D(tex, uv).rgb;
  vec3 c1 = texture2D(tex, uv - dir * 0.20 * expStr).rgb;
  vec3 c2 = texture2D(tex, uv - dir * 0.40 * expStr).rgb;
  vec3 c3 = texture2D(tex, uv - dir * 0.60 * expStr).rgb;
  vec3 c4 = texture2D(tex, uv - dir * 0.80 * expStr).rgb;
  return c0 * 0.25 + c1 * 0.24 + c2 * 0.22 + c3 * 0.17 + c4 * 0.12;
}

float lensDirt(vec2 uv) {
  float n1 = hash12(floor(uv * 180.0));
  float n2 = hash12(floor(uv * 90.0 + 31.7));
  float n3 = hash12(floor(uv * 45.0 + 77.3));
  float scratches = max(
    smoothstep(0.97, 1.0, sin(uv.x * 340.0 + uv.y * 80.0)),
    smoothstep(0.98, 1.0, sin(uv.y * 280.0 - uv.x * 120.0))
  ) * 0.6;
  float dust = n1 * n1 * n2 * 0.35 + n3 * n3 * 0.08;
  return clamp(dust + scratches, 0.0, 1.0);
}

void main() {
  vec2 center = vUv - 0.5;
  float dist = length(center);
  float absVel = abs(uScrollVelocity);
  float centerAngle = atan(center.y, center.x);

  float barrelAccel = smoothstep(0.4, 1.0, uScroll);
  float singularityWarp = g2((uScroll - 0.77) * 20.0);
  float velDistort = min(absVel * 0.0015, 0.08) * uScroll;
  float singularityShake = singularityWarp > 0.001 ? singularityWarp * 0.004 * sin(uTime * 25.0) * sin(uTime * 17.3 + 1.7) : 0.0;
  float whiteOutReduce = smoothstep(0.88, 0.98, uScroll);
  float barrelStrength = (uScroll * 0.07 + barrelAccel * 0.10 + singularityWarp * 0.22 + velDistort) * (1.0 - whiteOutReduce * 0.95);
  vec2 distortedUv = vUv + center * dist * dist * barrelStrength + vec2(singularityShake, singularityShake * 0.7);

  float velStretch = min(absVel * 0.0004, 0.02);
  distortedUv.y += center.y * velStretch * sign(uScrollVelocity);

  for (int i = 0; i < 4; i++) {
    vec4 sw = uShockwaves[i];
    if (sw.w > 0.01) {
      float swDist = distance(distortedUv, sw.xy);
      float ring = g2((swDist - sw.z) * 25.0);
      vec2 swDir = swDist > 0.001 ? normalize(distortedUv - sw.xy) : vec2(0.0);
      distortedUv += swDir * ring * sw.w * 0.04;
    }
  }

  vec2 mouseScreenPos = vec2(uMouse.x, uMouse.y);
  float mouseLensActive = smoothstep(0.10, 0.55, uScroll) * smoothstep(0.75, 0.55, uScroll);

#ifdef QUALITY_MEDIUM
  float hazeZone = exp(-dist * dist * 8.0) * smoothstep(0.08, 0.35, dist);
  float hazeActive = smoothstep(0.1, 0.4, uScroll) * smoothstep(0.9, 0.7, uScroll);
  if (hazeActive > 0.01 && hazeZone > 0.01) {
    float hazeN1 = sin(distortedUv.x * 60.0 + uTime * 1.8);
    vec2 hazeOffset = vec2(hazeN1, -hazeN1) * 0.0012 * hazeZone * hazeActive;
    distortedUv += hazeOffset;
  }
#else
  float hazeZone = exp(-dist * dist * 8.0) * smoothstep(0.08, 0.35, dist);
  float hazeActive = smoothstep(0.1, 0.4, uScroll) * smoothstep(0.9, 0.7, uScroll);
  if (hazeActive > 0.01 && hazeZone > 0.01) {
    float hazeN1 = sin(distortedUv.x * 60.0 + uTime * 1.8) * cos(distortedUv.y * 45.0 + uTime * 1.2);
    float hazeN2 = sin(distortedUv.y * 80.0 - uTime * 2.1) * cos(distortedUv.x * 55.0 + uTime * 0.9);
    vec2 hazeOffset = vec2(hazeN1, hazeN2) * 0.0018 * hazeZone * hazeActive;
    distortedUv += hazeOffset;
  }
#endif

  if (uCrtCurvature > 0.001) {
    vec2 crtUv = distortedUv - 0.5;
    float crtDist = dot(crtUv, crtUv);
    distortedUv = distortedUv + crtUv * crtDist * uCrtCurvature;
  }
  if (abs(uScreenTilt) > 0.001) {
    vec2 tiltCenter = distortedUv - 0.5;
    float cTilt = cos(uScreenTilt);
    float sTilt = sin(uScreenTilt);
    distortedUv = vec2(tiltCenter.x * cTilt - tiltCenter.y * sTilt, tiltCenter.x * sTilt + tiltCenter.y * cTilt) + 0.5;
  }

  float edgeFade = 1.0;
  distortedUv = clamp(distortedUv, 0.001, 0.999);

  float resScale = min(uResolution.x, uResolution.y) / 1080.0;
  float chrAngle = centerAngle;
  float chrAngular = 1.0 + sin(chrAngle * 3.0 + uTime * 0.2) * 0.15 * smoothstep(0.3, 0.7, uScroll);
  float chromaticAmount = uChromaticIntensity * (0.3 + dist * 3.0) * resScale * chrAngular;
  vec2 safeCenter = dist > 0.001 ? center / dist : vec2(1.0, 0.0);
  vec2 chromaticOffset = safeCenter * chromaticAmount / uResolution;

  float scrollBlurBoost = 1.0 + smoothstep(0.8, 1.0, uScroll) * 2.0;
  float motionBlurStrength = (min(absVel * 0.0008, 0.06) * uScroll + uScroll * 0.004) * uMotionBlur * scrollBlurBoost;

  vec3 color;
#ifdef QUALITY_MEDIUM
  if (motionBlurStrength > 0.001) {
    vec3 spectralM = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float t = (float(i) - 1.0);
      vec2 sampleUv = distortedUv + chromaticOffset * t;
      vec2 blurDir = (sampleUv - vec2(0.5)) * motionBlurStrength;
      vec3 s = vec3(0.0);
      s += texture2D(tDiffuse, sampleUv).rgb * 0.5;
      s += texture2D(tDiffuse, sampleUv + blurDir * 0.5).rgb * 0.25;
      s += texture2D(tDiffuse, sampleUv - blurDir * 0.5).rgb * 0.25;
      if (i == 0) spectralM.r = s.r;
      else if (i == 1) spectralM.g = s.g;
      else spectralM.b = s.b;
    }
    color = spectralM;
  } else {
    vec2 uvR = distortedUv + chromaticOffset;
    vec2 uvB = distortedUv - chromaticOffset;
    vec3 sR = texture2D(tDiffuse, uvR).rgb;
    vec3 sB = texture2D(tDiffuse, uvB).rgb;
    color = vec3(sR.r, mix(sR.g, sB.g, 0.5), sB.b);
  }
#else
  if (motionBlurStrength > 0.001) {
    vec3 spectral = vec3(0.0);
    float totalW = 0.0;
    for (int i = 0; i < 6; i++) {
      float t = (float(i) - 2.5) / 2.5;
      vec2 sampleUv = distortedUv + chromaticOffset * t;
      vec3 s = radialBlur(tDiffuse, sampleUv, vec2(0.5), motionBlurStrength);
      vec3 w;
      float at = abs(t);
      if (t < -0.33) w = vec3(0.1, 0.0, 0.7 - at * 0.3);
      else if (t < 0.0) w = vec3(0.0, 0.3, 0.5);
      else if (t < 0.33) w = vec3(0.5, 0.3, 0.0);
      else w = vec3(0.7 - at * 0.2, 0.1, 0.0);
      spectral += s * w;
      totalW += (w.r + w.g + w.b) / 3.0;
    }
    color = spectral / totalW;
  } else {
    vec3 spectral = vec3(0.0);
    float totalW = 0.0;
    for (int i = 0; i < 6; i++) {
      float t = (float(i) - 2.5) / 2.5;
      vec2 sampleUv = distortedUv + chromaticOffset * t;
      vec3 s = texture2D(tDiffuse, sampleUv).rgb;
      vec3 w;
      float at = abs(t);
      if (t < -0.33) w = vec3(0.1, 0.0, 0.7 - at * 0.3);
      else if (t < 0.0) w = vec3(0.0, 0.3, 0.5);
      else if (t < 0.33) w = vec3(0.5, 0.3, 0.0);
      else w = vec3(0.7 - at * 0.2, 0.1, 0.0);
      spectral += s * w;
      totalW += (w.r + w.g + w.b) / 3.0;
    }
    color = spectral / totalW;
  }
#endif

  vec3 bloom = texture2D(tBloom, vUv).rgb;
  vec3 bloomEarly = vec3(1.05, 0.97, 0.92);
  vec3 bloomMid = vec3(1.1, 0.88, 0.68);
  vec3 bloomDeep = vec3(1.0, 0.88, 0.75);
  vec3 bloomTint = uScroll < 0.6
    ? mix(bloomEarly, bloomMid, uScroll / 0.6)
    : mix(bloomMid, bloomDeep, (uScroll - 0.6) / 0.4);

  float bloomLumaForDirt = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
  float dirt = lensDirt(vUv) * smoothstep(0.08, 0.4, bloomLumaForDirt);
  vec3 dirtColor = bloom * bloomTint * dirt * 0.35;
  float bloomLuma = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
  float bloomSoftKnee = 1.0 / (1.0 + bloomLuma * 2.0);
  color += bloom * bloomTint * uBloomMix * bloomSoftKnee + dirtColor;

  float anamorphicScroll = smoothstep(0.35, 0.65, uScroll);
  if (anamorphicScroll > 0.01) {
    float anamorphicStreak = exp(-abs(center.y) * 8.0);
    float anamorphicBright = dot(bloom, vec3(0.33)) * anamorphicStreak;
    vec3 anamorphicColor = mix(vec3(1.0, 0.85, 0.65), vec3(1.0, 0.7, 0.4), smoothstep(0.3, 0.8, uScroll));
    color += anamorphicColor * anamorphicBright * 0.12 * anamorphicScroll;
    float streak2 = exp(-abs(center.y) * 16.0);
    vec3 streak2Color = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.6, 0.3), smoothstep(0.4, 0.9, uScroll));
    color += streak2Color * dot(bloom, vec3(0.33)) * streak2 * 0.08 * anamorphicScroll;
  }

  float halationPhase = smoothstep(0.1, 0.4, uScroll);
  if (halationPhase > 0.01) {
    float bloomLuma = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
    float halation = smoothstep(0.15, 0.6, bloomLuma);
    vec3 halationColor = mix(vec3(1.0, 0.88, 0.68), vec3(0.85, 0.65, 0.45), uScroll);
    color += halationColor * halation * 0.035 * halationPhase;
  }

  float preExposure = 0.88 + uScroll * 0.06;
  color *= preExposure;
  color = acesFilm(color);

  float grainValue = grain(gl_FragCoord.xy / uResolution, uTime);
  float grainRaw = grainValue * 2.0 - 1.0;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float grainStrength = 1.0 - sqrt(abs(luminance - 0.5) * 2.0);
  color += grainRaw * uGrainIntensity * grainStrength;

  float v1 = 1.0 - smoothstep(0.55, 1.6, dist * 1.2);
  float v2 = mix(1.0, 1.0 - smoothstep(0.20, 0.70, dist), smoothstep(0.5, 1.0, uScroll) * 0.35);
  float velTunnel = min(absVel * 0.0004, 0.15) * uScroll;
  float v3 = 1.0 - smoothstep(0.25, 0.60, dist) * velTunnel;
  float combinedVignette = mix(1.0, v1 * v2 * v3, uVignetteIntensity);
  color *= combinedVignette;

  float edgeGlow = smoothstep(0.35, 0.55, dist) * smoothstep(0.4, 0.8, uScroll);
  color += vec3(0.03, 0.01, 0.005) * edgeGlow * 0.15;

  float midScrollWarm = smoothstep(0.20, 0.40, uScroll) * smoothstep(0.70, 0.50, uScroll);
  color *= mix(vec3(1.0), vec3(1.08, 1.03, 0.90), midScrollWarm * 0.45);

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 earlyTint = vec3(1.02, 0.99, 0.96);
  vec3 deepTint = vec3(1.02, 0.92, 0.85);
  vec3 colorTint = mix(earlyTint, deepTint, uScroll);
  color = mix(color, color * colorTint, smoothstep(0.2, 0.8, luma) * 0.30);

  float contrast = 1.04 + uScroll * 0.05;
  color = (color - 0.5) * contrast + 0.5;

  float splitLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowTint = vec3(0.05, 0.03, 0.02);
  vec3 highlightTint = vec3(0.04, 0.02, 0.01);
  float shadowMask = 1.0 - smoothstep(0.0, 0.25, splitLuma);
  float highlightMask = smoothstep(0.6, 1.0, splitLuma);
  color += shadowTint * shadowMask * 0.3 * uScroll;
  color += highlightTint * highlightMask * 0.2 * uScroll;

  float earlyWarm = smoothstep(0.25, 0.0, uScroll) * 0.04;
  color.r += earlyWarm * 0.5;
  color.b -= earlyWarm;

  vec3 earlyAmbient = vec3(0.02, 0.015, 0.01);
  vec3 deepAmbient = vec3(0.018, 0.01, 0.006);
  vec3 ambientTint = mix(earlyAmbient, deepAmbient, uScroll);
  float ambientMask = (1.0 - dist * 0.6) * (1.0 + sin(uTime * 0.15 + dist * 3.0) * 0.15);
  color = max(color, ambientTint * ambientMask);

  float arrivalPulse = smoothstep(0.06, 0.0, uScroll);
  if (arrivalPulse > 0.01) {
    float pulseRing = g2((dist - 0.35 + sin(uTime * 0.3) * 0.05) * 8.0);
    float pulseRing2 = g2((dist - 0.55 + cos(uTime * 0.25) * 0.04) * 6.0);
    color += vec3(0.08, 0.04, 0.02) * pulseRing * arrivalPulse * 0.8;
    color += vec3(0.06, 0.035, 0.015) * pulseRing2 * arrivalPulse * 0.5;
    float arrivalGlow = exp(-dist * dist * 3.0) * arrivalPulse;
    color += vec3(0.05, 0.03, 0.015) * arrivalGlow * 0.6;
  }

  float earlyPhase = smoothstep(0.18, 0.0, uScroll);
  if (earlyPhase > 0.01) {
    float nebAngle = centerAngle;
    float nebula1 = sin(nebAngle * 2.0 + uTime * 0.08) * 0.5 + 0.5;
    float nebula2 = sin(nebAngle * 3.0 - uTime * 0.05 + 1.5) * 0.5 + 0.5;
    float nebula3 = sin(nebAngle * 5.0 + uTime * 0.12 + 3.0) * 0.5 + 0.5;
    float _nm = nebula1 * nebula2; float nebMask = _nm * sqrt(_nm) * smoothstep(0.08, 0.40, dist) * smoothstep(0.7, 0.45, dist);
    color += vec3(0.06, 0.03, 0.012) * nebMask * earlyPhase * 0.8;
    color += vec3(0.035, 0.02, 0.008) * nebula1 * smoothstep(0.25, 0.55, dist) * earlyPhase * 0.25;
    float nebWisp = nebula3*nebula3*nebula3 * smoothstep(0.15, 0.35, dist) * smoothstep(0.6, 0.45, dist);
    color += vec3(0.05, 0.025, 0.01) * nebWisp * earlyPhase * 0.3;
  }

  float diskEnhance = smoothstep(0.12, 0.22, uScroll) * smoothstep(0.42, 0.30, uScroll);
  if (diskEnhance > 0.01) {
    float diskY = abs(center.y);
    float diskBand = smoothstep(0.18, 0.04, diskY) * smoothstep(0.0, 0.02, diskY);
    float diskX = smoothstep(0.45, 0.15, abs(center.x));
    float diskMask = diskBand * diskX;

    float diskNoise1 = fract(sin(dot(gl_FragCoord.xy * 0.02, vec2(12.9898, 78.233)) + uTime * 0.5) * 43758.5453);
    float diskNoise2 = fract(sin(dot(gl_FragCoord.xy * 0.035, vec2(93.9898, 67.345)) + uTime * 0.3) * 28456.2314);
    float diskTurbulence = (diskNoise1 * 0.6 + diskNoise2 * 0.4) * 2.0 - 1.0;

    vec3 diskHotspot = mix(vec3(1.0, 0.6, 0.15), vec3(1.0, 0.85, 0.4), diskNoise1);
    color += diskHotspot * diskMask * diskEnhance * 0.08 * max(diskTurbulence, 0.0);

    float diskShimmer = sin(gl_FragCoord.x * 0.15 + uTime * 2.0 + diskNoise1 * 6.28) * 0.5 + 0.5;
    color += vec3(1.0, 0.7, 0.3) * diskShimmer * diskMask * diskEnhance * 0.04;

    color = mix(color, color * vec3(1.08, 0.95, 0.85), diskMask * diskEnhance * 0.3);
  }

  float warpPhase = smoothstep(0.16, 0.22, uScroll) * smoothstep(0.32, 0.26, uScroll);
  if (warpPhase > 0.01) {
    float warpAngle = atan(center.y, center.x);
    float warpStrength = warpPhase * 0.02;
    float warpWave1 = sin(warpAngle * 6.0 + uTime * 0.5 + dist * 12.0) * 0.5 + 0.5;
    float warpWave2 = sin(warpAngle * 4.0 - uTime * 0.3 + dist * 8.0) * 0.5 + 0.5;
    vec2 warpDir = dist > 0.001 ? center / dist : vec2(0.0);
    vec2 tangent = vec2(-warpDir.y, warpDir.x);
    vec2 lensWarp = tangent * sin(dist * 20.0 - uTime * 1.5) * warpStrength * (1.0 - dist * 1.5);
    vec3 warpedSample = texture2D(tDiffuse, distortedUv + lensWarp).rgb;
    color = mix(color, warpedSample, warpPhase * 0.4);

    float arcStreak1 = exp(-abs(sin(warpAngle * 3.0 + uTime * 0.4)) * 20.0) * smoothstep(0.15, 0.30, dist) * smoothstep(0.55, 0.35, dist);
    float arcStreak2 = exp(-abs(sin(warpAngle * 5.0 - uTime * 0.6)) * 25.0) * smoothstep(0.10, 0.25, dist) * smoothstep(0.50, 0.30, dist);
    color += vec3(1.0, 0.85, 0.6) * (arcStreak1 + arcStreak2 * 0.5) * warpPhase * 0.04;

    float lensRipple = g2((dist - 0.25 + sin(uTime * 0.6) * 0.05) * 12.0);
    color += vec3(0.8, 0.6, 0.3) * lensRipple * warpPhase * 0.03;

    float distortGlow = exp(-dist * dist * 4.0) * warpPhase;
    float distortPulse = sin(uTime * 1.2) * 0.15 + 0.85;
    color += vec3(0.15, 0.08, 0.03) * distortGlow * distortPulse * 0.2;
  }

  float photonPhase = smoothstep(0.26, 0.32, uScroll) * smoothstep(0.42, 0.36, uScroll);
  if (photonPhase > 0.01) {
    float photonAngle = atan(center.y, center.x);

    float orbitRadius = 0.18 + sin(uTime * 0.3) * 0.015;
    float orbitRing = g2((dist - orbitRadius) * 25.0);
    float orbitShimmer = sin(photonAngle * 12.0 + uTime * 3.0) * 0.3 + 0.7;
    float orbitShimmer2 = sin(photonAngle * 20.0 - uTime * 5.0) * 0.15 + 0.85;
    color += vec3(1.0, 0.8, 0.45) * orbitRing * orbitShimmer * orbitShimmer2 * photonPhase * 0.08;

    for (int ph = 0; ph < 4; ph++) {
      float phAngle = photonAngle + uTime * (2.0 + float(ph) * 0.8) + float(ph) * 1.571;
      float phX = cos(phAngle) * orbitRadius;
      float phY = sin(phAngle) * orbitRadius;
      float phDist = length(center - vec2(phX, phY));
      float photonDot = exp(-phDist * phDist * 800.0);
      float photonTrail = exp(-phDist * phDist * 150.0) * 0.3;
      vec3 phCol = mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 0.7, 0.3), float(ph) / 4.0);
      color += phCol * (photonDot + photonTrail) * photonPhase * 0.15;
    }

    float capturedLight = exp(-abs(dist - orbitRadius) * 15.0) * photonPhase;
    float capturedPulse = sin(uTime * 2.5 + dist * 30.0) * 0.2 + 0.8;
    color += vec3(0.9, 0.65, 0.3) * capturedLight * capturedPulse * 0.04;

    float photonHalo = g2((dist - orbitRadius) * 8.0);
    color += vec3(0.3, 0.18, 0.06) * photonHalo * photonPhase * sin(uTime * 0.5) * 0.1 * 0.5 + vec3(0.3, 0.18, 0.06) * photonHalo * photonPhase * 0.05;
  }

  float cosmicBreath = smoothstep(0.05, 0.15, uScroll) * smoothstep(0.50, 0.35, uScroll);
  if (cosmicBreath > 0.01) {
    float breathWave = sin(uTime * 0.25) * 0.5 + 0.5;
    float breathWave2 = sin(uTime * 0.18 + 2.0) * 0.5 + 0.5;
    float breathMask = smoothstep(0.15, 0.40, dist) * smoothstep(0.65, 0.50, dist);
    float breathGlow = breathWave * breathMask * cosmicBreath;
    color += vec3(0.02, 0.012, 0.006) * breathGlow * 0.5;
    color *= 1.0 + breathWave2 * breathMask * cosmicBreath * 0.04;
  }

  float hbActive = smoothstep(0.33, 0.38, uScroll);
  if (hbActive > 0.01) {
    float hbBpm = 50.0 + max(uScroll - 0.35, 0.0) * 200.0;
    float hbPhase = uTime * hbBpm / 60.0 * 3.14159;
    float _hb = max(sin(hbPhase), 0.0); float _hb2 = _hb*_hb; float _hb4 = _hb2*_hb2;
    float hbPulse = _hb4 * _hb4 * _hb4 * hbActive;
    float hbIntensity = smoothstep(0.33, 0.55, uScroll) * smoothstep(0.85, 0.70, uScroll);
    color *= 1.0 + hbPulse * 0.06 * hbIntensity;
    color *= max(1.0 - dist * hbPulse * 0.22 * hbIntensity, 0.88);
  }

  float spaghettiPhase = smoothstep(0.43, 0.48, uScroll) * smoothstep(0.62, 0.52, uScroll);
  if (spaghettiPhase > 0.01) {
    float waveTime = uTime * 0.8;
    vec2 waveDir = dist > 0.001 ? center / dist : vec2(0.0);

    float vertStretch = sin(center.x * 25.0 + uTime * 2.0) * 0.008 * spaghettiPhase;
    vec2 stretchUv = distortedUv + vec2(0.0, vertStretch * (1.0 + dist * 3.0));
    vec3 stretchedCol = texture2D(tDiffuse, stretchUv).rgb;
    color = mix(color, stretchedCol, spaghettiPhase * 0.5);

#ifdef QUALITY_MEDIUM
    float wR = mod(waveTime, 2.0);
    float wave = g2((dist - wR * 0.4) * 22.0);
    vec2 wOff = waveDir * wave * 0.02 * spaghettiPhase;
    vec3 wCol = texture2D(tDiffuse, distortedUv + wOff).rgb;
    color = mix(color, wCol, wave * spaghettiPhase * 0.35);
    color += vec3(1.0, 0.7, 0.3) * wave * spaghettiPhase * 0.06;
#else
    for (int w = 0; w < 3; w++) {
      float wR = mod(waveTime + float(w) * 0.6, 2.0);
      float wave = g2((dist - wR * 0.4) * 22.0);
      vec2 wOff = waveDir * wave * 0.025 * spaghettiPhase;
      vec3 wCol = texture2D(tDiffuse, distortedUv + wOff).rgb;
      color = mix(color, wCol, wave * spaghettiPhase * 0.4);
      vec3 wTint = mix(vec3(1.0, 0.7, 0.3), vec3(1.0, 0.4, 0.1), float(w) / 3.0);
      color += wTint * wave * spaghettiPhase * 0.08;
    }
#endif

    float tearY = sin(uTime * 0.5) * 0.03;
    float tear = exp(-pow(center.y - tearY, 2.0) * 800.0) * spaghettiPhase;
    vec2 tearUp = distortedUv + vec2(0.0, tear * 0.04);
    vec2 tearDown = distortedUv - vec2(0.0, tear * 0.04);
    vec3 tornUp = texture2D(tDiffuse, tearUp).rgb;
    vec3 tornDown = texture2D(tDiffuse, tearDown).rgb;
    color = mix(color, (tornUp + tornDown) * 0.5, tear * 0.6);
    color += vec3(1.0, 0.8, 0.4) * tear * 0.15;
  }

  float timeDilPhase = smoothstep(0.52, 0.58, uScroll) * smoothstep(0.70, 0.64, uScroll);
  if (timeDilPhase > 0.01) {
    float rippleSpeed = uTime * 1.2;
    float ripple1 = sin(dist * 40.0 - rippleSpeed * 2.0) * 0.5 + 0.5;
    float ripple2 = sin(dist * 25.0 + rippleSpeed * 1.5) * 0.5 + 0.5;
    float _rp = ripple1 * ripple2; float rippleCombined = _rp * _rp * _rp;
    float rippleMask = exp(-dist * dist * 5.0);
    color += vec3(0.06, 0.03, 0.015) * rippleCombined * rippleMask * timeDilPhase;

#ifdef QUALITY_MEDIUM
    float timeStretchM = sin(uTime * 0.3) * 0.002 * timeDilPhase;
    vec2 stretchUvM = distortedUv + vec2(0.0, timeStretchM * (1.0 - dist * 2.0));
    vec3 stretchedColorM = texture2D(tDiffuse, stretchUvM).rgb;
    color = mix(color, stretchedColorM, timeDilPhase * 0.15);
#else
    float timeStretch = sin(uTime * 0.3) * 0.003 * timeDilPhase;
    vec2 stretchUv = distortedUv + vec2(0.0, timeStretch * (1.0 - dist * 2.0));
    vec3 stretchedColor = texture2D(tDiffuse, stretchUv).rgb;
    color = mix(color, stretchedColor, timeDilPhase * 0.2);
#endif

    float clockRing = g2((dist - 0.25) * 20.0);
    float _ct = fract(uTime * 0.15); float clockTick = mix(1.0, _ct, 0.15) * 0.5;
    color += vec3(0.08, 0.04, 0.02) * clockRing * clockTick * timeDilPhase;
  }

  float lastStarPhase = smoothstep(0.28, 0.35, uScroll) * smoothstep(0.55, 0.42, uScroll);
  if (lastStarPhase > 0.01) {
    float starAngle = uTime * 0.05;
    vec2 starPos = vec2(0.32 + sin(starAngle) * 0.02, 0.65 + cos(starAngle * 0.7) * 0.015);
    float starDist = length(vUv - starPos);
    float starCore = exp(-starDist * starDist * 8000.0) * lastStarPhase;
    float starGlow = exp(-starDist * starDist * 200.0) * lastStarPhase;
    float starHalo = exp(-starDist * starDist * 30.0) * lastStarPhase;
    float starPulse = 0.7 + sin(uTime * 1.5) * 0.3;
    float starFlicker = 0.9 + sin(uTime * 7.3 + 2.1) * 0.1;
    float dying = smoothstep(0.42, 0.52, uScroll);
    float dyingFlicker = dying > 0.1 ? (0.5 + sin(uTime * 15.0) * 0.5 * dying) : 1.0;
    vec3 starColor = vec3(0.95, 0.92, 1.0);
    color += starColor * starCore * 1.2 * starPulse * starFlicker * dyingFlicker;
    color += vec3(1.0, 0.9, 0.75) * starGlow * 0.4 * starPulse * dyingFlicker;
    color += vec3(0.8, 0.65, 0.45) * starHalo * 0.08 * starPulse;
  }

  float flareActive = smoothstep(0.25, 0.35, uScroll) * smoothstep(0.82, 0.72, uScroll);
  if (flareActive > 0.01) {
    float _fl = max(sin(uTime * 0.7 + uScroll * 12.0), 0.0); float _fl2 = _fl*_fl; float _fl4 = _fl2*_fl2;
    float flarePulse = _fl4 * _fl4 * _fl4;
    float flareCenter = exp(-dist * dist * 5.0);
    color += vec3(0.18, 0.10, 0.03) * flarePulse * flareActive * flareCenter * 0.35;
    float flareStreak = exp(-abs(center.y) * 12.0) * flarePulse * flareActive * 0.08;
    color += vec3(0.12, 0.06, 0.02) * flareStreak;
  }

  float speedLinePhase = smoothstep(0.60, 0.78, uScroll);
  if (speedLinePhase > 0.01) {
    float angle = centerAngle;
    float _sl = abs(sin(angle * 40.0 + uTime * 2.0)); float _sl2 = _sl*_sl; float _sl4 = _sl2*_sl2; float _sl8 = _sl4*_sl4; float _sl16 = _sl8*_sl8;
    float speedLine = _sl16 * _sl4;
    float speedFade = exp(-dist * dist * 3.0);
    float speedEdge = smoothstep(0.05, 0.15, dist);
    color += vec3(0.08, 0.04, 0.03) * speedLine * speedFade * speedEdge * speedLinePhase * 0.35;

    float _sk = abs(sin(angle * 80.0 - uTime * 3.5)); float _sk2 = _sk*_sk; float _sk4 = _sk2*_sk2; float _sk8 = _sk4*_sk4; float _sk16 = _sk8*_sk8;
    float streakLine = _sk16 * _sk8 * _sk4 * _sk2;
    color += vec3(0.06, 0.03, 0.02) * streakLine * speedFade * speedEdge * speedLinePhase * 0.25;
  }

  float riftPhase = g2((uScroll - 0.50) * 16.0);
  if (riftPhase > 0.01) {
    float riftY = center.y + sin(uTime * 0.8) * 0.02;
    float riftLine = g2(riftY * 80.0);
    float riftTear = smoothstep(0.0, 0.003, riftLine);
    float riftNoise = fract(sin(dot(gl_FragCoord.xy * 0.01, vec2(12.9898, 78.233)) + uTime * 3.0) * 43758.5453);
    float riftJag = sin(center.x * 120.0 + uTime * 5.0) * 0.004 * riftPhase;
    float riftMask = g2((center.y + riftJag) * 60.0) * riftPhase;

#ifdef QUALITY_MEDIUM
    color += vec3(1.0, 0.6, 0.25) * riftLine * riftPhase * 0.25;
    color += vec3(1.0, 0.95, 0.9) * riftNoise * riftMask * 0.10;
  }
#else
    vec2 riftUvUp = distortedUv + vec2(0.0, riftMask * 0.03);
    vec2 riftUvDown = distortedUv - vec2(0.0, riftMask * 0.03);
    vec3 riftColorUp = texture2D(tDiffuse, riftUvUp).rgb;
    vec3 riftColorDown = texture2D(tDiffuse, riftUvDown).rgb;
    vec3 riftRevealed = vec3(1.0) - (riftColorUp + riftColorDown) * 0.5;

    color = mix(color, riftRevealed, riftMask * 0.7);
    color += vec3(1.0, 0.6, 0.25) * riftLine * riftPhase * 0.35;
    color += vec3(1.0, 0.95, 0.9) * riftNoise * riftMask * 0.15;

    float riftGlitch = step(0.97, riftNoise) * riftPhase;
    if (riftGlitch > 0.5) {
      float glitchShift = (riftNoise - 0.97) * 30.0;
      vec2 glitchUv = distortedUv + vec2(glitchShift * 0.02, 0.0);
      color = texture2D(tDiffuse, glitchUv).rgb;
    }
  }
#endif

  float noReturnPhase = g2((uScroll - 0.37) * 50.0);
  if (noReturnPhase > 0.01) {
    float blackoutWave = noReturnPhase * noReturnPhase;
    color *= 1.0 - blackoutWave * 0.35;
    float _rf = max(noReturnPhase - 0.3, 0.0) * 1.43; float recoverFlash = _rf * _rf;
    color += vec3(1.0, 0.85, 0.6) * recoverFlash * 0.12;
  }

  float horizonPeak = g2((uScroll - 0.65) * 50.0);
  color += vec3(1.0, 0.95, 0.9) * horizonPeak * 0.10;

  float singularityEntry = g2((uScroll - 0.67) * 70.0);
  if (singularityEntry > 0.01) {
    float sFlash = singularityEntry * singularityEntry * sqrt(singularityEntry);
    float sCenterBlast = exp(-dist * dist * 4.0);
    color = mix(color, vec3(1.0, 0.98, 0.95), sFlash * sCenterBlast * 0.18);
    color += vec3(0.5, 0.3, 0.15) * sFlash * (1.0 - sCenterBlast) * 0.12;
    float sRing = g2((dist - singularityEntry * 0.6) * 12.0);
    color += vec3(1.0, 0.6, 0.2) * sRing * sFlash * 0.15;
  }

  float climaxHeat = smoothstep(0.65, 0.78, uScroll) * smoothstep(0.88, 0.82, uScroll);
  float heatCenter = 1.0 - smoothstep(0.0, 0.35, dist);
  color += vec3(0.06, 0.02, 0.0) * climaxHeat * heatCenter * 0.8;
  color += vec3(0.02, 0.01, 0.03) * climaxHeat * (1.0 - heatCenter) * 0.4;

  float voidBlackout = g2((uScroll - 0.82) * 35.0) * (1.0 - smoothstep(0.0, 0.1, uExplosion));
  color *= 1.0 - voidBlackout * 0.35;

  float deepVoid = smoothstep(0.75, 1.0, uScroll) * (1.0 - smoothstep(0.0, 0.1, uExplosion));
  color = mix(color, color * vec3(0.82, 0.72, 0.65), deepVoid * 0.20);
  color *= 1.0 - deepVoid * 0.12;

  float voidChapter = smoothstep(0.80, 0.84, uScroll) * smoothstep(0.92, 0.88, uScroll);
  if (voidChapter > 0.01) {
    float voidBreath = sin(uTime * 0.35) * 0.5 + 0.5;
    float voidBreath2 = sin(uTime * 0.2 + 1.5) * 0.5 + 0.5;

    float voidDarken = voidChapter * (0.45 + voidBreath * 0.15);
    color *= 1.0 - voidDarken;

    /* abyssPull center darkening removed */

    float voidPulseRing = g2((dist - 0.12 - voidBreath * 0.08) * 18.0);
    float voidPulseRing2 = g2((dist - 0.28 - voidBreath2 * 0.06) * 12.0);
    color += vec3(0.03, 0.008, 0.06) * voidPulseRing * voidChapter * 0.12;
    color += vec3(0.015, 0.005, 0.04) * voidPulseRing2 * voidChapter * 0.08;

    float voidAngle = centerAngle;
    float _vw = abs(sin(voidAngle * 2.0 + uTime * 0.12 + dist * 5.0)); float _vw2 = _vw*_vw; float _vw4 = _vw2*_vw2;
    float voidWisp = _vw4 * _vw4 * _vw4;
    float voidWispMask = exp(-dist * dist * 6.0) * (1.0 - exp(-dist * dist * 120.0));
    color += vec3(0.02, 0.006, 0.04) * voidWisp * voidWispMask * voidChapter * 0.15;

    float voidNoise = fract(sin(dot(gl_FragCoord.xy * 0.003, vec2(12.9898, 78.233)) + uTime * 0.3) * 43758.5453);
    float voidSpeck = step(0.998, voidNoise) * exp(-dist * 3.0);
    color += vec3(0.06, 0.03, 0.10) * voidSpeck * voidChapter * 0.2;

    color += vec3(0.008, 0.002, 0.015) * (1.0 - exp(-dist * 4.0)) * voidChapter * 0.15;

    float lastLightDist = length(vUv - vec2(0.62, 0.38));
    float lastLight = exp(-lastLightDist * lastLightDist * 3000.0);
    float lastLightGlow = exp(-lastLightDist * lastLightDist * 200.0);
    float lastLightPulse = 0.6 + sin(uTime * 0.8) * 0.4;
    color += vec3(0.9, 0.85, 1.0) * lastLight * voidChapter * 0.6 * lastLightPulse;
    color += vec3(0.4, 0.25, 0.15) * lastLightGlow * voidChapter * 0.04 * lastLightPulse;

    float voidLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(voidLuma * 0.72, voidLuma * 0.78, voidLuma * 0.90), voidChapter * 0.60);

    float voidBottom = smoothstep(0.55, 0.35, vUv.y);
    color = mix(color, color * vec3(0.65, 0.55, 0.48), voidBottom * voidChapter * 0.5);
    color *= 1.0 - voidBottom * voidChapter * 0.25;

    float echoTime = uTime * 0.4;
    float _e1 = max(sin(echoTime), 0.0); float _e1_2 = _e1*_e1; float _e1_4 = _e1_2*_e1_2; float _e1_8 = _e1_4*_e1_4; float _e1_16 = _e1_8*_e1_8;
    float echo1 = _e1_16 * _e1_16 * _e1_8;
    float _e2 = max(sin(echoTime * 0.7 + 2.0), 0.0); float _e2_2 = _e2*_e2; float _e2_4 = _e2_2*_e2_2; float _e2_8 = _e2_4*_e2_4; float _e2_16 = _e2_8*_e2_8;
    float echo2 = _e2_16 * _e2_16 * _e2_8;
    float echoRing1 = g2((dist - 0.15) * 20.0) * echo1;
    float echoRing2 = g2((dist - 0.30) * 15.0) * echo2;
    color += vec3(0.08, 0.04, 0.02) * echoRing1 * voidChapter * 0.15;
    color += vec3(0.03, 0.02, 0.06) * echoRing2 * voidChapter * 0.10;
  }

  /* Event horizon post-process shadow removed */

  float nebulaPhase = smoothstep(0.15, 0.45, uScroll) * smoothstep(0.75, 0.55, uScroll);
  if (nebulaPhase > 0.01) {
    float nAngle = centerAngle;
    float nebulaDist = dist * 3.0;
    float n1 = sin(nAngle * 3.0 + uTime * 0.15 + nebulaDist * 2.0) * 0.5 + 0.5;
    float n2 = sin(nAngle * 5.0 - uTime * 0.1 + nebulaDist * 3.0) * 0.5 + 0.5;
    float _nn = n1 * n2; float nebulaMask = _nn * _nn * exp(-dist * dist * 2.5);
    vec3 nebulaWarm = vec3(0.10, 0.05, 0.14);
    vec3 nebulaCool = vec3(0.03, 0.06, 0.12);
    vec3 nebulaColor = mix(nebulaCool, nebulaWarm, n1);
    color += nebulaColor * nebulaMask * nebulaPhase * 0.15;
  }

  float abyssEdge = smoothstep(0.85, 1.0, uScroll) * (1.0 - smoothstep(0.0, 0.1, uExplosion));
  color *= 1.0 - smoothstep(0.08, 0.45, dist) * abyssEdge * 0.5;

  float singularity = smoothstep(0.85, 1.0, uScroll) * (1.0 - smoothstep(0.0, 0.15, uExplosion));
  float singLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, color * 1.5, singularity * 0.35);
  color = mix(vec3(singLuma), color, 1.0 + singularity * 0.6);

  float inversionPeak = g2((uScroll - 0.77) * 35.0);
  if (inversionPeak > 0.01) {
    float _ip2 = inversionPeak * inversionPeak;
    float _ip4 = _ip2 * _ip2;
    float preDarken = inversionPeak * 0.15;
    color *= 1.0 - preDarken * exp(-dist * dist * 2.0);

    vec3 preInvColor = color;
    vec3 inverted = vec3(1.0) - color;
    color = mix(color, inverted, inversionPeak * 0.12);
    color = min(color, preInvColor + 0.2);

    float singAngle = centerAngle;
    float singRipple = sin(dist * 50.0 - uTime * 3.0) * 0.5 + 0.5;
    float singRipple2 = sin(dist * 30.0 + uTime * 2.0 + singAngle * 4.0) * 0.5 + 0.5;
    float rippleMask = exp(-dist * dist * 3.0);
    vec3 rippleColor = mix(vec3(0.4, 0.3, 1.0), vec3(1.0, 0.4, 0.1), singRipple2);
    float _sr = singRipple * singRipple2; float _sr2 = _sr*_sr; color += rippleColor * _sr2 * sqrt(_sr) * rippleMask * inversionPeak * 0.12;

    float distortRing1 = g2((dist - 0.15 - sin(uTime * 1.5) * 0.05) * 25.0);
    float distortRing2 = g2((dist - 0.30 + cos(uTime * 1.2) * 0.04) * 20.0);
    float distortRing3 = g2((dist - 0.08 - sin(uTime * 2.2) * 0.03) * 35.0);
    color += vec3(0.6, 0.5, 1.0) * distortRing1 * inversionPeak * 0.07;
    color += vec3(1.0, 0.5, 0.2) * distortRing2 * inversionPeak * 0.06;
    color += vec3(1.0, 0.9, 0.7) * distortRing3 * inversionPeak * 0.05;

    float scanline = sin(gl_FragCoord.y * 2.0 + uTime * 8.0) * 0.5 + 0.5;
    float _sc2 = scanline*scanline; float _sc4 = _sc2*_sc2; float _sc8 = _sc4*_sc4; float _sc16 = _sc8*_sc8;
    scanline = _sc16 * _sc4;
    color *= 1.0 - scanline * inversionPeak * 0.05;

    float centerBlast = exp(-dist * dist * 10.0);
    color += vec3(1.0, 0.92, 0.80) * centerBlast * _ip2 * inversionPeak * 0.06;

    float flash = _ip4 * _ip2;
    color = mix(color, vec3(1.0, 0.97, 0.92), flash * 0.03);

    float negativeFlash = _ip4 * _ip4 * _ip2;
    vec3 negative = vec3(1.0) - clamp(color, 0.0, 1.0);
    color = mix(color, negative, negativeFlash * 0.06);

    float timeFreeze = _ip4;
    float freezeGrain = fract(sin(dot(gl_FragCoord.xy * 0.1, vec2(12.9898, 78.233)) + floor(uTime * 2.0) * 43.7) * 43758.5453);
    color = mix(color, color * (0.85 + freezeGrain * 0.3), timeFreeze * 0.15);

    float singVig = smoothstep(0.25, 0.55, dist);
    color *= 1.0 - singVig * inversionPeak * 0.5;
  }

  float voidOverride = smoothstep(0.83, 0.87, uScroll) * smoothstep(0.93, 0.89, uScroll) * (1.0 - smoothstep(0.0, 0.1, uExplosion));
  if (voidOverride > 0.01) {
    float voLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(voLuma * 0.65, voLuma * 0.70, voLuma * 0.82), voidOverride * 0.65);
    color *= 1.0 - voidOverride * 0.4;
  }

  float ch = uScroll * 9.0;
  vec3 chAtmo;
  if (ch < 1.0) chAtmo = vec3(0.025, 0.02, 0.06);
  else if (ch < 2.0) chAtmo = mix(vec3(0.025, 0.02, 0.06), vec3(0.05, 0.025, 0.06), fract(ch));
  else if (ch < 3.0) chAtmo = mix(vec3(0.05, 0.025, 0.06), vec3(0.06, 0.03, 0.05), fract(ch));
  else if (ch < 4.0) chAtmo = mix(vec3(0.06, 0.03, 0.05), vec3(0.07, 0.025, 0.03), fract(ch));
  else if (ch < 5.0) chAtmo = mix(vec3(0.07, 0.025, 0.03), vec3(0.05, 0.015, 0.07), fract(ch));
  else if (ch < 6.0) chAtmo = mix(vec3(0.05, 0.015, 0.07), vec3(0.04, 0.012, 0.08), fract(ch));
  else if (ch < 7.0) chAtmo = mix(vec3(0.04, 0.012, 0.08), vec3(0.025, 0.008, 0.05), fract(ch));
  else if (ch < 8.0) chAtmo = mix(vec3(0.025, 0.008, 0.05), vec3(0.008, 0.003, 0.015), fract(ch));
  else chAtmo = vec3(0.0);
  float chAtmoMask = 1.0 - smoothstep(0.0, 0.5, dist);
  color += chAtmo * chAtmoMask * 0.3;

  float chapterFlash = uChapterFlash;
  color += vec3(0.12, 0.15, 0.35) * chapterFlash * 0.3;
  color = mix(color, color * vec3(1.15, 1.2, 1.4), chapterFlash * 0.2);
  color *= max(1.0 - dist * chapterFlash * 0.5, 0.7);

  if (chapterFlash > 0.05) {
    float leakAngle = uTime * 0.3 + uScroll * 6.0;
    vec2 leakDir = vec2(cos(leakAngle), sin(leakAngle));
    float leakDot = dot(normalize(center + 0.001), leakDir);
    float _ld = max(leakDot, 0.0); float leakMask = _ld * _ld * _ld;
    vec3 leakColor = mix(vec3(0.15, 0.12, 0.25), vec3(0.05, 0.2, 0.18), uScroll);
    color += leakColor * leakMask * chapterFlash * 0.4;

    float gateDist = max(abs(center.x * 1.2), abs(center.y * 0.8));
    float gateEdge = smoothstep(0.45, 0.52, gateDist);
    color += vec3(0.08, 0.04, 0.01) * gateEdge * chapterFlash * 0.3;

    float anamFlash = exp(-abs(center.y) * 8.0) * chapterFlash;
    vec3 anamColor = mix(vec3(1.0, 0.85, 0.65), vec3(0.9, 0.6, 0.3), uScroll);
    color += anamColor * anamFlash * 0.15;
  }

  color = max(color, 0.0);

  if (uHoldStrength > 0.01) {
    float holdPulse = sin(uTime * 12.0) * 0.5 + 0.5;
    color *= 1.0 + uHoldStrength * holdPulse * 0.15;
    float holdLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(holdLuma), uHoldStrength * 0.3);
    float holdRing = g2((dist - 0.3 - uHoldStrength * 0.1) * 15.0);
    color += vec3(1.0, 0.7, 0.3) * holdRing * uHoldStrength * 0.2;
  }

  float deepGlitch = smoothstep(0.68, 0.80, uScroll) * smoothstep(0.92, 0.85, uScroll);
  if (deepGlitch > 0.01) {
    float glitchTime = floor(uTime * 5.0);
    float glitchRand = fract(sin(glitchTime * 91.7) * 43758.5453);
#ifdef QUALITY_MEDIUM
    if (glitchRand > 0.95) {
      float scanY = gl_FragCoord.y / uResolution.y;
      float tearLine = floor(scanY * 20.0) / 20.0;
      float tearNoise = fract(sin(tearLine * 127.1 + glitchTime * 311.7) * 43758.5453);
      if (tearNoise > 0.96) {
        float tearShift = (tearNoise - 0.96) * 25.0 * 0.012 * deepGlitch;
        vec2 tearUv = distortedUv + vec2(tearShift, 0.0);
        vec3 tearColor = texture2D(tDiffuse, tearUv).rgb;
        color = mix(color, tearColor, deepGlitch * 0.3);
      }
    }
#else
    if (glitchRand > 0.92) {
      float scanY = gl_FragCoord.y / uResolution.y;
      float tearLine = floor(scanY * 30.0) / 30.0;
      float tearNoise = fract(sin(tearLine * 127.1 + glitchTime * 311.7) * 43758.5453);
      if (tearNoise > 0.95) {
        float tearShift = (tearNoise - 0.95) * 20.0 * 0.015 * deepGlitch;
        vec2 tearUv = distortedUv + vec2(tearShift, 0.0);
        vec3 tearColor = texture2D(tDiffuse, tearUv).rgb;
        color = mix(color, tearColor, deepGlitch * 0.4);
        color.r = mix(color.r, texture2D(tDiffuse, tearUv + vec2(0.003, 0.0)).r, deepGlitch * 0.3);
      }
    }
#endif
  }

  float hawkingPhase = smoothstep(0.84, 0.89, uScroll) * smoothstep(0.96, 0.91, uScroll);
  if (hawkingPhase > 0.01) {
    float thermalGlow = exp(-dist * dist * 2.5) * hawkingPhase;
    vec3 thermalColor = mix(vec3(0.12, 0.10, 0.20), vec3(0.3, 0.18, 0.08), sin(uTime * 0.3) * 0.5 + 0.5);
    color += thermalColor * thermalGlow * 0.18;

    float pairPhase1 = uTime * 0.4;
    float pairR1 = 0.15 + sin(pairPhase1) * 0.08;
    float pairRing1 = g2((dist - pairR1) * 22.0);
    float pairSlice1 = sin(centerAngle * 3.0 + uTime * 0.2) * 0.5 + 0.5;
    pairSlice1 *= pairSlice1 * pairSlice1;
    color += vec3(0.15, 0.12, 0.35) * pairRing1 * pairSlice1 * hawkingPhase * 0.1;

    float pairPhase2 = uTime * 0.4 + 2.094;
    float pairR2 = 0.15 + sin(pairPhase2) * 0.08;
    float pairRing2 = g2((dist - pairR2) * 22.0);
    float pairSlice2 = sin(centerAngle * 3.0 + 3.0 + uTime * 0.2) * 0.5 + 0.5;
    pairSlice2 *= pairSlice2 * pairSlice2;
    color += vec3(0.4, 0.2, 0.1) * pairRing2 * pairSlice2 * hawkingPhase * 0.1;

    float pairPhase3 = uTime * 0.4 + 4.189;
    float pairR3 = 0.15 + sin(pairPhase3) * 0.08;
    float pairRing3 = g2((dist - pairR3) * 22.0);
    float pairSlice3 = sin(centerAngle * 5.0 + 1.5 + uTime * 0.15) * 0.5 + 0.5;
    pairSlice3 *= pairSlice3 * pairSlice3;
    color += vec3(0.15, 0.25, 0.4) * pairRing3 * pairSlice3 * hawkingPhase * 0.08;

    float lowerHalf = smoothstep(0.55, 0.30, vUv.y);
    float shimmer = sin(vUv.x * 80.0 + uTime * 2.0) * sin(vUv.y * 60.0 - uTime * 1.5);
    shimmer = max(shimmer, 0.0);
    color += vec3(0.06, 0.05, 0.12) * shimmer * lowerHalf * hawkingPhase * 0.18;

    float horizonBand = g2((vUv.y - 0.42) * 15.0);
    float holoPattern = sin(vUv.x * 200.0 + uTime * 3.0) * sin(vUv.x * 127.0 - uTime * 1.7);
    holoPattern = max(holoPattern, 0.0);
    color += vec3(0.03, 0.06, 0.12) * holoPattern * horizonBand * hawkingPhase * 0.18;

    float outerGlow = smoothstep(0.25, 0.45, dist) * smoothstep(0.65, 0.50, dist);
    float outerPulse = sin(uTime * 0.5 + dist * 8.0) * 0.5 + 0.5;
    color += vec3(0.04, 0.03, 0.08) * outerGlow * outerPulse * hawkingPhase * 0.10;
  }

  float remainsPhase = smoothstep(0.89, 0.94, uScroll) * smoothstep(0.99, 0.96, uScroll) * (1.0 - smoothstep(0.0, 0.15, uExplosion));
  if (remainsPhase > 0.01) {
    float remainsLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(remainsLuma * 0.70, remainsLuma * 0.75, remainsLuma * 1.0), remainsPhase * 0.75);
    float remainsVig = smoothstep(0.10, 0.45, dist);
    color *= 1.0 - remainsVig * remainsPhase * 0.35;
    float remainsBottom = smoothstep(0.35, 0.55, vUv.y);
    color = mix(color, color * vec3(0.6, 0.52, 0.45), (1.0 - remainsBottom) * remainsPhase * 0.6);
    float remainsMid = smoothstep(0.55, 0.40, vUv.y) * smoothstep(0.25, 0.35, vUv.y);
    color = mix(color, color * vec3(0.7, 0.6, 0.52), remainsMid * remainsPhase * 0.45);
    float remainsTop = smoothstep(0.70, 0.85, vUv.y);
    color = mix(color, color * vec3(0.82, 0.75, 0.68), remainsTop * remainsPhase * 0.25);
    color *= 1.0 - remainsPhase * 0.20;
  }

  float explosionActive = smoothstep(0.0, 0.15, uExplosion);
  float whiteOutPhase = smoothstep(0.93, 1.0, uScroll) * (1.0 - explosionActive);
  if (whiteOutPhase > 0.001) {
    float whiteRadius = whiteOutPhase * 1.4;
    float whiteMask = smoothstep(whiteRadius, max(0.0, whiteRadius - 0.45), dist);
    float whiteEdge = g2((dist - whiteRadius + 0.12) * 10.0);
    vec3 whiteTarget = vec3(0.96, 0.95, 0.93);
    float whitePow = whiteOutPhase * sqrt(sqrt(whiteOutPhase));
    color = mix(color, whiteTarget, whiteMask * whitePow);
    color = mix(color, whiteTarget, whiteOutPhase*whiteOutPhase*whiteOutPhase * 0.5);
    color += whiteTarget * whiteEdge * whiteOutPhase * 0.15;
    float whiteFlicker = sin(uTime * 6.0 + dist * 15.0) * 0.01 * whiteOutPhase;
    color += vec3(whiteFlicker) * (1.0 - whiteMask);
  }

  if (uExplosion > 0.01) {
    float ex = uExplosion;

    float flashIntensity = smoothstep(0.0, 0.08, ex) * smoothstep(0.45, 0.08, ex);
    float flashRadius = ex * 3.0;
    float flashMask = smoothstep(flashRadius, max(0.0, flashRadius - 0.8), dist);
    color = mix(color, vec3(1.0, 0.97, 0.92), flashIntensity * flashMask * 0.85);

    float ringRadius = ex * 0.7;
    float ringW = 0.04 + ex * 0.025;
    float ring = g2((dist - ringRadius) / ringW);
    vec3 ringColor = mix(vec3(1.0, 0.65, 0.25), vec3(0.6, 0.35, 1.0), clamp(ex * 0.8, 0.0, 1.0));
    float ringAlpha = smoothstep(0.0, 0.05, ex) * smoothstep(1.3, 0.2, ex);
    color += ringColor * ring * ringAlpha * 0.6;

    float ring2Radius = ex * 0.45;
    float ring2 = g2((dist - ring2Radius) / 0.03);
    color += vec3(0.8, 0.5, 1.0) * ring2 * smoothstep(0.05, 0.15, ex) * smoothstep(0.9, 0.3, ex) * 0.3;

    float aftermath = smoothstep(0.6, 1.4, ex);
    color *= 1.0 - aftermath * 0.65;

    float coolShift = smoothstep(0.8, 1.8, ex);
    float exLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(exLuma * 0.7, exLuma * 0.8, exLuma * 1.15), coolShift * 0.45);
  }

  float speedFeedback = smoothstep(80.0, 500.0, absVel) * uScroll;
  if (speedFeedback > 0.01) {
    float edgeMask = smoothstep(0.35, 0.52, dist);
    vec3 speedColor = mix(vec3(0.4, 0.2, 0.08), vec3(0.35, 0.15, 0.1), uScroll);
    color += speedColor * edgeMask * speedFeedback * 0.12;
    float _sf = abs(sin(dist * 60.0 - uTime * 4.0 * sign(uScrollVelocity))); float _sf2 = _sf*_sf; float _sf4 = _sf2*_sf2; float _sf8 = _sf4*_sf4; float speedLine = _sf8 * _sf8;
    color += speedColor * speedLine * edgeMask * speedFeedback * 0.06;
  }

  float starField = smoothstep(0.01, 0.10, uScroll) * smoothstep(0.55, 0.30, uScroll);
  if (starField > 0.01) {
    for (int layer = 0; layer < 3; layer++) {
      float layerDepth = float(layer) * 0.33 + 0.33;
      float parallaxSpeed = layerDepth * 2.0;
      vec2 scrollOffset = center * uScroll * parallaxSpeed * 200.0;
      vec2 starPixel = gl_FragCoord.xy + scrollOffset;

      float cellSize = 3.0 + float(layer) * 1.5;
      vec2 starCell = floor(starPixel / cellSize);
      float starSeed = hash12(starCell + float(layer) * 73.0);
      float threshold = 0.993 - float(layer) * 0.002;
      if (starSeed > threshold) {
        vec2 starCenter = (starCell + 0.5) * cellSize;
        float starDist = length(gl_FragCoord.xy + scrollOffset - starCenter) / (1.5 + float(layer) * 0.3);
        float starShape = exp(-starDist * starDist * 2.0);

        float streakFactor = uScroll * uScroll * layerDepth * 8.0;
        if (streakFactor > 0.1) {
          vec2 streakDir = normalize(center + vec2(0.001));
          float streakDot = abs(dot(normalize(gl_FragCoord.xy + scrollOffset - starCenter), streakDir));
          float streakShape = exp(-starDist * starDist * max(0.3, 2.0 - streakFactor));
          starShape = mix(starShape, streakShape * streakDot, min(streakFactor * 0.15, 0.8));
        }

        float starTwinkle = sin(uTime * (2.0 + starSeed * 5.0) + starSeed * 100.0) * 0.4 + 0.6;
        float starBright = sqrt(starSeed - threshold) * 180.0 * (1.0 - layerDepth * 0.3);
        float starTemp = fract(starSeed * 73.19);
        vec3 starColor = starTemp > 0.8 ? vec3(1.0, 0.85, 0.6) : starTemp > 0.6 ? vec3(1.0, 0.9, 0.75) : vec3(0.95, 0.9, 0.82);

        float warmShift = uScroll * layerDepth * 0.4;
        starColor = mix(starColor, vec3(1.0, 0.7, 0.4), warmShift);

        color += starColor * starBright * starTwinkle * starField * starShape * 0.06;
      }
    }
  }

  float depthHaze = smoothstep(0.15, 0.5, uScroll) * smoothstep(0.75, 0.55, uScroll);
  if (depthHaze > 0.01) {
    float hazeDist = smoothstep(0.3, 0.65, dist);
    vec3 hazeColor = mix(vec3(0.015, 0.012, 0.028), vec3(0.020, 0.012, 0.035), uScroll);
    color = mix(color, hazeColor, hazeDist * depthHaze * 0.12);
  }

  float cosmicPulse = smoothstep(0.3, 0.7, uScroll) * (1.0 - smoothstep(0.85, 1.0, uScroll));
  if (cosmicPulse > 0.01) {
    float _cp = sin(uTime * 0.4) * 0.5 + 0.5; float pulse = _cp * _cp * _cp;
    float pulseMask = exp(-dist * dist * 4.0);
    color += vec3(0.02, 0.01, 0.03) * pulse * pulseMask * cosmicPulse;
  }

  float scanPhase = smoothstep(0.55, 0.80, uScroll) * smoothstep(1.0, 0.90, uScroll);
  if (scanPhase > 0.01) {
    float scanY = gl_FragCoord.y;
    float scanLine = sin(scanY * 3.14159) * 0.5 + 0.5;
    float _sn2 = scanLine*scanLine; float _sn4 = _sn2*_sn2; float _sn8 = _sn4*_sn4;
    scanLine = _sn8 * _sn4 * _sn2;
    color *= 1.0 - scanLine * scanPhase * 0.012;
  }

  vec2 ditherCoord = gl_FragCoord.xy;
  float dither = fract(dot(ditherCoord, vec2(0.06711056, 0.00583715)) * 52.9829189);
  float ditherR = fract(dither + 0.33333);
  float ditherB = fract(dither + 0.66666);
  color += vec3(dither - 0.5, ditherR - 0.5, ditherB - 0.5) / 128.0;
  if (mouseLensActive > 0.01) {
    vec2 toMouse = vUv - mouseScreenPos;
    float mDist = length(toMouse);
    vec2 mDir = mDist > 0.001 ? toMouse / mDist : vec2(0.0);

    float innerGlow = exp(-mDist * mDist * 90.0) * 0.06;
    color += color * innerGlow * mouseLensActive;

    float ring = smoothstep(0.16, 0.09, mDist) * smoothstep(0.02, 0.06, mDist);
    vec2 chrOffset = mDir * ring * 0.003 * mouseLensActive;
    float rShift = texture2D(tDiffuse, distortedUv + chrOffset * 1.2).r;
    float bShift = texture2D(tDiffuse, distortedUv - chrOffset).b;
    color.r = mix(color.r, rShift, ring * 0.35 * mouseLensActive);
    color.b = mix(color.b, bShift, ring * 0.35 * mouseLensActive);

    float outerRing = smoothstep(0.20, 0.14, mDist) * smoothstep(0.08, 0.12, mDist);
    color += vec3(0.008, 0.005, 0.015) * outerRing * mouseLensActive;

    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float satBoost = exp(-mDist * mDist * 40.0) * 0.15 * mouseLensActive;
    color = mix(vec3(luma), color, 1.0 + satBoost);
  }

  float explosionWarm = smoothstep(0.86, 0.92, uScroll) * (1.0 - smoothstep(0.0, 0.15, uExplosion));
  if (explosionWarm > 0.01) {
    float warmLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 warmShift = vec3(warmLuma * 1.08, warmLuma * 0.98, warmLuma * 0.85);
    color = mix(color, warmShift, explosionWarm * 0.5);
    color.r += explosionWarm * 0.02;
    color.b -= explosionWarm * 0.03;
  }

  color += uColorShift;
  if (uInvert > 0.5) {
    color = 1.0 - color;
  }

  if (uRgbSplit > 0.01) {
    float splitAngle = uTime * 0.7;
    vec2 splitDir = vec2(cos(splitAngle), sin(splitAngle));
    vec2 splitOffset = splitDir * uRgbSplit / uResolution;
    color.r = texture2D(tDiffuse, clamp(distortedUv + splitOffset, 0.001, 0.999)).r;
    color.b = texture2D(tDiffuse, clamp(distortedUv - splitOffset, 0.001, 0.999)).b;
  }

  if (uGlitchBlock > 0.01) {
    float blockSeed = floor(uTime * 15.0);
    float bw = 40.0 + fract(sin(blockSeed * 127.1) * 43758.5453) * 120.0;
    float bh = 20.0 + fract(sin(blockSeed * 311.7) * 43758.5453) * 60.0;
    vec2 blockUv = floor(gl_FragCoord.xy / vec2(bw, bh));
    float blockHash = fract(sin(dot(blockUv + blockSeed * 0.1, vec2(127.1, 311.7))) * 43758.5453);
    if (blockHash > 0.92) {
      float ox = (fract(sin(dot(blockUv, vec2(269.5, 183.3))) * 43758.5453) - 0.5) * 0.1;
      float oy = (fract(sin(dot(blockUv, vec2(419.2, 371.9))) * 43758.5453) - 0.5) * 0.05;
      vec3 glitchColor = texture2D(tDiffuse, clamp(distortedUv + vec2(ox, oy), 0.001, 0.999)).rgb;
      float glitchType = fract(sin(dot(blockUv, vec2(537.1, 213.7))) * 43758.5453);
      if (glitchType > 0.7) glitchColor = 1.0 - glitchColor;
      else if (glitchType > 0.4) glitchColor = glitchColor.gbr;
      color = mix(color, glitchColor, uGlitchBlock);
    }
  }

  if (uScanLineHardcore > 0.001) {
    float scanY = gl_FragCoord.y + uTime * 60.0 * 2.0;
    float scanLine1 = step(0.5, fract(scanY / 3.0)) * 0.8 + 0.2;
    float scanLine2 = step(0.5, fract(scanY / 7.0 + 0.3)) * 0.15 + 0.85;
    color *= mix(1.0, scanLine1 * scanLine2, uScanLineHardcore);
  }

  color = max(color, 0.0);
  color *= edgeFade;

  gl_FragColor = vec4(color, 1.0);
}
