import Peer from 'peerjs';
import {
  MAX_COOP_PLAYERS,
  generateRoomCode,
  normalizeRoomCode,
  isRoomCode,
  peerIdFromRoomCode,
  roomCodeFromPeerId,
  buildInviteUrl,
} from './roomCode';
import { defaultHostWsUrl, parseJoinAddress } from './lanAddress';

const CLIENT_PING_MS = 4000;
const RECONNECT_MAX = 3;
const RECONNECT_BASE_MS = 600;
const PEER_HOST_TRIES = 5;
const PEER_DISCONNECT_GRACE_MS = 8000;

const PEER_OPTIONS = {
  debug: 0,
  // Default binarypack is fine for small control msgs; we JSON.stringify ourselves
  // for start/lobby so both sides always decode the same way.
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  },
};

/**
 * Host-star co-op:
 * - Default: PeerJS (free cloud signaling + WebRTC) — share ?coop=CODE links
 * - Fallback: LAN WebSocket relay (private IPs) via joinLan / hostLan
 */
export class CoopSession {
  constructor() {
    this.role = null; // 'host' | 'client'
    this.backend = null; // 'peer' | 'lan'
    this.roomCode = '';
    this.joinAddress = '';
    this.inviteUrl = '';
    this.localId = '';
    this.localName = '';
    this.ws = null;
    this.peer = null;
    this._conn = null; // client → host DataConnection
    this._conns = new Map(); // host: peerId → DataConnection
    this.players = [];
    this.started = false;
    this.destroyed = false;
    this._listeners = new Set();
    this._status = 'idle';
    this._error = '';
    this._hostId = '';
    this.mapId = null;
    this._wsUrl = '';
    this._pingTimer = null;
    this._reconnectTimer = null;
    this._reconnectAttempts = 0;
    this._intentionalClose = false;
    this._lastPongAt = 0;
    this._disconnectTimer = null;
    this._lobbyPullTimer = null;
  }

  get status() {
    return this._status;
  }

  get error() {
    return this._error;
  }

  get playerCount() {
    return this.players.length;
  }

  on(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(event, payload) {
    this._listeners.forEach((fn) => {
      try {
        fn(event, payload);
      } catch (err) {
        console.error('[coop]', err);
      }
    });
  }

  _setStatus(status, error = '') {
    this._status = status;
    this._error = error;
    this._emit('status', { status, error });
  }

  _lobbyPayload() {
    return {
      roomCode: this.roomCode,
      joinAddress: this.joinAddress || this.roomCode,
      inviteUrl: this.inviteUrl || buildInviteUrl(this.roomCode),
      hostId: this._hostId || this.localId,
      players: this.players.map((p) => ({ ...p })),
      maxPlayers: MAX_COOP_PLAYERS,
      mapId: this.mapId || 'camp',
      backend: this.backend,
    };
  }

  _syncInvite() {
    if (this.backend === 'peer' && this.roomCode) {
      this.inviteUrl = buildInviteUrl(this.roomCode);
      this.joinAddress = this.roomCode;
    }
  }

  _safeSend(conn, msg) {
    if (!conn) return false;
    // Prefer plain objects — PeerJS json/binary both handle them.
    // Strings are still accepted (legacy / queue flush).
    const payload =
      msg && typeof msg === 'object'
        ? msg
        : typeof msg === 'string'
          ? msg
          : JSON.stringify(msg);

    // PeerJS throws if you .send() before the DataConnection 'open' event.
    if (!conn.open) {
      if (!conn.__kfpQueue) {
        conn.__kfpQueue = [];
        const flush = () => {
          const q = conn.__kfpQueue || [];
          conn.__kfpQueue = [];
          for (let i = 0; i < q.length; i++) {
            try {
              if (conn.open) conn.send(q[i]);
            } catch (err) {
              console.warn('[coop] flush send failed', err);
            }
          }
        };
        conn.on('open', flush);
      }
      if (conn.__kfpQueue.length < 48) conn.__kfpQueue.push(payload);
      return false;
    }

    try {
      conn.send(payload);
      return true;
    } catch (_err) {
      // Fallback: some peers only accept strings
      try {
        conn.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
        return true;
      } catch (err2) {
        console.warn('[coop] send failed', err2);
        return false;
      }
    }
  }

  _startPayload({ lateJoin = false, spectator = false } = {}) {
    return {
      type: 'start',
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: !!p.isHost,
        spectator: !!p.spectator,
      })),
      mapId: this.mapId || 'camp',
      lateJoin: !!lateJoin,
      spectator: !!spectator,
    };
  }

  /** Every live DataConnection we know about (map + PeerJS internals). */
  _allDataConns() {
    const set = new Set();
    this._conns.forEach((c) => {
      if (c) set.add(c);
    });
    const bag = this.peer?.connections;
    if (bag && typeof bag === 'object') {
      Object.keys(bag).forEach((pid) => {
        const list = bag[pid];
        if (!Array.isArray(list)) return;
        list.forEach((c) => {
          if (c && c.type !== 'media') set.add(c);
        });
      });
    }
    if (this._conn) set.add(this._conn);
    return [...set];
  }

  _clearDisconnectGrace() {
    if (this._disconnectTimer) {
      clearTimeout(this._disconnectTimer);
      this._disconnectTimer = null;
    }
  }

  _scheduleDisconnectGrace(message) {
    if (this.destroyed || this._intentionalClose) return;
    if (this._disconnectTimer) return;
    this._disconnectTimer = setTimeout(() => {
      this._disconnectTimer = null;
      if (this.destroyed || this._intentionalClose) return;
      // Still have a live data channel? Ignore transient signaling blips.
      if (this.backend === 'peer') {
        if (this.role === 'client' && this._conn?.open) return;
        if (this.role === 'host') {
          const anyOpen = [...this._conns.values()].some((c) => c.open);
          if (anyOpen || !this.started) {
            // Host can keep lobby / match if signaling alone flaked
            try {
              this.peer?.reconnect?.();
            } catch (_) {
              /* ignore */
            }
            return;
          }
        }
      }
      this._failDisconnect(message);
    }, PEER_DISCONNECT_GRACE_MS);
  }

  // ─── Public API ─────────────────────────────────────────────

  async host(name) {
    return this.hostOnline(name);
  }

  async join(codeOrAddress, name) {
    const raw = String(codeOrAddress || '').trim();
    if (parseJoinAddress(raw).ok) {
      return this.joinLan(raw, name);
    }
    return this.joinOnline(raw, name);
  }

  async hostOnline(name) {
    this.destroyTransportOnly();
    this.destroyed = false;
    this.backend = 'peer';
    this.role = 'host';
    this.localName = name;
    this.started = false;
    this.players = [];
    this._conns.clear();
    this._setStatus('connecting');

    try {
      const { peer, code } = await this._createHostPeer();
      if (this.destroyed) {
        try {
          peer.destroy();
        } catch (_) {
          /* ignore */
        }
        throw new Error('Host cancelled');
      }
      this.peer = peer;
      this.roomCode = code;
      this.localId = 'host';
      this._hostId = 'host';
      this.players = [{ id: 'host', name, isHost: true }];
      this._syncInvite();
      this._wireHostPeer(peer);
      this._startPeerKeepalive();
      this._setStatus('lobby');
      this._emit('lobby', this._lobbyPayload());
    } catch (err) {
      const msg =
        err?.message || 'Failed to create online room — check network / adblock';
      this._setStatus('error', msg);
      throw new Error(msg, { cause: err });
    }
  }

  async joinOnline(rawCode, name) {
    this.destroyTransportOnly();
    this.destroyed = false;
    this.backend = 'peer';
    this.role = 'client';
    this.localName = name;
    this.started = false;
    this._setStatus('connecting');

    const code = normalizeRoomCode(rawCode);
    if (!isRoomCode(code)) {
      const msg = 'Enter a room code (or paste the invite link)';
      this._setStatus('error', msg);
      throw new Error(msg);
    }

    this.roomCode = code;
    this._syncInvite();

    try {
      const peer = await this._openPeer();
      if (this.destroyed) {
        peer.destroy();
        throw new Error('Join cancelled');
      }
      this.peer = peer;
      // Stable id = our PeerJS id (host stores us as conn.peer)
      this.localId = peer.id;

      this._wireClientPeer(peer);

      const hostPeerId = peerIdFromRoomCode(code);
      // json serialization — reliable object round-trips (avoids binary Uint8Array drops)
      const conn = peer.connect(hostPeerId, {
        reliable: true,
        serialization: 'json',
      });
      this._conn = conn;

      await this._waitConnOpen(conn);
      if (this.destroyed) throw new Error('Join cancelled');

      this._attachClientConn(conn);
      this._startPeerKeepalive();
      this._safeSend(conn, { type: 'join', name });
      // Keep asking until we get pulled into a match (covers missed start packets)
      this._startLobbyPull();
      // Stay pending until lobby/start so callers know join actually worked
      await this._waitForLobbyOrStart(20000);
    } catch (err) {
      const msg =
        err?.message ||
        'Cannot reach host — check the code, and that they still have the lobby open';
      this._setStatus('error', msg);
      throw new Error(msg, { cause: err });
    }
  }

  async hostLan(name) {
    this.destroyTransportOnly();
    this.destroyed = false;
    this.backend = 'lan';
    this.role = 'host';
    this.localName = name;
    this.started = false;
    this._reconnectAttempts = 0;
    this._wsUrl = defaultHostWsUrl();
    this._setStatus('connecting');

    try {
      await this._connectWs(this._wsUrl);
      if (this.destroyed) return;
      this._wsSend({ type: 'host', name });
    } catch (err) {
      this._setStatus(
        'error',
        err?.message ||
          'Cannot reach LAN coop relay — run npm start (includes relay) or npm run coop-server'
      );
    }
  }

  async joinLan(address, name) {
    this.destroyTransportOnly();
    this.destroyed = false;
    this.backend = 'lan';
    this.role = 'client';
    this.localName = name;
    this.started = false;
    this._reconnectAttempts = 0;
    this._setStatus('connecting');

    const parsed = parseJoinAddress(address);
    if (!parsed.ok) {
      this._setStatus('error', parsed.error);
      return;
    }

    this.joinAddress = parsed.display;
    this.roomCode = parsed.display;
    this.inviteUrl = '';
    this._wsUrl = parsed.wsUrl;

    try {
      await this._connectWs(this._wsUrl);
      if (this.destroyed) return;
      this._wsSend({ type: 'join', name });
    } catch (err) {
      this._setStatus(
        'error',
        err?.message ||
          'Cannot reach host IP — check LAN, firewall, and that they are hosting'
      );
    }
  }

  startGame(mapId) {
    if (this.role !== 'host' || this.started) return;
    if (this.players.length < 1) return;
    this.mapId = mapId || this.mapId || 'camp';

    if (this.backend === 'peer') {
      this.started = true;
      const payload = this._startPayload();
      // Aggressive fan-out — pull every connected peer into the match
      const blast = () => {
        if (this.destroyed || !this.started) return;
        this._peerBroadcast(payload);
      };
      blast();
      [50, 150, 300, 600, 1200, 2500].forEach((ms) => setTimeout(blast, ms));
      this._setStatus('playing');
      this._emit('start', { players: this.players, mapId: this.mapId });
      return;
    }

    this._wsSend({ type: 'start', mapId: this.mapId });
  }

  setMap(mapId) {
    if (this.started) return;
    if (!mapId) return;
    this.mapId = mapId;

    // Only broadcast once we're actually hosting a lobby
    if (this.role !== 'host') return;

    if (this.backend === 'peer') {
      this._peerBroadcast({ type: 'lobby', ...this._lobbyFields() });
      this._emit('lobby', this._lobbyPayload());
      return;
    }

    this._wsSend({ type: 'setMap', mapId });
  }

  sendToHost(msg) {
    if (this.role !== 'client') return;
    if (this.backend === 'peer') {
      this._safeSend(this._conn, { type: 'toHost', msg });
      return;
    }
    this._wsSend({ type: 'toHost', msg });
  }

  sendToClient(peerId, msg) {
    if (this.role !== 'host') return;
    if (this.backend === 'peer') {
      this._safeSend(this._conns.get(peerId), { type: 'fromHost', msg });
      return;
    }
    this._wsSend({ type: 'toClient', peerId, msg });
  }

  broadcast(msg) {
    if (this.role !== 'host') return;
    if (this.backend === 'peer') {
      this._peerBroadcast({ type: 'fromHost', msg });
      return;
    }
    this._wsSend({ type: 'broadcast', msg });
  }

  leave() {
    this.destroy();
  }

  destroy() {
    this.destroyed = true;
    this.destroyTransportOnly();
    this.players = [];
    this.started = false;
    this.role = null;
    this.backend = null;
    this.joinAddress = '';
    this.roomCode = '';
    this.inviteUrl = '';
    this._hostId = '';
    this._wsUrl = '';
    this._reconnectAttempts = 0;
    this._setStatus('idle');
  }

  destroyTransportOnly() {
    this._intentionalClose = true;
    this._clearPing();
    this._clearReconnect();
    this._clearDisconnectGrace();
    this._clearLobbyPull();

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (_) {
        /* ignore */
      }
      this.ws = null;
    }

    this._conns.forEach((conn) => {
      try {
        conn.close();
      } catch (_) {
        /* ignore */
      }
    });
    this._conns.clear();

    if (this._conn) {
      try {
        this._conn.close();
      } catch (_) {
        /* ignore */
      }
      this._conn = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {
        /* ignore */
      }
      this.peer = null;
    }

    this._intentionalClose = false;
  }

  destroySocketOnly() {
    this.destroyTransportOnly();
  }

  // ─── PeerJS helpers ─────────────────────────────────────────

  _lobbyFields() {
    return {
      hostId: this._hostId || 'host',
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: !!p.isHost,
        spectator: !!p.spectator,
      })),
      maxPlayers: MAX_COOP_PLAYERS,
      joinAddress: this.roomCode,
      roomCode: this.roomCode,
      inviteUrl: this.inviteUrl,
      mapId: this.mapId || 'camp',
    };
  }

  _peerBroadcast(msg) {
    this._allDataConns().forEach((conn) => {
      this._safeSend(conn, msg);
    });
  }

  _clearLobbyPull() {
    if (this._lobbyPullTimer) {
      clearInterval(this._lobbyPullTimer);
      this._lobbyPullTimer = null;
    }
  }

  _startLobbyPull() {
    this._clearLobbyPull();
    // First sync immediately once open; then keep polling
    if (this._conn?.open) {
      this._safeSend(this._conn, { type: 'sync', name: this.localName });
    }
    this._lobbyPullTimer = setInterval(() => {
      if (this.destroyed || this.backend !== 'peer' || this.role !== 'client') {
        this._clearLobbyPull();
        return;
      }
      if (this.started || this._status === 'playing') {
        this._clearLobbyPull();
        return;
      }
      if (!this._conn?.open) return;
      this._safeSend(this._conn, { type: 'sync', name: this.localName });
    }, 1500);
  }

  _startPeerKeepalive() {
    this._clearPing();
    this._lastPongAt = Date.now();
    this._pingTimer = setInterval(() => {
      if (this.destroyed || this.backend !== 'peer') return;
      if (this.role === 'client') {
        if (!this._conn?.open) return;
        this._safeSend(this._conn, { type: 'ping', t: Date.now() });
      } else if (this.role === 'host') {
        this._allDataConns().forEach((conn) => {
          if (!conn?.open) return;
          this._safeSend(conn, { type: 'ping', t: Date.now() });
        });
      }
    }, CLIENT_PING_MS);
  }

  _openPeer(id) {
    return new Promise((resolve, reject) => {
      const peer = id ? new Peer(id, PEER_OPTIONS) : new Peer(PEER_OPTIONS);
      let settled = false;

      const fail = (err) => {
        if (settled) return;
        settled = true;
        try {
          peer.destroy();
        } catch (_) {
          /* ignore */
        }
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      peer.on('open', () => {
        if (settled) return;
        settled = true;
        resolve(peer);
      });
      peer.on('error', (err) => {
        const type = err?.type || '';
        if (type === 'unavailable-id') {
          fail(new Error('Room code taken — try hosting again'));
          return;
        }
        if (type === 'peer-unavailable') {
          fail(new Error('No host found for that code'));
          return;
        }
        // network/server blips after open — don't kill an established peer
        if (settled) {
          console.warn('[coop peer]', err);
          return;
        }
        fail(err?.message ? new Error(err.message) : new Error('PeerJS error'));
      });
    });
  }

  async _createHostPeer() {
    let lastErr;
    for (let i = 0; i < PEER_HOST_TRIES; i++) {
      const code = generateRoomCode();
      const id = peerIdFromRoomCode(code);
      try {
        const peer = await this._openPeer(id);
        return { peer, code: roomCodeFromPeerId(peer.id) || code };
      } catch (err) {
        lastErr = err;
        if (!String(err?.message || '').includes('taken')) break;
      }
    }
    throw lastErr || new Error('Could not create room');
  }

  _waitForLobbyOrStart(timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      if (this._status === 'lobby' || this._status === 'playing') {
        resolve();
        return;
      }
      if (this._status === 'error') {
        reject(new Error(this._error || 'Failed to join'));
        return;
      }
      let settled = false;
      const done = (fn) => (arg) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        unsub();
        fn(arg);
      };
      const t = setTimeout(
        done(() =>
          reject(
            new Error(
              'Timed out waiting for host lobby — confirm the code and that they clicked Create Invite'
            )
          )
        ),
        timeoutMs
      );
      const unsub = this.on((event, payload) => {
        if (event === 'lobby' || event === 'start') {
          done(() => resolve())();
          return;
        }
        if (event === 'status' && payload?.status === 'error') {
          done(() => reject(new Error(payload.error || 'Failed to join')))();
          return;
        }
        if (event === 'disconnected' || event === 'hostLeft') {
          done(() =>
            reject(new Error(payload?.message || 'Disconnected from host'))
          )();
        }
      });
    });
  }

  _waitConnOpen(conn) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn) => (arg) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        fn(arg);
      };
      const t = setTimeout(
        done(() => reject(new Error('Timed out connecting to host'))),
        20000
      );
      conn.on(
        'open',
        done(() => resolve())
      );
      conn.on(
        'error',
        done((err) =>
          reject(err instanceof Error ? err : new Error('Failed to connect to host'))
        )
      );
      // open may have fired between connect() and this listener
      if (conn.open) done(() => resolve())();
    });
  }

  _wireHostPeer(peer) {
    peer.on('connection', (conn) => {
      // Track after open so we never broadcast to a closed DC
      const track = () => {
        if (!conn.peer || this.destroyed) return;
        this._conns.set(conn.peer, conn);
        conn.__kfpId = conn.peer;
      };
      if (conn.open) track();
      else conn.on('open', track);

      conn.on('data', (data) => this._onPeerMessage(data, conn));
      conn.on('close', () => this._hostConnClosed(conn));
      conn.on('error', (err) => {
        console.warn('[coop] host conn error', err);
      });
    });

    peer.on('error', (err) => {
      if (this.destroyed || this._intentionalClose) return;
      console.warn('[coop peer]', err);
    });

    peer.on('disconnected', () => {
      if (this.destroyed || this._intentionalClose) return;
      console.warn('[coop] signaling disconnected — reconnecting');
      try {
        peer.reconnect();
      } catch (_) {
        this._scheduleDisconnectGrace('Lost PeerJS signaling connection');
      }
    });
  }

  _wireClientPeer(peer) {
    peer.on('error', (err) => {
      if (this.destroyed || this._intentionalClose) return;
      const type = err?.type || '';
      if (type === 'peer-unavailable') {
        this._setStatus('error', 'No host found for that code');
        return;
      }
      console.warn('[coop peer]', err);
    });
    peer.on('disconnected', () => {
      if (this.destroyed || this._intentionalClose) return;
      console.warn('[coop] signaling disconnected — reconnecting');
      try {
        peer.reconnect();
      } catch (_) {
        this._scheduleDisconnectGrace('Lost PeerJS signaling connection');
      }
    });
  }

  _attachClientConn(conn) {
    conn.on('data', (data) => {
      this._clearDisconnectGrace();
      this._onPeerMessage(data, conn);
    });
    conn.on('close', () => {
      if (this.destroyed || this._intentionalClose) return;
      this._scheduleDisconnectGrace('Disconnected from host');
    });
    conn.on('error', (err) => {
      console.warn('[coop] client conn error', err);
    });
  }

  _hostConnClosed(conn) {
    if (this.destroyed || this._intentionalClose) return;
    let leftId = null;
    this._conns.forEach((c, id) => {
      if (c === conn) leftId = id;
    });
    if (!leftId) return;
    this._conns.delete(leftId);
    this.players = this.players.filter((p) => p.id !== leftId);
    if (this.started) {
      this._peerBroadcast({ type: 'playerLeft', peerId: leftId });
      this._emit('playerLeft', { peerId: leftId });
    } else {
      this._peerBroadcast({ type: 'lobby', ...this._lobbyFields() });
      this._emit('lobby', this._lobbyPayload());
    }
  }

  _onPeerMessage(raw, conn) {
    const msg = decodePeerData(raw);
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'ping') {
      this._safeSend(conn, { type: 'pong', t: msg.t || Date.now() });
      return;
    }
    if (msg.type === 'pong') {
      this._lastPongAt = Date.now();
      this._clearDisconnectGrace();
      return;
    }

    if (this.role === 'host') {
      if (msg.type === 'sync') {
        this._ensureHostConn(conn, msg.name);
        if (this.started) {
          const id = conn.__kfpId || conn.peer;
          const existing = this.players.find((p) => p.id === id);
          const isSpec = !!existing?.spectator;
          this._safeSend(
            conn,
            this._startPayload({ lateJoin: isSpec, spectator: isSpec })
          );
        } else {
          this._safeSend(conn, { type: 'lobby', ...this._lobbyFields() });
        }
        return;
      }

      if (msg.type === 'join') {
        // Late join after start → spectate (3rd person), don't spawn as combatant
        if (this.started) {
          const peerKey = conn.peer || conn.__kfpId;
          const existing = peerKey
            ? this.players.find((p) => p.id === peerKey)
            : null;
          const isNew = !existing;
          const asSpectator = isNew || !!existing.spectator;
          if (isNew && this.players.length >= MAX_COOP_PLAYERS) {
            this._safeSend(conn, { type: 'error', message: 'Room is full (4 players max)' });
            try {
              conn.close();
            } catch (_) {
              /* ignore */
            }
            return;
          }
          const id = this._ensureHostConn(conn, msg.name, { spectator: asSpectator });
          const p = this.players.find((x) => x.id === id);
          if (p && asSpectator) p.spectator = true;
          this._safeSend(conn, {
            type: 'welcome',
            id,
            roomCode: this.roomCode,
            joinAddress: this.roomCode,
            inviteUrl: this.inviteUrl,
            mapId: this.mapId,
          });
          this._safeSend(
            conn,
            this._startPayload({ lateJoin: asSpectator, spectator: asSpectator })
          );
          if (isNew) {
            this._emit('playerJoined', {
              peerId: id,
              name: p?.name || msg.name || 'Survivor',
              spectator: asSpectator,
            });
          }
          return;
        }
        if (this.players.length >= MAX_COOP_PLAYERS) {
          this._safeSend(conn, { type: 'error', message: 'Room is full (4 players max)' });
          try {
            conn.close();
          } catch (_) {
            /* ignore */
          }
          return;
        }
        const id = this._ensureHostConn(conn, msg.name);
        this._safeSend(conn, {
          type: 'welcome',
          id,
          roomCode: this.roomCode,
          joinAddress: this.roomCode,
          inviteUrl: this.inviteUrl,
          mapId: this.mapId,
        });
        const lobby = { type: 'lobby', ...this._lobbyFields() };
        // Fan out roster to everyone (host UI + all peers)
        this._peerBroadcast(lobby);
        this._safeSend(conn, lobby);
        this._emit('lobby', this._lobbyPayload());
        this._emit('playerJoined', {
          peerId: id,
          name: msg.name || 'Survivor',
          spectator: false,
        });
        return;
      }

      if (msg.type === 'toHost') {
        const peerId = conn.__kfpId || conn.peer;
        if (!peerId) return;
        this._emit('clientMsg', { peerId, msg: msg.msg });
        return;
      }

      if (msg.type === 'startAck') {
        return;
      }
      return;
    }

    // client
    this._onServerMessage(msg);
  }

  _ensureHostConn(conn, name, opts = {}) {
    const id = conn.peer || conn.__kfpId || `c${Date.now()}`;
    conn.__kfpId = id;
    this._conns.set(id, conn);
    const existing = this.players.find((p) => p.id === id);
    if (existing) {
      if (name) existing.name = String(name).slice(0, 16);
      if (opts.spectator) existing.spectator = true;
      return id;
    }
    this.players.push({
      id,
      name: String(name || 'Survivor').slice(0, 16),
      isHost: false,
      spectator: !!opts.spectator,
    });
    return id;
  }

  // ─── LAN WebSocket (unchanged protocol) ─────────────────────

  _wsSend(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  _clearPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  _clearReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  _startPing() {
    this._clearPing();
    this._lastPongAt = Date.now();
    this._pingTimer = setInterval(() => {
      if (this.destroyed || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      this._wsSend({ type: 'ping', t: Date.now() });
    }, CLIENT_PING_MS);
  }

  _failDisconnect(message) {
    this._clearPing();
    this._clearReconnect();
    this._clearDisconnectGrace();
    const msg = message || 'Lost connection';
    this._emit('disconnected', { message: msg, started: this.started });
    this._setStatus('error', msg);
  }

  _scheduleReconnect() {
    if (this.destroyed || this.backend !== 'lan' || !this._wsUrl || !this.role) {
      return false;
    }
    if (this.started) return false;
    if (this._reconnectAttempts >= RECONNECT_MAX) return false;

    this._reconnectAttempts += 1;
    const delay = RECONNECT_BASE_MS * Math.pow(2, this._reconnectAttempts - 1);
    this._setStatus('connecting', '');

    this._clearReconnect();
    this._reconnectTimer = setTimeout(async () => {
      if (this.destroyed) return;
      try {
        await this._connectWs(this._wsUrl);
        if (this.destroyed) return;
        if (this.role === 'host') {
          this._wsSend({ type: 'host', name: this.localName });
        } else {
          this._wsSend({ type: 'join', name: this.localName });
        }
      } catch (_) {
        if (!this._scheduleReconnect()) {
          this._failDisconnect('Disconnected from coop relay');
        }
      }
    }, delay);
    return true;
  }

  _connectWs(url) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);
      this.ws = ws;
      this._wsUrl = url;

      const fail = (err) => {
        if (settled) return;
        settled = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      ws.onopen = () => {
        if (settled) return;
        settled = true;
        this._reconnectAttempts = 0;
        this._startPing();
        resolve();
      };

      ws.onerror = () => fail(new Error('WebSocket connection failed'));

      ws.onclose = () => {
        this._clearPing();
        if (this.destroyed || this._intentionalClose) return;
        if (!this.started && this._scheduleReconnect()) return;
        this._failDisconnect(
          this.role === 'client'
            ? 'Disconnected from host / coop relay'
            : 'Disconnected from coop relay'
        );
      };

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        this._onServerMessage(msg);
      };
    });
  }

  _onServerMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'pong') {
      this._lastPongAt = Date.now();
      this._clearDisconnectGrace();
      return;
    }

    if (msg.type === 'welcome') {
      if (msg.id) this.localId = msg.id;
      if (msg.roomCode) this.roomCode = msg.roomCode;
      if (msg.joinAddress) {
        this.joinAddress = msg.joinAddress;
        if (!this.roomCode) this.roomCode = msg.joinAddress;
      }
      if (msg.inviteUrl) this.inviteUrl = msg.inviteUrl;
      else if (this.backend === 'peer') this._syncInvite();
      if (msg.mapId) this.mapId = msg.mapId;
      return;
    }

    if (msg.type === 'hosted' || msg.type === 'lobby') {
      // Ignore late lobby packets after match start (retries / reconnect noise)
      if (this.started || this._status === 'playing') return;
      this.players = msg.players || [];
      this._hostId = msg.hostId || this._hostId;
      if (msg.roomCode) this.roomCode = msg.roomCode;
      if (msg.joinAddress) {
        this.joinAddress = msg.joinAddress;
        if (!this.roomCode) this.roomCode = msg.joinAddress;
      }
      if (msg.inviteUrl) this.inviteUrl = msg.inviteUrl;
      else if (this.backend === 'peer') this._syncInvite();
      if (msg.mapId) this.mapId = msg.mapId;
      this._reconnectAttempts = 0;
      this._setStatus('lobby');
      this._emit('lobby', this._lobbyPayload());
      return;
    }

    if (msg.type === 'start') {
      this.started = true;
      this.players = msg.players || this.players;
      if (msg.mapId) this.mapId = msg.mapId;
      this._clearDisconnectGrace();
      this._clearLobbyPull();
      this._setStatus('playing');
      this._emit('start', {
        players: this.players,
        mapId: this.mapId,
        lateJoin: !!msg.lateJoin,
        spectator: !!msg.spectator || !!msg.lateJoin,
      });
      if (this.backend === 'peer') {
        this._safeSend(this._conn, { type: 'startAck' });
      }
      return;
    }

    if (msg.type === 'playerJoined') {
      const id = msg.peerId;
      if (id && !this.players.find((p) => p.id === id)) {
        this.players.push({
          id,
          name: String(msg.name || 'Survivor').slice(0, 16),
          isHost: false,
          spectator: !!msg.spectator,
        });
      } else if (id) {
        const p = this.players.find((x) => x.id === id);
        if (p && msg.spectator) p.spectator = true;
        if (p && msg.name) p.name = String(msg.name).slice(0, 16);
      }
      this._emit('playerJoined', {
        peerId: id,
        name: msg.name,
        spectator: !!msg.spectator,
      });
      return;
    }

    if (msg.type === 'fromClient') {
      this._emit('clientMsg', { peerId: msg.peerId, msg: msg.msg });
      return;
    }

    if (msg.type === 'fromHost') {
      this._emit('hostMsg', msg.msg);
      return;
    }

    if (msg.type === 'playerLeft') {
      this.players = this.players.filter((p) => p.id !== msg.peerId);
      if (this.started) this._emit('playerLeft', { peerId: msg.peerId });
      else this._emit('lobby', this._lobbyPayload());
      return;
    }

    if (msg.type === 'hostLeft') {
      this._emit('hostLeft');
      this._setStatus('error', 'Host left the game');
      return;
    }

    if (msg.type === 'error') {
      this._setStatus('error', msg.message || 'Coop error');
    }
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Normalize PeerJS payloads: object | JSON string | double-encoded | Uint8Array */
function decodePeerData(raw) {
  if (raw == null) return null;

  if (typeof raw === 'string') {
    let parsed = safeParse(raw);
    if (typeof parsed === 'string') parsed = safeParse(parsed);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }

  if (typeof ArrayBuffer !== 'undefined' && raw instanceof ArrayBuffer) {
    try {
      return decodePeerData(new TextDecoder().decode(raw));
    } catch {
      return null;
    }
  }

  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(raw)) {
    try {
      const view = raw;
      const bytes =
        view instanceof Uint8Array
          ? view
          : new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      return decodePeerData(new TextDecoder().decode(bytes));
    } catch {
      return null;
    }
  }

  if (raw && typeof raw === 'object' && typeof raw.type === 'string') {
    return raw;
  }

  return null;
}
