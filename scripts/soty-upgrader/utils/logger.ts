/**
 * @file logger.ts
 * @description Structured logging with timestamps, ANSI colors, and cycle tracking
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';

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
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
};

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'phase';

interface PhaseTimer {
  name: string;
  startTime: number;
}

const LEVEL_STYLES: Record<LogLevel, { color: string; prefix: string }> = {
  info: { color: ANSI.cyan, prefix: 'INFO' },
  warn: { color: ANSI.yellow, prefix: 'WARN' },
  error: { color: ANSI.red, prefix: 'ERROR' },
  success: { color: ANSI.green, prefix: 'OK' },
  phase: { color: ANSI.magenta, prefix: 'PHASE' },
};

let currentCycle = 0;
let logFilePath: string | null = null;
const phaseTimers = new Map<string, PhaseTimer>();

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = ((ms % 60_000) / 1000).toFixed(0);
  return `${minutes}m${seconds}s`;
}

function writeToFile(rawMessage: string): void {
  if (!logFilePath) return;
  try {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(logFilePath, rawMessage + '\n', 'utf-8');
  } catch {
    // silent fail on file write — console output is primary
  }
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export function log(message: string, level: LogLevel = 'info'): void {
  const style = LEVEL_STYLES[level];
  const ts = timestamp();
  const cycleTag = currentCycle > 0 ? `${ANSI.dim}[C${currentCycle}]${ANSI.reset} ` : '';
  const formatted = `${ANSI.dim}${ts}${ANSI.reset} ${cycleTag}${style.color}${ANSI.bold}[${style.prefix}]${ANSI.reset} ${message}`;

  console.log(formatted);
  writeToFile(`${ts} [C${currentCycle}] [${style.prefix}] ${stripAnsi(message)}`);
}

export function phaseStart(phaseName: string): void {
  phaseTimers.set(phaseName, { name: phaseName, startTime: Date.now() });
  const separator = '─'.repeat(50);
  const formatted = `\n${ANSI.magenta}${ANSI.bold}┌${separator}┐${ANSI.reset}\n${ANSI.magenta}${ANSI.bold}│ PHASE: ${phaseName.toUpperCase().padEnd(41)}│${ANSI.reset}\n${ANSI.magenta}${ANSI.bold}└${separator}┘${ANSI.reset}`;

  console.log(formatted);
  writeToFile(`\n${'='.repeat(52)}\n PHASE START: ${phaseName.toUpperCase()}\n${'='.repeat(52)}`);
}

export function phaseEnd(phaseName: string): void {
  const timer = phaseTimers.get(phaseName);
  if (!timer) {
    log(`Phase "${phaseName}" was never started`, 'warn');
    return;
  }

  const elapsed = Date.now() - timer.startTime;
  phaseTimers.delete(phaseName);

  const message = `Phase ${ANSI.bold}${phaseName}${ANSI.reset} completed in ${ANSI.green}${formatDuration(elapsed)}${ANSI.reset}`;
  console.log(`${ANSI.dim}${timestamp()}${ANSI.reset} ${ANSI.magenta}${ANSI.bold}[PHASE]${ANSI.reset} ${message}`);
  writeToFile(`${timestamp()} [PHASE] Phase ${phaseName} completed in ${formatDuration(elapsed)}`);
}

export function cycleStart(cycleNumber: number): void {
  currentCycle = cycleNumber;
  const reportsDir = path.join(CONFIG.SCRIPTS_ROOT, 'reports', `cycle-${cycleNumber}`);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  logFilePath = path.join(reportsDir, 'log.txt');

  const banner = `
${ANSI.bgMagenta}${ANSI.white}${ANSI.bold}${''.padEnd(56)}${ANSI.reset}
${ANSI.bgMagenta}${ANSI.white}${ANSI.bold}   SOTY UPGRADER — CYCLE ${String(cycleNumber).padEnd(30)}${ANSI.reset}
${ANSI.bgMagenta}${ANSI.white}${ANSI.bold}   ${new Date().toLocaleString().padEnd(52)}${ANSI.reset}
${ANSI.bgMagenta}${ANSI.white}${ANSI.bold}${''.padEnd(56)}${ANSI.reset}
`;
  console.log(banner);
  writeToFile(`\n${'#'.repeat(56)}\n# SOTY UPGRADER — CYCLE ${cycleNumber}\n# ${new Date().toLocaleString()}\n${'#'.repeat(56)}`);
}

export function cycleEnd(cycleNumber: number): void {
  log(`Cycle ${cycleNumber} finished`, 'success');
  currentCycle = 0;
  logFilePath = null;
}

export function progress(current: number, total: number, label: string): void {
  const percent = Math.round((current / total) * 100);
  const barLength = 30;
  const filled = Math.round((current / total) * barLength);
  const empty = barLength - filled;
  const bar = `${ANSI.green}${'█'.repeat(filled)}${ANSI.dim}${'░'.repeat(empty)}${ANSI.reset}`;

  const line = `${ANSI.dim}${timestamp()}${ANSI.reset} ${bar} ${ANSI.bold}${percent}%${ANSI.reset} ${ANSI.dim}(${current}/${total})${ANSI.reset} ${label}`;
  process.stdout.write(`\r${line}`);

  if (current === total) {
    process.stdout.write('\n');
  }

  writeToFile(`${timestamp()} [PROGRESS] ${percent}% (${current}/${total}) ${label}`);
}

export function table(data: Record<string, string | number>[]): void {
  if (data.length === 0) return;

  const keys = Object.keys(data[0]);
  const columnWidths = new Map<string, number>();

  for (const key of keys) {
    columnWidths.set(key, key.length);
  }

  for (const row of data) {
    for (const key of keys) {
      const valueLength = String(row[key]).length;
      const currentMax = columnWidths.get(key) ?? 0;
      if (valueLength > currentMax) {
        columnWidths.set(key, valueLength);
      }
    }
  }

  const headerCells = keys.map(k => `${ANSI.bold}${k.padEnd(columnWidths.get(k) ?? 0)}${ANSI.reset}`);
  const headerLine = `│ ${headerCells.join(' │ ')} │`;
  const separatorParts = keys.map(k => '─'.repeat((columnWidths.get(k) ?? 0) + 2));
  const topBorder = `┌${separatorParts.join('┬')}┐`;
  const midBorder = `├${separatorParts.join('┼')}┤`;
  const bottomBorder = `└${separatorParts.join('┴')}┘`;

  console.log(topBorder);
  console.log(headerLine);
  console.log(midBorder);

  const fileRows: string[] = [];
  const fileHeader = keys.map(k => k.padEnd(columnWidths.get(k) ?? 0)).join(' | ');
  fileRows.push(fileHeader);
  fileRows.push('-'.repeat(fileHeader.length));

  for (const row of data) {
    const cells = keys.map(k => String(row[k]).padEnd(columnWidths.get(k) ?? 0));
    console.log(`│ ${cells.join(' │ ')} │`);
    fileRows.push(cells.join(' | '));
  }

  console.log(bottomBorder);
  writeToFile(fileRows.join('\n'));
}
