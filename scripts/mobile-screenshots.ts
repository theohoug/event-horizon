import { chromium, devices } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.join(__dirname, '..', 'mobile-screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const MOBILE_DEVICES = [
  { name: 'iPhone-14', device: devices['iPhone 14'] },
  { name: 'iPhone-14-Pro-Max', device: devices['iPhone 14 Pro Max'] },
  { name: 'Pixel-7', device: devices['Pixel 7'] },
  { name: 'iPad-Mini', device: devices['iPad Mini'] },
];

const SCROLL_POSITIONS = [0, 0.05, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95, 1.0];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-angle=d3d11',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
      '--no-sandbox',
    ],
  });

  for (const { name, device } of MOBILE_DEVICES) {
    console.log(`\n--- ${name} ---`);
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();

    await page.goto('http://localhost:4203', { waitUntil: 'networkidle', timeout: 30000 });

    try {
      await page.waitForFunction(() => {
        const loader = document.getElementById('loader');
        if (!loader) return true;
        const s = getComputedStyle(loader);
        return s.display === 'none' || s.opacity === '0' || s.visibility === 'hidden';
      }, { timeout: 20000 });
    } catch {
      console.log('Loader timeout');
    }

    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `${name}-00-sound-prompt.png`) });
    console.log(`${name}: sound prompt`);

    const skipBtn = await page.$('#sound-prompt-no');
    if (skipBtn) await skipBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(OUT, `${name}-01-intro.png`) });
    console.log(`${name}: intro`);

    await page.waitForTimeout(5000);

    const totalH = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

    for (let i = 0; i < SCROLL_POSITIONS.length; i++) {
      const pos = SCROLL_POSITIONS[i];
      const y = Math.floor(totalH * pos);
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await page.waitForTimeout(1200);
      const idx = String(i + 2).padStart(2, '0');
      await page.screenshot({ path: path.join(OUT, `${name}-${idx}-scroll-${Math.round(pos * 100)}.png`) });
      console.log(`${name}: scroll ${Math.round(pos * 100)}%`);
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to ${OUT}`);
})();
