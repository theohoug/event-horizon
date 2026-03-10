/**
 * @file a11y-checker.ts
 * @description Accessibility audit covering WCAG contrast, keyboard nav, ARIA, reduced motion, and screen readers
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { Page } from 'playwright';
import type { AccessibilityReport } from '../types';
import { log, phaseStart, phaseEnd } from '../utils/logger';

interface ContrastIssue {
  element: string;
  ratio: number;
  required: number;
}

function luminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map((v) => {
    const normalized = v / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function checkContrastRatios(page: Page): Promise<ContrastIssue[]> {
  return page.evaluate(`(function() {
    var issues = [];

    function getLuminance(r, g, b) {
      var sRGB = [r, g, b].map(function(v) {
        var n = v / 255;
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    }

    function parseColor(colorStr) {
      var rgbMatch = colorStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (rgbMatch) {
        return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
      }
      return null;
    }

    function getContrastRatio(l1, l2) {
      var lighter = Math.max(l1, l2);
      var darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    var textElements = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, span, a, button, label, li, td, th, div'
    );

    var checked = {};

    var elements = Array.from(textElements).slice(0, 200);
    for (var ei = 0; ei < elements.length; ei++) {
      var htmlEl = elements[ei];
      var text = htmlEl.innerText ? htmlEl.innerText.trim() : '';
      if (!text || text.length === 0) continue;

      var style = window.getComputedStyle(htmlEl);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        continue;
      }

      var fgColor = parseColor(style.color);
      var bgColor = parseColor(style.backgroundColor);

      if (!fgColor || !bgColor) continue;

      var bgAlphaMatch = style.backgroundColor.match(/rgba?\\(\\d+,\\s*\\d+,\\s*\\d+,\\s*([\\d.]+)/);
      if (bgAlphaMatch && parseFloat(bgAlphaMatch[1]) < 0.1) continue;

      var fgLum = getLuminance(fgColor[0], fgColor[1], fgColor[2]);
      var bgLum = getLuminance(bgColor[0], bgColor[1], bgColor[2]);
      var ratio = getContrastRatio(fgLum, bgLum);

      var fontSize = parseFloat(style.fontSize);
      var fontWeight = parseInt(style.fontWeight) || 400;
      var isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      var requiredRatio = isLargeText ? 3.0 : 4.5;

      var elementId = htmlEl.tagName + ':' + text.substring(0, 30);
      if (checked[elementId]) continue;
      checked[elementId] = true;

      if (ratio < requiredRatio) {
        issues.push({
          element: '<' + htmlEl.tagName.toLowerCase() + '> "' + text.substring(0, 50) + '"',
          ratio: Math.round(ratio * 100) / 100,
          required: requiredRatio
        });
      }
    }

    return issues;
  })()`);
}

async function checkKeyboardNavigation(page: Page): Promise<{
  navigable: boolean;
  focusVisible: boolean;
  reachableCount: number;
}> {
  return page.evaluate(`(function() {
    var focusableSelectors = [
      'a[href]', 'button', 'input', 'select', 'textarea',
      '[tabindex]:not([tabindex="-1"])', '[role="button"]'
    ];

    var focusableElements = document.querySelectorAll(focusableSelectors.join(', '));
    var reachableCount = focusableElements.length;

    var focusVisible = false;
    var elements = Array.from(focusableElements).slice(0, 10);
    for (var i = 0; i < elements.length; i++) {
      var htmlEl = elements[i];
      htmlEl.focus();

      if (document.activeElement === htmlEl) {
        var style = window.getComputedStyle(htmlEl);
        var outlineStyle = style.outlineStyle;
        var outlineWidth = parseFloat(style.outlineWidth);
        var boxShadow = style.boxShadow;

        if (
          (outlineStyle !== 'none' && outlineWidth > 0) ||
          (boxShadow && boxShadow !== 'none')
        ) {
          focusVisible = true;
          break;
        }
      }
    }

    return {
      navigable: reachableCount > 0,
      focusVisible: focusVisible,
      reachableCount: reachableCount
    };
  })()`);
}

async function checkAriaLabels(page: Page): Promise<{
  sectionsLabeled: boolean;
  buttonsLabeled: boolean;
  canvasAccessible: boolean;
  labeledCount: number;
  unlabeledCount: number;
}> {
  return page.evaluate(`(function() {
    var sections = document.querySelectorAll('section, [role="region"]');
    var sectionsWithLabel = 0;
    var sectionArr = Array.from(sections);
    for (var i = 0; i < sectionArr.length; i++) {
      if (sectionArr[i].getAttribute('aria-label') || sectionArr[i].getAttribute('aria-labelledby')) {
        sectionsWithLabel++;
      }
    }
    var sectionsLabeled = sections.length === 0 || sectionsWithLabel >= sections.length * 0.8;

    var buttons = document.querySelectorAll('button, [role="button"]');
    var buttonsWithLabel = 0;
    var buttonArr = Array.from(buttons);
    for (var bi = 0; bi < buttonArr.length; bi++) {
      var btn = buttonArr[bi];
      var hasLabel = btn.getAttribute('aria-label') ||
        btn.getAttribute('aria-labelledby') ||
        btn.getAttribute('title') ||
        (btn.textContent ? btn.textContent.trim().length : 0) > 0;
      if (hasLabel) buttonsWithLabel++;
    }
    var buttonsLabeled = buttons.length === 0 || buttonsWithLabel >= buttons.length * 0.8;

    var canvases = document.querySelectorAll('canvas');
    var canvasAccessible = true;
    var canvasArr = Array.from(canvases);
    for (var ci = 0; ci < canvasArr.length; ci++) {
      var canvas = canvasArr[ci];
      var hasRole = canvas.getAttribute('role');
      var hasCLabel = canvas.getAttribute('aria-label') || canvas.getAttribute('aria-labelledby');
      if (!hasRole && !hasCLabel) {
        canvasAccessible = false;
        break;
      }
    }

    var allInteractive = document.querySelectorAll(
      'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="tab"]'
    );
    var labeledCount = 0;
    var unlabeledCount = 0;
    var interactiveArr = Array.from(allInteractive);
    for (var ii = 0; ii < interactiveArr.length; ii++) {
      var el = interactiveArr[ii];
      var elHasLabel = el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('title') ||
        (el.textContent ? el.textContent.trim().length : 0) > 0;
      if (elHasLabel) labeledCount++;
      else unlabeledCount++;
    }

    return {
      sectionsLabeled: sectionsLabeled,
      buttonsLabeled: buttonsLabeled,
      canvasAccessible: canvasAccessible,
      labeledCount: labeledCount,
      unlabeledCount: unlabeledCount
    };
  })()`);
}

async function checkReducedMotion(page: Page): Promise<boolean> {
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1000);

    const respected = await page.evaluate(`(function() {
      var mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!mediaQuery.matches) return false;

      var allElements = document.querySelectorAll('*');
      var hasReducedAnimations = false;

      var elements = Array.from(allElements).slice(0, 100);
      for (var i = 0; i < elements.length; i++) {
        var style = window.getComputedStyle(elements[i]);
        var animDuration = style.animationDuration;
        var transDuration = style.transitionDuration;

        if (animDuration === '0s' || transDuration === '0s') {
          hasReducedAnimations = true;
        }
      }

      return hasReducedAnimations;
    })()`);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    return respected;
  } catch {
    return false;
  }
}

async function checkScreenReaderFriendliness(page: Page): Promise<{
  hasHeadingHierarchy: boolean;
  hasLandmarks: boolean;
  hasSkipLink: boolean;
  hasAltText: boolean;
}> {
  return page.evaluate(`(function() {
    var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    var hasHeadingHierarchy = false;

    if (headings.length > 0) {
      var levels = Array.from(headings).map(function(h) {
        return parseInt(h.tagName.replace('H', ''));
      });
      var hasH1 = levels.indexOf(1) !== -1;
      var isOrdered = true;
      for (var i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i - 1] + 2) {
          isOrdered = false;
          break;
        }
      }
      hasHeadingHierarchy = hasH1 && isOrdered;
    }

    var hasMain = !!document.querySelector('main, [role="main"]');
    var hasNav = !!document.querySelector('nav, [role="navigation"]');
    var hasLandmarks = hasMain || hasNav;

    var skipLink = document.querySelector(
      'a[href="#main"], a[href="#content"], a[href="#main-content"], .skip-link, .skip-to-content'
    );
    var hasSkipLink = !!skipLink;

    var images = document.querySelectorAll('img');
    var imagesWithAlt = 0;
    var imgArr = Array.from(images);
    for (var ii = 0; ii < imgArr.length; ii++) {
      if (imgArr[ii].getAttribute('alt') !== null) imagesWithAlt++;
    }
    var hasAltText = images.length === 0 || imagesWithAlt >= images.length * 0.8;

    return {
      hasHeadingHierarchy: hasHeadingHierarchy,
      hasLandmarks: hasLandmarks,
      hasSkipLink: hasSkipLink,
      hasAltText: hasAltText
    };
  })()`);
}

async function checkFocusManagement(page: Page): Promise<boolean> {
  try {
    const navDot = await page.$(
      '.nav-dot, [data-nav-dot], .scroll-indicator-dot, .chapter-dot',
    );

    if (navDot) {
      await navDot.click();
      await page.waitForTimeout(500);

      const focusMoved = await page.evaluate(`(function() {
        var active = document.activeElement;
        return active !== null && active !== document.body;
      })()`);

      return focusMoved;
    }

    return false;
  } catch {
    return false;
  }
}

function calculateA11yScore(
  contrastIssues: ContrastIssue[],
  keyboardNav: { navigable: boolean; focusVisible: boolean },
  ariaLabels: { sectionsLabeled: boolean; buttonsLabeled: boolean; canvasAccessible: boolean },
  reducedMotionRespected: boolean,
  screenReader: {
    hasHeadingHierarchy: boolean;
    hasLandmarks: boolean;
    hasSkipLink: boolean;
    hasAltText: boolean;
  },
  focusManaged: boolean,
): number {
  let score = 100;

  const contrastPenalty = Math.min(contrastIssues.length * 5, 25);
  score -= contrastPenalty;

  if (!keyboardNav.navigable) score -= 15;
  if (!keyboardNav.focusVisible) score -= 10;

  if (!ariaLabels.sectionsLabeled) score -= 8;
  if (!ariaLabels.buttonsLabeled) score -= 8;
  if (!ariaLabels.canvasAccessible) score -= 5;

  if (!reducedMotionRespected) score -= 10;

  if (!screenReader.hasHeadingHierarchy) score -= 5;
  if (!screenReader.hasLandmarks) score -= 5;
  if (!screenReader.hasSkipLink) score -= 5;
  if (!screenReader.hasAltText) score -= 4;

  if (!focusManaged) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export async function runAccessibilityAudit(page: Page): Promise<AccessibilityReport> {
  phaseStart('Accessibility');

  log('Checking contrast ratios...', 'info');
  const contrastIssues = await checkContrastRatios(page);
  log(`Found ${contrastIssues.length} contrast issue(s)`, contrastIssues.length > 0 ? 'warn' : 'success');

  log('Checking keyboard navigation...', 'info');
  const keyboardNav = await checkKeyboardNavigation(page);
  log(
    `Keyboard: navigable=${keyboardNav.navigable}, focusVisible=${keyboardNav.focusVisible}, elements=${keyboardNav.reachableCount}`,
    keyboardNav.focusVisible ? 'success' : 'warn',
  );

  log('Checking ARIA labels...', 'info');
  const ariaLabels = await checkAriaLabels(page);
  log(
    `ARIA: sections=${ariaLabels.sectionsLabeled}, buttons=${ariaLabels.buttonsLabeled}, canvas=${ariaLabels.canvasAccessible}`,
    ariaLabels.sectionsLabeled && ariaLabels.buttonsLabeled ? 'success' : 'warn',
  );

  log('Checking prefers-reduced-motion...', 'info');
  const reducedMotionRespected = await checkReducedMotion(page);
  log(`Reduced motion: ${reducedMotionRespected ? 'respected' : 'not respected'}`, reducedMotionRespected ? 'success' : 'warn');

  log('Checking screen reader friendliness...', 'info');
  const screenReader = await checkScreenReaderFriendliness(page);
  log(
    `Screen reader: headings=${screenReader.hasHeadingHierarchy}, landmarks=${screenReader.hasLandmarks}, skipLink=${screenReader.hasSkipLink}`,
    screenReader.hasLandmarks ? 'success' : 'warn',
  );

  log('Checking focus management...', 'info');
  const focusManaged = await checkFocusManagement(page);

  const score = calculateA11yScore(
    contrastIssues,
    keyboardNav,
    ariaLabels,
    reducedMotionRespected,
    screenReader,
    focusManaged,
  );

  log(`Accessibility score: ${score}/100`, score >= 80 ? 'success' : 'warn');

  phaseEnd('Accessibility');

  return {
    contrastIssues,
    keyboardNavigable: keyboardNav.navigable,
    ariaLabelsPresent: ariaLabels.sectionsLabeled && ariaLabels.buttonsLabeled,
    reducedMotionRespected,
    focusIndicatorsVisible: keyboardNav.focusVisible,
    screenReaderFriendly:
      screenReader.hasHeadingHierarchy &&
      screenReader.hasLandmarks &&
      screenReader.hasAltText,
    score,
  };
}
