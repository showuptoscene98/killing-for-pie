import { POINTS } from '../constants';
import { recordAchievementEvent } from '../camp/campData';
import { queueAchievementBanners } from '../camp/achievements';

function applyPoints(state, base) {
  const camp = state.pointsMult || 1;
  const dbl = (state.powerups?.doublePointsTimer || 0) > 0 ? 2 : 1;
  state.points += Math.round(base * camp * dbl);
}

export function awardHit(state, headshot) {
  applyPoints(state, headshot ? POINTS.headshotHit : POINTS.hit);
}

/**
 * Record kills for stats/quests/achievements without paying per-kill points.
 * Batched because a nuke credits the whole field at once and each
 * recordAchievementEvent call writes to localStorage.
 */
export function creditKills(state, count = 1) {
  if (count <= 0) return;
  state.totalKills += count;
  const { newly } = recordAchievementEvent('kill', { count });
  queueAchievementBanners(state, newly);
}

export function awardKill(state, headshot) {
  applyPoints(state, headshot ? POINTS.headshotKill : POINTS.kill);
  creditKills(state, 1);
}

export function canAfford(state, cost) {
  return state.points >= cost;
}

export function spend(state, cost) {
  if (!canAfford(state, cost)) return false;
  state.points -= cost;
  return true;
}
