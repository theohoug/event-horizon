const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Inject CLS observer before anything loads
  await page.evaluate(() => {
    window.__cls = 0;
    window.__clsEntries = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__cls += entry.value;
          window.__clsEntries.push({
            value: entry.value.toFixed(4),
            sources: entry.sources?.map(s => ({
              node: s.node?.tagName + '#' + (s.node?.id || '') + '.' + (s.node?.className || '').slice(0, 30),
              prev: `${s.previousRect?.x},${s.previousRect?.y} ${s.previousRect?.width}x${s.previousRect?.height}`,
              curr: `${s.currentRect?.x},${s.currentRect?.y} ${s.currentRect?.width}x${s.currentRect?.height}`,
            })) || [],
          });
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  });

  console.log('Waiting 10s for full load + animations...');
  await page.waitForTimeout(10000);

  const result = await page.evaluate(() => ({
    cls: window.__cls,
    entries: window.__clsEntries,
  }));

  console.log(`\nCLS Score: ${result.cls.toFixed(4)}`);
  console.log(`Rating: ${result.cls < 0.1 ? 'GOOD' : result.cls < 0.25 ? 'NEEDS IMPROVEMENT' : 'POOR'}`);
  console.log(`Shift entries: ${result.entries.length}`);

  if (result.entries.length > 0) {
    console.log('\nShifts:');
    result.entries.forEach((e, i) => {
      console.log(`  #${i + 1}: value=${e.value}`);
      e.sources.forEach(s => console.log(`    ${s.node} | ${s.prev} → ${s.curr}`));
    });
  }

  await browser.close();
})();
