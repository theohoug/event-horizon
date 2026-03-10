/**
 * @file browser-manager.ts
 * @description Manages Playwright browser lifecycle for SOTY capture sessions
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { CONFIG } from '../config';

interface BrowserLaunchOptions {
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  mobile?: boolean;
}

interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

const CHROMIUM_GPU_ARGS = [
  '--use-gl=angle',
  '--enable-features=Vulkan',
  '--disable-features=UseOzonePlatform',
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
  '--disable-software-rasterizer',
];

const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export async function launchBrowser(options: BrowserLaunchOptions = {}): Promise<BrowserSession> {
  const {
    browser: browserType = 'chromium',
    headless = false,
    mobile = false,
  } = options;

  const viewport = mobile
    ? { width: CONFIG.mobile.viewport.width, height: CONFIG.mobile.viewport.height }
    : { width: CONFIG.capture.screenshotWidth, height: CONFIG.capture.screenshotHeight };

  const launchOptions: Record<string, unknown> = {
    headless,
  };

  if (browserType === 'chromium') {
    launchOptions.args = CHROMIUM_GPU_ARGS;
  }

  const browserLauncher = browserType === 'firefox'
    ? firefox
    : browserType === 'webkit'
      ? webkit
      : chromium;

  const browser = await browserLauncher.launch(launchOptions);

  const contextOptions: Record<string, unknown> = {
    viewport,
    deviceScaleFactor: mobile ? 3 : 1,
  };

  if (mobile) {
    contextOptions.hasTouch = true;
    contextOptions.isMobile = true;
    contextOptions.userAgent = IPHONE_USER_AGENT;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  return { browser, context, page };
}

export async function navigateToSite(page: Page): Promise<void> {
  await page.goto(CONFIG.DEV_SERVER_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  await page.waitForTimeout(3000);
  await waitForLoaderDismissal(page);
  await page.waitForTimeout(1000);
  await dismissSoundPrompt(page);
  await page.waitForTimeout(1000);
  await dismissSoundPrompt(page);
  await waitForIntroCinematic(page);
  await page.waitForTimeout(3000);
}

async function waitForLoaderDismissal(page: Page): Promise<void> {
  try {
    await page.waitForFunction(`(() => {
      var loader = document.querySelector('#loader');
      if (!loader) return true;
      var style = window.getComputedStyle(loader);
      return style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden' || loader.classList.contains('hidden');
    })()`, { timeout: 15_000 });
  } catch {
    // Loader may not exist or timed out
  }
}

async function dismissSoundPrompt(page: Page): Promise<void> {
  const soundDismissSelectors = [
    '#sound-prompt-no',
    '#sound-prompt-yes',
    '#sound-no',
    '[data-sound-dismiss]',
    '.sound-prompt button:last-child',
    '.sound-prompt .no',
    'button:has-text("Skip")',
    'button:has-text("Enter")',
  ];

  for (const selector of soundDismissSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) {
          await element.click({ force: true });
          await page.waitForTimeout(500);
          return;
        }
      }
    } catch {
      continue;
    }
  }

  try {
    await page.evaluate(`(function() {
      var prompt = document.getElementById('sound-prompt');
      if (prompt) { prompt.style.display = 'none'; prompt.remove(); }
      var noBtn = document.getElementById('sound-prompt-no');
      if (noBtn) noBtn.click();
      var yesBtn = document.getElementById('sound-prompt-yes');
      if (yesBtn) yesBtn.click();
    })()`);
  } catch {
    // Fallback silently
  }
}

async function waitForIntroCinematic(page: Page): Promise<void> {
  try {
    await page.waitForFunction(`(() => {
      var intro = document.querySelector('#intro, .intro-cinematic, [data-intro]');
      if (!intro) return true;
      var style = window.getComputedStyle(intro);
      return style.display === 'none' || style.opacity === '0' || style.pointerEvents === 'none';
    })()`, { timeout: 15_000 });
  } catch {
    // Intro may have already completed or timed out
  }
}

export async function closeBrowser(browser: Browser): Promise<void> {
  try {
    await Promise.race([
      browser.close(),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch {
    // Force-close silently
  }
}
