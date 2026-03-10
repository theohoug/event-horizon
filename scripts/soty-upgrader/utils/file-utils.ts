/**
 * @file file-utils.ts
 * @description File I/O helpers for capture frames, cycle reports, and screenshots
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import type { CaptureFrame, CycleReport } from '../types';
import { log } from './logger';

const REPORTS_BASE = path.join(CONFIG.SCRIPTS_ROOT, 'reports');
const AUDIT_BASE = CONFIG.AUDIT_ROOT;
const DATA_BASE = path.join(CONFIG.SCRIPTS_ROOT, 'data');

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getReportDir(cycleNumber: number): string {
  const dir = path.join(REPORTS_BASE, `cycle-${cycleNumber}`);
  ensureDir(dir);
  return dir;
}

export function saveCaptureFrame(frame: CaptureFrame, cycleDir: string): void {
  const framesDir = path.join(cycleDir, 'frames');
  ensureDir(framesDir);

  const scrollTag = String(Math.round(frame.position.percent * 100)).padStart(3, '0');
  const framePath = path.join(framesDir, `frame-${scrollTag}.json`);

  try {
    fs.writeFileSync(framePath, JSON.stringify(frame, null, 2), 'utf-8');
  } catch (err) {
    log(`Failed to save frame at ${frame.position.percent}: ${err}`, 'error');
    throw err;
  }
}

export function loadCaptureFrames(cycleDir: string): CaptureFrame[] {
  const framesDir = path.join(cycleDir, 'frames');
  if (!fs.existsSync(framesDir)) return [];

  const files = fs.readdirSync(framesDir)
    .filter(f => f.startsWith('frame-') && f.endsWith('.json'))
    .sort();

  const frames: CaptureFrame[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(framesDir, file), 'utf-8');
      frames.push(JSON.parse(raw) as CaptureFrame);
    } catch (err) {
      log(`Failed to load frame ${file}: ${err}`, 'warn');
    }
  }

  return frames;
}

export function saveCycleReport(report: CycleReport, cycleDir: string): void {
  ensureDir(cycleDir);
  const reportPath = path.join(cycleDir, 'cycle-report.json');

  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    log(`Cycle report saved to ${reportPath}`, 'success');
  } catch (err) {
    log(`Failed to save cycle report: ${err}`, 'error');
    throw err;
  }
}

export function loadPreviousCycleReport(cycleNumber: number): CycleReport | null {
  if (cycleNumber <= 1) return null;

  const previousDir = getReportDir(cycleNumber - 1);
  const reportPath = path.join(previousDir, 'cycle-report.json');

  if (!fs.existsSync(reportPath)) {
    log(`No previous cycle report found at ${reportPath}`, 'warn');
    return null;
  }

  try {
    const raw = fs.readFileSync(reportPath, 'utf-8');
    return JSON.parse(raw) as CycleReport;
  } catch (err) {
    log(`Failed to load previous cycle report: ${err}`, 'error');
    return null;
  }
}

export function saveScreenshot(buffer: Buffer, screenshotPath: string): void {
  const dir = path.dirname(screenshotPath);
  ensureDir(dir);

  try {
    fs.writeFileSync(screenshotPath, buffer);
  } catch (err) {
    log(`Failed to save screenshot to ${screenshotPath}: ${err}`, 'error');
    throw err;
  }
}

export function cleanOldReports(keepLast: number): void {
  if (!fs.existsSync(REPORTS_BASE)) return;

  const cycleDirs = fs.readdirSync(REPORTS_BASE)
    .filter(d => d.startsWith('cycle-'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('cycle-', ''), 10);
      const numB = parseInt(b.replace('cycle-', ''), 10);
      return numA - numB;
    });

  if (cycleDirs.length <= keepLast) return;

  const toRemove = cycleDirs.slice(0, cycleDirs.length - keepLast);

  for (const dir of toRemove) {
    const fullPath = path.join(REPORTS_BASE, dir);
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      log(`Removed old report directory: ${dir}`, 'info');
    } catch (err) {
      log(`Failed to remove ${dir}: ${err}`, 'warn');
    }
  }
}

export function readDataFile(relativePath: string): unknown {
  const fullPath = path.join(DATA_BASE, relativePath);

  if (!fs.existsSync(fullPath)) {
    log(`Data file not found: ${fullPath}`, 'error');
    return null;
  }

  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    log(`Failed to read data file ${relativePath}: ${err}`, 'error');
    return null;
  }
}

export function writeJSON(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    log(`Failed to write JSON to ${filePath}: ${err}`, 'error');
    throw err;
  }
}

export function getAuditDir(cycleNumber: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(AUDIT_BASE, `cycle-${cycleNumber}_${timestamp}`);
  ensureDir(dir);
  return dir;
}

export function exportAuditReport(report: CycleReport, cycleDir: string): string {
  const auditDir = getAuditDir(report.cycleNumber);

  ensureDir(path.join(auditDir, 'screenshots'));
  ensureDir(path.join(auditDir, 'screenshots-flagged'));

  const summary = generateAuditMarkdown(report);
  fs.writeFileSync(path.join(auditDir, 'AUDIT.md'), summary, 'utf-8');

  fs.writeFileSync(
    path.join(auditDir, 'scores.json'),
    JSON.stringify({
      cycle: report.cycleNumber,
      timestamp: report.timestamp,
      overallScore: report.overallScore,
      improvement: report.improvementFromPrevious,
      belowThreshold: report.belowThresholdCount,
      designScores: report.designScores,
      performanceReport: report.performanceReport,
      audioReport: report.audioReport,
      accessibilityReport: report.accessibilityReport,
    }, null, 2),
    'utf-8'
  );

  const screenshotsSource = path.join(cycleDir, 'screenshots');
  if (fs.existsSync(screenshotsSource)) {
    for (const file of fs.readdirSync(screenshotsSource)) {
      fs.copyFileSync(
        path.join(screenshotsSource, file),
        path.join(auditDir, 'screenshots', file)
      );
    }
  }

  if (report.designScores) {
    const flagged = report.designScores.filter(s => s.overall < 95);
    for (const score of flagged) {
      const basename = path.basename(score.screenshotPath);
      const src = path.join(cycleDir, 'screenshots', basename);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(auditDir, 'screenshots-flagged', basename));
      }
    }
  }

  updateAuditIndex();

  log(`Audit exported to ${auditDir}`, 'success');
  return auditDir;
}

function generateAuditMarkdown(report: CycleReport): string {
  const lines: string[] = [];

  lines.push('# SOTY Upgrader — Audit Report');
  lines.push(`## Cycle ${report.cycleNumber} — ${report.timestamp}`);
  lines.push('');
  lines.push(`### Score Global : ${report.overallScore.toFixed(1)}/100`);
  lines.push(`### Amélioration : +${report.improvementFromPrevious.toFixed(1)} points`);
  lines.push(`### Frames < 95 : ${report.belowThresholdCount}`);
  lines.push('');

  if (report.performanceReport) {
    lines.push('---');
    lines.push('### Performance');
    lines.push(`| Métrique | Valeur |`);
    lines.push(`|----------|--------|`);
    lines.push(`| FPS moyen | ${report.performanceReport.fpsAverage.toFixed(1)} |`);
    lines.push(`| FPS min | ${report.performanceReport.fpsMin} |`);
    lines.push(`| Memory leak | ${report.performanceReport.memoryLeakDetected ? 'OUI' : 'NON'} |`);
    lines.push(`| Lighthouse Perf | ${report.performanceReport.lighthousePerformance} |`);
    lines.push(`| LCP | ${report.performanceReport.lcp}ms |`);
    lines.push(`| FCP | ${report.performanceReport.fcp}ms |`);
    lines.push(`| CLS | ${report.performanceReport.cls} |`);
    lines.push('');
  }

  if (report.designScores?.length) {
    lines.push('---');
    lines.push('### Design Scores');
    lines.push('| Scroll% | Design | Color | Composition | Typo | Emotion | Science | Overall | Flags |');
    lines.push('|---------|--------|-------|-------------|------|---------|---------|---------|-------|');

    for (const score of report.designScores) {
      const pct = (score.scrollPercent * 100).toFixed(0);
      const flagStr = score.flags.length > 0 ? score.flags.join(', ') : '-';
      lines.push(
        `| ${pct}% | ${score.design} | ${score.color} | ${score.composition} | ${score.typography} | ${score.emotion} | ${score.scientificAccuracy} | **${score.overall.toFixed(1)}** | ${flagStr} |`
      );
    }
    lines.push('');

    const flagged = report.designScores.filter(s => s.overall < 95);
    if (flagged.length > 0) {
      lines.push('### Frames Flagged (< 95)');
      for (const s of flagged) {
        lines.push(`- **${(s.scrollPercent * 100).toFixed(0)}%** — Score: ${s.overall.toFixed(1)} — ${s.flags.join(', ')}`);
        if (s.suggestions.length) {
          for (const sug of s.suggestions) {
            lines.push(`  - Fix: ${sug}`);
          }
        }
      }
      lines.push('');
    }
  }

  if (report.scienceChecks?.length) {
    const issues = report.scienceChecks.filter(c => !c.accurate);
    if (issues.length > 0) {
      lines.push('---');
      lines.push('### Science Issues');
      for (const check of issues) {
        lines.push(`- **${check.property}** @ ${(check.scrollPercent * 100).toFixed(0)}% — Expected: ${check.expected}, Got: ${check.actual} (${check.severity})`);
      }
      lines.push('');
    }
  }

  if (report.audioReport) {
    lines.push('---');
    lines.push('### Audio');
    lines.push(`| Métrique | Valeur |`);
    lines.push(`|----------|--------|`);
    lines.push(`| Zones silencieuses | ${report.audioReport.silentZones.length} |`);
    lines.push(`| Arc émotionnel match | ${report.audioReport.emotionalArcMatch.toFixed(1)}% |`);
    lines.push(`| Présence basses | ${report.audioReport.bassPresence.toFixed(1)}% |`);
    lines.push(`| Dynamic range | ${report.audioReport.dynamicRange.toFixed(1)} |`);
    lines.push('');
  }

  if (report.accessibilityReport) {
    lines.push('---');
    lines.push('### Accessibilité');
    lines.push(`| Check | Statut |`);
    lines.push(`|-------|--------|`);
    lines.push(`| Score | ${report.accessibilityReport.score}/100 |`);
    lines.push(`| Keyboard nav | ${report.accessibilityReport.keyboardNavigable ? 'OK' : 'FAIL'} |`);
    lines.push(`| ARIA labels | ${report.accessibilityReport.ariaLabelsPresent ? 'OK' : 'FAIL'} |`);
    lines.push(`| Reduced motion | ${report.accessibilityReport.reducedMotionRespected ? 'OK' : 'FAIL'} |`);
    lines.push(`| Focus indicators | ${report.accessibilityReport.focusIndicatorsVisible ? 'OK' : 'FAIL'} |`);
    lines.push(`| Contrast issues | ${report.accessibilityReport.contrastIssues.length} |`);
    lines.push('');
  }

  if (report.fixesApplied?.length) {
    lines.push('---');
    lines.push('### Fixes Appliqués');
    lines.push('| Priorité | Catégorie | Fichier | Description |');
    lines.push('|----------|-----------|---------|-------------|');
    for (const fix of report.fixesApplied) {
      lines.push(`| ${fix.priority} | ${fix.category} | ${fix.file} | ${fix.description} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by SOTY Upgrader v1.0 — Cleanlystudio*');

  return lines.join('\n');
}

function updateAuditIndex(): void {
  ensureDir(AUDIT_BASE);

  const dirs = fs.readdirSync(AUDIT_BASE)
    .filter(d => d.startsWith('cycle-'))
    .sort();

  const indexLines: string[] = [];
  indexLines.push('# SOTY Audit Index');
  indexLines.push(`*Updated: ${new Date().toISOString()}*`);
  indexLines.push('');
  indexLines.push('| Cycle | Date | Score | Amélioration | Frames < 95 |');
  indexLines.push('|-------|------|-------|-------------|-------------|');

  for (const dir of dirs) {
    const scoresPath = path.join(AUDIT_BASE, dir, 'scores.json');
    if (fs.existsSync(scoresPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(scoresPath, 'utf-8'));
        indexLines.push(
          `| ${data.cycle} | ${data.timestamp} | **${data.overallScore?.toFixed(1)}** | +${data.improvement?.toFixed(1)} | ${data.belowThreshold} |`
        );
      } catch {
        indexLines.push(`| ${dir} | ? | ? | ? | ? |`);
      }
    }
  }

  indexLines.push('');
  indexLines.push('---');
  indexLines.push('*SOTY Upgrader — Cleanlystudio*');

  fs.writeFileSync(path.join(AUDIT_BASE, 'INDEX.md'), indexLines.join('\n'), 'utf-8');
}

export function readJSON<T = unknown>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    log(`JSON file not found: ${filePath}`, 'warn');
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    log(`Failed to read JSON from ${filePath}: ${err}`, 'error');
    return null;
  }
}
