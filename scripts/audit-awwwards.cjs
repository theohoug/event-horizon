/**
 * @file Awwwards Quality Audit — fade.run
 * @author Cleanlystudio
 *
 * Comprehensive audit: screenshots, FPS, CLS, console errors,
 * font loading, custom cursor, WebGL rendering, mobile viewport.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const AUDIT_DIR = 'C:/Users/theoo/OneDrive/Bureau/SOTY/event-horizon/scripts/audit';
const SITE_URL = 'https://fade.run';
const DESKTOP_VP = { width: 1920, height: 1080 };
const MOBILE_VP = { width: 375, height: 812 };

(async () => {
  if (fs.existsSync(AUDIT_DIR)) fs.rmSync(AUDIT_DIR, { recursive: true });
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const results = {
    timestamp: new Date().toISOString(),
    url: SITE_URL,
    desktop: {},
    mobile: {},
    consoleErrors: [],
    consoleWarnings: [],
    consoleLogs: [],
    performanceMetrics: {},
    fontLoading: {},
    customCursor: {},
    webgl: {},
    layoutShift: {},
    fps: {},
    chapters: {},
  };

  console.log('='.repeat(60));
  console.log('AWWWARDS AUDIT — fade.run');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    args: [
      '--use-angle=d3d11',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });

  // ============================================================
  // DESKTOP AUDIT
  // ============================================================
  console.log('\n[DESKTOP] Starting audit at 1920x1080...');
  const ctx = await browser.newContext({
    viewport: DESKTOP_VP,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  const consoleMessages = [];
  const jsErrors = [];

  page.on('pageerror', (err) => {
    const msg = err.message ? err.message.slice(0, 300) : String(err).slice(0, 300);
    jsErrors.push(msg);
    results.consoleErrors.push({ type: 'pageerror', message: msg });
  });

  page.on('console', (msg) => {
    const text = msg.text().slice(0, 300);
    const type = msg.type();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      results.consoleErrors.push({ type: 'console.error', message: text });
    } else if (type === 'warning') {
      results.consoleWarnings.push({ type: 'console.warn', message: text });
    }
  });

  // -- STAGE 1: Loading / Splash --
  console.log('  [1/7] Loading site...');
  const loadStart = Date.now();
  await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const domContentLoaded = Date.now() - loadStart;
  console.log(`        DOM loaded in ${domContentLoaded}ms`);

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(AUDIT_DIR, '01-desktop-loader.png'), type: 'png' });
  console.log('        Screenshot: 01-desktop-loader.png');

  await page.waitForTimeout(2000);

  // Check loader quality
  const loaderState = await page.evaluate(() => {
    const body = document.body;
    const loader = document.querySelector('#loader, .loader, [class*="loader"], [id*="loading"]');
    const canvas = document.querySelector('canvas');
    const soundPrompt = document.getElementById('sound-prompt');
    return {
      hasLoader: !!loader,
      loaderVisible: loader ? getComputedStyle(loader).display !== 'none' && getComputedStyle(loader).opacity !== '0' : false,
      loaderClasses: loader ? loader.className : null,
      hasCanvas: !!canvas,
      canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
      soundPromptVisible: soundPrompt ? getComputedStyle(soundPrompt).display !== 'none' : false,
      bodyClasses: body.className,
    };
  });
  results.desktop.loaderState = loaderState;
  console.log('        Loader:', JSON.stringify(loaderState));

  // -- Font loading check --
  const fontCheck = await page.evaluate(async () => {
    const fonts = [];
    if (document.fonts) {
      for (const f of document.fonts) {
        fonts.push({ family: f.family, status: f.status, weight: f.weight, style: f.style });
      }
      const allLoaded = await document.fonts.ready.then(() => true).catch(() => false);
      return { fonts, allLoaded, count: fonts.length };
    }
    return { fonts: [], allLoaded: false, count: 0 };
  });
  results.fontLoading = fontCheck;
  console.log(`        Fonts: ${fontCheck.count} loaded, allReady=${fontCheck.allLoaded}`);

  // -- WebGL check --
  const webglCheck = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { hasCanvas: false };
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const fallback = document.getElementById('webgl-fallback');
    return {
      hasCanvas: true,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      webglVersion: gl ? (gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1') : 'none',
      renderer: gl ? gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL || gl.RENDERER) : 'N/A',
      fallbackVisible: fallback ? getComputedStyle(fallback).display !== 'none' : false,
    };
  });
  results.webgl = webglCheck;
  console.log('        WebGL:', JSON.stringify(webglCheck));

  // -- Custom cursor check --
  const cursorCheck = await page.evaluate(() => {
    const cursor = document.querySelector('#custom-cursor, .custom-cursor, [class*="cursor"]');
    const cursorRing = document.querySelector('#custom-cursor-ring, .cursor-ring, [class*="cursor-ring"]');
    const bodyCursor = getComputedStyle(document.body).cursor;
    return {
      hasCursorElement: !!cursor,
      cursorId: cursor ? cursor.id : null,
      cursorClasses: cursor ? cursor.className : null,
      hasCursorRing: !!cursorRing,
      bodyCursorStyle: bodyCursor,
    };
  });
  results.customCursor = cursorCheck;
  console.log('        Custom cursor:', JSON.stringify(cursorCheck));

  // -- STAGE 2: Click sound prompt --
  console.log('  [2/7] Dismissing sound prompt...');
  const soundPromptClicked = await page.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    if (sp) {
      const btns = sp.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('skip') || b.textContent.trim().toLowerCase().includes('enter') || b.textContent.trim().toLowerCase().includes('without')) {
          b.click();
          return { clicked: true, buttonText: b.textContent.trim() };
        }
      }
      if (btns.length > 0) {
        btns[btns.length - 1].click();
        return { clicked: true, buttonText: btns[btns.length - 1].textContent.trim() };
      }
    }
    const enterBtn = document.querySelector('.enter-btn, [class*="enter"], [class*="start"]');
    if (enterBtn) {
      enterBtn.click();
      return { clicked: true, buttonText: enterBtn.textContent?.trim() || 'enter-btn' };
    }
    return { clicked: false, buttonText: null };
  });
  results.desktop.soundPrompt = soundPromptClicked;
  console.log('        Sound prompt:', JSON.stringify(soundPromptClicked));
  await page.waitForTimeout(3000);

  // Force-dismiss any remaining overlays
  await page.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    if (sp && getComputedStyle(sp).display !== 'none') {
      sp.style.display = 'none';
      sp.classList.remove('visible');
    }
    const intro = document.getElementById('intro-cinematic');
    if (intro) intro.style.display = 'none';
  });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(AUDIT_DIR, '02-desktop-after-prompt.png'), type: 'png' });
  console.log('        Screenshot: 02-desktop-after-prompt.png');

  // Get scroll height
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log(`        Max scroll: ${maxScroll}px`);

  // -- FPS measurement function --
  const measureFPS = async (label, duration = 3000) => {
    const fps = await page.evaluate((dur) => {
      return new Promise((resolve) => {
        let frames = 0;
        let minDelta = Infinity;
        let maxDelta = 0;
        let lastTime = performance.now();
        const deltas = [];
        const start = performance.now();
        function tick() {
          const now = performance.now();
          const delta = now - lastTime;
          if (delta > 0) {
            deltas.push(delta);
            if (delta < minDelta) minDelta = delta;
            if (delta > maxDelta) maxDelta = delta;
          }
          lastTime = now;
          frames++;
          if (now - start < dur) {
            requestAnimationFrame(tick);
          } else {
            const elapsed = now - start;
            const avgFPS = (frames / elapsed) * 1000;
            const sortedDeltas = deltas.sort((a, b) => a - b);
            const p1 = sortedDeltas[Math.floor(sortedDeltas.length * 0.01)] || 0;
            const p99 = sortedDeltas[Math.floor(sortedDeltas.length * 0.99)] || 0;
            resolve({
              avgFPS: Math.round(avgFPS * 10) / 10,
              minFPS: Math.round((1000 / maxDelta) * 10) / 10,
              maxFPS: Math.round((1000 / minDelta) * 10) / 10,
              frames,
              elapsed: Math.round(elapsed),
              p1_delta: Math.round(p1 * 10) / 10,
              p99_delta: Math.round(p99 * 10) / 10,
              jank: deltas.filter(d => d > 50).length,
            });
          }
        }
        requestAnimationFrame(tick);
      });
    }, duration);
    return fps;
  };

  // -- CLS measurement --
  const setupCLS = async () => {
    await page.evaluate(() => {
      window.__cls = 0;
      window.__clsEntries = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__cls += entry.value;
            window.__clsEntries.push({ value: entry.value, startTime: entry.startTime });
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    });
  };
  await setupCLS();

  // -- STAGE 3: Chapter 1 (10%) --
  console.log('  [3/7] Scrolling to Chapter 1 (10%)...');
  await page.evaluate((max) => window.scrollTo(0, max * 0.10), maxScroll);
  await page.waitForTimeout(2500);
  const fps_ch1 = await measureFPS('ch1');
  results.fps.chapter1 = fps_ch1;
  console.log(`        FPS ch1: avg=${fps_ch1.avgFPS}, min=${fps_ch1.minFPS}, jank=${fps_ch1.jank}`);

  const ch1State = await page.evaluate(() => {
    const chapterEl = document.querySelector('[data-chapter="1"], #chapter-1, .chapter-1');
    const nav = document.getElementById('chapter-nav');
    return {
      chapterElement: chapterEl ? chapterEl.id || chapterEl.className : null,
      navVisible: nav ? getComputedStyle(nav).display !== 'none' && getComputedStyle(nav).opacity !== '0' : false,
      scrollY: window.scrollY,
    };
  });
  results.chapters.ch1 = ch1State;
  await page.screenshot({ path: path.join(AUDIT_DIR, '03-desktop-ch1-10pct.png'), type: 'png' });
  console.log('        Screenshot: 03-desktop-ch1-10pct.png');

  // -- STAGE 4: Chapter 3 (30%) --
  console.log('  [4/7] Scrolling to Chapter 3 (30%)...');
  await page.evaluate((max) => window.scrollTo(0, max * 0.30), maxScroll);
  await page.waitForTimeout(2500);
  const fps_ch3 = await measureFPS('ch3');
  results.fps.chapter3 = fps_ch3;
  console.log(`        FPS ch3: avg=${fps_ch3.avgFPS}, min=${fps_ch3.minFPS}, jank=${fps_ch3.jank}`);

  await page.screenshot({ path: path.join(AUDIT_DIR, '04-desktop-ch3-30pct.png'), type: 'png' });
  console.log('        Screenshot: 04-desktop-ch3-30pct.png');

  // -- STAGE 5: Chapter 5 SPAGHETTIFICATION (55%) --
  console.log('  [5/7] Scrolling to Chapter 5 SPAGHETTIFICATION (55%)...');
  await page.evaluate((max) => window.scrollTo(0, max * 0.55), maxScroll);
  await page.waitForTimeout(3000);
  const fps_ch5 = await measureFPS('ch5', 4000);
  results.fps.chapter5_spaghettification = fps_ch5;
  console.log(`        FPS ch5: avg=${fps_ch5.avgFPS}, min=${fps_ch5.minFPS}, jank=${fps_ch5.jank}`);

  const ch5State = await page.evaluate(() => {
    const hud = document.querySelector('#hud, #data-hud, .hud-container, [class*="hud"]');
    return {
      scrollY: window.scrollY,
      hudVisible: hud ? getComputedStyle(hud).display !== 'none' : false,
      hudContent: hud ? hud.textContent?.slice(0, 100) : null,
    };
  });
  results.chapters.ch5 = ch5State;
  await page.screenshot({ path: path.join(AUDIT_DIR, '05-desktop-ch5-spaghettification-55pct.png'), type: 'png' });
  console.log('        Screenshot: 05-desktop-ch5-spaghettification-55pct.png');

  // -- STAGE 6: Chapter 7 SINGULARITY (80%) --
  console.log('  [6/7] Scrolling to Chapter 7 SINGULARITY (80%)...');
  await page.evaluate((max) => window.scrollTo(0, max * 0.80), maxScroll);
  await page.waitForTimeout(3000);
  const fps_ch7 = await measureFPS('ch7', 4000);
  results.fps.chapter7_singularity = fps_ch7;
  console.log(`        FPS ch7: avg=${fps_ch7.avgFPS}, min=${fps_ch7.minFPS}, jank=${fps_ch7.jank}`);

  const ch7State = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return {
      scrollY: window.scrollY,
      canvasRendering: canvas ? canvas.width > 0 && canvas.height > 0 : false,
    };
  });
  results.chapters.ch7 = ch7State;
  await page.screenshot({ path: path.join(AUDIT_DIR, '06-desktop-ch7-singularity-80pct.png'), type: 'png' });
  console.log('        Screenshot: 06-desktop-ch7-singularity-80pct.png');

  // -- STAGE 7: Credits (95-100%) --
  console.log('  [7/7] Scrolling to Credits (95-100%)...');
  await page.evaluate((max) => window.scrollTo(0, max * 0.95), maxScroll);
  await page.waitForTimeout(2000);
  await page.evaluate((max) => window.scrollTo(0, max), maxScroll);
  await page.waitForTimeout(3000);
  const fps_credits = await measureFPS('credits');
  results.fps.credits = fps_credits;
  console.log(`        FPS credits: avg=${fps_credits.avgFPS}, min=${fps_credits.minFPS}, jank=${fps_credits.jank}`);

  const creditsState = await page.evaluate(() => {
    const credits = document.getElementById('credits');
    const legal = document.querySelector('.credits-legal, [class*="legal"]');
    const privacy = document.querySelector('a[href*="privacy"]');
    return {
      creditsVisible: credits ? getComputedStyle(credits).display !== 'none' : false,
      creditsClasses: credits ? credits.className : null,
      legalText: legal ? legal.textContent?.trim().slice(0, 200) : null,
      privacyLink: privacy ? privacy.href : null,
      scrollY: window.scrollY,
    };
  });
  results.chapters.credits = creditsState;
  await page.screenshot({ path: path.join(AUDIT_DIR, '07-desktop-credits.png'), type: 'png' });
  console.log('        Screenshot: 07-desktop-credits.png');

  // -- CLS result --
  const clsResult = await page.evaluate(() => ({
    cls: window.__cls,
    entries: window.__clsEntries?.length || 0,
    worst: window.__clsEntries?.sort((a, b) => b.value - a.value).slice(0, 3) || [],
  }));
  results.layoutShift = clsResult;
  console.log(`        CLS: ${clsResult.cls.toFixed(4)} (${clsResult.entries} shifts)`);

  // -- Performance metrics --
  const perfMetrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource');
    const totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    return {
      navigationTiming: perf ? {
        domContentLoaded: Math.round(perf.domContentLoadedEventEnd),
        loadEvent: Math.round(perf.loadEventEnd),
        ttfb: Math.round(perf.responseStart - perf.requestStart),
        domInteractive: Math.round(perf.domInteractive),
      } : null,
      paint: paint.map(p => ({ name: p.name, startTime: Math.round(p.startTime) })),
      resourceCount: resources.length,
      totalTransferKB: Math.round(totalTransferSize / 1024),
      largestResources: resources
        .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
        .slice(0, 10)
        .map(r => ({ name: r.name.split('/').pop()?.slice(0, 60), sizeKB: Math.round((r.transferSize || 0) / 1024), type: r.initiatorType })),
    };
  });
  results.performanceMetrics = perfMetrics;
  console.log('        Performance:', JSON.stringify(perfMetrics.navigationTiming));
  console.log(`        Resources: ${perfMetrics.resourceCount}, total=${perfMetrics.totalTransferKB}KB`);

  // -- DOM complexity --
  const domStats = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const maxDepth = (() => {
      let max = 0;
      allElements.forEach((el) => {
        let d = 0;
        let n = el;
        while (n.parentElement) { d++; n = n.parentElement; }
        if (d > max) max = d;
      });
      return max;
    })();
    return {
      totalElements: allElements.length,
      maxDepth,
      canvasCount: document.querySelectorAll('canvas').length,
      imgCount: document.querySelectorAll('img').length,
      videoCount: document.querySelectorAll('video').length,
      svgCount: document.querySelectorAll('svg').length,
    };
  });
  results.desktop.domStats = domStats;
  console.log('        DOM:', JSON.stringify(domStats));

  // -- Accessibility quick check --
  const a11y = await page.evaluate(() => {
    const html = document.documentElement;
    return {
      lang: html.getAttribute('lang'),
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.content?.slice(0, 100),
      metaOG: {
        title: document.querySelector('meta[property="og:title"]')?.content?.slice(0, 100),
        image: document.querySelector('meta[property="og:image"]')?.content?.slice(0, 100),
        description: document.querySelector('meta[property="og:description"]')?.content?.slice(0, 100),
      },
      viewport: document.querySelector('meta[name="viewport"]')?.content,
      favicon: !!document.querySelector('link[rel*="icon"]'),
      ariaLandmarks: document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], main, nav, header').length,
    };
  });
  results.desktop.accessibility = a11y;
  console.log('        A11y:', JSON.stringify(a11y));

  await ctx.close();

  // ============================================================
  // MOBILE AUDIT
  // ============================================================
  console.log('\n[MOBILE] Starting audit at 375x812 (iPhone 13 mini)...');
  const mobileCtx = await browser.newContext({
    viewport: MOBILE_VP,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const mobilePage = await mobileCtx.newPage();

  const mobileErrors = [];
  mobilePage.on('pageerror', (err) => mobileErrors.push(err.message?.slice(0, 200) || String(err).slice(0, 200)));
  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') mobileErrors.push(msg.text().slice(0, 200));
  });

  console.log('  Loading mobile...');
  await mobilePage.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mobilePage.waitForTimeout(4000);
  await mobilePage.screenshot({ path: path.join(AUDIT_DIR, '08-mobile-loader.png'), type: 'png' });
  console.log('        Screenshot: 08-mobile-loader.png');

  // Dismiss prompt on mobile
  await mobilePage.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    if (sp) {
      const btns = sp.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('skip') || b.textContent.trim().toLowerCase().includes('without')) {
          b.click();
          return;
        }
      }
      if (btns.length > 0) btns[btns.length - 1].click();
    }
  });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    if (sp) { sp.style.display = 'none'; sp.classList.remove('visible'); }
    const intro = document.getElementById('intro-cinematic');
    if (intro) intro.style.display = 'none';
  });
  await mobilePage.waitForTimeout(2000);

  const mobileMaxScroll = await mobilePage.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  // Mobile ch1
  await mobilePage.evaluate((max) => window.scrollTo(0, max * 0.1), mobileMaxScroll);
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(AUDIT_DIR, '09-mobile-ch1.png'), type: 'png' });
  console.log('        Screenshot: 09-mobile-ch1.png');

  // Mobile ch5
  await mobilePage.evaluate((max) => window.scrollTo(0, max * 0.55), mobileMaxScroll);
  await mobilePage.waitForTimeout(2500);
  const mobileFPS = await mobilePage.evaluate(() => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (performance.now() - start < 2000) requestAnimationFrame(tick);
        else resolve({ avgFPS: Math.round((frames / ((performance.now() - start) / 1000)) * 10) / 10 });
      }
      requestAnimationFrame(tick);
    });
  });
  results.mobile.fps_ch5 = mobileFPS;
  await mobilePage.screenshot({ path: path.join(AUDIT_DIR, '10-mobile-ch5.png'), type: 'png' });
  console.log('        Screenshot: 10-mobile-ch5.png');
  console.log(`        Mobile FPS ch5: ${mobileFPS.avgFPS}`);

  // Mobile layout check
  const mobileLayout = await mobilePage.evaluate(() => {
    const vw = window.innerWidth;
    const overflowing = [];
    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > vw + 2 && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
        overflowing.push({ tag: el.tagName, id: el.id, class: el.className?.toString()?.slice(0, 50), width: Math.round(rect.width) });
      }
    });
    return {
      viewportWidth: vw,
      overflowingElements: overflowing.slice(0, 5),
      hasHorizontalScroll: document.documentElement.scrollWidth > vw,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  results.mobile.layout = mobileLayout;
  console.log('        Mobile layout:', JSON.stringify(mobileLayout));

  results.mobile.errors = mobileErrors;
  console.log(`        Mobile errors: ${mobileErrors.length}`);

  await mobileCtx.close();

  // ============================================================
  // TRANSITION TEST (rapid scroll between chapters)
  // ============================================================
  console.log('\n[TRANSITIONS] Testing scroll transitions...');
  const transCtx = await browser.newContext({
    viewport: DESKTOP_VP,
    deviceScaleFactor: 1,
  });
  const transPage = await transCtx.newPage();
  const transErrors = [];
  transPage.on('pageerror', (err) => transErrors.push(err.message?.slice(0, 200)));

  await transPage.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await transPage.waitForTimeout(5000);

  // Dismiss prompt
  await transPage.evaluate(() => {
    const sp = document.getElementById('sound-prompt');
    if (sp) {
      const btns = sp.querySelectorAll('button');
      for (const b of btns) { b.click(); break; }
      sp.style.display = 'none';
    }
    const intro = document.getElementById('intro-cinematic');
    if (intro) intro.style.display = 'none';
  });
  await transPage.waitForTimeout(2000);

  const transMaxScroll = await transPage.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  // Rapid scroll through all chapters — simulate smooth scrolling
  const transitionResults = [];
  for (const pct of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) {
    await transPage.evaluate((args) => {
      window.scrollTo({ top: args.max * args.pct, behavior: 'instant' });
    }, { max: transMaxScroll, pct });
    await transPage.waitForTimeout(800);

    const state = await transPage.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return {
        scrollY: window.scrollY,
        canvasOk: canvas ? canvas.width > 0 && canvas.height > 0 : false,
        bodyVisible: getComputedStyle(document.body).visibility !== 'hidden',
      };
    });
    transitionResults.push({ pct, ...state });
  }
  results.desktop.transitions = transitionResults;
  const allTransitionsOk = transitionResults.every(t => t.canvasOk && t.bodyVisible);
  console.log(`        Transitions: ${allTransitionsOk ? 'ALL OK' : 'ISSUES DETECTED'}`);
  if (!allTransitionsOk) {
    transitionResults.filter(t => !t.canvasOk || !t.bodyVisible).forEach(t => {
      console.log(`          FAIL at ${t.pct * 100}%: canvas=${t.canvasOk}, visible=${t.bodyVisible}`);
    });
  }
  results.desktop.transitionErrors = transErrors;
  console.log(`        Transition JS errors: ${transErrors.length}`);

  await transCtx.close();
  await browser.close();

  // ============================================================
  // FINAL REPORT
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('AUDIT REPORT — fade.run');
  console.log('='.repeat(60));

  // Scoring
  const scores = {};

  // Design (from WebGL rendering + canvas quality)
  scores.webglRendering = results.webgl.hasCanvas && results.webgl.webglVersion !== 'none' ? 'PASS' : 'FAIL';

  // FPS
  const allFPS = [
    results.fps.chapter1?.avgFPS || 0,
    results.fps.chapter3?.avgFPS || 0,
    results.fps.chapter5_spaghettification?.avgFPS || 0,
    results.fps.chapter7_singularity?.avgFPS || 0,
    results.fps.credits?.avgFPS || 0,
  ].filter(f => f > 0);
  const avgFPSOverall = allFPS.length ? Math.round(allFPS.reduce((a, b) => a + b, 0) / allFPS.length * 10) / 10 : 0;
  const minFPSOverall = allFPS.length ? Math.min(...allFPS) : 0;
  scores.fpsAvg = avgFPSOverall;
  scores.fpsMin = minFPSOverall;
  scores.fpsRating = avgFPSOverall >= 55 ? 'EXCELLENT' : avgFPSOverall >= 40 ? 'GOOD' : avgFPSOverall >= 25 ? 'ACCEPTABLE' : 'POOR';

  // CLS
  scores.cls = results.layoutShift.cls || 0;
  scores.clsRating = scores.cls <= 0.1 ? 'GOOD' : scores.cls <= 0.25 ? 'NEEDS IMPROVEMENT' : 'POOR';

  // Console errors
  scores.consoleErrors = results.consoleErrors.length;
  scores.consoleWarnings = results.consoleWarnings.length;

  // Fonts
  scores.fontsLoaded = results.fontLoading.allLoaded;
  scores.fontCount = results.fontLoading.count;

  // Custom cursor
  scores.customCursor = results.customCursor.hasCursorElement ? 'PRESENT' : 'MISSING';

  // Mobile
  scores.mobileOverflow = results.mobile.layout?.hasHorizontalScroll ? 'HAS OVERFLOW' : 'OK';
  scores.mobileErrors = results.mobile.errors?.length || 0;

  // Transitions
  scores.transitions = allTransitionsOk ? 'SMOOTH' : 'ISSUES';

  // A11y
  scores.a11y_lang = results.desktop.accessibility?.lang || 'MISSING';
  scores.a11y_title = results.desktop.accessibility?.title || 'MISSING';
  scores.a11y_meta = results.desktop.accessibility?.metaDescription ? 'PRESENT' : 'MISSING';
  scores.a11y_og = results.desktop.accessibility?.metaOG?.title ? 'PRESENT' : 'MISSING';
  scores.a11y_favicon = results.desktop.accessibility?.favicon ? 'PRESENT' : 'MISSING';

  console.log('\n--- PERFORMANCE ---');
  console.log(`  FPS Average:     ${scores.fpsAvg} (${scores.fpsRating})`);
  console.log(`  FPS Minimum:     ${scores.fpsMin}`);
  console.log(`  FPS by chapter:  ch1=${results.fps.chapter1?.avgFPS || 'N/A'}, ch3=${results.fps.chapter3?.avgFPS || 'N/A'}, ch5=${results.fps.chapter5_spaghettification?.avgFPS || 'N/A'}, ch7=${results.fps.chapter7_singularity?.avgFPS || 'N/A'}, credits=${results.fps.credits?.avgFPS || 'N/A'}`);
  console.log(`  Jank frames:     ch1=${results.fps.chapter1?.jank || 0}, ch3=${results.fps.chapter3?.jank || 0}, ch5=${results.fps.chapter5_spaghettification?.jank || 0}, ch7=${results.fps.chapter7_singularity?.jank || 0}`);
  console.log(`  CLS:             ${scores.cls.toFixed(4)} (${scores.clsRating})`);
  console.log(`  Load time:       DOM=${results.performanceMetrics.navigationTiming?.domContentLoaded || 'N/A'}ms, TTFB=${results.performanceMetrics.navigationTiming?.ttfb || 'N/A'}ms`);
  console.log(`  Page weight:     ${results.performanceMetrics.totalTransferKB}KB (${results.performanceMetrics.resourceCount} resources)`);

  console.log('\n--- RENDERING ---');
  console.log(`  WebGL:           ${results.webgl.webglVersion || 'N/A'} (${scores.webglRendering})`);
  console.log(`  Canvas:          ${results.webgl.canvasWidth}x${results.webgl.canvasHeight}`);
  console.log(`  GPU:             ${results.webgl.renderer || 'N/A'}`);
  console.log(`  Transitions:     ${scores.transitions}`);

  console.log('\n--- UX ---');
  console.log(`  Custom cursor:   ${scores.customCursor}`);
  console.log(`  Fonts loaded:    ${scores.fontCount} (allReady=${scores.fontsLoaded})`);
  console.log(`  Loader:          ${results.desktop.loaderState?.hasLoader ? 'PRESENT' : 'NONE DETECTED'}`);

  console.log('\n--- ERRORS ---');
  console.log(`  Console errors:  ${scores.consoleErrors}`);
  console.log(`  Console warns:   ${scores.consoleWarnings}`);
  if (results.consoleErrors.length > 0) {
    console.log('  Error details:');
    results.consoleErrors.slice(0, 10).forEach((e, i) => console.log(`    [${i + 1}] ${e.message}`));
  }

  console.log('\n--- MOBILE ---');
  console.log(`  Horizontal overflow: ${scores.mobileOverflow}`);
  console.log(`  Mobile errors:   ${scores.mobileErrors}`);
  console.log(`  Mobile FPS ch5:  ${results.mobile.fps_ch5?.avgFPS || 'N/A'}`);
  if (results.mobile.layout?.overflowingElements?.length > 0) {
    console.log('  Overflowing elements:');
    results.mobile.layout.overflowingElements.forEach(el => console.log(`    - <${el.tag}> id="${el.id}" class="${el.class}" width=${el.width}px`));
  }

  console.log('\n--- SEO / A11Y ---');
  console.log(`  Lang:            ${scores.a11y_lang}`);
  console.log(`  Title:           ${scores.a11y_title}`);
  console.log(`  Meta desc:       ${scores.a11y_meta}`);
  console.log(`  OG tags:         ${scores.a11y_og}`);
  console.log(`  Favicon:         ${scores.a11y_favicon}`);

  console.log('\n--- LARGEST RESOURCES ---');
  if (results.performanceMetrics.largestResources) {
    results.performanceMetrics.largestResources.forEach((r, i) => {
      console.log(`  [${i + 1}] ${r.name} — ${r.sizeKB}KB (${r.type})`);
    });
  }

  console.log('\n--- FONT DETAILS ---');
  if (results.fontLoading.fonts) {
    results.fontLoading.fonts.forEach(f => console.log(`  ${f.family} ${f.weight} ${f.style} — ${f.status}`));
  }

  console.log('\n--- DOM STATS ---');
  console.log(`  Total elements:  ${results.desktop.domStats?.totalElements}`);
  console.log(`  Max depth:       ${results.desktop.domStats?.maxDepth}`);
  console.log(`  Canvas count:    ${results.desktop.domStats?.canvasCount}`);
  console.log(`  SVG count:       ${results.desktop.domStats?.svgCount}`);

  // Save full JSON results
  const reportPath = path.join(AUDIT_DIR, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);

  // Count screenshots
  const screenshots = fs.readdirSync(AUDIT_DIR).filter(f => f.endsWith('.png'));
  console.log(`Screenshots saved: ${screenshots.length} files in ${AUDIT_DIR}`);
  screenshots.forEach(s => console.log(`  - ${s}`));

  console.log('\n' + '='.repeat(60));
  console.log('AUDIT COMPLETE');
  console.log('='.repeat(60));
})();
