/**
 * @file test-debug-ch5.cjs
 * @description Deep debug: why SPAGHETTIFICATION doesn't appear
 * @author Cleanlystudio
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const btn = await page.$('#sound-prompt button, .sound-btn, .enter-btn');
  if (btn) await btn.click();
  await page.waitForTimeout(5000);

  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  // Scroll slowly to ch4 zone
  for (const p of [0.1, 0.2, 0.3, 0.4, 0.5]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(totalHeight * p));
    await page.waitForTimeout(1500);
  }

  console.log('=== Approaching SPAGHETTIFICATION zone ===');

  // Now check state at fine-grained positions
  for (const p of [0.52, 0.54, 0.56, 0.58, 0.60, 0.62, 0.64, 0.66, 0.68]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(totalHeight * p));
    await page.waitForTimeout(2000);

    const state = await page.evaluate(() => {
      const eh = window.__eh;
      const ct = document.getElementById('chapter-text');
      if (!eh) return { error: 'No __eh' };
      return {
        requestedPct: null,
        stateScroll: eh.state?.scroll?.toFixed(4),
        nativeScrollY: window.scrollY,
        scrollChapter: eh.getChapterFromScroll?.(eh.state?.scroll),
        timelineActive: eh.timeline?.activeChapter,
        lockUntil: eh.timeline?.lockUntil,
        now: performance.now(),
        lockActive: performance.now() < eh.timeline?.lockUntil,
        chapterText: ct ? ct.innerText.trim().slice(0, 40) : '(empty)',
        chapterBreaks: eh.chapterBreaks?.map(b => b.toFixed(3)),
      };
    });

    state.requestedPct = (p * 100).toFixed(0) + '%';
    console.log(`${state.requestedPct}:`, JSON.stringify(state));
  }

  await browser.close();
})();
