/**
 * @file convergence-checker.ts
 * @description Determines whether the audit loop should continue based on scores and convergence
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { CONFIG } from '../config';
import type { CycleReport } from '../types';
import { log } from '../utils/logger';

type StopReason = 'goal_reached' | 'max_cycles' | 'diminishing_returns' | 'continuing';

interface ConvergenceResult {
  continue: boolean;
  reason: StopReason;
}

function computeAverageDesignScore(report: CycleReport): number {
  if (report.designScores.length === 0) return report.overallScore;

  const totalOverall = report.designScores.reduce((sum, s) => sum + s.overall, 0);
  return totalOverall / report.designScores.length;
}

function countCriticalFixes(report: CycleReport): number {
  return report.fixesApplied.filter(
    (f) => (f.priority === 'P0' || f.priority === 'P1') && !f.applied,
  ).length;
}

export function shouldContinue(
  current: CycleReport,
  previous: CycleReport | null,
  maxCycles: number,
): ConvergenceResult {
  const threshold = CONFIG.scoring.threshold;
  const convergenceDelta = CONFIG.scoring.convergenceDelta;

  const currentAvg = computeAverageDesignScore(current);
  const allAboveThreshold = current.designScores.length > 0
    ? current.designScores.every((s) => s.overall >= threshold)
    : currentAvg >= threshold;

  if (allAboveThreshold && currentAvg >= threshold) {
    log(`Goal reached: average score ${currentAvg.toFixed(1)} >= ${threshold}`, 'success');
    return { continue: false, reason: 'goal_reached' };
  }

  if (current.cycleNumber >= maxCycles) {
    log(`Max cycles reached: ${current.cycleNumber} >= ${maxCycles}`, 'warn');
    return { continue: false, reason: 'max_cycles' };
  }

  if (previous) {
    const previousAvg = computeAverageDesignScore(previous);
    const improvement = currentAvg - previousAvg;

    if (Math.abs(improvement) < convergenceDelta) {
      const criticalRemaining = countCriticalFixes(current);

      if (criticalRemaining === 0) {
        log(
          `Diminishing returns: improvement ${improvement.toFixed(2)} < ${convergenceDelta}, no critical fixes remaining`,
          'warn',
        );
        return { continue: false, reason: 'diminishing_returns' };
      }

      log(
        `Low improvement (${improvement.toFixed(2)}) but ${criticalRemaining} critical fix(es) remaining — continuing`,
        'info',
      );
    }
  }

  log(
    `Continuing: score ${currentAvg.toFixed(1)} < ${threshold}, cycle ${current.cycleNumber} < ${maxCycles}`,
    'info',
  );

  return { continue: true, reason: 'continuing' };
}
