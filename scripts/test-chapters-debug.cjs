/**
 * @file test-chapters-debug.cjs
 * @description Debug test: scroll through entire experience and capture all chapter text at 5% increments
 * @author Cleanlystudio
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  page.on('pageerror', e => console.log('PAGE_ERROR:', e.message.slice(0, 200)));

  console.log('=== CHAPTER TEXT DEBUG TEST ===');
  console.log('Loading page...');
  await page.goto('http://localhost:4203', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log('Clicking Skip on sound prompt...');
  const skipBtn = await page.$('#sound-prompt-no');
  if (skipBtn) {
    await skipBtn.click();
    console.log('  Clicked #sound-prompt-no (Skip)');
  } else {
    const anyBtn = await page.$('#sound-prompt button');
    if (anyBtn) {
      await anyBtn.click();
      console.log('  Clicked fallback sound-prompt button');
    } else {
      console.log('  WARNING: No sound prompt button found');
    }
  }

  console.log('Waiting for experience to initialize...');
  await page.waitForTimeout(6000);

  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log(`Total scrollable height: ${totalHeight}px`);
  console.log('');

  const allResults = [];
  const allChapterTitles = new Set();
  const spaghettificationFound = { found: false, positions: [] };
  const singularityFound = { found: false, positions: [] };

  console.log('=== SCROLLING THROUGH EXPERIENCE (0% to 100% in 5% increments) ===');
  console.log('');

  for (let pct = 0; pct <= 100; pct += 5) {
    const scrollY = Math.round(totalHeight * (pct / 100));

    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(2500);

    const data = await page.evaluate(() => {
      const container = document.getElementById('chapter-text');
      if (!container) return { text: '', visible: false, opacity: '0', lineCount: 0, titleText: '', subtitleText: '' };

      const computedStyle = window.getComputedStyle(container);
      const opacity = parseFloat(computedStyle.opacity || '0');
      const visible = opacity > 0 && container.innerHTML.trim().length > 0;

      const lines = container.querySelectorAll('.line');
      let titleText = '';
      let subtitleText = '';
      lines.forEach((line, i) => {
        const chars = line.querySelectorAll('.char');
        let lineText = '';
        chars.forEach(c => { lineText += c.textContent || ''; });
        lineText = lineText.replace(/\u00A0/g, ' ').trim();
        if (i === 0 && line.classList.contains('chapter-poetry')) {
          return;
        }
        if (line.classList.contains('chapter-num-filigrane')) {
          return;
        }
        if (!line.classList.contains('data') && !titleText) {
          titleText = lineText;
        } else if (line.classList.contains('data')) {
          subtitleText = lineText;
        } else if (!titleText) {
          titleText = lineText;
        }
      });

      const fullText = container.innerText || container.textContent || '';

      return {
        text: fullText.replace(/\s+/g, ' ').trim(),
        visible,
        opacity: computedStyle.opacity,
        lineCount: lines.length,
        titleText,
        subtitleText,
        innerHTML: container.innerHTML.slice(0, 300),
      };
    });

    const chapterNumEl = await page.evaluate(() => {
      const el = document.querySelector('.chapter-num-filigrane');
      return el ? (el.textContent || '').trim() : '';
    });

    const navIndicator = await page.evaluate(() => {
      const numEl = document.getElementById('chapter-indicator-num');
      const titleEl = document.getElementById('chapter-indicator-title');
      return {
        num: numEl ? (numEl.textContent || '').trim() : '',
        title: titleEl ? (titleEl.textContent || '').trim() : '',
      };
    });

    const progressPct = await page.evaluate(() => {
      const fill = document.getElementById('progress-fill');
      if (!fill) return '';
      return fill.style.width || window.getComputedStyle(fill).width;
    });

    const result = {
      scrollPct: pct,
      scrollY,
      chapterText: data.titleText,
      subtitle: data.subtitleText,
      fullText: data.text,
      visible: data.visible,
      opacity: data.opacity,
      lineCount: data.lineCount,
      chapterNum: chapterNumEl,
      navNum: navIndicator.num,
      navTitle: navIndicator.title,
    };

    allResults.push(result);

    if (data.titleText) {
      allChapterTitles.add(data.titleText);
    }

    const titleUpper = (data.titleText || '').toUpperCase();
    const fullTextUpper = (data.text || '').toUpperCase();

    if (titleUpper.includes('SPAGHETTIFICATION') || fullTextUpper.includes('SPAGHETTIFICATION')) {
      spaghettificationFound.found = true;
      spaghettificationFound.positions.push(pct);
    }

    if (titleUpper.includes('SINGULARITY') || fullTextUpper.includes('SINGULARITY')) {
      singularityFound.found = true;
      singularityFound.positions.push(pct);
    }

    const visIcon = data.visible ? 'VISIBLE' : 'hidden';
    console.log(`[${String(pct).padStart(3)}%] Title: "${data.titleText || '(empty)'}" | ${visIcon} (opacity=${data.opacity}) | Nav: ${navIndicator.title || '-'}`);
    if (data.subtitleText) {
      console.log(`       Subtitle: "${data.subtitleText.slice(0, 80)}"`);
    }
  }

  console.log('');
  console.log('=== SUMMARY ===');
  console.log('');
  console.log('ALL UNIQUE CHAPTER TITLES DETECTED:');
  const titlesArray = Array.from(allChapterTitles);
  titlesArray.forEach((t, i) => {
    const positions = allResults.filter(r => r.chapterText === t).map(r => r.scrollPct + '%');
    console.log(`  ${i + 1}. "${t}" — seen at: ${positions.join(', ')}`);
  });
  console.log('');

  console.log(`SPAGHETTIFICATION: ${spaghettificationFound.found ? 'YES, found at ' + spaghettificationFound.positions.map(p => p + '%').join(', ') : 'NOT FOUND'}`);
  console.log(`SINGULARITY: ${singularityFound.found ? 'YES, found at ' + singularityFound.positions.map(p => p + '%').join(', ') : 'NOT FOUND'}`);
  console.log('');

  console.log('FULL DATA TABLE:');
  console.log('-'.repeat(120));
  console.log(`${'Scroll%'.padEnd(10)} | ${'Title'.padEnd(30)} | ${'Visible'.padEnd(8)} | ${'Opacity'.padEnd(8)} | ${'Nav Title'.padEnd(25)} | ChNum`);
  console.log('-'.repeat(120));
  allResults.forEach(r => {
    console.log(`${String(r.scrollPct + '%').padEnd(10)} | ${(r.chapterText || '(empty)').padEnd(30)} | ${String(r.visible).padEnd(8)} | ${String(r.opacity).padEnd(8)} | ${(r.navTitle || '-').padEnd(25)} | ${r.chapterNum}`);
  });
  console.log('-'.repeat(120));

  await browser.close();
  console.log('\nDone.');
})();
