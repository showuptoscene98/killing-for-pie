import { spend } from './PointsSystem';
import { getActiveMap } from '../map/activeMap';
import { recordAchievementEvent } from '../camp/campData';
import { queueAchievementBanners } from '../camp/achievements';

export function tryBuyDoor(state, doorId) {
  const DOORS = getActiveMap().DOORS;
  const doorMeta = DOORS.find((d) => d.id === doorId);
  const doorState = state.doors[doorId];
  if (!doorMeta || !doorState || doorState.open) return false;
  if (!spend(state, doorMeta.cost)) return false;

  doorState.open = true;
  doorMeta.unlocks.forEach((roomId) => {
    if (state.rooms[roomId]) state.rooms[roomId].open = true;
  });
  const { newly } = recordAchievementEvent('door');
  queueAchievementBanners(state, newly);
  return true;
}

let doorCache = null;
let doorCacheKey = '';

export function getClosedDoorColliders(state) {
  const DOORS = getActiveMap().DOORS;
  let key = `${getActiveMap().id}|`;
  for (let i = 0; i < DOORS.length; i++) {
    key += state.doors[DOORS[i].id]?.open ? '1' : '0';
  }
  if (doorCache && doorCacheKey === key) return doorCache;
  doorCacheKey = key;
  doorCache = DOORS.filter((d) => !state.doors[d.id]?.open).map((d) => {
    const h = d.size[1];
    const cy = d.position[1];
    const y0 = cy - h / 2;
    return {
      id: d.id,
      x: d.position[0],
      y: cy,
      z: d.position[2],
      w: d.collider.w,
      h,
      d: d.collider.d,
      y0,
      y1: y0 + h,
    };
  });
  return doorCache;
}
