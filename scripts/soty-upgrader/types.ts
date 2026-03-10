/**
 * @file types.ts
 * @description TypeScript interfaces and types for the SOTY Upgrader audit pipeline
 * @author Cleanlystudio
 * @version 1.0.0
 */

export interface ScrollPosition {
  percent: number;
  pixelOffset: number;
  chapter: number;
  chapterName: string;
  isTransition: boolean;
}

export interface FramePerformance {
  fps: number;
  frameTime: number;
  jsHeapUsed: number;
  jsHeapTotal: number;
  domNodes: number;
  gpuEstimatedMs: number;
  scrollVelocity: number;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  programs: number;
}

export interface AudioSnapshot {
  frequencyData: number[];
  waveformData: number[];
  activeLayers: string[];
  volume: number;
  peakFrequency: number;
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  isSilent: boolean;
}

export interface CaptureFrame {
  position: ScrollPosition;
  screenshotPath: string;
  timestamp: number;
  performance: FramePerformance;
  audio: AudioSnapshot | null;
  hudValues: HUDValues | null;
}

export interface HUDValues {
  distance: string;
  temperature: string;
  timeDilation: string;
  tidalForce: string;
  elapsed: string;
}

export interface InteractionCapture {
  type: 'mouse-move' | 'mouse-click' | 'keyboard' | 'nav-dot' | 'touch';
  description: string;
  beforeScreenshot: string;
  afterScreenshot: string;
  responseTime: number;
  scrollChange: number;
  visualChange: boolean;
}

export interface FirstImpressionCapture {
  screenshots: { timeMs: number; path: string }[];
  loaderDuration: number;
  firstContentfulPaint: number;
  soundPromptAppearTime: number;
  introAnimationDuration: number;
  totalTimeToInteractive: number;
}

export interface PixelDiffResult {
  scrollPercent: number;
  changedPixelPercent: number;
  diffImagePath: string;
  significantRegions: {
    x: number;
    y: number;
    w: number;
    h: number;
    changePercent: number;
  }[];
  isRegression: boolean;
}

export interface DesignScore {
  scrollPercent: number;
  screenshotPath: string;
  design: number;
  color: number;
  composition: number;
  typography: number;
  emotion: number;
  scientificAccuracy: number;
  overall: number;
  flags: string[];
  suggestions: string[];
}

export interface PhysicsCheck {
  property: string;
  expected: string;
  actual: string;
  scrollPercent: number;
  accurate: boolean;
  deviation: number;
  severity: 'correct' | 'minor' | 'significant' | 'wrong';
  note: string;
}

export interface PerformanceReport {
  fpsAverage: number;
  fpsMin: number;
  fpsP5: number;
  fpsDrops: { scrollPercent: number; fps: number }[];
  memoryPeak: number;
  memoryLeakDetected: boolean;
  memoryGrowthRate: number;
  lighthousePerformance: number;
  lighthouseAccessibility: number;
  lighthouseBestPractices: number;
  lighthouseSEO: number;
  fcp: number;
  lcp: number;
  cls: number;
  tti: number;
  tbt: number;
}

export interface Fix {
  id: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  category: 'shader' | 'css' | 'js' | 'html' | 'config';
  file: string;
  description: string;
  expectedImprovement: string;
  applied: boolean;
}

export interface CycleReport {
  cycleNumber: number;
  timestamp: string;
  duration: number;
  captureCount: number;
  scienceChecks: PhysicsCheck[];
  designScores: DesignScore[];
  performanceReport: PerformanceReport;
  fixesApplied: Fix[];
  overallScore: number;
  improvementFromPrevious: number;
  belowThresholdCount: number;
  audioReport: AudioReport;
  accessibilityReport: AccessibilityReport;
}

export interface AudioReport {
  silentZones: { startPercent: number; endPercent: number }[];
  layerActivation: { layer: string; activeRanges: [number, number][] }[];
  emotionalArcMatch: number;
  bassPresence: number;
  dynamicRange: number;
}

export interface AccessibilityReport {
  contrastIssues: { element: string; ratio: number; required: number }[];
  keyboardNavigable: boolean;
  ariaLabelsPresent: boolean;
  reducedMotionRespected: boolean;
  focusIndicatorsVisible: boolean;
  screenReaderFriendly: boolean;
  score: number;
}

export interface BrowserTestResult {
  browser: 'chromium' | 'firefox' | 'webkit';
  captures: CaptureFrame[];
  renderDifferences: PixelDiffResult[];
  performanceComparison: FramePerformance[];
  issues: string[];
}

export interface MobileTestResult {
  viewport: { width: number; height: number };
  cpuThrottle: number;
  networkCondition: string;
  captures: CaptureFrame[];
  touchResponsive: boolean;
  orientationHandled: boolean;
  qualityDetected: string;
  hapticsWorking: boolean;
  performanceReport: PerformanceReport;
}

export type QualityLevel = 'ultra' | 'high' | 'medium';
export type Phase = 'capture' | 'science' | 'design' | 'performance' | 'fix' | 'loop';
