import { describe, expect, it } from 'vitest';
import combatMapIds from './combatMapIds.json';
import {
  COMBAT_MAP_IDS,
  DEFAULT_MAP_ID,
  HUB_MAP_ID,
  MAPS,
  MAP_LIST,
  getMap,
  isCombatMapId,
} from './activeMap';

/**
 * combatMapIds.json is the whitelist shared with the CommonJS LAN relay in
 * scripts/coop-server.js. If the client and that file ever disagree the relay
 * silently rejects a map the deploy UI is still offering, which reads as "join
 * does nothing". These tests are the thing keeping the two honest.
 */
describe('combat map whitelist', () => {
  it('resolves every whitelisted id to a real map', () => {
    for (const id of COMBAT_MAP_IDS) {
      expect(MAPS[id as keyof typeof MAPS], `missing map: ${id}`).toBeDefined();
    }
  });

  it('builds MAP_LIST with no holes', () => {
    expect(MAP_LIST).toHaveLength(COMBAT_MAP_IDS.length);
    expect(MAP_LIST.filter(Boolean)).toHaveLength(COMBAT_MAP_IDS.length);
  });

  it('covers every map except the hub', () => {
    const expected = Object.keys(MAPS)
      .filter((id) => id !== HUB_MAP_ID)
      .sort();
    expect([...COMBAT_MAP_IDS].sort()).toEqual(expected);
  });

  it('keeps each map self-identifying, so registry keys match map ids', () => {
    for (const [key, map] of Object.entries(MAPS)) {
      expect(map.id, `MAPS.${key} declares id "${map.id}"`).toBe(key);
    }
  });

  it('defaults to a deployable map, never the hub', () => {
    expect(isCombatMapId(DEFAULT_MAP_ID)).toBe(true);
    expect(DEFAULT_MAP_ID).not.toBe(HUB_MAP_ID);
    expect(isCombatMapId(HUB_MAP_ID)).toBe(false);
  });

  it('exposes the hub through the registry even though it is not deployable', () => {
    expect(MAPS[HUB_MAP_ID as keyof typeof MAPS]).toBeDefined();
  });

  it('matches the raw json the relay reads', () => {
    expect(COMBAT_MAP_IDS).toEqual(combatMapIds.ids);
    expect(DEFAULT_MAP_ID).toBe(combatMapIds.defaultId);
    expect(HUB_MAP_ID).toBe(combatMapIds.hubId);
  });

  it('falls back rather than returning undefined for an unknown id', () => {
    expect(getMap('not-a-map')).toBeDefined();
    expect(isCombatMapId('not-a-map')).toBe(false);
  });
});
