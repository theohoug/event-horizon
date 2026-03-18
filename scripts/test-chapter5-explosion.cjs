/**
 * @file test-chapter5-explosion.cjs
 * @description Playwright test: verify SPAGHETTIFICATION title appears + explosion auto-completes
 * @author Cleanlystudio
 */
const { chromium } = require('playwright');

const URL = 'http://localhost:4203';
const TIMEOUT = 120000;

(async () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  EVENT HORIZON — Chapter & Explosion Test    ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  const chapterTexts = [];
  page.on('pageerror', e => errors.push('PAGE_ERROR: ' + e.message.slice(0, 200)));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE_ERROR: ' + msg.text().slice(0, 200));
    const text = msg.text();
    if (text.includes('CHAPTER')) chapterTexts.push(text.slice(0, 120));
  });

  // 1. Load site
  console.log('[1/6] Loading site...');
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // 2. Click through splash/sound prompt
  console.log('[2/6] Bypassing splash...');
  const soundBtn = await page.$('#sound-prompt button, #sound-prompt .sound-btn, .sound-prompt button, [data-sound-yes], .enter-btn');
  if (soundBtn) {
    await soundBtn.click();
    console.log('  → Clicked sound prompt button');
  } else {
    // Try clicking the splash overlay
    const splash = await page.$('#splash, .splash, #loader, .loader');
    if (splash) {
      await splash.click();
      console.log('  → Clicked splash overlay');
    } else {
      console.log('  → No splash/sound prompt found, proceeding');
    }
  }
  await page.waitForTimeout(4000);

  // 3. Scroll progressively to chapter 5 (SPAGHETTIFICATION)
  console.log('[3/6] Scrolling to chapter 5 (SPAGHETTIFICATION)...');

  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log('  → Total scrollable height:', totalHeight, 'px');

  // Scroll gradually through chapters 0-5, pausing at each to let ScrollTrigger fire
  const chapterScrollTargets = [0.08, 0.18, 0.28, 0.38, 0.48, 0.58];
  for (let i = 0; i < chapterScrollTargets.length; i++) {
    const target = Math.round(totalHeight * chapterScrollTargets[i]);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), target);
    await page.waitForTimeout(2500);

    const chapterInfo = await page.evaluate(() => {
      const ct = document.getElementById('chapter-text');
      return {
        text: ct ? ct.innerText.trim() : '',
        html: ct ? ct.innerHTML.slice(0, 200) : '',
        scrollY: window.scrollY,
        scrollPct: (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100).toFixed(1),
      };
    });
    console.log(`  → Scroll ${chapterScrollTargets[i] * 100}% (${chapterInfo.scrollPct}% actual) — chapter text: "${chapterInfo.text.slice(0, 60)}"`);
  }

  // 4. Check if SPAGHETTIFICATION appeared
  console.log('\n[4/6] Checking SPAGHETTIFICATION title...');

  // Take screenshot at chapter 5 position
  await page.screenshot({ path: 'scripts/test-ch5-spagh.png' });

  // Try a wider range of scroll positions around chapter 5
  let spaghFound = false;
  const checkPositions = [0.52, 0.55, 0.58, 0.61, 0.64];
  for (const pos of checkPositions) {
    const target = Math.round(totalHeight * pos);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), target);
    await page.waitForTimeout(2000);

    const text = await page.evaluate(() => {
      const ct = document.getElementById('chapter-text');
      return ct ? ct.innerText.trim().toUpperCase() : '';
    });

    if (text.includes('SPAGHETTIFICATION')) {
      spaghFound = true;
      console.log(`  ✓ SPAGHETTIFICATION found at scroll ${(pos * 100).toFixed(0)}%!`);
      console.log(`  → Full text: "${text.slice(0, 100)}"`);
      break;
    } else {
      console.log(`  → ${(pos * 100).toFixed(0)}%: "${text.slice(0, 60)}" ${text ? '' : '(empty)'}`);
    }
  }

  if (!spaghFound) {
    console.log('  ✗ SPAGHETTIFICATION NOT FOUND — trying forced refresh...');
    // Try refreshCurrentChapter via the experience
    await page.evaluate(() => {
      const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      // Trigger a manual scroll event to force ScrollTrigger update
      window.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(3000);

    const retryText = await page.evaluate(() => {
      const ct = document.getElementById('chapter-text');
      return ct ? ct.innerText.trim().toUpperCase() : '';
    });
    if (retryText.includes('SPAGHETTIFICATION')) {
      spaghFound = true;
      console.log('  ✓ SPAGHETTIFICATION found after scroll event!');
    } else {
      console.log('  ✗ STILL NOT FOUND after retry. Text: "' + retryText.slice(0, 80) + '"');
    }
  }

  await page.screenshot({ path: 'scripts/test-ch5-result.png' });

  // 5. Test explosion auto-completion
  console.log('\n[5/6] Testing explosion auto-completion...');
  console.log('  → Scrolling to singularity zone (chapter 7-8, ~85%+)...');

  // Scroll gradually to the singularity
  const endPositions = [0.68, 0.75, 0.82, 0.88, 0.92];
  for (const pos of endPositions) {
    const target = Math.round(totalHeight * pos);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), target);
    await page.waitForTimeout(1500);
    console.log(`  → Scrolled to ${(pos * 100).toFixed(0)}%`);
  }

  // Capture scroll position BEFORE entering cinematic zone
  const startScrollY = await page.evaluate(() => window.scrollY);

  // Now stop scrolling and wait — the cinematic auto-scroll should take over
  console.log('  → Stopped manual scroll. Waiting for cinematic auto-scroll + explosion...');
  console.log(`  → startScrollY: ${startScrollY}`);

  let explosionCompleted = false;
  let autoScrollWorking = false;

  // Wait up to 30 seconds for auto-scroll + explosion
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);

    const state = await page.evaluate(() => {
      const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = window.scrollY >= maxScroll - 10;
      return {
        scrollY: window.scrollY,
        scrollPct: (scrollPct * 100).toFixed(1),
        atBottom,
        maxScroll,
      };
    });

    const currentScrollY = state.scrollY;
    if (currentScrollY > startScrollY + 100) {
      autoScrollWorking = true;
    }

    console.log(`  → t+${(i + 1) * 2}s: scroll=${state.scrollPct}% (${state.scrollY}/${state.maxScroll}) atBottom=${state.atBottom}`);

    if (state.atBottom) {
      console.log('  ✓ Auto-scroll reached bottom!');
      autoScrollWorking = true;
      // Wait a bit more for explosion to complete
      await page.waitForTimeout(5000);
      explosionCompleted = true;
      break;
    }
  }

  await page.screenshot({ path: 'scripts/test-explosion-result.png' });

  // Check if explosion state exists
  const explosionState = await page.evaluate(() => {
    // Check if credits are showing (indication explosion completed)
    const credits = document.getElementById('credits');
    const creditsVisible = credits ? getComputedStyle(credits).opacity : 'not found';
    const ct = document.getElementById('chapter-text');
    const chapterText = ct ? ct.innerText.trim() : '';
    return {
      creditsVisible,
      chapterText: chapterText.slice(0, 80),
    };
  });

  console.log(`  → Credits opacity: ${explosionState.creditsVisible}`);
  console.log(`  → Chapter text: "${explosionState.chapterText}"`);

  // 6. Summary
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║               TEST RESULTS                   ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  SPAGHETTIFICATION title: ${spaghFound ? '✓ PASS' : '✗ FAIL'}              ║`);
  console.log(`║  Cinematic auto-scroll:   ${autoScrollWorking ? '✓ PASS' : '✗ FAIL'}              ║`);
  console.log(`║  Explosion completed:     ${explosionCompleted ? '✓ PASS' : '✗ FAIL'}              ║`);
  console.log(`║  Errors: ${errors.length === 0 ? 'None ✓' : errors.length + ' errors ✗'}                            ║`);
  console.log('╚══════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 5).forEach(e => console.log('  ' + e));
  }

  console.log('\nScreenshots saved:');
  console.log('  scripts/test-ch5-spagh.png');
  console.log('  scripts/test-ch5-result.png');
  console.log('  scripts/test-explosion-result.png');

  const allPassed = spaghFound && autoScrollWorking && explosionCompleted;
  console.log(`\n${allPassed ? '🟢 ALL TESTS PASSED' : '🔴 SOME TESTS FAILED'}\n`);

  await browser.close();
  process.exit(allPassed ? 0 : 1);
})();
