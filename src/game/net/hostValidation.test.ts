import { describe, expect, it } from 'vitest';
import { INTERACT_RANGE } from '../constants';
import {
  canPlayerInteract,
  interactTargetPosition,
  isFiniteVec3,
  sanitizeFireRay,
  sanitizePlayerPosition,
} from './hostValidation';

const MAP = {
  worldBound: 15.5,
  DOORS: [{ id: 'door_west', position: [-7.5, 1.8, -2] }],
  WALLBUYS: [{ id: 'wb_mosin', position: [14.8, 1.45, -5] }],
  WINDOWS: [{ id: 'win_s1', position: [-5.5, 1.3, -15] }],
  MYSTERY_BOX: { position: [0, 0, -6] },
};

describe('isFiniteVec3', () => {
  it('rejects the values that used to poison host state', () => {
    expect(isFiniteVec3({ x: 0, y: 0, z: 0 })).toBe(true);
    expect(isFiniteVec3({ x: NaN, y: 0, z: 0 })).toBe(false);
    expect(isFiniteVec3({ x: 0, y: Infinity, z: 0 })).toBe(false);
    expect(isFiniteVec3({ x: 0, y: 0 })).toBe(false);
    expect(isFiniteVec3(null)).toBe(false);
  });
});

describe('sanitizePlayerPosition', () => {
  const prev = { x: 0, y: 1.6, z: 0 };

  it('passes an ordinary step through untouched', () => {
    const next = { x: 0.4, y: 1.6, z: 0.3 };
    expect(sanitizePlayerPosition(prev, next, 1 / 15, MAP.worldBound)).toEqual(next);
  });

  it('refuses a non-finite claim so the caller can keep the old position', () => {
    expect(sanitizePlayerPosition(prev, { x: NaN, y: 1.6, z: 0 }, 0.1, 15.5)).toBeNull();
    expect(sanitizePlayerPosition(prev, null, 0.1, 15.5)).toBeNull();
  });

  it('keeps a player inside the map', () => {
    const out = sanitizePlayerPosition(prev, { x: 900, y: 1.6, z: -900 }, 999, 15.5);
    expect(out!.x).toBeLessThanOrEqual(17);
    expect(out!.z).toBeGreaterThanOrEqual(-17);
  });

  it('clamps flying and falling out of the world', () => {
    const high = sanitizePlayerPosition(prev, { x: 0, y: 500, z: 0 }, 999, 15.5);
    const low = sanitizePlayerPosition(prev, { x: 0, y: -500, z: 0 }, 999, 15.5);
    expect(high!.y).toBeLessThanOrEqual(14);
    expect(low!.y).toBeGreaterThanOrEqual(-6);
  });

  it('drags a teleport back to the edge of what was reachable', () => {
    const out = sanitizePlayerPosition(prev, { x: 14, y: 1.6, z: 0 }, 1 / 15, 15.5)!;
    // Still heading the right way, but nowhere near the claimed 14m hop.
    expect(out.x).toBeGreaterThan(0);
    expect(out.x).toBeLessThan(6);
  });

  it('does not punish a client that went quiet for a moment', () => {
    // 0.6s of slide covers ~8.7m, so this should survive intact.
    const next = { x: 8, y: 1.6, z: 0 };
    const out = sanitizePlayerPosition(prev, next, 0.6, 15.5)!;
    expect(out.x).toBeCloseTo(8, 5);
  });

  it('accepts the first packet, when there is nothing to compare against', () => {
    const spawn = { x: 5, y: 1.6, z: -11 };
    expect(sanitizePlayerPosition(null, spawn, 0, 15.5)).toEqual(spawn);
  });

  it('caps the catch-up budget so a stalled client cannot bank distance', () => {
    const far = { x: 15, y: 1.6, z: 0 };
    const out = sanitizePlayerPosition(prev, far, 3600, 15.5)!;
    expect(out.x).toBeLessThan(23);
  });
});

describe('sanitizeFireRay', () => {
  const shooter = { x: 0, y: 1.6, z: 0 };
  const ray = { ox: 0, oy: 1.6, oz: 0, dx: 0, dy: 0, dz: -1 };

  it('normalizes the aim direction', () => {
    const out = sanitizeFireRay({ ...ray, dx: 0, dy: 0, dz: -5 }, shooter)!;
    expect(Math.hypot(out.dir.x, out.dir.y, out.dir.z)).toBeCloseTo(1, 6);
    expect(out.dir.z).toBeCloseTo(-1, 6);
  });

  it('rejects a degenerate direction that would raycast nothing', () => {
    expect(sanitizeFireRay({ ...ray, dx: 0, dy: 0, dz: 0 }, shooter)).toBeNull();
  });

  it('rejects non-finite rays', () => {
    expect(sanitizeFireRay({ ...ray, ox: NaN }, shooter)).toBeNull();
    expect(sanitizeFireRay({ ...ray, dy: Infinity }, shooter)).toBeNull();
    expect(sanitizeFireRay(null, shooter)).toBeNull();
  });

  it('leaves an honest muzzle where the client put it', () => {
    const out = sanitizeFireRay({ ...ray, ox: 0.3, oy: 1.5 }, shooter)!;
    expect(out.origin.x).toBeCloseTo(0.3, 6);
    expect(out.origin.y).toBeCloseTo(1.5, 6);
  });

  it('pulls a shot fired from across the map back onto the shooter', () => {
    const out = sanitizeFireRay({ ...ray, ox: 40, oy: 1.6, oz: 0 }, shooter)!;
    expect(out.origin.x).toBeLessThanOrEqual(2.5);
    // Aim is preserved; only the origin moves.
    expect(out.dir.z).toBeCloseTo(-1, 6);
  });

  it('still works when the host has no position for the shooter', () => {
    const out = sanitizeFireRay(ray, null);
    expect(out).not.toBeNull();
    expect(out!.dir.z).toBeCloseTo(-1, 6);
  });
});

describe('interactTargetPosition', () => {
  it('resolves each interactable from the map, not the message', () => {
    expect(interactTargetPosition(MAP, { type: 'door', id: 'door_west' })).toEqual({
      x: -7.5,
      y: 1.8,
      z: -2,
    });
    expect(interactTargetPosition(MAP, { type: 'wallbuy', id: 'wb_mosin' })!.x).toBe(14.8);
    expect(interactTargetPosition(MAP, { type: 'window', id: 'win_s1' })!.z).toBe(-15);
    expect(interactTargetPosition(MAP, { type: 'mystery' })!.z).toBe(-6);
  });

  it('returns nothing for an id the map does not have', () => {
    expect(interactTargetPosition(MAP, { type: 'door', id: 'made_up' })).toBeNull();
    expect(interactTargetPosition(null, { type: 'mystery' })).toBeNull();
  });
});

describe('canPlayerInteract', () => {
  it('allows a player standing at the target', () => {
    expect(
      canPlayerInteract(MAP, { type: 'wallbuy', id: 'wb_mosin' }, { x: 14, y: 1.6, z: -5 })
    ).toBe(true);
  });

  it('refuses a buy from across the map', () => {
    expect(
      canPlayerInteract(MAP, { type: 'wallbuy', id: 'wb_mosin' }, { x: -14, y: 1.6, z: 12 })
    ).toBe(false);
  });

  it('refuses opening a door you never walked to', () => {
    expect(
      canPlayerInteract(MAP, { type: 'door', id: 'door_west' }, { x: 12, y: 1.6, z: 14 })
    ).toBe(false);
  });

  it('refuses spinning the box remotely', () => {
    expect(canPlayerInteract(MAP, { type: 'mystery' }, { x: 0, y: 1.6, z: 14 })).toBe(false);
    expect(canPlayerInteract(MAP, { type: 'mystery' }, { x: 0, y: 1.6, z: -5.5 })).toBe(true);
  });

  it('refuses a prompt naming something the map does not have', () => {
    expect(
      canPlayerInteract(MAP, { type: 'door', id: 'door_nowhere' }, { x: 0, y: 1.6, z: 0 })
    ).toBe(false);
  });

  it('refuses a prompt with no type at all', () => {
    expect(canPlayerInteract(MAP, {}, { x: 0, y: 1.6, z: 0 })).toBe(false);
    expect(canPlayerInteract(MAP, null, { x: 0, y: 1.6, z: 0 })).toBe(false);
  });

  it('leaves revive to the host down-list check', () => {
    expect(
      canPlayerInteract(MAP, { type: 'revive', id: 'peer-2' }, { x: 99, y: 1.6, z: 99 })
    ).toBe(true);
  });

  it('refuses a ranged interact when the position is unusable', () => {
    expect(
      canPlayerInteract(MAP, { type: 'mystery' }, { x: NaN, y: 1.6, z: -6 })
    ).toBe(false);
  });

  it('stays generous enough for an honest client at full prompt range', () => {
    // Prompts are raised out to INTERACT_RANGE from the eye, so anything inside
    // that must survive validation or legitimate buys would start failing.
    const player = { x: 0, y: 1.6, z: -6 + INTERACT_RANGE };
    expect(canPlayerInteract(MAP, { type: 'mystery' }, player)).toBe(true);
  });
});
