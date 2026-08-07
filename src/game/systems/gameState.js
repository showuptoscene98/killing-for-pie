import { POINTS, PLAYER, ROUND } from '../constants';
import { WEAPONS, createWeaponLoadout } from '../weapons/weaponDefs';
import {
  DEFAULT_MAP_ID,
  getActiveMap,
  getMap,
  loadSavedMapId,
  setActiveMap,
} from '../map/activeMap';
import { initWindowState } from './WindowSystem';
import { createMysteryBoxState } from './MysteryBoxSystem';
import { createPowerupState } from './PowerupSystem';
import { transitStartMapId } from './transitMode';

const DEFAULT_BONUSES = {
  hpMult: 1,
  reloadMult: 1,
  pointsMult: 1,
};

export function createInitialGameState(bonuses = DEFAULT_BONUSES) {
  const transit = bonuses.gameMode === 'transit' || !!bonuses.transitMode;
  let map = getActiveMap();
  if (transit) {
    // Transit always opens on Airfield (nacht), not the deploy picker map
    map = getMap(transitStartMapId());
    setActiveMap(map.id);
  } else if (map?.hub) {
    // Never boot a combat session on the hub yard (coop Start Match race used to)
    const mid = loadSavedMapId() || DEFAULT_MAP_ID;
    // Never use hub id for combat — Pie Yard / saved combat only
    map = getMap(mid === 'campHub' ? DEFAULT_MAP_ID : mid);
    setActiveMap(map.id);
  }
  const rooms = {};
  Object.keys(map.ROOMS).forEach((id) => {
    rooms[id] = { ...map.ROOMS[id] };
  });

  const doors = {};
  map.DOORS.forEach((d) => {
    doors[d.id] = { open: false, cost: d.cost, unlocks: d.unlocks };
  });

  const maxHp = Math.round(PLAYER.maxHp * (bonuses.hpMult || 1));

  return {
    status: 'playing',
    mapId: map.id,
    mapRevision: 0,
    /** 'classic' | 'transit' — set by deploy / createInitial options */
    gameMode: bonuses.gameMode || 'classic',
    transitMode: bonuses.gameMode === 'transit' || !!bonuses.transitMode,
    transitReached: [],
    _transitLock: 0,
    points: POINTS.starting,
    round: 0,
    roundPhase: 'intermission',
    intermissionTimer: 1.5,
    zombiesRemainingToSpawn: 0,
    zombiesAlive: 0,
    bossPending: false,
    totalKills: 0,
    hp: maxHp,
    maxHp,
    damageCooldown: 0,
    regenCooldown: 0,
    position: {
      ...map.PLAYER_SPAWN,
      y: (map.PLAYER_SPAWN.y || 0) + PLAYER.height,
    },
    floorY: map.PLAYER_SPAWN.y || 0,
    velocityY: 0,
    grounded: true,
    yaw: 0,
    pitch: 0,
    weapons: [createWeaponLoadout('m1911')],
    activeWeapon: 0,
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    rooms,
    doors,
    windows: initWindowState(),
    repairAcc: 0,
    interactPrompt: null,
    roundBanner: null,
    roundBannerTimer: 0,
    muzzleFlash: 0,
    recoilKick: 0,
    adsAmount: 0,
    locked: false,
    reloadMult: bonuses.reloadMult || 1,
    pointsMult: bonuses.pointsMult || 1,
    outfitId: bonuses.outfitId || 'chef',
    outfitColor: bonuses.outfitColor || 'default',
    outfitGender: bonuses.outfitGender || 'male',
    outfitYarmulke: !!bonuses.outfitYarmulke,
    outfitLoadout: bonuses.outfitLoadout || null,
    mysteryBox: createMysteryBoxState(),
    pies: [],
    powerups: createPowerupState(),
  };
}

export function zombiesForRound(round) {
  return Math.min(
    60,
    Math.floor(ROUND.baseZombies + (round - 1) * ROUND.perRound)
  );
}

export function zombieHpForRound(round) {
  return ROUND.baseHp + (round - 1) * ROUND.hpPerRound;
}

export function bossHpForRound(round) {
  return Math.round(zombieHpForRound(round) * ROUND.bossHpMult);
}

export function isBossRound(round) {
  return round > 0 && round % ROUND.bossEvery === 0;
}

export function zombieSpeedForRound(round) {
  return Math.min(
    ROUND.maxSpeed,
    ROUND.baseSpeed + (round - 1) * ROUND.speedPerRound
  );
}

export function getActiveWeapon(state) {
  const slot = state.weapons[state.activeWeapon];
  if (!slot) return null;
  return { ...WEAPONS[slot.id], ...slot };
}

export { WEAPONS, POINTS, PLAYER, ROUND };
