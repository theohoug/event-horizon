/**
 * @file scroll-teleporter.ts
 * @description Core scroll teleportation logic for precise scroll position targeting
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { Page } from 'playwright';
import { ScrollPosition } from '../types';
import { CONFIG } from '../config';

const DEDUP_THRESHOLD = 0.005;

export function generateScrollPositions(): ScrollPosition[] {
  const incrementPositions = new Map<number, ScrollPosition>();
  const chapterBoundaries: number[] = [];

  for (let i = 0; i < CONFIG.chapters.length; i++) {
    chapterBoundaries.push(CONFIG.chapters[i].scrollStart);
  }

  const totalSteps = Math.ceil(1 / CONFIG.capture.scrollIncrement);
  for (let i = 0; i <= totalSteps; i++) {
    const percent = Math.min(i * CONFIG.capture.scrollIncrement, 1);
    const rounded = Math.round(percent * 10000) / 10000;

    const nearbyChapter = findNearbyChapter(rounded, chapterBoundaries);
    if (nearbyChapter !== null) {
      continue;
    }

    const chapter = getChapterForPercent(rounded);
    incrementPositions.set(rounded, {
      percent: rounded,
      pixelOffset: 0,
      chapter: chapter.id,
      chapterName: chapter.name,
      isTransition: false,
    });
  }

  for (let i = 0; i < CONFIG.chapters.length; i++) {
    const ch = CONFIG.chapters[i];
    const percent = ch.scrollStart;
    incrementPositions.set(percent, {
      percent,
      pixelOffset: 0,
      chapter: ch.id as number,
      chapterName: ch.name as string,
      isTransition: true,
    });
  }

  const positions = Array.from(incrementPositions.values());
  positions.sort((a, b) => a.percent - b.percent);

  return positions;
}

function findNearbyChapter(percent: number, chapterBoundaries: number[]): number | null {
  for (let i = 0; i < chapterBoundaries.length; i++) {
    const boundary = chapterBoundaries[i];
    if (Math.abs(percent - boundary) < DEDUP_THRESHOLD && percent !== boundary) {
      return boundary;
    }
  }
  return null;
}

function getChapterForPercent(percent: number): { id: number; name: string } {
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

export async function teleportToPosition(page: Page, position: ScrollPosition): Promise<void> {
  const targetPixel = await page.evaluate(`(function() {
    var percent = ${position.percent};
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var targetPx = Math.floor(maxScroll * percent);

    window.scrollTo({ top: targetPx, behavior: 'instant' });
    window.dispatchEvent(new Event('scroll'));

    var scrollTrigger = window.ScrollTrigger;
    if (scrollTrigger && scrollTrigger.update) {
      scrollTrigger.update();
    }

    var lenis = window.__lenis;
    if (lenis && lenis.scrollTo) {
      lenis.scrollTo(targetPx, { immediate: true });
    }

    return targetPx;
  })()`);

  position.pixelOffset = targetPixel;

  await page.waitForTimeout(CONFIG.capture.settleTime);

  await page.evaluate(`(function() {
    return new Promise(function(resolve) {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          resolve();
        });
      });
    });
  })()`);
}

export async function getMaxScroll(page: Page): Promise<number> {
  return page.evaluate(`(function() {
    return document.documentElement.scrollHeight - window.innerHeight;
  })()`);
}
