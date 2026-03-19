/**
 * @file BroadcastHub.ts
 * @description Supabase Realtime Broadcast wrapper for companion sync
 * @author Cleanlystudio
 * @version 1.0.0
 */

const SUPABASE_URL = 'https://uqqdxumehqmhwotgggqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcWR4dW1laHFtaHdvdGdnZ3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mjg4ODIsImV4cCI6MjA4NTEwNDg4Mn0.9HXL-9ceR-zYISblHRMeYEMl-7Uis4RNMJoCCG00At8';

export type BroadcastEvent = 'state' | 'chapter' | 'meta' | 'scrollback' | 'surfaced';
export type PresenceEvent = 'companion_join' | 'companion_leave';
export type BroadcastCallback = (payload: Record<string, unknown>) => void;
export type PresenceCallback = () => void;

export class BroadcastHub {
  private channel: ReturnType<Awaited<ReturnType<typeof this.getClient>>['channel']> | null = null;
  private client: Awaited<ReturnType<typeof this.getClient>> | null = null;
  private listeners = new Map<string, BroadcastCallback[]>();
  private presenceListeners = new Map<string, PresenceCallback[]>();
  private role: 'desktop' | 'companion' = 'desktop';

  private async getClient() {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }

  async join(roomId: string, role: 'desktop' | 'companion' = 'desktop') {
    this.role = role;
    this.client = await this.getClient();
    this.channel = this.client.channel(`eh-${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: role } },
    });

    this.channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      this.emit('state', payload);
    });
    this.channel.on('broadcast', { event: 'chapter' }, ({ payload }) => {
      this.emit('chapter', payload);
    });
    this.channel.on('broadcast', { event: 'meta' }, ({ payload }) => {
      this.emit('meta', payload);
    });
    this.channel.on('broadcast', { event: 'scrollback' }, ({ payload }) => {
      this.emit('scrollback', payload);
    });
    this.channel.on('broadcast', { event: 'surfaced' }, ({ payload }) => {
      this.emit('surfaced', payload);
    });

    this.channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key === 'companion') this.emitPresence('companion_join');
    });
    this.channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === 'companion') this.emitPresence('companion_leave');
    });

    await this.channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await this.channel!.track({ role, joined: Date.now() });
      }
    });
  }

  async send(event: BroadcastEvent, payload: Record<string, unknown>) {
    if (!this.channel) return;
    await this.channel.send({ type: 'broadcast', event, payload });
  }

  on(event: BroadcastEvent, cb: BroadcastCallback) {
    const list = this.listeners.get(event) || [];
    list.push(cb);
    this.listeners.set(event, list);
  }

  onPresence(event: PresenceEvent, cb: PresenceCallback) {
    const list = this.presenceListeners.get(event) || [];
    list.push(cb);
    this.presenceListeners.set(event, list);
  }

  private emit(event: string, payload: Record<string, unknown>) {
    const list = this.listeners.get(event);
    if (list) list.forEach(cb => cb(payload));
  }

  private emitPresence(event: string) {
    const list = this.presenceListeners.get(event);
    if (list) list.forEach(cb => cb());
  }

  getPresenceCount(): number {
    if (!this.channel) return 0;
    const state = this.channel.presenceState();
    return Object.keys(state).filter(k => k === 'companion').length;
  }

  destroy() {
    if (this.channel) this.channel.unsubscribe();
    if (this.client) this.client.removeAllChannels();
  }
}
