/**
 * @file Beauty screenshots capture for Awwwards presentation
 * @author Cleanlystudio
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = path.join(__dirname, '..', 'screenshots-awwwards');
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  console.log('Loading Event Horizon in ULTRA via URL param...');
  await page.goto('http://localhost:4203/?quality=ultra', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  const hideCursorAndUI = async () => {
    await page.evaluate(() => {
      const hide = (sel) => { const el = typeof sel === 'string' ? document.querySelector(sel) : sel; if (el) el.style.display = 'none'; };
      hide('#custom-cursor');
      hide('#custom-cursor-ring');
      hide('#chapter-nav');
      hide('#hud');
      hide('#hud-bar');
      hide('.hud-container');
      hide('#noise-grain');
      document.querySelectorAll('.cursor-trail').forEach(t => t.style.display = 'none');
      hide('#data-hud');
      hide('#companion-qr-btn');
      hide('#scroll-hint');
      hide('#idle-hint');
      document.querySelectorAll('.scroll-hint, .idle-hint, [id*="hint"]').forEach(el => el.style.display = 'none');
      const chapNav = document.getElementById('chapter-nav');
      if (chapNav) chapNav.style.opacity = '0';
      document.body.style.cursor = 'none';
    });
  };

  await hideCursorAndUI();
  console.log('1/10 — Loader star');
  await page.screenshot({ path: path.join(outDir, '01-loader-star.png'), type: 'png' });

  console.log('Entering experience...');
  await page.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    if (sp) {
      const btns = sp.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('skip')) { b.click(); return; }
      }
      for (const b of btns) { b.click(); return; }
    }
  });
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    if (sp && getComputedStyle(sp).display !== 'none' && sp.classList.contains('visible')) {
      sp.style.display = 'none';
      sp.classList.remove('visible');
    }
    const intro = document.getElementById('intro-cinematic');
    if (intro) intro.style.display = 'none';
  });
  await page.waitForTimeout(3000);

  await hideCursorAndUI();

  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log(`Max scroll: ${maxScroll}px`);

  const shots = [
    { name: '02-observer-opening',  scroll: 0.02, wait: 3000, label: 'Chapter 1: The Observer' },
    { name: '03-the-pull',          scroll: 0.15, wait: 3500, label: 'Chapter 2: The Pull' },
    { name: '04-accretion-disk',    scroll: 0.30, wait: 3500, label: 'Chapter 3: Accretion' },
    { name: '05-the-fall',          scroll: 0.42, wait: 3500, label: 'Chapter 4: The Fall' },
    { name: '06-spaghettification', scroll: 0.55, wait: 3000, label: 'Chapter 5: Spaghettification' },
    { name: '07-the-warp',         scroll: 0.67, wait: 3000, label: 'Chapter 6: The Warp' },
    { name: '08-timewarp-deep',     scroll: 0.75, wait: 3000, label: 'Chapter 6: Deep time warp' },
    { name: '09-singularity',       scroll: 0.85, wait: 4000, label: 'Chapter 7: Singularity' },
  ];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    console.log(`${i + 2}/10 — ${shot.label}`);

    await page.evaluate((s) => {
      window.scrollTo({ top: s, behavior: 'instant' });
    }, Math.floor(maxScroll * shot.scroll));
    await page.waitForTimeout(shot.wait);
    await hideCursorAndUI();
    await page.screenshot({ path: path.join(outDir, `${shot.name}.png`), type: 'png' });
  }

  console.log('10/10 — Credits');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(4000);
  await hideCursorAndUI();
  await page.screenshot({ path: path.join(outDir, '10-credits-white.png'), type: 'png' });

  await browser.close();

  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.png'));
  console.log(`\nDONE — ${files.length} screenshots in screenshots-awwwards/`);
  files.forEach(f => {
    const stats = fs.statSync(path.join(outDir, f));
    console.log(`  ${f} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
  });
})();
