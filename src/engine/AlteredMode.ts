/**
 * @file AlteredMode.ts
 * @description Centralized config for altered (2nd) and hardcore (3rd) playthroughs
 * @author Cleanlystudio
 * @version 2.0.0
 */

export const ALTERED = {
  chromaticMultiplier: 3.5,
  grainMultiplier: 3.0,
  vignetteMultiplier: 1.6,
  bloomMultiplier: 1.3,
  flickerChance: 0.04,
  invertChance: 0.008,
  colorShift: [0.12, -0.06, -0.10] as [number, number, number],

  gravityStart: 0.30,
  pullMultiplier: 1.3,

  droneDetune: -200,
  binauralLeft: 180,
  binauralRight: 187,
  masterGainTarget: 0.42,
  noiseMultiplier: 1.5,
  noiseFilterBoost: 100,
  dropoutChance: 0.003,

  ghostVoiceMinInterval: 4,
  ghostVoiceMaxInterval: 10,
  hudGlitchChance: 0.12,
  diskSpeed: 1.5,
  diskTint: [0.2, -0.1, -0.15] as [number, number, number],

  auraColors: [
    'radial-gradient(ellipse, rgba(180, 20, 20, 0.08), transparent 70%)',
    'radial-gradient(ellipse, rgba(150, 10, 30, 0.08), transparent 70%)',
    'radial-gradient(ellipse, rgba(120, 0, 40, 0.10), transparent 70%)',
    'radial-gradient(ellipse, rgba(100, 0, 50, 0.08), transparent 70%)',
    'radial-gradient(ellipse, rgba(200, 30, 10, 0.08), transparent 70%)',
    'radial-gradient(ellipse, rgba(180, 0, 20, 0.10), transparent 70%)',
    'radial-gradient(ellipse, rgba(140, 20, 60, 0.09), transparent 70%)',
    'radial-gradient(ellipse, rgba(60, 0, 0, 0.12), transparent 70%)',
    'radial-gradient(ellipse, rgba(100, 10, 10, 0.06), transparent 70%)',
  ],
} as const;

export const HARDCORE = {
  chromaticMultiplier: 6.0,
  grainMultiplier: 5.0,
  vignetteMultiplier: 2.0,
  bloomMultiplier: 1.6,
  flickerChance: 0.10,
  invertChance: 0.025,
  colorShift: [0.20, -0.12, -0.18] as [number, number, number],

  glitchBlockChance: 0.06,
  scanLineIntensity: 0.08,
  scanLineSpeed: 2.0,
  crtCurvature: 0.03,
  rgbSplitBase: 3.0,
  screenTiltMax: 1.5,
  screenTiltSpeed: 0.4,

  gravityStart: 0.18,
  pullMultiplier: 1.8,

  droneDetune: -400,
  binauralLeft: 160,
  binauralRight: 173,
  masterGainTarget: 0.35,
  noiseMultiplier: 2.5,
  noiseFilterBoost: 200,
  dropoutChance: 0.012,
  bitCrushBits: 6,
  bitCrushMix: 0.15,
  granularStutterChance: 0.008,

  ghostVoiceMinInterval: 2,
  ghostVoiceMaxInterval: 6,
  hudGlitchChance: 0.25,
  hudCorruptChance: 0.05,

  diskSpeed: 2.2,
  diskTint: [0.35, -0.15, -0.25] as [number, number, number],
  pulsationAmplitude: 0.15,
  pulsationSpeed: 0.8,

  scrollJitter: 0.008,
  scrollFightBackChance: 0.02,
  scrollFightBackStrength: 0.005,
  fakeCrashChance: 0.0008,
  temporalFlashChance: 0.003,

  auraColors: [
    'radial-gradient(ellipse, rgba(120, 0, 0, 0.12), transparent 70%)',
    'radial-gradient(ellipse, rgba(80, 0, 20, 0.14), transparent 70%)',
    'radial-gradient(ellipse, rgba(60, 0, 40, 0.15), transparent 70%)',
    'radial-gradient(ellipse, rgba(40, 0, 60, 0.12), transparent 70%)',
    'radial-gradient(ellipse, rgba(100, 0, 0, 0.16), transparent 70%)',
    'radial-gradient(ellipse, rgba(80, 0, 10, 0.18), transparent 70%)',
    'radial-gradient(ellipse, rgba(60, 0, 30, 0.14), transparent 70%)',
    'radial-gradient(ellipse, rgba(30, 0, 0, 0.20), transparent 70%)',
    'radial-gradient(ellipse, rgba(50, 0, 0, 0.10), transparent 70%)',
  ],
} as const;
