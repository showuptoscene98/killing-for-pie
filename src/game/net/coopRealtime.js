/**
 * Supabase Realtime transport for online co-op.
 *
 * PeerJS Cloud TURN is dead (eu-0.turn.peerjs.com no longer resolves; OpenRelay
 * mints no relay candidates). Same-NAT WebRTC still works, but server-browser
 * joins across networks need a server relay — we already have Supabase.
 *
 * Protocol (broadcast on channel `kfp-room-{CODE}`):
 *   c2h  { from, msg }           client → host
 *   h2c  { to: id|'*', data }    host → one/all clients
 */

import { getSupabase, isSupabaseConfigured } from './supabaseClient';

export function canUseRealtime() {
  return isSupabaseConfigured && !!getSupabase();
}

export async function ensureRealtimeAuth(sb) {
  const { data: sessionData } = await sb.auth.getSession();
  if (sessionData?.session) return sessionData.session;
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

export function roomChannelName(code) {
  return `kfp-room-${String(code || '').toUpperCase()}`;
}

/**
 * Subscribe to a room channel. Resolves when SUBSCRIBED.
 * @returns {{ channel, clientId }}
 */
export async function joinRoomChannel(code, { onHostToClient, onClientToHost, onPresenceLeave }) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const session = await ensureRealtimeAuth(sb);
  const clientId = session.user.id;
  const topic = roomChannelName(code);

  // Drop a stale subscription to the same topic (HMR / re-host).
  try {
    const existing = sb.getChannels?.() || [];
    for (const ch of existing) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        await sb.removeChannel(ch);
      }
    }
  } catch {
    /* ignore */
  }

  const channel = sb.channel(topic, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: clientId },
    },
  });

  if (onHostToClient) {
    channel.on('broadcast', { event: 'h2c' }, ({ payload }) => {
      if (!payload) return;
      onHostToClient(payload);
    });
  }
  if (onClientToHost) {
    channel.on('broadcast', { event: 'c2h' }, ({ payload }) => {
      if (!payload) return;
      onClientToHost(payload);
    });
  }
  if (onPresenceLeave) {
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      onPresenceLeave(leftPresences || []);
    });
  }

  await new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error('Timed out joining online room channel')),
      12000
    );
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(t);
        resolve();
        return;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(t);
        reject(err || new Error(`Realtime ${status}`));
      }
    });
  });

  return { channel, clientId, sb };
}

export async function trackPresence(channel, meta) {
  try {
    await channel.track(meta || {});
  } catch (err) {
    console.warn('[coop rt] presence track', err);
  }
}

export function rtSendClientToHost(channel, from, msg) {
  if (!channel) return false;
  return channel.send({
    type: 'broadcast',
    event: 'c2h',
    payload: { from, msg },
  });
}

export function rtSendHostToClient(channel, to, data) {
  if (!channel) return false;
  return channel.send({
    type: 'broadcast',
    event: 'h2c',
    payload: { to: to || '*', data },
  });
}

export async function leaveRoomChannel(sb, channel) {
  if (!sb || !channel) return;
  try {
    await channel.untrack();
  } catch {
    /* ignore */
  }
  try {
    await sb.removeChannel(channel);
  } catch {
    /* ignore */
  }
}
