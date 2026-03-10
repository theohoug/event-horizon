/**
 * @file first-impression.ts
 * @description Captures and analyzes the first 3 seconds of the experience
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { Page } from 'playwright';
import * as path from 'path';
import { FirstImpressionCapture } from '../types';
import { CONFIG } from '../config';

export async function captureFirstImpression(
  page: Page,
  outputDir: string,
): Promise<FirstImpressionCapture> {
  const screenshots: { timeMs: number; path: string }[] = [];
  let loaderDuration = 0;
  let firstContentfulPaint = 0;
  let soundPromptAppearTime = 0;
  let introAnimationDuration = 0;

  const navigationStart = Date.now();

  await page.goto(CONFIG.DEV_SERVER_URL, {
    waitUntil: 'commit',
    timeout: 30_000,
  });

  const pageLoadStart = Date.now();
  const intervals = CONFIG.firstImpression.captureIntervals;

  for (const intervalMs of intervals) {
    const elapsed = Date.now() - pageLoadStart;
    const waitTime = intervalMs - elapsed;

    if (waitTime > 0) {
      await page.waitForTimeout(waitTime);
    }

    const screenshotPath = path.join(outputDir, `first-impression-${intervalMs}ms.png`);

    try {
      await page.screenshot({ path: screenshotPath, fullPage: false, type: 'png' });
    } catch {
      continue;
    }

    screenshots.push({ timeMs: intervalMs, path: screenshotPath });

    const pageState = await page.evaluate(`(function() {
      var loader = document.querySelector('#loader');
      var loaderVisible = false;
      if (loader) {
        var loaderStyle = window.getComputedStyle(loader);
        loaderVisible = loaderStyle.display !== 'none' && loaderStyle.opacity !== '0';
      }

      var soundPrompt = document.querySelector('#sound-prompt, .sound-prompt, [data-sound-prompt]');
      var soundPromptVisible = false;
      if (soundPrompt) {
        var spStyle = window.getComputedStyle(soundPrompt);
        soundPromptVisible = spStyle.display !== 'none' && spStyle.opacity !== '0';
      }

      var canvas = document.querySelector('canvas');
      var hasContent = false;
      if (canvas) {
        try {
          var ctx = canvas.getContext('2d') || canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (ctx && typeof ctx.getImageData === 'function') {
            var imageData = ctx.getImageData(0, 0, 10, 10);
            for (var idx = 0; idx < imageData.data.length; idx++) {
              if (idx % 4 !== 3 && imageData.data[idx] > 10) {
                hasContent = true;
                break;
              }
            }
          } else {
            hasContent = canvas.width > 0 && canvas.height > 0;
          }
        } catch(e) {
          hasContent = canvas.width > 0 && canvas.height > 0;
        }
      }

      return { loaderVisible: loaderVisible, soundPromptVisible: soundPromptVisible, hasContent: hasContent };
    })()`);

    if (!pageState.loaderVisible && loaderDuration === 0 && intervalMs > 0) {
      loaderDuration = intervalMs;
    }

    if (pageState.hasContent && firstContentfulPaint === 0) {
      firstContentfulPaint = intervalMs;
    }

    if (pageState.soundPromptVisible && soundPromptAppearTime === 0) {
      soundPromptAppearTime = intervalMs;
    }
  }

  const lastInterval = intervals[intervals.length - 1];

  introAnimationDuration = await detectIntroCompletion(page, pageLoadStart, lastInterval);

  const totalTimeToInteractive = await measureTimeToInteractive(page, pageLoadStart);

  if (loaderDuration === 0) {
    loaderDuration = firstContentfulPaint > 0 ? firstContentfulPaint : lastInterval;
  }

  return {
    screenshots,
    loaderDuration,
    firstContentfulPaint,
    soundPromptAppearTime,
    introAnimationDuration,
    totalTimeToInteractive,
  };
}

async function detectIntroCompletion(
  page: Page,
  pageLoadStart: number,
  maxWaitMs: number,
): Promise<number> {
  try {
    const startCheck = Date.now();
    const deadline = pageLoadStart + maxWaitMs + 5000;

    while (Date.now() < deadline) {
      const introComplete = await page.evaluate(`(function() {
        var intro = document.querySelector('#intro, .intro-cinematic, [data-intro]');
        if (!intro) return true;
        var style = window.getComputedStyle(intro);
        return (
          style.display === 'none' ||
          style.opacity === '0' ||
          style.pointerEvents === 'none'
        );
      })()`);

      if (introComplete) {
        return Date.now() - pageLoadStart;
      }

      await page.waitForTimeout(200);
    }

    return Date.now() - startCheck;
  } catch {
    return maxWaitMs;
  }
}

async function measureTimeToInteractive(
  page: Page,
  pageLoadStart: number,
): Promise<number> {
  try {
    await page.waitForFunction(
      `(function() {
        var canvas = document.querySelector('canvas');
        var scrollable = document.documentElement.scrollHeight > window.innerHeight;
        return canvas && scrollable;
      })()`,
      { timeout: 15_000 },
    );

    return Date.now() - pageLoadStart;
  } catch {
    return Date.now() - pageLoadStart;
  }
}
