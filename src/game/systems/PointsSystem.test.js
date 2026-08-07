import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POINTS } from '../constants';
import { awardHit, awardKill, canAfford, creditKills, spend } from './PointsSystem';

/**
 * The achievement layer writes to localStorage and queues HUD banners; neither
 * is what these tests are about, so both are stubbed out to keep the scoring
 * maths isolated.
 */
vi.mock('../camp/campData', () => ({
  recordAchievementEvent: vi.fn(() => ({ newly: [] })),
}));
vi.mock('../camp/achievements', () => ({
  queueAchievementBanners: vi.fn(),
}));

function makeState(over = {}) {
  return { points: 0, totalKills: 0, pointsMult: 1, powerups: {}, ...over };
}

describe('scoring', () => {
  let state;
  beforeEach(() => {
    state = makeState();
  });

  it('pays more for a headshot than a body shot', () => {
    awardHit(state, false);
    const body = state.points;
    state.points = 0;
    awardHit(state, true);
    expect(state.points).toBeGreaterThan(body);
  });

  it('pays and counts a kill in one call', () => {
    awardKill(state, false);
    expect(state.points).toBe(POINTS.kill);
    expect(state.totalKills).toBe(1);
  });

  it('applies the camp multiplier', () => {
    state.pointsMult = 2;
    awardKill(state, false);
    expect(state.points).toBe(POINTS.kill * 2);
  });

  it('stacks double points on top of the camp multiplier', () => {
    state.pointsMult = 2;
    state.powerups.doublePointsTimer = 5;
    awardKill(state, false);
    expect(state.points).toBe(POINTS.kill * 4);
  });

  it('ignores an expired double points timer', () => {
    state.powerups.doublePointsTimer = 0;
    awardKill(state, false);
    expect(state.points).toBe(POINTS.kill);
  });
});

/**
 * A nuke pays one flat bonus instead of per-kill points, but the bodies still
 * have to register as kills — otherwise the HUD counter, kill quests and the
 * end-of-run scrap payout all silently ignore a whole field of zombies.
 */
describe('creditKills', () => {
  it('counts kills without paying for them', () => {
    const state = makeState();
    creditKills(state, 12);
    expect(state.totalKills).toBe(12);
    expect(state.points).toBe(0);
  });

  it('defaults to a single kill', () => {
    const state = makeState();
    creditKills(state);
    expect(state.totalKills).toBe(1);
  });

  it('is a no-op when a nuke catches an empty field', () => {
    const state = makeState();
    creditKills(state, 0);
    creditKills(state, -3);
    expect(state.totalKills).toBe(0);
  });
});

describe('spending', () => {
  it('rejects a purchase it cannot cover and leaves points alone', () => {
    const state = makeState({ points: 400 });
    expect(canAfford(state, 500)).toBe(false);
    expect(spend(state, 500)).toBe(false);
    expect(state.points).toBe(400);
  });

  it('allows spending down to exactly zero', () => {
    const state = makeState({ points: 500 });
    expect(spend(state, 500)).toBe(true);
    expect(state.points).toBe(0);
  });
});
