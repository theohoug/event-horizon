/**
 * @file main.ts
 * @description Entry point for Event Horizon experience
 * @author Cleanlystudio
 * @version 1.0.0
 */

import './styles/global.css';
import { Experience } from './engine/Experience';

console.log(
  '%c ╔══════════════════════════════════════╗\n' +
  ' ║                                      ║\n' +
  ' ║   E V E N T   H O R I Z O N         ║\n' +
  ' ║                                      ║\n' +
  ' ║   Beyond the point of no return.     ║\n' +
  ' ║                                      ║\n' +
  ' ║   Crafted by Cleanlystudio           ║\n' +
  ' ║   cleanlystudio.com                  ║\n' +
  ' ║                                      ║\n' +
  ' ╚══════════════════════════════════════╝',
  'color: #00F5D4; font-family: monospace; font-size: 11px; line-height: 1.5'
);

console.log(
  '%c💡 Try typing "help", "void", "light", "time", "escape", "love" or "god" while experiencing the journey.',
  'color: #592187; font-family: monospace; font-size: 10px; font-style: italic'
);

console.log(
  '%c⌨️  Keyboard: Arrow keys navigate chapters • Escape toggles sound • Home/End jump • Press ? for controls',
  'color: rgba(232, 232, 255, 0.5); font-family: monospace; font-size: 10px'
);

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
