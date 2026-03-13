/**
 * @file MobileLanding.ts
 * @description Mobile landing page — blocks WebGL, explains the experience
 * @author Cleanlystudio
 * @version 1.0.0
 */

import './mobile-landing.css';

type Lang = 'en' | 'fr';

const content = {
  en: {
    subtitle: 'An Interactive Journey Into a Black Hole',
    desc1: 'Event Horizon is an <span class="ml-highlight">immersive desktop experience</span> that simulates falling into a supermassive black hole through 9 scientifically documented chapters.',
    desc2: 'Built with real-time raymarched GLSL shaders, procedural audio, and physics based on peer-reviewed astrophysics research.',
    desktopOnly: 'Desktop experience only',
    companionTitle: 'COMPANION MODE',
    companionText: 'Connect your phone to a desktop session for live scientific documentation of what\u2019s happening on screen.',
    step1: 'Open the site on a desktop computer',
    step2: 'A QR code will appear on the intro screen',
    step3: 'Scan it with your phone for real-time documentation',
    chaptersTitle: '9 CHAPTERS',
    chapters: ['YOU', 'THE PULL', 'THE WARP', 'THE PHOTON SPHERE', 'THE FALL', 'SPAGHETTIFICATION', 'TIME DILATION', 'SINGULARITY', 'WHAT REMAINS'],
    footer: 'Crafted by',
  },
  fr: {
    subtitle: 'Un Voyage Interactif Dans un Trou Noir',
    desc1: 'Event Horizon est une <span class="ml-highlight">exp\u00E9rience immersive desktop</span> qui simule la chute dans un trou noir supermassif \u00E0 travers 9 chapitres document\u00E9s scientifiquement.',
    desc2: 'Construit avec des shaders GLSL en temps r\u00E9el, un audio proc\u00E9dural, et une physique bas\u00E9e sur la recherche astrophysique.',
    desktopOnly: 'Exp\u00E9rience desktop uniquement',
    companionTitle: 'MODE COMPAGNON',
    companionText: 'Connectez votre t\u00E9l\u00E9phone \u00E0 une session desktop pour une documentation scientifique en direct de ce qui se passe \u00E0 l\u2019\u00E9cran.',
    step1: 'Ouvrez le site sur un ordinateur',
    step2: 'Un QR code appara\u00EEtra sur l\u2019\u00E9cran d\u2019intro',
    step3: 'Scannez-le avec votre t\u00E9l\u00E9phone pour la documentation en temps r\u00E9el',
    chaptersTitle: '9 CHAPITRES',
    chapters: ['TOI', 'L\u2019ATTRACTION', 'LA DISTORSION', 'LA SPH\u00C8RE DE PHOTONS', 'LA CHUTE', 'LA SPAGHETTIFICATION', 'LA DILATATION TEMPORELLE', 'SINGULARIT\u00C9', 'CE QUI RESTE'],
    footer: 'Con\u00E7u par',
  },
};

let currentLang: Lang = (localStorage.getItem('eh_lang') as Lang) || 'en';

function render() {
  const t = content[currentLang];
  const root = document.getElementById('mobile-landing')!;

  root.innerHTML = `
    <div id="ml-grain"></div>
    <div id="ml-content">
      <div class="ml-hero">
        <div class="ml-icon">\u25CE</div>
        <div class="ml-title">EVENT HORIZON</div>
        <div class="ml-subtitle">${t.subtitle}</div>
        <div class="ml-line"></div>
      </div>

      <div class="ml-description">
        <p>${t.desc1}</p>
        <p>${t.desc2}</p>
      </div>

      <div class="ml-desktop-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <span>${t.desktopOnly}</span>
      </div>

      <div class="ml-companion">
        <div class="ml-companion-icon">\uD83D\uDCF1</div>
        <div class="ml-companion-title">${t.companionTitle}</div>
        <div class="ml-companion-text">${t.companionText}</div>
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

      <div class="ml-lang">
        <button class="ml-lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
        <button class="ml-lang-btn ${currentLang === 'fr' ? 'active' : ''}" data-lang="fr">FR</button>
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
    });
  });
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
}
