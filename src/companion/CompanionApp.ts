/**
 * @file CompanionApp.ts
 * @description Mobile companion — live scientific documentation of the desktop journey
 * @author Cleanlystudio
 * @version 2.0.0
 */

import { BroadcastHub } from '../sync/BroadcastHub';
import { getScienceData, type ChapterScience } from './ScienceData';
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

interface MetaData {
  lang: string;
}

const CHAPTER_COLORS = [
  '#FFB347', '#00d4aa', '#00b4ff', '#0088ff',
  '#6644ff', '#ff4488', '#ff6644', '#ff2222', '#ffffff',
];

const LABELS = {
  en: {
    companion: 'COMPANION',
    connecting: 'CONNECTING...',
    live: 'LIVE',
    waiting: 'WAITING',
    waitingTitle: 'COMPANION MODE',
    waitingSub: 'Connected to room',
    waitingHint: 'Start scrolling on the desktop to begin',
    whatYouSee: 'WHAT YOU\u2019RE SEEING',
    funFact: 'DID YOU KNOW?',
    distance: 'DISTANCE',
    temp: 'HAWKING TEMP',
    dilation: 'TIME DILATION',
    tidal: 'TIDAL FORCE',
    distUnit: 'Schwarzschild radii',
    tempUnit: 'nanokelvin',
    dilUnit: 'factor',
    tidUnit: 'relative',
    progress: 'DESCENT PROGRESS',
    liveData: 'LIVE TELEMETRY',
    footer: 'Crafted by',
  },
  fr: {
    companion: 'COMPAGNON',
    connecting: 'CONNEXION...',
    live: 'EN DIRECT',
    waiting: 'EN ATTENTE',
    waitingTitle: 'MODE COMPAGNON',
    waitingSub: 'Connect\u00E9 \u00E0 la salle',
    waitingHint: 'Commencez \u00E0 scroller sur le bureau pour d\u00E9marrer',
    whatYouSee: 'CE QUE VOUS VOYEZ',
    funFact: 'LE SAVIEZ-VOUS ?',
    distance: 'DISTANCE',
    temp: 'TEMP. HAWKING',
    dilation: 'DILATATION',
    tidal: 'FORCE DE MAR\u00C9E',
    distUnit: 'rayons de Schwarzschild',
    tempUnit: 'nanokelvin',
    dilUnit: 'facteur',
    tidUnit: 'relative',
    progress: 'PROGRESSION DE LA DESCENTE',
    liveData: 'T\u00C9L\u00C9M\u00C9TRIE EN DIRECT',
    footer: 'Con\u00E7u par',
  },
};

type Lang = 'en' | 'fr';

export async function init(roomId: string) {
  const app = document.getElementById('app');
  if (app) app.style.display = 'none';
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  let lang: Lang = (localStorage.getItem('eh_lang') as Lang) || 'en';
  let scienceData = getScienceData(lang);
  let labels = LABELS[lang];

  const root = document.createElement('div');
  root.id = 'companion-root';
  root.innerHTML = buildHTML(roomId, labels);
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
    const meta = data as unknown as MetaData;
    if (meta.lang && (meta.lang === 'en' || meta.lang === 'fr')) {
      lang = meta.lang as Lang;
      scienceData = getScienceData(lang);
      labels = LABELS[lang];
      updateLabels(labels);
    }
    markConnected();
  });

  hub.on('chapter', (data) => {
    const ch = data as unknown as ChapterData;
    if (ch.index === currentChapter) return;
    currentChapter = ch.index;

    if (!connected) markConnected();

    waiting.classList.add('hidden');
    main.classList.remove('hidden');

    const color = CHAPTER_COLORS[ch.index] || '#ffffff';
    document.documentElement.style.setProperty('--comp-accent', color);

    renderChapter(ch, scienceData[ch.index], labels, color);
    bg.style.background = `radial-gradient(ellipse at center, ${color}12 0%, transparent 70%)`;

    if (navigator.vibrate) navigator.vibrate(50);

    root.scrollTo({ top: 0, behavior: 'smooth' });
  });

  hub.on('state', (data) => {
    const s = data as unknown as StateData;

    if (!connected) {
      markConnected();
      waiting.classList.add('hidden');
      main.classList.remove('hidden');
    }

    updateHUD(s);
  });

  function markConnected() {
    if (connected) return;
    connected = true;
    dot.classList.add('live');
    statusText.textContent = labels.live;
  }

  await hub.join(roomId);
  dot.classList.add('connected');
  statusText.textContent = labels.waiting;
}

function buildHTML(roomId: string, l: typeof LABELS['en']): string {
  return `
    <div id="comp-bg"></div>
    <div id="comp-grain"></div>
    <div id="comp-content">
      <header id="comp-header">
        <div id="comp-title">EVENT HORIZON</div>
        <div id="comp-status">
          <span id="comp-dot"></span>
          <span id="comp-status-text">${l.connecting}</span>
        </div>
      </header>

      <div id="comp-waiting">
        <div class="comp-waiting-icon">\u25CE</div>
        <div class="comp-waiting-title">${l.waitingTitle}</div>
        <div class="comp-waiting-sub">${l.waitingSub} <strong>${roomId}</strong></div>
        <div class="comp-waiting-hint">${l.waitingHint}</div>
      </div>

      <main id="comp-main" class="hidden">
        <div class="comp-chapter-header">
          <div id="comp-chapter-num"></div>
          <div id="comp-chapter-title"></div>
          <div id="comp-chapter-sub"></div>
          <div id="comp-interstitial"></div>
        </div>

        <div id="comp-science" class="comp-science"></div>

        <div id="comp-hud" class="comp-hud">
          <div class="comp-hud-item">
            <div class="comp-hud-label-text" id="comp-hud-dist-label">${l.distance}</div>
            <div class="comp-hud-live-value" id="comp-distance">\u2014</div>
            <div class="comp-hud-live-unit" id="comp-hud-dist-unit">${l.distUnit}</div>
          </div>
          <div class="comp-hud-item">
            <div class="comp-hud-label-text" id="comp-hud-temp-label">${l.temp}</div>
            <div class="comp-hud-live-value" id="comp-temp">\u2014</div>
            <div class="comp-hud-live-unit" id="comp-hud-temp-unit">${l.tempUnit}</div>
          </div>
          <div class="comp-hud-item">
            <div class="comp-hud-label-text" id="comp-hud-dil-label">${l.dilation}</div>
            <div class="comp-hud-live-value" id="comp-dilation">\u2014</div>
            <div class="comp-hud-live-unit" id="comp-hud-dil-unit">${l.dilUnit}</div>
          </div>
          <div class="comp-hud-item">
            <div class="comp-hud-label-text" id="comp-hud-tid-label">${l.tidal}</div>
            <div class="comp-hud-live-value" id="comp-tidal">\u2014</div>
            <div class="comp-hud-live-unit" id="comp-hud-tid-unit">${l.tidUnit}</div>
          </div>
        </div>

        <div class="comp-progress">
          <div id="comp-progress-bar"></div>
          <div class="comp-progress-label" id="comp-progress-label">${l.progress}</div>
        </div>
      </main>

      <footer id="comp-footer">
        <div id="comp-footer-text">${l.footer} <a href="https://cleanlystudio.pro" target="_blank">Cleanlystudio</a></div>
      </footer>
    </div>
  `;
}

function renderChapter(ch: ChapterData, science: ChapterScience | undefined, l: typeof LABELS['en'], _color: string) {
  const numEl = document.getElementById('comp-chapter-num')!;
  const titleEl = document.getElementById('comp-chapter-title')!;
  const subEl = document.getElementById('comp-chapter-sub')!;
  const interEl = document.getElementById('comp-interstitial')!;
  const scienceEl = document.getElementById('comp-science')!;
  const hudEl = document.getElementById('comp-hud')!;

  numEl.classList.remove('reveal');
  titleEl.classList.remove('reveal');
  subEl.classList.remove('reveal');
  interEl.classList.remove('reveal');
  scienceEl.classList.remove('reveal');
  hudEl.classList.remove('reveal');

  void numEl.offsetWidth;

  numEl.textContent = String(ch.index).padStart(2, '0');
  titleEl.textContent = ch.title;
  subEl.textContent = ch.subtitle.replace(/\\n/g, '\n');
  interEl.textContent = ch.interstitial || '';

  if (science) {
    scienceEl.innerHTML = buildScienceHTML(science, l);
  }

  requestAnimationFrame(() => {
    numEl.classList.add('reveal');
    setTimeout(() => titleEl.classList.add('reveal'), 150);
    setTimeout(() => subEl.classList.add('reveal'), 350);
    if (ch.interstitial) setTimeout(() => interEl.classList.add('reveal'), 550);
    setTimeout(() => scienceEl.classList.add('reveal'), 500);
    setTimeout(() => hudEl.classList.add('reveal'), 700);
  });
}

function buildScienceHTML(science: ChapterScience, l: typeof LABELS['en']): string {
  const sections = science.sections.map(s => `
    <div class="comp-section">
      <div class="comp-section-heading">${s.heading}</div>
      <div class="comp-section-body">${s.body}</div>
    </div>
  `).join('');

  const metrics = science.metrics.map(m => `
    <div class="comp-metric">
      <div class="comp-metric-label">${m.label}</div>
      <div class="comp-metric-value">${m.value}</div>
      ${m.unit ? `<div class="comp-metric-unit">${m.unit}</div>` : ''}
    </div>
  `).join('');

  return `
    <div class="comp-what-you-see">
      <div class="comp-what-you-see-label">${l.whatYouSee}</div>
      <div class="comp-what-you-see-text">${science.whatYouSee}</div>
    </div>

    <div class="comp-sections">${sections}</div>

    <div class="comp-metrics">${metrics}</div>

    <div class="comp-funfact">
      <div class="comp-funfact-label">${l.funFact}</div>
      <div class="comp-funfact-text">${science.funFact}</div>
    </div>
  `;
}

function updateHUD(s: StateData) {
  const distEl = document.getElementById('comp-distance');
  const tempEl = document.getElementById('comp-temp');
  const dilEl = document.getElementById('comp-dilation');
  const tidalEl = document.getElementById('comp-tidal');
  const progBar = document.getElementById('comp-progress-bar');

  if (distEl) distEl.textContent = s.distance.toFixed(1);
  if (tempEl) tempEl.textContent = s.temp.toFixed(2);
  if (dilEl) dilEl.textContent = s.timeDilation > 999 ? '\u221E' : s.timeDilation.toFixed(2);
  if (tidalEl) tidalEl.textContent = s.tidalForce.toFixed(1);
  if (progBar) progBar.style.width = `${Math.min(100, s.scroll * 100)}%`;
}

function updateLabels(l: typeof LABELS['en']) {
  const els: Record<string, string> = {
    'comp-hud-dist-label': l.distance,
    'comp-hud-temp-label': l.temp,
    'comp-hud-dil-label': l.dilation,
    'comp-hud-tid-label': l.tidal,
    'comp-hud-dist-unit': l.distUnit,
    'comp-hud-temp-unit': l.tempUnit,
    'comp-hud-dil-unit': l.dilUnit,
    'comp-hud-tid-unit': l.tidUnit,
    'comp-progress-label': l.progress,
  };

  for (const [id, text] of Object.entries(els)) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}
