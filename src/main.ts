/**
 * @file main.ts
 * @description Entry point for Event Horizon experience
 * @author Cleanlystudio
 * @version 1.0.0
 */

import './styles/fonts.css';
import './styles/global.css';

const companionRoom = new URL(window.location.href).searchParams.get('companion');
const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

if (companionRoom) {
  import('./companion/CompanionApp').then(m => m.init(companionRoom));
} else if (isMobileDevice) {
  import('./mobile/MobileLanding').then(m => m.init());
} else {
  const cycle = 0;

  console.log(
    '%c\n' +
    '     ·  ✦  ·\n' +
    '   ✦ ╔═══════════════════════════════════╗ ✦\n' +
    '     ║                                   ║\n' +
    '     ║   E V E N T   H O R I Z O N      ║\n' +
    '     ║   ─────────────────────────       ║\n' +
    '     ║   Fall into a black hole.         ║\n' +
    '     ║                                   ║\n' +
    '     ║   9 chapters · WebGL · GLSL       ║\n' +
    '     ║   Three.js · GSAP · Lenis         ║\n' +
    '     ║                                   ║\n' +
    '     ╚═══════════════════════════════════╝\n' +
    '   ✦                                   ✦\n',
    'color: #FFB347; font-family: monospace; font-size: 11px; line-height: 1.6; background: #050505; padding: 4px 8px;'
  );
  console.log(
    '%cCrafted with obsession by %cCleanlystudio%c\n' +
    'cleanlystudio.com · fade.run\n\n' +
    'Type %chelp%c in this console for secrets.',
    'color: #888; font-family: monospace; font-size: 11px;',
    'color: #FFB347; font-weight: bold; font-family: monospace; font-size: 11px;',
    'color: #888; font-family: monospace; font-size: 11px;',
    'color: #FFB347; font-style: italic; font-family: monospace; font-size: 11px;',
    'color: #888; font-family: monospace; font-size: 11px;'
  );

  (window as any).help = () => {
    console.log(
      '%c' +
      '  ╭─ Event Horizon Console ─────────────────╮\n' +
      '  │                                          │\n' +
      '  │  Try typing these on the page:           │\n' +
      '  │  · "help"    — cosmic whisper            │\n' +
      '  │  · "time"    — temporal echo             │\n' +
      '  │  · "void"    — stare into nothing        │\n' +
      '  │  · "escape"  — there is no escape        │\n' +
      '  │  · "love"    — even here, even now       │\n' +
      '  │  · "god"     — are you there?            │\n' +
      '  │                                          │\n' +
      '  │  Hold mouse to resist gravity.            │\n' +
      '  │  Scan the QR to sync your phone.         │\n' +
      '  │  Press ? for keyboard shortcuts.         │\n' +
      '  │                                          │\n' +
      '  ╰──────────────────────────────────────────╯',
      'color: #FFCC80; font-family: monospace; font-size: 10px; line-height: 1.5;'
    );
    return '✦';
  };

  if (import.meta.env.DEV) {
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

  function showFallback() {
    const f = document.getElementById('webgl-fallback');
    if (f) f.style.display = 'flex';
    const a = document.getElementById('app');
    if (a) a.style.display = 'none';
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    showFallback();
  });

  import('./engine/Experience').then(({ Experience }) => {
    try {
      const experience = new Experience(canvas);

      if (import.meta.hot) {
        import.meta.hot.dispose(() => {
          experience.destroy();
        });
      }
    } catch {
      showFallback();
    }
  }).catch(() => {
    showFallback();
  });
}
