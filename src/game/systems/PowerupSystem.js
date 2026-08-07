import { awardKill, creditKills } from './PointsSystem';
import { onZombieKilled } from './RoundSystem';
import { play } from '../audio/sound';
import { recordAchievementEvent } from '../camp/campData';
import { queueAchievementBanners } from '../camp/achievements';

export const POWERUP = {
  dropChance: 0.16,
  maxOnGround: 4,
  lifetime: 28,
  pickupRadius: 1.4,
  instaKillDuration: 30,
  doublePointsDuration: 30,
  nukePoints: 400,
};

export const POWERUP_TYPES = ['instakill', 'nuke', 'doublepoints'];

export const POWERUP_META = {
  instakill: {
    id: 'instakill',
    label: 'INSTA-KILL!',
    color: '#c42828',
    emissive: '#ff2200',
  },
  nuke: {
    id: 'nuke',
    label: 'NUKE!',
    color: '#3a6aaa',
    emissive: '#66aaff',
  },
  doublepoints: {
    id: 'doublepoints',
    label: 'DOUBLE POINTS!',
    color: '#e8c84a',
    emissive: '#ffee66',
  },
};

let nextPowerupId = 1;

export function createPowerupState() {
  return {
    drops: [],
    instaKillTimer: 0,
    doublePointsTimer: 0,
    banner: null,
    bannerTimer: 0,
  };
}

/** Finalize a zombie kill + maybe spawn a drop */
export function killZombie(zombie, worldState, scoreState, headshot = false) {
  if (!zombie || zombie.dead) return false;
  zombie.dead = true;
  zombie.deathTimer = 0.6;
  zombie.hp = 0;
  awardKill(scoreState || worldState, headshot);
  onZombieKilled(worldState);
  play('zombieDeath');
  trySpawnPowerup(worldState, zombie.x, zombie.z);
  return true;
}

export function trySpawnPowerup(state, x, z) {
  if (!state.powerups) state.powerups = createPowerupState();
  const pu = state.powerups;
  if (pu.drops.length >= POWERUP.maxOnGround) return null;
  if (Math.random() > POWERUP.dropChance) return null;

  const type =
    POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  const drop = {
    id: nextPowerupId++,
    type,
    x: x + (Math.random() - 0.5) * 0.4,
    z: z + (Math.random() - 0.5) * 0.4,
    y: 0.55,
    life: POWERUP.lifetime,
    bob: Math.random() * Math.PI * 2,
  };
  pu.drops.push(drop);
  play('powerupSpawn');
  return drop;
}

function setBanner(state, text) {
  if (!state.powerups) state.powerups = createPowerupState();
  state.powerups.banner = text;
  state.powerups.bannerTimer = 2.8;
  // Also flash round banner slot for impact
  state.roundBanner = text;
  state.roundBannerTimer = 2.8;
}

export function activatePowerup(state, zombies, type) {
  if (!state.powerups) state.powerups = createPowerupState();
  const pu = state.powerups;
  const meta = POWERUP_META[type];
  if (!meta) return;

  if (type === 'instakill') {
    pu.instaKillTimer = POWERUP.instaKillDuration;
    setBanner(state, meta.label);
    play('powerupInstakill');
  } else if (type === 'doublepoints') {
    pu.doublePointsTimer = POWERUP.doublePointsDuration;
    setBanner(state, meta.label);
    play('powerupDouble');
  } else if (type === 'nuke') {
    setBanner(state, meta.label);
    play('powerupNuke');
    const mult = (state.pointsMult || 1) * (pu.doublePointsTimer > 0 ? 2 : 1);
    state.points += Math.round(POWERUP.nukePoints * mult);
    let nuked = 0;
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (z.dead) continue;
      z.dead = true;
      z.hp = 0;
      z.deathTimer = 0.55 + Math.random() * 0.25;
      z.hitFlash = 0.2;
      onZombieKilled(state);
      nuked += 1;
    }
    // A nuke pays its flat bonus instead of per-kill points, but the bodies
    // still have to count as kills — otherwise the HUD counter, kill quests,
    // and the end-of-run scrap payout all silently ignore them.
    creditKills(state, nuked);
    pu.drops.length = 0;
  } else {
    return;
  }

  const { newly } = recordAchievementEvent('powerup', { type });
  queueAchievementBanners(state, newly);
}

export function isInstaKillActive(state) {
  return (state.powerups?.instaKillTimer || 0) > 0;
}

export function getPointsMultiplier(state) {
  const camp = state.pointsMult || 1;
  const dbl = (state.powerups?.doublePointsTimer || 0) > 0 ? 2 : 1;
  return camp * dbl;
}

/** Tick timers + pickup collision. Returns true if something changed visually. */
export function tickPowerups(state, zombies, dt, playerX, playerZ) {
  if (!state.powerups) state.powerups = createPowerupState();
  const pu = state.powerups;
  const clamped = Math.min(dt, 0.05);

  if (pu.instaKillTimer > 0) {
    pu.instaKillTimer = Math.max(0, pu.instaKillTimer - clamped);
  }
  if (pu.doublePointsTimer > 0) {
    pu.doublePointsTimer = Math.max(0, pu.doublePointsTimer - clamped);
  }
  if (pu.bannerTimer > 0) {
    pu.bannerTimer -= clamped;
    if (pu.bannerTimer <= 0) pu.banner = null;
  }

  for (let i = pu.drops.length - 1; i >= 0; i--) {
    const d = pu.drops[i];
    d.life -= clamped;
    d.bob += clamped * 3.2;
    d.y = 0.55 + Math.sin(d.bob) * 0.12;
    if (d.life <= 0) {
      pu.drops.splice(i, 1);
      continue;
    }
    const dist = Math.hypot(d.x - playerX, d.z - playerZ);
    if (dist <= POWERUP.pickupRadius) {
      const type = d.type;
      pu.drops.splice(i, 1);
      activatePowerup(state, zombies, type);
    }
  }
}
