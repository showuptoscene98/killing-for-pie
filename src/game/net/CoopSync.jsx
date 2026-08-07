import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../GameContext';
import { useCoop } from './CoopContext';
import {
  createCoopPlayer,
  snapshotPlayerNet,
  snapshotZombieNet,
  packDoors,
  packRooms,
  packWindows,
  revivePlayer,
} from './coopState';
import { fireHitscanFromRay } from '../weapons/WeaponSystem';
import {
  WEAPONS,
  createWeaponLoadout,
  giveWeaponToLoadout,
  MYSTERY_BOX_COST,
} from '../weapons/weaponDefs';
import { getActiveMap } from '../map/activeMap';
import { trySpinMysteryBox } from '../systems/MysteryBoxSystem';
import { tryRepairBoard } from '../systems/WindowSystem';
import { recordWindowFullyRebuilt, recordAchievementEvent } from '../camp/campData';
import { queueAchievementBanners } from '../camp/achievements';
import { BARRICADE, REVIVE } from '../constants';
import { tickHealthRegen } from '../systems/HealthRegen';
import { play } from '../audio/sound';
import { inputState } from '../player/PlayerControls';
import {
  canPlayerInteract,
  sanitizeFireRay,
  sanitizePlayerPosition,
} from './hostValidation';

const SEND_HZ = 15;
const SNAP_HZ = 10;

export default function CoopSync() {
  const { stateRef, zombiesRef, remotesRef } = useGame();
  const { sessionRef, players, localName, isHost, joinAsSpectator } = useCoop();
  const accSend = useRef(0);
  const accSnap = useRef(0);
  const peerPlayers = useRef(new Map());
  const pendingHits = useRef([]);
  const pendingInteracts = useRef([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const state = stateRef.current;
    if (!state) return;
    const localId =
      sessionRef.current?.localId ||
      (isHost ? 'host' : 'local');
    state.coop = true;
    state.isHost = !!isHost;
    state.coopLocalId = localId;
    state.coopMatchOver = false;
    state.spectateIndex = 0;
    state.spectateName = '';

    const asSpectator = !isHost && !!joinAsSpectator;
    state.coopSpectating = asSpectator;
    state.status = asSpectator ? 'dead' : 'playing';
    if (asSpectator) {
      document.exitPointerLock?.();
    }

    if (isHost) {
      const map = new Map();
      players.forEach((p, i) => {
        const cp = createCoopPlayer(p.id, p.name, i, {
          reloadMult: state.reloadMult,
          pointsMult: state.pointsMult,
          outfitId: state.outfitId || 'chef',
          outfitColor: state.outfitColor || 'default',
          outfitGender: state.outfitGender || 'male',
          outfitYarmulke: !!state.outfitYarmulke,
          outfitLoadout: state.outfitLoadout || null,
        });
        if (p.spectator) cp.status = 'spectator';
        map.set(p.id, cp);
        if (p.id === localId) {
          state.position.x = cp.position.x;
          state.position.z = cp.position.z;
          state.position.y = cp.position.y;
          cp.hp = state.hp;
          cp.maxHp = state.maxHp;
          cp.outfitId = state.outfitId || 'chef';
          cp.outfitColor = state.outfitColor || 'default';
          cp.outfitGender = state.outfitGender || 'male';
          cp.outfitYarmulke = !!state.outfitYarmulke;
          cp.outfitLoadout = state.outfitLoadout || null;
          state.points = cp.points;
          state.weapons = cp.weapons;
          state.activeWeapon = 0;
        }
      });
      peerPlayers.current = map;
    } else if (!asSpectator) {
      const idx = Math.max(
        0,
        players.findIndex((p) => p.id === localId)
      );
      const off = createCoopPlayer(localId, localName, Math.max(idx, 0), {
        outfitId: state.outfitId || 'chef',
        outfitColor: state.outfitColor || 'default',
        outfitGender: state.outfitGender || 'male',
        outfitYarmulke: !!state.outfitYarmulke,
        outfitLoadout: state.outfitLoadout || null,
        reloadMult: state.reloadMult,
        pointsMult: state.pointsMult,
      });
      state.position.x = off.position.x;
      state.position.z = off.position.z;
      state.position.y = off.position.y;
      state.hp = off.hp;
      state.maxHp = off.maxHp;
    }

    remotesRef.current = [];
    initialized.current = true;
  }, [isHost, players, localName, stateRef, remotesRef, sessionRef, joinAsSpectator]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return undefined;

    return session.on((event, payload) => {
      if (event === 'playerJoined' && isHost) {
        const { peerId, name, spectator } = payload || {};
        if (!peerId || peerPlayers.current.has(peerId)) return;
        const cp = createCoopPlayer(peerId, name || 'Survivor', peerPlayers.current.size, {
          outfitId: 'chef',
          outfitColor: 'default',
        });
        if (spectator) cp.status = 'spectator';
        peerPlayers.current.set(peerId, cp);
        return;
      }

      if (event === 'clientMsg' && isHost) {
        const { peerId, msg } = payload;
        if (!msg) return;
        if (msg.type === 'input') {
          let p = peerPlayers.current.get(peerId);
          if (!p) {
            p = createCoopPlayer(
              peerId,
              msg.name || 'Survivor',
              peerPlayers.current.size,
              {
                outfitId: msg.outfitId || 'chef',
                outfitColor: msg.outfitColor || 'default',
                outfitGender: msg.outfitGender || 'male',
                outfitYarmulke: !!msg.outfitYarmulke,
                outfitLoadout: msg.outfitLoadout || null,
              }
            );
            peerPlayers.current.set(peerId, p);
          }
          if (p.status === 'dead' || p.status === 'spectator' || p.status === 'downed') {
            p.reviveTargetId = null;
            return;
          }
          // Host is authoritative: bound the claim to the map and to what the
          // player could actually have covered since its last packet. A rejected
          // claim leaves the previous position standing rather than writing NaN
          // into world state, which used to go straight back out in the snapshot.
          const now = performance.now();
          const elapsed = p._lastInputAt ? (now - p._lastInputAt) / 1000 : 0;
          const moved = sanitizePlayerPosition(
            p.position,
            { x: msg.x, y: msg.y, z: msg.z },
            elapsed,
            getActiveMap()?.worldBound
          );
          if (moved) {
            p.position.x = moved.x;
            p.position.y = moved.y;
            p.position.z = moved.z;
            p._lastInputAt = now;
          }
          if (Number.isFinite(msg.yaw)) p.yaw = msg.yaw;
          if (Number.isFinite(msg.pitch)) p.pitch = msg.pitch;
          p.reviveTargetId = msg.reviveTargetId || null;
          // Host owns loadout — clients get it back via snap
          if (typeof msg.activeWeapon === 'number') p.activeWeapon = msg.activeWeapon;
          if (msg.reload && !p.reloading) {
            const slot = p.weapons[p.activeWeapon];
            const def = slot && WEAPONS[slot.id];
            if (def && slot.mag < def.magSize && slot.reserve > 0) {
              p.reloading = true;
              p.reloadTimer = def.reloadTime * (p.reloadMult || 1);
            }
          }
          if (msg.muzzleFlash) p.muzzleFlash = 0.05;
          if (msg.outfitId) p.outfitId = msg.outfitId;
          if (msg.outfitColor) p.outfitColor = msg.outfitColor;
          if (msg.outfitGender) p.outfitGender = msg.outfitGender;
          if (typeof msg.outfitYarmulke === 'boolean') p.outfitYarmulke = msg.outfitYarmulke;
          if (msg.outfitLoadout) p.outfitLoadout = msg.outfitLoadout;
          return;
        }
        if (msg.type === 'fire' && msg.ray) {
          // ads was being dropped here, so a scoped client's shot always
          // resolved with hipfire spread on the host.
          pendingHits.current.push({ peerId, ray: msg.ray, ads: !!msg.ads });
          return;
        }
        if (msg.type === 'interact' && msg.prompt) {
          pendingInteracts.current.push({ peerId, prompt: msg.prompt });
        }
      }

      if (event === 'hostMsg' && !isHost) {
        applyHostSnap(payload, stateRef, zombiesRef, remotesRef);
      }

      if (event === 'playerLeft' && isHost) {
        peerPlayers.current.delete(payload.peerId);
      }
    });
  }, [isHost, sessionRef, stateRef, zombiesRef, remotesRef]);

  useFrame((_, dt) => {
    const session = sessionRef.current;
    const state = stateRef.current;
    if (!session || !state?.coop) return;
    const clamped = Math.min(dt, 0.05);

    if (isHost) {
      tickHost({
        session,
        state,
        zombiesRef,
        remotesRef,
        peerPlayers,
        pendingHits,
        pendingInteracts,
        accSnap,
        clamped,
      });
    } else if (state.status === 'playing' && !state.coopSpectating) {
      accSend.current += clamped;
      if (accSend.current >= 1 / SEND_HZ) {
        accSend.current = 0;
        session.sendToHost({
          type: 'input',
          name: localName,
          x: state.position.x,
          y: state.position.y,
          z: state.position.z,
          yaw: state.yaw,
          pitch: state.pitch,
          activeWeapon: state.activeWeapon,
          reload: !!state._coopReloadReq,
          muzzleFlash: state.muzzleFlash > 0,
          reviveTargetId: state.reviveTargetId || null,
          outfitId: state.outfitId || 'chef',
          outfitColor: state.outfitColor || 'default',
          outfitGender: state.outfitGender || 'male',
          outfitYarmulke: !!state.outfitYarmulke,
          outfitLoadout: state.outfitLoadout || null,
        });
        state._coopReloadReq = false;
      }
    }
  });

  return null;
}

function tickHost({
  session,
  state,
  zombiesRef,
  remotesRef,
  peerPlayers,
  pendingHits,
  pendingInteracts,
  accSnap,
  clamped,
}) {
  const hostId = state.coopLocalId;
  const hostP = peerPlayers.current.get(hostId);
  if (hostP) {
    if (state.status === 'playing') {
      hostP.position.x = state.position.x;
      hostP.position.y = state.position.y;
      hostP.position.z = state.position.z;
      hostP.yaw = state.yaw;
      hostP.pitch = state.pitch;
      hostP.hp = state.hp;
      hostP.maxHp = state.maxHp;
      hostP.points = state.points;
      hostP.weapons = state.weapons;
      hostP.activeWeapon = state.activeWeapon;
      hostP.reloading = state.reloading;
      hostP.muzzleFlash = state.muzzleFlash;
      hostP.totalKills = state.totalKills;
      hostP.damageCooldown = state.damageCooldown;
      hostP.reviveTargetId = state.reviveTargetId || null;
      if (hostP.status !== 'downed' && hostP.status !== 'dead') {
        hostP.status = 'alive';
      }
    } else if (state.status === 'downed' && hostP.status === 'alive') {
      // Local just got knocked this frame (before peer mirror)
      hostP.hp = 0;
      hostP.status = 'downed';
      hostP.bleedoutTimer = state.bleedoutTimer || REVIVE.bleedoutTime;
      hostP.reviveProgress = 0;
      hostP.position.x = state.position.x;
      hostP.position.y = state.position.y;
      hostP.position.z = state.position.z;
      hostP.yaw = state.yaw;
    } else if (state.status === 'dead' && hostP.status !== 'spectator') {
      hostP.status = 'dead';
      hostP.hp = 0;
    }
    if (state.status === 'playing' || state.status === 'downed') {
      hostP.points = state.points;
      hostP.weapons = state.weapons;
      hostP.activeWeapon = state.activeWeapon;
      hostP.totalKills = state.totalKills;
    }
    hostP.outfitId = state.outfitId || hostP.outfitId || 'chef';
    hostP.outfitColor = state.outfitColor || hostP.outfitColor || 'default';
    hostP.outfitGender = state.outfitGender || hostP.outfitGender || 'male';
    hostP.outfitYarmulke = !!state.outfitYarmulke;
    hostP.outfitLoadout = state.outfitLoadout || hostP.outfitLoadout || null;
  }

  while (pendingHits.current.length) {
    const hit = pendingHits.current.shift();
    const shooter = peerPlayers.current.get(hit.peerId);
    if (
      !shooter ||
      shooter.status === 'dead' ||
      shooter.status === 'spectator' ||
      shooter.status === 'downed'
    ) {
      continue;
    }
    // Resolve the shot with whatever is actually in the shooter's hand. The old
    // code preferred the client's claimed weaponId and only charged ammo when
    // the claim matched the slot — so claiming a Crust Cannon while holding a
    // pistol fired one, for free.
    const slot = shooter.weapons[shooter.activeWeapon];
    const def = (slot && WEAPONS[slot.id]) || WEAPONS.m1911;
    if (!def.melee) {
      if (!slot || shooter.reloading || slot.mag <= 0) continue;
      slot.mag -= 1;
    }
    const shot = sanitizeFireRay(hit.ray, shooter.position);
    if (!shot) continue;
    const origin = new THREE.Vector3(shot.origin.x, shot.origin.y, shot.origin.z);
    const dir = new THREE.Vector3(shot.dir.x, shot.dir.y, shot.dir.z);
    const score = {
      points: shooter.points,
      pointsMult: shooter.pointsMult || state.pointsMult || 1,
      totalKills: shooter.totalKills || 0,
    };
    const fireDef =
      hit.ads && def.adsSpread != null ? { ...def, spread: def.adsSpread } : def;
    fireHitscanFromRay(origin, dir, fireDef, zombiesRef.current, state, score);
    shooter.points = score.points;
    shooter.totalKills = score.totalKills;
  }

  // Tick remote reloads
  peerPlayers.current.forEach((p) => {
    if (p.id === hostId) return;
    if (!p.reloading) return;
    p.reloadTimer -= clamped;
    if (p.reloadTimer <= 0) {
      const slot = p.weapons[p.activeWeapon];
      const def = slot && WEAPONS[slot.id];
      if (slot && def) {
        const need = def.magSize - slot.mag;
        const take = Math.min(need, slot.reserve);
        slot.mag += take;
        slot.reserve -= take;
      }
      p.reloading = false;
    }
  });

  while (pendingInteracts.current.length) {
    const it = pendingInteracts.current.shift();
    const p = peerPlayers.current.get(it.peerId);
    if (
      !p ||
      p.status === 'dead' ||
      p.status === 'spectator' ||
      p.status === 'downed'
    ) {
      continue;
    }
    // Clients author their own prompts, so without this a peer could open any
    // door or buy off any wall from wherever it happened to be standing.
    if (!canPlayerInteract(getActiveMap(), it.prompt, p.position)) continue;
    applyInteractForPlayer(state, p, it.prompt);
  }

  // Bleedout + revive (host authoritative)
  tickDownedAndRevives(peerPlayers.current, hostId, state, clamped);

  // Mirror host peer → local game state (revive / bleedout death)
  if (hostP) {
    syncHostLocalFromPeer(state, hostP);
  }

  const remotes = [];
  peerPlayers.current.forEach((p) => {
    if (p.id === hostId) return;
    remotes.push({
      id: p.id,
      name: p.name,
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      yaw: p.yaw,
      pitch: p.pitch,
      hp: p.hp,
      maxHp: p.maxHp,
      status: p.status,
      bleedoutTimer: p.bleedoutTimer || 0,
      reviveProgress: p.reviveProgress || 0,
      muzzleFlash: p.muzzleFlash > 0,
      weaponId: p.weapons?.[p.activeWeapon]?.id,
      outfitId: p.outfitId || 'chef',
      outfitColor: p.outfitColor || 'default',
      outfitGender: p.outfitGender || 'male',
      outfitYarmulke: !!p.outfitYarmulke,
      outfitLoadout: p.outfitLoadout || null,
    });
    if (p.muzzleFlash > 0) p.muzzleFlash -= clamped;
    if (p.damageCooldown > 0) p.damageCooldown -= clamped;
    tickHealthRegen(p, clamped, p.status === 'alive');
  });
  remotesRef.current = remotes;

  state.coopTargets = [];
  peerPlayers.current.forEach((p) => {
    if (p.status === 'alive' && p.hp > 0) {
      state.coopTargets.push({
        id: p.id,
        x: p.position.x,
        z: p.position.z,
        floorY: Math.max(0, (p.position.y || 0) - 1.6),
        player: p,
        isLocal: p.id === hostId,
      });
    }
  });

  const anyoneInPlay = [...peerPlayers.current.values()].some(
    (p) =>
      (p.status === 'alive' && p.hp > 0) || p.status === 'downed'
  );
  if (!anyoneInPlay && peerPlayers.current.size > 0) {
    state.coopMatchOver = true;
    if (state.status !== 'dead') {
      state.status = 'dead';
      document.exitPointerLock?.();
    }
  }

  accSnap.current += clamped;
  if (accSnap.current >= 1 / SNAP_HZ) {
    accSnap.current = 0;
    session.broadcast({
      type: 'snap',
      players: [...peerPlayers.current.values()].map(snapshotPlayerNet),
      zombies: zombiesRef.current.map(snapshotZombieNet),
      doors: packDoors(state.doors),
      rooms: packRooms(state.rooms),
      windows: packWindows(state.windows),
      mysteryBox: state.mysteryBox
        ? {
            phase: state.mysteryBox.phase,
            displayId: state.mysteryBox.displayId,
            resultId: state.mysteryBox.resultId,
            offerTimer: state.mysteryBox.offerTimer,
            spinTimer: state.mysteryBox.spinTimer,
          }
        : null,
      pies: (state.pies || [])
        .filter((p) => !p.spent)
        .map((p) => ({
          id: p.id,
          x: p.x,
          y: p.y,
          z: p.z,
        })),
      round: state.round,
      roundPhase: state.roundPhase,
      intermissionTimer: state.intermissionTimer,
      roundBanner: state.roundBanner,
      zombiesAlive: state.zombiesAlive,
      totalKills: state.totalKills,
      matchOver: !!state.coopMatchOver,
    });
  }
}

function tickDownedAndRevives(peers, _hostId, _state, dt) {
  const beingRevived = new Set();

  peers.forEach((reviver) => {
    if (reviver.status !== 'alive' || reviver.hp <= 0) {
      reviver.reviveTargetId = null;
      return;
    }
    const tid = reviver.reviveTargetId;
    if (!tid || tid === reviver.id) return;
    const target = peers.get(tid);
    if (!target || target.status !== 'downed') {
      reviver.reviveTargetId = null;
      return;
    }
    const dist = Math.hypot(
      reviver.position.x - target.position.x,
      reviver.position.z - target.position.z
    );
    if (dist > REVIVE.range) {
      reviver.reviveTargetId = null;
      return;
    }
    beingRevived.add(tid);
  });

  peers.forEach((p) => {
    if (p.status !== 'downed') {
      if (p.status === 'alive') p.reviveProgress = 0;
      return;
    }

    if (beingRevived.has(p.id)) {
      p.reviveProgress = Math.min(1, (p.reviveProgress || 0) + dt / REVIVE.holdTime);
      if (p.reviveProgress >= 1) {
        revivePlayer(p);
        play('boardRepair');
      }
    } else {
      p.reviveProgress = Math.max(0, (p.reviveProgress || 0) - dt * 0.85);
      p.bleedoutTimer = Math.max(0, (p.bleedoutTimer || 0) - dt);
      if (p.bleedoutTimer <= 0) {
        p.status = 'dead';
        p.bleedoutTimer = 0;
        p.reviveProgress = 0;
      }
    }
  });
}

function syncHostLocalFromPeer(state, hostP) {
  if (hostP.status === 'downed') {
    state.status = 'downed';
    state.hp = 0;
    state.bleedoutTimer = hostP.bleedoutTimer || 0;
    state.reviveProgress = hostP.reviveProgress || 0;
  } else if (hostP.status === 'alive' && state.status === 'downed') {
    state.status = 'playing';
    state.hp = hostP.hp;
    state.maxHp = hostP.maxHp || state.maxHp;
    state.bleedoutTimer = 0;
    state.reviveProgress = 0;
    state.reviveTargetId = null;
    state.damageCooldown = hostP.damageCooldown || 0;
  } else if (hostP.status === 'dead' && state.status !== 'dead') {
    state.status = 'dead';
    state.hp = 0;
    state.bleedoutTimer = 0;
    state.reviveProgress = 0;
    document.exitPointerLock?.();
  }
}

function applyHostSnap(msg, stateRef, zombiesRef, remotesRef) {
  if (!msg || msg.type !== 'snap') return;
  const state = stateRef.current;

  if (msg.doors) {
    Object.keys(msg.doors).forEach((id) => {
      if (state.doors[id]) state.doors[id].open = !!msg.doors[id].open;
    });
  }
  if (msg.rooms) {
    Object.keys(msg.rooms).forEach((id) => {
      if (state.rooms[id]) state.rooms[id].open = !!msg.rooms[id].open;
    });
  }
  if (msg.windows) {
    const prompt = state.interactPrompt;
    const repairing = prompt?.type === 'window' && inputState.keys.f;
    Object.keys(msg.windows).forEach((id) => {
      const prev = state.windows[id]?.boards ?? 0;
      const next = msg.windows[id].boards ?? 0;
      if (state.windows[id]) state.windows[id].boards = next;
      // Client credit: finished a window you were boarding
      if (
        repairing &&
        prompt.id === id &&
        prev < BARRICADE.maxBoards &&
        next >= BARRICADE.maxBoards
      ) {
        const result = recordWindowFullyRebuilt();
        if (result.unlockedMossad) {
          state.roundBanner = 'OUTFIT UNLOCKED: Mossad Agent';
          state.roundBannerTimer = 3.5;
        }
        queueAchievementBanners(state, result.achievements);
      }
    });
  }

  if (msg.mysteryBox && state.mysteryBox) {
    Object.assign(state.mysteryBox, msg.mysteryBox);
  }

  if (msg.pies) {
    // Clients only render host pies; sim runs on host
    state.pies = msg.pies.map((p) => ({
      ...p,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 1,
      damage: 0,
      splash: 0,
      grav: 0,
      spent: false,
      _clientView: true,
    }));
  }

  state.round = msg.round;
  state.roundPhase = msg.roundPhase;
  state.intermissionTimer = msg.intermissionTimer;
  state.roundBanner = msg.roundBanner;
  state.zombiesAlive = msg.zombiesAlive;
  state.totalKills = msg.totalKills;

  const zs = msg.zombies || [];
  const cur = zombiesRef.current;
  cur.length = 0;
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i];
    cur.push({
      id: z.id,
      x: z.x,
      z: z.z,
      y: z.y || 0,
      hp: z.hp,
      maxHp: z.maxHp,
      speed: 0,
      dead: z.dead,
      deathTimer: z.deathTimer,
      attackCooldown: 0,
      attackT: z.attackT == null ? null : z.attackT,
      attackHit: false,
      hitFlash: z.hitFlash ? 0.1 : 0,
      yaw: z.yaw,
      stepAcc: 0,
      phase: z.phase || 'chase',
      walkPhase: z.walkPhase || 0,
      moving: !!z.moving,
      windowId: null,
      tearTimer: 0,
      climbT: 0,
      variant: z.variant || null,
      variantSeed: z.variantSeed ?? 0,
      boss: !!z.boss,
      bossTheme: z.bossTheme || null,
      scale: z.scale || 1,
      radius: z.radius || 0.35,
    });
  }

  const localId = state.coopLocalId;
  const remotes = [];
  (msg.players || []).forEach((np) => {
    if (np.id === localId) {
      state.hp = np.hp;
      state.maxHp = np.maxHp;
      state.points = np.points;
      // Authoritative loadout after host-validated wallbuys
      if (np.weapons) state.weapons = np.weapons;
      if (typeof np.activeWeapon === 'number') state.activeWeapon = np.activeWeapon;
      state.reloading = !!np.reloading;
      // Soft-correct position if wildly desynced (spawn / teleport)
      if (
        typeof np.x === 'number' &&
        typeof np.z === 'number' &&
        (Math.abs(state.position.x - np.x) > 8 || Math.abs(state.position.z - np.z) > 8)
      ) {
        state.position.x = np.x;
        state.position.y = np.y;
        state.position.z = np.z;
      }
      if (np.status === 'spectator') {
        state.coopSpectating = true;
        if (state.status === 'playing' || state.status === 'downed') {
          state.status = 'dead';
          document.exitPointerLock?.();
        }
      } else if (np.status === 'downed') {
        const wasPlaying = state.status === 'playing';
        state.status = 'downed';
        state.hp = 0;
        state.bleedoutTimer = np.bleedoutTimer || 0;
        state.reviveProgress = np.reviveProgress || 0;
        if (wasPlaying) document.exitPointerLock?.();
      } else if (np.status === 'alive' && (state.status === 'downed' || state.status === 'dead')) {
        // Teammate revived us
        state.status = 'playing';
        state.hp = np.hp;
        state.maxHp = np.maxHp || state.maxHp;
        state.bleedoutTimer = 0;
        state.reviveProgress = 0;
        state.reviveTargetId = null;
        if (typeof np.x === 'number') {
          state.position.x = np.x;
          state.position.y = np.y;
          state.position.z = np.z;
        }
      } else if (np.status === 'dead' && (state.status === 'playing' || state.status === 'downed')) {
        state.status = 'dead';
        state.hp = 0;
        state.bleedoutTimer = 0;
        state.reviveProgress = 0;
        document.exitPointerLock?.();
      } else if (np.status === 'alive' && state.status === 'playing') {
        state.bleedoutTimer = 0;
        state.reviveProgress = 0;
      }
    } else {
      remotes.push({
        id: np.id,
        name: np.name,
        x: np.x,
        y: np.y,
        z: np.z,
        yaw: np.yaw,
        pitch: np.pitch,
        hp: np.hp,
        maxHp: np.maxHp,
        status: np.status,
        bleedoutTimer: np.bleedoutTimer || 0,
        reviveProgress: np.reviveProgress || 0,
        muzzleFlash: np.muzzleFlash,
        weaponId: np.weaponId,
        outfitId: np.outfitId || 'chef',
        outfitColor: np.outfitColor || 'default',
        outfitGender: np.outfitGender || 'male',
        outfitYarmulke: !!np.outfitYarmulke,
        outfitLoadout: np.outfitLoadout || null,
      });
    }
  });
  remotesRef.current = remotes;

  if (msg.matchOver) {
    state.coopMatchOver = true;
    if (state.status !== 'dead') {
      state.status = 'dead';
      document.exitPointerLock?.();
    }
  }
}

function applyInteractForPlayer(worldState, player, prompt) {
  if (!prompt) return;
  if (prompt.type === 'door') {
    const doorState = worldState.doors[prompt.id];
    const doorMeta = getActiveMap().DOORS.find((d) => d.id === prompt.id);
    if (!doorMeta || !doorState || doorState.open) return;
    if (player.points < doorMeta.cost) return;
    player.points -= doorMeta.cost;
    doorState.open = true;
    doorMeta.unlocks.forEach((roomId) => {
      if (worldState.rooms[roomId]) worldState.rooms[roomId].open = true;
    });
    if (player.id === worldState.coopLocalId) {
      const { newly } = recordAchievementEvent('door');
      queueAchievementBanners(worldState, newly);
    }
    return;
  }
  if (prompt.type === 'window') {
    const creditLocal = player.id === worldState.coopLocalId;
    if (tryRepairBoard(worldState, prompt.id, player, creditLocal)) {
      play('boardRepair');
    }
    return;
  }
  if (prompt.type === 'wallbuy') {
    const def = WEAPONS[prompt.weaponId];
    if (!def) return;
    const ownedIdx = player.weapons.findIndex((w) => w.id === prompt.weaponId);
    const cost = ownedIdx >= 0 ? def.ammoCost : def.wallCost;
    if (player.points < cost) return;
    player.points -= cost;
    if (ownedIdx >= 0) {
      const slot = player.weapons[ownedIdx];
      slot.reserve = def.reserve;
      slot.mag = def.magSize;
      player.activeWeapon = ownedIdx;
    } else {
      const loadout = createWeaponLoadout(prompt.weaponId);
      if (player.weapons.length < 2) {
        player.weapons.push(loadout);
        player.activeWeapon = player.weapons.length - 1;
      } else {
        const replaceIdx = player.activeWeapon === 0 ? 1 : 0;
        player.weapons[replaceIdx] = loadout;
        player.activeWeapon = replaceIdx;
      }
    }
    return;
  }

  if (prompt.type === 'mystery') {
    if (prompt.action === 'spin') {
      if (worldState.mysteryBox?.phase !== 'idle') return;
      if (player.points < MYSTERY_BOX_COST) return;
      // Temporarily map player points onto world for spend helper
      const saved = worldState.points;
      worldState.points = player.points;
      const ok = trySpinMysteryBox(worldState);
      player.points = worldState.points;
      worldState.points = saved;
      if (!ok) return;
    } else if (prompt.action === 'take') {
      if (worldState.mysteryBox?.phase !== 'offer') return;
      const resultId = worldState.mysteryBox.resultId;
      if (!resultId) return;
      const given = giveWeaponToLoadout(
        player.weapons,
        player.activeWeapon,
        resultId
      );
      player.weapons = given.weapons;
      player.activeWeapon = given.activeWeapon;
      worldState.mysteryBox.phase = 'idle';
      worldState.mysteryBox.resultId = null;
      worldState.mysteryBox.displayId = null;
    }
  }
}

export function coopSendFire(session, camera, weaponDef, ads = false) {
  if (!session || session.role !== 'client') return;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  session.sendToHost({
    type: 'fire',
    weaponId: weaponDef.id,
    ads: !!ads,
    ray: {
      ox: camera.position.x,
      oy: camera.position.y,
      oz: camera.position.z,
      dx: dir.x,
      dy: dir.y,
      dz: dir.z,
    },
  });
}

export function coopSendInteract(session, prompt) {
  if (!session || session.role !== 'client' || !prompt) return;
  session.sendToHost({
    type: 'interact',
    prompt: {
      type: prompt.type,
      id: prompt.id,
      weaponId: prompt.weaponId,
      action: prompt.action,
    },
  });
}
