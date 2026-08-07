const VOLUME_KEY = 'kfp_volume';
const SENS_KEY = 'kfp_look_sens';
const MUTE_KEY = 'kfp_sound_muted';
const BODY_STYLE_KEY = 'kfp_body_style';

const DEFAULT_VOLUME = 0.8;
const DEFAULT_SENS = 1;
/** Base mouse look scale — multiplied by sensitivity setting */
export const BASE_LOOK_SENS = 0.0022;

/** 'block' = soft boxes (default) | 'lowpoly' = sausage capsules */
export type BodyStyle = 'block' | 'lowpoly';

export const BODY_STYLES: readonly BodyStyle[] = ['block', 'lowpoly'];

export interface Settings {
  readonly volume: number;
  readonly lookSens: number;
  readonly muted: boolean;
  readonly bodyStyle: BodyStyle;
  readonly effectiveVolume: number;
}

export type SettingsListener = (settings: Settings) => void;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function readNum(key: string, fallback: number): number {
  try {
    const v = parseFloat(localStorage.getItem(key) ?? '');
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function readBodyStyle(): BodyStyle {
  try {
    const v = localStorage.getItem(BODY_STYLE_KEY);
    if (v === 'lowpoly' || v === 'block') return v;
  } catch {
    /* ignore */
  }
  return 'block';
}

function write(key: string, value: string | number | boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

let volume = clamp(readNum(VOLUME_KEY, DEFAULT_VOLUME), 0, 1);
let lookSens = clamp(readNum(SENS_KEY, DEFAULT_SENS), 0.25, 2.5);
let muted = readBool(MUTE_KEY);
let bodyStyle = readBodyStyle();

const listeners = new Set<SettingsListener>();

function buildSnapshot(): Settings {
  return {
    volume,
    lookSens,
    muted,
    bodyStyle,
    effectiveVolume: muted ? 0 : volume,
  };
}

/**
 * Cached so `getSettings()` is referentially stable between changes —
 * `useSyncExternalStore` re-renders forever if the snapshot is a new object
 * on every read.
 */
let snapshot: Settings = buildSnapshot();

function notify(): void {
  snapshot = buildSnapshot();
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      /* ignore */
    }
  });
}

export function getSettings(): Settings {
  return snapshot;
}

export function getVolume(): number {
  return volume;
}

export function getEffectiveVolume(): number {
  return muted ? 0 : volume;
}

export function setVolume(v: number): number {
  volume = clamp(Number(v) || 0, 0, 1);
  write(VOLUME_KEY, volume);
  if (volume > 0.001 && muted) {
    muted = false;
    write(MUTE_KEY, '0');
  }
  notify();
  return volume;
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(next: boolean): boolean {
  muted = !!next;
  write(MUTE_KEY, muted ? '1' : '0');
  notify();
  return muted;
}

export function toggleSoundMuted(): boolean {
  return setSoundMuted(!muted);
}

export function getLookSensitivity(): number {
  return BASE_LOOK_SENS * lookSens;
}

export function getLookSensMultiplier(): number {
  return lookSens;
}

export function setLookSensMultiplier(v: number): number {
  lookSens = clamp(Number(v) || 1, 0.25, 2.5);
  write(SENS_KEY, lookSens);
  notify();
  return lookSens;
}

export function getBodyStyle(): BodyStyle {
  return bodyStyle;
}

export function setBodyStyle(v: string): BodyStyle {
  bodyStyle = v === 'lowpoly' ? 'lowpoly' : 'block';
  write(BODY_STYLE_KEY, bodyStyle);
  notify();
  return bodyStyle;
}

export function subscribeSettings(fn: SettingsListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
