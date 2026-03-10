/**
 * @file score-calculator.ts
 * @description Score computation, thresholds, and convergence logic for SOTY audit cycles
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { CONFIG } from '../config';
import type { CycleReport, DesignScore } from '../types';

interface ScoreSummary {
  avg: number;
  min: number;
  max: number;
  median: number;
  p5: number;
  p95: number;
  belowThreshold: number;
}

type EmotionalArcConfig = typeof CONFIG.emotionalArc;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function median(sorted: number[]): number {
  return percentile(sorted, 50);
}

export function calculateFrameScore(frame: DesignScore): number {
  const weights = {
    design: 0.20,
    color: 0.15,
    composition: 0.15,
    typography: 0.10,
    emotion: 0.25,
    scientificAccuracy: 0.15,
  };

  return (
    frame.design * weights.design +
    frame.color * weights.color +
    frame.composition * weights.composition +
    frame.typography * weights.typography +
    frame.emotion * weights.emotion +
    frame.scientificAccuracy * weights.scientificAccuracy
  );
}

export function calculateOverallScore(designScores: DesignScore[]): number {
  if (designScores.length === 0) return 0;

  const frameScores = designScores.map(calculateFrameScore);
  const sorted = [...frameScores].sort((a, b) => a - b);

  const avg = frameScores.reduce((sum, s) => sum + s, 0) / frameScores.length;
  const p5 = percentile(sorted, 5);

  const avgWeight = 0.6;
  const p5Weight = 0.4;

  return avg * avgWeight + p5 * p5Weight;
}

export function identifyBelowThreshold(
  scores: DesignScore[],
  threshold: number
): DesignScore[] {
  return scores
    .filter(s => s.overall < threshold)
    .sort((a, b) => a.overall - b.overall);
}

export function calculateImprovement(
  current: CycleReport,
  previous: CycleReport
): number {
  return current.overallScore - previous.overallScore;
}

export function shouldContinueLoop(
  current: CycleReport,
  previous: CycleReport | null
): boolean {
  if (current.overallScore >= CONFIG.scoring.threshold) {
    return false;
  }

  if (current.cycleNumber >= CONFIG.scoring.maxCycles) {
    return false;
  }

  if (previous) {
    const improvement = calculateImprovement(current, previous);
    if (
      improvement >= 0 &&
      improvement < CONFIG.scoring.convergenceDelta &&
      current.cycleNumber > 3
    ) {
      return false;
    }
  }

  return true;
}

export function generateScoreSummary(scores: DesignScore[]): ScoreSummary {
  if (scores.length === 0) {
    return { avg: 0, min: 0, max: 0, median: 0, p5: 0, p95: 0, belowThreshold: 0 };
  }

  const overalls = scores.map(s => s.overall);
  const sorted = [...overalls].sort((a, b) => a - b);

  const avg = overalls.reduce((sum, s) => sum + s, 0) / overalls.length;

  return {
    avg: parseFloat(avg.toFixed(2)),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: parseFloat(median(sorted).toFixed(2)),
    p5: parseFloat(percentile(sorted, 5).toFixed(2)),
    p95: parseFloat(percentile(sorted, 95).toFixed(2)),
    belowThreshold: overalls.filter(s => s < CONFIG.scoring.threshold).length,
  };
}

export function calculateEmotionalArcScore(
  scores: DesignScore[],
  arcConfig: EmotionalArcConfig
): number {
  if (scores.length === 0) return 0;

  const acts = [
    { ...arcConfig.act1, expectedTrend: 'rising' as const },
    { ...arcConfig.act2, expectedTrend: 'peak' as const },
    { ...arcConfig.act3, expectedTrend: 'climax' as const },
    { ...arcConfig.epilogue, expectedTrend: 'release' as const },
  ];

  let totalActScore = 0;
  let actCount = 0;

  for (const act of acts) {
    const [rangeStart, rangeEnd] = act.range;
    const actScores = scores.filter(
      s => s.scrollPercent >= rangeStart && s.scrollPercent < rangeEnd
    );

    if (actScores.length === 0) continue;
    actCount++;

    const avgEmotion = actScores.reduce((sum, s) => sum + s.emotion, 0) / actScores.length;

    const emotionVariance = actScores.length > 1
      ? actScores.reduce((sum, s) => sum + Math.pow(s.emotion - avgEmotion, 2), 0) / actScores.length
      : 0;

    let trendScore = 0;

    switch (act.expectedTrend) {
      case 'rising': {
        const firstHalf = actScores.slice(0, Math.floor(actScores.length / 2));
        const secondHalf = actScores.slice(Math.floor(actScores.length / 2));
        const firstAvg = firstHalf.reduce((s, f) => s + f.emotion, 0) / (firstHalf.length || 1);
        const secondAvg = secondHalf.reduce((s, f) => s + f.emotion, 0) / (secondHalf.length || 1);
        trendScore = secondAvg > firstAvg ? 100 : 50 + (secondAvg / (firstAvg || 1)) * 25;
        break;
      }
      case 'peak': {
        const maxEmotion = Math.max(...actScores.map(s => s.emotion));
        trendScore = maxEmotion >= 90 ? 100 : maxEmotion;
        break;
      }
      case 'climax': {
        const maxEmotion = Math.max(...actScores.map(s => s.emotion));
        const dynamicRange = maxEmotion - Math.min(...actScores.map(s => s.emotion));
        trendScore = (maxEmotion * 0.6) + (Math.min(dynamicRange, 40) * 0.4 / 40 * 100);
        break;
      }
      case 'release': {
        const lastScores = actScores.slice(-3);
        const lastAvg = lastScores.reduce((s, f) => s + f.emotion, 0) / (lastScores.length || 1);
        const hasResolution = lastAvg >= 70 && lastAvg <= 95;
        trendScore = hasResolution ? 100 : 60 + lastAvg * 0.3;
        break;
      }
    }

    const varianceBonus = Math.min(emotionVariance, 100) * 0.1;
    const actFinalScore = Math.min(100, trendScore + varianceBonus);
    totalActScore += actFinalScore;
  }

  return actCount > 0
    ? parseFloat((totalActScore / actCount).toFixed(2))
    : 0;
}
