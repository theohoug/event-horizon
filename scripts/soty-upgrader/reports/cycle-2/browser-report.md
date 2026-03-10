# Cross-Browser Compatibility Report

**Generated:** 2026-03-09T20:15:02.006Z
**Browsers tested:** chromium, firefox, webkit

## Browser Summary

| Browser | Captures | Issues | Avg FPS |
|---------|----------|--------|---------|
| chromium | 0 | 1 | 0 |
| firefox | 0 | 1 | 0 |
| webkit | 0 | 1 | 0 |

## Visual Differences

No significant visual differences detected across browsers.

## WebKit/Safari Issues

**Critical — Awwwards jury uses Safari/Mac:**
- Failed to launch webkit: Error: browserType.launch: Executable doesn't exist at C:\Users\theoo\AppData\Local\ms-playwright\webkit-2248\Playwright.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝

## All Browser Issues

### chromium
- chromium session error: Error: page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:290:30), <anonymous>:1:1671)
    at UtilityScript.evaluate (<anonymous>:292:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

### firefox
- Failed to launch firefox: Error: browserType.launch: Executable doesn't exist at C:\Users\theoo\AppData\Local\ms-playwright\firefox-1509\firefox\firefox.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝

### webkit
- Failed to launch webkit: Error: browserType.launch: Executable doesn't exist at C:\Users\theoo\AppData\Local\ms-playwright\webkit-2248\Playwright.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
