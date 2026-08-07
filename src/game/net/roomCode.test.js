import { describe, expect, it } from 'vitest';
import {
  MAX_COOP_PLAYERS,
  PEER_ID_PREFIX,
  ROOM_CODE_LENGTH,
  generateRoomCode,
  isRoomCode,
  normalizeRoomCode,
  peerIdFromRoomCode,
  roomCodeFromPeerId,
  spawnOffset,
} from './roomCode';

describe('generateRoomCode', () => {
  it('produces a fixed-length code every time', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateRoomCode()).toHaveLength(ROOM_CODE_LENGTH);
    }
  });

  it('avoids characters that are ambiguous when read aloud', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateRoomCode()).not.toMatch(/[IO01]/);
    }
  });

  /** A code the host shows must be a code a joiner can actually enter. */
  it('always generates something joinable', () => {
    for (let i = 0; i < 2000; i++) {
      const code = generateRoomCode();
      expect(isRoomCode(code), `generated unjoinable code ${code}`).toBe(true);
      expect(normalizeRoomCode(code), code).toBe(code);
    }
  });
});

describe('normalizeRoomCode', () => {
  it('upper-cases and trims', () => {
    expect(normalizeRoomCode('  abcdef  ')).toBe('ABCDEF');
  });

  it('drops punctuation and spacing people add by hand', () => {
    expect(normalizeRoomCode('ABC-DEF')).toBe('ABCDEF');
    expect(normalizeRoomCode('ABC DEF')).toBe('ABCDEF');
  });

  it('pulls the code out of a full invite link', () => {
    expect(normalizeRoomCode('https://example.com/killing-for-pie/?coop=ABCDEF')).toBe(
      'ABCDEF'
    );
    expect(normalizeRoomCode('?coop=ABCDEF')).toBe('ABCDEF');
  });

  it('accepts a pasted peer id', () => {
    expect(normalizeRoomCode('kfpABCDEF')).toBe('ABCDEF');
    expect(normalizeRoomCode('kfp-ABCDEF')).toBe('ABCDEF');
    expect(normalizeRoomCode('KFP_ABCDEF')).toBe('ABCDEF');
  });

  /**
   * K, F and P are all in the alphabet, so these are ordinary generated codes.
   * Treating the leading letters as a peer-id prefix left three characters and
   * made the code unjoinable.
   */
  it('leaves a code that merely starts with KFP intact', () => {
    expect(normalizeRoomCode('KFPQRS')).toBe('KFPQRS');
    expect(normalizeRoomCode('KFP234')).toBe('KFP234');
    expect(isRoomCode('KFPQRS')).toBe(true);
  });

  it('survives empty and junk input', () => {
    expect(normalizeRoomCode('')).toBe('');
    expect(normalizeRoomCode(null)).toBe('');
    expect(normalizeRoomCode(undefined)).toBe('');
    expect(normalizeRoomCode('!!!')).toBe('');
  });

  it('caps length so a pasted essay cannot become a code', () => {
    expect(normalizeRoomCode('A'.repeat(50))).toHaveLength(8);
  });
});

describe('isRoomCode', () => {
  it('accepts codes in the allowed length band', () => {
    expect(isRoomCode('ABCD')).toBe(true);
    expect(isRoomCode('ABCDEF')).toBe(true);
    expect(isRoomCode('ABCDEFGH')).toBe(true);
  });

  it('rejects anything too short to be a real code', () => {
    expect(isRoomCode('ABC')).toBe(false);
    expect(isRoomCode('')).toBe(false);
    expect(isRoomCode('!!')).toBe(false);
  });
});

describe('peer id round trip', () => {
  it('recovers the code from the id it built', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateRoomCode();
      expect(roomCodeFromPeerId(peerIdFromRoomCode(code))).toBe(code);
    }
  });

  it('prefixes the id so peers cannot collide with other apps', () => {
    expect(peerIdFromRoomCode('ABCDEF')).toBe(`${PEER_ID_PREFIX}ABCDEF`);
  });

  it('normalizes a messy code before building an id', () => {
    expect(peerIdFromRoomCode(' abc-def ')).toBe(`${PEER_ID_PREFIX}ABCDEF`);
  });

  it('passes through an id that has no prefix', () => {
    expect(roomCodeFromPeerId('ABCDEF')).toBe('ABCDEF');
  });
});

describe('spawnOffset', () => {
  it('separates every player in a full lobby', () => {
    const seen = new Set();
    for (let i = 0; i < MAX_COOP_PLAYERS; i++) {
      const o = spawnOffset(i);
      seen.add(`${o.x},${o.z}`);
    }
    expect(seen.size).toBe(MAX_COOP_PLAYERS);
  });

  it('wraps rather than returning undefined for an out-of-range index', () => {
    expect(spawnOffset(MAX_COOP_PLAYERS)).toEqual(spawnOffset(0));
    expect(spawnOffset(99)).toBeDefined();
  });
});
