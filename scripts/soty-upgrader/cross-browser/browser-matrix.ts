/**
 * @file browser-matrix.ts
 * @description Tests the site across Chromium, Firefox, and WebKit for cross-browser compatibility
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as path from 'path';
import { Page } from 'playwright';
import { CONFIG } from '../config';
import type { BrowserTestResult, CaptureFrame, FramePerformance, ScrollPosition } from '../types';
import { launchBrowser, navigateToSite, closeBrowser } from '../capture/browser-manager';
import { injectProbe, collectPerformance } from '../capture/performance-probe';
import { ensureDir, saveScreenshot } from '../utils/file-utils';
import { log, progress, phaseStart, phaseEnd } from '../utils/logger';

const KEY_POSITIONS = [0, 0.1, 0.25, 0.4, 0.5, 0.65, 0.75, 0.9, 1.0];

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

  return {
    percent,
    pixelOffset: 0,
    chapter,
    chapterName,
    isTransition,
  };
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

async function captureAtPosition(
  page: Page,
  percent: number,
  screenshotDir: string,
  browserName: string,
): Promise<CaptureFrame> {
  await scrollToPosition(page, percent);

  const scrollTag = String(Math.round(percent * 100)).padStart(3, '0');
  const screenshotPath = path.join(screenshotDir, `${browserName}-${scrollTag}.png`);

  const screenshotBuffer = await page.screenshot({ type: 'png' });
  saveScreenshot(screenshotBuffer, screenshotPath);

  const performance = await collectPerformance(page);

  return {
    position: resolveScrollPosition(percent),
    screenshotPath,
    timestamp: Date.now(),
    performance,
    audio: null,
    hudValues: null,
  };
}

async function testSingleBrowser(
  browserName: 'chromium' | 'firefox' | 'webkit',
  cycleDir: string,
  browserIndex: number,
  totalBrowsers: number,
): Promise<BrowserTestResult> {
  const screenshotDir = path.join(cycleDir, 'cross-browser', browserName);
  ensureDir(screenshotDir);

  const issues: string[] = [];
  const captures: CaptureFrame[] = [];
  const performanceSnapshots: FramePerformance[] = [];

  log(`Launching ${browserName}...`, 'info');

  let session;
  try {
    session = await launchBrowser({ browser: browserName, headless: true });
  } catch (err) {
    const errorMessage = `Failed to launch ${browserName}: ${err}`;
    log(errorMessage, 'error');
    issues.push(errorMessage);
    return {
      browser: browserName,
      captures: [],
      renderDifferences: [],
      performanceComparison: [],
      issues,
    };
  }

  try {
    await navigateToSite(session.page);
    await injectProbe(session.page);

    for (let i = 0; i < KEY_POSITIONS.length; i++) {
      const percent = KEY_POSITIONS[i];
      const globalIndex = browserIndex * KEY_POSITIONS.length + i;
      const globalTotal = totalBrowsers * KEY_POSITIONS.length;
      progress(globalIndex + 1, globalTotal, `${browserName} @ ${Math.round(percent * 100)}%`);

      try {
        const frame = await captureAtPosition(session.page, percent, screenshotDir, browserName);
        captures.push(frame);
        performanceSnapshots.push(frame.performance);
      } catch (err) {
        const errorMessage = `${browserName} failed at ${Math.round(percent * 100)}%: ${err}`;
        log(errorMessage, 'warn');
        issues.push(errorMessage);
      }
    }
  } catch (err) {
    const errorMessage = `${browserName} session error: ${err}`;
    log(errorMessage, 'error');
    issues.push(errorMessage);
  } finally {
    await closeBrowser(session.browser);
  }

  return {
    browser: browserName,
    captures,
    renderDifferences: [],
    performanceComparison: performanceSnapshots,
    issues,
  };
}

export async function runBrowserMatrix(cycleDir: string): Promise<BrowserTestResult[]> {
  phaseStart('Cross-Browser Matrix');

  const browsers = CONFIG.browsers;
  const results: BrowserTestResult[] = [];

  for (let i = 0; i < browsers.length; i++) {
    const result = await testSingleBrowser(browsers[i], cycleDir, i, browsers.length);
    results.push(result);
  }

  phaseEnd('Cross-Browser Matrix');
  return results;
}
