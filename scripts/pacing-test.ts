import { chromium } from 'playwright';

const URL = 'http://localhost:4203';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const loader = document.getElementById('loader');
    if (loader) { loader.classList.add('hidden'); loader.style.display = 'none'; }
    const soundPrompt = document.getElementById('sound-prompt');
    if (soundPrompt) { soundPrompt.classList.remove('visible'); soundPrompt.style.display = 'none'; }
    const intro = document.getElementById('intro-cinematic');
    if (intro) { intro.style.display = 'none'; intro.classList.remove('active'); }
    const dataHud = document.getElementById('data-hud');
    if (dataHud) dataHud.classList.add('visible');
  });

  await page.waitForTimeout(500);

  const chapterBoundaries = await page.evaluate(() => {
    const chapters = document.querySelectorAll('.chapter');
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const results: { chapter: number; topPx: number; heightPx: number; scrollPct: number; endPct: number }[] = [];

    chapters.forEach((ch, i) => {
      const rect = ch.getBoundingClientRect();
      const topPx = (ch as HTMLElement).offsetTop;
      const heightPx = (ch as HTMLElement).offsetHeight;
      const scrollPct = maxScroll > 0 ? topPx / maxScroll : 0;
      const endPct = maxScroll > 0 ? (topPx + heightPx) / maxScroll : 0;
      results.push({ chapter: i, topPx, heightPx, scrollPct: Math.round(scrollPct * 1000) / 1000, endPct: Math.round(endPct * 1000) / 1000 });
    });

    return { maxScroll, viewportHeight: window.innerHeight, totalHeight: document.documentElement.scrollHeight, chapters: results };
  });

  console.log('\n========== PAGE GEOMETRY ==========');
  console.log(`Total height: ${chapterBoundaries.totalHeight}px`);
  console.log(`Viewport: ${chapterBoundaries.viewportHeight}px`);
  console.log(`Max scroll: ${chapterBoundaries.maxScroll}px`);
  console.log('\n--- Chapter Heights ---');
  chapterBoundaries.chapters.forEach(ch => {
    const heightVh = Math.round(ch.heightPx / chapterBoundaries.viewportHeight * 100);
    console.log(`  Ch${ch.chapter}: ${ch.heightPx}px (${heightVh}vh) | scroll ${(ch.scrollPct * 100).toFixed(1)}% → ${(ch.endPct * 100).toFixed(1)}%`);
  });

  console.log('\n========== SIMULATING REALISTIC SCROLL ==========');
  console.log('(User scrolls 120px per wheel tick, ~4 ticks/sec)\n');

  const SCROLL_PER_TICK = 120;
  const TICKS_PER_SEC = 4;
  const TICK_INTERVAL = 1000 / TICKS_PER_SEC;

  let currentChapter = 0;
  const chapterTimings: { chapter: number; name: string; enterTime: number; duration?: number }[] = [];
  const chapterNames = ['You', 'The Pull', 'The Warp', 'Photon Sphere', 'The Fall', 'Spaghettification', 'Time Dilation', 'Singularity', 'What Remains'];

  chapterTimings.push({ chapter: 0, name: chapterNames[0], enterTime: 0 });

  const startTime = Date.now();
  let tickCount = 0;
  let reachedEnd = false;

  while (!reachedEnd && tickCount < 500) {
    await page.mouse.wheel(0, SCROLL_PER_TICK);
    await page.waitForTimeout(TICK_INTERVAL);
    tickCount++;

    const scrollState = await page.evaluate(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = window.scrollY;
      const scrollPct = maxScroll > 0 ? scrollY / maxScroll : 0;

      const chapters = document.querySelectorAll('.chapter');
      let activeChapter = 0;
      chapters.forEach((ch, i) => {
        const top = (ch as HTMLElement).offsetTop;
        if (scrollY >= top - window.innerHeight * 0.5) {
          activeChapter = i;
        }
      });

      return { scrollPct, scrollY, activeChapter };
    });

    if (scrollState.activeChapter !== currentChapter) {
      const elapsed = (Date.now() - startTime) / 1000;
      const prevTiming = chapterTimings[chapterTimings.length - 1];
      prevTiming.duration = elapsed - prevTiming.enterTime;

      currentChapter = scrollState.activeChapter;
      chapterTimings.push({ chapter: currentChapter, name: chapterNames[currentChapter], enterTime: elapsed });
    }

    if (scrollState.scrollPct >= 0.98) {
      const elapsed = (Date.now() - startTime) / 1000;
      const prevTiming = chapterTimings[chapterTimings.length - 1];
      prevTiming.duration = elapsed - prevTiming.enterTime;
      reachedEnd = true;
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('--- Chapter Timings (Manual Scroll Only, No Gravity) ---');
  chapterTimings.forEach(ct => {
    const dur = ct.duration !== undefined ? `${ct.duration.toFixed(1)}s` : 'ongoing';
    const bar = ct.duration !== undefined ? '█'.repeat(Math.round(ct.duration * 2)) : '';
    console.log(`  Ch${ct.chapter} ${ct.name.padEnd(20)} ${dur.padStart(6)} ${bar}`);
  });
  console.log(`  TOTAL: ${totalTime.toFixed(1)}s`);

  console.log('\n========== NOW WITH GRAVITY (realistic experience) ==========');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const loader = document.getElementById('loader');
    if (loader) { loader.classList.add('hidden'); loader.style.display = 'none'; }
    const soundPrompt = document.getElementById('sound-prompt');
    if (soundPrompt) { soundPrompt.classList.remove('visible'); soundPrompt.style.display = 'none'; }
    const intro = document.getElementById('intro-cinematic');
    if (intro) { intro.style.display = 'none'; intro.classList.remove('active'); }
  });

  await page.waitForTimeout(500);

  const gravityTimings: { chapter: number; name: string; enterTime: number; duration?: number; gravityForce?: number }[] = [];
  gravityTimings.push({ chapter: 0, name: chapterNames[0], enterTime: 0 });
  currentChapter = 0;

  const startTime2 = Date.now();
  tickCount = 0;
  reachedEnd = false;

  const SLOW_SCROLL = 80;
  const SLOW_TICKS = 3;
  const SLOW_INTERVAL = 1000 / SLOW_TICKS;

  while (!reachedEnd && tickCount < 600) {
    await page.mouse.wheel(0, SLOW_SCROLL);
    await page.waitForTimeout(SLOW_INTERVAL);
    tickCount++;

    const scrollState = await page.evaluate(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = window.scrollY;
      const scrollPct = maxScroll > 0 ? scrollY / maxScroll : 0;

      let gravForce = scrollPct * scrollPct * 2;
      if (scrollPct > 0.15) { const g1 = (scrollPct - 0.15) / 0.85; gravForce += g1 * Math.sqrt(g1) * 5; }
      if (scrollPct > 0.35) { const g2 = (scrollPct - 0.35) / 0.65; gravForce += g2 * Math.sqrt(g2) * 12; }
      if (scrollPct > 0.55) { const g3 = (scrollPct - 0.55) / 0.45; gravForce += g3 * g3 * 25; }
      if (scrollPct > 0.75) { const g4 = (scrollPct - 0.75) / 0.25; gravForce += g4 * g4 * 40; }

      const chapters = document.querySelectorAll('.chapter');
      let activeChapter = 0;
      chapters.forEach((ch, i) => {
        const top = (ch as HTMLElement).offsetTop;
        if (scrollY >= top - window.innerHeight * 0.5) {
          activeChapter = i;
        }
      });

      return { scrollPct, scrollY, activeChapter, gravForce: Math.round(gravForce * 100) / 100 };
    });

    if (scrollState.activeChapter !== currentChapter) {
      const elapsed = (Date.now() - startTime2) / 1000;
      const prevTiming = gravityTimings[gravityTimings.length - 1];
      prevTiming.duration = elapsed - prevTiming.enterTime;
      prevTiming.gravityForce = scrollState.gravForce;

      currentChapter = scrollState.activeChapter;
      gravityTimings.push({ chapter: currentChapter, name: chapterNames[currentChapter], enterTime: elapsed });
    }

    if (scrollState.scrollPct >= 0.98) {
      const elapsed = (Date.now() - startTime2) / 1000;
      const prevTiming = gravityTimings[gravityTimings.length - 1];
      prevTiming.duration = elapsed - prevTiming.enterTime;
      reachedEnd = true;
    }
  }

  const totalTime2 = (Date.now() - startTime2) / 1000;

  console.log('--- Chapter Timings (Slower Scroll + Gravity Assist) ---');
  gravityTimings.forEach(ct => {
    const dur = ct.duration !== undefined ? `${ct.duration.toFixed(1)}s` : 'ongoing';
    const grav = ct.gravityForce !== undefined ? `grav:${ct.gravityForce}` : '';
    const bar = ct.duration !== undefined ? '█'.repeat(Math.round(ct.duration * 2)) : '';
    console.log(`  Ch${ct.chapter} ${ct.name.padEnd(20)} ${dur.padStart(6)} ${grav.padStart(12)} ${bar}`);
  });
  console.log(`  TOTAL: ${totalTime2.toFixed(1)}s`);

  console.log('\n========== PACING ANALYSIS ==========');

  const idealTimings = [
    { name: 'You (Intro)', idealMin: 5, idealMax: 10, reason: 'Poetry + title reveal needs time' },
    { name: 'The Pull', idealMin: 5, idealMax: 8, reason: 'Building atmosphere' },
    { name: 'The Warp', idealMin: 5, idealMax: 8, reason: 'Visual spectacle' },
    { name: 'Photon Sphere', idealMin: 4, idealMax: 7, reason: 'Tension building' },
    { name: 'The Fall', idealMin: 4, idealMax: 7, reason: 'Acceleration starts' },
    { name: 'Spaghettification', idealMin: 4, idealMax: 8, reason: 'Key dramatic moment' },
    { name: 'Time Dilation', idealMin: 3, idealMax: 6, reason: 'Philosophical pause' },
    { name: 'Singularity', idealMin: 2, idealMax: 5, reason: 'Overwhelming plunge' },
    { name: 'What Remains', idealMin: 2, idealMax: 4, reason: 'Denouement + credits' },
  ];

  gravityTimings.forEach((ct, i) => {
    const ideal = idealTimings[i];
    if (!ct.duration || !ideal) return;

    let verdict = '✅ OK';
    if (ct.duration < ideal.idealMin) verdict = `⚠️ TOO FAST (min ${ideal.idealMin}s)`;
    else if (ct.duration > ideal.idealMax) verdict = `⚠️ TOO SLOW (max ${ideal.idealMax}s)`;

    console.log(`  Ch${ct.chapter} ${ct.name.padEnd(20)} ${ct.duration.toFixed(1)}s | ideal: ${ideal.idealMin}-${ideal.idealMax}s | ${verdict}`);
  });

  const totalIdealMin = idealTimings.reduce((s, t) => s + t.idealMin, 0);
  const totalIdealMax = idealTimings.reduce((s, t) => s + t.idealMax, 0);
  console.log(`\n  Total: ${totalTime2.toFixed(1)}s | Ideal range: ${totalIdealMin}-${totalIdealMax}s`);

  if (totalTime2 < totalIdealMin) {
    console.log(`  ⚠️ Experience too SHORT — user rushes through`);
  } else if (totalTime2 > totalIdealMax) {
    console.log(`  ⚠️ Experience too LONG — user might lose interest`);
  } else {
    console.log(`  ✅ Total duration is in the ideal range`);
  }

  await browser.close();
}

main().catch(console.error);
