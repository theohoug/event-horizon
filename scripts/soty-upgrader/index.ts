/**
 * @file index.ts
 * @description Main orchestrator for the SOTY Upgrader audit pipeline
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config';
import { runCaptureCycle, summarizeCycle } from './loop/cycle-manager';
import { shouldContinue } from './loop/convergence-checker';
import { runAutonomousLoop } from './loop/autonomous-loop';
import { loadPreviousCycleReport } from './utils/file-utils';
import { log } from './utils/logger';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

interface CliArgs {
  phase: 'capture' | 'all';
  cycle: number | null;
  loop: boolean;
  maxCycles: number | null;
  browserOnly: boolean;
  mobileOnly: boolean;
  a11yOnly: boolean;
  firstImpression: boolean;
  interactions: boolean;
  noAudio: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    phase: 'all',
    cycle: null,
    loop: false,
    maxCycles: null,
    browserOnly: false,
    mobileOnly: false,
    a11yOnly: false,
    firstImpression: false,
    interactions: false,
    noAudio: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--phase': {
        const nextVal = argv[i + 1];
        if (nextVal === 'capture' || nextVal === 'all') {
          args.phase = nextVal;
          i++;
        }
        break;
      }
      case '--cycle': {
        const num = parseInt(argv[i + 1], 10);
        if (!isNaN(num) && num > 0) {
          args.cycle = num;
          i++;
        }
        break;
      }
      case '--browser-only':
        args.browserOnly = true;
        break;
      case '--mobile-only':
        args.mobileOnly = true;
        break;
      case '--a11y-only':
        args.a11yOnly = true;
        break;
      case '--first-impression':
        args.firstImpression = true;
        break;
      case '--interactions':
        args.interactions = true;
        break;
      case '--no-audio':
        args.noAudio = true;
        break;
      case '--loop':
        args.loop = true;
        break;
      case '--max-cycles': {
        const mc = parseInt(argv[i + 1], 10);
        if (!isNaN(mc) && mc > 0) {
          args.maxCycles = mc;
          i++;
        }
        break;
      }
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

function printBanner(): void {
  console.log(`
${ANSI.cyan}${ANSI.bold}
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   ███████╗ ██████╗ ████████╗██╗   ██╗                    ║
  ║   ██╔════╝██╔═══██╗╚══██╔══╝╚██╗ ██╔╝                   ║
  ║   ███████╗██║   ██║   ██║    ╚████╔╝                     ║
  ║   ╚════██║██║   ██║   ██║     ╚██╔╝                      ║
  ║   ███████║╚██████╔╝   ██║      ██║                       ║
  ║   ╚══════╝ ╚═════╝    ╚═╝      ╚═╝                       ║
  ║                                                           ║
  ║${ANSI.reset}${ANSI.magenta}${ANSI.bold}   U P G R A D E R    v 1 . 0${ANSI.reset}${ANSI.cyan}${ANSI.bold}                           ║
  ║                                                           ║
  ║${ANSI.reset}${ANSI.dim}   Capture + Cross-Browser + Mobile + A11y + Perf${ANSI.reset}${ANSI.cyan}${ANSI.bold}       ║
  ║${ANSI.reset}${ANSI.dim}   Powered by Claude Code + Playwright${ANSI.reset}${ANSI.cyan}${ANSI.bold}                  ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
${ANSI.reset}`);
}

function printHelp(): void {
  console.log(`
${ANSI.bold}SOTY Upgrader — Event Horizon Audit Pipeline${ANSI.reset}

${ANSI.cyan}Usage:${ANSI.reset}
  npx tsx scripts/soty-upgrader/index.ts [options]

${ANSI.cyan}Options:${ANSI.reset}
  --phase <capture|all>   Run specific phase (default: all)
  --cycle <N>             Run specific cycle number
  --browser-only          Only run cross-browser tests
  --mobile-only           Only run mobile audit
  --a11y-only             Only run accessibility audit
  --first-impression      Only run first impression test
  --interactions          Only run interaction tests
  --no-audio              Skip audio capture
  --loop                  Run autonomous loop (capture → wait for fixes → repeat)
  --max-cycles <N>        Maximum cycles in loop mode (default: 20)
  --help, -h              Show this help

${ANSI.cyan}Examples:${ANSI.reset}
  npx tsx scripts/soty-upgrader/index.ts
  npx tsx scripts/soty-upgrader/index.ts --cycle 3
  npx tsx scripts/soty-upgrader/index.ts --browser-only
  npx tsx scripts/soty-upgrader/index.ts --mobile-only --no-audio
`);
}

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

async function checkDevServer(): Promise<boolean> {
  try {
    const response = await fetch(CONFIG.DEV_SERVER_URL, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok || response.status === 200 || response.status === 304;
  } catch {
    return false;
  }
}

function printResults(summary: string, cycleNumber: number): void {
  const cycleDir = path.join(CONFIG.SCRIPTS_ROOT, 'reports', `cycle-${cycleNumber}`);

  console.log(`
${ANSI.green}${ANSI.bold}═══════════════════════════════════════════════════════════${ANSI.reset}
${ANSI.green}${ANSI.bold}  CAPTURE COMPLETE${ANSI.reset}
${ANSI.green}${ANSI.bold}═══════════════════════════════════════════════════════════${ANSI.reset}

${summary}

${ANSI.cyan}${ANSI.bold}Ready for Claude Code analysis.${ANSI.reset}

${ANSI.dim}Key paths:${ANSI.reset}
  ${ANSI.white}Report:       ${cycleDir}/cycle-report.json${ANSI.reset}
  ${ANSI.white}Screenshots:  ${cycleDir}/screenshots/${ANSI.reset}
  ${ANSI.white}Browser:      ${cycleDir}/browser-report.md${ANSI.reset}
  ${ANSI.white}Mobile:       ${cycleDir}/mobile-report.json${ANSI.reset}
  ${ANSI.white}A11y:         ${cycleDir}/accessibility-report.json${ANSI.reset}
  ${ANSI.white}Log:          ${cycleDir}/log.txt${ANSI.reset}
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    printBanner();
    printHelp();
    process.exit(0);
  }

  printBanner();

  log('Checking dev server...', 'info');
  const serverRunning = await checkDevServer();

  if (!serverRunning) {
    console.log(`
${ANSI.red}${ANSI.bold}  ERROR: Dev server is not running!${ANSI.reset}

${ANSI.yellow}  Start it with:${ANSI.reset}
    cd ${CONFIG.PROJECT_ROOT}
    npm run dev

${ANSI.yellow}  Expected URL:${ANSI.reset} ${CONFIG.DEV_SERVER_URL}
`);
    process.exit(1);
  }

  log(`Dev server running at ${CONFIG.DEV_SERVER_URL}`, 'success');

  if (args.loop) {
    log('Starting autonomous loop mode...', 'phase');
    await runAutonomousLoop(args.maxCycles ?? undefined);
    process.exit(0);
  }

  const cycleNumber = args.cycle ?? detectNextCycleNumber();
  log(`Starting cycle ${cycleNumber}`, 'info');

  const startTime = Date.now();

  try {
    const report = await runCaptureCycle(cycleNumber, {
      skipAudio: args.noAudio,
      browserOnly: args.browserOnly,
      mobileOnly: args.mobileOnly,
      a11yOnly: args.a11yOnly,
      firstImpressionOnly: args.firstImpression,
      interactionsOnly: args.interactions,
    });

    const summary = summarizeCycle(report);
    const summaryPath = path.join(
      CONFIG.SCRIPTS_ROOT,
      'reports',
      `cycle-${cycleNumber}`,
      'summary.md',
    );
    fs.writeFileSync(summaryPath, summary, 'utf-8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`Total time: ${elapsed}s`, 'success');

    printResults(summary, cycleNumber);

    const previousReport = loadPreviousCycleReport(cycleNumber);
    const convergence = shouldContinue(
      report,
      previousReport,
      CONFIG.scoring.maxCycles,
    );

    if (!convergence.continue) {
      console.log(`
${ANSI.magenta}${ANSI.bold}  Loop verdict: STOP — ${convergence.reason.replace(/_/g, ' ').toUpperCase()}${ANSI.reset}
`);
    } else {
      console.log(`
${ANSI.cyan}${ANSI.bold}  Loop verdict: CONTINUE — apply fixes and re-run${ANSI.reset}
`);
    }
  } catch (err) {
    log(`Fatal error: ${err}`, 'error');
    console.error(err);
    process.exit(1);
  }
}

main();
