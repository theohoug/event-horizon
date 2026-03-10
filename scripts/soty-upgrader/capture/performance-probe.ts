/**
 * @file performance-probe.ts
 * @description Injects performance monitoring probes into the browser page
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { Page } from 'playwright';
import { FramePerformance } from '../types';

declare global {
  interface Window {
    __SOTY_PERF: {
      fps: number;
      frameTime: number;
      frameTimeMin: number;
      frameTimeMax: number;
      jsHeapUsed: number;
      jsHeapTotal: number;
      domNodes: number;
      gpuEstimatedMs: number;
      scrollVelocity: number;
      canvasWidth: number;
      canvasHeight: number;
      pixelRatio: number;
      renderer: {
        drawCalls: number;
        triangles: number;
        textures: number;
        programs: number;
      };
      freeze: () => void;
      unfreeze: () => void;
      _frozen: boolean;
      _frozenTime: number;
    };
  }
}

export async function injectProbe(page: Page): Promise<void> {
  await page.evaluate(`(function() {
    var frameTimes = [];
    var ROLLING_WINDOW = 60;
    var lastFrameTimestamp = performance.now();
    var lastScrollY = window.scrollY;
    var scrollVelocity = 0;
    var frozen = false;
    var frozenTime = 0;

    var perf = {
      fps: 0,
      frameTime: 0,
      frameTimeMin: Infinity,
      frameTimeMax: 0,
      jsHeapUsed: 0,
      jsHeapTotal: 0,
      domNodes: 0,
      gpuEstimatedMs: 0,
      scrollVelocity: 0,
      canvasWidth: 0,
      canvasHeight: 0,
      pixelRatio: window.devicePixelRatio || 1,
      renderer: { drawCalls: 0, triangles: 0, textures: 0, programs: 0 },
      _frozen: false,
      _frozenTime: 0,

      freeze: function() {
        frozen = true;
        frozenTime = performance.now();
        perf._frozen = true;
        perf._frozenTime = frozenTime;
      },

      unfreeze: function() {
        frozen = false;
        perf._frozen = false;
      }
    };

    window.__SOTY_PERF = perf;

    function measureFrame(now) {
      var delta = now - lastFrameTimestamp;
      lastFrameTimestamp = now;

      if (delta > 0 && delta < 500) {
        frameTimes.push(delta);
        if (frameTimes.length > ROLLING_WINDOW) {
          frameTimes.shift();
        }

        var avgDelta = frameTimes.reduce(function(a, b) { return a + b; }, 0) / frameTimes.length;
        perf.fps = Math.round(1000 / avgDelta);
        perf.frameTime = Math.round(avgDelta * 100) / 100;
        perf.frameTimeMin = Math.min(perf.frameTimeMin, delta);
        perf.frameTimeMax = Math.max(perf.frameTimeMax, delta);

        var jsOverhead = avgDelta * 0.6;
        perf.gpuEstimatedMs = Math.max(0, Math.round((avgDelta - jsOverhead) * 100) / 100);
      }

      var memory = performance.memory;
      if (memory) {
        perf.jsHeapUsed = memory.usedJSHeapSize;
        perf.jsHeapTotal = memory.totalJSHeapSize;
      }

      perf.domNodes = document.querySelectorAll('*').length;

      var currentScrollY = window.scrollY;
      scrollVelocity = Math.abs(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;
      perf.scrollVelocity = scrollVelocity;

      var canvas = document.querySelector('canvas');
      if (canvas) {
        perf.canvasWidth = canvas.width;
        perf.canvasHeight = canvas.height;
      }

      tryReadRendererInfo();
      requestAnimationFrame(measureFrame);
    }

    function tryReadRendererInfo() {
      try {
        var possibleRenderers = [
          window.__renderer,
          window.renderer,
          window.experience ? window.experience.renderer : undefined
        ];

        for (var ri = 0; ri < possibleRenderers.length; ri++) {
          var r = possibleRenderers[ri];
          if (r && typeof r === 'object' && r.info) {
            var info = r.info;
            if (info.render) {
              perf.renderer.drawCalls = info.render.calls || 0;
              perf.renderer.triangles = info.render.triangles || 0;
            }
            if (info.memory) {
              perf.renderer.textures = info.memory.textures || 0;
            }
            if (info.programs) {
              perf.renderer.programs = Array.isArray(info.programs) ? info.programs.length : 0;
            }
            break;
          }
        }
      } catch(e) {
        // Renderer info not accessible
      }
    }

    requestAnimationFrame(measureFrame);
  })()`);
}

export async function collectPerformance(page: Page): Promise<FramePerformance> {
  const raw = await page.evaluate(`(function() {
    var p = window.__SOTY_PERF;
    if (!p) {
      return null;
    }
    return {
      fps: p.fps,
      frameTime: p.frameTime,
      jsHeapUsed: p.jsHeapUsed,
      jsHeapTotal: p.jsHeapTotal,
      domNodes: p.domNodes,
      gpuEstimatedMs: p.gpuEstimatedMs,
      scrollVelocity: p.scrollVelocity,
      canvasWidth: p.canvasWidth,
      canvasHeight: p.canvasHeight,
      pixelRatio: p.pixelRatio,
      drawCalls: p.renderer.drawCalls,
      triangles: p.renderer.triangles,
      textures: p.renderer.textures,
      programs: p.renderer.programs
    };
  })()`);

  if (!raw) {
    return createEmptyPerformance();
  }

  return raw;
}

export async function injectTimeFreezer(page: Page): Promise<void> {
  await page.evaluate(`(function() {
    var fixedTime = performance.now();

    window.__SOTY_FROZEN_TIME = fixedTime;
    window.__SOTY_TIME_FROZEN = true;

    var originalNow = performance.now.bind(performance);
    var intercepting = false;

    performance.now = function() {
      if (window.__SOTY_TIME_FROZEN && !intercepting) {
        intercepting = true;
        var result = window.__SOTY_FROZEN_TIME;
        intercepting = false;
        return result;
      }
      return originalNow();
    };
  })()`);
}

function createEmptyPerformance(): FramePerformance {
  return {
    fps: 0,
    frameTime: 0,
    jsHeapUsed: 0,
    jsHeapTotal: 0,
    domNodes: 0,
    gpuEstimatedMs: 0,
    scrollVelocity: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    pixelRatio: 1,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    programs: 0,
  };
}
