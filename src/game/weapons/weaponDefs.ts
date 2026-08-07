export type WeaponId =
  | 'm1911'
  | 'm14'
  | 'mp5'
  | 'olympia'
  | 'sniper'
  | 'mosin'
  | 'ak47'
  | 'raygun'
  | 'thundergun'
  | 'spatula'
  | 'rakia'
  | 'questioneer';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  damage: number;
  headMultiplier: number;
  /** Seconds between shots. Doubles as the manual-action window. */
  fireRate: number;
  magSize: number;
  reserve: number;
  reloadTime: number;
  spread: number;
  recoil: number;
  automatic: boolean;

  /** Buyable off a wall. Absent means mystery box only. */
  wallCost?: number;
  ammoCost?: number;
  mystery?: boolean;

  /** Shotguns: damage is divided by sqrt(pellets) per pellet. */
  pellets?: number;
  /** How many zombies one shot passes through, including the first. */
  penetrate?: number;
  penetrateFalloff?: number;
  splash?: number;

  adsSpread?: number;
  adsFov?: number;
  adsSens?: number;

  /** Manual action; see the Mosin for how boltCycleTime drives the viewmodel. */
  boltAction?: boolean;
  boltCycleTime?: number;

  melee?: boolean;
  meleeRange?: number;
  meleeKnockback?: number;

  projectile?: 'pie' | 'chainsaw';
  projectileSpeed?: number;
  projectileGravity?: number;
  splashRadius?: number;
}

export interface WeaponSlot {
  id: WeaponId;
  mag: number;
  reserve: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  m1911: {
    id: 'm1911',
    name: 'M1911',
    damage: 30,
    headMultiplier: 2.5,
    fireRate: 0.28,
    magSize: 8,
    reserve: 80,
    reloadTime: 1.4,
    spread: 0.012,
    recoil: 0.035,
    automatic: false,
  },
  m14: {
    id: 'm14',
    name: 'M14',
    damage: 55,
    headMultiplier: 2.2,
    fireRate: 0.32,
    magSize: 8,
    reserve: 96,
    reloadTime: 1.8,
    spread: 0.008,
    recoil: 0.04,
    automatic: false,
    wallCost: 500,
    ammoCost: 250,
  },
  mp5: {
    id: 'mp5',
    name: 'MP5',
    damage: 28,
    headMultiplier: 2.0,
    fireRate: 0.09,
    magSize: 30,
    reserve: 180,
    reloadTime: 2.0,
    spread: 0.02,
    recoil: 0.02,
    automatic: true,
    wallCost: 1000,
    ammoCost: 500,
  },
  olympia: {
    id: 'olympia',
    name: 'Olympia',
    damage: 90,
    headMultiplier: 1.5,
    fireRate: 0.7,
    magSize: 2,
    reserve: 28,
    reloadTime: 2.4,
    spread: 0.06,
    recoil: 0.08,
    automatic: false,
    pellets: 6,
    wallCost: 1200,
    ammoCost: 600,
  },
  sniper: {
    id: 'sniper',
    name: 'Dragunov',
    damage: 150,
    headMultiplier: 3.0,
    fireRate: 1.05,
    magSize: 5,
    reserve: 40,
    reloadTime: 2.7,
    spread: 0.028,
    adsSpread: 0,
    adsFov: 16,
    adsSens: 0.32,
    recoil: 0.09,
    automatic: false,
    /** How many zombies one shot can pass through (incl. first) */
    penetrate: 3,
    penetrateFalloff: 0.72,
    wallCost: 1500,
    ammoCost: 750,
  },
  mosin: {
    id: 'mosin',
    name: 'Mosin Nagant',
    damage: 285,
    headMultiplier: 3.6,
    fireRate: 1.55,
    magSize: 5,
    reserve: 35,
    reloadTime: 3.5,
    // Brutal from the hip — this thing is meant to be shouldered.
    spread: 0.058,
    adsSpread: 0,
    adsFov: 11,
    adsSens: 0.24,
    recoil: 0.17,
    automatic: false,
    /**
     * Bolt-action sniper: viewmodel works the bolt over the last boltCycleTime
     * seconds of the fireRate cooldown — recoil settles, then the hands cycle.
     */
    boltAction: true,
    boltCycleTime: 1.15,
    penetrate: 5,
    penetrateFalloff: 0.85,
    wallCost: 1800,
    ammoCost: 900,
  },

  // —— Mystery Box only ——
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    damage: 48,
    headMultiplier: 2.1,
    fireRate: 0.11,
    magSize: 30,
    reserve: 210,
    reloadTime: 2.2,
    spread: 0.022,
    recoil: 0.032,
    automatic: true,
    mystery: true,
  },
  raygun: {
    id: 'raygun',
    name: 'Pie Ray',
    damage: 120,
    headMultiplier: 1.8,
    fireRate: 0.35,
    magSize: 20,
    reserve: 160,
    reloadTime: 2.5,
    spread: 0.004,
    recoil: 0.025,
    automatic: false,
    mystery: true,
    penetrate: 4,
    penetrateFalloff: 0.82,
    /** Green pie-blast around primary pierce hits */
    splash: 2.4,
  },
  thundergun: {
    id: 'thundergun',
    name: 'Crust Cannon',
    damage: 500,
    headMultiplier: 1.2,
    fireRate: 1.1,
    magSize: 2,
    reserve: 12,
    reloadTime: 2.8,
    spread: 0.02,
    recoil: 0.12,
    automatic: false,
    mystery: true,
    splash: 3.5,
    penetrate: 5,
    penetrateFalloff: 0.88,
  },
  spatula: {
    id: 'spatula',
    name: 'Grand Spatula',
    damage: 85,
    headMultiplier: 1.4,
    fireRate: 0.55,
    magSize: 6,
    reserve: 48,
    reloadTime: 2.0,
    spread: 0.01,
    recoil: 0.06,
    automatic: false,
    mystery: true,
    projectile: 'pie',
    projectileSpeed: 22,
    projectileGravity: 12,
    splashRadius: 2.4,
  },
  rakia: {
    id: 'rakia',
    name: 'Rakia',
    damage: 55,
    headMultiplier: 2.0,
    // Swing cadence — long enough for the viewmodel arc to read.
    fireRate: 0.55,
    magSize: 1,
    reserve: 0,
    reloadTime: 0.01,
    spread: 0,
    recoil: 0.09,
    automatic: true,
    mystery: true,
    melee: true,
    meleeRange: 2.5,
    meleeKnockback: 4.2,
  },
  questioneer: {
    id: 'questioneer',
    name: 'Questioneer',
    damage: 110,
    headMultiplier: 1.35,
    fireRate: 0.75,
    magSize: 2,
    reserve: 16,
    reloadTime: 2.6,
    spread: 0.012,
    recoil: 0.08,
    automatic: false,
    mystery: true,
    projectile: 'chainsaw',
    projectileSpeed: 20,
    projectileGravity: 9,
    splashRadius: 2.8,
  },
};

/** Pool the mystery box can roll (excludes starting pistol) */
export const MYSTERY_BOX_POOL: WeaponId[] = [
  'm14',
  'mp5',
  'olympia',
  'sniper',
  'mosin',
  'ak47',
  'raygun',
  'thundergun',
  'spatula',
  'rakia',
  'questioneer',
];

export const MYSTERY_BOX_COST = 950;
export const MYSTERY_SPIN_TIME = 2.0;
export const MYSTERY_OFFER_TIME = 10;

export function createWeaponLoadout(weaponId: string): WeaponSlot {
  const def = WEAPONS[weaponId as WeaponId];
  if (!def) {
    const fallback = WEAPONS.m1911;
    return { id: fallback.id, mag: fallback.magSize, reserve: fallback.reserve };
  }
  return {
    id: def.id,
    mag: def.magSize,
    reserve: def.reserve,
  };
}

export function giveWeaponToLoadout(
  weapons: WeaponSlot[],
  activeWeapon: number,
  weaponId: string
): { weapons: WeaponSlot[]; activeWeapon: number } {
  const loadout = createWeaponLoadout(weaponId);
  const next = weapons.map((w) => ({ ...w }));
  let active = activeWeapon;
  if (next.length < 2) {
    next.push(loadout);
    active = next.length - 1;
  } else {
    // Replace whatever is currently in hand (classic box behavior)
    const replaceIdx = Math.max(0, Math.min(active, next.length - 1));
    next[replaceIdx] = loadout;
    active = replaceIdx;
  }
  return { weapons: next, activeWeapon: active };
}
