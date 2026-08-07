/**
 * Transit mode — COD-style multi-map run.
 * Map changes every ROUNDS_PER_MAP rounds; Pie Yard (camp) is always last.
 */

import { PLAYER } from '../constants';
import { getMap, setActiveMap } from '../map/activeMap';
import { clearCollisionCache } from './collision';
import { initWindowState } from './WindowSystem';
import { createMysteryBoxState } from './MysteryBoxSystem';
import { createPowerupState } from './PowerupSystem';
import { loadCamp, saveCamp } from '../camp/campData';
import { onTransitMapReached } from '../camp/questSystem';

/** Combat maps in travel order — camp (Pie Yard) is the finale. */
export const TRANSIT_MAP_ORDER = [
  'nacht',
  'bunker',
  'sofia',
  'farm',
  'house',
  'camp',
];

export const TRANSIT_ROUNDS_PER_MAP = 5;

export const TRANSIT_MODE_ID = 'transit';

export function mapForTransitRound(round) {
  if (round < 1) return TRANSIT_MAP_ORDER[0];
  const idx = Math.min(
    Math.floor((round - 1) / TRANSIT_ROUNDS_PER_MAP),
    TRANSIT_MAP_ORDER.length - 1
  );
  return TRANSIT_MAP_ORDER[idx];
}

export function transitStartMapId() {
  return TRANSIT_MAP_ORDER[0];
}

export function rebuildMapRuntime(state, mapId) {
  const map = getMap(mapId);
  setActiveMap(map.id);
  clearCollisionCache();

  const rooms = {};
  Object.keys(map.ROOMS).forEach((id) => {
    rooms[id] = { ...map.ROOMS[id] };
  });
  const doors = {};
  map.DOORS.forEach((d) => {
    doors[d.id] = { open: false, cost: d.cost, unlocks: d.unlocks };
  });

  state.mapId = map.id;
  state.mapRevision = (state.mapRevision || 0) + 1;
  state.rooms = rooms;
  state.doors = doors;
  state.windows = initWindowState();
  state.mysteryBox = createMysteryBoxState();
  state.pies = [];
  state.powerups = createPowerupState();
  state.repairAcc = 0;
  state.interactPrompt = null;

  const spawn = map.PLAYER_SPAWN || { x: 0, y: 0, z: 0 };
  // Mutate in place — Player/camera keep the same position object ref
  if (!state.position) state.position = { x: 0, y: PLAYER.height, z: 0 };
  state.position.x = spawn.x;
  state.position.y = (spawn.y || 0) + PLAYER.height;
  state.position.z = spawn.z;
  state.floorY = spawn.y || 0;
  state.velocityY = 0;
  state.velocityX = 0;
  state.velocityZ = 0;
  state.grounded = true;
  state.slide = null;
  state.yaw = 0;
  state.pitch = 0;
  /** Hold spawn for a beat so movement/collision can't yeet you pre-remount */
  state._transitLock = 0.55;

  return map;
}

/**
 * Swap maps mid-run for Transit. Clears live zombies via zombiesRef.
 * @returns {{ changed: boolean, map: object|null }}
 */
export function applyTransitIfNeeded(state, zombiesRef) {
  if (!state?.transitMode || state.status === 'dead') {
    return { changed: false, map: null };
  }
  const want = mapForTransitRound(state.round);
  if (!want || want === state.mapId) {
    return { changed: false, map: null };
  }

  const map = rebuildMapRuntime(state, want);
  if (zombiesRef) zombiesRef.current = [];
  state.zombiesAlive = 0;
  state.zombiesRemainingToSpawn = Math.max(0, state.zombiesRemainingToSpawn);

  state.transitReached = state.transitReached || [];
  if (!state.transitReached.includes(map.id)) {
    state.transitReached.push(map.id);
  }

  try {
    const camp = onTransitMapReached(loadCamp(), map.id);
    saveCamp(camp);
  } catch {
    /* ignore quest persist failures mid-run */
  }

  state.roundBanner = `TRANSIT → ${map.name.toUpperCase()}`;
  state.roundBannerTimer = 3.4;
  /** Coop host: teleport every squad body to the new spawn next tick */
  state._transitReseat = true;
  return { changed: true, map };
}
