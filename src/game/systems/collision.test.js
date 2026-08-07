import { beforeEach, describe, expect, it } from 'vitest';
import { PLAYER } from '../constants';
import { getActiveMap, setActiveMap } from '../map/activeMap';
import {
  buildFrameColliders,
  clearCollisionCache,
  collideEntity,
  collidePlayer,
  getWallColliders,
  sampleFloorY,
} from './collision';

/** A waist-to-head slab at the origin, like a wall segment. */
const SLAB = { id: 'slab', x: 0, z: 0, w: 2, d: 0.4, y0: 0, y1: 3.6 };

describe('collidePlayer', () => {
  beforeEach(() => {
    setActiveMap('sofia');
    clearCollisionCache();
  });

  it('leaves a position in open space alone', () => {
    const out = collidePlayer(5, 5, [SLAB], 0);
    expect(out.x).toBeCloseTo(5, 6);
    expect(out.z).toBeCloseTo(5, 6);
  });

  it('pushes the player out to the face it approached from', () => {
    // Just inside the south face, so the resolve should eject southward.
    const out = collidePlayer(0, -0.15, [SLAB], 0);
    expect(out.z).toBeLessThanOrEqual(-0.2 - PLAYER.radius + 1e-6);
  });

  it('never leaves the player still overlapping', () => {
    const approaches = [
      [0, -0.3],
      [0, 0.3],
      [0.9, 0.1],
      [-0.9, -0.1],
    ];
    for (const [x, z] of approaches) {
      const out = collidePlayer(x, z, [SLAB], 0);
      const closestX = Math.max(-1, Math.min(out.x, 1));
      const closestZ = Math.max(-0.2, Math.min(out.z, 0.2));
      const gap = Math.hypot(out.x - closestX, out.z - closestZ);
      expect(gap, `stuck inside from ${x},${z}`).toBeGreaterThanOrEqual(
        PLAYER.radius - 1e-6
      );
    }
  });

  it('resolves a dead-centre position instead of dividing by zero', () => {
    const out = collidePlayer(0, 0, [SLAB], 0);
    expect(Number.isFinite(out.x)).toBe(true);
    expect(Number.isFinite(out.z)).toBe(true);
    expect(Math.abs(out.z)).toBeGreaterThan(0.2);
  });

  /**
   * Colliders carry a Y range so multi-storey walls and window openings only
   * block at the height they actually occupy.
   */
  it('ignores a collider the player is standing on top of', () => {
    const crate = { id: 'crate', x: 0, z: 0, w: 2, d: 2, y0: 0, y1: 0.85 };
    const onTop = collidePlayer(0.1, 0.1, [crate], 1.2);
    expect(onTop.x).toBeCloseTo(0.1, 6);
    expect(onTop.z).toBeCloseTo(0.1, 6);

    const walkingInto = collidePlayer(0.1, 0.1, [crate], 0);
    expect(Math.hypot(walkingInto.x - 0.1, walkingInto.z - 0.1)).toBeGreaterThan(0);
  });

  it('treats a collider with no Y range as blocking at every height', () => {
    const infinite = { id: 'inf', x: 0, z: 0, w: 2, d: 2 };
    const out = collidePlayer(0.1, 0.1, [infinite], 50);
    expect(Math.hypot(out.x - 0.1, out.z - 0.1)).toBeGreaterThan(0);
  });

  it('keeps the player inside the world bound', () => {
    const bound = getActiveMap().worldBound;
    const out = collidePlayer(9999, -9999, [], 0);
    expect(out.x).toBe(bound);
    expect(out.z).toBe(-bound);
  });

  it('handles an empty collider list', () => {
    const out = collidePlayer(3, -2, [], 0);
    expect(out).toEqual({ x: 3, z: -2 });
  });

  it('resolves against several colliders at once, ending up clear of all', () => {
    const corner = [
      { id: 'a', x: 0, z: 0, w: 4, d: 0.4, y0: 0, y1: 3 },
      { id: 'b', x: 0, z: 0, w: 0.4, d: 4, y0: 0, y1: 3 },
    ];
    const out = collidePlayer(0.1, 0.1, corner, 0);
    for (const c of corner) {
      const cx = Math.max(c.x - c.w / 2, Math.min(out.x, c.x + c.w / 2));
      const cz = Math.max(c.z - c.d / 2, Math.min(out.z, c.z + c.d / 2));
      expect(Math.hypot(out.x - cx, out.z - cz)).toBeGreaterThanOrEqual(
        PLAYER.radius - 1e-6
      );
    }
  });
});

describe('collideEntity', () => {
  beforeEach(() => {
    setActiveMap('sofia');
    clearCollisionCache();
  });

  it('uses the caller radius, so a fat zombie stops further out', () => {
    const thin = collideEntity(0, -0.3, 0.2, [SLAB], 0);
    const fat = collideEntity(0, -0.3, 0.9, [SLAB], 0);
    expect(fat.z).toBeLessThan(thin.z);
  });

  it('reports a floor height alongside the resolved position', () => {
    const out = collideEntity(5, 5, 0.4, [], 0);
    expect(out.y).toBe(getActiveMap().FLOOR_Y ?? 0);
  });
});

describe('sampleFloorY', () => {
  beforeEach(() => {
    setActiveMap('sofia');
    clearCollisionCache();
  });

  it('returns the map floor over open ground', () => {
    expect(sampleFloorY(4, 4, 0)).toBe(getActiveMap().FLOOR_Y ?? 0);
  });

  it('stays finite anywhere, including outside the walls', () => {
    for (const [x, z] of [[0, 0], [999, 999], [-999, -999]]) {
      expect(Number.isFinite(sampleFloorY(x, z, 0))).toBe(true);
    }
  });
});

describe('frame collider list', () => {
  beforeEach(() => {
    setActiveMap('sofia');
    clearCollisionCache();
  });

  it('derives one collider per wall segment', () => {
    expect(getWallColliders().length).toBeGreaterThanOrEqual(
      getActiveMap().WALLS.length
    );
  });

  it('gives every wall a positive footprint and height', () => {
    for (const c of getWallColliders()) {
      expect(c.w, c.id).toBeGreaterThan(0);
      expect(c.d, c.id).toBeGreaterThan(0);
      expect(c.y1, c.id).toBeGreaterThan(c.y0);
    }
  });

  it('reuses the cached wall list until the map changes', () => {
    const first = getWallColliders();
    expect(getWallColliders()).toBe(first);
    setActiveMap('nacht');
    expect(getWallColliders()).not.toBe(first);
  });

  it('rebuilds after an explicit cache clear', () => {
    const first = getWallColliders();
    clearCollisionCache();
    expect(getWallColliders()).not.toBe(first);
  });

  it('appends closed doors and boarded windows to the walls', () => {
    const walls = getWallColliders().length;
    const door = { id: 'd', x: 1, z: 2, w: 4, d: 0.4, y0: 0, y1: 3.5 };
    const win = { id: 'w', x: -1, z: 3, w: 2, d: 0.7, y0: 0, y1: 2.5 };
    const frame = buildFrameColliders([door], [win]);
    expect(frame).toHaveLength(walls + 2);
    expect(frame.map((c) => c.id)).toContain('d');
    expect(frame.map((c) => c.id)).toContain('w');
  });

  it('does not mutate the cached wall list when adding frame colliders', () => {
    const before = getWallColliders().length;
    buildFrameColliders([{ id: 'd', x: 0, z: 0, w: 1, d: 1, y0: 0, y1: 1 }], []);
    expect(getWallColliders()).toHaveLength(before);
  });

  it('defaults to walls only', () => {
    expect(buildFrameColliders()).toHaveLength(getWallColliders().length);
  });

  it('blocks a player who walks into a closed door but not an open one', () => {
    const door = { id: 'door', x: 0, z: 0, w: 4, d: 0.4, y0: 0, y1: 3.5 };
    const closed = collidePlayer(0, -0.15, buildFrameColliders([door], []), 0);
    expect(Math.abs(closed.z)).toBeGreaterThan(0.2);
    const opened = collidePlayer(0, -0.15, buildFrameColliders([], []), 0);
    expect(opened.z).toBeCloseTo(-0.15, 6);
  });
});
