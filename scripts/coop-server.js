/**
 * LAN co-op relay — private/RFC1918 addresses only (not publicly routable).
 * Host + clients message through this WebSocket hub.
 */
const http = require('http');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.COOP_PORT || 27541);
const MAX_PLAYERS = 4;
const HEARTBEAT_MS = 20000;
const HEARTBEAT_MISSES = 3; // terminate only after several missed pongs

function isPrivateIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const cleaned = ip.replace(/^::ffff:/i, '');
  if (cleaned === '127.0.0.1') return true;
  const m = cleaned.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = +m[1];
  const b = +m[2];
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true; // link-local
  return false;
}

function listPrivateIPv4() {
  const out = [];
  const ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach((name) => {
    (ifaces[name] || []).forEach((iface) => {
      if (iface.family !== 'IPv4' && iface.family !== 4) return;
      if (iface.internal) return;
      if (!isPrivateIPv4(iface.address)) return;
      if (!out.includes(iface.address)) out.push(iface.address);
    });
  });
  return out;
}

function remoteIp(reqOrSocket) {
  const addr =
    reqOrSocket.socket?.remoteAddress ||
    reqOrSocket.remoteAddress ||
    '';
  return String(addr).replace(/^::ffff:/i, '');
}

let nextId = 1;
const clients = new Map(); // id -> { ws, id, name, isHost }
let hostId = null;
let started = false;
let roomMapId = 'bunker';
let hostLeaveTimer = null;
const HOST_LEAVE_GRACE_MS = 4000;

function playersList() {
  return [...clients.values()]
    .filter((c) => c.name)
    .map((c) => ({
      id: c.id,
      name: c.name,
      isHost: !!c.isHost,
      spectator: !!c.spectator,
    }));
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(msg, exceptId = null) {
  clients.forEach((c) => {
    if (exceptId && c.id === exceptId) return;
    send(c.ws, msg);
  });
}

function lobbyPayload() {
  const priv = listPrivateIPv4();
  const joinAddress = priv.length ? `${priv[0]}:${PORT}` : `127.0.0.1:${PORT}`;
  return {
    type: 'lobby',
    hostId,
    players: playersList(),
    maxPlayers: MAX_PLAYERS,
    joinAddress,
    privateAddresses: priv,
    port: PORT,
    mapId: roomMapId,
  };
}

function syncLobby() {
  broadcast(lobbyPayload());
}

function dissolveRoom(reason) {
  if (hostLeaveTimer) {
    clearTimeout(hostLeaveTimer);
    hostLeaveTimer = null;
  }
  hostId = null;
  started = false;
  broadcast({ type: 'hostLeft', reason: reason || 'hostLeft' });
  clients.forEach((c) => {
    try {
      c.ws.close();
    } catch (_) {
      /* ignore */
    }
  });
  clients.clear();
  roomMapId = 'bunker';
}

function resetRoomIfEmpty() {
  if (clients.size === 0) {
    if (hostLeaveTimer) {
      clearTimeout(hostLeaveTimer);
      hostLeaveTimer = null;
    }
    hostId = null;
    started = false;
    roomMapId = 'bunker';
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        port: PORT,
        privateAddresses: listPrivateIPv4(),
        players: playersList().length,
      })
    );
    return;
  }
  res.writeHead(404);
  res.end('KFP coop relay');
});

const wss = new WebSocketServer({
  server,
  // Keep sockets from being culled by idle proxies / OS power save
  perMessageDeflate: false,
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    const misses = (ws._missedPongs || 0) + (ws.isAlive ? 0 : 1);
    if (!ws.isAlive && misses >= HEARTBEAT_MISSES) {
      try {
        ws.terminate();
      } catch (_) {
        /* ignore */
      }
      return;
    }
    ws._missedPongs = ws.isAlive ? 0 : misses;
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (_) {
      /* ignore */
    }
  });
}, HEARTBEAT_MS);

wss.on('close', () => clearInterval(heartbeat));

wss.on('connection', (ws, req) => {
  const ip = remoteIp(req);
  // Non-attackable: refuse non-private remotes (blocks casual internet exposure)
  if (!isPrivateIPv4(ip) && ip !== '::1') {
    send(ws, {
      type: 'error',
      message: 'Only private LAN addresses can connect (non-public IP policy)',
    });
    ws.close();
    return;
  }

  ws.isAlive = true;
  ws._missedPongs = 0;
  ws.on('pong', () => {
    ws.isAlive = true;
    ws._missedPongs = 0;
  });

  const id = `p${nextId++}`;
  const client = { ws, id, name: '', isHost: false, ip };
  clients.set(id, client);

  send(ws, {
    type: 'welcome',
    id,
    port: PORT,
    privateAddresses: listPrivateIPv4(),
    joinAddress: (() => {
      const priv = listPrivateIPv4();
      return priv.length ? `${priv[0]}:${PORT}` : `127.0.0.1:${PORT}`;
    })(),
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    // App-level keepalive (works even when protocol ping is filtered)
    if (msg.type === 'ping') {
      ws.isAlive = true;
      ws._missedPongs = 0;
      send(ws, { type: 'pong', t: msg.t || Date.now() });
      return;
    }

    if (msg.type === 'host') {
      if (hostLeaveTimer) {
        clearTimeout(hostLeaveTimer);
        hostLeaveTimer = null;
      }
      if (hostId && clients.has(hostId) && hostId !== id) {
        send(ws, { type: 'error', message: 'A host is already running on this IP' });
        return;
      }
      if (started) {
        send(ws, { type: 'error', message: 'Match already in progress' });
        return;
      }
      client.isHost = true;
      client.name = String(msg.name || 'Host').slice(0, 16);
      hostId = id;
      started = false;
      send(ws, { type: 'hosted', ...lobbyPayload() });
      syncLobby();
      return;
    }

    if (msg.type === 'join') {
      if (!hostId || !clients.has(hostId)) {
        send(ws, { type: 'error', message: 'No host on this address — ask them to Host first' });
        return;
      }
      if (playersList().length >= MAX_PLAYERS) {
        send(ws, { type: 'error', message: 'Room is full (4 players max)' });
        return;
      }
      client.isHost = false;
      client.name = String(msg.name || 'Survivor').slice(0, 16);

      // Mid-match join → spectator (pull into match, no combat spawn)
      if (started) {
        client.spectator = true;
        send(ws, {
          type: 'welcome',
          id,
          roomCode: null,
          joinAddress: lobbyPayload().joinAddress,
          mapId: roomMapId,
        });
        send(ws, {
          type: 'start',
          players: playersList(),
          mapId: roomMapId,
          lateJoin: true,
          spectator: true,
        });
        broadcast(
          {
            type: 'playerJoined',
            peerId: id,
            name: client.name,
            spectator: true,
          },
          id
        );
        return;
      }

      syncLobby();
      return;
    }

    if (msg.type === 'start') {
      if (id !== hostId) return;
      if (playersList().length < 1) return;
      started = true;
      if (msg.mapId) roomMapId = String(msg.mapId);
      broadcast({
        type: 'start',
        players: playersList(),
        mapId: roomMapId,
      });
      return;
    }

    if (msg.type === 'setMap') {
      if (id !== hostId || started) return;
      const next = String(msg.mapId || 'bunker');
      if (next === 'bunker' || next === 'camp') roomMapId = next;
      syncLobby();
      return;
    }

    if (msg.type === 'broadcast') {
      if (id !== hostId) return;
      broadcast({ type: 'fromHost', msg: msg.msg }, id);
      return;
    }

    if (msg.type === 'toClient') {
      if (id !== hostId) return;
      const target = clients.get(msg.peerId);
      if (target) send(target.ws, { type: 'fromHost', msg: msg.msg });
      return;
    }

    if (msg.type === 'toHost') {
      if (id === hostId) return;
      const host = clients.get(hostId);
      if (host) send(host.ws, { type: 'fromClient', peerId: id, msg: msg.msg });
      return;
    }
  });

  ws.on('close', () => {
    const wasHost = id === hostId;
    clients.delete(id);
    if (wasHost) {
      hostId = null;
      if (started) {
        // Match in progress — can't resume cleanly; end room now
        dissolveRoom('hostLeft');
      } else {
        // Lobby: short grace so host can reclaim after a blip
        if (hostLeaveTimer) clearTimeout(hostLeaveTimer);
        hostLeaveTimer = setTimeout(() => {
          hostLeaveTimer = null;
          if (!hostId || !clients.has(hostId)) {
            dissolveRoom('hostTimeout');
          }
        }, HOST_LEAVE_GRACE_MS);
      }
    } else {
      if (!started) syncLobby();
      else broadcast({ type: 'playerLeft', peerId: id });
    }
    resetRoomIfEmpty();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const priv = listPrivateIPv4();
  console.log('');
  console.log('=== Killing for Pie! LAN Co-op Relay ===');
  console.log(`Port: ${PORT}`);
  console.log(`Heartbeat: ${HEARTBEAT_MS}ms`);
  console.log('Private join IPs (share these — not public/WAN):');
  if (priv.length === 0) {
    console.log('  (none found) 127.0.0.1:' + PORT + ' — same PC only');
  } else {
    priv.forEach((ip) => console.log(`  ${ip}:${PORT}`));
  }
  console.log('Public internet IPs are rejected (non-attackable LAN policy).');
  console.log('');
});
