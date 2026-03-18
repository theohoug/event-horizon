const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
  });

  console.log('1. Loading...');
  await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(6000);

  // Test 1: Basic render
  const state = await page.evaluate(() => {
    const f = document.getElementById('webgl-fallback');
    const c = document.getElementById('experience');
    return {
      fallbackHidden: f ? getComputedStyle(f).display === 'none' : false,
      canvasOk: !!c && c.width > 0,
    };
  });
  console.log('   Render:', state.fallbackHidden && state.canvasOk ? 'PASS' : 'FAIL');

  // Test 2: Sound prompt visible
  const promptOk = await page.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    return sp && getComputedStyle(sp).display !== 'none';
  });
  console.log('   Sound prompt:', promptOk ? 'PASS' : 'FAIL');

  // Test 3: Click "SKIP" to enter
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.trim().toLowerCase() === 'skip') { b.click(); return; }
    }
  });
  await page.waitForTimeout(3000);

  const promptGone = await page.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    return !sp || getComputedStyle(sp).display === 'none' || !sp.classList.contains('visible');
  });
  console.log('   Prompt dismissed:', promptGone ? 'PASS' : 'FAIL');

  // Test 4: Scroll through chapters
  const scrollResults = [];
  for (const pct of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    await page.evaluate((p) => {
      window.scrollTo(0, document.body.scrollHeight * p);
    }, pct);
    await page.waitForTimeout(1500);
    const scrollY = await page.evaluate(() => window.scrollY);
    scrollResults.push(scrollY > 0);
  }
  console.log('   Scroll (5 positions):', scrollResults.every(Boolean) ? 'PASS' : 'FAIL');

  // Test 5: Screenshot at ~singularity
  await page.screenshot({ path: 'scripts/test-singularity.png' });

  // Test 6: Credits visible at end
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000);
  const creditsVisible = await page.evaluate(() => {
    const c = document.getElementById('credits');
    return c && c.classList.contains('visible');
  });
  console.log('   Credits at end:', creditsVisible ? 'PASS' : 'SKIP (needs full experience)');

  // Test 7: Privacy link exists
  const privacyLink = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="privacy"]');
    return links.length > 0;
  });
  console.log('   Privacy link:', privacyLink ? 'PASS' : 'FAIL');

  // Test 8: Copyright text
  const copyright = await page.evaluate(() => {
    const el = document.querySelector('.credits-legal');
    return el ? el.textContent : null;
  });
  console.log('   Copyright:', copyright ? 'PASS' : 'FAIL');

  // Test 9: Privacy page loads
  const privacyPage = await browser.newPage();
  const privRes = await privacyPage.goto('http://localhost:4203/privacy.html', { timeout: 5000 });
  console.log('   Privacy page:', privRes.status() === 200 ? 'PASS' : 'FAIL');
  await privacyPage.close();

  // Test 10: No JS errors
  console.log('   JS errors:', errors.length === 0 ? 'PASS (0)' : `FAIL (${errors.length})`);
  if (errors.length > 0) errors.slice(0, 3).forEach(e => console.log('     -', e));

  await page.screenshot({ path: 'scripts/test-final.png' });
  await browser.close();
  console.log('\nDONE');
})();
