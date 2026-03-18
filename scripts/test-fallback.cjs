const { chromium } = require('playwright');

(async () => {
  console.log('=== TEST 1: WebGL disabled — debug ===');
  {
    const browser = await chromium.launch({
      args: ['--disable-gpu', '--disable-webgl', '--disable-webgl2'],
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
    });
    await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => {
      const f = document.getElementById('webgl-fallback');
      const a = document.getElementById('app');
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return {
        fallbackDisplay: f ? getComputedStyle(f).display : 'not found',
        appDisplay: a ? getComputedStyle(a).display : 'not found',
        webglAvailable: !!gl,
      };
    });
    console.log('  State:', JSON.stringify(state));
    console.log('  Page errors:', errors.length, errors.slice(0, 3));
    await page.screenshot({ path: 'scripts/fallback-no-webgl.png' });
    await browser.close();
  }

  console.log('\n=== TEST 2: Context lost ===');
  {
    const browser = await chromium.launch({
      args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage();
    await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(6000);

    await page.evaluate(() => {
      const canvas = document.getElementById('experience');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl && gl.getExtension('WEBGL_lose_context')) {
        gl.getExtension('WEBGL_lose_context').loseContext();
      } else {
        canvas.dispatchEvent(new Event('webglcontextlost'));
      }
    });
    await page.waitForTimeout(2000);

    const fallbackVisible = await page.evaluate(() => {
      const f = document.getElementById('webgl-fallback');
      return f && getComputedStyle(f).display !== 'none';
    });
    console.log('  Fallback after context lost:', fallbackVisible ? 'PASS' : 'FAIL');
    await browser.close();
  }

  console.log('\n=== TEST 3: Normal load ===');
  {
    const browser = await chromium.launch({
      args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage();
    await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(6000);

    const fallbackVisible = await page.evaluate(() => {
      const f = document.getElementById('webgl-fallback');
      return f && getComputedStyle(f).display !== 'none';
    });
    console.log('  Fallback hidden:', !fallbackVisible ? 'PASS' : 'FAIL');
    await browser.close();
  }

  console.log('\nDONE');
})();
