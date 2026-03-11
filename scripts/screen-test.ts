import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'http://localhost:4203';
const OUT = path.join(__dirname, '..', 'test-screens');

const VIEWPORTS = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'mobile-iphone', width: 390, height: 844, isMobile: true },
  { name: 'ultrawide-2560', width: 2560, height: 1080 },
  { name: 'tablet-ipad', width: 768, height: 1024, isMobile: true },
  { name: 'small-laptop', width: 1280, height: 720 },
];

const SCROLL_POSITIONS = [0, 0.05, 0.12, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88, 0.95, 1.0];
const CHAPTER_LABELS = ['intro', 'ch0-you', 'ch1-pull', 'ch2-warp', 'ch3-photon', 'ch4-fall', 'ch5-spagh', 'ch6-time', 'ch7-sing', 'ch8-remains', 'credits-start', 'credits-end'];

async function main() {
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const issues: string[] = [];

  for (const vp of VIEWPORTS) {
    const dir = path.join(OUT, vp.name);
    fs.mkdirSync(dir, { recursive: true });

    console.log(`\n=== Testing ${vp.name} (${vp.width}x${vp.height}) ===`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.isMobile ? 2 : 1,
      isMobile: vp.isMobile || false,
      hasTouch: vp.isMobile || false,
    });

    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(dir, '00-loader.png') });

    await page.evaluate(() => {
      const loader = document.getElementById('loader');
      if (loader) { loader.classList.add('hidden'); loader.style.display = 'none'; }
      const soundPrompt = document.getElementById('sound-prompt');
      if (soundPrompt) { soundPrompt.classList.remove('visible'); soundPrompt.style.display = 'none'; }
      const intro = document.getElementById('intro-cinematic');
      if (intro) { intro.style.display = 'none'; intro.classList.remove('active'); }
      const dataHud = document.getElementById('data-hud');
      if (dataHud) dataHud.classList.add('visible');
      const muteBtn = document.getElementById('mute-btn');
      if (muteBtn) muteBtn.classList.add('visible');
      const langBtn = document.getElementById('lang-btn');
      if (langBtn) langBtn.classList.add('visible');
      const nav = document.getElementById('chapter-nav');
      if (nav) nav.classList.add('visible');
      const leaks = document.getElementById('ambient-leaks');
      if (leaks) leaks.classList.add('visible');
      const aura = document.getElementById('depth-aura');
      if (aura) aura.classList.add('visible');
      document.querySelectorAll('.corner-ornament').forEach(el => el.classList.add('visible'));
    });

    await page.waitForTimeout(500);

    for (let i = 0; i < SCROLL_POSITIONS.length; i++) {
      const scrollPct = SCROLL_POSITIONS[i];
      const label = CHAPTER_LABELS[i];

      await page.evaluate((pct) => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, maxScroll * pct);
      }, scrollPct);

      await page.waitForTimeout(800);

      const filename = `${String(i + 1).padStart(2, '0')}-${label}.png`;
      await page.screenshot({ path: path.join(dir, filename) });

      const centerCheck = await page.evaluate(() => {
        const chapterText = document.getElementById('chapter-text');
        if (!chapterText) return { ok: true, detail: 'no chapter text' };

        const rect = chapterText.getBoundingClientRect();
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const offX = Math.abs(centerX - viewW / 2);
        const offY = Math.abs(centerY - viewH / 2);

        const lines = chapterText.querySelectorAll('.line');
        let textVisible = false;
        lines.forEach(line => {
          const s = window.getComputedStyle(line);
          if (parseFloat(s.opacity) > 0.1) textVisible = true;
        });

        return {
          ok: offX < 100,
          offX: Math.round(offX),
          offY: Math.round(offY),
          textVisible,
          rectLeft: Math.round(rect.left),
          rectRight: Math.round(rect.right),
          viewW,
          viewH,
        };
      });

      if (!centerCheck.ok) {
        const msg = `[${vp.name}] ${label}: OFF-CENTER by ${centerCheck.offX}px horizontal (rect: ${centerCheck.rectLeft}-${centerCheck.rectRight}, view: ${centerCheck.viewW})`;
        issues.push(msg);
        console.log(`  ❌ ${msg}`);
      } else {
        console.log(`  ✅ ${label} — centered (offX: ${centerCheck.offX}px)`);
      }
    }

    await context.close();
  }

  console.log('\n\n========== RESULTS ==========');
  if (issues.length === 0) {
    console.log('✅ ALL VIEWPORTS CENTERED CORRECTLY');
  } else {
    console.log(`❌ ${issues.length} CENTERING ISSUES:`);
    issues.forEach(i => console.log(`  ${i}`));
  }

  console.log(`\nScreenshots saved to: ${OUT}`);
  console.log(`Total: ${VIEWPORTS.length} viewports × ${SCROLL_POSITIONS.length} positions = ${VIEWPORTS.length * SCROLL_POSITIONS.length} screenshots`);

  await browser.close();
}

main().catch(console.error);
