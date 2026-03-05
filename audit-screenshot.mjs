/**
 * @file audit-screenshot.mjs
 * @description Automated scroll-through screenshot capture for SOTY audit
 * @author Cleanlystudio
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = 'http://localhost:4200';
const OUT = './logs/screenshots';

mkdirSync(OUT, { recursive: true });

const scrollPositions = [
  { name: '00-loader', scroll: 0, wait: 1000, skipDismiss: true },
  { name: '01-intro', scroll: 0, wait: 6000, dismissSound: true },
  { name: '02-chapter0-start', scroll: 0.02, wait: 2000 },
  { name: '03-chapter0-mid', scroll: 0.06, wait: 1500 },
  { name: '04-chapter1-pull', scroll: 0.12, wait: 1500 },
  { name: '05-chapter1-deep', scroll: 0.18, wait: 1500 },
  { name: '06-chapter2-warp', scroll: 0.24, wait: 1500 },
  { name: '07-chapter3-fall', scroll: 0.35, wait: 1500 },
  { name: '08-chapter4-spaghetti', scroll: 0.45, wait: 1500 },
  { name: '09-chapter5-timedil', scroll: 0.55, wait: 1500 },
  { name: '10-chapter6-singularity', scroll: 0.65, wait: 1500 },
  { name: '11-deep-singularity', scroll: 0.77, wait: 1500 },
  { name: '12-chapter7-void', scroll: 0.85, wait: 1500 },
  { name: '13-chapter8-remains', scroll: 0.92, wait: 1500 },
  { name: '14-credits', scroll: 0.98, wait: 2000 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${OUT}/00-loader.png` });

  await page.waitForTimeout(3500);

  try {
    await page.click('#sound-prompt-no', { timeout: 3000 });
  } catch {}

  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/01-after-intro.png` });

  for (const pos of scrollPositions.slice(2)) {
    await page.evaluate((scrollPct) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: maxScroll * scrollPct, behavior: 'instant' });
    }, pos.scroll);

    await page.waitForTimeout(pos.wait);
    await page.screenshot({ path: `${OUT}/${pos.name}.png` });
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT}`);
}

run().catch(console.error);
