import { ROUND } from '../constants';
import { zombiesForRound } from './gameState';
import { recordAchievementEvent } from '../camp/campData';
import { queueAchievementBanners } from '../camp/achievements';

export function tickRound(state, dt, spawnZombie) {
  if (state.status !== 'playing') return;

  if (state.roundBannerTimer > 0) {
    state.roundBannerTimer -= dt;
    if (state.roundBannerTimer <= 0) {
      if (state._achBannerQueue?.length) {
        const next = state._achBannerQueue.shift();
        state.roundBanner = `ACHIEVEMENT: ${next.name}`;
        state.roundBannerTimer = 3.2;
      } else {
        state.roundBanner = null;
      }
    }
  }

  if (state.roundPhase === 'intermission') {
    state.intermissionTimer -= dt;
    if (state.intermissionTimer <= 0) {
      state.round += 1;
      state.zombiesRemainingToSpawn = zombiesForRound(state.round);
      state.roundPhase = 'spawning';
      state.roundBanner = `ROUND ${state.round}`;
      state.roundBannerTimer = 2.5;
      const { newly } = recordAchievementEvent('round', { round: state.round });
      queueAchievementBanners(state, newly);
    }
    return;
  }

  if (state.roundPhase === 'spawning') {
    if (
      state.zombiesRemainingToSpawn > 0 &&
      state.zombiesAlive < ROUND.maxActive
    ) {
      const spawned = spawnZombie();
      if (spawned) {
        state.zombiesRemainingToSpawn -= 1;
        state.zombiesAlive += 1;
      }
    }
    if (state.zombiesRemainingToSpawn <= 0) {
      state.roundPhase = 'active';
    }
  }

  if (
    (state.roundPhase === 'active' || state.roundPhase === 'spawning') &&
    state.zombiesRemainingToSpawn <= 0 &&
    state.zombiesAlive <= 0
  ) {
    state.roundPhase = 'intermission';
    state.intermissionTimer = ROUND.intermission;
  }
}

export function onZombieKilled(state) {
  state.zombiesAlive = Math.max(0, state.zombiesAlive - 1);
}
