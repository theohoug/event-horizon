/**
 * @file test-404.cjs
 * @description Test 404 page: WebGL renders, stars form "404", button works
 * @author Cleanlystudio
 */
const { chromium } = require('playwright');

(async () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  EVENT HORIZON — 404 Page Test               ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('pageerror', e => errors.push('PAGE_ERROR: ' + e.message.slice(0, 200)));

  console.log('[1/4] Loading 404 page...');
  await page.goto('http://localhost:4203/404.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('[2/4] Checking DOM elements...');
  const state = await page.evaluate(() => {
    const canvas = document.getElementById('bg');
    const title = document.querySelector('.title');
    const subtitle = document.querySelector('.subtitle');
    const btn = document.querySelector('.return-link');
    const telemetry = document.querySelector('.telemetry');
    return {
      canvasExists: !!canvas,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'N/A',
      titleText: title ? title.textContent.trim() : 'NOT FOUND',
      subtitleText: subtitle ? subtitle.textContent.trim().slice(0, 60) : 'NOT FOUND',
      buttonText: btn ? btn.textContent.trim() : 'NOT FOUND',
      buttonHref: btn ? btn.href : 'N/A',
      telemetryText: telemetry ? telemetry.textContent.trim().slice(0, 60) : 'NOT FOUND',
      buttonBorderRadius: btn ? getComputedStyle(btn).borderRadius : 'N/A',
    };
  });

  console.log('  Canvas:', state.canvasExists ? 'PASS' : 'FAIL', state.canvasSize);
  console.log('  Title:', state.titleText);
  console.log('  Subtitle:', state.subtitleText);
  console.log('  Button:', state.buttonText, '→', state.buttonHref);
  console.log('  Button radius:', state.buttonBorderRadius);
  console.log('  Telemetry:', state.telemetryText);

  // Wait for star formation animation
  console.log('\n[3/4] Waiting for star formation (6s)...');
  await page.waitForTimeout(6000);

  await page.screenshot({ path: 'scripts/test-404-result.png' });
  console.log('  Screenshot saved: scripts/test-404-result.png');

  // Take mobile screenshot too
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scripts/test-404-mobile.png' });
  console.log('  Mobile screenshot saved: scripts/test-404-mobile.png');

  console.log('\n[4/4] Results...');
  const allOk = state.canvasExists && state.titleText === 'Lost Beyond the Horizon'
    && state.buttonText === 'Return to the Observable Universe'
    && state.buttonBorderRadius === '100px';

  console.log(`  Canvas:  ${state.canvasExists ? '✓' : '✗'}`);
  console.log(`  Content: ${state.titleText === 'Lost Beyond the Horizon' ? '✓' : '✗'}`);
  console.log(`  Button:  ${state.buttonText === 'Return to the Observable Universe' ? '✓' : '✗'}`);
  console.log(`  Rounded: ${state.buttonBorderRadius === '100px' ? '✓' : '✗'} (${state.buttonBorderRadius})`);
  console.log(`  Errors:  ${errors.length === 0 ? '✓ None' : errors.length + ' errors'}`);

  if (errors.length > 0) {
    errors.forEach(e => console.log('    ' + e));
  }

  console.log(`\n${allOk && errors.length === 0 ? '🟢 404 PAGE OK' : '🔴 ISSUES FOUND'}\n`);

  await browser.close();
})();
