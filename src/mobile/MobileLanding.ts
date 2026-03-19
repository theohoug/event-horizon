/**
 * @file MobileLanding.ts
 * @description Mobile landing page with WebGL star particle formation + companion mode
 * @author Cleanlystudio
 * @version 3.0.0
 */

import './mobile-landing.css';
import type { MobileLandingScene } from './MobileLandingScene';

type Lang = 'en' | 'fr';

const content = {
  en: {
    heroSub: 'An Interactive Journey Into a Black Hole',
    mainMessage: 'This experience was designed for large screens.',
    mainSub: 'Open Event Horizon on a desktop browser to begin your descent into a supermassive black hole.',
    techLine: 'Real-time raymarched GLSL shaders \u00B7 Procedural audio \u00B7 9 chapters',
    desktopOnly: 'Desktop experience',
    companionTitle: 'COMPANION MODE',
    companionText: 'Turn your phone into a <span class="ml-highlight">live mission console</span>. Real-time telemetry synced to the desktop experience.',
    scanBtn: 'Scan QR Code',
    scanOr: 'or follow these steps',
    step1: 'Open the site on a desktop computer',
    step2: 'A QR code will appear on the intro screen',
    step3: 'Scan it to get live scientific data on your phone',
    chaptersTitle: '9 CHAPTERS',
    chapters: ['YOU', 'THE PULL', 'THE WARP', 'THE PHOTON SPHERE', 'THE FALL', 'SPAGHETTIFICATION', 'TIME DILATION', 'SINGULARITY', 'WHAT REMAINS'],
    footer: 'Crafted by',
    scannerTitle: 'Scan QR Code',
    scannerHint: 'Point your camera at the QR code on the desktop screen',
    scannerDenied: 'Camera access denied. Use your native camera app to scan the QR code.',
  },
  fr: {
    heroSub: 'Un Voyage Interactif Dans un Trou Noir',
    mainMessage: 'Cette exp\u00E9rience a \u00E9t\u00E9 con\u00E7ue pour les grands \u00E9crans.',
    mainSub: 'Ouvrez Event Horizon sur un navigateur desktop pour d\u00E9buter votre descente dans un trou noir supermassif.',
    techLine: 'Shaders GLSL en temps r\u00E9el \u00B7 Audio proc\u00E9dural \u00B7 9 chapitres',
    desktopOnly: 'Exp\u00E9rience desktop',
    companionTitle: 'MODE COMPAGNON',
    companionText: 'Transformez votre t\u00E9l\u00E9phone en <span class="ml-highlight">console de mission</span>. T\u00E9l\u00E9m\u00E9trie en temps r\u00E9el synchronis\u00E9e avec l\u2019exp\u00E9rience desktop.',
    scanBtn: 'Scanner le QR Code',
    scanOr: 'ou suivez ces \u00E9tapes',
    step1: 'D\u00E9marrez le site sur un navigateur desktop',
    step2: 'Un QR code appara\u00EEtra sur l\u2019\u00E9cran d\u2019intro',
    step3: 'Scannez-le et votre mobile se synchronisera avec le voyage',
    chaptersTitle: '9 CHAPITRES',
    chapters: ['TOI', 'L\u2019ATTRACTION', 'LA DISTORSION', 'LA SPH\u00C8RE DE PHOTONS', 'LA CHUTE', 'LA SPAGHETTIFICATION', 'LA DILATATION TEMPORELLE', 'SINGULARIT\u00C9', 'CE QUI RESTE'],
    footer: 'Con\u00E7u par',
    scannerTitle: 'Scanner le QR Code',
    scannerHint: 'Dirigez votre cam\u00E9ra vers le QR code sur l\u2019\u00E9cran du PC',
    scannerDenied: 'Acc\u00E8s cam\u00E9ra refus\u00E9. Utilisez votre app cam\u00E9ra native pour scanner le QR code.',
  },
};

let currentLang: Lang = (localStorage.getItem('eh_lang') as Lang) || 'en';
let scene: MobileLandingScene | null = null;

function render() {
  const t = content[currentLang];
  const root = document.getElementById('mobile-landing')!;

  root.innerHTML = `
    <canvas id="ml-canvas"></canvas>
    <div id="ml-grain"></div>
    <div id="ml-content">
      <div class="ml-topbar">
        <div class="ml-lang">
          <button class="ml-lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
          <span class="ml-lang-sep">\u00B7</span>
          <button class="ml-lang-btn ${currentLang === 'fr' ? 'active' : ''}" data-lang="fr">FR</button>
        </div>
      </div>

      <div class="ml-hero-spacer"></div>

      <div class="ml-scroll-cue">
        <div class="ml-scroll-cue-line"></div>
      </div>

      <div class="ml-main-message">
        <div class="ml-desktop-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span>${t.desktopOnly}</span>
        </div>
        <p class="ml-main-text">${t.mainMessage}</p>
        <p class="ml-main-sub">${t.mainSub}</p>
        <div class="ml-tech-line">${t.techLine}</div>
      </div>

      <div class="ml-companion">
        <div class="ml-companion-label">${t.companionTitle}</div>
        <div class="ml-companion-text">${t.companionText}</div>

        <button id="ml-scan-btn" class="ml-scan-btn">
          <svg class="ml-scan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 3H5a2 2 0 00-2 2v2"></path>
            <path d="M17 3h2a2 2 0 012 2v2"></path>
            <path d="M7 21H5a2 2 0 01-2-2v-2"></path>
            <path d="M17 21h2a2 2 0 002-2v-2"></path>
            <line x1="3" y1="12" x2="21" y2="12"></line>
          </svg>
          ${t.scanBtn}
        </button>

        <div class="ml-scan-divider">
          <span class="ml-scan-divider-line"></span>
          <span class="ml-scan-divider-text">${t.scanOr}</span>
          <span class="ml-scan-divider-line"></span>
        </div>

        <div class="ml-companion-steps">
          <div class="ml-step">
            <span class="ml-step-num">1</span>
            <span class="ml-step-text">${t.step1}</span>
          </div>
          <div class="ml-step">
            <span class="ml-step-num">2</span>
            <span class="ml-step-text">${t.step2}</span>
          </div>
          <div class="ml-step">
            <span class="ml-step-num">3</span>
            <span class="ml-step-text">${t.step3}</span>
          </div>
        </div>
      </div>

      <div class="ml-chapters">
        <div class="ml-chapters-title">${t.chaptersTitle}</div>
        <div class="ml-chapter-list">
          ${t.chapters.map((ch, i) => `
            <div class="ml-chapter-item">
              <span class="ml-chapter-num">${String(i).padStart(2, '0')}</span>
              <span class="ml-chapter-name">${ch}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="ml-footer">
        <div class="ml-footer-text">${t.footer} <a href="https://cleanlystudio.pro" target="_blank">Cleanlystudio</a></div>
      </div>
    </div>
  `;

  root.querySelectorAll('.ml-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = (btn as HTMLElement).dataset.lang as Lang;
      if (lang === currentLang) return;
      currentLang = lang;
      localStorage.setItem('eh_lang', lang);
      render();
      initScene();
    });
  });

  const scanBtn = document.getElementById('ml-scan-btn');
  if (scanBtn) scanBtn.addEventListener('click', openScanner);
}

function initScene() {
  if (scene) {
    scene.destroy();
    scene = null;
  }
  const canvas = document.getElementById('ml-canvas') as HTMLCanvasElement;
  const scrollContainer = document.getElementById('mobile-landing');
  if (!canvas) return;

  import('./MobileLandingScene').then(({ MobileLandingScene }) => {
    scene = new MobileLandingScene(canvas, scrollContainer || undefined);
    scene.start();
  });
}

function openScanner() {
  const t = content[currentLang];

  const overlay = document.createElement('div');
  overlay.id = 'ml-scanner-overlay';
  overlay.innerHTML = `
    <div class="ml-scanner-header">
      <div class="ml-scanner-title">${t.scannerTitle}</div>
      <button class="ml-scanner-close" aria-label="Close">&times;</button>
    </div>
    <div class="ml-scanner-viewport">
      <video id="ml-scanner-video" autoplay playsinline muted></video>
      <div class="ml-scanner-frame">
        <span class="ml-sf-corner ml-sf-tl"></span>
        <span class="ml-sf-corner ml-sf-tr"></span>
        <span class="ml-sf-corner ml-sf-bl"></span>
        <span class="ml-sf-corner ml-sf-br"></span>
        <div class="ml-scanner-laser"></div>
      </div>
    </div>
    <div class="ml-scanner-hint">${t.scannerHint}</div>
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('active'));

  const video = document.getElementById('ml-scanner-video') as HTMLVideoElement;
  const hintEl = overlay.querySelector('.ml-scanner-hint') as HTMLElement;
  const closeBtn = overlay.querySelector('.ml-scanner-close')!;
  let stream: MediaStream | null = null;
  let rafId = 0;
  let destroyed = false;

  closeBtn.addEventListener('click', cleanup);

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(s => {
      if (destroyed) { s.getTracks().forEach(tr => tr.stop()); return; }
      stream = s;
      video.srcObject = s;
      video.play();
      startDetection();
    })
    .catch(() => {
      hintEl.textContent = t.scannerDenied;
    });

  function startDetection() {
    const BarcodeDetectorClass = (window as unknown as Record<string, unknown>).BarcodeDetector as
      (new (opts: { formats: string[] }) => { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> }) | undefined;

    if (BarcodeDetectorClass) {
      startNativeDetection(new BarcodeDetectorClass({ formats: ['qr_code'] }));
    } else {
      startJsQRDetection();
    }
  }

  function startNativeDetection(detector: { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> }) {
    function detect() {
      if (destroyed) return;
      if (video.readyState >= 2) {
        detector.detect(video).then(barcodes => {
          if (destroyed) return;
          for (const barcode of barcodes) {
            if (barcode.rawValue && barcode.rawValue.includes('companion=')) {
              cleanup();
              window.location.href = barcode.rawValue;
              return;
            }
          }
        }).catch(() => {});
      }
      rafId = requestAnimationFrame(detect);
    }
    detect();
  }

  function startJsQRDetection() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    import('jsqr').then(({ default: jsQR }) => {
      function detect() {
        if (destroyed) return;
        if (video.readyState >= 2) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result && result.data && result.data.includes('companion=')) {
            cleanup();
            window.location.href = result.data;
            return;
          }
        }
        rafId = requestAnimationFrame(detect);
      }
      detect();
    }).catch(() => {
      hintEl.textContent = t.scannerDenied;
    });
  }

  function cleanup() {
    destroyed = true;
    cancelAnimationFrame(rafId);
    if (stream) stream.getTracks().forEach(tr => tr.stop());
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  }
}

export function init() {
  const app = document.getElementById('app');
  if (app) app.style.display = 'none';
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  const root = document.createElement('div');
  root.id = 'mobile-landing';
  document.body.appendChild(root);

  render();
  initScene();
}
