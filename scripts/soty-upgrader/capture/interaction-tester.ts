/**
 * @file interaction-tester.ts
 * @description Tests cursor gravity, click, keyboard, and navigation interactions
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { Page } from 'playwright';
import * as path from 'path';
import { InteractionCapture } from '../types';
import { CONFIG } from '../config';
import { teleportToPosition } from './scroll-teleporter';

export async function testCursorGravity(
  page: Page,
  scrollPercent: number,
  outputDir: string,
): Promise<InteractionCapture[]> {
  const results: InteractionCapture[] = [];
  const viewport = page.viewportSize() ?? { width: 1920, height: 1080 };

  await teleportToPosition(page, {
    percent: scrollPercent,
    pixelOffset: 0,
    chapter: 0,
    chapterName: '',
    isTransition: false,
  });

  for (const point of CONFIG.interaction.cursorPoints) {
    const absoluteX = Math.round(viewport.width * point.x);
    const absoluteY = Math.round(viewport.height * point.y);
    const safeName = point.name.replace(/[^a-z0-9-]/gi, '_');
    const beforePath = path.join(outputDir, `cursor-${safeName}-before.png`);
    const afterPath = path.join(outputDir, `cursor-${safeName}-after.png`);

    try {
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await page.waitForTimeout(200);
      await page.screenshot({ path: beforePath, fullPage: false, type: 'png' });

      const startTime = performance.now();
      await page.mouse.move(absoluteX, absoluteY, { steps: 10 });
      await page.waitForTimeout(500);
      const responseTime = performance.now() - startTime;

      await page.screenshot({ path: afterPath, fullPage: false, type: 'png' });

      results.push({
        type: 'mouse-move',
        description: `Cursor gravity at ${point.name} (scroll ${(scrollPercent * 100).toFixed(0)}%)`,
        beforeScreenshot: beforePath,
        afterScreenshot: afterPath,
        responseTime: Math.round(responseTime),
        scrollChange: 0,
        visualChange: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        type: 'mouse-move',
        description: `FAILED: Cursor gravity at ${point.name} — ${errorMessage}`,
        beforeScreenshot: beforePath,
        afterScreenshot: afterPath,
        responseTime: 0,
        scrollChange: 0,
        visualChange: false,
      });
    }
  }

  return results;
}

export async function testNavDots(page: Page, outputDir: string): Promise<InteractionCapture[]> {
  const results: InteractionCapture[] = [];
  const totalDots = CONFIG.chapters.length;

  for (let dotIndex = 0; dotIndex < totalDots; dotIndex++) {
    const beforePath = path.join(outputDir, `navdot-${dotIndex}-before.png`);
    const afterPath = path.join(outputDir, `navdot-${dotIndex}-after.png`);

    try {
      const scrollBefore = await page.evaluate(`(function() { return window.scrollY; })()`);
      await page.screenshot({ path: beforePath, fullPage: false, type: 'png' });

      const dotClicked = await page.evaluate(`(function() {
        var index = ${dotIndex};
        var selectors = [
          '.nav-dots button:nth-child(' + (index + 1) + ')',
          '.nav-dot:nth-child(' + (index + 1) + ')',
          '[data-chapter="' + index + '"]',
          '.chapter-nav li:nth-child(' + (index + 1) + ')',
          'nav button:nth-child(' + (index + 1) + ')'
        ];

        for (var i = 0; i < selectors.length; i++) {
          var el = document.querySelector(selectors[i]);
          if (el) {
            el.click();
            return true;
          }
        }
        return false;
      })()`);

      if (!dotClicked) {
        results.push({
          type: 'nav-dot',
          description: `Nav dot ${dotIndex} — element not found`,
          beforeScreenshot: beforePath,
          afterScreenshot: '',
          responseTime: 0,
          scrollChange: 0,
          visualChange: false,
        });
        continue;
      }

      await page.waitForTimeout(1500);
      await page.screenshot({ path: afterPath, fullPage: false, type: 'png' });

      const scrollAfter = await page.evaluate(`(function() { return window.scrollY; })()`);
      const scrollChange = scrollAfter - scrollBefore;

      results.push({
        type: 'nav-dot',
        description: `Nav dot ${dotIndex} → Chapter "${CONFIG.chapters[dotIndex].name}"`,
        beforeScreenshot: beforePath,
        afterScreenshot: afterPath,
        responseTime: 1500,
        scrollChange,
        visualChange: scrollChange !== 0,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        type: 'nav-dot',
        description: `FAILED: Nav dot ${dotIndex} — ${errorMessage}`,
        beforeScreenshot: beforePath,
        afterScreenshot: afterPath,
        responseTime: 0,
        scrollChange: 0,
        visualChange: false,
      });
    }
  }

  return results;
}

export async function testKeyboard(page: Page, outputDir: string): Promise<InteractionCapture[]> {
  const results: InteractionCapture[] = [];

  const keysToTest: { key: string; name: string }[] = [
    { key: 'ArrowDown', name: 'arrow-down' },
    { key: 'ArrowUp', name: 'arrow-up' },
    { key: ' ', name: 'space' },
    { key: 'Home', name: 'home' },
    { key: 'End', name: 'end' },
  ];

  await page.evaluate(`(function() {
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.floor(maxScroll * 0.5), behavior: 'instant' });
  })()`);
  await page.waitForTimeout(500);

  for (const { key, name } of keysToTest) {
    const beforePath = path.join(outputDir, `keyboard-${name}-before.png`);
    const afterPath = path.join(outputDir, `keyboard-${name}-after.png`);

    try {
      const scrollBefore = await page.evaluate(`(function() { return window.scrollY; })()`);
      await page.screenshot({ path: beforePath, fullPage: false, type: 'png' });

      const startTime = performance.now();
      await page.keyboard.press(key);
      await page.waitForTimeout(500);
      const responseTime = performance.now() - startTime;

      await page.screenshot({ path: afterPath, fullPage: false, type: 'png' });
      const scrollAfter = await page.evaluate(`(function() { return window.scrollY; })()`);
      const scrollChange = scrollAfter - scrollBefore;

      results.push({
        type: 'keyboard',
        description: `Key "${key}" — scroll delta: ${scrollChange}px`,
        beforeScreenshot: beforePath,
        afterScreenshot: afterPath,
        responseTime: Math.round(responseTime),
        scrollChange,
        visualChange: scrollChange !== 0,
      });

      if (key === 'Home' || key === 'End') {
        await page.evaluate(`(function() {
          var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: Math.floor(maxScroll * 0.5), behavior: 'instant' });
        })()`);
        await page.waitForTimeout(300);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        type: 'keyboard',
        description: `FAILED: Key "${key}" — ${errorMessage}`,
        beforeScreenshot: beforePath,
        afterScreenshot: afterPath,
        responseTime: 0,
        scrollChange: 0,
        visualChange: false,
      });
    }
  }

  return results;
}

export async function testMuteButton(page: Page, outputDir: string): Promise<InteractionCapture> {
  const beforePath = path.join(outputDir, 'mute-toggle-before.png');
  const afterPath = path.join(outputDir, 'mute-toggle-after.png');

  try {
    await page.screenshot({ path: beforePath, fullPage: false, type: 'png' });

    const muteClicked = await page.evaluate(`(function() {
      var selectors = [
        '#mute-button',
        '#sound-toggle',
        '.mute-btn',
        '[data-mute]',
        '[aria-label="Mute"]',
        '[aria-label="Toggle sound"]',
        'button.sound'
      ];

      for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i]);
        if (el) {
          el.click();
          return true;
        }
      }
      return false;
    })()`);

    await page.waitForTimeout(500);
    await page.screenshot({ path: afterPath, fullPage: false, type: 'png' });

    return {
      type: 'mouse-click',
      description: muteClicked ? 'Mute button toggled' : 'Mute button not found',
      beforeScreenshot: beforePath,
      afterScreenshot: afterPath,
      responseTime: 500,
      scrollChange: 0,
      visualChange: muteClicked,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'mouse-click',
      description: `FAILED: Mute button — ${errorMessage}`,
      beforeScreenshot: beforePath,
      afterScreenshot: afterPath,
      responseTime: 0,
      scrollChange: 0,
      visualChange: false,
    };
  }
}
