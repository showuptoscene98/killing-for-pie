import { describe, expect, it } from 'vitest';
import {
  MYSTERY_BOX_POOL,
  WEAPONS,
  createWeaponLoadout,
  giveWeaponToLoadout,
} from './weaponDefs';
import { magIsTransient, magRestPose, muzzleOffset, reloadStyle } from './GunMeshes';
import { getGunAnim } from './weaponAnim';
import { MAPS } from '../map/activeMap';

const ids = Object.keys(WEAPONS) as Array<keyof typeof WEAPONS>;

describe('weapon definitions', () => {
  it('keeps each def self-identifying', () => {
    for (const id of ids) expect(WEAPONS[id].id).toBe(id);
  });

  it('gives every weapon the stats the fire path reads', () => {
    for (const id of ids) {
      const def = WEAPONS[id];
      expect(def.damage, id).toBeGreaterThan(0);
      expect(def.fireRate, id).toBeGreaterThan(0);
      expect(def.magSize, id).toBeGreaterThan(0);
      expect(def.reloadTime, id).toBeGreaterThan(0);
      expect(def.headMultiplier, id).toBeGreaterThanOrEqual(1);
      expect(def.reserve, id).toBeGreaterThanOrEqual(0);
    }
  });

  it('prices wall-buys and their refills together', () => {
    for (const id of ids) {
      const def = WEAPONS[id];
      if (def.wallCost == null) continue;
      expect(def.ammoCost, `${id} is buyable but has no ammoCost`).toBeGreaterThan(0);
      expect(def.ammoCost, id).toBeLessThan(def.wallCost);
    }
  });

  it('rolls only real weapons from the mystery box', () => {
    for (const id of MYSTERY_BOX_POOL) expect(WEAPONS[id], id).toBeDefined();
    expect(new Set(MYSTERY_BOX_POOL).size).toBe(MYSTERY_BOX_POOL.length);
    expect(MYSTERY_BOX_POOL).not.toContain('m1911');
  });

  /**
   * The viewmodel drives a manual action off the tail of the fire cooldown. If
   * the cycle were longer than the cooldown the bolt would still be travelling
   * when the rifle became able to fire, so the animation would visibly snap.
   */
  it('finishes every bolt cycle before the weapon can fire again', () => {
    const boltGuns = ids.filter((id) => WEAPONS[id].boltAction);
    expect(boltGuns.length).toBeGreaterThan(0);
    for (const id of boltGuns) {
      const def = WEAPONS[id];
      expect(def.boltCycleTime, `${id} is boltAction but has no cycle time`).toBeGreaterThan(0);
      expect(def.boltCycleTime, id).toBeLessThanOrEqual(def.fireRate);
      expect(def.automatic, `${id} cannot be both bolt-action and automatic`).toBeFalsy();
    }
  });

  it('scopes only weapons that can aim down sights', () => {
    for (const id of ids) {
      const def = WEAPONS[id];
      if (def.adsFov == null) continue;
      expect(def.adsFov, id).toBeGreaterThan(0);
      expect(def.adsSens, id).toBeGreaterThan(0);
    }
  });
});

describe('viewmodel lookups', () => {
  it('poses every weapon, so none falls through to a placeholder', () => {
    for (const id of ids) {
      expect(muzzleOffset(id), id).toHaveLength(3);
      expect(magRestPose(id), id).toHaveLength(3);
      expect(typeof reloadStyle(id), id).toBe('string');
      expect(getGunAnim(id), id).toBeDefined();
    }
  });

  it('points every muzzle down the bore, ahead of the hands', () => {
    for (const id of ids) {
      const [, , z] = muzzleOffset(id);
      expect(z, `${id} muzzle should sit forward of the camera`).toBeLessThan(0);
    }
  });

  it('gives the longest guns the furthest muzzles', () => {
    const reach = (id: string) => muzzleOffset(id)[2] as number;
    expect(reach('mosin')).toBeLessThan(reach('sniper'));
    expect(reach('sniper')).toBeLessThan(reach('m1911'));
  });

  it('hides reload-only props at rest, but keeps real magazines visible', () => {
    expect(magIsTransient('mosin')).toBe(true);
    expect(magIsTransient('spatula')).toBe(true);
    expect(magIsTransient('ak47')).toBe(false);
    expect(magIsTransient('m1911')).toBe(false);
  });

  it('drives the bolt reload style only for manual actions', () => {
    for (const id of ids) {
      const manual = Boolean(WEAPONS[id].boltAction);
      expect(reloadStyle(id) === 'bolt', id).toBe(manual);
    }
  });
});

describe('loadout mutation', () => {
  it('fills a mag and reserve from the def', () => {
    expect(createWeaponLoadout('mosin')).toEqual({
      id: 'mosin',
      mag: WEAPONS.mosin.magSize,
      reserve: WEAPONS.mosin.reserve,
    });
  });

  it('falls back to the starting pistol for an unknown id', () => {
    expect(createWeaponLoadout('nope').id).toBe('m1911');
  });

  it('takes the empty second slot before overwriting anything', () => {
    const start = [createWeaponLoadout('m1911')];
    const { weapons, activeWeapon } = giveWeaponToLoadout(start, 0, 'mosin');
    expect(weapons.map((w) => w.id)).toEqual(['m1911', 'mosin']);
    expect(activeWeapon).toBe(1);
  });

  it('replaces the gun in hand once both slots are full', () => {
    const start = [createWeaponLoadout('m1911'), createWeaponLoadout('mp5')];
    const { weapons, activeWeapon } = giveWeaponToLoadout(start, 1, 'mosin');
    expect(weapons.map((w) => w.id)).toEqual(['m1911', 'mosin']);
    expect(activeWeapon).toBe(1);
  });

  it('does not mutate the loadout it was handed', () => {
    const start = [createWeaponLoadout('m1911'), createWeaponLoadout('mp5')];
    giveWeaponToLoadout(start, 0, 'mosin');
    expect(start.map((w) => w.id)).toEqual(['m1911', 'mp5']);
  });
});

describe('map wall-buys', () => {
  it('only sells weapons that exist', () => {
    for (const [mapId, map] of Object.entries(MAPS)) {
      for (const buy of map.WALLBUYS ?? []) {
        const def = WEAPONS[buy.weaponId as keyof typeof WEAPONS];
        expect(def, `${mapId}/${buy.id} sells unknown "${buy.weaponId}"`).toBeDefined();
        expect(def.wallCost, `${mapId}/${buy.id} sells unpriced ${buy.weaponId}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps wall-buy ids unique within a map', () => {
    for (const [mapId, map] of Object.entries(MAPS)) {
      const buyIds = (map.WALLBUYS ?? []).map((b) => b.id);
      expect(new Set(buyIds).size, `duplicate wall-buy id in ${mapId}`).toBe(buyIds.length);
    }
  });

  it('anchors every wall-buy to a room the map declares', () => {
    for (const [mapId, map] of Object.entries(MAPS)) {
      const rooms = map.ROOMS as Record<string, unknown> | undefined;
      for (const buy of map.WALLBUYS ?? []) {
        expect(
          rooms?.[buy.room],
          `${mapId}/${buy.id} in unknown room "${buy.room}"`
        ).toBeDefined();
      }
    }
  });
});
