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
    '\n%cEVENT HORIZON\n%cFall into a black hole.\n\n%c9 chapters · WebGL · GLSL · Three.js\n%c— Cleanlystudio\n',
    'color: #FFB347; font-size: 18px; font-weight: 300; letter-spacing: 0.4em; font-family: system-ui, sans-serif;',
    'color: rgba(255,255,255,0.4); font-size: 11px; font-weight: 300; letter-spacing: 0.15em; font-family: system-ui, sans-serif;',
    'color: rgba(255,255,255,0.2); font-size: 9px; letter-spacing: 0.1em; font-family: system-ui, sans-serif;',
    'color: rgba(255,179,71,0.5); font-size: 9px; letter-spacing: 0.15em; font-family: system-ui, sans-serif;'
  );
  console.log(
    '%cType %chelp%c for secrets.',
    'color: #555; font-size: 10px; font-family: system-ui, sans-serif;',
    'color: #FFB347; font-size: 10px; font-style: italic; font-family: system-ui, sans-serif;',
    'color: #555; font-size: 10px; font-family: system-ui, sans-serif;'
  );

  (window as any).help = () => {
    console.log(
      '\n%cSecrets\n\n' +
      '%cType on the page while scrolling:\n' +
      '%c  help     %ccosmic whisper\n' +
      '%c  time     %ctemporal echo\n' +
      '%c  void     %cstare into nothing\n' +
      '%c  escape   %cthere is no escape\n' +
      '%c  love     %ceven here, even now\n' +
      '%c  god      %care you there?\n\n' +
      '%cHold mouse to resist gravity.\n' +
      'Scan QR to sync your phone.\n' +
      'Press ? for keyboard shortcuts.\n',
      'color: #FFB347; font-size: 13px; font-weight: 300; letter-spacing: 0.3em; font-family: system-ui;',
      'color: rgba(255,255,255,0.5); font-size: 10px; font-family: system-ui;',
      'color: #FFB347; font-size: 10px; font-family: monospace;', 'color: rgba(255,255,255,0.35); font-size: 10px; font-family: system-ui;',
      'color: #FFB347; font-size: 10px; font-family: monospace;', 'color: rgba(255,255,255,0.35); font-size: 10px; font-family: system-ui;',
      'color: #FFB347; font-size: 10px; font-family: monospace;', 'color: rgba(255,255,255,0.35); font-size: 10px; font-family: system-ui;',
      'color: #FFB347; font-size: 10px; font-family: monospace;', 'color: rgba(255,255,255,0.35); font-size: 10px; font-family: system-ui;',
      'color: #FFB347; font-size: 10px; font-family: monospace;', 'color: rgba(255,255,255,0.35); font-size: 10px; font-family: system-ui;',
      'color: #FFB347; font-size: 10px; font-family: monospace;', 'color: rgba(255,255,255,0.35); font-size: 10px; font-family: system-ui;',
      'color: rgba(255,255,255,0.3); font-size: 9px; font-family: system-ui;'
    );
    return '';
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
