/**
 * @file config.ts
 * @description Configuration constants for the SOTY Upgrader audit pipeline
 * @author Cleanlystudio
 * @version 1.0.0
 */

export const CONFIG = {
  PROJECT_ROOT: 'C:/Users/theoo/OneDrive/Bureau/SOTY/event-horizon',
  SCRIPTS_ROOT: 'C:/Users/theoo/OneDrive/Bureau/SOTY/event-horizon/scripts/soty-upgrader',
  AUDIT_ROOT: 'C:/Users/theoo/OneDrive/Bureau/SOTY/audit',
  DEV_SERVER_URL: 'http://localhost:4203',

  capture: {
    scrollIncrement: 0.01,
    settleTime: 2000,
    screenshotWidth: 1920,
    screenshotHeight: 1080,
    freezeTime: true,
    captureAudio: true,
    captureHUD: true,
    extraChapterTransitionCaptures: true,
  },

  chapters: [
    { id: 0, name: 'YOU', scrollStart: 0.0 },
    { id: 1, name: 'THE PULL', scrollStart: 0.0909 },
    { id: 2, name: 'THE WARP', scrollStart: 0.1818 },
    { id: 3, name: 'THE PHOTON SPHERE', scrollStart: 0.2727 },
    { id: 4, name: 'THE FALL', scrollStart: 0.3636 },
    { id: 5, name: 'SPAGHETTIFICATION', scrollStart: 0.4545 },
    { id: 6, name: 'TIME DILATION', scrollStart: 0.5454 },
    { id: 7, name: 'SINGULARITY', scrollStart: 0.6363 },
    { id: 8, name: 'THE VOID', scrollStart: 0.7272 },
    { id: 9, name: 'HAWKING RADIATION', scrollStart: 0.8181 },
    { id: 10, name: 'WHAT REMAINS', scrollStart: 0.9090 },
  ],

  scoring: {
    threshold: 95,
    maxCycles: 20,
    convergenceDelta: 0.5,
    weights: {
      design: 0.25,
      usability: 0.20,
      creativity: 0.25,
      content: 0.15,
      mobile: 0.15,
    },
  },

  performance: {
    targetFPS: 55,
    minimumFPS: 30,
    maxMemoryGrowthRate: 1024 * 1024,
    lighthouseMinScore: 85,
    maxLCP: 2500,
    maxFCP: 1000,
    maxCLS: 0.1,
  },

  mobile: {
    viewport: { width: 390, height: 844 },
    cpuThrottle: 4,
    networkPreset: 'Fast 3G',
  },

  browsers: ['chromium', 'firefox', 'webkit'] as const,

  firstImpression: {
    captureIntervals: [0, 500, 1000, 1500, 2000, 2500, 3000],
  },

  interaction: {
    cursorPoints: [
      { x: 0.5, y: 0.5, name: 'center (black hole)' },
      { x: 0.2, y: 0.3, name: 'top-left' },
      { x: 0.8, y: 0.7, name: 'bottom-right' },
      { x: 0.5, y: 0.1, name: 'top-center' },
    ],
    scrollPositionsForInteraction: [0.1, 0.3, 0.5, 0.7, 0.9],
  },

  emotionalArc: {
    act1: { range: [0, 0.3] as [number, number], emotions: ['wonder', 'curiosity', 'tension'] },
    act2: { range: [0.3, 0.7] as [number, number], emotions: ['fear', 'awe', 'disorientation', 'vertigo'] },
    act3: { range: [0.7, 0.9] as [number, number], emotions: ['terror', 'sublime', 'transcendence'] },
    epilogue: { range: [0.9, 1.0] as [number, number], emotions: ['catharsis', 'reflection', 'hope'] },
  },
} as const;
