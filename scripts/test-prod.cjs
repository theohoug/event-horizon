/**
 * @file test-prod.cjs
 * @description Test PRODUCTION site: verify SPAGHETTIFICATION + explosion work on fade.run
 * @author Cleanlystudio
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'https://fade.run';

(async () => {
  console.log(`\n=== Testing ${URL} ===\n`);

  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  const consoleLogs = [];
  page.on('pageerror', e => errors.push('PAGE_ERROR: ' + e.message.slice(0, 200)));
  page.on('console', msg => {
    consoleLogs.push(msg.text().slice(0, 120));
  });

  console.log('[1] Loading...');
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Check if console easter egg is present (proves latest code)
  const hasEasterEgg = consoleLogs.some(l => l.includes('Cleanlystudio') || l.includes('cleanlystudio'));
  console.log('[2] Console easter egg (Cleanlystudio):', hasEasterEgg ? 'FOUND ✓' : 'NOT FOUND ✗');
  console.log('    First 5 console logs:');
  consoleLogs.slice(0, 5).forEach(l => console.log('      ', l.slice(0, 80)));

  // Click sound prompt
  const btn = await page.$('#sound-prompt button, .sound-btn, .enter-btn');
  if (btn) {
    await btn.click();
    console.log('[3] Clicked sound prompt');
  } else {
    console.log('[3] No sound prompt found');
  }
  await page.waitForTimeout(5000);

  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log('[4] Total scrollable height:', totalHeight);

  // Scroll gradually to chapter 5
  console.log('[5] Scrolling to SPAGHETTIFICATION zone...');
  for (const pos of [0.1, 0.2, 0.3, 0.4, 0.5]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(totalHeight * pos));
    await page.waitForTimeout(2000);
  }

  // Check for SPAGHETTIFICATION at various positions
  let spaghFound = false;
  for (const pos of [0.50, 0.52, 0.54, 0.56, 0.58, 0.60, 0.62, 0.64, 0.66, 0.68, 0.70]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(totalHeight * pos));
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => {
      const ct = document.getElementById('chapter-text');
      return ct ? ct.innerText.trim().toUpperCase() : '';
    });
    if (text.includes('SPAGHETTIFICATION')) {
      spaghFound = true;
      console.log(`    SPAGHETTIFICATION found at ${(pos*100).toFixed(0)}% ✓`);
      break;
    } else {
      console.log(`    ${(pos*100).toFixed(0)}%: "${text.slice(0, 50)}" ${text ? '' : '(empty)'}`);
    }
  }

  await page.screenshot({ path: 'scripts/test-prod-ch5.png' });

  // Scroll to singularity zone
  console.log('[6] Scrolling to singularity...');
  for (const pos of [0.7, 0.78, 0.84, 0.88, 0.92]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(totalHeight * pos));
    await page.waitForTimeout(1500);
  }

  // Wait for auto-scroll
  console.log('[7] Waiting for cinematic auto-scroll...');
  const startY = await page.evaluate(() => window.scrollY);
  let autoScrolled = false;
  let reachedBottom = false;

  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(2000);
    const scrollY = await page.evaluate(() => window.scrollY);
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const pct = (scrollY / maxScroll * 100).toFixed(1);

    if (scrollY > startY + 50) autoScrolled = true;
    if (scrollY >= maxScroll - 10) {
      reachedBottom = true;
      console.log(`    t+${(i+1)*2}s: ${pct}% — REACHED BOTTOM ✓`);
      break;
    }
    if (i % 3 === 0) console.log(`    t+${(i+1)*2}s: ${pct}% scrollY=${scrollY}`);
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scripts/test-prod-explosion.png' });

  console.log('\n╔═══════════════════════════════════╗');
  console.log('║       PRODUCTION RESULTS          ║');
  console.log('╠═══════════════════════════════════╣');
  console.log(`║  Easter egg:        ${hasEasterEgg ? '✓ PASS' : '✗ FAIL'}         ║`);
  console.log(`║  SPAGHETTIFICATION: ${spaghFound ? '✓ PASS' : '✗ FAIL'}         ║`);
  console.log(`║  Auto-scroll:       ${autoScrolled ? '✓ PASS' : '✗ FAIL'}         ║`);
  console.log(`║  Reached bottom:    ${reachedBottom ? '✓ PASS' : '✗ FAIL'}         ║`);
  console.log(`║  Errors: ${errors.length === 0 ? 'None ✓' : errors.length + ' ✗'}                    ║`);
  console.log('╚═══════════════════════════════════╝');

  if (errors.length > 0) {
    errors.slice(0, 3).forEach(e => console.log('  ' + e));
  }

  await browser.close();
  process.exit((hasEasterEgg && spaghFound && reachedBottom) ? 0 : 1);
})();
