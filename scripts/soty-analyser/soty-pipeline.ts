/**
 * @file soty-pipeline.ts
 * @description SOTY Pipeline — Analyser → Upgrader → Re-Analysis with delta comparison
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const CONFIG = {
  DEV_SERVER_URL: 'http://localhost:4203',
  ANALYSES_DIR: 'C:/Users/theoo/OneDrive/Bureau/SOTY/analyses',
  PROJECT_ROOT: 'C:/Users/theoo/OneDrive/Bureau/SOTY/event-horizon',
  TASKS_PATH: 'C:/Users/theoo/OneDrive/Bureau/SOTY/event-horizon/scripts/soty-analyser/upgrade-tasks.json',
};

const A = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
  white: '\x1b[37m', bgMagenta: '\x1b[45m',
};

interface SubScore {
  name: string;
  score: number;
  maxScore: number;
  confidence: number;
  notes: string;
}

interface CategoryScore {
  category: string;
  score: number;
  confidence: number;
  subScores: SubScore[];
  penalties: { name: string; value: number; source: string }[];
  bonuses: { name: string; value: number; source: string }[];
}

interface AnalysisResult {
  timestamp: string;
  overallScore: number;
  categories: CategoryScore[];
  strengthsAndWeaknesses: {
    top3Weaknesses: string[];
    quickWins: string[];
    criticalIssues: string[];
    sotyGapAnalysis: string[];
  };
}

interface UpgradeTask {
  id: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  category: string;
  description: string;
  targetScore: number;
  currentScore: number;
  suggestedFix: string;
}

interface DeltaReport {
  timestamp: string;
  beforeTimestamp: string;
  afterTimestamp: string;
  beforeOverall: number;
  afterOverall: number;
  overallDelta: number;
  categoryDeltas: { category: string; before: number; after: number; delta: number }[];
  subScoreDeltas: { category: string; name: string; before: number; after: number; delta: number }[];
  tasksGenerated: number;
  improved: number;
  regressed: number;
  unchanged: number;
}

function log(msg: string, type: 'info' | 'ok' | 'warn' | 'error' | 'phase' = 'info') {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const prefix = {
    info: `${A.cyan}[INFO]`,
    ok: `${A.green}[ OK ]`,
    warn: `${A.yellow}[WARN]`,
    error: `${A.red}[ERR ]`,
    phase: `${A.magenta}[PHASE]`,
  }[type];
  console.log(`${A.dim}${ts}${A.reset} ${A.bold}${prefix}${A.reset} ${msg}`);
}

function printBanner() {
  console.log(`
${A.cyan}${A.bold}
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   ███████╗ ██████╗ ████████╗██╗   ██╗                    ║
  ║   ██╔════╝██╔═══██╗╚══██╔══╝╚██╗ ██╔╝                   ║
  ║   ███████╗██║   ██║   ██║    ╚████╔╝                     ║
  ║   ╚════██║██║   ██║   ██║     ╚██╔╝                      ║
  ║   ███████║╚██████╔╝   ██║      ██║                       ║
  ║   ╚══════╝ ╚═════╝    ╚═╝      ╚═╝                       ║
  ║                                                           ║
  ║${A.reset}${A.magenta}${A.bold}   P I P E L I N E    v 1 . 0${A.reset}${A.cyan}${A.bold}                           ║
  ║                                                           ║
  ║${A.reset}${A.dim}   Analyser → Upgrader → Re-Analysis → Delta Report${A.reset}${A.cyan}${A.bold}    ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
${A.reset}`);
}

function findLatestAnalysis(): AnalysisResult | null {
  if (!fs.existsSync(CONFIG.ANALYSES_DIR)) return null;

  const dirs = fs.readdirSync(CONFIG.ANALYSES_DIR)
    .filter(d => d.startsWith('analysis-') && fs.statSync(path.join(CONFIG.ANALYSES_DIR, d)).isDirectory())
    .sort()
    .reverse();

  if (dirs.length === 0) return null;

  const jsonPath = path.join(CONFIG.ANALYSES_DIR, dirs[0], 'analysis.json');
  if (!fs.existsSync(jsonPath)) return null;

  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

function mapWeaknessToFix(subScore: SubScore, category: string): string {
  const fixes: Record<string, string> = {
    'Framerate': 'Optimize shaders: reduce overdraw, lower particle count on mid-tier, use LOD for raymarching steps',
    'Loading Performance': 'Code-split heavy modules, lazy-load non-critical shaders, add preload hints, compress assets with Brotli',
    'SEO Basics': 'Add semantic h1-h6 headings, structured data (JSON-LD), Open Graph meta, sitemap.xml',
    'Responsiveness': 'Add responsive breakpoints, test mobile viewports, reduce shader complexity on small screens',
    'Console.log': 'Remove all console.log/console.warn statements from production code',
    'Error Handling': 'Remove console.log statements, add proper error boundaries',
    'Cross-Browser': 'Add WebGL1 fallback, test Safari 15+, add feature detection with graceful degradation',
    'Progressive Enhancement': 'Add non-WebGL fallback content, SSR critical HTML, noscript tag',
    'Navigation': 'Add keyboard-accessible chapter menu, skip-to-content link, chapter navigation overlay',
    'Branding': 'Strengthen studio branding in loading screen and credits, add subtle watermark',
    'Typography': 'Reduce font count, subset fonts with unicode-range, preload critical fonts',
    'Color Harmony': 'Refine color palette transitions between chapters for smoother gradients',
    'Localization': 'Add lang attribute, consider FR/EN toggle for wider audience',
    'Call to Action': 'Add subtle CTA after credits — contact link, portfolio link, social links',
    'Accessibility': 'Improve ARIA labels, add skip links, ensure focus management across chapters',
    'Touch & Gesture': 'Add swipe gestures for chapter navigation, increase touch targets to 44px minimum',
    'Content Freshness': 'Add build date metadata, version indicator in credits',
    'Value Proposition': 'Clarify studio capabilities in credits/about section',
  };

  for (const [keyword, fix] of Object.entries(fixes)) {
    if (subScore.name.includes(keyword) || subScore.notes.toLowerCase().includes(keyword.toLowerCase())) {
      return fix;
    }
  }

  if (subScore.score < 6) return `Investigate and improve ${subScore.name} — currently at ${subScore.score}/10`;
  return `Polish ${subScore.name} — minor improvements to push from ${subScore.score} toward ${subScore.score + 1.5}`;
}

function determinePriority(score: number, category: string): 'P0' | 'P1' | 'P2' | 'P3' {
  if (score <= 3) return 'P0';
  if (score <= 5.5) return 'P1';
  if (score <= 7) return 'P2';
  return 'P3';
}

function generateUpgradeTasks(analysis: AnalysisResult): UpgradeTask[] {
  const tasks: UpgradeTask[] = [];
  let taskId = 1;

  for (const cat of analysis.categories) {
    for (const sub of cat.subScores) {
      if (sub.score >= 9.5) continue;

      const potentialGain = sub.maxScore - sub.score;
      if (potentialGain < 0.5) continue;

      const targetScore = Math.min(sub.maxScore, sub.score + Math.max(1.5, potentialGain * 0.6));

      tasks.push({
        id: `TASK-${String(taskId++).padStart(3, '0')}`,
        priority: determinePriority(sub.score, cat.category),
        category: cat.category,
        description: `[${cat.category.toUpperCase()}] Improve "${sub.name}" from ${sub.score} to ${targetScore.toFixed(1)}`,
        targetScore: parseFloat(targetScore.toFixed(1)),
        currentScore: sub.score,
        suggestedFix: mapWeaknessToFix(sub, cat.category),
      });
    }

    for (const penalty of cat.penalties) {
      const existing = tasks.find(t => t.description.toLowerCase().includes(penalty.name.toLowerCase().split(' ')[0]));
      if (!existing) {
        tasks.push({
          id: `TASK-${String(taskId++).padStart(3, '0')}`,
          priority: Math.abs(penalty.value) >= 0.3 ? 'P0' : 'P1',
          category: cat.category,
          description: `[${cat.category.toUpperCase()}] Fix penalty: ${penalty.name} (${penalty.value})`,
          targetScore: 0,
          currentScore: penalty.value,
          suggestedFix: `Resolve: ${penalty.source}`,
        });
      }
    }
  }

  tasks.sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.currentScore - b.currentScore;
  });

  return tasks;
}

function computeDelta(before: AnalysisResult, after: AnalysisResult): DeltaReport {
  const categoryDeltas = before.categories.map(bc => {
    const ac = after.categories.find(c => c.category === bc.category);
    return {
      category: bc.category,
      before: bc.score,
      after: ac?.score ?? bc.score,
      delta: parseFloat(((ac?.score ?? bc.score) - bc.score).toFixed(2)),
    };
  });

  const subScoreDeltas: DeltaReport['subScoreDeltas'] = [];
  for (const bc of before.categories) {
    const ac = after.categories.find(c => c.category === bc.category);
    for (const bs of bc.subScores) {
      const as_ = ac?.subScores.find(s => s.name === bs.name);
      const delta = parseFloat(((as_?.score ?? bs.score) - bs.score).toFixed(2));
      if (delta !== 0) {
        subScoreDeltas.push({
          category: bc.category,
          name: bs.name,
          before: bs.score,
          after: as_?.score ?? bs.score,
          delta,
        });
      }
    }
  }

  subScoreDeltas.sort((a, b) => b.delta - a.delta);

  const improved = subScoreDeltas.filter(d => d.delta > 0).length;
  const regressed = subScoreDeltas.filter(d => d.delta < 0).length;
  const totalSubs = before.categories.reduce((sum, c) => sum + c.subScores.length, 0);

  return {
    timestamp: new Date().toISOString(),
    beforeTimestamp: before.timestamp,
    afterTimestamp: after.timestamp,
    beforeOverall: before.overallScore,
    afterOverall: after.overallScore,
    overallDelta: parseFloat((after.overallScore - before.overallScore).toFixed(2)),
    categoryDeltas,
    subScoreDeltas,
    tasksGenerated: 0,
    improved,
    regressed,
    unchanged: totalSubs - improved - regressed,
  };
}

function printDelta(delta: DeltaReport) {
  const arrow = (d: number) => d > 0 ? `${A.green}+${d.toFixed(2)} ▲` : d < 0 ? `${A.red}${d.toFixed(2)} ▼` : `${A.dim}  0.00 ═`;

  console.log(`
${A.cyan}${A.bold}═══════════════════════════════════════════════════════════${A.reset}
${A.cyan}${A.bold}                    DELTA REPORT${A.reset}
${A.cyan}${A.bold}═══════════════════════════════════════════════════════════${A.reset}

  ${A.bold}Overall:${A.reset} ${delta.beforeOverall.toFixed(2)} → ${delta.afterOverall.toFixed(2)}  ${arrow(delta.overallDelta)}${A.reset}
`);

  console.log(`  ${A.bold}Categories:${A.reset}`);
  for (const cd of delta.categoryDeltas) {
    console.log(`    ${cd.category.padEnd(12)} ${cd.before.toFixed(2)} → ${cd.after.toFixed(2)}  ${arrow(cd.delta)}${A.reset}`);
  }

  if (delta.subScoreDeltas.length > 0) {
    console.log(`\n  ${A.bold}Sub-score changes:${A.reset}`);
    for (const sd of delta.subScoreDeltas) {
      const catTag = `[${sd.category}]`.padEnd(14);
      console.log(`    ${catTag} ${sd.name.padEnd(25)} ${sd.before.toFixed(1)} → ${sd.after.toFixed(1)}  ${arrow(sd.delta)}${A.reset}`);
    }
  }

  console.log(`
  ${A.bold}Summary:${A.reset} ${A.green}${delta.improved} improved${A.reset} | ${A.red}${delta.regressed} regressed${A.reset} | ${A.dim}${delta.unchanged} unchanged${A.reset}
`);
}

function runPhase(label: string, fn: () => void) {
  const divider = '─'.repeat(55);
  console.log(`\n${A.magenta}${A.bold}${divider}${A.reset}`);
  console.log(`${A.magenta}${A.bold}  PHASE: ${label}${A.reset}`);
  console.log(`${A.magenta}${A.bold}${divider}${A.reset}\n`);
  fn();
}

function main() {
  printBanner();
  const startTime = Date.now();

  runPhase('1 — Initial Analysis', () => {
    log('Running SOTY Analyser...', 'phase');
    try {
      execSync(`npx tsx scripts/soty-analyser/index.ts`, {
        cwd: CONFIG.PROJECT_ROOT,
        stdio: 'inherit',
        timeout: 300_000,
      });
      log('Initial analysis complete', 'ok');
    } catch (err) {
      log(`Analyser failed: ${err}`, 'error');
      process.exit(1);
    }
  });

  const beforeAnalysis = findLatestAnalysis();
  if (!beforeAnalysis) {
    log('No analysis JSON found — aborting', 'error');
    process.exit(1);
  }
  log(`Before score: ${beforeAnalysis.overallScore}/10`, 'info');

  let tasks: UpgradeTask[] = [];

  runPhase('2 — Generate Upgrade Tasks', () => {
    tasks = generateUpgradeTasks(beforeAnalysis);
    fs.writeFileSync(CONFIG.TASKS_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
    log(`Generated ${tasks.length} upgrade tasks → ${CONFIG.TASKS_PATH}`, 'ok');

    const p0 = tasks.filter(t => t.priority === 'P0').length;
    const p1 = tasks.filter(t => t.priority === 'P1').length;
    const p2 = tasks.filter(t => t.priority === 'P2').length;
    const p3 = tasks.filter(t => t.priority === 'P3').length;
    log(`Priorities: ${A.red}P0:${p0}${A.reset} ${A.yellow}P1:${p1}${A.reset} ${A.cyan}P2:${p2}${A.reset} ${A.dim}P3:${p3}${A.reset}`, 'info');

    for (const task of tasks.slice(0, 5)) {
      log(`  ${task.priority} ${task.id}: ${task.description}`, 'info');
    }
    if (tasks.length > 5) log(`  ... and ${tasks.length - 5} more`, 'info');
  });

  runPhase('3 — Run Upgrader', () => {
    log('Running SOTY Upgrader...', 'phase');
    try {
      execSync(`npx tsx scripts/soty-upgrader/index.ts`, {
        cwd: CONFIG.PROJECT_ROOT,
        stdio: 'inherit',
        timeout: 600_000,
        env: { ...process.env, SOTY_UPGRADE_TASKS: CONFIG.TASKS_PATH },
      });
      log('Upgrader complete', 'ok');
    } catch (err) {
      log(`Upgrader failed: ${err}`, 'warn');
      log('Continuing to re-analysis...', 'info');
    }
  });

  runPhase('4 — Re-Analysis', () => {
    log('Running SOTY Analyser (post-upgrade)...', 'phase');
    try {
      execSync(`npx tsx scripts/soty-analyser/index.ts`, {
        cwd: CONFIG.PROJECT_ROOT,
        stdio: 'inherit',
        timeout: 300_000,
      });
      log('Re-analysis complete', 'ok');
    } catch (err) {
      log(`Re-analysis failed: ${err}`, 'error');
      process.exit(1);
    }
  });

  const afterAnalysis = findLatestAnalysis();
  if (!afterAnalysis) {
    log('No post-upgrade analysis found — aborting', 'error');
    process.exit(1);
  }
  log(`After score: ${afterAnalysis.overallScore}/10`, 'info');

  runPhase('5 — Delta Report', () => {
    const delta = computeDelta(beforeAnalysis, afterAnalysis);
    delta.tasksGenerated = tasks.length;

    printDelta(delta);

    const reportName = `pipeline-delta-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    const reportPath = path.join(CONFIG.ANALYSES_DIR, reportName);
    fs.writeFileSync(reportPath, JSON.stringify(delta, null, 2), 'utf-8');
    log(`Delta report saved → ${reportPath}`, 'ok');
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`
${A.green}${A.bold}═══════════════════════════════════════════════════════════${A.reset}
${A.green}${A.bold}  PIPELINE COMPLETE — ${elapsed}s${A.reset}
${A.green}${A.bold}═══════════════════════════════════════════════════════════${A.reset}
`);
}

main();
