/**
 * @file autonomous-loop.ts
 * @description Autonomous loop runner — captures, generates analysis instructions, waits for fixes, repeats
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { runCaptureCycle, summarizeCycle } from './cycle-manager';
import { shouldContinue } from './convergence-checker';
import { loadPreviousCycleReport, ensureDir } from '../utils/file-utils';
import { log } from '../utils/logger';

const AUDIT_BASE = CONFIG.AUDIT_ROOT;
const HANDOFF_FILE = path.join(AUDIT_BASE, 'CLAUDE-ANALYZE-THIS.md');
const FIX_SIGNAL_FILE = path.join(AUDIT_BASE, 'FIXES-APPLIED.signal');
const STOP_FILE = path.join(AUDIT_BASE, 'STOP.signal');

function detectNextCycleNumber(): number {
  const reportsDir = path.join(CONFIG.SCRIPTS_ROOT, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    return 1;
  }

  const existingCycles = fs.readdirSync(reportsDir)
    .filter((d) => d.startsWith('cycle-'))
    .map((d) => parseInt(d.replace('cycle-', ''), 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);

  if (existingCycles.length === 0) return 1;
  return existingCycles[existingCycles.length - 1] + 1;
}

function generateAnalysisInstructions(cycleNumber: number, cycleDir: string): string {
  const scoringPrompt = fs.readFileSync(
    path.join(CONFIG.SCRIPTS_ROOT, 'data', 'scoring-prompt.md'),
    'utf-8'
  );

  const screenshotDir = path.join(cycleDir, 'screenshots');
  const screenshots = fs.existsSync(screenshotDir)
    ? fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png')).sort()
    : [];

  const keyFrames = [
    'frame-000.png', 'frame-005.png', 'frame-010.png', 'frame-015.png',
    'frame-020.png', 'frame-025.png', 'frame-030.png', 'frame-035.png',
    'frame-040.png', 'frame-045.png', 'frame-050.png', 'frame-055.png',
    'frame-060.png', 'frame-065.png', 'frame-070.png', 'frame-075.png',
    'frame-080.png', 'frame-085.png', 'frame-090.png', 'frame-095.png',
    'frame-100.png',
  ].filter(f => screenshots.includes(f));

  const lines: string[] = [];

  lines.push('# SOTY UPGRADER — CYCLE ' + cycleNumber + ' ANALYSIS REQUEST');
  lines.push('');
  lines.push('## INSTRUCTIONS FOR CLAUDE CODE');
  lines.push('');
  lines.push('You MUST follow these steps in order:');
  lines.push('');
  lines.push('### Step 1: Read the scoring protocol');
  lines.push('Read this file COMPLETELY before analyzing any screenshot.');
  lines.push('');
  lines.push(scoringPrompt);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('### Step 2: Read the reference data');
  lines.push('Before scoring, read these files to calibrate your standards:');
  lines.push(`- ${path.join(CONFIG.SCRIPTS_ROOT, 'data/awwwards/soty-winners/patterns-communs.json')}`);
  lines.push(`- ${path.join(CONFIG.SCRIPTS_ROOT, 'data/awwwards/honoree-vs-soty.json')}`);
  lines.push(`- ${path.join(CONFIG.SCRIPTS_ROOT, 'data/blackhole/interstellar-reference.json')}`);
  lines.push('');
  lines.push('### Step 3: Analyze every key frame');
  lines.push('Open and analyze each of these screenshots using Read():');
  lines.push('');

  for (const frame of keyFrames) {
    const pct = parseInt(frame.replace('frame-', '').replace('.png', ''), 10);
    let chapter = 'UNKNOWN';
    for (let i = CONFIG.chapters.length - 1; i >= 0; i--) {
      if (pct / 100 >= CONFIG.chapters[i].scrollStart) {
        chapter = CONFIG.chapters[i].name;
        break;
      }
    }
    lines.push(`- **${pct}%** (${chapter}): \`${path.join(screenshotDir, frame)}\``);
  }

  lines.push('');
  lines.push('### Step 4: Read performance data');
  lines.push(`- ${path.join(cycleDir, 'cycle-report.json')}`);
  lines.push(`- ${path.join(cycleDir, 'accessibility-report.json')}`);
  lines.push(`- ${path.join(cycleDir, 'browser-report.md')}`);
  lines.push(`- ${path.join(cycleDir, 'mobile-report.json')}`);
  lines.push('');
  lines.push('### Step 5: Score each frame');
  lines.push('Use the scoring grid from the protocol. DEFAULT IS 50. Add points for excellence.');
  lines.push('BE BRUTAL. Remember: 95+ means SOTY-winning quality.');
  lines.push('');
  lines.push('### Step 6: Write the audit report');
  lines.push(`Write the full audit to: ${path.join(AUDIT_BASE, 'cycle-' + cycleNumber + '_analysis.md')}`);
  lines.push('Include every frame score, every flag, every fix suggestion.');
  lines.push('');
  lines.push('### Step 7: Implement fixes');
  lines.push('Based on your analysis, fix the issues in the source code:');
  lines.push(`- Shaders: ${path.join(CONFIG.PROJECT_ROOT, 'src/shaders/')}`);
  lines.push(`- CSS: ${path.join(CONFIG.PROJECT_ROOT, 'src/styles/global.css')}`);
  lines.push(`- Engine: ${path.join(CONFIG.PROJECT_ROOT, 'src/engine/')}`);
  lines.push(`- Narrative: ${path.join(CONFIG.PROJECT_ROOT, 'src/narrative/')}`);
  lines.push(`- Audio: ${path.join(CONFIG.PROJECT_ROOT, 'src/audio/')}`);
  lines.push('');
  lines.push('### Step 8: Signal completion');
  lines.push(`After all fixes are applied, create this file: ${FIX_SIGNAL_FILE}`);
  lines.push('Write the number of fixes applied in it.');
  lines.push('The SOTY Upgrader will automatically detect this and start the next capture cycle.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Total screenshots available: ${screenshots.length}`);
  lines.push(`Key frames to analyze: ${keyFrames.length}`);
  lines.push(`Cycle directory: ${cycleDir}`);
  lines.push(`Audit output: ${AUDIT_BASE}`);

  return lines.join('\n');
}

async function waitForFixSignal(): Promise<number> {
  log('Waiting for Claude Code to analyze and apply fixes...', 'info');
  log(`Watching for: ${FIX_SIGNAL_FILE}`, 'info');
  log(`To stop the loop, create: ${STOP_FILE}`, 'info');

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (fs.existsSync(STOP_FILE)) {
        clearInterval(checkInterval);
        fs.unlinkSync(STOP_FILE);
        log('STOP signal detected. Ending loop.', 'warn');
        resolve(-1);
        return;
      }

      if (fs.existsSync(FIX_SIGNAL_FILE)) {
        clearInterval(checkInterval);
        const content = fs.readFileSync(FIX_SIGNAL_FILE, 'utf-8').trim();
        const fixCount = parseInt(content, 10) || 0;
        fs.unlinkSync(FIX_SIGNAL_FILE);
        log(`Fix signal detected. ${fixCount} fixes applied.`, 'success');
        resolve(fixCount);
      }
    }, 5000);
  });
}

export async function runAutonomousLoop(maxCycles?: number): Promise<void> {
  const limit = maxCycles ?? CONFIG.scoring.maxCycles;
  ensureDir(AUDIT_BASE);

  log('=== AUTONOMOUS LOOP STARTED ===', 'phase');
  log(`Max cycles: ${limit}`, 'info');
  log(`Audit output: ${AUDIT_BASE}`, 'info');
  log(`Stop file: ${STOP_FILE}`, 'info');

  for (let i = 0; i < limit; i++) {
    const cycleNumber = detectNextCycleNumber();
    log(`\n=== CYCLE ${cycleNumber} / ${limit} ===`, 'phase');

    const report = await runCaptureCycle(cycleNumber);
    const summary = summarizeCycle(report);

    const cycleDir = path.join(CONFIG.SCRIPTS_ROOT, 'reports', `cycle-${cycleNumber}`);
    fs.writeFileSync(path.join(cycleDir, 'summary.md'), summary, 'utf-8');

    const instructions = generateAnalysisInstructions(cycleNumber, cycleDir);
    fs.writeFileSync(HANDOFF_FILE, instructions, 'utf-8');
    log(`Analysis instructions written to: ${HANDOFF_FILE}`, 'success');

    const previousReport = loadPreviousCycleReport(cycleNumber);
    const convergence = shouldContinue(report, previousReport, limit);

    if (!convergence.continue) {
      log(`LOOP STOPPED: ${convergence.reason}`, 'success');

      const finalReport = [
        '# SOTY Upgrader — Final Report',
        '',
        `Stopped after cycle ${cycleNumber}: ${convergence.reason}`,
        '',
        summary,
      ].join('\n');

      fs.writeFileSync(path.join(AUDIT_BASE, 'FINAL-REPORT.md'), finalReport, 'utf-8');
      break;
    }

    const fixCount = await waitForFixSignal();

    if (fixCount === -1) {
      log('Loop manually stopped.', 'warn');
      break;
    }

    if (fixCount === 0) {
      log('No fixes applied. Stopping loop.', 'warn');
      break;
    }

    log(`${fixCount} fixes applied. Starting next cycle...`, 'success');
  }

  log('=== AUTONOMOUS LOOP ENDED ===', 'phase');
}
