import {
  MYSTERY_BOX_COST,
  MYSTERY_BOX_POOL,
  MYSTERY_SPIN_TIME,
  MYSTERY_OFFER_TIME,
  WEAPONS,
  giveWeaponToLoadout,
} from '../weapons/weaponDefs';
import { spend } from './PointsSystem';
import { recordAchievementEvent } from '../camp/campData';
import { queueAchievementBanners } from '../camp/achievements';
import { getActiveMap } from '../map/activeMap';

/** Chance the box jumps after a completed roll (take or expire). */
export const MYSTERY_RELOCATE_CHANCE = 0.32;
/** Guarantee a move after this many rolls without relocating. */
export const MYSTERY_FORCE_RELOCATE_USES = 5;

export function getMysteryBoxSpots(map) {
  if (!map) return [];
  if (Array.isArray(map.MYSTERY_BOX_SPOTS) && map.MYSTERY_BOX_SPOTS.length) {
    return map.MYSTERY_BOX_SPOTS;
  }
  if (map.MYSTERY_BOX) {
    return [
      {
        position: map.MYSTERY_BOX.position,
        rotation: map.MYSTERY_BOX.rotation || [0, 0, 0],
        room: map.MYSTERY_BOX.room || 'spawn',
      },
    ];
  }
  return [];
}

function applySpot(box, spot, index) {
  box.spotIndex = index;
  box.position = [...spot.position];
  box.rotation = [...(spot.rotation || [0, 0, 0])];
}

export function createMysteryBoxState(map = null) {
  const spots = getMysteryBoxSpots(map || getActiveMap());
  const spot = spots[0] || null;
  return {
    phase: 'idle', // idle | spinning | offer
    spinTimer: 0,
    offerTimer: 0,
    cycleIndex: 0,
    cycleTimer: 0,
    resultId: null,
    displayId: null,
    spotIndex: 0,
    usesSinceMove: 0,
    position: spot ? [...spot.position] : [0, 0, 0],
    rotation: spot ? [...(spot.rotation || [0, 0, 0])] : [0, 0, 0],
    relocateFlash: 0,
  };
}

function roomIsOpen(state, roomId) {
  if (!roomId) return true;
  const room = state.rooms?.[roomId];
  if (!room) return true;
  return room.open !== false;
}

/** Pick a different open-room spot. Returns true if moved. */
export function tryRelocateMysteryBox(state) {
  const box = state.mysteryBox;
  if (!box) return false;
  const spots = getMysteryBoxSpots(getActiveMap());
  if (spots.length < 2) return false;

  const candidates = [];
  for (let i = 0; i < spots.length; i++) {
    if (i === box.spotIndex) continue;
    if (!roomIsOpen(state, spots[i].room)) continue;
    candidates.push(i);
  }
  if (!candidates.length) return false;

  const next = candidates[Math.floor(Math.random() * candidates.length)];
  applySpot(box, spots[next], next);
  box.usesSinceMove = 0;
  box.relocateFlash = 2.8;
  state.roundBanner = 'MYSTERY BOX MOVED';
  state.roundBannerTimer = 2.6;
  return true;
}

function maybeRelocateAfterCycle(state) {
  const box = state.mysteryBox;
  if (!box) return;
  box.usesSinceMove = (box.usesSinceMove || 0) + 1;
  const force = box.usesSinceMove >= MYSTERY_FORCE_RELOCATE_USES;
  if (force || Math.random() < MYSTERY_RELOCATE_CHANCE) {
    tryRelocateMysteryBox(state);
  }
}

function clearOffer(box) {
  box.phase = 'idle';
  box.resultId = null;
  box.displayId = null;
  box.offerTimer = 0;
}

/** End a roll (take or timeout) and maybe jump the box. */
export function completeMysteryBoxUse(state) {
  const box = state.mysteryBox;
  if (!box) return;
  clearOffer(box);
  maybeRelocateAfterCycle(state);
}

export function tickMysteryBox(state, dt) {
  const box = state?.mysteryBox;
  if (!box) return;

  if (box.relocateFlash > 0) {
    box.relocateFlash = Math.max(0, box.relocateFlash - dt);
  }

  if (box.phase === 'spinning') {
    box.spinTimer -= dt;
    box.cycleTimer -= dt;
    if (box.cycleTimer <= 0) {
      box.cycleIndex = (box.cycleIndex + 1) % MYSTERY_BOX_POOL.length;
      box.displayId = MYSTERY_BOX_POOL[box.cycleIndex];
      const t = Math.max(box.spinTimer, 0.05);
      box.cycleTimer = Math.max(0.05, 0.08 + t * 0.04);
    }
    if (box.spinTimer <= 0) {
      box.phase = 'offer';
      box.offerTimer = MYSTERY_OFFER_TIME;
      box.displayId = box.resultId;
    }
    return;
  }
  if (box.phase === 'offer') {
    box.offerTimer -= dt;
    if (box.offerTimer <= 0) {
      clearOffer(box);
      maybeRelocateAfterCycle(state);
    }
  }
}

export function trySpinMysteryBox(state) {
  const box = state.mysteryBox;
  if (!box || box.phase !== 'idle') return false;
  if (!spend(state, MYSTERY_BOX_COST)) return false;

  const pool = MYSTERY_BOX_POOL.filter((id) => {
    return !state.weapons.some((w) => w.id === id);
  });
  const rollPool = pool.length ? pool : MYSTERY_BOX_POOL;
  const resultId = rollPool[Math.floor(Math.random() * rollPool.length)];

  box.phase = 'spinning';
  box.spinTimer = MYSTERY_SPIN_TIME;
  box.cycleTimer = 0.08;
  box.cycleIndex = Math.floor(Math.random() * MYSTERY_BOX_POOL.length);
  box.displayId = MYSTERY_BOX_POOL[box.cycleIndex];
  box.resultId = resultId;
  const { newly } = recordAchievementEvent('boxSpin');
  queueAchievementBanners(state, newly);
  return true;
}

export function tryTakeMysteryWeapon(state) {
  const box = state.mysteryBox;
  if (!box || box.phase !== 'offer' || !box.resultId) return false;
  const given = giveWeaponToLoadout(
    state.weapons,
    state.activeWeapon,
    box.resultId
  );
  state.weapons = given.weapons;
  state.activeWeapon = given.activeWeapon;
  state.reloading = false;
  state.reloadTimer = 0;
  clearOffer(box);
  maybeRelocateAfterCycle(state);
  return true;
}

export function mysteryBoxPrompt(state) {
  const box = state.mysteryBox;
  if (!box) return null;
  if (box.phase === 'idle') {
    return {
      type: 'mystery',
      action: 'spin',
      label: `Hold [F] Mystery Box [${MYSTERY_BOX_COST}]`,
      cost: MYSTERY_BOX_COST,
    };
  }
  if (box.phase === 'spinning') {
    const name = WEAPONS[box.displayId]?.name || '???';
    return {
      type: 'mystery',
      action: 'wait',
      label: `Rolling… ${name}`,
    };
  }
  if (box.phase === 'offer') {
    const name = WEAPONS[box.resultId]?.name || 'Weapon';
    return {
      type: 'mystery',
      action: 'take',
      weaponId: box.resultId,
      label: `Hold [F] take ${name} (${Math.ceil(box.offerTimer)}s)`,
    };
  }
  return null;
}

/** Live world position for prompts / host range checks. */
export function mysteryBoxWorldPos(state, map = null) {
  const box = state?.mysteryBox;
  if (box?.position?.length >= 3) {
    return {
      x: box.position[0],
      y: (box.position[1] || 0) + 1.0,
      z: box.position[2],
    };
  }
  const def = (map || getActiveMap())?.MYSTERY_BOX;
  if (!def?.position) return null;
  return {
    x: def.position[0],
    y: (def.position[1] || 0) + 1.0,
    z: def.position[2],
  };
}
