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
  private throttleMs = 200;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.hub = new BroadcastHub();
  }

  async connect() {
    await this.hub.join(this.roomId);
  }

  sendState(data: {
    scroll: number;
    distance: number;
    temp: number;
    timeDilation: number;
    tidalForce: number;
    fps: number;
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
