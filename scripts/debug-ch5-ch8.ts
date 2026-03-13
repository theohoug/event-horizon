import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.join(__dirname, '..', 'debug-screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:4203', { waitUntil: 'networkidle', timeout: 30000 });

  await page.waitForFunction(() => {
    const loader = document.getElementById('loader');
    if (!loader) return true;
    const s = getComputedStyle(loader);
    return s.display === 'none' || s.opacity === '0';
  }, { timeout: 30000 });
  await page.waitForTimeout(500);

  const skipBtn = await page.$('#sound-prompt-no');
  if (skipBtn) await skipBtn.click();
  await page.waitForTimeout(2000);

  const scrollPositions = [
    { pct: 0.44, name: 'ch5-early' },
    { pct: 0.48, name: 'ch5-mid' },
    { pct: 0.52, name: 'ch5-late' },
    { pct: 0.88, name: 'ch8-early' },
    { pct: 0.94, name: 'ch8-mid' },
    { pct: 0.97, name: 'ch8-late' },
  ];

  for (const sp of scrollPositions) {
    await page.evaluate((s) => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, total * s);
    }, sp.pct);
    await page.waitForTimeout(3500);

    await page.screenshot({ path: path.join(OUT, `detail-${sp.name}.png`) });

    const diag = await page.evaluate(() => {
      const ct = document.getElementById('chapter-text');
      if (!ct) return 'NO container';
      const lines = ct.querySelectorAll('.line');
      let r = '';
      lines.forEach((l, i) => {
        const el = l as HTMLElement;
        const cs = getComputedStyle(el);
        r += `LINE[${i}] "${el.className}" "${el.textContent?.slice(0,30)}" op=${cs.opacity} fill=${cs.webkitTextFillColor} h=${cs.height} willChange=${cs.willChange}\n`;
        const chars = el.querySelectorAll('.char');
        if (chars.length > 0) {
          const c = chars[0] as HTMLElement;
          const ccs = getComputedStyle(c);
          r += `  char[0] op=${ccs.opacity} willChange=${ccs.willChange} anim=${ccs.animationName}\n`;
        }
      });
      return r;
    });
    console.log(`--- ${sp.name} (${Math.round(sp.pct*100)}%) ---\n${diag}`);
  }

  console.log('Done!');
  await browser.close();
})();
