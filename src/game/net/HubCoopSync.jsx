import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../GameContext';
import { useCamp } from '../camp/CampContext';
import { useCoop } from './CoopContext';
import { createCoopPlayer, snapshotPlayerNet } from './coopState';
import { spawnOffset } from './roomCode';
import { HUB_MAP_ID, getMap } from '../map/activeMap';
import { PLAYER } from '../constants';

const SEND_HZ = 18;
const SNAP_HZ = 14;

function hubSpawn() {
  return getMap(HUB_MAP_ID).PLAYER_SPAWN || { x: 0, y: 0, z: -8 };
}

function placeAtHubSlot(p, slotIndex) {
  const spawn = hubSpawn();
  const off = spawnOffset(Math.max(0, slotIndex));
  p.position.x = spawn.x + off.x;
  p.position.z = spawn.z + off.z;
  p.position.y = PLAYER.height;
}

/** Lightweight pose sync while squad is in the camp hub (lobby / connecting). */
export default function HubCoopSync() {
  const { stateRef, remotesRef } = useGame();
  const { camp, outfitLoadout } = useCamp();
  const { sessionRef, players, localName, isHost, phase } = useCoop();
  const accSend = useRef(0);
  const accSnap = useRef(0);
  const peerPlayers = useRef(new Map());
  const spawned = useRef(false);
  const active = phase === 'lobby' || phase === 'connecting';

  // Keep local outfit on game state for net payloads
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.outfitId = camp?.outfitId || 'chef';
    state.outfitColor = camp?.outfitColor || 'default';
    state.outfitGender = camp?.outfitGender || 'male';
    state.outfitYarmulke = !!camp?.outfitYarmulke;
    state.outfitLoadout = outfitLoadout || null;
  }, [camp, outfitLoadout, stateRef]);

  // Offset spawn by lobby slot once when squad forms; keep host peer map in sync
  useEffect(() => {
    if (!active) return;
    const state = stateRef.current;
    const session = sessionRef.current;
    if (!state || !session) return;
    const localId = session.localId || (isHost ? 'host' : 'local');
    state.coop = true;
    state.isHost = !!isHost;
    state.coopLocalId = localId;
    state.status = 'playing';

    if (!spawned.current && players.length > 0) {
      const idx = Math.max(
        0,
        players.findIndex((p) => p.id === localId)
      );
      const spawn = hubSpawn();
      const off = spawnOffset(Math.max(idx, 0));
      state.position.x = spawn.x + off.x;
      state.position.z = spawn.z + off.z;
      state.position.y = PLAYER.height;
      state.yaw = 0;
      spawned.current = true;
    }

    if (isHost) {
      players.forEach((p, i) => {
        if (peerPlayers.current.has(p.id)) {
          const existing = peerPlayers.current.get(p.id);
          existing.name = p.name || existing.name;
          return;
        }
        const cp = createCoopPlayer(p.id, p.name, i, {
          outfitId: p.id === localId ? state.outfitId : 'chef',
          outfitColor: p.id === localId ? state.outfitColor : 'default',
          outfitGender: p.id === localId ? state.outfitGender : 'male',
          outfitYarmulke: p.id === localId ? !!state.outfitYarmulke : false,
          outfitLoadout: p.id === localId ? state.outfitLoadout : null,
        });
        placeAtHubSlot(cp, i);
        peerPlayers.current.set(p.id, cp);
      });
      // Drop peers who left the lobby roster
      const live = new Set(players.map((p) => p.id));
      peerPlayers.current.forEach((_, id) => {
        if (!live.has(id)) peerPlayers.current.delete(id);
      });
      // Immediate snap so joiners appear without waiting a tick
      broadcastHubSnap(session, peerPlayers.current);
    }
  }, [active, players, isHost, stateRef, remotesRef, sessionRef]);

  // Reset spawn flag when leaving lobby
  useEffect(() => {
    if (!active) {
      spawned.current = false;
      peerPlayers.current = new Map();
      if (remotesRef.current) remotesRef.current = [];
      if (stateRef.current) {
        stateRef.current.coop = false;
      }
    }
  }, [active, remotesRef, stateRef]);

  useEffect(() => {
    if (!active) return undefined;
    const session = sessionRef.current;
    if (!session) return undefined;

    return session.on((event, payload) => {
      if (event === 'playerJoined' && isHost) {
        const { peerId, name } = payload || {};
        if (!peerId) return;
        if (!peerPlayers.current.has(peerId)) {
          const cp = createCoopPlayer(
            peerId,
            name || 'Survivor',
            peerPlayers.current.size
          );
          placeAtHubSlot(cp, peerPlayers.current.size);
          peerPlayers.current.set(peerId, cp);
        }
        broadcastHubSnap(session, peerPlayers.current);
        return;
      }

      if (event === 'clientMsg' && isHost) {
        const { peerId, msg } = payload || {};
        if (!msg) return;
        if (msg.type === 'hubPoseRequest') {
          broadcastHubSnap(session, peerPlayers.current);
          return;
        }
        if (msg.type !== 'hubPose') return;
        let p = peerPlayers.current.get(peerId);
        if (!p) {
          p = createCoopPlayer(peerId, msg.name || 'Survivor', peerPlayers.current.size, {
            outfitId: msg.outfitId || 'chef',
            outfitColor: msg.outfitColor || 'default',
            outfitGender: msg.outfitGender || 'male',
            outfitYarmulke: !!msg.outfitYarmulke,
            outfitLoadout: msg.outfitLoadout || null,
          });
          placeAtHubSlot(p, peerPlayers.current.size);
          peerPlayers.current.set(peerId, p);
        }
        p.position.x = msg.x;
        p.position.y = msg.y;
        p.position.z = msg.z;
        p.yaw = msg.yaw;
        p.pitch = msg.pitch || 0;
        p.name = msg.name || p.name;
        if (msg.outfitId) p.outfitId = msg.outfitId;
        if (msg.outfitColor) p.outfitColor = msg.outfitColor;
        if (msg.outfitGender) p.outfitGender = msg.outfitGender;
        if (typeof msg.outfitYarmulke === 'boolean') p.outfitYarmulke = msg.outfitYarmulke;
        if (msg.outfitLoadout) p.outfitLoadout = msg.outfitLoadout;
        return;
      }

      if (event === 'hostMsg' && !isHost) {
        if (!payload || payload.type !== 'hubSnap') return;
        applyHubSnap(payload, stateRef, remotesRef, sessionRef);
        return;
      }

      if (event === 'playerLeft' && isHost) {
        peerPlayers.current.delete(payload?.peerId);
        broadcastHubSnap(session, peerPlayers.current);
        return;
      }

      // Keep coopLocalId fresh; after lobby, request a snap in case we missed one.
      if (event === 'lobby' || event === 'status') {
        const state = stateRef.current;
        const s = sessionRef.current;
        if (state && s?.localId) state.coopLocalId = s.localId;
        if (event === 'lobby' && !isHost && s?.role === 'client') {
          s.sendToHost({ type: 'hubPoseRequest' });
        }
      }
    });
  }, [active, isHost, sessionRef, stateRef, remotesRef]);

  useFrame((_, dt) => {
    if (!active) return;
    const session = sessionRef.current;
    const state = stateRef.current;
    if (!session || !state) return;
    const clamped = Math.min(dt, 0.05);

    // Keep local id current (welcome may arrive after first mount)
    if (session.localId) state.coopLocalId = session.localId;

    if (isHost) {
      const hostId = state.coopLocalId || session.localId || 'host';
      let hostP = peerPlayers.current.get(hostId);
      if (!hostP) {
        hostP = createCoopPlayer(hostId, localName, 0, {
          outfitId: state.outfitId || 'chef',
          outfitColor: state.outfitColor || 'default',
          outfitGender: state.outfitGender || 'male',
          outfitYarmulke: !!state.outfitYarmulke,
          outfitLoadout: state.outfitLoadout || null,
        });
        placeAtHubSlot(hostP, 0);
        peerPlayers.current.set(hostId, hostP);
      }
      hostP.position.x = state.position.x;
      hostP.position.y = state.position.y;
      hostP.position.z = state.position.z;
      hostP.yaw = state.yaw;
      hostP.pitch = state.pitch;
      hostP.name = localName || hostP.name;
      hostP.status = 'alive';
      hostP.outfitId = state.outfitId || 'chef';
      hostP.outfitColor = state.outfitColor || 'default';
      hostP.outfitGender = state.outfitGender || 'male';
      hostP.outfitYarmulke = !!state.outfitYarmulke;
      hostP.outfitLoadout = state.outfitLoadout || null;

      // Ensure lobby roster exists in peer map
      players.forEach((lp, i) => {
        if (!peerPlayers.current.has(lp.id)) {
          const cp = createCoopPlayer(lp.id, lp.name, i);
          placeAtHubSlot(cp, i);
          peerPlayers.current.set(lp.id, cp);
        }
      });

      const remotes = [];
      peerPlayers.current.forEach((p) => {
        const snap = snapshotPlayerNet(p);
        if (p.id === hostId) {
          remotes.push({ ...snap, _local: true });
        } else {
          remotes.push(snap);
        }
      });
      remotesRef.current = remotes.filter((r) => !r._local);

      accSnap.current += clamped;
      if (accSnap.current >= 1 / SNAP_HZ) {
        accSnap.current = 0;
        broadcastHubSnap(session, peerPlayers.current);
      }
    } else {
      accSend.current += clamped;
      if (accSend.current >= 1 / SEND_HZ) {
        accSend.current = 0;
        session.sendToHost({
          type: 'hubPose',
          name: localName,
          x: state.position.x,
          y: state.position.y,
          z: state.position.z,
          yaw: state.yaw,
          pitch: state.pitch,
          outfitId: state.outfitId || 'chef',
          outfitColor: state.outfitColor || 'default',
          outfitGender: state.outfitGender || 'male',
          outfitYarmulke: !!state.outfitYarmulke,
          outfitLoadout: state.outfitLoadout || null,
        });
      }
    }
  });

  return null;
}

function broadcastHubSnap(session, peerMap) {
  if (!session || session.role !== 'host') return;
  const players = [];
  peerMap.forEach((p) => {
    players.push(snapshotPlayerNet(p));
  });
  session.broadcast({ type: 'hubSnap', players });
}

function applyHubSnap(msg, stateRef, remotesRef, sessionRef) {
  const state = stateRef.current;
  const session = sessionRef?.current;
  const localId = state?.coopLocalId || session?.localId || '';
  if (state && session?.localId) state.coopLocalId = session.localId;
  const list = msg.players || [];
  const remotes = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p || (localId && p.id === localId)) continue;
    remotes.push({
      ...p,
      status: p.status || 'alive',
      weaponId: null,
    });
  }
  remotesRef.current = remotes;
}
