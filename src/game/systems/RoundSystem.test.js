import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUND } from '../constants';
import { onZombieKilled, tickRound } from './RoundSystem';
import {
  zombieHpForRound,
  zombieSpeedForRound,
  zombiesForRound,
} from './gameState';

vi.mock('../camp/campData', () => ({
  recordAchievementEvent: vi.fn(() => ({ newly: [] })),
  recordWindowFullyRebuilt: vi.fn(() => ({ achievements: [] })),
}));
vi.mock('../camp/achievements', () => ({
  queueAchievementBanners: vi.fn(),
}));

/** Only the fields tickRound reads, matching createInitialGameState defaults. */
function roundState(over = {}) {
  return {
    status: 'playing',
    round: 0,
    roundPhase: 'intermission',
    intermissionTimer: 1.5,
    zombiesRemainingToSpawn: 0,
    zombiesAlive: 0,
    roundBanner: null,
    roundBannerTimer: 0,
    ...over,
  };
}

describe('round scaling', () => {
  it('starts round 1 at the base wave size', () => {
    expect(zombiesForRound(1)).toBe(ROUND.baseZombies);
  });

  it('grows the wave every round', () => {
    expect(zombiesForRound(5)).toBeGreaterThan(zombiesForRound(4));
    expect(zombiesForRound(10)).toBeGreaterThan(zombiesForRound(5));
  });

  it('caps the wave so spawning can always drain', () => {
    expect(zombiesForRound(500)).toBe(60);
  });

  it('scales health without a ceiling, so late rounds stay lethal', () => {
    expect(zombieHpForRound(1)).toBe(ROUND.baseHp);
    expect(zombieHpForRound(11)).toBe(ROUND.baseHp + 10 * ROUND.hpPerRound);
  });

  it('caps speed so zombies never outrun a sprinting player', () => {
    expect(zombieSpeedForRound(1)).toBeCloseTo(ROUND.baseSpeed, 5);
    expect(zombieSpeedForRound(999)).toBe(ROUND.maxSpeed);
    expect(zombieSpeedForRound(999)).toBeLessThan(6.5);
  });
});

describe('tickRound', () => {
  let spawn;
  beforeEach(() => {
    spawn = vi.fn(() => true);
  });

  it('does nothing outside a live match', () => {
    const state = roundState({ status: 'paused' });
    tickRound(state, 5, spawn);
    expect(state.round).toBe(0);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('opens round 1 once the first intermission elapses', () => {
    const state = roundState();
    tickRound(state, 2, spawn);
    expect(state.round).toBe(1);
    expect(state.roundPhase).toBe('spawning');
    expect(state.zombiesRemainingToSpawn).toBe(zombiesForRound(1));
    expect(state.roundBanner).toBe('ROUND 1');
  });

  it('holds the round back until the intermission is actually over', () => {
    const state = roundState({ intermissionTimer: 8 });
    tickRound(state, 1, spawn);
    expect(state.round).toBe(0);
    expect(state.roundPhase).toBe('intermission');
  });

  it('spawns one zombie per tick and draws down the queue', () => {
    const state = roundState({
      roundPhase: 'spawning',
      round: 1,
      zombiesRemainingToSpawn: 3,
    });
    tickRound(state, 0.016, spawn);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(state.zombiesRemainingToSpawn).toBe(2);
    expect(state.zombiesAlive).toBe(1);
  });

  it('does not consume the queue when the spawner refuses', () => {
    const state = roundState({
      roundPhase: 'spawning',
      round: 1,
      zombiesRemainingToSpawn: 3,
    });
    tickRound(state, 0.016, vi.fn(() => false));
    expect(state.zombiesRemainingToSpawn).toBe(3);
    expect(state.zombiesAlive).toBe(0);
  });

  it('stops spawning at the active cap so the field cannot flood', () => {
    const state = roundState({
      roundPhase: 'spawning',
      round: 1,
      zombiesRemainingToSpawn: 30,
      zombiesAlive: ROUND.maxActive,
    });
    tickRound(state, 0.016, spawn);
    expect(spawn).not.toHaveBeenCalled();
    expect(state.zombiesRemainingToSpawn).toBe(30);
  });

  it('goes active once the whole wave is out', () => {
    const state = roundState({
      roundPhase: 'spawning',
      round: 1,
      zombiesRemainingToSpawn: 1,
      zombiesAlive: 5,
    });
    tickRound(state, 0.016, spawn);
    expect(state.roundPhase).toBe('active');
  });

  it('closes the round only when the field is clear', () => {
    const state = roundState({
      roundPhase: 'active',
      round: 1,
      zombiesRemainingToSpawn: 0,
      zombiesAlive: 1,
    });
    tickRound(state, 0.016, spawn);
    expect(state.roundPhase).toBe('active');

    state.zombiesAlive = 0;
    tickRound(state, 0.016, spawn);
    expect(state.roundPhase).toBe('intermission');
    expect(state.intermissionTimer).toBe(ROUND.intermission);
  });

  it('runs a full round from intermission back to intermission', () => {
    const state = roundState();
    tickRound(state, 2, spawn);
    expect(state.round).toBe(1);

    // Drain the wave, then clear the field.
    let guard = 0;
    while (state.zombiesRemainingToSpawn > 0 && guard++ < 500) {
      tickRound(state, 0.016, spawn);
    }
    expect(state.roundPhase).toBe('active');
    expect(state.zombiesAlive).toBe(zombiesForRound(1));

    while (state.zombiesAlive > 0) onZombieKilled(state);
    tickRound(state, 0.016, spawn);
    expect(state.roundPhase).toBe('intermission');

    tickRound(state, ROUND.intermission + 1, spawn);
    expect(state.round).toBe(2);
    expect(state.zombiesRemainingToSpawn).toBe(zombiesForRound(2));
  });

  it('clears the round banner when it expires', () => {
    const state = roundState({ roundBanner: 'ROUND 1', roundBannerTimer: 0.5 });
    tickRound(state, 1, spawn);
    expect(state.roundBanner).toBeNull();
  });

  it('shows queued achievements after the round banner instead of dropping them', () => {
    const state = roundState({
      roundBanner: 'ROUND 1',
      roundBannerTimer: 0.5,
      _achBannerQueue: [{ name: 'First Blood' }],
    });
    tickRound(state, 1, spawn);
    expect(state.roundBanner).toBe('ACHIEVEMENT: First Blood');
    expect(state._achBannerQueue).toHaveLength(0);
  });
});

describe('onZombieKilled', () => {
  it('decrements the live count', () => {
    const state = roundState({ zombiesAlive: 3 });
    onZombieKilled(state);
    expect(state.zombiesAlive).toBe(2);
  });

  /**
   * The intermission check waits for zombiesAlive to reach zero, so a negative
   * count from a double-credited kill would stall the round forever.
   */
  it('never goes negative', () => {
    const state = roundState({ zombiesAlive: 0 });
    onZombieKilled(state);
    onZombieKilled(state);
    expect(state.zombiesAlive).toBe(0);
  });
});
