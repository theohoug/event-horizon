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
    return s.display === 'none' || s.opacity === '0' || s.visibility === 'hidden';
  }, { timeout: 30000 });

  await page.waitForTimeout(500);

  const skipBtn = await page.$('#sound-prompt-no');
  if (skipBtn) await skipBtn.click();

  await page.waitForTimeout(4000);

  const fullScreenshot = await page.screenshot();
  fs.writeFileSync(path.join(OUT, 'test-full.png'), fullScreenshot);

  const elScreenshot = await page.evaluate(() => {
    const ct = document.getElementById('chapter-text');
    if (!ct) return null;

    const lines = ct.querySelectorAll('.line');
    const results: string[] = [];
    lines.forEach((l, i) => {
      const el = l as HTMLElement;
      const cs = getComputedStyle(el);
      results.push(`LINE[${i}] "${el.className}" "${el.textContent?.slice(0,30)}" op=${cs.opacity} fill=${cs.webkitTextFillColor} bgClip=${cs.backgroundClip} bg=${cs.background?.slice(0,100)} filter=${cs.filter?.slice(0,60)} scale=${cs.transform}`);
      const chars = el.querySelectorAll('.char');
      if (chars.length > 0) {
        const first = chars[0] as HTMLElement;
        const fcs = getComputedStyle(first);
        results.push(`  .char[0] "${first.textContent}" op=${fcs.opacity} fill=${fcs.webkitTextFillColor} color=${fcs.color} bg=${fcs.background?.slice(0,60)}`);
      }
    });

    ct.style.background = '#050505';

    return results.join('\n');
  });
  console.log('DOM state:\n' + elScreenshot);

  await page.waitForTimeout(500);
  const withBgScreenshot = await page.screenshot();
  fs.writeFileSync(path.join(OUT, 'test-with-bg.png'), withBgScreenshot);

  await page.evaluate(() => {
    const canvas = document.getElementById('experience') as HTMLCanvasElement;
    if (canvas) canvas.style.display = 'none';
    const ct = document.getElementById('chapter-text');
    if (ct) ct.style.background = '#050505';
    document.getElementById('grain-overlay')!.style.display = 'none';
    document.getElementById('overlay')!.style.display = 'none';
    document.getElementById('ambient-leaks')!.style.display = 'none';
    document.getElementById('depth-aura')!.style.display = 'none';
    document.getElementById('scan-line')!.style.display = 'none';
    document.getElementById('dust-layer')!.style.display = 'none';
    document.querySelectorAll('.corner-ornament').forEach(e => (e as HTMLElement).style.display = 'none');
  });

  await page.waitForTimeout(500);
  const isolatedScreenshot = await page.screenshot();
  fs.writeFileSync(path.join(OUT, 'test-isolated.png'), isolatedScreenshot);

  await page.evaluate(() => {
    const ct = document.getElementById('chapter-text');
    if (!ct) return;
    const opening = ct.querySelector('.chapter-opening') as HTMLElement;
    if (opening) {
      opening.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
      opening.style.setProperty('background', 'none', 'important');
      opening.style.setProperty('background-clip', 'initial', 'important');
      opening.style.setProperty('-webkit-background-clip', 'initial', 'important');
      opening.style.setProperty('color', '#ffffff', 'important');
    }
  });

  await page.waitForTimeout(500);
  const solidScreenshot = await page.screenshot();
  fs.writeFileSync(path.join(OUT, 'test-solid-white.png'), solidScreenshot);

  console.log('Done!');
  await browser.close();
})();
