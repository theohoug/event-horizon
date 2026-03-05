import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto('http://localhost:4202', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

await page.screenshot({ path: 'screenshots/01-loader.png', timeout: 60000 });
console.log('Screenshot 01-loader');

await page.waitForTimeout(4000);

const btn = await page.$('#sound-prompt button');
if (btn) {
  try { await btn.click({ timeout: 5000 }); } catch(e) {}
  await page.waitForTimeout(3000);
}

await page.screenshot({ path: 'screenshots/02-start.png', timeout: 60000 });
console.log('Screenshot 02-start');

const scrollPoints = [0.12, 0.25, 0.4, 0.55, 0.7, 0.83, 0.9, 0.98];
const names = ['03-ch1', '04-ch2', '05-ch3-fall', '06-ch4-spaghetti', '07-ch6-singularity', '08-ch7-void', '09-ch8-remains', '10-credits'];

for (let i = 0; i < scrollPoints.length; i++) {
  await page.evaluate((pct) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.floor(max * pct), behavior: 'instant' });
  }, scrollPoints[i]);

  await page.waitForTimeout(3000);
  await page.screenshot({ path: `screenshots/${names[i]}.png`, timeout: 60000 });
  console.log(`Screenshot ${names[i]} at ${scrollPoints[i]}`);
}

await browser.close();
console.log('Done!');
