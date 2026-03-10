/**
 * @file screenshot-collector.ts
 * @description Main capture orchestrator that coordinates screenshots across all scroll positions
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { Page } from 'playwright';
import * as path from 'path';
import { CaptureFrame, HUDValues, ScrollPosition } from '../types';
import { CONFIG } from '../config';
import { generateScrollPositions, teleportToPosition } from './scroll-teleporter';
import { collectPerformance } from './performance-probe';
import { collectAudioSnapshot } from './audio-capture';

export async function captureAllFrames(page: Page, cycleDir: string): Promise<CaptureFrame[]> {
  const positions = generateScrollPositions();
  const frames: CaptureFrame[] = [];
  const totalPositions = positions.length;

  for (let i = 0; i < totalPositions; i++) {
    const position = positions[i];

    try {
      const frame = await captureAtPosition(page, position, cycleDir, i);
      frames.push(frame);

      const progressPercent = Math.round(((i + 1) / totalPositions) * 100);
      process.stdout.write(
        `\r  [${progressPercent}%] Frame ${i + 1}/${totalPositions} — ${position.chapterName} @ ${(position.percent * 100).toFixed(1)}%`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`\n  [ERROR] Frame ${i + 1} at ${position.percent}: ${errorMessage}\n`);
    }
  }

  process.stdout.write('\n');
  return frames;
}

async function captureAtPosition(
  page: Page,
  position: ScrollPosition,
  cycleDir: string,
  index: number,
): Promise<CaptureFrame> {
  await teleportToPosition(page, position);

  if (CONFIG.capture.freezeTime) {
    await page.evaluate(`(function() {
      if (window.__SOTY_PERF && window.__SOTY_PERF.freeze) {
        window.__SOTY_PERF.freeze();
      }
    })()`);
  }

  const paddedIndex = String(index).padStart(4, '0');
  const percentLabel = String(Math.round(position.percent * 1000)).padStart(4, '0');
  const screenshotFilename = `frame-${paddedIndex}-p${percentLabel}.png`;
  const screenshotPath = path.join(cycleDir, screenshotFilename);

  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    type: 'png',
  });

  const performance = await collectPerformance(page);

  let audio = null;
  if (CONFIG.capture.captureAudio) {
    audio = await collectAudioSnapshot(page);
  }

  let hudValues = null;
  if (CONFIG.capture.captureHUD) {
    hudValues = await captureHUDValues(page);
  }

  if (CONFIG.capture.freezeTime) {
    await page.evaluate(`(function() {
      if (window.__SOTY_PERF && window.__SOTY_PERF.unfreeze) {
        window.__SOTY_PERF.unfreeze();
      }
    })()`);
  }

  return {
    position,
    screenshotPath,
    timestamp: Date.now(),
    performance,
    audio,
    hudValues,
  };
}

export async function captureHUDValues(page: Page): Promise<HUDValues | null> {
  return page.evaluate(`(function() {
    var distanceEl = document.querySelector('#hud-distance');
    var tempEl = document.querySelector('#hud-temp');
    var dilationEl = document.querySelector('#hud-dilation');
    var tidalEl = document.querySelector('#hud-tidal');
    var elapsedEl = document.querySelector('#hud-elapsed');

    if (!distanceEl && !tempEl && !dilationEl && !tidalEl && !elapsedEl) {
      return null;
    }

    return {
      distance: distanceEl ? (distanceEl.textContent || '').trim() : '',
      temperature: tempEl ? (tempEl.textContent || '').trim() : '',
      timeDilation: dilationEl ? (dilationEl.textContent || '').trim() : '',
      tidalForce: tidalEl ? (tidalEl.textContent || '').trim() : '',
      elapsed: elapsedEl ? (elapsedEl.textContent || '').trim() : ''
    };
  })()`);
}

export async function captureSingleFrame(
  page: Page,
  percent: number,
  outputPath: string,
): Promise<CaptureFrame> {
  const chapter = findChapterForPercent(percent);
  const position: ScrollPosition = {
    percent,
    pixelOffset: 0,
    chapter: chapter.id,
    chapterName: chapter.name,
    isTransition: false,
  };

  await teleportToPosition(page, position);

  if (CONFIG.capture.freezeTime) {
    await page.evaluate(`(function() {
      if (window.__SOTY_PERF && window.__SOTY_PERF.freeze) {
        window.__SOTY_PERF.freeze();
      }
    })()`);
  }

  await page.screenshot({
    path: outputPath,
    fullPage: false,
    type: 'png',
  });

  const performance = await collectPerformance(page);
  const audio = CONFIG.capture.captureAudio ? await collectAudioSnapshot(page) : null;
  const hudValues = CONFIG.capture.captureHUD ? await captureHUDValues(page) : null;

  if (CONFIG.capture.freezeTime) {
    await page.evaluate(`(function() {
      if (window.__SOTY_PERF && window.__SOTY_PERF.unfreeze) {
        window.__SOTY_PERF.unfreeze();
      }
    })()`);
  }

  return {
    position,
    screenshotPath: outputPath,
    timestamp: Date.now(),
    performance,
    audio,
    hudValues,
  };
}

function findChapterForPercent(percent: number): { id: number; name: string } {
  let currentId = CONFIG.chapters[0].id as number;
  let currentName = CONFIG.chapters[0].name as string;
  for (let i = 0; i < CONFIG.chapters.length; i++) {
    if (percent >= CONFIG.chapters[i].scrollStart) {
      currentId = CONFIG.chapters[i].id as number;
      currentName = CONFIG.chapters[i].name as string;
    }
  }
  return { id: currentId, name: currentName };
}
