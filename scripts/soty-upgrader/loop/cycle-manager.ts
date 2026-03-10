/**
 * @file cycle-manager.ts
 * @description Manages the full capture-analyze-fix-reaudit cycle pipeline
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as path from 'path';
import * as fs from 'fs';
import { CONFIG } from '../config';
import type {
  CycleReport,
  CaptureFrame,
  FramePerformance,
  PerformanceReport,
  AccessibilityReport,
  AudioReport,
  BrowserTestResult,
  MobileTestResult,
} from '../types';
import { launchBrowser, navigateToSite, closeBrowser } from '../capture/browser-manager';
import { injectProbe, collectPerformance, injectTimeFreezer } from '../capture/performance-probe';
import { runBrowserMatrix } from '../cross-browser/browser-matrix';
import { compareBrowserRenders, generateBrowserReport } from '../cross-browser/visual-diff';
import { runMobileAudit } from '../mobile/mobile-audit';
import { testTouchScroll, testTouchTap, testPinchZoom } from '../mobile/touch-tester';
import { testNetworkConditions } from '../mobile/network-throttle';
import { runAccessibilityAudit } from '../accessibility/a11y-checker';
import { ensureDir, saveCycleReport, saveScreenshot, writeJSON, loadPreviousCycleReport, exportAuditReport } from '../utils/file-utils';
import { log, progress, phaseStart, phaseEnd, cycleStart, cycleEnd, table } from '../utils/logger';

interface CycleOptions {
  skipAudio?: boolean;
  browserOnly?: boolean;
  mobileOnly?: boolean;
  a11yOnly?: boolean;
  firstImpressionOnly?: boolean;
  interactionsOnly?: boolean;
}

const SCROLL_POSITIONS = Array.from(
  { length: 101 },
  (_, i) => Math.round(i * CONFIG.capture.scrollIncrement * 100) / 100,
);

function resolveScrollPosition(percent: number) {
  let chapter = 0;
  let chapterName: string = CONFIG.chapters[0].name;

  for (let i = CONFIG.chapters.length - 1; i >= 0; i--) {
    if (percent >= CONFIG.chapters[i].scrollStart) {
      chapter = CONFIG.chapters[i].id;
      chapterName = CONFIG.chapters[i].name;
      break;
    }
  }

  const isTransition = CONFIG.chapters.some(
    (ch) => Math.abs(percent - ch.scrollStart) < 0.02 && percent !== 0,
  );

  return { percent, pixelOffset: 0, chapter, chapterName, isTransition };
}

function buildPerformanceReport(snapshots: FramePerformance[]): PerformanceReport {
  if (snapshots.length === 0) {
    return {
      fpsAverage: 0, fpsMin: 0, fpsP5: 0, fpsDrops: [],
      memoryPeak: 0, memoryLeakDetected: false, memoryGrowthRate: 0,
      lighthousePerformance: 0, lighthouseAccessibility: 0,
      lighthouseBestPractices: 0, lighthouseSEO: 0,
      fcp: 0, lcp: 0, cls: 0, tti: 0, tbt: 0,
    };
  }

  const fpsValues = snapshots.map((s) => s.fps).sort((a, b) => a - b);
  const fpsAverage = Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length);
  const fpsMin = fpsValues[0];
  const fpsP5 = fpsValues[Math.floor(fpsValues.length * 0.05)] ?? fpsMin;

  const fpsDrops = snapshots
    .map((s, idx) => ({
      scrollPercent: idx * CONFIG.capture.scrollIncrement,
      fps: s.fps,
    }))
    .filter((d) => d.fps < CONFIG.performance.minimumFPS);

  const memoryValues = snapshots.map((s) => s.jsHeapUsed);
  const memoryPeak = Math.max(...memoryValues);
  const memoryStart = memoryValues[0] || 0;
  const memoryEnd = memoryValues[memoryValues.length - 1] || 0;
  const memoryGrowthRate = memoryEnd - memoryStart;
  const memoryLeakDetected = memoryGrowthRate > CONFIG.performance.maxMemoryGrowthRate;

  return {
    fpsAverage, fpsMin, fpsP5, fpsDrops,
    memoryPeak, memoryLeakDetected, memoryGrowthRate,
    lighthousePerformance: 0, lighthouseAccessibility: 0,
    lighthouseBestPractices: 0, lighthouseSEO: 0,
    fcp: 0, lcp: 0, cls: 0, tti: 0, tbt: 0,
  };
}

function emptyAudioReport(): AudioReport {
  return {
    silentZones: [],
    layerActivation: [],
    emotionalArcMatch: 0,
    bassPresence: 0,
    dynamicRange: 0,
  };
}

function emptyAccessibilityReport(): AccessibilityReport {
  return {
    contrastIssues: [],
    keyboardNavigable: false,
    ariaLabelsPresent: false,
    reducedMotionRespected: false,
    focusIndicatorsVisible: false,
    screenReaderFriendly: false,
    score: 0,
  };
}

async function runCapturePhase(cycleDir: string, skipAudio: boolean): Promise<{
  captures: CaptureFrame[];
  performanceSnapshots: FramePerformance[];
}> {
  phaseStart('Capture');

  const screenshotDir = path.join(cycleDir, 'screenshots');
  ensureDir(screenshotDir);

  const session = await launchBrowser({ browser: 'chromium', headless: false });
  const captures: CaptureFrame[] = [];
  const performanceSnapshots: FramePerformance[] = [];

  try {
    await navigateToSite(session.page);
    await injectProbe(session.page);

    if (CONFIG.capture.freezeTime) {
      await injectTimeFreezer(session.page);
    }

    for (let i = 0; i < SCROLL_POSITIONS.length; i++) {
      const percent = SCROLL_POSITIONS[i];
      progress(i + 1, SCROLL_POSITIONS.length, `Capturing ${Math.round(percent * 100)}%`);

      if (CONFIG.capture.freezeTime) {
        await session.page.evaluate('window.__timeFreezer && window.__timeFreezer.freeze()');
      }

      await session.page.evaluate(`(function() {
        var el = document.scrollingElement || document.documentElement;
        var maxScroll = el.scrollHeight - window.innerHeight;
        el.scrollTop = maxScroll * ${percent};
        window.dispatchEvent(new Event('scroll'));
      })()`);

      await session.page.waitForTimeout(CONFIG.capture.settleTime);

      const scrollTag = String(Math.round(percent * 100)).padStart(3, '0');
      const screenshotPath = path.join(screenshotDir, `frame-${scrollTag}.png`);

      const screenshotBuffer = await session.page.screenshot({ type: 'png' });
      saveScreenshot(screenshotBuffer, screenshotPath);

      let perf: FramePerformance = {
        fps: 0, frameTime: 0, jsHeapUsed: 0, jsHeapTotal: 0,
        domNodes: 0, gpuEstimatedMs: 0, scrollVelocity: 0,
        canvasWidth: 0, canvasHeight: 0, pixelRatio: 1,
        drawCalls: 0, triangles: 0, textures: 0, programs: 0,
      };

      try {
        perf = await collectPerformance(session.page);
      } catch {
        log(`Perf collection failed at ${Math.round(percent * 100)}%`, 'warn');
      }
      performanceSnapshots.push(perf);

      if (CONFIG.capture.freezeTime) {
        await session.page.evaluate('window.__timeFreezer && window.__timeFreezer.unfreeze()');
      }

      captures.push({
        position: resolveScrollPosition(percent),
        screenshotPath,
        timestamp: Date.now(),
        performance: perf,
        audio: null,
        hudValues: null,
      });
    }
  } catch (err) {
    log(`Capture phase error: ${err}`, 'error');
  } finally {
    await closeBrowser(session.browser);
  }

  phaseEnd('Capture');
  return { captures, performanceSnapshots };
}

async function runA11yPhase(cycleDir: string): Promise<AccessibilityReport> {
  const session = await launchBrowser({ browser: 'chromium', headless: false });

  try {
    await navigateToSite(session.page);
    const report = await runAccessibilityAudit(session.page);
    writeJSON(path.join(cycleDir, 'accessibility-report.json'), report);
    return report;
  } catch (err) {
    log(`Accessibility phase error: ${err}`, 'error');
    return emptyAccessibilityReport();
  } finally {
    await closeBrowser(session.browser);
  }
}

export async function runCaptureCycle(
  cycleNumber: number,
  options: CycleOptions = {},
): Promise<CycleReport> {
  const startTime = Date.now();
  cycleStart(cycleNumber);

  const cycleDir = path.join(CONFIG.SCRIPTS_ROOT, 'reports', `cycle-${cycleNumber}`);
  const subDirs = [
    'screenshots', 'audio', 'interactions', 'first-impression',
    'cross-browser', 'mobile', 'pixel-diffs',
  ];
  for (const sub of subDirs) {
    ensureDir(path.join(cycleDir, sub));
  }

  let captures: CaptureFrame[] = [];
  let performanceSnapshots: FramePerformance[] = [];
  let accessibilityReport: AccessibilityReport = emptyAccessibilityReport();
  let browserResults: BrowserTestResult[] = [];
  let mobileResult: MobileTestResult | null = null;

  if (options.browserOnly) {
    browserResults = await runBrowserMatrix(cycleDir);
    const diffs = await compareBrowserRenders(browserResults);
    const browserReport = generateBrowserReport(browserResults, diffs);
    fs.writeFileSync(path.join(cycleDir, 'browser-report.md'), browserReport, 'utf-8');
    writeJSON(path.join(cycleDir, 'browser-diffs.json'), diffs);
  } else if (options.mobileOnly) {
    mobileResult = await runMobileAudit(cycleDir);
    writeJSON(path.join(cycleDir, 'mobile-report.json'), mobileResult);

    const touchSession = await launchBrowser({ browser: 'chromium', headless: true, mobile: true });
    try {
      await navigateToSite(touchSession.page);
      await testTouchScroll(touchSession.page, path.join(cycleDir, 'mobile'));
      await testTouchTap(touchSession.page, path.join(cycleDir, 'mobile'));
      await testPinchZoom(touchSession.page);
    } finally {
      await closeBrowser(touchSession.browser);
    }

    const networkResults = await testNetworkConditions(cycleDir);
    writeJSON(path.join(cycleDir, 'network-results.json'), networkResults);
  } else if (options.a11yOnly) {
    accessibilityReport = await runA11yPhase(cycleDir);
  } else {
    const captureResult = await runCapturePhase(cycleDir, options.skipAudio ?? false);
    captures = captureResult.captures;
    performanceSnapshots = captureResult.performanceSnapshots;

    const [browserRes, mobileRes] = await Promise.all([
      runBrowserMatrix(cycleDir),
      runMobileAudit(cycleDir),
    ]);

    browserResults = browserRes;
    mobileResult = mobileRes;

    const diffs = await compareBrowserRenders(browserResults);
    const browserReport = generateBrowserReport(browserResults, diffs);
    fs.writeFileSync(path.join(cycleDir, 'browser-report.md'), browserReport, 'utf-8');
    writeJSON(path.join(cycleDir, 'browser-diffs.json'), diffs);
    writeJSON(path.join(cycleDir, 'mobile-report.json'), mobileResult);

    accessibilityReport = await runA11yPhase(cycleDir);
  }

  const performanceReport = buildPerformanceReport(performanceSnapshots);
  const duration = Date.now() - startTime;

  const previousReport = loadPreviousCycleReport(cycleNumber);
  const improvementFromPrevious = previousReport
    ? performanceReport.fpsAverage - previousReport.performanceReport.fpsAverage
    : 0;

  const cycleReport: CycleReport = {
    cycleNumber,
    timestamp: new Date().toISOString(),
    duration,
    captureCount: captures.length,
    scienceChecks: [],
    designScores: [],
    performanceReport,
    fixesApplied: [],
    overallScore: accessibilityReport.score,
    improvementFromPrevious,
    belowThresholdCount: 0,
    audioReport: emptyAudioReport(),
    accessibilityReport,
  };

  saveCycleReport(cycleReport, cycleDir);
  writeJSON(path.join(cycleDir, 'captures-index.json'), captures.map((c) => ({
    percent: c.position.percent,
    chapter: c.position.chapterName,
    screenshot: c.screenshotPath,
    fps: c.performance.fps,
    memory: c.performance.jsHeapUsed,
  })));

  const auditDir = exportAuditReport(cycleReport, cycleDir);
  log(`Audit exported to: ${auditDir}`, 'success');

  cycleEnd(cycleNumber);
  return cycleReport;
}

export function summarizeCycle(report: CycleReport): string {
  const lines: string[] = [];

  lines.push(`# SOTY Upgrader — Cycle ${report.cycleNumber} Summary`);
  lines.push('');
  lines.push(`**Timestamp:** ${report.timestamp}`);
  lines.push(`**Duration:** ${(report.duration / 1000).toFixed(1)}s`);
  lines.push(`**Captures:** ${report.captureCount}`);
  lines.push('');

  lines.push('## Performance');
  lines.push(`- FPS Average: ${report.performanceReport.fpsAverage}`);
  lines.push(`- FPS Minimum: ${report.performanceReport.fpsMin}`);
  lines.push(`- FPS P5: ${report.performanceReport.fpsP5}`);
  lines.push(`- FPS Drops: ${report.performanceReport.fpsDrops.length}`);
  lines.push(`- Memory Peak: ${(report.performanceReport.memoryPeak / 1024 / 1024).toFixed(1)}MB`);
  lines.push(`- Memory Leak: ${report.performanceReport.memoryLeakDetected ? 'YES' : 'No'}`);
  lines.push('');

  lines.push('## Accessibility');
  lines.push(`- Score: ${report.accessibilityReport.score}/100`);
  lines.push(`- Contrast Issues: ${report.accessibilityReport.contrastIssues.length}`);
  lines.push(`- Keyboard Navigable: ${report.accessibilityReport.keyboardNavigable}`);
  lines.push(`- ARIA Labels: ${report.accessibilityReport.ariaLabelsPresent}`);
  lines.push(`- Reduced Motion: ${report.accessibilityReport.reducedMotionRespected}`);
  lines.push(`- Focus Indicators: ${report.accessibilityReport.focusIndicatorsVisible}`);
  lines.push(`- Screen Reader: ${report.accessibilityReport.screenReaderFriendly}`);
  lines.push('');

  if (report.improvementFromPrevious !== 0) {
    const sign = report.improvementFromPrevious > 0 ? '+' : '';
    lines.push(`## Improvement from Previous: ${sign}${report.improvementFromPrevious.toFixed(1)} FPS`);
    lines.push('');
  }

  const cycleDir = path.join(CONFIG.SCRIPTS_ROOT, 'reports', `cycle-${report.cycleNumber}`);
  lines.push('## Key Files for Analysis');
  lines.push(`- Report: ${path.join(cycleDir, 'cycle-report.json')}`);
  lines.push(`- Screenshots: ${path.join(cycleDir, 'screenshots/')}`);
  lines.push(`- Browser Report: ${path.join(cycleDir, 'browser-report.md')}`);
  lines.push(`- Mobile Report: ${path.join(cycleDir, 'mobile-report.json')}`);
  lines.push(`- A11y Report: ${path.join(cycleDir, 'accessibility-report.json')}`);
  lines.push('');
  lines.push('## Audit Output');
  lines.push(`- Audit Directory: ${CONFIG.AUDIT_ROOT}`);
  lines.push(`- Audit Index: ${path.join(CONFIG.AUDIT_ROOT, 'INDEX.md')}`);
  lines.push(`- Latest AUDIT.md with scores, flags, and fix suggestions`);

  return lines.join('\n');
}
