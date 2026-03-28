/**
 * @file test-gpu-tiers.cjs
 * @description Test GPU profiler across simulated hardware tiers
 * @author Cleanlystudio
 */

const { chromium } = require('playwright');

const SITE_URL = 'https://fade.run';

async function testTier(name, launchOpts, qualityOverride) {
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  let gpuProfile = null;
  const consoleLogs = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('GPU Profile')) {
      gpuProfile = text;
    }
  });

  const url = qualityOverride ? `${SITE_URL}?quality=${qualityOverride}` : SITE_URL;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);

    const screenshot = `gpu-test-${name}.png`;
    await page.screenshot({ path: screenshot, fullPage: false });

    const fps = await page.evaluate(() => {
      const el = document.querySelector('#fps-counter');
      return el ? el.textContent : 'no fps counter';
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  TEST: ${name}`);
    console.log(`${'='.repeat(60)}`);
    if (gpuProfile) {
      console.log(`  GPU Profile: ${gpuProfile}`);
    } else {
      console.log(`  GPU Profile: NOT FOUND in console`);
      const relevant = consoleLogs.filter(l => l.includes('score') || l.includes('quality') || l.includes('GPU') || l.includes('bench'));
      if (relevant.length > 0) {
        console.log(`  Relevant logs:`);
        relevant.forEach(l => console.log(`    ${l}`));
      }
    }
    console.log(`  FPS: ${fps}`);
    console.log(`  Screenshot: ${screenshot}`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (err) {
    console.log(`\n  TEST ${name}: ERROR - ${err.message}\n`);
  }

  await browser.close();
}

(async () => {
  console.log('\n🔬 GPU Tier Testing — fade.run\n');

  await testTier('SWIFTSHADER (potato sim)', {
    headless: true,
    args: [
      '--use-gl=swiftshader',
      '--disable-gpu-sandbox',
      '--no-sandbox',
    ],
  });

  await testTier('ANGLE-D3D11 (Intel iGPU sim)', {
    headless: true,
    args: [
      '--use-angle=d3d11',
      '--no-sandbox',
    ],
  });

  await testTier('DEFAULT GPU (your actual GPU)', {
    headless: true,
    args: [
      '--use-angle=d3d11',
      '--no-sandbox',
      '--enable-gpu',
    ],
  });

  await testTier('FORCE-MEDIUM (URL override)', {
    headless: true,
    args: ['--use-angle=d3d11', '--no-sandbox'],
  }, 'medium');

  await testTier('FORCE-LOW (URL override)', {
    headless: true,
    args: ['--use-angle=d3d11', '--no-sandbox'],
  }, 'low');

  console.log('✅ All tier tests complete\n');
})();
