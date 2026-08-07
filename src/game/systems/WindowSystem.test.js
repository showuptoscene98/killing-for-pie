import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BARRICADE } from '../constants';
import { setActiveMap, getActiveMap } from '../map/activeMap';
import {
  getBoardedWindowColliders,
  getWindowById,
  initWindowState,
  openWindowsForState,
  tearBoard,
  tryRepairBoard,
} from './WindowSystem';

vi.mock('../camp/campData', () => ({
  recordAchievementEvent: vi.fn(() => ({ newly: [] })),
  recordWindowFullyRebuilt: vi.fn(() => ({ achievements: [], unlockedMossad: false })),
}));
vi.mock('../camp/achievements', () => ({
  queueAchievementBanners: vi.fn(),
}));

function stateFor(map, over = {}) {
  const rooms = {};
  Object.keys(map.ROOMS).forEach((id) => {
    rooms[id] = { ...map.ROOMS[id] };
  });
  return {
    windows: initWindowState(),
    rooms,
    points: 0,
    pointsMult: 1,
    ...over,
  };
}

describe('window barricades', () => {
  let map;
  let state;
  let firstId;

  beforeEach(() => {
    map = setActiveMap('sofia');
    state = stateFor(map);
    firstId = map.WINDOWS[0].id;
  });

  it('boards every window on the map to full at match start', () => {
    const ids = map.WINDOWS.map((w) => w.id);
    expect(Object.keys(state.windows).sort()).toEqual([...ids].sort());
    for (const id of ids) expect(state.windows[id].boards).toBe(BARRICADE.maxBoards);
  });

  it('refuses to repair a window that is already full', () => {
    expect(tryRepairBoard(state, firstId)).toBe(false);
    expect(state.points).toBe(0);
  });

  it('pays for a repair once a board has been torn off', () => {
    tearBoard(state, firstId);
    expect(state.windows[firstId].boards).toBe(BARRICADE.maxBoards - 1);
    expect(tryRepairBoard(state, firstId)).toBe(true);
    expect(state.windows[firstId].boards).toBe(BARRICADE.maxBoards);
    expect(state.points).toBe(BARRICADE.repairPoints);
  });

  it('applies the camp points multiplier to repairs', () => {
    tearBoard(state, firstId);
    state.pointsMult = 3;
    tryRepairBoard(state, firstId);
    expect(state.points).toBe(BARRICADE.repairPoints * 3);
  });

  it('pays the co-op teammate who did the work, not the host', () => {
    tearBoard(state, firstId);
    const mate = { points: 0, pointsMult: 2 };
    tryRepairBoard(state, firstId, mate, false);
    expect(mate.points).toBe(BARRICADE.repairPoints * 2);
    expect(state.points).toBe(0);
  });

  it('will not repair a window in a room nobody has opened', () => {
    const shut = map.WINDOWS.find((w) => !map.ROOMS[w.room].open);
    expect(shut, 'sofia should have a window behind a locked door').toBeDefined();
    tearBoard(state, shut.id);
    expect(tryRepairBoard(state, shut.id)).toBe(false);

    state.rooms[shut.room].open = true;
    expect(tryRepairBoard(state, shut.id)).toBe(true);
  });

  it('refuses unknown window ids instead of throwing', () => {
    expect(tryRepairBoard(state, 'no_such_window')).toBe(false);
    expect(tearBoard(state, 'no_such_window')).toBe(false);
  });

  it('cannot tear past bare', () => {
    for (let i = 0; i < BARRICADE.maxBoards; i++) {
      expect(tearBoard(state, firstId)).toBe(true);
    }
    expect(state.windows[firstId].boards).toBe(0);
    expect(tearBoard(state, firstId)).toBe(false);
  });

  it('only reports windows in rooms that are open', () => {
    const open = openWindowsForState(state);
    expect(open.length).toBeGreaterThan(0);
    for (const w of open) expect(state.rooms[w.room].open).toBe(true);

    for (const id of Object.keys(state.rooms)) state.rooms[id].open = true;
    expect(openWindowsForState(state)).toHaveLength(map.WINDOWS.length);
  });

  it('resolves a window by id', () => {
    expect(getWindowById(firstId)?.id).toBe(firstId);
    expect(getWindowById('nope')).toBeUndefined();
  });
});

/**
 * Openings stay solid regardless of board count — boards are tear state, not
 * collision. Without this you can walk out of the map through a bare window.
 */
describe('window egress colliders', () => {
  it('blocks every opening even with no boards left', () => {
    const map = setActiveMap('sofia');
    const state = stateFor(map);
    for (const id of Object.keys(state.windows)) state.windows[id].boards = 0;

    const colliders = getBoardedWindowColliders();
    expect(colliders).toHaveLength(map.WINDOWS.length);
    for (const c of colliders) {
      expect(c.w).toBeGreaterThan(0);
      expect(c.d).toBeGreaterThan(0);
      // Tall enough to stop a jump through the opening.
      expect(c.y1 - c.y0).toBeGreaterThan(1.8);
    }
  });

  it('rebuilds the cache when the map changes', () => {
    setActiveMap('sofia');
    const sofia = getBoardedWindowColliders();
    setActiveMap('nacht');
    const nacht = getBoardedWindowColliders();
    expect(nacht).toHaveLength(getActiveMap().WINDOWS.length);
    expect(nacht).not.toBe(sofia);
  });
});
