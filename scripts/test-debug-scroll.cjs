/**
 * @file test-debug-scroll.cjs
 * @description Debug: check internal state after scrolling
 * @author Cleanlystudio
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('pageerror', e => console.log('PAGE_ERROR:', e.message.slice(0, 150)));

  console.log('Loading...');
  await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Click sound prompt
  const btn = await page.$('#sound-prompt button, .sound-btn, .enter-btn');
  if (btn) await btn.click();
  await page.waitForTimeout(4000);

  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log('Total scrollable:', totalHeight);

  // Scroll to 60%
  console.log('\n--- Scrolling to 60% ---');
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(totalHeight * 0.6));
  await page.waitForTimeout(3000);

  let state = await page.evaluate(() => {
    const exp = (window as any).__experience;
    if (!exp) return { error: 'No __experience on window' };
    return {
      stateScroll: exp.state?.scroll,
      nativeScrollY: window.scrollY,
      nativeScrollPct: window.scrollY / (document.documentElement.scrollHeight - window.innerHeight),
      lenisScroll: exp.lenis?.scroll,
      lenisLimit: exp.lenis?.limit,
    };
  });
  console.log('State:', JSON.stringify(state, null, 2));

  // Scroll to 85%
  console.log('\n--- Scrolling to 85% ---');
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(totalHeight * 0.85));
  await page.waitForTimeout(3000);

  state = await page.evaluate(() => {
    const exp = (window as any).__experience;
    if (!exp) return { error: 'No __experience on window' };
    return {
      stateScroll: exp.state?.scroll,
      singularityTriggered: exp.singularityTriggered,
      cinematicAutoScrollStarted: exp.cinematicAutoScrollStarted,
      pointOfNoReturnTriggered: exp.pointOfNoReturnTriggered,
      lenisScroll: exp.lenis?.scroll,
      nativeScrollY: window.scrollY,
    };
  });
  console.log('State at 85%:', JSON.stringify(state, null, 2));

  // Scroll to 93%
  console.log('\n--- Scrolling to 93% ---');
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(totalHeight * 0.93));
  await page.waitForTimeout(3000);

  state = await page.evaluate(() => {
    const exp = (window as any).__experience;
    if (!exp) return { error: 'No __experience on window' };
    return {
      stateScroll: exp.state?.scroll,
      singularityTriggered: exp.singularityTriggered,
      cinematicAutoScrollStarted: exp.cinematicAutoScrollStarted,
      lenisScroll: exp.lenis?.scroll,
      nativeScrollY: window.scrollY,
      chapterMid7: exp.getChapterMid?.(7),
    };
  });
  console.log('State at 93%:', JSON.stringify(state, null, 2));

  // Wait 5s and check again
  await page.waitForTimeout(5000);
  state = await page.evaluate(() => {
    const exp = (window as any).__experience;
    if (!exp) return { error: 'No __experience on window' };
    return {
      stateScroll: exp.state?.scroll,
      singularityTriggered: exp.singularityTriggered,
      cinematicAutoScrollStarted: exp.cinematicAutoScrollStarted,
      lenisScroll: exp.lenis?.scroll,
      nativeScrollY: window.scrollY,
    };
  });
  console.log('After 5s wait:', JSON.stringify(state, null, 2));

  await browser.close();
  console.log('Done');
})();
