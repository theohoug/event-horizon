/**
 * @file chapter-detector.ts
 * @description Detects chapter boundaries from the live page DOM or falls back to config
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { Page } from 'playwright';
import { CONFIG } from '../config';

interface ChapterBoundary {
  id: number;
  name: string;
  scrollStart: number;
  scrollEnd: number;
}

interface CurrentChapter {
  id: number;
  name: string;
}

export async function detectChapters(page: Page): Promise<ChapterBoundary[]> {
  const domChapters = await page.evaluate(`(function() {
    var totalScrollHeight = document.documentElement.scrollHeight;
    if (totalScrollHeight <= 0) return null;

    var selectors = [
      'section[data-chapter]',
      '[data-chapter-id]',
      '.chapter-section',
      'section.chapter'
    ];

    var sections = [];
    for (var si = 0; si < selectors.length; si++) {
      var found = document.querySelectorAll(selectors[si]);
      if (found.length > 0) {
        sections = Array.from(found);
        break;
      }
    }

    if (sections.length === 0) return null;

    var chapters = [];

    for (var i = 0; i < sections.length; i++) {
      var section = sections[i];
      var offsetTop = section.offsetTop;
      var offsetHeight = section.offsetHeight;
      var scrollStart = offsetTop / totalScrollHeight;
      var scrollEnd = (offsetTop + offsetHeight) / totalScrollHeight;

      var heading = section.querySelector('h1, h2, h3');
      var name =
        section.getAttribute('data-chapter-name') ||
        section.getAttribute('aria-label') ||
        section.getAttribute('data-chapter') ||
        (heading ? (heading.textContent || '').trim() : '') ||
        'Chapter ' + i;

      var rawId =
        parseInt(section.getAttribute('data-chapter-id') || '', 10) ||
        parseInt(section.getAttribute('data-chapter') || '', 10) ||
        i;

      chapters.push({
        id: isNaN(rawId) ? i : rawId,
        name: name,
        scrollStart: Math.round(scrollStart * 10000) / 10000,
        scrollEnd: Math.round(scrollEnd * 10000) / 10000
      });
    }

    return chapters.length > 0 ? chapters : null;
  })()`);

  if (domChapters && domChapters.length > 0) {
    return domChapters;
  }

  return buildChaptersFromConfig();
}

function buildChaptersFromConfig(): ChapterBoundary[] {
  const chapters: ChapterBoundary[] = [];
  const configChapters = CONFIG.chapters;

  for (let i = 0; i < configChapters.length; i++) {
    const current = configChapters[i];
    const next = configChapters[i + 1];
    const scrollEnd = next ? next.scrollStart : 1.0;

    chapters.push({
      id: current.id,
      name: current.name,
      scrollStart: current.scrollStart,
      scrollEnd: Math.round(scrollEnd * 10000) / 10000,
    });
  }

  return chapters;
}

export async function getCurrentChapter(page: Page): Promise<CurrentChapter> {
  const result = await page.evaluate(`(function() {
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var currentPercent = maxScroll > 0 ? window.scrollY / maxScroll : 0;

    var activeSelectors = [
      'section[data-chapter].active',
      '[data-chapter-id].active',
      '.chapter-section.active',
      'section.chapter.active',
      '[data-chapter-active="true"]'
    ];

    for (var i = 0; i < activeSelectors.length; i++) {
      var active = document.querySelector(activeSelectors[i]);
      if (active) {
        var id =
          parseInt(active.getAttribute('data-chapter-id') || '', 10) ||
          parseInt(active.getAttribute('data-chapter') || '', 10) ||
          0;
        var name =
          active.getAttribute('data-chapter-name') ||
          active.getAttribute('aria-label') ||
          '';
        return { id: isNaN(id) ? 0 : id, name: name, percent: currentPercent };
      }
    }

    return { id: -1, name: '', percent: currentPercent };
  })()`);

  if (result.id >= 0 && result.name) {
    return { id: result.id, name: result.name };
  }

  return findChapterByPercent(result.percent);
}

function findChapterByPercent(percent: number): CurrentChapter {
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
