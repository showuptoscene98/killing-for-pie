import { ROUND } from '../constants';
import { isBossRound, zombiesForRound } from './gameState';
import { recordAchievementEvent } from '../camp/campData';
import { queueAchievementBanners } from '../camp/achievements';
import { applyTransitIfNeeded } from './transitMode';

export function tickRound(state, dt, spawnZombie, zombiesRef = null) {
  if (state.status !== 'playing') return;

  if (state.roundBannerTimer > 0) {
    state.roundBannerTimer -= dt;
    if (state.roundBannerTimer <= 0) {
      if (state._postTransitBanner) {
        state.roundBanner = state._postTransitBanner;
        state.roundBannerTimer = 2.4;
        state._postTransitBanner = null;
      } else if (state._achBannerQueue?.length) {
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
      const boss = isBossRound(state.round);
      state.bossPending = boss;
      state.zombiesRemainingToSpawn =
        zombiesForRound(state.round) + (boss ? 1 : 0);
      state.roundPhase = 'spawning';

      const transit = applyTransitIfNeeded(state, zombiesRef);
      if (transit.changed) {
        // Transit banner wins this beat; round # still shown after
        state._postTransitBanner = boss
          ? `BOSS ROUND ${state.round}`
          : `ROUND ${state.round}`;
      } else {
        state.roundBanner = boss
          ? `BOSS ROUND ${state.round}`
          : `ROUND ${state.round}`;
        state.roundBannerTimer = boss ? 3.2 : 2.5;
      }
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
