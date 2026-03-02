const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=angle', '--window-size=1920,1080']
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const prefix = process.argv[2] || 'loop';

  await page.goto('http://localhost:4200', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(8000);

  const noBtn = page.locator('#sound-prompt-no');
  try {
    await noBtn.waitFor({ state: 'visible', timeout: 10000 });
    await noBtn.click();
  } catch (e) {
    const yesBtn = page.locator('#sound-prompt-yes');
    if (await yesBtn.isVisible()) await yesBtn.click();
  }
  await page.waitForTimeout(6000);

  const fs = require('fs');
  const dir = 'C:/Users/theoo/OneDrive/Bureau/SOTY/screens';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await page.screenshot({ path: `${dir}/${prefix}_00.png` });

  const positions = [12, 25, 38, 50, 62, 75, 88, 100];

  let lastPct = 0;
  for (const pct of positions) {
    const steps = 8;
    for (let s = 1; s <= steps; s++) {
      const intermediatePct = lastPct + (pct - lastPct) * (s / steps);
      await page.evaluate((p) => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: maxScroll * p / 100, behavior: 'instant' });
      }, intermediatePct);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/${prefix}_${pct}.png` });
    lastPct = pct;
  }

  await browser.close();
  console.log('Screenshots done');
})();
