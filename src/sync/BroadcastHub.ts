/**
 * @file BroadcastHub.ts
 * @description Supabase Realtime Broadcast wrapper for companion sync
 * @author Cleanlystudio
 * @version 1.0.0
 */

const SUPABASE_URL = 'https://uqqdxumehqmhwotgggqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcWR4dW1laHFtaHdvdGdnZ3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mjg4ODIsImV4cCI6MjA4NTEwNDg4Mn0.9HXL-9ceR-zYISblHRMeYEMl-7Uis4RNMJoCCG00At8';

export type BroadcastEvent = 'state' | 'chapter' | 'meta';
export type BroadcastCallback = (payload: Record<string, unknown>) => void;

export class BroadcastHub {
  private channel: ReturnType<Awaited<ReturnType<typeof this.getClient>>['channel']> | null = null;
  private client: Awaited<ReturnType<typeof this.getClient>> | null = null;
  private listeners = new Map<string, BroadcastCallback[]>();

  private async getClient() {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }

  async join(roomId: string) {
    this.client = await this.getClient();
    this.channel = this.client.channel(`eh-${roomId}`, {
      config: { broadcast: { self: false } },
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

    await this.channel.subscribe();
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

  private emit(event: string, payload: Record<string, unknown>) {
    const list = this.listeners.get(event);
    if (list) list.forEach(cb => cb(payload));
  }

  destroy() {
    if (this.channel) this.channel.unsubscribe();
    if (this.client) this.client.removeAllChannels();
  }
}
