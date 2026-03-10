/**
 * @file touch-tester.ts
 * @description Tests touch interactions including swipe, tap, and pinch zoom on mobile viewport
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as path from 'path';
import { Page } from 'playwright';
import { CONFIG } from '../config';
import { saveScreenshot } from '../utils/file-utils';
import { log } from '../utils/logger';

interface TouchScrollResult {
  responsive: boolean;
  smooth: boolean;
  screenshots: string[];
}

interface TouchTapResult {
  navDotsWork: boolean;
  muteWorks: boolean;
}

interface PinchZoomResult {
  blocked: boolean;
}

async function getScrollTop(page: Page): Promise<number> {
  return page.evaluate(`(function() {
    var el = document.scrollingElement || document.documentElement;
    return el.scrollTop;
  })()`);
}

export async function testTouchScroll(
  page: Page,
  outputDir: string,
): Promise<TouchScrollResult> {
  const screenshots: string[] = [];

  const beforePath = path.join(outputDir, 'touch-scroll-before.png');
  const beforeBuffer = await page.screenshot({ type: 'png' });
  saveScreenshot(beforeBuffer, beforePath);
  screenshots.push(beforePath);

  const scrollBefore = await getScrollTop(page);

  const centerX = CONFIG.mobile.viewport.width / 2;
  const startY = CONFIG.mobile.viewport.height * 0.7;
  const endY = CONFIG.mobile.viewport.height * 0.3;

  try {
    await page.touchscreen.tap(centerX, startY);
    await page.waitForTimeout(100);

    await page.evaluate(`(function() {
      var sx = ${centerX};
      var sy = ${startY};
      var ex = ${centerX};
      var ey = ${endY};

      var startEvent = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: document.body, clientX: sx, clientY: sy })],
        bubbles: true
      });
      document.body.dispatchEvent(startEvent);

      var steps = 10;
      for (var i = 1; i <= steps; i++) {
        var ratio = i / steps;
        var moveEvent = new TouchEvent('touchmove', {
          touches: [
            new Touch({
              identifier: 0,
              target: document.body,
              clientX: sx + (ex - sx) * ratio,
              clientY: sy + (ey - sy) * ratio
            })
          ],
          bubbles: true
        });
        document.body.dispatchEvent(moveEvent);
      }

      var endEvent = new TouchEvent('touchend', {
        changedTouches: [
          new Touch({ identifier: 0, target: document.body, clientX: ex, clientY: ey })
        ],
        bubbles: true
      });
      document.body.dispatchEvent(endEvent);
    })()`);

    await page.waitForTimeout(1000);
  } catch (err) {
    log(`Touch swipe simulation error: ${err}`, 'warn');
  }

  const scrollAfter = await getScrollTop(page);

  const afterPath = path.join(outputDir, 'touch-scroll-after.png');
  const afterBuffer = await page.screenshot({ type: 'png' });
  saveScreenshot(afterBuffer, afterPath);
  screenshots.push(afterPath);

  const scrollDelta = Math.abs(scrollAfter - scrollBefore);
  const responsive = scrollDelta > 5;
  const smooth = scrollDelta > 0 && scrollDelta < 5000;

  log(
    `Touch scroll: delta=${scrollDelta}px, responsive=${responsive}, smooth=${smooth}`,
    responsive ? 'success' : 'warn',
  );

  return { responsive, smooth, screenshots };
}

export async function testTouchTap(
  page: Page,
  outputDir: string,
): Promise<TouchTapResult> {
  let navDotsWork = false;
  let muteWorks = false;

  try {
    const navDot = await page.$(
      '.nav-dot, [data-nav-dot], .scroll-indicator-dot, .chapter-dot',
    );

    if (navDot) {
      const scrollBefore = await getScrollTop(page);
      const box = await navDot.boundingBox();

      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1500);

        const scrollAfterDot = await getScrollTop(page);
        navDotsWork = Math.abs(scrollAfterDot - scrollBefore) > 10;
      }
    }

    const navDotScreenshot = path.join(outputDir, 'touch-tap-navdot.png');
    const navDotBuffer = await page.screenshot({ type: 'png' });
    saveScreenshot(navDotBuffer, navDotScreenshot);

    log(`Nav dots touch: ${navDotsWork ? 'working' : 'not found or not working'}`, navDotsWork ? 'success' : 'warn');
  } catch (err) {
    log(`Nav dot tap test error: ${err}`, 'warn');
  }

  try {
    const muteButton = await page.$(
      '.mute-button, [data-mute], #mute, .audio-toggle, [aria-label*="mute"], [aria-label*="sound"]',
    );

    if (muteButton) {
      const box = await muteButton.boundingBox();

      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(500);

        muteWorks = await page.evaluate(`(function() {
          var muteEl = document.querySelector(
            '.mute-button, [data-mute], #mute, .audio-toggle'
          );

          if (!muteEl) return false;

          var isMuted = muteEl.classList.contains('muted') ||
            muteEl.getAttribute('data-muted') === 'true' ||
            muteEl.getAttribute('aria-pressed') === 'true';

          return isMuted;
        })()`);
      }
    }

    const muteScreenshot = path.join(outputDir, 'touch-tap-mute.png');
    const muteBuffer = await page.screenshot({ type: 'png' });
    saveScreenshot(muteBuffer, muteScreenshot);

    log(`Mute button touch: ${muteWorks ? 'working' : 'not found or not working'}`, muteWorks ? 'success' : 'warn');
  } catch (err) {
    log(`Mute tap test error: ${err}`, 'warn');
  }

  return { navDotsWork, muteWorks };
}

export async function testPinchZoom(page: Page): Promise<PinchZoomResult> {
  const blocked = await page.evaluate(`(function() {
    var viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return false;

    var content = viewport.getAttribute('content') || '';
    var hasMaxScale = /maximum-scale\\s*=\\s*1/i.test(content);
    var hasUserScalableNo = /user-scalable\\s*=\\s*no/i.test(content);

    return hasMaxScale || hasUserScalableNo;
  })()`);

  log(`Pinch zoom blocked: ${blocked}`, blocked ? 'success' : 'warn');

  return { blocked };
}
