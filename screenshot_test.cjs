const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-angle=d3d11', '--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:4203', { waitUntil: 'networkidle0', timeout: 30000 });

  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => {
    const noBtn = document.getElementById('sound-prompt-no');
    if (noBtn) noBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.keyboard.press('Space');
  await new Promise(r => setTimeout(r, 2000));

  // Full journey screenshots
  const positions = [
    [0.05, 'ch1_start'],
    [0.15, 'ch2_warp'],
    [0.25, 'ch3_photon'],
    [0.35, 'ch4_fall'],
    [0.50, 'midpoint'],
    [0.65, 'ch7_deep'],
    [0.77, 'singularity'],
    [0.85, 'void'],
    [0.92, 'pre_explosion'],
  ];

  for (const [s, name] of positions) {
    await page.evaluate((scroll) => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, totalHeight * scroll);
    }, s);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshots/journey_' + name + '.png' });
    console.log('Screenshot ' + name + ' at ' + s);
  }

  await browser.close();
  console.log('Done!');
})().catch(e => console.error(e));
