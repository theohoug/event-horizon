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
    args: [
      '--use-angle=d3d11',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
      '--no-sandbox',
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
  });

  console.log('Navigating to localhost:4203...');
  await page.goto('http://localhost:4203', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Waiting for loader to disappear...');
  try {
    await page.waitForFunction(() => {
      const loader = document.getElementById('loader');
      if (!loader) return true;
      const style = getComputedStyle(loader);
      return style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden';
    }, { timeout: 30000 });
  } catch {
    console.log('Loader timeout - taking screenshot anyway');
    await page.screenshot({ path: path.join(OUT, 'loader-stuck.png') });
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, '01-after-loader.png') });
  console.log('Saved 01-after-loader.png');

  console.log('Clicking Skip (sound-prompt-no)...');
  try {
    const skipBtn = await page.$('#sound-prompt-no');
    if (skipBtn) {
      await skipBtn.click();
      console.log('Clicked Skip');
    } else {
      console.log('No skip button found');
    }
  } catch (e) {
    console.log('Skip button error:', e);
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '02-after-skip.png') });
  console.log('Saved 02-after-skip.png');

  const domDiag = await page.evaluate(() => {
    const ct = document.getElementById('chapter-text');
    if (!ct) return 'NO #chapter-text found!';
    const ctStyle = getComputedStyle(ct);
    let result = `CONTAINER: opacity=${ctStyle.opacity} display=${ctStyle.display} vis=${ctStyle.visibility} zIndex=${ctStyle.zIndex} pos=${ctStyle.position} transform=${ctStyle.transform} pointerEvents=${ctStyle.pointerEvents} overflow=${ctStyle.overflow} rect=${JSON.stringify(ct.getBoundingClientRect())}\n`;

    const lines = ct.querySelectorAll('.line');
    result += `LINES count: ${lines.length}\n`;
    lines.forEach((l, i) => {
      const el = l as HTMLElement;
      const cs = getComputedStyle(el);
      result += `  LINE[${i}] class="${el.className}" text="${el.textContent?.slice(0,40)}" opacity=${cs.opacity} display=${cs.display} vis=${cs.visibility} color=${cs.color} webkitFill=${cs.webkitTextFillColor} bgClip=${cs.backgroundClip} bg=${cs.background?.slice(0,80)} filter=${cs.filter} w=${cs.width} h=${cs.height} rect=${JSON.stringify(el.getBoundingClientRect())}\n`;
      const chars = el.querySelectorAll('.char');
      if (chars.length > 0) {
        const firstChar = chars[0] as HTMLElement;
        const fcs = getComputedStyle(firstChar);
        result += `    first .char: text="${firstChar.textContent}" opacity=${fcs.opacity} display=${fcs.display} vis=${fcs.visibility} color=${fcs.color}\n`;
      }
    });

    const allFixed = document.querySelectorAll('*');
    const overlappingEls: string[] = [];
    allFixed.forEach(el => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100 &&
          parseFloat(style.opacity) > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') &&
          el.id !== 'experience' && el.tagName !== 'CANVAS') {
        overlappingEls.push(`${el.tagName}#${el.id}.${el.className?.toString().slice(0,30)} z=${style.zIndex} bg=${style.backgroundColor} opacity=${style.opacity} rect={x:${Math.round(rect.x)},y:${Math.round(rect.y)},w:${Math.round(rect.width)},h:${Math.round(rect.height)}}`);
      }
    });
    result += `\nELEMENTS WITH BACKGROUND (potential overlays):\n`;
    overlappingEls.forEach(e => result += `  ${e}\n`);

    return result;
  });

  fs.writeFileSync(path.join(OUT, 'dom-diagnostic.txt'), domDiag);
  console.log('Saved dom-diagnostic.txt');

  const scrollPositions = [0, 0.05, 0.12, 0.25, 0.35, 0.5, 0.65, 0.8, 0.92];
  for (let i = 0; i < scrollPositions.length; i++) {
    const scrollTarget = scrollPositions[i];
    await page.evaluate((s) => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, total * s);
    }, scrollTarget);
    await page.waitForTimeout(2500);

    const fname = `03-scroll-${String(i).padStart(2,'0')}-${Math.round(scrollTarget*100)}pct.png`;
    await page.screenshot({ path: path.join(OUT, fname) });
    console.log(`Saved ${fname}`);

    const chDiag = await page.evaluate(() => {
      const ct = document.getElementById('chapter-text');
      if (!ct) return 'NO container';
      const lines = ct.querySelectorAll('.line');
      let r = `container opacity=${getComputedStyle(ct).opacity} children=${ct.children.length}\n`;
      lines.forEach((l, idx) => {
        const el = l as HTMLElement;
        const cs = getComputedStyle(el);
        r += `  LINE[${idx}] "${el.className}" "${el.textContent?.slice(0,30)}" op=${cs.opacity} h=${cs.height} display=${cs.display} fill=${cs.webkitTextFillColor} color=${cs.color}\n`;
      });
      return r;
    });
    consoleLogs.push(`--- SCROLL ${Math.round(scrollTarget*100)}% ---\n${chDiag}`);
  }

  fs.writeFileSync(path.join(OUT, 'console-logs.txt'), consoleLogs.join('\n'));
  console.log('Saved console-logs.txt');
  console.log('Done!');

  await browser.close();
})();
