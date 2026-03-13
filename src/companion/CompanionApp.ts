/**
 * @file CompanionApp.ts
 * @description Mobile companion experience — live narration of the desktop journey
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { BroadcastHub } from '../sync/BroadcastHub';
import { t, setLang, type Lang } from '../i18n/translations';
import './companion.css';

interface ChapterData {
  index: number;
  title: string;
  subtitle: string;
  interstitial: string;
}

interface StateData {
  scroll: number;
  distance: number;
  temp: number;
  timeDilation: number;
  tidalForce: number;
  fps: number;
}

const CHAPTER_COLORS = [
  '#FFB347', '#00d4aa', '#00b4ff', '#0088ff',
  '#6644ff', '#ff4488', '#ff6644', '#ff2222', '#ffffff',
];

export async function init(roomId: string) {
  document.getElementById('app')!.style.display = 'none';
  document.getElementById('loader')!.style.display = 'none';

  const root = document.createElement('div');
  root.id = 'companion-root';
  root.innerHTML = `
    <div id="comp-bg"></div>
    <div id="comp-grain"></div>
    <div id="comp-content">
      <header id="comp-header">
        <div id="comp-title">EVENT HORIZON</div>
        <div id="comp-status">
          <span id="comp-dot"></span>
          <span id="comp-status-text">CONNECTING...</span>
        </div>
      </header>

      <div id="comp-waiting">
        <div id="comp-waiting-icon">◎</div>
        <div id="comp-waiting-title">COMPANION MODE</div>
        <div id="comp-waiting-sub">Connected to room <strong>${roomId}</strong></div>
        <div id="comp-waiting-hint">Start scrolling on the desktop to begin</div>
      </div>

      <main id="comp-main" class="hidden">
        <div id="comp-chapter-num"></div>
        <div id="comp-chapter-title"></div>
        <div id="comp-chapter-sub"></div>
        <div id="comp-interstitial"></div>

        <div id="comp-hud">
          <div class="comp-hud-item">
            <div class="comp-hud-label">DISTANCE</div>
            <div class="comp-hud-value" id="comp-distance">—</div>
            <div class="comp-hud-unit">Schwarzschild radii</div>
          </div>
          <div class="comp-hud-item">
            <div class="comp-hud-label">HAWKING TEMP</div>
            <div class="comp-hud-value" id="comp-temp">—</div>
            <div class="comp-hud-unit">nanokelvin</div>
          </div>
          <div class="comp-hud-item">
            <div class="comp-hud-label">TIME DILATION</div>
            <div class="comp-hud-value" id="comp-dilation">—</div>
            <div class="comp-hud-unit">factor</div>
          </div>
          <div class="comp-hud-item">
            <div class="comp-hud-label">TIDAL FORCE</div>
            <div class="comp-hud-value" id="comp-tidal">—</div>
            <div class="comp-hud-unit">relative</div>
          </div>
        </div>

        <div id="comp-progress-wrap">
          <div id="comp-progress-bar"></div>
          <div id="comp-progress-label">DESCENT PROGRESS</div>
        </div>
      </main>

      <footer id="comp-footer">
        <div id="comp-footer-text">Crafted by <a href="https://cleanlystudio.pro" target="_blank">Cleanlystudio</a></div>
      </footer>
    </div>
  `;
  document.body.appendChild(root);

  const hub = new BroadcastHub();
  let currentChapter = -1;
  let connected = false;

  const dot = document.getElementById('comp-dot')!;
  const statusText = document.getElementById('comp-status-text')!;
  const waiting = document.getElementById('comp-waiting')!;
  const main = document.getElementById('comp-main')!;
  const bg = document.getElementById('comp-bg')!;

  hub.on('meta', (data) => {
    if (data.lang) setLang(data.lang as Lang);
    connected = true;
    dot.classList.add('live');
    statusText.textContent = 'LIVE';
  });

  hub.on('chapter', (data) => {
    const ch = data as unknown as ChapterData;
    if (ch.index === currentChapter) return;
    currentChapter = ch.index;

    if (!connected) {
      connected = true;
      dot.classList.add('live');
      statusText.textContent = 'LIVE';
    }

    waiting.classList.add('hidden');
    main.classList.remove('hidden');

    const color = CHAPTER_COLORS[ch.index] || '#ffffff';
    document.documentElement.style.setProperty('--comp-accent', color);

    const numEl = document.getElementById('comp-chapter-num')!;
    const titleEl = document.getElementById('comp-chapter-title')!;
    const subEl = document.getElementById('comp-chapter-sub')!;
    const interEl = document.getElementById('comp-interstitial')!;

    numEl.classList.remove('reveal');
    titleEl.classList.remove('reveal');
    subEl.classList.remove('reveal');
    interEl.classList.remove('reveal');

    void numEl.offsetWidth;

    numEl.textContent = String(ch.index).padStart(2, '0');
    titleEl.textContent = ch.title;
    subEl.textContent = ch.subtitle.replace(/\\n/g, '\n');
    interEl.textContent = ch.interstitial || '';

    requestAnimationFrame(() => {
      numEl.classList.add('reveal');
      setTimeout(() => titleEl.classList.add('reveal'), 200);
      setTimeout(() => subEl.classList.add('reveal'), 500);
      if (ch.interstitial) setTimeout(() => interEl.classList.add('reveal'), 800);
    });

    bg.style.background = `radial-gradient(ellipse at center, ${color}15 0%, transparent 70%)`;

    if (navigator.vibrate) navigator.vibrate(50);
  });

  hub.on('state', (data) => {
    const s = data as unknown as StateData;

    if (!connected) {
      connected = true;
      dot.classList.add('live');
      statusText.textContent = 'LIVE';
      waiting.classList.add('hidden');
      main.classList.remove('hidden');
    }

    const distEl = document.getElementById('comp-distance')!;
    const tempEl = document.getElementById('comp-temp')!;
    const dilEl = document.getElementById('comp-dilation')!;
    const tidalEl = document.getElementById('comp-tidal')!;
    const progBar = document.getElementById('comp-progress-bar')!;

    distEl.textContent = s.distance.toFixed(1);
    tempEl.textContent = s.temp.toFixed(2);
    dilEl.textContent = s.timeDilation > 999 ? '∞' : s.timeDilation.toFixed(2);
    tidalEl.textContent = s.tidalForce.toFixed(1);
    progBar.style.width = `${Math.min(100, s.scroll * 100)}%`;
  });

  await hub.join(roomId);
  dot.classList.add('connected');
  statusText.textContent = 'WAITING';
}
