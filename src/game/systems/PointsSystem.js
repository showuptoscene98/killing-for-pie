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

export function awardKill(state, headshot) {
  applyPoints(state, headshot ? POINTS.headshotKill : POINTS.kill);
  state.totalKills += 1;
  const { newly } = recordAchievementEvent('kill');
  queueAchievementBanners(state, newly);
}

export function canAfford(state, cost) {
  return state.points >= cost;
}

export function spend(state, cost) {
  if (!canAfford(state, cost)) return false;
  state.points -= cost;
  return true;
}
