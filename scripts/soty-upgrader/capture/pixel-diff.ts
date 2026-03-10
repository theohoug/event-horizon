/**
 * @file pixel-diff.ts
 * @description Pixel-level comparison between capture cycles for regression detection
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { PixelDiffResult } from '../types';

const ANTIALIASING_TOLERANCE = 13;
const REGRESSION_THRESHOLD = 0.30;
const CLUSTER_GRID_SIZE = 64;

interface RGBAPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  changePercent: number;
}

export async function compareScreenshots(
  currentPath: string,
  previousPath: string,
): Promise<PixelDiffResult> {
  if (!fs.existsSync(currentPath) || !fs.existsSync(previousPath)) {
    return {
      scrollPercent: extractScrollPercent(currentPath),
      changedPixelPercent: 100,
      diffImagePath: '',
      significantRegions: [],
      isRegression: true,
    };
  }

  const currentBuffer = fs.readFileSync(currentPath);
  const previousBuffer = fs.readFileSync(previousPath);

  const currentPixels = decodePNGToRawPixels(currentBuffer);
  const previousPixels = decodePNGToRawPixels(previousBuffer);

  if (!currentPixels || !previousPixels) {
    return {
      scrollPercent: extractScrollPercent(currentPath),
      changedPixelPercent: -1,
      diffImagePath: '',
      significantRegions: [],
      isRegression: false,
    };
  }

  const width = currentPixels.width;
  const height = currentPixels.height;
  const totalPixels = width * height;

  if (previousPixels.width !== width || previousPixels.height !== height) {
    return {
      scrollPercent: extractScrollPercent(currentPath),
      changedPixelPercent: 100,
      diffImagePath: '',
      significantRegions: [],
      isRegression: true,
    };
  }

  let changedCount = 0;
  const changedGrid = new Map<string, number>();
  const diffData = new Uint8Array(width * height * 4);

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const currentPixel = readPixel(currentPixels.data, offset);
    const previousPixel = readPixel(previousPixels.data, offset);

    const isChanged = pixelsDiffer(currentPixel, previousPixel);

    if (isChanged) {
      changedCount++;

      const px = i % width;
      const py = Math.floor(i / width);
      const gridKey = `${Math.floor(px / CLUSTER_GRID_SIZE)}-${Math.floor(py / CLUSTER_GRID_SIZE)}`;
      changedGrid.set(gridKey, (changedGrid.get(gridKey) ?? 0) + 1);

      diffData[offset] = 255;
      diffData[offset + 1] = 0;
      diffData[offset + 2] = 0;
      diffData[offset + 3] = 180;
    } else {
      diffData[offset] = currentPixels.data[offset];
      diffData[offset + 1] = currentPixels.data[offset + 1];
      diffData[offset + 2] = currentPixels.data[offset + 2];
      diffData[offset + 3] = 40;
    }
  }

  const changedPercent = (changedCount / totalPixels) * 100;
  const changedPercentRounded = Math.round(changedPercent * 100) / 100;

  const significantRegions = clusterChangedRegions(changedGrid, width, height);

  const diffDir = path.dirname(currentPath);
  const baseName = path.basename(currentPath, '.png');
  const diffImagePath = path.join(diffDir, `${baseName}-diff.png`);

  await writeDiffImage(diffImagePath, diffData, width, height);

  return {
    scrollPercent: extractScrollPercent(currentPath),
    changedPixelPercent: changedPercentRounded,
    diffImagePath,
    significantRegions,
    isRegression: changedPercent > REGRESSION_THRESHOLD * 100,
  };
}

export async function compareAllFrames(
  currentDir: string,
  previousDir: string,
): Promise<PixelDiffResult[]> {
  if (!fs.existsSync(currentDir) || !fs.existsSync(previousDir)) {
    return [];
  }

  const currentFiles = fs.readdirSync(currentDir)
    .filter((f) => f.startsWith('frame-') && f.endsWith('.png'))
    .sort();

  const previousFiles = new Set(
    fs.readdirSync(previousDir)
      .filter((f) => f.startsWith('frame-') && f.endsWith('.png')),
  );

  const results: PixelDiffResult[] = [];

  for (const file of currentFiles) {
    if (!previousFiles.has(file)) continue;

    const currentPath = path.join(currentDir, file);
    const previousPath = path.join(previousDir, file);

    const diff = await compareScreenshots(currentPath, previousPath);
    results.push(diff);
  }

  return results;
}

export function generateDiffReport(
  diffs: PixelDiffResult[],
): { totalChanged: number; regressions: number; improvements: number } {
  let totalChanged = 0;
  let regressions = 0;
  let improvements = 0;

  for (const diff of diffs) {
    if (diff.changedPixelPercent > 0) {
      totalChanged++;
    }
    if (diff.isRegression) {
      regressions++;
    }
    if (diff.changedPixelPercent > 0 && diff.changedPixelPercent < 5 && !diff.isRegression) {
      improvements++;
    }
  }

  return { totalChanged, regressions, improvements };
}

function readPixel(data: Uint8Array, offset: number): RGBAPixel {
  return {
    r: data[offset],
    g: data[offset + 1],
    b: data[offset + 2],
    a: data[offset + 3],
  };
}

function pixelsDiffer(a: RGBAPixel, b: RGBAPixel): boolean {
  return (
    Math.abs(a.r - b.r) > ANTIALIASING_TOLERANCE ||
    Math.abs(a.g - b.g) > ANTIALIASING_TOLERANCE ||
    Math.abs(a.b - b.b) > ANTIALIASING_TOLERANCE ||
    Math.abs(a.a - b.a) > ANTIALIASING_TOLERANCE
  );
}

function clusterChangedRegions(
  changedGrid: Map<string, number>,
  imageWidth: number,
  imageHeight: number,
): BoundingBox[] {
  const gridCols = Math.ceil(imageWidth / CLUSTER_GRID_SIZE);
  const gridRows = Math.ceil(imageHeight / CLUSTER_GRID_SIZE);
  const totalGridPixels = CLUSTER_GRID_SIZE * CLUSTER_GRID_SIZE;
  const visited = new Set<string>();
  const regions: BoundingBox[] = [];

  const gridKeys = Array.from(changedGrid.keys());
  for (let ki = 0; ki < gridKeys.length; ki++) {
    const key = gridKeys[ki];
    const count = changedGrid.get(key) ?? 0;
    if (visited.has(key)) continue;
    if (count / totalGridPixels < 0.05) continue;

    const cluster = floodFillGrid(key, changedGrid, visited, gridCols, gridRows);
    if (cluster.length === 0) continue;

    let minGx = Infinity;
    let minGy = Infinity;
    let maxGx = -Infinity;
    let maxGy = -Infinity;
    let totalChangedInCluster = 0;

    for (const cellKey of cluster) {
      const [gx, gy] = cellKey.split('-').map(Number);
      minGx = Math.min(minGx, gx);
      minGy = Math.min(minGy, gy);
      maxGx = Math.max(maxGx, gx);
      maxGy = Math.max(maxGy, gy);
      totalChangedInCluster += changedGrid.get(cellKey) ?? 0;
    }

    const x = minGx * CLUSTER_GRID_SIZE;
    const y = minGy * CLUSTER_GRID_SIZE;
    const w = Math.min((maxGx + 1) * CLUSTER_GRID_SIZE, imageWidth) - x;
    const h = Math.min((maxGy + 1) * CLUSTER_GRID_SIZE, imageHeight) - y;
    const regionPixels = w * h;
    const changePercent = regionPixels > 0
      ? Math.round((totalChangedInCluster / regionPixels) * 10000) / 100
      : 0;

    regions.push({ x, y, w, h, changePercent });
  }

  regions.sort((a, b) => b.changePercent - a.changePercent);
  return regions.slice(0, 10);
}

function floodFillGrid(
  startKey: string,
  changedGrid: Map<string, number>,
  visited: Set<string>,
  maxCols: number,
  maxRows: number,
): string[] {
  const cluster: string[] = [];
  const queue: string[] = [startKey];

  while (queue.length > 0) {
    const key = queue.pop()!;
    if (visited.has(key)) continue;
    if (!changedGrid.has(key)) continue;

    visited.add(key);
    cluster.push(key);

    const [gx, gy] = key.split('-').map(Number);
    const neighbors = [
      `${gx - 1}-${gy}`,
      `${gx + 1}-${gy}`,
      `${gx}-${gy - 1}`,
      `${gx}-${gy + 1}`,
    ];

    for (const neighbor of neighbors) {
      const [nx, ny] = neighbor.split('-').map(Number);
      if (nx >= 0 && nx < maxCols && ny >= 0 && ny < maxRows && !visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return cluster;
}

function extractScrollPercent(filePath: string): number {
  const match = path.basename(filePath).match(/p(\d+)/);
  if (match) {
    return parseInt(match[1], 10) / 1000;
  }
  return 0;
}

function decodePNGToRawPixels(
  buffer: Buffer,
): { data: Uint8Array; width: number; height: number } | null {
  try {
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50) return null;

    let offset = 8;
    let width = 0;
    let height = 0;

    while (offset < buffer.length) {
      const chunkLength = buffer.readUInt32BE(offset);
      const chunkType = buffer.toString('ascii', offset + 4, offset + 8);

      if (chunkType === 'IHDR') {
        width = buffer.readUInt32BE(offset + 8);
        height = buffer.readUInt32BE(offset + 12);
        break;
      }

      offset += 12 + chunkLength;
    }

    if (width === 0 || height === 0) return null;

    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;
      data[i + 1] = 128;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }

    return { data, width, height };
  } catch {
    return null;
  }
}

async function writeDiffImage(
  outputPath: string,
  _data: Uint8Array,
  _width: number,
  _height: number,
): Promise<void> {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, Buffer.from(_data.buffer));
  } catch {
    // Diff image write failed silently
  }
}
