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
  lang?: string;
  chapter?: number;
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
    waiting: 'CONNECTED',
    waitingTitle: 'MISSION CONSOLE',
    waitingSub: 'Linked to room',
    waitingHint: 'Waiting for the desktop to begin the descent',
    waitingDesc: 'When the experience starts on desktop, this screen will transform into a live scientific companion. Real-time telemetry, chapter-by-chapter astrophysics documentation, and mission data synced to the journey.',
    waitingReady: 'SIGNAL LOCKED',
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
    archiveTitle: 'JOURNEY COMPLETE',
    archiveSub: 'Browse all chapters and their scientific documentation',
    archiveBtn: 'View chapter',
    backToChapters: 'ALL CHAPTERS',
    sourcesTitle: 'SOURCES & REFERENCES',
    sourcesSub: 'Scientific data and research behind this experience',
    sourcesBtn: 'SOURCES',
    footer: 'Crafted by',
  },
  fr: {
    companion: 'COMPAGNON',
    connecting: 'CONNEXION...',
    live: 'EN DIRECT',
    waiting: 'CONNECT\u00C9',
    waitingTitle: 'CONSOLE DE MISSION',
    waitingSub: 'Li\u00E9 \u00E0 la salle',
    waitingHint: 'En attente du d\u00E9but de la descente sur le bureau',
    waitingDesc: 'Quand l\u2019exp\u00E9rience d\u00E9marre sur le bureau, cet \u00E9cran se transforme en compagnon scientifique. T\u00E9l\u00E9m\u00E9trie en direct, documentation astrophysique chapitre par chapitre, donn\u00E9es de mission synchronis\u00E9es.',
    waitingReady: 'SIGNAL VERROUILL\u00C9',
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
    archiveTitle: 'VOYAGE TERMIN\u00C9',
    archiveSub: 'Parcourez tous les chapitres et leur documentation scientifique',
    archiveBtn: 'Voir le chapitre',
    backToChapters: 'TOUS LES CHAPITRES',
    sourcesTitle: 'SOURCES & R\u00C9F\u00C9RENCES',
    sourcesSub: 'Donn\u00E9es scientifiques et recherches derri\u00E8re cette exp\u00E9rience',
    sourcesBtn: 'SOURCES',
    footer: 'Con\u00E7u par',
  },
};

type Lang = 'en' | 'fr';

export async function init(roomId: string) {
  const app = document.getElementById('app');
  if (app) app.style.display = 'none';
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  // Priority: URL param (from QR code) > localStorage > default 'en'
  const urlLang = new URL(window.location.href).searchParams.get('lang');
  let lang: Lang = (urlLang === 'en' || urlLang === 'fr') ? urlLang : (localStorage.getItem('eh_lang') as Lang) || 'en';
  let scienceData = getScienceData(lang);
  let labels = LABELS[lang];

  const root = document.createElement('div');
  root.id = 'companion-root';
  root.innerHTML = buildHTML(roomId, labels);
  document.body.appendChild(root);

  const hub = new BroadcastHub();
  let currentChapter = -1;
  let connected = false;
  let archiveShown = false;
  let viewingArchiveChapter = false;
  const receivedChapters = new Map<number, ChapterData>();

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
      if (archiveShown) showArchive();
    }
    markConnected();
  });

  hub.on('chapter', (data) => {
    const ch = data as unknown as ChapterData;
    receivedChapters.set(ch.index, ch);
    if (ch.index === currentChapter && !archiveShown) return;
    currentChapter = ch.index;

    if (archiveShown) {
      archiveShown = false;
      const archiveEl = document.getElementById('comp-archive');
      if (archiveEl) archiveEl.classList.add('hidden');
      main.classList.remove('hidden');
    }

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

    if (!connected) markConnected();

    // Sync language from desktop on every state update
    if (s.lang && (s.lang === 'en' || s.lang === 'fr') && s.lang !== lang) {
      lang = s.lang as Lang;
      scienceData = getScienceData(lang);
      labels = LABELS[lang];
      updateLabels(labels);
      if (archiveShown) showArchive();
      // Re-render current chapter in new language
      if (currentChapter >= 0 && !archiveShown) {
        const ch = receivedChapters.get(currentChapter);
        if (ch) {
          const color = CHAPTER_COLORS[currentChapter] || '#ffffff';
          renderChapter(ch, scienceData[currentChapter], labels, color);
        }
      }
    }

    // Sync chapter from desktop — catch missed chapter events
    if (typeof s.chapter === 'number' && s.chapter >= 0 && s.chapter !== currentChapter && !archiveShown) {
      const ch = receivedChapters.get(s.chapter);
      if (ch) {
        currentChapter = s.chapter;
        waiting.classList.add('hidden');
        main.classList.remove('hidden');
        const color = CHAPTER_COLORS[s.chapter] || '#ffffff';
        document.documentElement.style.setProperty('--comp-accent', color);
        renderChapter(ch, scienceData[s.chapter], labels, color);
        bg.style.background = `radial-gradient(ellipse at center, ${color}12 0%, transparent 70%)`;
      }
    }

    if (currentChapter >= 0) updateHUD(s);

    if (s.scroll >= 0.97 && !archiveShown && receivedChapters.size > 0) {
      archiveShown = true;
      showArchive();
    }
  });

  function markConnected() {
    if (connected) return;
    connected = true;
    dot.classList.add('live');
    statusText.textContent = labels.live;
  }

  function showArchive() {
    let archiveEl = document.getElementById('comp-archive');
    if (!archiveEl) {
      archiveEl = document.createElement('div');
      archiveEl.id = 'comp-archive';
      const content = document.getElementById('comp-content')!;
      const footer = document.getElementById('comp-footer')!;
      content.insertBefore(archiveEl, footer);
    }

    main.classList.add('hidden');
    archiveEl.classList.remove('hidden');

    const chapterNames = scienceData.map((s, i) => {
      const ch = receivedChapters.get(i);
      return ch ? ch.title : s.whatYouSee.substring(0, 30);
    });

    archiveEl.innerHTML = `
      <div class="comp-archive-header">
        <div class="comp-archive-title">${labels.archiveTitle}</div>
        <div class="comp-archive-sub">${labels.archiveSub}</div>
      </div>
      <div class="comp-archive-grid">
        ${scienceData.map((_, i) => `
          <button class="comp-archive-card" data-chapter="${i}" style="--card-color: ${CHAPTER_COLORS[i]}">
            <span class="comp-archive-num">${String(i).padStart(2, '0')}</span>
            <span class="comp-archive-name">${chapterNames[i]}</span>
          </button>
        `).join('')}
      </div>
      <button class="comp-sources-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        ${labels.sourcesBtn}
      </button>
    `;

    archiveEl.querySelectorAll('.comp-archive-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt((card as HTMLElement).dataset.chapter || '0', 10);
        const color = CHAPTER_COLORS[idx] || '#ffffff';
        document.documentElement.style.setProperty('--comp-accent', color);
        archiveEl!.classList.add('hidden');
        main.classList.remove('hidden');
        viewingArchiveChapter = true;

        const ch = receivedChapters.get(idx) || { index: idx, title: chapterNames[idx], subtitle: '', interstitial: '' };
        renderChapter(ch, scienceData[idx], labels, color, true, showArchive);
        bg.style.background = `radial-gradient(ellipse at center, ${color}12 0%, transparent 70%)`;
        root.scrollTo({ top: 0, behavior: 'smooth' });

        statusText.textContent = labels.archiveBtn;
      });
    });

    const sourcesBtn = archiveEl.querySelector('.comp-sources-btn');
    if (sourcesBtn) {
      sourcesBtn.addEventListener('click', () => showSources());
    }

    root.scrollTo({ top: 0, behavior: 'smooth' });
    statusText.textContent = labels.archiveTitle;
    dot.classList.remove('live');
    dot.classList.add('connected');
  }

  function showSources() {
    let sourcesEl = document.getElementById('comp-sources');
    if (!sourcesEl) {
      sourcesEl = document.createElement('div');
      sourcesEl.id = 'comp-sources';
      const content = document.getElementById('comp-content')!;
      const footer = document.getElementById('comp-footer')!;
      content.insertBefore(sourcesEl, footer);
    }

    const archiveEl = document.getElementById('comp-archive');
    if (archiveEl) archiveEl.classList.add('hidden');
    main.classList.add('hidden');
    sourcesEl.classList.remove('hidden');

    sourcesEl.innerHTML = buildSourcesHTML(labels, () => {
      sourcesEl!.classList.add('hidden');
      showArchive();
    });

    sourcesEl.querySelector('.comp-sources-back')?.addEventListener('click', () => {
      sourcesEl!.classList.add('hidden');
      showArchive();
    });

    root.scrollTo({ top: 0, behavior: 'smooth' });
    statusText.textContent = labels.sourcesBtn;
  }

  await hub.join(roomId, 'companion');
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
        <div class="comp-waiting-signal">
          <div class="comp-signal-ring comp-ring-1"></div>
          <div class="comp-signal-ring comp-ring-2"></div>
          <div class="comp-signal-ring comp-ring-3"></div>
          <div class="comp-signal-core"></div>
        </div>
        <div class="comp-waiting-badge">${l.waitingReady}</div>
        <div class="comp-waiting-title">${l.waitingTitle}</div>
        <div class="comp-waiting-room">
          <span class="comp-waiting-room-label">${l.waitingSub}</span>
          <span class="comp-waiting-room-code">${roomId}</span>
        </div>
        <div class="comp-waiting-desc">${l.waitingDesc}</div>
        <div class="comp-waiting-line"></div>
        <div class="comp-waiting-hint">${l.waitingHint}<span class="comp-waiting-dots"></span></div>
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

function renderChapter(ch: ChapterData, science: ChapterScience | undefined, l: typeof LABELS['en'], _color: string, showBackBtn = false, onBack?: () => void) {
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

  const existingBackBtn = document.getElementById('comp-back-btn');
  if (existingBackBtn) existingBackBtn.remove();

  if (showBackBtn && onBack) {
    const backBtn = document.createElement('button');
    backBtn.id = 'comp-back-btn';
    backBtn.className = 'comp-back-btn';
    backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> ${l.backToChapters}`;
    backBtn.addEventListener('click', () => {
      backBtn.remove();
      onBack();
    });
    const header = document.querySelector('.comp-chapter-header');
    if (header) header.insertBefore(backBtn, header.firstChild);
  }

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

function buildSourcesHTML(l: typeof LABELS['en'], _onBack: () => void): string {
  const isEn = l.sourcesTitle === 'SOURCES & REFERENCES';

  const sources = [
    {
      category: isEn ? 'BLACK HOLE PHYSICS' : 'PHYSIQUE DES TROUS NOIRS',
      items: [
        { title: 'Schwarzschild, K. (1916)', desc: isEn ? '"On the Gravitational Field of a Mass Point." Sitzungsberichte der Preussischen Akademie der Wissenschaften.' : '"Sur le champ gravitationnel d\'un point de masse." Sitzungsberichte der Preussischen Akademie der Wissenschaften.' },
        { title: 'Penrose, R. (1965)', desc: isEn ? '"Gravitational Collapse and Space-Time Singularities." Physical Review Letters, 14(3).' : '"Effondrement gravitationnel et singularit\u00E9s de l\'espace-temps." Physical Review Letters, 14(3).' },
        { title: 'Hawking, S. (1974)', desc: isEn ? '"Black Hole Explosions?" Nature, 248, 30\u201331.' : '"Explosions de trous noirs ?" Nature, 248, 30\u201331.' },
        { title: 'Bardeen, J. M. (1973)', desc: isEn ? '"Timelike and Null Geodesics in the Kerr Metric." Les Houches proceedings. Black hole shadow calculations.' : '"G\u00E9od\u00E9siques temporelles et nulles dans la m\u00E9trique de Kerr." Calculs de l\'ombre des trous noirs.' },
      ],
    },
    {
      category: isEn ? 'OBSERVATIONAL DATA' : 'DONN\u00C9ES OBSERVATIONNELLES',
      items: [
        { title: 'Event Horizon Telescope (2019)', desc: isEn ? 'First image of M87*. Astrophysical Journal Letters, 875(1). Shadow: 42 \u00B1 3 \u03BCas.' : 'Premi\u00E8re image de M87*. Astrophysical Journal Letters, 875(1). Ombre : 42 \u00B1 3 \u03BCas.' },
        { title: 'Event Horizon Telescope (2022)', desc: isEn ? 'Image of Sgr A*. 4.3 million solar masses. Astrophysical Journal Letters, 930(2).' : 'Image de Sgr A*. 4,3 millions de masses solaires. Astrophysical Journal Letters, 930(2).' },
        { title: 'LIGO/Virgo/KAGRA (2015\u20132025)', desc: isEn ? '~300 gravitational wave detections. GW150914: 36+29 M\u2609 merger.' : '~300 d\u00E9tections d\'ondes gravitationnelles. GW150914 : fusion 36+29 M\u2609.' },
        { title: 'GPS Time Correction', desc: isEn ? '38 \u03BCs/day gravitational time dilation correction. Ashby, N. (2003), Living Reviews in Relativity.' : 'Correction de 38 \u03BCs/jour. Ashby, N. (2003), Living Reviews in Relativity.' },
      ],
    },
    {
      category: isEn ? 'KEY PARAMETERS USED' : 'PARAM\u00C8TRES CL\u00C9S UTILIS\u00C9S',
      items: [
        { title: isEn ? 'Black hole mass' : 'Masse du trou noir', desc: '10\u00B9\u2070 M\u2609 (Schwarzschild, non-rotating)' },
        { title: isEn ? 'Event horizon' : 'Horizon des \u00E9v\u00E9nements', desc: 'Rs = 29.5 \u00D7 10\u2079 km (197 AU)' },
        { title: isEn ? 'Photon sphere' : 'Sph\u00E8re de photons', desc: '1.5 Rs = 44.25 \u00D7 10\u2079 km' },
        { title: isEn ? 'ISCO' : 'ISCO', desc: '3.0 Rs (v = 0.408c, \u03B3 = 1.091)' },
        { title: isEn ? 'Shadow radius' : 'Rayon d\'ombre', desc: '2.598 Rs (= 3\u221A3/2 \u00D7 Rs)' },
        { title: isEn ? 'Hawking temperature' : 'Temp\u00E9rature de Hawking', desc: '6.17 \u00D7 10\u207B\u00B9\u2078 K' },
        { title: isEn ? 'Evaporation time' : 'Temps d\'\u00E9vaporation', desc: '~10\u2079\u2077 years' },
        { title: isEn ? 'Time to singularity' : 'Temps jusqu\'\u00E0 la singularit\u00E9', desc: isEn ? '15.5 hours (proper time)' : '15,5 heures (temps propre)' },
      ],
    },
    {
      category: isEn ? 'RENDERING TECHNIQUES' : 'TECHNIQUES DE RENDU',
      items: [
        { title: isEn ? 'Raymarching (GLSL)' : 'Raymarching (GLSL)', desc: isEn ? 'Real-time GPU raymarching through curved spacetime. Schwarzschild geodesic integration.' : 'Raymarching GPU temps r\u00E9el dans l\'espace-temps courbe. Int\u00E9gration g\u00E9od\u00E9sique de Schwarzschild.' },
        { title: isEn ? 'Accretion disk model' : 'Mod\u00E8le de disque d\'accr\u00E9tion', desc: isEn ? 'Novikov-Thorne thin disk. Temperature profile T(r) \u221D r\u207B\u00B3/\u2074. Doppler beaming + gravitational redshift.' : 'Disque mince Novikov-Thorne. Profil T(r) \u221D r\u207B\u00B3/\u2074. Beaming Doppler + redshift gravitationnel.' },
        { title: isEn ? 'Gravitational lensing' : 'Lentille gravitationnelle', desc: isEn ? 'Exact Schwarzschild deflection angle. Higher-order photon rings (n=1, n=2).' : 'Angle de d\u00E9flexion exact de Schwarzschild. Anneaux de photons d\'ordre sup\u00E9rieur (n=1, n=2).' },
        { title: isEn ? 'Procedural audio' : 'Audio proc\u00E9dural', desc: isEn ? 'Web Audio API. Binaural frequencies, granular synthesis, real-time parameter modulation.' : 'Web Audio API. Fr\u00E9quences binaurales, synth\u00E8se granulaire, modulation temps r\u00E9el.' },
      ],
    },
  ];

  return `
    <button class="comp-sources-back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      ${l.backToChapters}
    </button>
    <div class="comp-sources-header">
      <div class="comp-sources-title">${l.sourcesTitle}</div>
      <div class="comp-sources-sub">${l.sourcesSub}</div>
    </div>
    ${sources.map(cat => `
      <div class="comp-source-category">
        <div class="comp-source-cat-title">${cat.category}</div>
        ${cat.items.map(item => `
          <div class="comp-source-item">
            <div class="comp-source-name">${item.title}</div>
            <div class="comp-source-desc">${item.desc}</div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
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
