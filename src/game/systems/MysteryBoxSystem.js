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

export function createMysteryBoxState() {
  return {
    phase: 'idle', // idle | spinning | offer
    spinTimer: 0,
    offerTimer: 0,
    cycleIndex: 0,
    cycleTimer: 0,
    resultId: null,
    displayId: null,
  };
}

export function tickMysteryBox(box, dt) {
  if (!box) return;
  if (box.phase === 'spinning') {
    box.spinTimer -= dt;
    box.cycleTimer -= dt;
    if (box.cycleTimer <= 0) {
      box.cycleIndex = (box.cycleIndex + 1) % MYSTERY_BOX_POOL.length;
      box.displayId = MYSTERY_BOX_POOL[box.cycleIndex];
      // accelerate near end
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
      box.phase = 'idle';
      box.resultId = null;
      box.displayId = null;
    }
  }
}

export function trySpinMysteryBox(state) {
  const box = state.mysteryBox;
  if (!box || box.phase !== 'idle') return false;
  if (!spend(state, MYSTERY_BOX_COST)) return false;

  const pool = MYSTERY_BOX_POOL.filter((id) => {
    // Prefer not rolling a gun you already hold, unless pool would empty
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
  box.phase = 'idle';
  box.resultId = null;
  box.displayId = null;
  box.offerTimer = 0;
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
