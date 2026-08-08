import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameApi } from '../GameContext';
import { getActiveMap } from '../map/activeMap';
import {
  collideEntity,
  buildFrameColliders,
  sampleFloorY,
  separateFromZombies as separatePlayerFromZombies,
} from '../systems/collision';
import { getClosedDoorColliders } from '../systems/DoorSystem';
import {
  getBoardedWindowColliders,
  openWindowsForState,
  getWindowById,
  tearBoard,
} from '../systems/WindowSystem';
import {
  bossHpForRound,
  zombieHpForRound,
  zombieSpeedForRound,
} from '../systems/gameState';
import { tickRound } from '../systems/RoundSystem';
import { PLAYER, BARRICADE, ROUND, REVIVE } from '../constants';
import { play, resetStepBudget, spatialForZombie } from '../audio/sound';
import { onDamaged } from '../systems/HealthRegen';
import { knockDownPlayer } from '../net/coopState';
import ZombieModel from './Zombie';

/**
 * Corpses linger in the array for their death animation, so the pool needs
 * headroom above the live cap. Derived from ROUND.maxActive so raising the live
 * cap can't silently starve spawning.
 */
const CORPSE_HEADROOM = 6;
const MAX_ZOMBIES = ROUND.maxActive + CORPSE_HEADROOM;
/** Soft body radius between chasing zombies (match collideEntity radius 0.35) */
const ZOMBIE_SEP = 0.72;
let nextId = 1;

function sepRadiusFor(z) {
  if (z?.boss) return (z.radius || ROUND.bossRadius) * 2;
  return ZOMBIE_SEP;
}

/** Push `z` away from overlapping live chase zombies so they don't clip. */
function separateFromZombies(z, zombies, colliders) {
  for (let j = 0; j < zombies.length; j++) {
    const o = zombies[j];
    if (o === z || o.dead || o.phase !== 'chase') continue;
    if (Math.abs((o.y || 0) - (z.y || 0)) > 1.2) continue;
    const sep = Math.max(sepRadiusFor(z), sepRadiusFor(o));
    const odx = z.x - o.x;
    const odz = z.z - o.z;
    const d = Math.hypot(odx, odz);
    if (d < 1e-4) {
      // Exact overlap — nudge on a stable angle from id
      const a = (z.id || 0) * 2.399;
      z.x += Math.cos(a) * sep * 0.5;
      z.z += Math.sin(a) * sep * 0.5;
      continue;
    }
    if (d < sep) {
      const push = (sep - d) * 0.5;
      z.x += (odx / d) * push;
      z.z += (odz / d) * push;
    }
  }
  const fixed = collideEntity(
    z.x,
    z.z,
    z.radius || 0.35,
    colliders,
    z.y || 0
  );
  z.x = fixed.x;
  z.z = fixed.z;
  z.y = fixed.y;
}

function pickZombieVariant(map) {
  const list = map.zombieVariants;
  if (Array.isArray(list) && list.length > 0) {
    return list[Math.floor(Math.random() * list.length)] || null;
  }
  return map.zombieVariant || null;
}

/** Boss look follows map theme — farm/city/butcher reuse special variants. */
function bossStyleForMap(map) {
  const theme = map?.theme || 'stone';
  if (theme === 'farm') {
    return { variant: 'cow', bossTheme: 'farm' };
  }
  if (theme === 'butcher') {
    return { variant: 'farmer', bossTheme: 'butcher' };
  }
  if (theme === 'city') {
    return { variant: 'gypsy', bossTheme: 'city' };
  }
  if (theme === 'camp') {
    return { variant: null, bossTheme: 'camp' };
  }
  if (theme === 'suburb') {
    return { variant: null, bossTheme: 'suburb' };
  }
  return { variant: null, bossTheme: 'stone' };
}

/** Outward XZ unit from window opening (away from interior). */
function windowOutward(win) {
  const fx = win.facing?.[0];
  const fz = win.facing?.[2];
  if (fx != null && fz != null && (fx !== 0 || fz !== 0)) {
    const len = Math.hypot(fx, fz) || 1;
    // facing points into the room
    return { x: -fx / len, z: -fz / len };
  }
  const dx = (win.outside?.x ?? 0) - (win.inside?.x ?? 0);
  const dz = (win.outside?.z ?? 0) - (win.inside?.z ?? 0);
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

/**
 * Spawn well outside the tear point so approach is a real walk-up,
 * not a pop-in at the sill.
 */
function spawnOutsideApproach(win) {
  const n = windowOutward(win);
  const sideX = -n.z;
  const sideZ = n.x;
  const dist = 5.8 + Math.random() * 2.8;
  const lateral = (Math.random() - 0.5) * ((win.width || 2) * 0.85);
  return {
    x: win.outside.x + n.x * dist + sideX * lateral,
    z: win.outside.z + n.z * dist + sideZ * lateral,
  };
}

/** Ground while far; ease up to window floorY in the last meters (upper floors). */
function approachFeetY(win, dist, x, z, prevY) {
  const baseY = win.floorY ?? 0;
  const ground = sampleFloorY(x, z, prevY > 0.5 ? 0 : prevY);
  if (baseY <= 0.15) return ground;
  const riseStart = 2.4;
  if (dist >= riseStart) return ground;
  const t = 1 - dist / riseStart;
  const ease = t * t * (3 - 2 * t);
  return ground + (baseY - ground) * ease;
}

function createZombie(x, z, round, windowId = null, { boss = false, y = 0 } = {}) {
  const map = getActiveMap();
  const style = boss ? bossStyleForMap(map) : null;
  const variant = boss ? style.variant : pickZombieVariant(map);
  const hp = boss ? bossHpForRound(round) : zombieHpForRound(round);
  const speed = boss
    ? zombieSpeedForRound(round) * ROUND.bossSpeedMult
    : zombieSpeedForRound(round);
  return {
    id: nextId++,
    x,
    z,
    y,
    hp,
    maxHp: hp,
    speed,
    dead: false,
    deathTimer: 0,
    attackCooldown: 0,
    /** null = idle; otherwise seconds into current swing */
    attackT: null,
    attackHit: false,
    hitFlash: 0,
    yaw: 0,
    stepAcc: Math.random() * 0.45,
    phase: windowId ? 'approach' : 'chase',
    windowId,
    tearTimer: BARRICADE.tearInterval * (0.35 + Math.random() * 0.5),
    climbT: 0,
    walkPhase: Math.random() * Math.PI * 2,
    moving: false,
    variant,
    variantSeed: Math.floor(Math.random() * 64),
    moanTimer: 0.4 + Math.random() * 1.8,
    boss,
    bossTheme: boss ? style.bossTheme : null,
    scale: boss ? ROUND.bossScale : 1,
    radius: boss ? ROUND.bossRadius : 0.35,
    attackDamage: boss ? ROUND.bossAttackDamage : ROUND.attackDamage,
    crawling: false,
    crawlBark: null,
    crawlBarkT: 0,
    crawlBarkIdx: 0,
  };
}

/** Crawlers drag on their elbows — much slower than bipedal shambling */
function moveSpeed(z) {
  return z.crawling ? z.speed * 0.38 : z.speed;
}

function applySwingDamage(state, target, damage = ROUND.attackDamage) {
  if (target && !target.isLocal) {
    const p = target.player;
    if (
      !p ||
      p.status === 'dead' ||
      p.status === 'spectator' ||
      p.status === 'downed'
    ) {
      return;
    }
    if (p.damageCooldown > 0) return;
    p.hp -= damage;
    p.damageCooldown = PLAYER.damageCooldown;
    onDamaged(p);
    if (p.hp <= 0) {
      if (state.coop) knockDownPlayer(p);
      else {
        p.hp = 0;
        p.status = 'dead';
      }
    }
    return;
  }

  if (
    state.status === 'dead' ||
    state.status === 'downed' ||
    state.hp <= 0
  ) {
    return;
  }
  if (state.damageCooldown > 0) return;
  state.hp -= damage;
  state.damageCooldown = PLAYER.damageCooldown;
  onDamaged(state);
  if (state.hp <= 0) {
    state.hp = 0;
    if (state.coop) {
      state.status = 'downed';
      state.bleedoutTimer = REVIVE.bleedoutTime;
      state.reviveProgress = 0;
      state.reviveTargetId = null;
    } else {
      state.status = 'dead';
    }
    document.exitPointerLock?.();
  }
}

/** Wind-up → strike (damage) → recover. Bosses also have solid body collision. */
function tickZombieMelee(z, state, target, dist, clampedDt, sameFloor) {
  const engage = z.boss ? ROUND.bossAttackEngage : ROUND.attackEngage;
  const hitRange = z.boss ? ROUND.bossAttackHitRange : ROUND.attackHitRange;
  const damage = z.attackDamage ?? ROUND.attackDamage;

  if (z.attackT != null) {
    z.attackT += clampedDt;
    z.moving = false;
    z.walkPhase += clampedDt * 8;

    if (!z.attackHit && z.attackT >= ROUND.attackWindup) {
      z.attackHit = true;
      play('zombieAttack');
      if (sameFloor && dist <= hitRange) {
        applySwingDamage(state, target, damage);
      }
    }

    if (z.attackT >= ROUND.attackWindup + ROUND.attackRecover) {
      z.attackT = null;
      z.attackHit = false;
      z.attackCooldown = ROUND.attackCooldown;
    }
    return true;
  }

  if (!sameFloor) return false;
  if (z.attackCooldown > 0) return false;
  if (dist > engage) return false;

  z.attackT = 0;
  z.attackHit = false;
  z.moving = false;
  return true;
}

/** Keep zombies from overlapping the local player / coop targets. */
function resolveBossPlayerBodies(state, zombies, colliders) {
  const feetY =
    state.floorY ?? Math.max(0, (state.position?.y || 0) - PLAYER.height);
  if (state.status === 'playing' || state.status === 'downed') {
    const next = separatePlayerFromZombies(
      state.position.x,
      state.position.z,
      zombies,
      { playerFeetY: feetY, pushZombie: true }
    );
    state.position.x = next.x;
    state.position.z = next.z;
  }

  const targets = state.coopTargets;
  if (targets?.length) {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (t.isLocal) continue;
      const p = t.player;
      if (!p?.position) continue;
      const tf =
        t.floorY ?? Math.max(0, (p.position.y || 0) - PLAYER.height);
      const next = separatePlayerFromZombies(t.x, t.z, zombies, {
        playerFeetY: tf,
        pushZombie: true,
      });
      t.x = next.x;
      t.z = next.z;
      p.position.x = next.x;
      p.position.z = next.z;
    }
  }

  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (!z.boss || z.dead || z.phase !== 'chase') continue;
    const fixed = collideEntity(
      z.x,
      z.z,
      z.radius || ROUND.bossRadius,
      colliders,
      z.y || 0
    );
    z.x = fixed.x;
    z.z = fixed.z;
    z.y = fixed.y;
  }
}

function tickZombieAudio(state, z, clampedDt) {
  const spat = spatialForZombie(state, z.x, z.z, 36);
  if (!spat) {
    z.moanTimer = Math.max(z.moanTimer || 0, 0.4);
    return spat;
  }

  z.moanTimer = (z.moanTimer ?? 1) - clampedDt;
  if (z.moanTimer <= 0) {
    const near = spat.dist < 12;
    const windowBusy =
      z.phase === 'approach' || z.phase === 'tear' || z.phase === 'climb';
    z.moanTimer =
      (near ? 1.8 : 3.2) +
      Math.random() * (near ? 2.4 : 4.5) +
      (windowBusy ? -0.4 : 0);
    play('zombieMoan', {
      volume: Math.min(0.9, spat.volume * (windowBusy ? 1.05 : 0.85)),
      pan: spat.pan,
    });
  }
  return spat;
}

function pickChaseTarget(z, state) {
  const targets = state.coopTargets;
  let tx;
  let tz;
  let target = null;
  let dist;
  if (targets?.length) {
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const d = Math.hypot(t.x - z.x, t.z - z.z);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    if (!best) return null;
    tx = best.x;
    tz = best.z;
    target = best;
    dist = bestDist;
  } else {
    tx = state.position.x;
    tz = state.position.z;
    dist = Math.hypot(tx - z.x, tz - z.z);
  }

  // Different floor — steer toward stairs so they can climb
  const playerFeet =
    target?.floorY ?? state.floorY ?? Math.max(0, (state.position?.y || 0) - PLAYER.height);
  const zFeet = z.y || 0;
  if (Math.abs(playerFeet - zFeet) > 1.15) {
    const stairs = getActiveMap().STAIRS;
    if (stairs?.length) {
      let best = stairs[0];
      let bestD = Infinity;
      for (let i = 0; i < stairs.length; i++) {
        const s = stairs[i];
        const d = Math.hypot(s.x - z.x, s.z - z.z);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      // Aim for the end of the stair that matches our current height
      const axis = best.axis || 'z';
      const span = axis === 'z' ? best.d : best.w;
      const goingUp = playerFeet > zFeet;
      const t = goingUp ? (best.dir === -1 ? 0 : 1) : best.dir === -1 ? 1 : 0;
      const along = (axis === 'z' ? best.z : best.x) + (t - 0.5) * span * 0.85;
      if (axis === 'z') {
        tx = best.x;
        tz = along;
      } else {
        tx = along;
        tz = best.z;
      }
      dist = Math.hypot(tx - z.x, tz - z.z);
    }
  }

  return { x: tx, z: tz, target, dist };
}

export default function ZombieManager() {
  const { stateRef, zombiesRef, notify } = useGameApi();
  const spawnCooldown = useRef(0);

  const slots = useMemo(
    () => Array.from({ length: MAX_ZOMBIES }, (_, i) => i),
    []
  );

  const spawnZombie = () => {
    const state = stateRef.current;
    if (zombiesRef.current.length >= MAX_ZOMBIES) return false;

    const asBoss = !!state.bossPending;
    if (asBoss) state.bossPending = false;

    const openWins = openWindowsForState(state);
    if (openWins.length) {
      const px = state.position.x;
      const pz = state.position.z;
      const sorted = [...openWins].sort((a, b) => {
        const da = Math.hypot(a.inside.x - px, a.inside.z - pz);
        const db = Math.hypot(b.inside.x - px, b.inside.z - pz);
        return db - da;
      });
      const pick = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
      const spawn = spawnOutsideApproach(pick);
      const spawnY = sampleFloorY(spawn.x, spawn.z, 0);
      zombiesRef.current.push(
        createZombie(spawn.x, spawn.z, state.round, pick.id, {
          boss: asBoss,
          y: spawnY,
        })
      );
      play('zombieMoan', { volume: asBoss ? 1 : 0.85 });
      return true;
    }

    // Fallback if a map has no windows
    const openSpawns = getActiveMap().SPAWN_POINTS.filter(
      (sp) => state.rooms[sp.room]?.open
    );
    if (!openSpawns.length) return false;
    const pick = openSpawns[Math.floor(Math.random() * openSpawns.length)];
    const jitter = () => (Math.random() - 0.5) * 1.2;
    zombiesRef.current.push(
      createZombie(
        pick.position[0] + jitter(),
        pick.position[2] + jitter(),
        state.round,
        null,
        { boss: asBoss }
      )
    );
    play(asBoss ? 'zombieMoan' : 'zombieSpawn');
    return true;
  };

  useFrame((_, dt) => {
    const state = stateRef.current;
    if (state.status !== 'playing' && !state.coop) return;
    if (state.coop && !state.isHost) return;
    if (state.status !== 'playing' && !state.coopMatchOver) return;
    const simActive =
      state.status === 'playing' ||
      (state.coop && state.isHost && !state.coopMatchOver);
    if (!simActive) return;

    const clampedDt = Math.min(dt, 0.05);
    resetStepBudget();

    spawnCooldown.current -= clampedDt;
    const gatedSpawn = () => {
      if (spawnCooldown.current > 0) return false;
      const ok = spawnZombie();
      if (ok) spawnCooldown.current = 0.45;
      return ok;
    };

    const savedStatus = state.status;
    if (
      state.coop &&
      state.isHost &&
      (state.status === 'dead' || state.status === 'downed') &&
      !state.coopMatchOver
    ) {
      state.status = 'playing';
    }
    const roundResult = tickRound(state, clampedDt, gatedSpawn, zombiesRef);
    if (
      state.coop &&
      state.isHost &&
      (savedStatus === 'dead' || savedStatus === 'downed') &&
      !state.coopMatchOver
    ) {
      state.status = savedStatus;
    }
    if (roundResult?.transitChanged) {
      // Remount MapWorld immediately — don't wait for the 150ms hud poll
      notify?.();
    }

    const doors = getClosedDoorColliders(state);
    const boards = getBoardedWindowColliders();
    const colliders = buildFrameColliders(doors, boards);
    const zombies = zombiesRef.current;

    // One tearer per window
    const tearerByWindow = {};
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (z.dead) continue;
      if (z.phase === 'tear' && z.windowId) {
        if (!tearerByWindow[z.windowId]) tearerByWindow[z.windowId] = z.id;
      }
    }

    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];
      if (z.dead) {
        z.deathTimer -= clampedDt;
        if (z.deathTimer <= 0) zombies.splice(i, 1);
        continue;
      }

      if (z.hitFlash > 0) z.hitFlash -= clampedDt;
      if (z.attackCooldown > 0) z.attackCooldown -= clampedDt;

      const spat = tickZombieAudio(state, z, clampedDt);

      const win = z.windowId ? getWindowById(z.windowId) : null;

      // Approach: walk from fog → tear point on the ground (no wall collision outside)
      if (z.phase === 'approach' || z.phase === 'tear') {
        if (!win) {
          z.phase = 'chase';
          z.windowId = null;
          continue;
        }
        const tx = win.outside.x;
        const tz = win.outside.z;
        const dx = tx - z.x;
        const dz = tz - z.z;
        const dist = Math.hypot(dx, dz);
        const baseY = win.floorY ?? 0;

        if (dist > 0.15 && z.phase === 'approach') {
          const spd = moveSpeed(z) * 0.9;
          z.x += (dx / dist) * spd * clampedDt;
          z.z += (dz / dist) * spd * clampedDt;
          z.yaw = Math.atan2(dx, dz);
          const nextDist = Math.hypot(tx - z.x, tz - z.z);
          z.y = approachFeetY(win, nextDist, z.x, z.z, z.y || 0);
          z.walkPhase += clampedDt * (z.crawling ? 9 : 7);
          z.moving = true;
          z.stepAcc = (z.stepAcc || 0) + clampedDt;
          if (z.stepAcc >= 0.45) {
            z.stepAcc = 0;
            if (spat) play('zombieStep', { volume: spat.volume * 0.85, pan: spat.pan });
          }
        } else {
          z.x = tx;
          z.z = tz;
          z.y = baseY;
          z.yaw = win.yaw;
          z.phase = 'tear';
          z.moving = false;
        }

        if (z.phase === 'tear') {
          z.x = tx;
          z.z = tz;
          z.y = baseY;
          z.yaw = win.yaw;
          const boardsLeft = state.windows[win.id]?.boards ?? 0;
          const isTearer =
            !tearerByWindow[win.id] || tearerByWindow[win.id] === z.id;

          if (boardsLeft <= 0) {
            z.phase = 'climb';
            z.climbT = 0;
            z.moving = false;
            play('zombieSpawn');
          } else if (isTearer) {
            tearerByWindow[win.id] = z.id;
            z.tearTimer -= clampedDt;
            z.walkPhase += clampedDt * 10;
            z.moving = true;
            if (z.tearTimer <= 0) {
              tearBoard(state, win.id);
              play('boardTear');
              z.tearTimer = BARRICADE.tearInterval;
            }
          } else {
            z.walkPhase += clampedDt * 4;
            z.moving = false;
          }
        }
        continue;
      }

      if (z.phase === 'climb') {
        if (!win) {
          z.phase = 'chase';
          continue;
        }
        z.climbT += clampedDt / BARRICADE.climbDuration;
        const t = Math.min(1, z.climbT);
        const e = t * t * (3 - 2 * t);
        z.x = win.outside.x + (win.inside.x - win.outside.x) * e;
        z.z = win.outside.z + (win.inside.z - win.outside.z) * e;
        const baseY = win.floorY ?? 0;
        // Vault arc through the opening — stay on the window floor plane, not mid-air roam
        z.y = baseY + Math.sin(e * Math.PI) * 0.45;
        z.yaw = win.yaw;
        z.walkPhase += clampedDt * 9;
        z.moving = true;

        if (t >= 1) {
          z.x = win.inside.x;
          z.z = win.inside.z;
          z.y = sampleFloorY(z.x, z.z, baseY);
          z.phase = 'chase';
          z.windowId = null;
          z.moving = true;
        }
        continue;
      }

      // Chase
      const chase = pickChaseTarget(z, state);
      if (!chase) continue;
      const { x: px, z: pz, dist, target } = chase;
      const dx = px - z.x;
      const dz = pz - z.z;
      z.yaw = Math.atan2(dx, dz);

      const playerFeet =
        target?.floorY ??
        state.floorY ??
        Math.max(0, (state.position?.y || 0) - PLAYER.height);
      z.y = sampleFloorY(z.x, z.z, z.y || 0);
      const sameFloor = Math.abs((z.y || 0) - playerFeet) <= 1.2;
      const swinging = z.attackT != null;
      const bodyR = z.radius || 0.35;
      const engage = z.boss ? ROUND.bossAttackEngage : ROUND.attackEngage;

      if (!swinging && dist > engage) {
        const spd = moveSpeed(z);
        const nx = z.x + (dx / dist) * spd * clampedDt;
        const nz = z.z + (dz / dist) * spd * clampedDt;
        const feetY = z.y || 0;
        const resolved = collideEntity(nx, nz, bodyR, colliders, feetY);
        z.x = resolved.x;
        z.z = resolved.z;
        z.y = resolved.y;
        separateFromZombies(z, zombies, colliders);
        z.moving = true;
        z.walkPhase += clampedDt * (z.crawling ? 8.5 + spd * 1.6 : 5.5 + z.speed * 1.2);

        z.stepAcc = (z.stepAcc || 0) + clampedDt;
        if (z.stepAcc >= 0.42 && spat && spat.dist < 18) {
          z.stepAcc = 0;
          play('zombieStep', {
            volume: Math.min(1, spat.volume * (z.boss ? 1.2 : 1.05)),
            pan: spat.pan,
          });
        }
      } else {
        separateFromZombies(z, zombies, colliders);
        z.moving = false;
        if (!swinging) z.walkPhase += clampedDt * 2;
        z.y = sampleFloorY(z.x, z.z, z.y || 0);
        tickZombieMelee(z, state, target, dist, clampedDt, sameFloor);
      }
    }

    resolveBossPlayerBodies(state, zombies, colliders);

    // Reconcile against the live array instead of trusting the incremental
    // counter. Any zombie removed without going through onZombieKilled used to
    // leave zombiesAlive too high, which stalls the round forever because the
    // intermission check waits for it to reach zero.
    let alive = 0;
    for (let i = 0; i < zombies.length; i++) {
      if (!zombies[i].dead) alive += 1;
    }
    state.zombiesAlive = alive;
  });

  return (
    <group>
      {slots.map((i) => (
        <ZombieModel key={i} index={i} zombiesRef={zombiesRef} />
      ))}
    </group>
  );
}
