import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { DEFAULT_MAP_ID } from '../map/activeMap';

const SocialContext = createContext(null);

const HEARTBEAT_MS = 15000;

function normalizeFriendCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

export function SocialProvider({ children }) {
  // With no Supabase config there is nothing to wait for, so the offline case
  // starts out already resolved rather than being set from the auth effect.
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [available, setAvailable] = useState(isSupabaseConfigured);
  const [userId, setUserId] = useState(null);
  const [callsign, setCallsignState] = useState('Survivor');
  const [friendCode, setFriendCode] = useState('');
  const [friends, setFriends] = useState([]);
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [lobbies, setLobbies] = useState([]);
  const [error, setError] = useState('');
  const [listPublic, setListPublic] = useState(true);
  const lobbyIdRef = useRef(null);
  const heartbeatRef = useRef(null);

  const refreshProfile = useCallback(async (uid) => {
    const sb = getSupabase();
    if (!sb || !uid) return;
    const { data, error: err } = await sb
      .from('profiles')
      .select('callsign, friend_code')
      .eq('id', uid)
      .maybeSingle();
    if (err) {
      console.warn('[social] profile', err.message);
      return;
    }
    if (data) {
      setCallsignState(data.callsign || 'Survivor');
      setFriendCode(data.friend_code || '');
    }
  }, []);

  const refreshFriends = useCallback(async (uid) => {
    const sb = getSupabase();
    if (!sb || !uid) return;
    const { data, error: err } = await sb
      .from('friendships')
      .select('id, status, requester_id, addressee_id')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
    if (err) {
      console.warn('[social] friendships', err.message);
      return;
    }
    const ids = new Set();
    for (const row of data || []) {
      ids.add(row.requester_id);
      ids.add(row.addressee_id);
    }
    ids.delete(uid);
    const profileMap = {};
    if (ids.size) {
      const { data: profiles } = await sb
        .from('profiles')
        .select('id, callsign, friend_code')
        .in('id', [...ids]);
      for (const p of profiles || []) profileMap[p.id] = p;
    }
    const accepted = [];
    const incoming = [];
    const outgoing = [];
    for (const row of data || []) {
      const otherId = row.requester_id === uid ? row.addressee_id : row.requester_id;
      const other = profileMap[otherId] || {};
      const entry = {
        friendshipId: row.id,
        id: otherId,
        callsign: other.callsign || 'Survivor',
        friendCode: other.friend_code || '',
        status: row.status,
      };
      if (row.status === 'accepted') accepted.push(entry);
      else if (row.status === 'pending') {
        if (row.addressee_id === uid) incoming.push(entry);
        else outgoing.push(entry);
      }
    }
    setFriends(accepted);
    setPendingIncoming(incoming);
    setPendingOutgoing(outgoing);
  }, []);

  const refreshNotifications = useCallback(async (uid) => {
    const sb = getSupabase();
    if (!sb || !uid) return;
    const { data, error: err } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(40);
    if (err) {
      console.warn('[social] notifications', err.message);
      return;
    }
    setNotifications(data || []);
  }, []);

  const listLobbies = useCallback(
    async ({ tab = 'all' } = {}) => {
      const sb = getSupabase();
      if (!sb || !userId) {
        setLobbies([]);
        return [];
      }
      try {
        await sb.rpc('prune_stale_lobbies');
      } catch {
        /* optional */
      }
      // One RPC instead of a lobby query plus an N+1 profile lookup. It also
      // keeps host friend codes server-side: profiles is only readable for
      // yourself and people you already have a friendship row with.
      const { data, error: err } = await sb.rpc('list_open_lobbies');
      if (err) {
        console.warn('[social] lobbies', err.message);
        setError(err.message);
        return [];
      }
      setError('');
      let rows = (data || []).map((row) => ({
        ...row,
        hostCallsign: row.host_callsign || 'Host',
        isFriend: !!row.is_friend,
      }));
      if (tab === 'friends') {
        rows = rows.filter((r) => r.isFriend || r.host_id === userId);
      } else if (tab === 'public') {
        rows = rows.filter((r) => r.is_public);
      }
      setLobbies(rows);
      return rows;
    },
    [userId]
  );

  const ensureAuth = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data: sessionData } = await sb.auth.getSession();
      let session = sessionData?.session;
      if (!session) {
        const { data, error: signErr } = await sb.auth.signInAnonymously();
        if (signErr) throw signErr;
        session = data.session;
      }
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        // Ensure profile exists (trigger may race)
        const { data: existing } = await sb
          .from('profiles')
          .select('id')
          .eq('id', uid)
          .maybeSingle();
        if (!existing) {
          const code = Array.from({ length: 6 }, () =>
            'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
          ).join('');
          await sb.from('profiles').upsert({
            id: uid,
            callsign: 'Survivor',
            friend_code: code,
            // Shared Pie Guy schema: leave character_name empty to avoid
            // unique(character_name, server) collisions on default 'Survivor'.
            character_name: '',
          });
        }
        await refreshProfile(uid);
        await refreshFriends(uid);
        await refreshNotifications(uid);
      }
      setAvailable(true);
      setError('');
      return uid;
    } catch (err) {
      console.warn('[social] auth', err?.message || err);
      setError(err?.message || 'Social offline');
      setAvailable(false);
      return null;
    } finally {
      setReady(true);
    }
  }, [refreshProfile, refreshFriends, refreshNotifications]);

  useEffect(() => {
    // Anonymous sign-in is a network bootstrap, which is what effects are for.
    // The rule can't see that every setState inside ensureAuth happens after an
    // await, so it assumes the worst.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ensureAuth();
  }, [ensureAuth]);

  // Realtime subscriptions
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return undefined;

    const channel = sb
      .channel(`social-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => refreshNotifications(userId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => refreshFriends(userId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies' },
        () => listLobbies({ tab: 'all' })
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [userId, refreshNotifications, refreshFriends, listLobbies]);

  const setCallsign = useCallback(
    async (name) => {
      const n = String(name || '').trim().slice(0, 16) || 'Survivor';
      setCallsignState(n);
      const sb = getSupabase();
      if (!sb || !userId) return;
      const { error: err } = await sb
        .from('profiles')
        .update({ callsign: n, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (err) setError(err.message);
    },
    [userId]
  );

  const addFriendByCode = useCallback(
    async (codeRaw) => {
      const sb = getSupabase();
      if (!sb || !userId) throw new Error('Social not ready');
      const code = normalizeFriendCode(codeRaw);
      if (code.length < 6) throw new Error('Enter a valid friend code');
      if (code === friendCode) throw new Error('That is your own code');

      const { data: target, error: findErr } = await sb
        .rpc('find_profile_by_friend_code', { code })
        .maybeSingle();
      if (findErr) throw findErr;
      if (!target) throw new Error('No survivor with that code');

      const { data: friendship, error: friErr } = await sb
        .from('friendships')
        .insert({
          requester_id: userId,
          addressee_id: target.id,
          status: 'pending',
        })
        .select('id')
        .single();
      if (friErr) {
        if (friErr.code === '23505') throw new Error('Already friends or pending');
        throw friErr;
      }

      await sb.from('notifications').insert({
        user_id: target.id,
        type: 'friend_request',
        payload: {
          from_id: userId,
          from_callsign: callsign,
          friendship_id: friendship.id,
        },
      });

      await refreshFriends(userId);
      return target;
    },
    [userId, friendCode, callsign, refreshFriends]
  );

  const acceptFriend = useCallback(
    async (friendshipId) => {
      const sb = getSupabase();
      if (!sb || !userId) return;
      const { error: err } = await sb
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId)
        .eq('addressee_id', userId);
      if (err) throw err;
      await refreshFriends(userId);
    },
    [userId, refreshFriends]
  );

  const declineFriend = useCallback(
    async (friendshipId) => {
      const sb = getSupabase();
      if (!sb || !userId) return;
      const { error: err } = await sb
        .from('friendships')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', friendshipId)
        .eq('addressee_id', userId);
      if (err) throw err;
      await refreshFriends(userId);
    },
    [userId, refreshFriends]
  );

  const markNotificationRead = useCallback(
    async (id) => {
      const sb = getSupabase();
      if (!sb || !userId) return;
      await sb
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    [userId]
  );

  const dismissAllNotifications = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    await sb
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    setNotifications([]);
  }, [userId]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const publishLobby = useCallback(
    async ({ roomCode, mapId, playerCount = 1, isPublic = listPublic }) => {
      const sb = getSupabase();
      if (!sb || !userId || !roomCode) return null;

      // Close any previous open lobby for this host
      await sb
        .from('lobbies')
        .update({ status: 'closed' })
        .eq('host_id', userId)
        .in('status', ['open', 'playing']);

      const { data, error: err } = await sb
        .from('lobbies')
        .insert({
          host_id: userId,
          room_code: String(roomCode).toUpperCase(),
          map_id: mapId || DEFAULT_MAP_ID,
          player_count: playerCount,
          max_players: 4,
          is_public: !!isPublic,
          status: 'open',
          heartbeat_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (err) {
        console.warn('[social] publishLobby', err.message);
        setError(err.message);
        return null;
      }
      lobbyIdRef.current = data.id;
      stopHeartbeat();
      heartbeatRef.current = setInterval(async () => {
        const id = lobbyIdRef.current;
        if (!id) return;
        await sb
          .from('lobbies')
          .update({ heartbeat_at: new Date().toISOString() })
          .eq('id', id);
      }, HEARTBEAT_MS);
      return data.id;
    },
    [userId, listPublic, stopHeartbeat]
  );

  const heartbeatLobby = useCallback(
    async (patch = {}) => {
      const sb = getSupabase();
      const id = lobbyIdRef.current;
      if (!sb || !id) return;
      await sb
        .from('lobbies')
        .update({
          heartbeat_at: new Date().toISOString(),
          ...patch,
        })
        .eq('id', id);
    },
    []
  );

  const setLobbyPlaying = useCallback(async () => {
    await heartbeatLobby({ status: 'playing' });
  }, [heartbeatLobby]);

  const closeLobby = useCallback(async () => {
    stopHeartbeat();
    const sb = getSupabase();
    const id = lobbyIdRef.current;
    lobbyIdRef.current = null;
    if (!sb) return;
    if (id) {
      await sb.from('lobbies').update({ status: 'closed' }).eq('id', id);
    } else if (userId) {
      await sb
        .from('lobbies')
        .update({ status: 'closed' })
        .eq('host_id', userId)
        .in('status', ['open', 'playing']);
    }
  }, [stopHeartbeat, userId]);

  const inviteFriendToLobby = useCallback(
    async (friendUserId, roomCode, mapId) => {
      const sb = getSupabase();
      if (!sb || !userId || !friendUserId || !roomCode) {
        throw new Error('Cannot invite');
      }
      const { error: err } = await sb.from('notifications').insert({
        user_id: friendUserId,
        type: 'lobby_invite',
        payload: {
          from_id: userId,
          from_callsign: callsign,
          room_code: String(roomCode).toUpperCase(),
          map_id: mapId || DEFAULT_MAP_ID,
        },
      });
      if (err) throw err;
    },
    [userId, callsign]
  );

  useEffect(() => () => stopHeartbeat(), [stopHeartbeat]);

  const unreadCount = notifications.length;

  const value = useMemo(
    () => ({
      ready,
      available,
      configured: isSupabaseConfigured,
      userId,
      callsign,
      setCallsign,
      friendCode,
      friends,
      pendingIncoming,
      pendingOutgoing,
      notifications,
      unreadCount,
      lobbies,
      listPublic,
      setListPublic,
      error,
      listLobbies,
      addFriendByCode,
      acceptFriend,
      declineFriend,
      markNotificationRead,
      dismissAllNotifications,
      publishLobby,
      heartbeatLobby,
      setLobbyPlaying,
      closeLobby,
      inviteFriendToLobby,
      refreshFriends: () => refreshFriends(userId),
      refreshNotifications: () => refreshNotifications(userId),
    }),
    [
      ready,
      available,
      userId,
      callsign,
      setCallsign,
      friendCode,
      friends,
      pendingIncoming,
      pendingOutgoing,
      notifications,
      unreadCount,
      lobbies,
      listPublic,
      error,
      listLobbies,
      addFriendByCode,
      acceptFriend,
      declineFriend,
      markNotificationRead,
      dismissAllNotifications,
      publishLobby,
      heartbeatLobby,
      setLobbyPlaying,
      closeLobby,
      inviteFriendToLobby,
      refreshFriends,
      refreshNotifications,
    ]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
}
