/**
 * @file mobile-audit.ts
 * @description Complete mobile audit with viewport emulation, CPU throttling, and quality detection
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as path from 'path';
import { Page } from 'playwright';
import { CONFIG } from '../config';
import type {
  MobileTestResult,
  CaptureFrame,
  FramePerformance,
  PerformanceReport,
  ScrollPosition,
} from '../types';
import { launchBrowser, navigateToSite, closeBrowser } from '../capture/browser-manager';
import { injectProbe, collectPerformance } from '../capture/performance-probe';
import { ensureDir, saveScreenshot } from '../utils/file-utils';
import { log, progress, phaseStart, phaseEnd } from '../utils/logger';

const MOBILE_CAPTURE_STEP = 0.05;
const MOBILE_POSITIONS = Array.from({ length: 21 }, (_, i) => i * MOBILE_CAPTURE_STEP);

function resolveScrollPosition(percent: number): ScrollPosition {
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

async function scrollToPosition(page: Page, percent: number): Promise<void> {
  await page.evaluate(`(function() {
    var p = ${percent};
    var scrollContainer = document.scrollingElement || document.documentElement;
    var maxScroll = scrollContainer.scrollHeight - window.innerHeight;
    scrollContainer.scrollTop = maxScroll * p;
  })()`);

  await page.waitForTimeout(CONFIG.capture.settleTime);
}

export async function checkMobileQuality(page: Page): Promise<string> {
  const quality = await page.evaluate(`(function() {
    var qualityCandidates = [
      window.__QUALITY,
      window.__quality,
      window.experience ? window.experience.quality : undefined,
      window.app ? window.app.quality : undefined,
      document.documentElement.getAttribute('data-quality'),
      document.body.getAttribute('data-quality')
    ];

    for (var i = 0; i < qualityCandidates.length; i++) {
      var candidate = qualityCandidates[i];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }

    var metaQuality = document.querySelector('meta[name="quality"]');
    if (metaQuality) return metaQuality.getAttribute('content') || 'unknown';

    return 'unknown';
  })()`);

  return quality;
}

async function checkRotationPrompt(page: Page): Promise<boolean> {
  return page.evaluate(`(function() {
    var rotationSelectors = [
      '[data-rotation-prompt]',
      '.rotation-prompt',
      '#rotation-prompt',
      '.portrait-warning',
      '#portrait-warning',
      '[data-orientation-warning]'
    ];

    for (var i = 0; i < rotationSelectors.length; i++) {
      var element = document.querySelector(rotationSelectors[i]);
      if (element) {
        var style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      }
    }

    return false;
  })()`);
}

async function testOrientationChange(
  page: Page,
  outputDir: string,
): Promise<{ handled: boolean; landscapeScreenshot: string; portraitScreenshot: string }> {
  const landscapePath = path.join(outputDir, 'orientation-landscape.png');
  const portraitPath = path.join(outputDir, 'orientation-portrait.png');

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1500);

  const landscapeBuffer = await page.screenshot({ type: 'png' });
  saveScreenshot(landscapeBuffer, landscapePath);

  const hasLandscapeResponse = await page.evaluate(`(function() {
    var landscapeIndicators = [
      '.landscape-warning',
      '[data-landscape]',
      '.rotate-device'
    ];

    for (var i = 0; i < landscapeIndicators.length; i++) {
      var el = document.querySelector(landscapeIndicators[i]);
      if (el) return true;
    }

    return false;
  })()`);

  await page.setViewportSize({
    width: CONFIG.mobile.viewport.width,
    height: CONFIG.mobile.viewport.height,
  });
  await page.waitForTimeout(1500);

  const portraitBuffer = await page.screenshot({ type: 'png' });
  saveScreenshot(portraitBuffer, portraitPath);

  return {
    handled: hasLandscapeResponse,
    landscapeScreenshot: landscapePath,
    portraitScreenshot: portraitPath,
  };
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
    .filter((s) => s.fps < CONFIG.performance.minimumFPS)
    .map((s, idx) => ({
      scrollPercent: idx * MOBILE_CAPTURE_STEP,
      fps: s.fps,
    }));

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

export async function runMobileAudit(cycleDir: string): Promise<MobileTestResult> {
  phaseStart('Mobile Audit');

  const mobileDir = path.join(cycleDir, 'mobile');
  ensureDir(mobileDir);

  const session = await launchBrowser({ browser: 'chromium', headless: true, mobile: true });

  const captures: CaptureFrame[] = [];
  const performanceSnapshots: FramePerformance[] = [];
  let touchResponsive = false;
  let orientationHandled = false;
  let qualityDetected = 'unknown';

  try {
    const cdpSession = await session.context.newCDPSession(session.page);
    await cdpSession.send('Emulation.setCPUThrottlingRate', {
      rate: CONFIG.mobile.cpuThrottle,
    });

    await navigateToSite(session.page);
    await injectProbe(session.page);

    const rotationVisible = await checkRotationPrompt(session.page);
    if (rotationVisible) {
      log('Portrait rotation prompt detected', 'info');
    }

    qualityDetected = await checkMobileQuality(session.page);
    log(`Mobile quality detected: ${qualityDetected}`, 'info');

    for (let i = 0; i < MOBILE_POSITIONS.length; i++) {
      const percent = MOBILE_POSITIONS[i];
      progress(i + 1, MOBILE_POSITIONS.length, `Mobile capture @ ${Math.round(percent * 100)}%`);

      await scrollToPosition(session.page, percent);

      const scrollTag = String(Math.round(percent * 100)).padStart(3, '0');
      const screenshotPath = path.join(mobileDir, `mobile-${scrollTag}.png`);

      const screenshotBuffer = await session.page.screenshot({ type: 'png' });
      saveScreenshot(screenshotBuffer, screenshotPath);

      const perf = await collectPerformance(session.page);
      performanceSnapshots.push(perf);

      captures.push({
        position: resolveScrollPosition(percent),
        screenshotPath,
        timestamp: Date.now(),
        performance: perf,
        audio: null,
        hudValues: null,
      });
    }

    try {
      await session.page.touchscreen.tap(
        CONFIG.mobile.viewport.width / 2,
        CONFIG.mobile.viewport.height / 2,
      );
      await session.page.waitForTimeout(500);
      touchResponsive = true;
    } catch {
      touchResponsive = false;
    }

    try {
      const orientationResult = await testOrientationChange(session.page, mobileDir);
      orientationHandled = orientationResult.handled;
    } catch (err) {
      log(`Orientation test failed: ${err}`, 'warn');
    }

    await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  } catch (err) {
    log(`Mobile audit error: ${err}`, 'error');
  } finally {
    await closeBrowser(session.browser);
  }

  const performanceReport = buildPerformanceReport(performanceSnapshots);

  phaseEnd('Mobile Audit');

  return {
    viewport: CONFIG.mobile.viewport,
    cpuThrottle: CONFIG.mobile.cpuThrottle,
    networkCondition: 'none',
    captures,
    touchResponsive,
    orientationHandled,
    qualityDetected,
    hapticsWorking: false,
    performanceReport,
  };
}
