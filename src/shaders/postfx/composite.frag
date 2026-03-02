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

varying vec2 vUv;

vec3 acesFilm(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float grain(vec2 uv, float t) {
  vec2 seed = uv + fract(t * 0.5);
  float n = fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
  float n2 = fract(sin(dot(seed * 1.7, vec2(269.5, 183.3))) * 43758.5453);
  return mix(n, n2, 0.5);
}

vec3 radialBlur(sampler2D tex, vec2 uv, vec2 blurCenter, float strength, int samples) {
  vec3 accum = vec3(0.0);
  vec2 dir = uv - blurCenter;
  float totalWeight = 0.0;
  for (int i = 0; i < 8; i++) {
    float t = float(i) / 8.0;
    float weight = 1.0 - t * 0.5;
    vec2 sampleUv = uv - dir * t * strength;
    accum += texture2D(tex, sampleUv).rgb * weight;
    totalWeight += weight;
  }
  return accum / totalWeight;
}

void main() {
  vec2 center = vUv - 0.5;
  float dist = length(center);

  float barrelBreathe = sin(uTime * 0.8) * 0.006 + sin(uTime * 1.3) * 0.003;
  float barrelAccel = smoothstep(0.4, 1.0, uScroll);
  float barrelStrength = uScroll * 0.08 + barrelAccel * 0.12 + barrelBreathe * uScroll;
  float r2 = dist * dist;
  vec2 distortedUv = vUv + center * r2 * barrelStrength;

  float resScale = min(uResolution.x, uResolution.y) / 1080.0;
  float chromaticAmount = uChromaticIntensity * (0.3 + dist * 3.0) * resScale;
  vec2 safeCenter = dist > 0.001 ? center / dist : vec2(1.0, 0.0);
  vec2 chromaticOffset = safeCenter * chromaticAmount / uResolution;

  float absVel = abs(uScrollVelocity);
  float motionBlurStrength = min(absVel * 0.0008, 0.06) * uScroll;
  motionBlurStrength += uScroll * 0.004;

  vec3 color;
  if (motionBlurStrength > 0.001) {
    vec3 blurR = radialBlur(tDiffuse, distortedUv + chromaticOffset, vec2(0.5), motionBlurStrength, 8);
    vec3 blurG = radialBlur(tDiffuse, distortedUv, vec2(0.5), motionBlurStrength, 8);
    vec3 blurB = radialBlur(tDiffuse, distortedUv - chromaticOffset, vec2(0.5), motionBlurStrength, 8);
    color = vec3(blurR.r, blurG.g, blurB.b);
  } else {
    float r = texture2D(tDiffuse, distortedUv + chromaticOffset * 1.0).r;
    float g = texture2D(tDiffuse, distortedUv).g;
    float b = texture2D(tDiffuse, distortedUv - chromaticOffset * 1.0).b;
    color = vec3(r, g, b);
  }

  vec3 bloom = texture2D(tBloom, vUv).rgb;
  vec3 bloomTint = mix(vec3(1.05, 0.95, 0.88), vec3(0.85, 0.75, 1.1), uScroll);
  float bloomBell = exp(-pow((uScroll - 0.62) * 5.0, 2.0));
  float bloomDim = 1.0 - bloomBell * 0.7;
  color += bloom * bloomTint * uBloomMix * bloomDim;

  color = acesFilm(color);

  float dimBell = exp(-pow((uScroll - 0.62) * 5.0, 2.0));
  float gravDimming = 1.0 - dimBell * 0.35;
  color *= gravDimming;

  float pixelLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float blackCrush = dimBell * 0.06;
  float crushMask = smoothstep(0.25, 0.0, pixelLuma);
  color = max(color - blackCrush * crushMask, vec3(0.0));

  float grayKillMask = smoothstep(0.08, 0.18, pixelLuma) * smoothstep(0.45, 0.25, pixelLuma);
  float grayKill = dimBell * grayKillMask * 0.3;
  color *= 1.0 - grayKill;

  float grainValue = grain(gl_FragCoord.xy / uResolution, uTime);
  float grainValue2 = grain(gl_FragCoord.xy / uResolution * 1.3, uTime * 1.7);
  float grainMixed = mix(grainValue, grainValue2, 0.4) * 2.0 - 1.0;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float grainMask = 1.0 - luminance * 0.5;
  float grainScale = uGrainIntensity * grainMask;
  color += grainMixed * grainScale;
  color.r += grainValue * grainScale * 0.15;
  color.b += grainValue2 * grainScale * 0.1;

  float vignette = 1.0 - smoothstep(0.25, 1.3, dist * 1.5);
  vignette = pow(vignette, 1.3);
  vignette = mix(1.0, vignette, uVignetteIntensity);
  float earlyVignette = smoothstep(0.2, 0.0, uScroll) * 0.15;
  vignette *= 1.0 - earlyVignette * dist * 2.0;
  color *= vignette;

  float tunnelVignette = 1.0 - smoothstep(0.12, 0.65, dist);
  tunnelVignette = pow(tunnelVignette, 0.7);
  float tunnelIntensity = smoothstep(0.4, 1.0, uScroll) * 0.6;
  color *= mix(1.0, tunnelVignette, tunnelIntensity);

  float approachVignette = 1.0 - smoothstep(0.2, 0.8, dist);
  float approachIntensity = smoothstep(0.4, 0.7, uScroll) * smoothstep(0.95, 0.75, uScroll) * 0.4;
  color *= mix(1.0, approachVignette, approachIntensity);

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 earlyShadows = vec3(0.85, 0.88, 1.1);
  vec3 midShadows = vec3(0.7, 0.6, 0.9);
  vec3 deepShadows = vec3(0.5, 0.3, 0.7);
  vec3 shadowTint = uScroll < 0.5
    ? mix(earlyShadows, midShadows, uScroll * 2.0)
    : mix(midShadows, deepShadows, (uScroll - 0.5) * 2.0);
  vec3 shadows = mix(color, color * shadowTint, smoothstep(0.3, 0.0, luma) * 0.4);

  vec3 earlyHighlights = vec3(1.0, 0.95, 0.9);
  vec3 midHighlights = vec3(1.05, 0.92, 0.85);
  vec3 deepHighlights = vec3(0.95, 0.85, 1.1);
  vec3 highlightTint = uScroll < 0.5
    ? mix(earlyHighlights, midHighlights, uScroll * 2.0)
    : mix(midHighlights, deepHighlights, (uScroll - 0.5) * 2.0);
  vec3 highlights = mix(color, color * highlightTint, smoothstep(0.5, 1.0, luma) * 0.35);

  vec3 earlyMid = vec3(0.98, 0.96, 1.0);
  vec3 deepMid = vec3(0.95, 0.88, 1.05);
  vec3 midtones = color * mix(earlyMid, deepMid, uScroll);
  float midMask = 1.0 - abs(luma - 0.4) * 3.0;
  midMask = max(midMask, 0.0);
  color = mix(mix(shadows, highlights, step(0.3, luma)), midtones, midMask * 0.3);

  float earlyContrast = smoothstep(0.15, 0.0, uScroll) * 0.08;
  float midContrast = smoothstep(0.3, 0.65, uScroll) * smoothstep(0.9, 0.7, uScroll) * 0.2;
  float contrast = 1.08 + uScroll * 0.15 + earlyContrast + midContrast;
  color = (color - 0.5) * contrast + 0.5;

  vec3 earlyAmbient = vec3(0.008, 0.006, 0.018);
  vec3 midAmbient = vec3(0.015, 0.008, 0.005);
  vec3 deepAmbient = vec3(0.01, 0.003, 0.025);
  vec3 ambientTint = uScroll < 0.5
    ? mix(earlyAmbient, midAmbient, uScroll * 2.0)
    : mix(midAmbient, deepAmbient, (uScroll - 0.5) * 2.0);
  color = max(color, ambientTint * (1.0 - dist * 0.8));

  float breathe = sin(uTime * 0.3) * 0.008 + sin(uTime * 0.7) * 0.004;
  color *= 1.0 + breathe;

  float gravWave = sin(dist * 25.0 - uTime * 2.0) * 0.003 * smoothstep(0.3, 0.6, uScroll) * smoothstep(0.9, 0.7, uScroll);
  color *= 1.0 + gravWave;

  float hbActive = smoothstep(0.33, 0.38, uScroll);
  float hbBpm = 50.0 + max(uScroll - 0.35, 0.0) * 200.0;
  float hbPhase = uTime * hbBpm / 60.0 * 3.14159;
  float hbPulse = pow(max(sin(hbPhase), 0.0), 12.0) * hbActive;
  color *= 1.0 + hbPulse * 0.04;
  float hbVignette = 1.0 - dist * hbPulse * 0.15;
  color *= max(hbVignette, 0.92);

  float atmosphericScatter = smoothstep(0.2, 0.7, uScroll) * dist * 0.35;
  vec3 scatterColor = mix(vec3(0.08, 0.03, 0.01), vec3(0.03, 0.01, 0.08), uScroll);
  color += scatterColor * atmosphericScatter * (1.0 - smoothstep(0.0, 0.45, dist));

  float earlyAtmosphere = smoothstep(0.15, 0.0, uScroll) * 0.015;
  color += vec3(0.04, 0.02, 0.08) * earlyAtmosphere * (1.0 - dist * 1.5);

  float deepVoid = smoothstep(0.7, 1.0, uScroll);
  color = mix(color, color * vec3(0.7, 0.5, 0.85), deepVoid * 0.2);
  color *= 1.0 - deepVoid * 0.2;

  float voidBreathe = sin(uTime * 0.8) * 0.5 + 0.5;
  float voidPulse = pow(voidBreathe, 3.0) * deepVoid * 0.08;
  color *= 1.0 - voidPulse * dist;
  color += vec3(0.04, 0.01, 0.08) * voidPulse * (1.0 - dist * 1.5);

  float abyssEdge = smoothstep(0.85, 1.0, uScroll);
  float abyssVignette = 1.0 - smoothstep(0.08, 0.45, dist) * abyssEdge * 0.5;
  color *= abyssVignette;

  float overviewEffect = smoothstep(0.78, 0.92, uScroll) * smoothstep(1.0, 0.95, uScroll);
  vec3 overviewTint = vec3(0.85, 0.92, 1.2);
  color = mix(color, color * overviewTint, overviewEffect * 0.15);
  float overviewBrightness = 1.0 + overviewEffect * 0.08;
  color *= overviewBrightness;

  float singularity = smoothstep(0.88, 1.0, uScroll);
  float singLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, color * 1.5, singularity * 0.35);
  color = mix(vec3(singLuma), color, 1.0 + singularity * 0.6);
  float singPulse = pow(sin(uTime * 1.5 + dist * 8.0) * 0.5 + 0.5, 4.0) * singularity;
  color += vec3(0.08, 0.02, 0.15) * singPulse * (1.0 - dist * 2.0);

  float scanline = sin(gl_FragCoord.y * 1.5) * 0.5 + 0.5;
  scanline = pow(scanline, 0.8);
  float scanlineIntensity = 0.04 + uScroll * 0.02;
  color *= 1.0 - scanline * scanlineIntensity;

  float movingScan = sin((gl_FragCoord.y - uTime * 120.0) * 0.5) * 0.5 + 0.5;
  movingScan = pow(movingScan, 8.0);
  float movingScanIntensity = min(abs(uScrollVelocity) * 0.003, 0.06) + uScroll * 0.008;
  color += vec3(0.04, 0.08, 0.15) * movingScan * movingScanIntensity;

  float signalNoise = grain(gl_FragCoord.xy * 0.5, uTime * 2.0);
  float signalFlicker = sin(uTime * 60.0) * 0.003 * uScroll;
  color += signalFlicker * signalNoise;

  float glitchTrigger = step(0.997, fract(sin(floor(uTime * 4.0) * 43758.5453)));
  float glitchBand = step(0.5, fract(sin(gl_FragCoord.y * 0.01 + uTime * 100.0) * 43758.5453));
  float glitchShift = glitchTrigger * glitchBand * uScroll * 0.01;
  if (glitchShift > 0.001) {
    vec3 glitchSample = texture2D(tDiffuse, distortedUv + vec2(glitchShift, 0.0)).rgb;
    color = mix(color, glitchSample, 0.7);
  }

  float timeDilation = smoothstep(0.45, 0.7, uScroll) * smoothstep(0.9, 0.75, uScroll);
  float dilationPulse = sin(uTime * 2.0 * (1.0 - timeDilation * 0.6)) * 0.5 + 0.5;
  float dilationEffect = timeDilation * dilationPulse * 0.03;
  color = mix(color, color * vec3(0.9, 0.85, 1.1), dilationEffect);

  float horizonCrossing = smoothstep(0.62, 0.65, uScroll) * smoothstep(0.69, 0.66, uScroll);
  float horizonPeak = exp(-pow((uScroll - 0.65) * 35.0, 2.0));
  float horizonPulse = horizonCrossing * (0.5 + 0.5 * sin(uTime * 8.0));
  float horizonFlash = horizonPeak * 0.12;
  float horizonFlash2 = exp(-pow((uScroll - 0.65) * 45.0, 2.0)) * 0.06;
  float horizonRipple = sin(dist * 40.0 - uTime * 12.0) * horizonCrossing * 0.02;

  color += vec3(1.0, 0.7, 0.2) * horizonPulse * 0.06;
  color += vec3(1.0, 0.95, 0.9) * horizonFlash * 0.3;
  color += vec3(1.0, 1.0, 0.98) * horizonFlash2 * 0.2;
  color *= 1.0 + horizonRipple;

  float horizonInvert = horizonPeak * 0.06;
  color = mix(color, vec3(1.0) - color, horizonInvert * 0.15);

  float horizonDistort = horizonCrossing * 0.02;
  vec2 horizonOffset = center * horizonDistort * sin(uTime * 15.0 + dist * 25.0);
  color += texture2D(tDiffuse, distortedUv + horizonOffset).rgb * horizonCrossing * 0.03;

  float horizonWave = sin(dist * 50.0 - uTime * 18.0) * horizonCrossing * 0.004;
  color += texture2D(tDiffuse, distortedUv + vec2(horizonWave)).rgb * horizonCrossing * 0.03;

  float horizonVignette = 1.0 - horizonPeak * dist * 0.4;
  color *= max(horizonVignette, 0.75);

  float chapterFlash = uChapterFlash;
  color += vec3(0.12, 0.15, 0.35) * chapterFlash * 0.3;
  color = mix(color, color * vec3(1.15, 1.2, 1.4), chapterFlash * 0.2);
  float flashVignette = 1.0 - dist * chapterFlash * 0.5;
  color *= max(flashVignette, 0.7);

  color = max(color, 0.0);

  vec2 ditherCoord = gl_FragCoord.xy;
  float dither = fract(dot(ditherCoord, vec2(0.06711056, 0.00583715)) * 52.9829189);
  color += (dither - 0.5) / 255.0;
  color = max(color, 0.0);

  gl_FragColor = vec4(color, 1.0);
}
