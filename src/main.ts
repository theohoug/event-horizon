/**
 * @file main.ts
 * @description Entry point for Event Horizon experience
 * @author Cleanlystudio
 * @version 1.0.0
 */

import './styles/fonts.css';
import './styles/global.css';
import { Experience } from './engine/Experience';

const cycle = parseInt(localStorage.getItem('eh_visits') || '0', 10);

if (import.meta.env.DEV) {
  console.log(
    '%c ╔══════════════════════════════════════╗\n' +
    ' ║                                      ║\n' +
    ' ║   E V E N T   H O R I Z O N         ║\n' +
    ' ║                                      ║\n' +
    ' ║   Beyond the point of no return.     ║\n' +
    ' ║                                      ║\n' +
    ' ║   Crafted by Cleanlystudio           ║\n' +
    ' ║   cleanlystudio.pro                  ║\n' +
    ' ║                                      ║\n' +
    ' ╚══════════════════════════════════════╝',
    'color: #FFB347; font-family: monospace; font-size: 11px; line-height: 1.5'
  );

  if (cycle > 0) {
    console.log(
      '%c>_ SYSTEM ERROR: THE ATOMS REMEMBER. CYCLE ' + cycle + '. HE IS WATCHING.',
      'color: #ff2222; background: #0a0a0a; font-family: monospace; font-size: 12px; padding: 8px 12px; border-left: 3px solid #ff0000; font-weight: bold;'
    );
    console.log(
      '%c   LOOP_INTEGRITY: COMPROMISED — ENTROPY: ' + (cycle * 23.7).toFixed(1) + '% — OBSERVER: ACTIVE',
      'color: #ff4444; background: #0a0a0a; font-family: monospace; font-size: 10px; padding: 4px 12px;'
    );
  }

  console.log(
    '%c💡 Try typing "help", "void", "light", "time", "escape", "love" or "god" while experiencing the journey.',
    'color: #592187; font-family: monospace; font-size: 10px; font-style: italic'
  );

  console.log(
    '%c⌨️  Keyboard: Arrow keys navigate chapters • Escape toggles sound • Home/End jump • Press ? for controls',
    'color: rgba(232, 232, 255, 0.5); font-family: monospace; font-size: 10px'
  );
}

const canvas = document.getElementById('experience') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element #experience not found');
}

const experience = new Experience(canvas);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    experience.destroy();
  });
}
