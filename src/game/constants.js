export const PLAYER = {
  speed: 6.5,
  sprintMultiplier: 1.35,
  height: 1.6,
  radius: 0.35,
  maxHp: 100,
  meleeRange: 1.6,
  damageCooldown: 0.85,
  /** Seconds after last hit before HP starts regenerating */
  regenDelay: 4,
  /** HP restored per second once regen kicks in */
  regenRate: 22,
  /** Peak jump ≈ v²/(2g) ≈ 1.65m — clears crates / dumpster lips */
  jumpSpeed: 8.9,
  gravity: 24,
  terminalVelocity: -28,
  /** Hold jump for full height; release cuts ascent */
  jumpCut: 0.52,
  coyoteTime: 0.14,
  jumpBuffer: 0.14,
  airControl: 0.92,
  /** Auto step onto low lips without jumping */
  stepUp: 0.48,
  /** Sprint + crouch slide */
  slideDuration: 0.72,
  slideSpeed: 14.5,
  slideCooldown: 0.55,
  /** Camera drop while sliding (meters) */
  slideCrouch: 0.55,
};

export const POINTS = {
  hit: 10,
  headshotHit: 20,
  kill: 60,
  headshotKill: 100,
  starting: 500,
};

export const ROUND = {
  intermission: 8,
  baseZombies: 6,
  perRound: 2.5,
  maxActive: 24,
  baseHp: 100,
  hpPerRound: 40,
  baseSpeed: 1.8,
  speedPerRound: 0.08,
  maxSpeed: 4.2,
  attackDamage: 20,
  /** Delay after a swing finishes before the next wind-up */
  attackCooldown: 0.85,
  /** Seconds of arm wind-up before the strike lands */
  attackWindup: 0.4,
  /** Seconds after strike until the swing fully ends */
  attackRecover: 0.48,
  /** Start a swing when this close */
  attackEngage: 1.4,
  /** Must still be this close at the strike frame or the swing misses */
  attackHitRange: 1.7,
  /** Spawn a themed boss zombie every N rounds */
  bossEvery: 10,
  /** Boss HP = regular round HP × this */
  bossHpMult: 10,
  bossSpeedMult: 0.72,
  bossScale: 1.85,
  /** Body radius vs walls / player (regular zombies use 0.35) */
  bossRadius: 0.62,
  bossAttackDamage: 40,
  bossAttackEngage: 1.85,
  bossAttackHitRange: 2.15,
};

export const INTERACT_RANGE = 2.8;

/** CoD-style window barricades */
export const BARRICADE = {
  maxBoards: 6,
  repairPoints: 10,
  repairInterval: 0.38,
  tearInterval: 1.25,
  climbDuration: 1.55,
};

/** Co-op teammate revive (downed → hold F) */
export const REVIVE = {
  bleedoutTime: 30,
  holdTime: 3.2,
  range: 2.4,
  reviveHpFrac: 0.5,
  invulnAfter: 1.25,
};
