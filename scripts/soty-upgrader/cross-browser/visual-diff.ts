/**
 * @file visual-diff.ts
 * @description Compares rendered screenshots between browsers to detect visual regressions
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import type { BrowserTestResult } from '../types';
import { ensureDir } from '../utils/file-utils';
import { log, phaseStart, phaseEnd } from '../utils/logger';

interface BrowserDiff {
  browserA: string;
  browserB: string;
  diffPercent: number;
  diffImagePath: string;
}

interface PositionComparison {
  scrollPercent: number;
  diffs: BrowserDiff[];
}

const SIGNIFICANT_DIFF_THRESHOLD = 10;
const PIXEL_TOLERANCE = 35;

function loadPNG(filePath: string): PNG | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return PNG.sync.read(buffer);
  } catch {
    return null;
  }
}

function compareImages(imageA: PNG, imageB: PNG, diffOutputPath: string): number {
  const width = Math.min(imageA.width, imageB.width);
  const height = Math.min(imageA.height, imageB.height);
  const totalPixels = width * height;

  const diffImage = new PNG({ width, height });
  let changedPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const idxA = (y * imageA.width + x) * 4;
      const idxB = (y * imageB.width + x) * 4;

      const rDiff = Math.abs(imageA.data[idxA] - imageB.data[idxB]);
      const gDiff = Math.abs(imageA.data[idxA + 1] - imageB.data[idxB + 1]);
      const bDiff = Math.abs(imageA.data[idxA + 2] - imageB.data[idxB + 2]);

      const maxDiff = Math.max(rDiff, gDiff, bDiff);

      if (maxDiff > PIXEL_TOLERANCE) {
        changedPixels++;
        diffImage.data[idx] = 255;
        diffImage.data[idx + 1] = 0;
        diffImage.data[idx + 2] = 0;
        diffImage.data[idx + 3] = 255;
      } else {
        diffImage.data[idx] = imageA.data[idxA];
        diffImage.data[idx + 1] = imageA.data[idxA + 1];
        diffImage.data[idx + 2] = imageA.data[idxA + 2];
        diffImage.data[idx + 3] = 60;
      }
    }
  }

  ensureDir(path.dirname(diffOutputPath));
  const diffBuffer = PNG.sync.write(diffImage);
  fs.writeFileSync(diffOutputPath, diffBuffer);

  return totalPixels > 0 ? (changedPixels / totalPixels) * 100 : 0;
}

function buildScreenshotMap(results: BrowserTestResult[]): Map<number, Map<string, string>> {
  const positionMap = new Map<number, Map<string, string>>();

  for (const result of results) {
    for (const capture of result.captures) {
      const percent = capture.position.percent;
      if (!positionMap.has(percent)) {
        positionMap.set(percent, new Map());
      }
      positionMap.get(percent)!.set(result.browser, capture.screenshotPath);
    }
  }

  return positionMap;
}

export async function compareBrowserRenders(
  results: BrowserTestResult[],
): Promise<PositionComparison[]> {
  phaseStart('Visual Diff');

  const screenshotMap = buildScreenshotMap(results);
  const comparisons: PositionComparison[] = [];

  const browserPairs: [string, string][] = [
    ['chromium', 'firefox'],
    ['chromium', 'webkit'],
    ['firefox', 'webkit'],
  ];

  for (const [percent, browserScreenshots] of screenshotMap.entries()) {
    const positionDiffs: BrowserDiff[] = [];

    for (const [browserA, browserB] of browserPairs) {
      const pathA = browserScreenshots.get(browserA);
      const pathB = browserScreenshots.get(browserB);

      if (!pathA || !pathB) continue;

      const imageA = loadPNG(pathA);
      const imageB = loadPNG(pathB);

      if (!imageA || !imageB) {
        log(`Cannot load images for ${browserA} vs ${browserB} at ${Math.round(percent * 100)}%`, 'warn');
        continue;
      }

      const diffDir = path.dirname(pathA).replace(/[/\\][^/\\]+$/, '/diffs');
      const scrollTag = String(Math.round(percent * 100)).padStart(3, '0');
      const diffImagePath = path.join(diffDir, `diff-${browserA}-${browserB}-${scrollTag}.png`);

      const diffPercent = compareImages(imageA, imageB, diffImagePath);

      if (diffPercent > SIGNIFICANT_DIFF_THRESHOLD) {
        log(
          `Significant diff: ${browserA} vs ${browserB} at ${Math.round(percent * 100)}% — ${diffPercent.toFixed(1)}%`,
          'warn',
        );
      }

      positionDiffs.push({
        browserA,
        browserB,
        diffPercent: Math.round(diffPercent * 100) / 100,
        diffImagePath,
      });
    }

    comparisons.push({ scrollPercent: percent, diffs: positionDiffs });
  }

  phaseEnd('Visual Diff');
  return comparisons;
}

export function generateBrowserReport(
  results: BrowserTestResult[],
  diffs: PositionComparison[],
): string {
  const lines: string[] = [];

  lines.push('# Cross-Browser Compatibility Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Browsers tested:** ${results.map((r) => r.browser).join(', ')}`);
  lines.push('');

  lines.push('## Browser Summary');
  lines.push('');
  lines.push('| Browser | Captures | Issues | Avg FPS |');
  lines.push('|---------|----------|--------|---------|');

  for (const result of results) {
    const avgFps = result.performanceComparison.length > 0
      ? Math.round(
          result.performanceComparison.reduce((sum, p) => sum + p.fps, 0) /
            result.performanceComparison.length,
        )
      : 0;

    lines.push(
      `| ${result.browser} | ${result.captures.length} | ${result.issues.length} | ${avgFps} |`,
    );
  }

  lines.push('');
  lines.push('## Visual Differences');
  lines.push('');

  const criticalDiffs = diffs.filter((d) =>
    d.diffs.some((dd) => dd.diffPercent > SIGNIFICANT_DIFF_THRESHOLD),
  );

  if (criticalDiffs.length === 0) {
    lines.push('No significant visual differences detected across browsers.');
  } else {
    lines.push(`**${criticalDiffs.length} position(s) with significant differences (>${SIGNIFICANT_DIFF_THRESHOLD}%)**`);
    lines.push('');
    lines.push('| Scroll % | Browser A | Browser B | Diff % | Diff Image |');
    lines.push('|----------|-----------|-----------|--------|------------|');

    for (const comparison of criticalDiffs) {
      for (const diff of comparison.diffs) {
        if (diff.diffPercent > SIGNIFICANT_DIFF_THRESHOLD) {
          lines.push(
            `| ${Math.round(comparison.scrollPercent * 100)}% | ${diff.browserA} | ${diff.browserB} | ${diff.diffPercent}% | ${diff.diffImagePath} |`,
          );
        }
      }
    }
  }

  lines.push('');
  lines.push('## WebKit/Safari Issues');
  lines.push('');

  const webkitResult = results.find((r) => r.browser === 'webkit');
  if (webkitResult && webkitResult.issues.length > 0) {
    lines.push('**Critical — Awwwards jury uses Safari/Mac:**');
    for (const issue of webkitResult.issues) {
      lines.push(`- ${issue}`);
    }
  } else if (webkitResult) {
    lines.push('No WebKit-specific issues detected.');
  } else {
    lines.push('WebKit was not tested.');
  }

  lines.push('');
  lines.push('## All Browser Issues');
  lines.push('');

  for (const result of results) {
    if (result.issues.length > 0) {
      lines.push(`### ${result.browser}`);
      for (const issue of result.issues) {
        lines.push(`- ${issue}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
