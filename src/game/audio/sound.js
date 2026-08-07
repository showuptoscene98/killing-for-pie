/** Procedural slapstick SFX via Web Audio — no asset files. */

import { getEffectiveVolume, subscribeSettings, isSoundMuted, setSoundMuted, toggleSoundMuted } from '../settings';

let ctx = null;
let unlocked = false;
let master = null;
let ambienceNodes = [];
let stepsThisFrame = 0;
let moansThisFrame = 0;

const SFX_GAIN = 0.32;
const AMB_GAIN = 0.2;
const MOAN_MAX_PER_FRAME = 1;

function applyMasterVolume() {
  if (!master) return;
  const v = getEffectiveVolume();
  master.gain.value = Math.max(0.0001, v);
}

subscribeSettings(() => applyMasterVolume());

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    applyMasterVolume();
    master.connect(ctx.destination);
  }
  return ctx;
}

export function isAudioUnlocked() {
  return unlocked;
}

export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  unlocked = true;
  applyMasterVolume();
}

export { isSoundMuted, setSoundMuted, toggleSoundMuted };
/** @deprecated alias */
export const isMenuSfxMuted = isSoundMuted;
export const setMenuSfxMuted = setSoundMuted;
export const toggleMenuSfxMuted = toggleSoundMuted;

function noiseBuffer(duration) {
  const c = getCtx();
  const len = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function envGain(c, peak, attack, hold, release, when, dest = null) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + attack);
  g.gain.setValueAtTime(peak, when + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
  g.connect(dest || master);
  return g;
}

function withPan(c, pan, when) {
  if (!c.createStereoPanner || Math.abs(pan) < 0.01) return master;
  const p = c.createStereoPanner();
  p.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), when);
  p.connect(master);
  return p;
}

function tone({
  type = 'sine',
  freq = 440,
  freqEnd = null,
  peak = 0.2,
  attack = 0.01,
  hold = 0.05,
  release = 0.12,
  when = 0,
  detune = 0,
  volume = 1,
  pan = 0,
}) {
  const c = getCtx();
  if (!c || !unlocked) return;
  const t0 = when || c.currentTime;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t0 + attack + hold + release);
  }
  osc.detune.value = detune;
  const dest = withPan(c, pan, t0);
  const g = envGain(c, peak * SFX_GAIN * Math.max(0, volume), attack, hold, release, t0, dest);
  osc.connect(g);
  osc.start(t0);
  osc.stop(t0 + attack + hold + release + 0.02);
}

function noiseBurst({
  peak = 0.15,
  attack = 0.005,
  hold = 0.02,
  release = 0.08,
  filterFreq = 2000,
  when = 0,
  volume = 1,
  pan = 0,
  filterType = 'bandpass',
  q = 1.2,
}) {
  const c = getCtx();
  if (!c || !unlocked) return;
  const t0 = when || c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(attack + hold + release + 0.05);
  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = q;
  const dest = withPan(c, pan, t0);
  const g = envGain(c, peak * SFX_GAIN * Math.max(0, volume), attack, hold, release, t0, dest);
  src.connect(filter);
  filter.connect(g);
  src.start(t0);
  src.stop(t0 + attack + hold + release + 0.02);
}

function pitchJitter(base, amount = 0.08) {
  return base * (1 + (Math.random() - 0.5) * 2 * amount);
}

const cues = {
  zombieSpawn() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({ peak: 0.22, attack: 0.002, hold: 0.015, release: 0.06, filterFreq: 1800, when: t });
    tone({
      type: 'triangle',
      freq: pitchJitter(220),
      freqEnd: pitchJitter(520),
      peak: 0.28,
      attack: 0.02,
      hold: 0.08,
      release: 0.18,
      when: t + 0.02,
    });
  },

  zombieHit() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({ peak: 0.22, attack: 0.001, hold: 0.01, release: 0.05, filterFreq: pitchJitter(700, 0.2), when: t });
    tone({
      type: 'triangle',
      freq: pitchJitter(140),
      freqEnd: 55,
      peak: 0.14,
      attack: 0.005,
      hold: 0.02,
      release: 0.08,
      when: t,
    });
  },

  zombieDeath() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    tone({
      type: 'sine',
      freq: pitchJitter(180),
      freqEnd: 55,
      peak: 0.16,
      attack: 0.02,
      hold: 0.15,
      release: 0.35,
      when: t,
    });
    noiseBurst({
      peak: 0.18,
      attack: 0.01,
      hold: 0.06,
      release: 0.2,
      filterFreq: 280,
      filterType: 'lowpass',
      q: 0.6,
      when: t + 0.12,
    });
    tone({
      type: 'triangle',
      freq: 70,
      freqEnd: 35,
      peak: 0.14,
      attack: 0.02,
      hold: 0.08,
      release: 0.25,
      when: t + 0.12,
    });
  },

  zombieAttack() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    tone({
      type: 'sine',
      freq: pitchJitter(110),
      freqEnd: 60,
      peak: 0.16,
      attack: 0.015,
      hold: 0.07,
      release: 0.12,
      when: t,
    });
    noiseBurst({
      peak: 0.14,
      attack: 0.005,
      hold: 0.04,
      release: 0.1,
      filterFreq: pitchJitter(380, 0.2),
      filterType: 'bandpass',
      q: 0.7,
      when: t + 0.02,
    });
  },

  zombieStep(opts = {}) {
    if (stepsThisFrame >= 6) return;
    stepsThisFrame += 1;
    const volume = Math.max(0.35, opts.volume ?? 1);
    const pan = opts.pan ?? 0;
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.42,
      attack: 0.002,
      hold: 0.04,
      release: 0.12,
      filterFreq: pitchJitter(320, 0.3),
      filterType: 'lowpass',
      q: 0.7,
      when: t,
      volume,
      pan,
    });
    tone({
      type: 'triangle',
      freq: pitchJitter(120, 0.2),
      freqEnd: 55,
      peak: 0.32,
      attack: 0.005,
      hold: 0.04,
      release: 0.1,
      when: t,
      volume,
      pan,
    });
  },

  /** Low guttural growl — soft sine + filtered breath, no chiptune waves */
  zombieMoan(opts = {}) {
    if (moansThisFrame >= MOAN_MAX_PER_FRAME) return;
    moansThisFrame += 1;
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    const volume = Math.max(0.12, Math.min(0.85, opts.volume ?? 0.5));
    const pan = opts.pan ?? 0;
    const variant = Math.random();

    // Throat rasp
    noiseBurst({
      peak: 0.1,
      attack: 0.08,
      hold: 0.2,
      release: 0.45,
      filterFreq: pitchJitter(190, 0.25),
      filterType: 'bandpass',
      q: 0.55,
      when: t,
      volume,
      pan,
    });

    if (variant < 0.35) {
      // Slow descending chest moan
      tone({
        type: 'sine',
        freq: pitchJitter(92, 0.12),
        freqEnd: pitchJitter(42, 0.1),
        peak: 0.15,
        attack: 0.12,
        hold: 0.45,
        release: 0.55,
        when: t,
        volume,
        pan,
      });
      tone({
        type: 'triangle',
        freq: pitchJitter(135, 0.15),
        freqEnd: 58,
        peak: 0.06,
        attack: 0.15,
        hold: 0.35,
        release: 0.5,
        when: t + 0.04,
        volume,
        pan,
      });
    } else if (variant < 0.7) {
      // Short mid growl
      tone({
        type: 'sine',
        freq: pitchJitter(78, 0.15),
        freqEnd: 38,
        peak: 0.14,
        attack: 0.06,
        hold: 0.22,
        release: 0.35,
        when: t,
        volume,
        pan,
      });
      noiseBurst({
        peak: 0.08,
        attack: 0.04,
        hold: 0.18,
        release: 0.3,
        filterFreq: pitchJitter(260, 0.2),
        filterType: 'lowpass',
        q: 0.5,
        when: t + 0.06,
        volume,
        pan,
      });
    } else {
      // Quiet distant breathy groan
      tone({
        type: 'sine',
        freq: pitchJitter(105, 0.12),
        freqEnd: 48,
        peak: 0.11,
        attack: 0.18,
        hold: 0.5,
        release: 0.65,
        when: t,
        volume,
        pan,
      });
      tone({
        type: 'triangle',
        freq: pitchJitter(160, 0.1),
        freqEnd: 70,
        peak: 0.045,
        attack: 0.2,
        hold: 0.4,
        release: 0.55,
        when: t + 0.08,
        volume,
        pan,
      });
    }
  },

  boardTear() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.32,
      attack: 0.002,
      hold: 0.04,
      release: 0.12,
      filterFreq: pitchJitter(550, 0.25),
      when: t,
    });
    tone({
      type: 'triangle',
      freq: pitchJitter(140),
      freqEnd: 60,
      peak: 0.2,
      attack: 0.01,
      hold: 0.05,
      release: 0.15,
      when: t,
    });
  },

  boardRepair() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    tone({
      type: 'square',
      freq: pitchJitter(380),
      freqEnd: 220,
      peak: 0.14,
      attack: 0.005,
      hold: 0.03,
      release: 0.08,
      when: t,
    });
    noiseBurst({
      peak: 0.12,
      attack: 0.001,
      hold: 0.015,
      release: 0.05,
      filterFreq: 1200,
      when: t + 0.02,
    });
  },

  powerupSpawn() {
    tone({
      type: 'sine',
      freq: pitchJitter(520),
      freqEnd: 880,
      peak: 0.16,
      attack: 0.01,
      hold: 0.05,
      release: 0.15,
    });
  },

  powerupInstakill() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    tone({
      type: 'sawtooth',
      freq: 120,
      freqEnd: 60,
      peak: 0.28,
      attack: 0.02,
      hold: 0.15,
      release: 0.35,
      when: t,
    });
    tone({
      type: 'square',
      freq: 440,
      freqEnd: 110,
      peak: 0.18,
      attack: 0.01,
      hold: 0.08,
      release: 0.2,
      when: t + 0.05,
    });
  },

  powerupNuke() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.45,
      attack: 0.005,
      hold: 0.12,
      release: 0.4,
      filterFreq: 200,
      when: t,
    });
    tone({
      type: 'sine',
      freq: 80,
      freqEnd: 30,
      peak: 0.35,
      attack: 0.02,
      hold: 0.2,
      release: 0.5,
      when: t,
    });
  },

  powerupDouble() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    tone({
      type: 'triangle',
      freq: 523,
      freqEnd: 784,
      peak: 0.22,
      attack: 0.01,
      hold: 0.08,
      release: 0.15,
      when: t,
    });
    tone({
      type: 'triangle',
      freq: 659,
      freqEnd: 988,
      peak: 0.18,
      attack: 0.01,
      hold: 0.08,
      release: 0.18,
      when: t + 0.1,
    });
  },

  menuHover() {
    tone({
      type: 'sine',
      freq: pitchJitter(660, 0.04),
      peak: 0.1,
      attack: 0.005,
      hold: 0.02,
      release: 0.06,
    });
  },

  menuClick() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    tone({
      type: 'triangle',
      freq: 440,
      freqEnd: 880,
      peak: 0.2,
      attack: 0.01,
      hold: 0.05,
      release: 0.12,
      when: t,
    });
    tone({
      type: 'sine',
      freq: 660,
      peak: 0.1,
      attack: 0.005,
      hold: 0.03,
      release: 0.1,
      when: t + 0.06,
    });
  },

  gunFire() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.55,
      attack: 0.001,
      hold: 0.025,
      release: 0.08,
      filterFreq: pitchJitter(2200, 0.25),
      filterType: 'bandpass',
      q: 0.6,
      when: t,
    });
    tone({
      type: 'square',
      freq: pitchJitter(180, 0.12),
      freqEnd: 60,
      peak: 0.38,
      attack: 0.001,
      hold: 0.02,
      release: 0.1,
      when: t,
    });
    tone({
      type: 'sawtooth',
      freq: pitchJitter(420, 0.15),
      freqEnd: 90,
      peak: 0.2,
      attack: 0.001,
      hold: 0.015,
      release: 0.07,
      when: t,
    });
  },

  gunFireAuto() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.38,
      attack: 0.001,
      hold: 0.015,
      release: 0.04,
      filterFreq: pitchJitter(1800, 0.3),
      filterType: 'bandpass',
      q: 0.7,
      when: t,
    });
    tone({
      type: 'square',
      freq: pitchJitter(220, 0.1),
      freqEnd: 80,
      peak: 0.28,
      attack: 0.001,
      hold: 0.012,
      release: 0.05,
      when: t,
    });
  },

  // 7.62×39 bark: deep thump, hollow mid report, delayed long-stroke piston clack
  gunFireAk() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    // Sharp muzzle crack
    noiseBurst({
      peak: 0.5,
      attack: 0.0007,
      hold: 0.008,
      release: 0.032,
      filterFreq: pitchJitter(3000, 0.22),
      filterType: 'bandpass',
      q: 0.95,
      when: t,
    });
    // Classic AK mid "bark" / hollow report
    noiseBurst({
      peak: 0.58,
      attack: 0.001,
      hold: 0.03,
      release: 0.095,
      filterFreq: pitchJitter(760, 0.14),
      filterType: 'bandpass',
      q: 0.5,
      when: t,
    });
    // Fat low boom body
    noiseBurst({
      peak: 0.44,
      attack: 0.001,
      hold: 0.038,
      release: 0.13,
      filterFreq: pitchJitter(260, 0.12),
      filterType: 'lowpass',
      q: 0.65,
      when: t,
    });
    // Deep 7.62 thump
    tone({
      type: 'sawtooth',
      freq: pitchJitter(92, 0.08),
      freqEnd: 36,
      peak: 0.52,
      attack: 0.001,
      hold: 0.028,
      release: 0.12,
      when: t,
    });
    // Woody mid growl
    tone({
      type: 'square',
      freq: pitchJitter(155, 0.1),
      freqEnd: 52,
      peak: 0.34,
      attack: 0.001,
      hold: 0.02,
      release: 0.085,
      when: t,
    });
    // Long-stroke gas piston / bolt clack — the AK signature
    noiseBurst({
      peak: 0.3,
      attack: 0.001,
      hold: 0.012,
      release: 0.042,
      filterFreq: pitchJitter(2300, 0.2),
      filterType: 'highpass',
      q: 1.3,
      when: t + 0.017,
    });
    tone({
      type: 'triangle',
      freq: pitchJitter(1780, 0.15),
      freqEnd: 580,
      peak: 0.2,
      attack: 0.001,
      hold: 0.009,
      release: 0.048,
      when: t + 0.015,
    });
    // Receiver metallic tick
    tone({
      type: 'square',
      freq: pitchJitter(960, 0.18),
      freqEnd: 380,
      peak: 0.11,
      attack: 0.001,
      hold: 0.006,
      release: 0.032,
      when: t + 0.021,
    });
  },

  // 7.62×54R crack: long-range report, deep boom, delayed bolt clack
  gunFireSniper() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.62,
      attack: 0.0006,
      hold: 0.012,
      release: 0.05,
      filterFreq: pitchJitter(3400, 0.2),
      filterType: 'bandpass',
      q: 1.1,
      when: t,
    });
    noiseBurst({
      peak: 0.55,
      attack: 0.001,
      hold: 0.045,
      release: 0.16,
      filterFreq: pitchJitter(420, 0.12),
      filterType: 'lowpass',
      q: 0.55,
      when: t,
    });
    tone({
      type: 'sawtooth',
      freq: pitchJitter(78, 0.08),
      freqEnd: 28,
      peak: 0.58,
      attack: 0.001,
      hold: 0.04,
      release: 0.18,
      when: t,
    });
    tone({
      type: 'square',
      freq: pitchJitter(210, 0.1),
      freqEnd: 55,
      peak: 0.28,
      attack: 0.001,
      hold: 0.025,
      release: 0.12,
      when: t,
    });
    // Bolt / extractor clack
    noiseBurst({
      peak: 0.28,
      attack: 0.001,
      hold: 0.01,
      release: 0.04,
      filterFreq: pitchJitter(2100, 0.18),
      filterType: 'highpass',
      q: 1.4,
      when: t + 0.04,
    });
    tone({
      type: 'triangle',
      freq: pitchJitter(1400, 0.12),
      freqEnd: 400,
      peak: 0.16,
      attack: 0.001,
      hold: 0.01,
      release: 0.05,
      when: t + 0.038,
    });
  },

  gunFireShotgun() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.7,
      attack: 0.001,
      hold: 0.05,
      release: 0.18,
      filterFreq: pitchJitter(1400, 0.2),
      filterType: 'lowpass',
      q: 0.5,
      when: t,
    });
    tone({
      type: 'sawtooth',
      freq: pitchJitter(110, 0.1),
      freqEnd: 40,
      peak: 0.45,
      attack: 0.002,
      hold: 0.04,
      release: 0.15,
      when: t,
    });
    tone({
      type: 'square',
      freq: pitchJitter(280, 0.15),
      freqEnd: 70,
      peak: 0.22,
      attack: 0.001,
      hold: 0.03,
      release: 0.12,
      when: t + 0.01,
    });
  },

  gunReload() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    // mag out
    noiseBurst({
      peak: 0.22,
      attack: 0.005,
      hold: 0.04,
      release: 0.08,
      filterFreq: 900,
      filterType: 'highpass',
      when: t,
    });
    tone({
      type: 'triangle',
      freq: 320,
      freqEnd: 180,
      peak: 0.14,
      attack: 0.01,
      hold: 0.05,
      release: 0.1,
      when: t,
    });
    // mag in
    tone({
      type: 'square',
      freq: 200,
      freqEnd: 140,
      peak: 0.16,
      attack: 0.005,
      hold: 0.03,
      release: 0.08,
      when: t + 0.35,
    });
    noiseBurst({
      peak: 0.18,
      attack: 0.002,
      hold: 0.025,
      release: 0.06,
      filterFreq: 1200,
      when: t + 0.35,
    });
    // slap / bolt
    tone({
      type: 'triangle',
      freq: 480,
      freqEnd: 220,
      peak: 0.2,
      attack: 0.002,
      hold: 0.02,
      release: 0.1,
      when: t + 0.7,
    });
    noiseBurst({
      peak: 0.2,
      attack: 0.001,
      hold: 0.02,
      release: 0.05,
      filterFreq: 2000,
      when: t + 0.7,
    });
  },

  pieThrow() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    tone({
      type: 'sine',
      freq: pitchJitter(220, 0.1),
      freqEnd: 90,
      peak: 0.22,
      attack: 0.01,
      hold: 0.06,
      release: 0.12,
      when: t,
    });
    noiseBurst({
      peak: 0.15,
      attack: 0.01,
      hold: 0.05,
      release: 0.1,
      filterFreq: 600,
      when: t,
    });
  },

  pieReload() {
    tone({
      type: 'triangle',
      freq: 180,
      freqEnd: 260,
      peak: 0.14,
      attack: 0.02,
      hold: 0.08,
      release: 0.15,
    });
  },

  meleeSwing() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.12,
      attack: 0.005,
      hold: 0.03,
      release: 0.08,
      filterFreq: pitchJitter(900, 0.25),
      filterType: 'bandpass',
      q: 0.7,
      when: t,
    });
    tone({
      type: 'sine',
      freq: pitchJitter(140, 0.15),
      freqEnd: 70,
      peak: 0.1,
      attack: 0.01,
      hold: 0.04,
      release: 0.1,
      when: t,
    });
  },

  meleeWhiff() {
    noiseBurst({
      peak: 0.06,
      attack: 0.002,
      hold: 0.02,
      release: 0.06,
      filterFreq: pitchJitter(1200, 0.2),
      filterType: 'highpass',
      q: 0.5,
    });
  },

  meleeHit() {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst({
      peak: 0.28,
      attack: 0.001,
      hold: 0.025,
      release: 0.1,
      filterFreq: pitchJitter(380, 0.2),
      filterType: 'lowpass',
      q: 0.8,
      when: t,
    });
    tone({
      type: 'triangle',
      freq: pitchJitter(95, 0.15),
      freqEnd: 40,
      peak: 0.2,
      attack: 0.005,
      hold: 0.04,
      release: 0.12,
      when: t,
    });
    // Glass clink — bottle knuckle
    tone({
      type: 'sine',
      freq: pitchJitter(880, 0.1),
      freqEnd: 420,
      peak: 0.08,
      attack: 0.001,
      hold: 0.015,
      release: 0.08,
      when: t + 0.01,
    });
  },
};

export function play(name, opts) {
  const fn = cues[name];
  if (!fn) return;
  const c = getCtx();
  if (!c) return;
  // Resume if browser suspended the graph mid-match
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (!unlocked) return;
  if (getEffectiveVolume() < 0.001) return;
  fn(opts || {});
}

/** Stereo + distance falloff for a zombie relative to the local player. */
export function spatialForZombie(state, zx, zz, maxDist = 36) {
  if (!state?.position) return { volume: 0.7, pan: 0, dist: 8 };
  const px = state.position.x;
  const pz = state.position.z;
  const dist = Math.hypot(zx - px, zz - pz);
  if (dist > maxDist) return null;
  // Keep a high floor so approach audio is obvious across the map
  const volume = Math.max(0.4, 0.35 + (1 - dist / maxDist) * 0.75);
  const yaw = state.yaw || 0;
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const inv = dist > 0.001 ? 1 / dist : 0;
  const pan = Math.max(-1, Math.min(1, (zx - px) * rx * inv + (zz - pz) * rz * inv));
  return { volume, pan, dist };
}

/** Call once per game frame before zombie step/moan sounds. */
export function resetStepBudget() {
  stepsThisFrame = 0;
  moansThisFrame = 0;
}

const MENU_BPM = 86;
const MENU_BEAT = 60 / MENU_BPM;

/** D minor / carnival — grim waltz with slightly sour intervals */
const MENU_BASS = [
  73.42, null, 73.42, // D2
  87.31, null, 87.31, // F2
  98.0, null, 82.41, // G2 / E2
  73.42, null, 69.3, // D2 / C#2 sour
];

const MENU_MELODY = [
  293.66, 349.23, 440.0, // D4 F4 A4
  415.3, 349.23, 293.66, // Ab4 F4 D4
  261.63, 293.66, 349.23, // C4 D4 F4
  392.0, 349.23, null, // G4 F4 —
  440.0, 466.16, 440.0, // A4 Bb4 A4
  349.23, 293.66, 277.18, // F4 D4 C#4
  293.66, null, 220.0, // D4 — A3
  246.94, 261.63, 293.66, // B3 C4 D4
];

const MENU_CALLIOPE = [
  null, 587.33, null,
  523.25, null, 466.16,
  null, 440.0, 392.0,
  null, 349.23, null,
  523.25, null, 587.33,
  698.46, null, 659.25,
  null, 587.33, null,
  440.0, null, 349.23,
];

let musicStep = 0;
let musicNextTime = 0;
let musicScheduler = null;
let musicMaster = null;
let padNodes = [];

function playMenuNote(freq, when, dur, type, peak, filterFreq) {
  const c = getCtx();
  if (!c || !musicMaster) return;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  // slight sour detune for carnival unease
  osc.detune.setValueAtTime((Math.random() - 0.5) * 18, when);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, when);
  filter.Q.value = 0.7;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.03);
  g.gain.exponentialRampToValueAtTime(peak * 0.55, when + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  osc.connect(filter);
  filter.connect(g);
  g.connect(musicMaster);
  osc.start(when);
  osc.stop(when + dur + 0.05);
  ambienceNodes.push(osc, filter, g);
}

function playFactoryClank(when) {
  const c = getCtx();
  if (!c || !musicMaster) return;
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180 + Math.random() * 80, when);
  osc.frequency.exponentialRampToValueAtTime(70, when + 0.18);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(AMB_GAIN * 0.22, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);

  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(0.15);
  const nf = c.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = 1200 + Math.random() * 800;
  nf.Q.value = 2;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, when);
  ng.gain.exponentialRampToValueAtTime(AMB_GAIN * 0.12, when + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);

  osc.connect(g);
  g.connect(musicMaster);
  noise.connect(nf);
  nf.connect(ng);
  ng.connect(musicMaster);
  osc.start(when);
  osc.stop(when + 0.22);
  noise.start(when);
  noise.stop(when + 0.12);
  ambienceNodes.push(osc, g, noise, nf, ng);
}

function playSteamHiss(when) {
  const c = getCtx();
  if (!c || !musicMaster) return;
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(0.55);
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1800;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(AMB_GAIN * 0.08, when + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
  noise.connect(filter);
  filter.connect(g);
  g.connect(musicMaster);
  noise.start(when);
  noise.stop(when + 0.55);
  ambienceNodes.push(noise, filter, g);
}

function scheduleMenuBar() {
  const c = getCtx();
  if (!c || !unlocked || !musicMaster) return;

  const horizon = c.currentTime + 0.2;
  while (musicNextTime < horizon + 0.85) {
    const i = musicStep % MENU_MELODY.length;
    const t = musicNextTime;
    const beatDur = MENU_BEAT * 0.92;

    const bass = MENU_BASS[i % MENU_BASS.length];
    if (bass != null) {
      playMenuNote(bass, t, beatDur * 1.4, 'sine', AMB_GAIN * 0.55, 420);
      playMenuNote(bass * 2, t, beatDur * 1.1, 'triangle', AMB_GAIN * 0.18, 800);
    }

    const mel = MENU_MELODY[i];
    if (mel != null) {
      playMenuNote(mel, t, beatDur * 0.95, 'triangle', AMB_GAIN * 0.38, 2400);
    }

    const cal = MENU_CALLIOPE[i];
    if (cal != null) {
      playMenuNote(cal, t + 0.02, beatDur * 0.7, 'square', AMB_GAIN * 0.09, 1800);
    }

    // factory accents every few beats
    if (i % 6 === 2) playFactoryClank(t + 0.05);
    if (i % 12 === 8) playSteamHiss(t);

    musicStep += 1;
    musicNextTime += MENU_BEAT;
  }
}

function startMenuPad() {
  const c = getCtx();
  if (!c || !musicMaster) return;

  const freqs = [146.83, 174.61, 220.0]; // D3 F3 A3 minor
  freqs.forEach((f, idx) => {
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    osc.type = 'sine';
    osc2.type = 'sine';
    osc.frequency.value = f;
    osc2.frequency.value = f * 1.005;
    osc.detune.value = idx * 3;

    const lfo = c.createOscillator();
    lfo.frequency.value = 0.12 + idx * 0.04;
    const lfoG = c.createGain();
    lfoG.gain.value = 2.5;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);

    const g = c.createGain();
    g.gain.value = AMB_GAIN * 0.14;
    osc.connect(g);
    osc2.connect(g);
    g.connect(musicMaster);
    osc.start();
    osc2.start();
    lfo.start();
    padNodes.push(osc, osc2, lfo, lfoG, g);
    ambienceNodes.push(osc, osc2, lfo, lfoG, g);
  });
}

export function startMenuAmbience() {
  const c = getCtx();
  if (!c || !unlocked || musicScheduler) return;

  musicMaster = c.createGain();
  musicMaster.gain.value = 0.0001;
  musicMaster.connect(master);
  musicMaster.gain.linearRampToValueAtTime(1, c.currentTime + 1.2);
  ambienceNodes.push(musicMaster);

  musicStep = 0;
  musicNextTime = c.currentTime + 0.15;
  startMenuPad();
  scheduleMenuBar();

  musicScheduler = setInterval(scheduleMenuBar, 100);
}

export function stopMenuAmbience() {
  if (musicScheduler) {
    clearInterval(musicScheduler);
    musicScheduler = null;
  }

  const c = getCtx();
  if (musicMaster && c) {
    try {
      musicMaster.gain.cancelScheduledValues(c.currentTime);
      musicMaster.gain.setValueAtTime(musicMaster.gain.value, c.currentTime);
      musicMaster.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.4);
    } catch {
      /* ignore */
    }
  }

  const nodes = ambienceNodes.slice();
  ambienceNodes = [];
  padNodes = [];
  musicMaster = null;
  musicStep = 0;

  setTimeout(() => {
    for (const n of nodes) {
      try {
        if (typeof n.stop === 'function') n.stop();
        n.disconnect?.();
      } catch {
        /* already stopped */
      }
    }
  }, 450);
}
