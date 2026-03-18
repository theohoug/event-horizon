const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('pageerror', e => errors.push('PAGE_ERROR: ' + e.message.slice(0, 150)));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE_ERROR: ' + msg.text().slice(0, 150));
  });

  console.log('Loading site...');
  await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(8000);

  const state = await page.evaluate(() => {
    const fallback = document.getElementById('webgl-fallback');
    const app = document.getElementById('app');
    const canvas = document.getElementById('experience');
    const loader = document.getElementById('loader');
    const soundPrompt = document.getElementById('sound-prompt');
    return {
      fallbackHidden: fallback ? getComputedStyle(fallback).display === 'none' : 'not found',
      appVisible: app ? getComputedStyle(app).display !== 'none' : 'not found',
      canvasExists: !!canvas,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'N/A',
      loaderDisplay: loader ? getComputedStyle(loader).display : 'not found',
      soundPromptDisplay: soundPrompt ? getComputedStyle(soundPrompt).display : 'not found',
    };
  });

  console.log('\n=== RUNTIME STATE ===');
  console.log('  Fallback hidden:', state.fallbackHidden === true ? 'PASS' : 'FAIL (' + state.fallbackHidden + ')');
  console.log('  App visible:', state.appVisible === true ? 'PASS' : 'FAIL (' + state.appVisible + ')');
  console.log('  Canvas exists:', state.canvasExists ? 'PASS' : 'FAIL');
  console.log('  Canvas size:', state.canvasSize);
  console.log('  Loader:', state.loaderDisplay);
  console.log('  Sound prompt:', state.soundPromptDisplay);

  console.log('\n=== ERRORS ===');
  if (errors.length === 0) {
    console.log('  None — PASS');
  } else {
    errors.forEach(e => console.log('  ' + e));
  }

  await page.screenshot({ path: 'scripts/test-runtime.png' });
  console.log('\n  Screenshot: scripts/test-runtime.png');

  // Test scroll works
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.3));
  await page.waitForTimeout(2000);
  const scrollPos = await page.evaluate(() => window.scrollY);
  console.log('\n=== SCROLL ===');
  console.log('  Scrolled to:', scrollPos, scrollPos > 0 ? 'PASS' : 'FAIL');

  await page.screenshot({ path: 'scripts/test-runtime-scrolled.png' });
  console.log('  Screenshot: scripts/test-runtime-scrolled.png');

  await browser.close();
  console.log('\n=== DONE ===');
})();
