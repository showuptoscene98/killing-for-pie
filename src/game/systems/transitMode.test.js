import { describe, expect, it } from 'vitest';
import {
  mapForTransitRound,
  TRANSIT_MAP_ORDER,
  TRANSIT_ROUNDS_PER_MAP,
  transitStartMapId,
} from './transitMode';

describe('transitMode', () => {
  it('starts on the first route map', () => {
    expect(transitStartMapId()).toBe(TRANSIT_MAP_ORDER[0]);
    expect(transitStartMapId()).toBe('nacht');
  });

  it('ends on Pie Yard (camp)', () => {
    expect(TRANSIT_MAP_ORDER[TRANSIT_MAP_ORDER.length - 1]).toBe('camp');
  });

  it('advances maps every ROUNDS_PER_MAP rounds', () => {
    expect(mapForTransitRound(1)).toBe('nacht');
    expect(mapForTransitRound(TRANSIT_ROUNDS_PER_MAP)).toBe('nacht');
    expect(mapForTransitRound(TRANSIT_ROUNDS_PER_MAP + 1)).toBe('bunker');
  });

  it('stays on camp after the finale threshold', () => {
    const finaleRound =
      (TRANSIT_MAP_ORDER.length - 1) * TRANSIT_ROUNDS_PER_MAP + 1;
    expect(mapForTransitRound(finaleRound)).toBe('camp');
    expect(mapForTransitRound(finaleRound + 50)).toBe('camp');
  });
});
