/**
 * @file haptics-ios.ts
 * @description Cross-platform haptic feedback — works on iOS Safari via checkbox hack
 * @author Cleanlystudio
 */

let switchEl: HTMLInputElement | null = null;
let labelEl: HTMLLabelElement | null = null;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const hasVibrate = 'vibrate' in navigator;

function ensureSwitch() {
  if (switchEl) return;
  switchEl = document.createElement('input');
  switchEl.type = 'checkbox';
  switchEl.setAttribute('switch', '');
  switchEl.id = 'eh-haptic-switch';
  switchEl.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;pointer-events:none;width:0;height:0';
  labelEl = document.createElement('label');
  labelEl.htmlFor = 'eh-haptic-switch';
  labelEl.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;pointer-events:none;width:0;height:0';
  document.body.appendChild(switchEl);
  document.body.appendChild(labelEl);
}

export function hapticPulse(intensity = 0.5) {
  if (hasVibrate) {
    navigator.vibrate(Math.round(20 + intensity * 80));
    return;
  }
  if (isIOS) {
    ensureSwitch();
    if (labelEl) labelEl.click();
  }
}

export function hapticPattern(pattern: number[]) {
  if (hasVibrate) {
    navigator.vibrate(pattern);
    return;
  }
  if (isIOS) {
    ensureSwitch();
    if (labelEl) labelEl.click();
  }
}
