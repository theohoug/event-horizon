import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 14'];
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ ...iPhone });
const page = await context.newPage();

await page.goto('http://localhost:4202', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

await page.screenshot({ path: 'screenshots/mobile-01-loader.png', timeout: 10000 });
console.log('Mobile: loader');

const btn = await page.$('#sound-prompt button');
if (btn) {
  try { await btn.click({ timeout: 3000 }); } catch(e) {}
  await page.waitForTimeout(3000);
}

await page.screenshot({ path: 'screenshots/mobile-02-start.png', timeout: 10000 });
console.log('Mobile: start');

const scrollPoints = [0.15, 0.4, 0.7, 0.9, 0.98];
const names = ['mobile-03-ch1', 'mobile-04-fall', 'mobile-05-singularity', 'mobile-06-remains', 'mobile-07-credits'];

for (let i = 0; i < scrollPoints.length; i++) {
  await page.evaluate((pct) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.floor(max * pct), behavior: 'instant' });
  }, scrollPoints[i]);

  await page.waitForTimeout(2500);
  await page.screenshot({ path: `screenshots/${names[i]}.png`, timeout: 10000 });
  console.log(`Mobile: ${names[i]} at ${scrollPoints[i]}`);
}

await browser.close();
console.log('Done!');
