import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.join(__dirname, '..', 'mobile-screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--no-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://localhost:4203', { waitUntil: 'networkidle', timeout: 30000 });

  try {
    await page.waitForFunction(() => {
      const loader = document.getElementById('loader');
      if (!loader) return true;
      const s = getComputedStyle(loader);
      return s.display === 'none' || s.opacity === '0' || s.visibility === 'hidden';
    }, { timeout: 20000 });
  } catch { /* */ }

  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'desktop-sound-prompt.png') });

  const skipBtn = await page.$('#sound-prompt-no');
  if (skipBtn) await skipBtn.click();
  await page.waitForTimeout(6000);

  const totalH = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  for (const pct of [0.05, 0.3, 0.55, 0.8]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.floor(totalH * pct));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `desktop-scroll-${Math.round(pct * 100)}.png`) });
  }

  await browser.close();
  console.log('Done!');
})();
