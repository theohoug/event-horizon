/**
 * @file config.ts
 * @description Configuration for SOTY Analyser
 * @author Cleanlystudio
 * @version 1.0.0
 */

export const ANALYSER_CONFIG = {
  PROJECT_ROOT: 'C:/Users/theoo/OneDrive/Bureau/SOTY/event-horizon',
  DEV_SERVER_URL: 'http://localhost:4203',
  OUTPUT_DIR: 'C:/Users/theoo/OneDrive/Bureau/SOTY/analyses',
  DESKTOP_OUTPUT: 'C:/Users/theoo/OneDrive/Bureau/SOTY/analyses',

  capture: {
    totalPositions: 120,
    settleTime: 500,
    pixelAnalysisInterval: 1,
    screenshotWidth: 1920,
    screenshotHeight: 1080,
    mobileWidth: 390,
    mobileHeight: 844,
    mobilePositions: 40,
  },

  codeAnalysis: {
    shaderDir: 'src/shaders',
    componentsDir: 'src',
    includePatterns: ['**/*.ts', '**/*.tsx', '**/*.glsl', '**/*.vert', '**/*.frag', '**/*.css', '**/*.html'],
    excludePatterns: ['node_modules/**', 'dist/**', '.git/**'],
  },

  performance: {
    targetFPS: 60,
    acceptableFPS: 45,
    criticalFPS: 30,
    targetLCP: 2500,
    targetFCP: 1000,
    targetCLS: 0.1,
  },

  chapters: [
    { id: 0, name: 'YOU', scroll: 0.0 },
    { id: 1, name: 'THE PULL', scroll: 0.1111 },
    { id: 2, name: 'THE WARP', scroll: 0.2222 },
    { id: 3, name: 'THE PHOTON SPHERE', scroll: 0.3333 },
    { id: 4, name: 'THE FALL', scroll: 0.4444 },
    { id: 5, name: 'SPAGHETTIFICATION', scroll: 0.5556 },
    { id: 6, name: 'TIME DILATION', scroll: 0.6667 },
    { id: 7, name: 'SINGULARITY', scroll: 0.7778 },
    { id: 8, name: 'WHAT REMAINS', scroll: 0.8889 },
  ],
} as const;
