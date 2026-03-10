/**
 * @file network-throttle.ts
 * @description Tests site behavior under degraded network conditions (3G, offline)
 * @author Cleanlystudio
 * @version 1.0.0
 */

import * as path from 'path';
import { CONFIG } from '../config';
import { launchBrowser, closeBrowser } from '../capture/browser-manager';
import { ensureDir, saveScreenshot } from '../utils/file-utils';
import { log, progress, phaseStart, phaseEnd } from '../utils/logger';

interface NetworkConditionResult {
  condition: string;
  loadTime: number;
  firstFrame: number;
  usable: boolean;
}

interface NetworkProfile {
  name: string;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
  offline: boolean;
}

const NETWORK_PROFILES: NetworkProfile[] = [
  {
    name: 'Fast 3G',
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (768 * 1024) / 8,
    latency: 150,
    offline: false,
  },
  {
    name: 'Slow 3G',
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
    latency: 400,
    offline: false,
  },
  {
    name: 'Offline',
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0,
    offline: true,
  },
];

async function testSingleCondition(
  profile: NetworkProfile,
  cycleDir: string,
): Promise<NetworkConditionResult> {
  const networkDir = path.join(cycleDir, 'mobile', 'network');
  ensureDir(networkDir);

  const session = await launchBrowser({ browser: 'chromium', headless: true, mobile: true });

  let loadTime = 0;
  let firstFrame = 0;
  let usable = false;

  try {
    const cdpSession = await session.context.newCDPSession(session.page);

    await cdpSession.send('Network.enable');
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: profile.offline,
      downloadThroughput: profile.downloadThroughput,
      uploadThroughput: profile.uploadThroughput,
      latency: profile.latency,
    });

    const navigationStart = Date.now();

    try {
      await session.page.goto(CONFIG.DEV_SERVER_URL, {
        waitUntil: 'domcontentloaded',
        timeout: profile.offline ? 10000 : 60000,
      });

      loadTime = Date.now() - navigationStart;

      if (!profile.offline) {
        try {
          await session.page.waitForFunction(
            `(function() {
              var canvas = document.querySelector('canvas');
              return !!canvas;
            })()`,
            { timeout: 30000 },
          );
          firstFrame = Date.now() - navigationStart;
        } catch {
          firstFrame = 0;
        }
      }
    } catch {
      loadTime = Date.now() - navigationStart;
      firstFrame = 0;
    }

    usable = await session.page.evaluate(`(function() {
      var hasCanvas = !!document.querySelector('canvas');
      var hasContent = document.body.innerText.length > 50;
      var noError = !document.querySelector('.error, [data-error], #error-screen');

      return hasCanvas || hasContent || !noError;
    })()`);

    const screenshotPath = path.join(
      networkDir,
      `network-${profile.name.replace(/\s/g, '-').toLowerCase()}.png`,
    );
    const screenshotBuffer = await session.page.screenshot({ type: 'png' });
    saveScreenshot(screenshotBuffer, screenshotPath);

    if (!profile.offline && usable) {
      await session.page.evaluate(`(function() {
        var scrollContainer = document.scrollingElement || document.documentElement;
        var maxScroll = scrollContainer.scrollHeight - window.innerHeight;
        scrollContainer.scrollTop = maxScroll * 0.5;
      })()`);
      await session.page.waitForTimeout(2000);

      const midScreenshotPath = path.join(
        networkDir,
        `network-${profile.name.replace(/\s/g, '-').toLowerCase()}-50pct.png`,
      );
      const midBuffer = await session.page.screenshot({ type: 'png' });
      saveScreenshot(midBuffer, midScreenshotPath);
    }

    if (profile.offline) {
      const hasServiceWorker = await session.page.evaluate(`(function() {
        return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
      })()`);
      log(`Offline service worker active: ${hasServiceWorker}`, hasServiceWorker ? 'success' : 'info');
    }
  } catch (err) {
    log(`Network test error for ${profile.name}: ${err}`, 'error');
  } finally {
    await closeBrowser(session.browser);
  }

  return {
    condition: profile.name,
    loadTime,
    firstFrame,
    usable,
  };
}

export async function testNetworkConditions(
  cycleDir: string,
): Promise<NetworkConditionResult[]> {
  phaseStart('Network Throttling');

  const results: NetworkConditionResult[] = [];

  for (let i = 0; i < NETWORK_PROFILES.length; i++) {
    const profile = NETWORK_PROFILES[i];
    progress(i + 1, NETWORK_PROFILES.length, `Testing ${profile.name}`);

    log(`Testing network condition: ${profile.name}`, 'info');
    const result = await testSingleCondition(profile, cycleDir);
    results.push(result);

    log(
      `${profile.name}: load=${result.loadTime}ms, firstFrame=${result.firstFrame}ms, usable=${result.usable}`,
      result.usable ? 'success' : 'warn',
    );
  }

  phaseEnd('Network Throttling');
  return results;
}
