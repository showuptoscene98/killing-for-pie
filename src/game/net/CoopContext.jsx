import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CoopSession } from './CoopSession';
import {
  buildInviteUrl,
  clearInviteFromUrl,
  randomPlayerName,
  readInviteFromUrl,
} from './roomCode';
import { DEFAULT_MAP_ID, loadSavedMapId, setActiveMap } from '../map/activeMap';

const CoopContext = createContext(null);

export function CoopProvider({ children }) {
  const sessionRef = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [role, setRole] = useState(null);
  const [joinAddress, setJoinAddress] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [backend, setBackend] = useState(null);
  const [players, setPlayers] = useState([]);
  const [localName, setLocalName] = useState(() => randomPlayerName());
  const [error, setError] = useState('');
  const [pendingJoin, setPendingJoin] = useState(() => readInviteFromUrl());
  const [mapId, setMapIdState] = useState(() => loadSavedMapId() || DEFAULT_MAP_ID);
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);

  const ensureSession = useCallback(() => {
    if (!sessionRef.current) sessionRef.current = new CoopSession();
    return sessionRef.current;
  }, []);

  useEffect(() => {
    const fromUrl = readInviteFromUrl();
    if (fromUrl) setPendingJoin(fromUrl);
  }, []);

  useEffect(() => {
    const session = ensureSession();
    return session.on((event, payload) => {
      if (event === 'status') {
        setPhase(payload.status);
        setError(payload.error || '');
        if (payload.status === 'idle') {
          setRole(null);
          setJoinAddress('');
          setRoomCode('');
          setInviteUrl('');
          setBackend(null);
          setPlayers([]);
          setJoinAsSpectator(false);
        }
      }
      if (event === 'lobby') {
        setJoinAddress(payload.joinAddress || payload.roomCode || '');
        setRoomCode(payload.roomCode || payload.joinAddress || '');
        setInviteUrl(
          payload.inviteUrl || buildInviteUrl(payload.roomCode || payload.joinAddress)
        );
        setBackend(payload.backend || sessionRef.current?.backend || null);
        const roster = Array.isArray(payload.players) ? payload.players : [];
        // Never wipe a non-empty roster with an empty lobby packet
        setPlayers((prev) => (roster.length > 0 ? roster : prev.length ? prev : roster));
        if (payload.mapId) {
          setMapIdState(payload.mapId);
          // Don't swap the hub world while still in lobby — Start applies the map
        }
        setJoinAsSpectator(false);
        setPhase('lobby');
      }
      if (event === 'start') {
        setPlayers(payload.players || []);
        const mid = payload.mapId || sessionRef.current?.mapId || DEFAULT_MAP_ID;
        setMapIdState(mid);
        // Apply map BEFORE React paints the game canvas (client was spawning void)
        setActiveMap(mid);
        // Stash on session so App mount can't clobber with stale React state
        if (sessionRef.current) sessionRef.current.mapId = mid;
        setJoinAsSpectator(!!payload.lateJoin || !!payload.spectator);
        setPhase('playing');
        clearInviteFromUrl();
      }
      if (event === 'playerJoined') {
        setPlayers((prev) => {
          if (prev.some((p) => p.id === payload.peerId)) {
            return prev.map((p) =>
              p.id === payload.peerId
                ? {
                    ...p,
                    name: payload.name || p.name,
                    spectator: payload.spectator ?? p.spectator,
                  }
                : p
            );
          }
          return [
            ...prev,
            {
              id: payload.peerId,
              name: payload.name || 'Survivor',
              isHost: false,
              spectator: !!payload.spectator,
            },
          ];
        });
      }
      if (event === 'hostLeft') {
        setError('Host left the game');
        setPhase('error');
      }
      if (event === 'disconnected') {
        setError(payload?.message || 'Disconnected');
        setPhase('error');
      }
    });
  }, [ensureSession]);

  const host = useCallback(
    async (name, mapOverride) => {
      const n = (name || localName).trim().slice(0, 16) || randomPlayerName();
      setLocalName(n);
      setRole('host');
      setError('');
      try {
        const session = ensureSession();
        const mid =
          mapOverride ||
          session.mapId ||
          mapId ||
          loadSavedMapId() ||
          DEFAULT_MAP_ID;
        session.mapId = mid;
        setMapIdState(mid);
        await session.host(n);
        // Host transport reset must not lose the chosen combat map
        session.mapId = mid;
        setMapIdState(mid);
        if (session.role === 'host') session.setMap(mid);
      } catch (err) {
        setPhase('error');
        const msg = err?.message || 'Failed to host';
        setError(msg);
        throw err instanceof Error ? err : new Error(msg);
      }
    },
    [ensureSession, localName, mapId]
  );

  const hostLan = useCallback(
    async (name) => {
      const n = (name || localName).trim().slice(0, 16) || randomPlayerName();
      setLocalName(n);
      setRole('host');
      setError('');
      try {
        await ensureSession().hostLan(n);
        const mid = mapId || loadSavedMapId() || DEFAULT_MAP_ID;
        setMapIdState(mid);
        ensureSession().setMap(mid);
      } catch (err) {
        setPhase('error');
        setError(err?.message || 'Failed to host LAN');
      }
    },
    [ensureSession, localName, mapId]
  );

  const join = useCallback(
    async (address, name) => {
      const n = (name || localName).trim().slice(0, 16) || randomPlayerName();
      setLocalName(n);
      setRole('client');
      setError('');
      setPendingJoin('');
      setPhase('connecting');
      try {
        await ensureSession().join(address, n);
      } catch (err) {
        setPhase('error');
        const msg = err?.message || 'Failed to join';
        setError(msg);
        throw err instanceof Error ? err : new Error(msg);
      }
    },
    [ensureSession, localName]
  );

  const joinLan = useCallback(
    async (address, name) => {
      const n = (name || localName).trim().slice(0, 16) || randomPlayerName();
      setLocalName(n);
      setRole('client');
      setError('');
      setPendingJoin('');
      try {
        await ensureSession().joinLan(address, n);
      } catch (err) {
        setPhase('error');
        setError(err?.message || 'Failed to join LAN');
      }
    },
    [ensureSession, localName]
  );

  const setMap = useCallback(
    (id, opts = {}) => {
      if (!id) return;
      const applyWorld = opts.applyWorld !== false;
      setMapIdState(id);
      if (applyWorld) setActiveMap(id);
      const session = ensureSession();
      // Always stash on session (works pre-host); broadcast only if already hosting
      session.mapId = id;
      if (session.role === 'host' && !session.started) {
        session.setMap(id);
      }
    },
    [ensureSession]
  );

  const startGame = useCallback(
    (explicitMapId) => {
      const session = ensureSession();
      const mid =
        explicitMapId ||
        session.mapId ||
        mapId ||
        loadSavedMapId() ||
        DEFAULT_MAP_ID;
      setMapIdState(mid);
      setActiveMap(mid);
      session.mapId = mid;
      session.startGame(mid);
    },
    [ensureSession, mapId]
  );

  const leave = useCallback(() => {
    ensureSession().destroy();
    setPhase('idle');
    setRole(null);
    setJoinAddress('');
    setRoomCode('');
    setInviteUrl('');
    setBackend(null);
    setPlayers([]);
    setError('');
    setJoinAsSpectator(false);
    clearInviteFromUrl();
  }, [ensureSession]);

  const consumePendingJoin = useCallback(() => {
    const code = pendingJoin;
    setPendingJoin('');
    return code;
  }, [pendingJoin]);

  const value = useMemo(
    () => ({
      sessionRef,
      phase,
      role,
      joinAddress,
      roomCode,
      inviteUrl: inviteUrl || buildInviteUrl(roomCode),
      backend,
      players,
      localName,
      setLocalName,
      error,
      pendingJoin,
      mapId,
      setMap,
      host,
      hostLan,
      join,
      joinLan,
      startGame,
      leave,
      consumePendingJoin,
      isHost: role === 'host',
      localId: sessionRef.current?.localId || '',
      joinAsSpectator,
    }),
    [
      phase,
      role,
      joinAddress,
      roomCode,
      inviteUrl,
      backend,
      players,
      localName,
      error,
      pendingJoin,
      mapId,
      setMap,
      host,
      hostLan,
      join,
      joinLan,
      startGame,
      leave,
      consumePendingJoin,
      joinAsSpectator,
    ]
  );

  return <CoopContext.Provider value={value}>{children}</CoopContext.Provider>;
}

export function useCoop() {
  const ctx = useContext(CoopContext);
  if (!ctx) throw new Error('useCoop must be used within CoopProvider');
  return ctx;
}
