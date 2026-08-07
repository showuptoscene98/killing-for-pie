const VOLUME_KEY = 'kfp_volume';
const SENS_KEY = 'kfp_look_sens';
const MUTE_KEY = 'kfp_sound_muted';
const BODY_STYLE_KEY = 'kfp_body_style';

const DEFAULT_VOLUME = 0.8;
const DEFAULT_SENS = 1;
/** Base mouse look scale — multiplied by sensitivity setting */
export const BASE_LOOK_SENS = 0.0022;

/** 'block' = soft boxes (default) | 'lowpoly' = sausage capsules */
export const BODY_STYLES = ['block', 'lowpoly'];

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function readNum(key, fallback) {
  try {
    const v = parseFloat(localStorage.getItem(key));
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function readBool(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function readBodyStyle() {
  try {
    const v = localStorage.getItem(BODY_STYLE_KEY);
    if (v === 'lowpoly' || v === 'block') return v;
  } catch {
    /* ignore */
  }
  return 'block';
}

function write(key, value) {
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

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(getSettings());
    } catch {
      /* ignore */
    }
  });
}

export function getSettings() {
  return {
    volume,
    lookSens,
    muted,
    bodyStyle,
    effectiveVolume: muted ? 0 : volume,
  };
}

export function getVolume() {
  return volume;
}

export function getEffectiveVolume() {
  return muted ? 0 : volume;
}

export function setVolume(v) {
  volume = clamp(Number(v) || 0, 0, 1);
  write(VOLUME_KEY, volume);
  if (volume > 0.001 && muted) {
    muted = false;
    write(MUTE_KEY, '0');
  }
  notify();
  return volume;
}

export function isSoundMuted() {
  return muted;
}

export function setSoundMuted(next) {
  muted = !!next;
  write(MUTE_KEY, muted ? '1' : '0');
  notify();
  return muted;
}

export function toggleSoundMuted() {
  return setSoundMuted(!muted);
}

export function getLookSensitivity() {
  return BASE_LOOK_SENS * lookSens;
}

export function getLookSensMultiplier() {
  return lookSens;
}

export function setLookSensMultiplier(v) {
  lookSens = clamp(Number(v) || 1, 0.25, 2.5);
  write(SENS_KEY, lookSens);
  notify();
  return lookSens;
}

export function getBodyStyle() {
  return bodyStyle;
}

export function setBodyStyle(v) {
  bodyStyle = v === 'lowpoly' ? 'lowpoly' : 'block';
  write(BODY_STYLE_KEY, bodyStyle);
  notify();
  return bodyStyle;
}

export function subscribeSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
