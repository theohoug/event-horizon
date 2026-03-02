/**
 * @file Haptics.ts
 * @description Vibration API integration synchronized with visual experience
 * @author Cleanlystudio
 * @version 1.0.0
 */

const PATTERNS = {
  approach: [50, 30, 50, 30, 80, 40, 120, 60, 200],
  impact: [500],
  heartbeat: [100, 200, 100, 800],
  disintegrate: [20, 10, 20, 10, 20, 10, 20, 10, 20, 10],
  silence: [0],
} as const;

export class Haptics {
  private supported: boolean;
  private lastTrigger = 0;
  private cooldown = 500;

  constructor() {
    this.supported = 'vibrate' in navigator;
  }

  private canTrigger(): boolean {
    const now = Date.now();
    if (now - this.lastTrigger < this.cooldown) return false;
    this.lastTrigger = now;
    return this.supported;
  }

  pulse(intensity: number) {
    if (!this.canTrigger()) return;
    const duration = Math.round(20 + intensity * 100);
    navigator.vibrate(duration);
  }

  approach() {
    if (!this.canTrigger()) return;
    navigator.vibrate([...PATTERNS.approach]);
    this.cooldown = 2000;
  }

  impact() {
    if (!this.canTrigger()) return;
    navigator.vibrate([...PATTERNS.impact]);
    this.cooldown = 1000;
  }

  heartbeat() {
    if (!this.canTrigger()) return;
    navigator.vibrate([...PATTERNS.heartbeat]);
    this.cooldown = 1200;
  }

  disintegrate() {
    if (!this.canTrigger()) return;
    navigator.vibrate([...PATTERNS.disintegrate]);
    this.cooldown = 300;
  }

  stop() {
    if (this.supported) navigator.vibrate(0);
  }

  private triggeredZones = new Set<number>();

  update(scroll: number) {
    if (!this.supported) return;

    const zone = Math.floor(scroll * 9);
    if (!this.triggeredZones.has(zone) && zone > 0) {
      this.triggeredZones.add(zone);
      this.pulse(0.2 + scroll * 0.5);
    }

    if (scroll > 0.4 && scroll < 0.6) {
      this.disintegrate();
    } else if (scroll > 0.7 && scroll < 0.85) {
      this.approach();
    } else if (scroll > 0.85 && scroll < 0.95) {
      this.heartbeat();
    } else if (scroll >= 0.95) {
      this.impact();
    }
  }
}
