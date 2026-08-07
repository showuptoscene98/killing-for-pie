import { describe, expect, it, vi } from 'vitest';

vi.mock('../audio/sound', () => ({
  play: vi.fn(),
}));

vi.mock('../camp/achievements', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    recordAchievementEvent: () => ({ newly: [] }),
    queueAchievementBanners: vi.fn(),
  };
});

import {
  activatePowerup,
  createPowerupState,
  killZombie,
  tickPowerups,
} from './PowerupSystem';
import { createInitialGameState } from './gameState';

function makeZombie(id = 1) {
  return {
    id,
    dead: false,
    hp: 100,
    x: 0,
    z: 0,
    deathTimer: 0,
    hitFlash: 0,
  };
}

describe('PowerupSystem', () => {
  it('credits kill counter and points on a normal kill', () => {
    const state = createInitialGameState();
    const z = makeZombie();
    killZombie(z, state, state, false);
    expect(z.dead).toBe(true);
    expect(state.totalKills).toBe(1);
    expect(state.points).toBeGreaterThan(0);
  });

  it('nukes every living zombie and still creditKills the body count', () => {
    const state = createInitialGameState();
    state.powerups = createPowerupState();
    const zombies = [makeZombie(1), makeZombie(2), makeZombie(3), { ...makeZombie(4), dead: true }];
    const killsBefore = state.totalKills || 0;
    const pointsBefore = state.points;

    activatePowerup(state, zombies, 'nuke');

    expect(zombies.filter((z) => z.dead).length).toBe(4);
    expect(state.totalKills).toBe(killsBefore + 3);
    expect(state.points).toBeGreaterThan(pointsBefore);
    expect(state.powerups.drops.length).toBe(0);
  });

  it('activates double points without touching the kill counter', () => {
    const state = createInitialGameState();
    state.powerups = createPowerupState();
    const killsBefore = state.totalKills || 0;
    activatePowerup(state, [], 'doublepoints');
    expect(state.powerups.doublePointsTimer).toBeGreaterThan(0);
    expect(state.totalKills || 0).toBe(killsBefore);
  });

  it('survives picking up a nuke while other drops are still on the ground', () => {
    const state = createInitialGameState();
    state.powerups = createPowerupState();
    state.powerups.drops = [
      { id: 1, type: 'doublepoints', x: 10, z: 10, y: 0.55, life: 20, bob: 0 },
      { id: 2, type: 'nuke', x: 0, z: 0, y: 0.55, life: 20, bob: 0 },
      { id: 3, type: 'instakill', x: -10, z: -10, y: 0.55, life: 20, bob: 0 },
    ];
    expect(() => tickPowerups(state, [makeZombie()], 0.016, 0, 0)).not.toThrow();
    expect(state.powerups.drops.length).toBe(0);
  });
});

