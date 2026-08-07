import {
  DEFAULT_OUTFIT_ID,
  DEFAULT_OUTFIT_COLOR,
  DEFAULT_OUTFIT_GENDER,
  DEFAULT_LOADOUT,
  CUSTOM_OUTFIT_ID,
  isCustomOutfitId,
  getOutfitColor,
  getOutfitGender,
  getOutfitUnlock,
  outfitNeedsUnlock,
  partNeedsUnlock,
  loadoutFromCamp,
  loadoutFromPreset,
  syncLegacyOutfitFields,
  packLoadout,
  normalizeLoadout,
  resolveBodyStyleId,
} from '../player/outfits';
import {
  defaultAchievementState,
  normalizeAchievements,
  applyAchievementEvent,
} from './achievements';
import { defaultQuestState } from './questData';
import { normalizeQuests, onWindowsRebuilt } from './questSystem';

const STORAGE_KEY = 'undead_siege_camp_v1';

/** Persistent camp upgrades — small % bonuses, leveled */
export const CAMP_UPGRADES = {
  vitality: {
    id: 'vitality',
    name: 'Vitality',
    desc: '+5% max HP per rank',
    maxLevel: 10,
    baseCost: 400,
    costScale: 1.45,
    effectPerLevel: 0.05,
  },
  quickHands: {
    id: 'quickHands',
    name: 'Quick Hands',
    desc: '−4% reload time per rank',
    maxLevel: 10,
    baseCost: 450,
    costScale: 1.45,
    effectPerLevel: 0.04,
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger',
    desc: '+3% points from kills/hits per rank',
    maxLevel: 10,
    baseCost: 500,
    costScale: 1.5,
    effectPerLevel: 0.03,
  },
};

export function defaultCampState() {
  return {
    bank: 0,
    levels: {
      vitality: 0,
      quickHands: 0,
      scavenger: 0,
    },
    totalBanked: 0,
    runs: 0,
    outfitId: DEFAULT_OUTFIT_ID,
    outfitColor: DEFAULT_OUTFIT_COLOR,
    outfitGender: DEFAULT_OUTFIT_GENDER,
    outfitYarmulke: false,
    outfitLoadout: packLoadout(DEFAULT_LOADOUT),
    customLoadout: null,
    windowsRebuilt: 0,
    unlockedOutfits: [],
    achievements: defaultAchievementState(),
    quests: defaultQuestState(),
    parkour: { jumps: 0, slides: 0, highLands: 0, maxHeight: 0 },
  };
}

function normalizeCamp(parsed) {
  const base = defaultCampState();
  const camp = {
    ...base,
    ...parsed,
    levels: { ...base.levels, ...(parsed.levels || {}) },
    windowsRebuilt: Math.max(0, parsed.windowsRebuilt | 0),
    unlockedOutfits: Array.isArray(parsed.unlockedOutfits)
      ? [...parsed.unlockedOutfits]
      : [],
    achievements: normalizeAchievements(parsed.achievements),
    quests: normalizeQuests(parsed.quests),
    parkour: {
      jumps: Math.max(0, parsed.parkour?.jumps | 0),
      slides: Math.max(
        0,
        (parsed.parkour?.slides | 0) || (parsed.parkour?.mantles | 0)
      ),
      highLands: Math.max(0, parsed.parkour?.highLands | 0),
      maxHeight: Math.max(0, Number(parsed.parkour?.maxHeight) || 0),
    },
    outfitYarmulke: !!parsed.outfitYarmulke,
    outfitLoadout: parsed.outfitLoadout || null,
  };
  syncOutfitUnlocks(camp);
  camp.outfitGender = getOutfitGender(parsed.outfitGender || DEFAULT_OUTFIT_GENDER).id;
  camp.outfitColor = getOutfitColor(parsed.outfitColor || DEFAULT_OUTFIT_COLOR).id;
  camp.customLoadout =
    parsed.customLoadout && typeof parsed.customLoadout === 'object'
      ? packLoadout(normalizeLoadout(parsed.customLoadout))
      : null;

  if (isCustomOutfitId(parsed.outfitId)) {
    camp.outfitId = CUSTOM_OUTFIT_ID;
    let loadout = loadoutFromCamp({
      ...camp,
      outfitId: CUSTOM_OUTFIT_ID,
      outfitLoadout: parsed.outfitLoadout || camp.customLoadout,
      outfitColor: camp.outfitColor,
      outfitYarmulke: !!parsed.outfitYarmulke,
    });
    if (!isOutfitUnlocked(camp, loadout.body)) {
      loadout = { ...loadout, body: DEFAULT_OUTFIT_ID };
    }
    camp.outfitLoadout = packLoadout(loadout);
    camp.customLoadout = packLoadout(loadout);
    camp.outfitYarmulke = !!loadout.extras.yarmulke;
  } else {
    const presetId = resolvePlayableOutfitId(
      camp,
      resolveBodyStyleId(parsed.outfitId || DEFAULT_OUTFIT_ID)
    );
    camp.outfitId = presetId;
    const loadout = loadoutFromPreset(presetId, camp.outfitColor);
    camp.outfitLoadout = packLoadout(loadout);
    camp.outfitYarmulke = !!loadout.extras.yarmulke;
  }

  stripLockedParts(camp);
  syncLegacyOutfitFields(camp);
  return camp;
}

/** Drop accessories that need unlocks the player doesn't have */
export function stripLockedParts(camp) {
  // Presets are canonical — nothing to strip beyond regenerating later
  if (!isCustomOutfitId(camp.outfitId)) {
    const L = loadoutFromPreset(
      resolveBodyStyleId(camp.outfitId),
      camp.outfitColor || DEFAULT_OUTFIT_COLOR
    );
    camp.outfitLoadout = packLoadout(L);
    camp.outfitYarmulke = !!L.extras.yarmulke;
    return L;
  }
  const L = normalizeLoadout(camp.outfitLoadout || loadoutFromCamp(camp));
  if (!isPartUnlocked(camp, 'face', L.face)) L.face = 'none';
  if (!isOutfitUnlocked(camp, L.body)) L.body = DEFAULT_OUTFIT_ID;
  const next = { ...L.extras };
  Object.keys(next).forEach((id) => {
    if (!isPartUnlocked(camp, 'extra', id)) delete next[id];
  });
  L.extras = next;
  camp.outfitLoadout = packLoadout(L);
  camp.customLoadout = packLoadout(L);
  camp.outfitYarmulke = !!L.extras.yarmulke;
  return L;
}

export function isPartUnlocked(camp, partType, partId) {
  if (partType === 'body') return isOutfitUnlocked(camp, partId);
  const key = partNeedsUnlock(partType, partId);
  if (!key) return true;
  if (typeof key === 'string') return isOutfitUnlocked(camp, key);
  return true;
}

export function isOutfitUnlocked(camp, outfitId) {
  if (!outfitNeedsUnlock(outfitId)) return true;
  if (camp.unlockedOutfits?.includes(outfitId)) return true;
  const req = getOutfitUnlock(outfitId);
  if (req?.windowsRebuilt && (camp.windowsRebuilt || 0) >= req.windowsRebuilt) {
    return true;
  }
  return false;
}

/** Add unlocks earned by progress; mutates camp */
export function syncOutfitUnlocks(camp) {
  const unlocked = new Set(camp.unlockedOutfits || []);
  let changed = false;
  if ((camp.windowsRebuilt || 0) >= 2 && !unlocked.has('mossad')) {
    unlocked.add('mossad');
    changed = true;
  }
  if (changed) camp.unlockedOutfits = [...unlocked];
  return changed;
}

export function resolvePlayableOutfitId(camp, outfitId) {
  if (isCustomOutfitId(outfitId)) return CUSTOM_OUTFIT_ID;
  const id = resolveBodyStyleId(outfitId);
  if (isOutfitUnlocked(camp, id)) return id;
  return DEFAULT_OUTFIT_ID;
}

/**
 * Call when a window is fully boarded again (boards hit max).
 * Persists immediately so mid-run progress sticks.
 */
export function recordWindowFullyRebuilt() {
  let camp = loadCamp();
  camp.windowsRebuilt = (camp.windowsRebuilt || 0) + 1;
  const newlyUnlocked = syncOutfitUnlocks(camp);
  const ach = applyAchievementEvent(camp, 'window');
  camp = onWindowsRebuilt(camp);
  saveCamp(camp);
  return {
    windowsRebuilt: camp.windowsRebuilt,
    unlockedMossad: newlyUnlocked && camp.unlockedOutfits.includes('mossad'),
    achievements: ach,
    camp,
  };
}

/** Mid-run achievement event — persists immediately */
export function recordAchievementEvent(event, payload = {}) {
  const camp = loadCamp();
  const newly = applyAchievementEvent(camp, event, payload);
  saveCamp(camp);
  return { newly, camp };
}

export function loadCamp() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCampState();
    const parsed = JSON.parse(raw);
    const before = JSON.stringify(parsed.unlockedOutfits || []);
    const camp = normalizeCamp(parsed);
    // Persist unlock sync (e.g. mossad from windowsRebuilt) so it sticks after reload
    if (JSON.stringify(camp.unlockedOutfits || []) !== before) {
      saveCamp(camp);
    }
    return camp;
  } catch {
    return defaultCampState();
  }
}

export function saveCamp(camp) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(camp));
    return true;
  } catch {
    return false;
  }
}

/** Wipe meta progress (scrap, upgrades, unlocks, cosmetics). */
export function resetCamp() {
  const next = defaultCampState();
  saveCamp(next);
  return next;
}

export function upgradeCost(upgradeId, currentLevel) {
  const def = CAMP_UPGRADES[upgradeId];
  if (!def) return Infinity;
  return Math.floor(def.baseCost * def.costScale ** currentLevel);
}

export function canBuyUpgrade(camp, upgradeId) {
  const def = CAMP_UPGRADES[upgradeId];
  if (!def) return false;
  const level = camp.levels[upgradeId] || 0;
  if (level >= def.maxLevel) return false;
  return camp.bank >= upgradeCost(upgradeId, level);
}

export function buyUpgrade(camp, upgradeId) {
  const def = CAMP_UPGRADES[upgradeId];
  if (!def) return camp;
  const level = camp.levels[upgradeId] || 0;
  if (level >= def.maxLevel) return camp;
  const cost = upgradeCost(upgradeId, level);
  if (camp.bank < cost) return camp;
  return {
    ...camp,
    bank: camp.bank - cost,
    levels: {
      ...camp.levels,
      [upgradeId]: level + 1,
    },
  };
}

/** Convert end-of-run score into camp bank scrap */
export function bankFromRun(camp, { points, round, kills }) {
  const earned = Math.max(0, Math.floor(points + round * 50 + kills * 5));
  // Reload so mid-run unlocks (window rebuilds) aren't overwritten
  const fresh = loadCamp();
  const next = {
    ...fresh,
    bank: fresh.bank + earned,
    totalBanked: fresh.totalBanked + earned,
    runs: fresh.runs + 1,
  };
  const achievements = applyAchievementEvent(next, 'runEnd', {
    round,
    totalBanked: next.totalBanked,
  });
  return {
    camp: next,
    earned,
    achievements,
  };
}

/** Runtime multipliers applied at match start */
export function getCampBonuses(camp) {
  const v = camp.levels.vitality || 0;
  const q = camp.levels.quickHands || 0;
  const s = camp.levels.scavenger || 0;
  const vitalityDef = CAMP_UPGRADES.vitality;
  const quickDef = CAMP_UPGRADES.quickHands;
  const scavDef = CAMP_UPGRADES.scavenger;

  return {
    hpMult: 1 + v * vitalityDef.effectPerLevel,
    reloadMult: Math.max(0.55, 1 - q * quickDef.effectPerLevel),
    pointsMult: 1 + s * scavDef.effectPerLevel,
    levels: { ...camp.levels },
    outfitId: resolvePlayableOutfitId(camp, camp.outfitId || DEFAULT_OUTFIT_ID),
    outfitColor: getOutfitColor(camp.outfitColor || DEFAULT_OUTFIT_COLOR).id,
    outfitGender: getOutfitGender(camp.outfitGender || DEFAULT_OUTFIT_GENDER).id,
    outfitYarmulke: !!camp.outfitYarmulke,
    outfitLoadout: packLoadout(loadoutFromCamp(camp)),
  };
}
