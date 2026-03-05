import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto('http://localhost:4202', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

await page.screenshot({ path: 'screenshots/audit-00-loader.png', timeout: 60000 });

await page.waitForTimeout(4000);

const btn = await page.$('#sound-prompt button');
if (btn) {
  try { await btn.click({ timeout: 5000 }); } catch(e) {}
  await page.waitForTimeout(3000);
}

await page.screenshot({ path: 'screenshots/audit-01-start.png', timeout: 60000 });

const scrollPoints = [];
for (let i = 0; i <= 100; i += 3) {
  scrollPoints.push(i / 100);
}

for (let i = 0; i < scrollPoints.length; i++) {
  const pct = scrollPoints[i];
  const name = `audit-${String(i + 2).padStart(2, '0')}-scroll-${Math.round(pct * 100)}`;

  await page.evaluate((p) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.floor(max * p), behavior: 'instant' });
  }, pct);

  await page.waitForTimeout(1500);
  await page.screenshot({ path: `screenshots/${name}.png`, timeout: 60000 });
  console.log(`${name} (${Math.round(pct * 100)}%)`);
}

await browser.close();
console.log('Audit screenshots done!');
