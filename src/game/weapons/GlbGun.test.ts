import { describe, expect, it } from 'vitest';
import { GLB_GUN_IDS, hasGlbGun } from './GlbGun';
import { WEAPONS } from './weaponDefs';

describe('GLB gun assets', () => {
  it('maps every conventional firearm id to a Quaternius model', () => {
    for (const id of GLB_GUN_IDS) {
      expect(WEAPONS[id as keyof typeof WEAPONS], id).toBeDefined();
      expect(hasGlbGun(id)).toBe(true);
    }
  });

  it('keeps fantasy / mystery weapons on procedural meshes', () => {
    expect(hasGlbGun('raygun')).toBe(false);
    expect(hasGlbGun('thundergun')).toBe(false);
    expect(hasGlbGun('spatula')).toBe(false);
    expect(hasGlbGun('rakia')).toBe(false);
  });

  it('includes the bolt-action Mosin sniper', () => {
    expect(GLB_GUN_IDS).toContain('mosin');
    expect(WEAPONS.mosin.boltAction).toBe(true);
    expect(WEAPONS.mosin.boltCycleTime).toBeLessThanOrEqual(WEAPONS.mosin.fireRate);
  });
});
