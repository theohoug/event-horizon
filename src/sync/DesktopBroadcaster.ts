/**
 * @file DesktopBroadcaster.ts
 * @description Broadcasts desktop experience state to companion devices
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { BroadcastHub } from './BroadcastHub';

export class DesktopBroadcaster {
  private hub: BroadcastHub;
  private lastSend = 0;
  private roomId: string;
  private throttleMs = 50;
  private companionConnected = false;
  private onCompanionJoinCbs: (() => void)[] = [];
  private onCompanionLeaveCbs: (() => void)[] = [];

  constructor(roomId: string) {
    this.roomId = roomId;
    this.hub = new BroadcastHub();
  }

  async connect() {
    this.hub.onPresence('companion_join', () => {
      this.companionConnected = true;
      this.onCompanionJoinCbs.forEach(cb => cb());
    });
    this.hub.onPresence('companion_leave', () => {
      this.companionConnected = false;
      this.onCompanionLeaveCbs.forEach(cb => cb());
    });
    await this.hub.join(this.roomId, 'desktop');
  }

  onCompanionJoin(cb: () => void) { this.onCompanionJoinCbs.push(cb); }
  onCompanionLeave(cb: () => void) { this.onCompanionLeaveCbs.push(cb); }
  get isCompanionConnected() { return this.companionConnected; }

  sendState(data: {
    scroll: number;
    distance: number;
    temp: number;
    timeDilation: number;
    tidalForce: number;
    fps: number;
    lang: string;
    chapter: number;
  }) {
    const now = performance.now();
    if (now - this.lastSend < this.throttleMs) return;
    this.lastSend = now;
    this.hub.send('state', data as unknown as Record<string, unknown>);
  }

  sendChapter(data: {
    index: number;
    title: string;
    subtitle: string;
    interstitial: string;
  }) {
    this.hub.send('chapter', data as unknown as Record<string, unknown>);
  }

  sendMeta(data: {
    lang: string;
    isAltered: boolean;
    isHardcore: boolean;
    totalChapters: number;
  }) {
    this.hub.send('meta', data as unknown as Record<string, unknown>);
  }

  sendScrollback() {
    this.hub.send('scrollback', { timestamp: Date.now() });
  }

  sendSurfaced() {
    this.hub.send('surfaced', { timestamp: Date.now() });
  }

  destroy() {
    this.hub.destroy();
  }
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
