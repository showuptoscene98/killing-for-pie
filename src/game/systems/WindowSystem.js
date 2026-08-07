import { getActiveMap } from '../map/activeMap';
import { BARRICADE } from '../constants';
import { recordWindowFullyRebuilt, recordAchievementEvent } from '../camp/campData';
import { queueAchievementBanners } from '../camp/achievements';

export function initWindowState() {
  const windows = {};
  getActiveMap().WINDOWS.forEach((w) => {
    windows[w.id] = { boards: BARRICADE.maxBoards };
  });
  return windows;
}

let boardedCache = null;
let boardedCacheKey = '';

/**
 * Window opening colliders — always on, even with 0 boards.
 * Boards are tear/repair state only; openings must stay blocked so
 * players can't walk out of the map through empty windows.
 * Zombies ignore these during approach/tear/climb.
 */
export function getBoardedWindowColliders() {
  const WINDOWS = getActiveMap().WINDOWS;
  const key = `${getActiveMap().id}|egress`;
  if (boardedCache && boardedCacheKey === key) return boardedCache;
  boardedCacheKey = key;
  boardedCache = WINDOWS.map((w) => {
    const floorY = w.floorY ?? 0;
    const h = (w.height ?? 1.85) + (w.sill ?? 0.5) + 0.3;
    return {
      id: w.id,
      x: w.collider.x,
      z: w.collider.z,
      w: w.collider.w,
      d: w.collider.d,
      y0: floorY,
      y1: floorY + h,
    };
  });
  return boardedCache;
}

export function tryRepairBoard(state, windowId, pointsOwner = null, creditLocal = true) {
  const win = getActiveMap().WINDOWS.find((w) => w.id === windowId);
  const ws = state.windows[windowId];
  if (!win || !ws) return false;
  if (!state.rooms[win.room]?.open) return false;
  if (ws.boards >= BARRICADE.maxBoards) return false;
  ws.boards += 1;
  const owner = pointsOwner || state;
  const mult = owner.pointsMult || state.pointsMult || 1;
  owner.points += Math.round(BARRICADE.repairPoints * mult);
  if (creditLocal) {
    const boardAch = recordAchievementEvent('board');
    queueAchievementBanners(state, boardAch.newly);
  }
  if (ws.boards >= BARRICADE.maxBoards && creditLocal) {
    const result = recordWindowFullyRebuilt();
    state._lastWindowUnlock = result;
    if (result.unlockedMossad) {
      state.roundBanner = 'OUTFIT UNLOCKED: Mossad Agent';
      state.roundBannerTimer = 3.5;
    }
    queueAchievementBanners(state, result.achievements);
  }
  return true;
}

export function tearBoard(state, windowId) {
  const ws = state.windows[windowId];
  if (!ws || ws.boards <= 0) return false;
  ws.boards -= 1;
  return true;
}

export function getWindowById(id) {
  return getActiveMap().WINDOWS.find((w) => w.id === id);
}

export function openWindowsForState(state) {
  return getActiveMap().WINDOWS.filter((w) => state.rooms[w.room]?.open);
}
