import * as THREE from 'three';
import { awardHit } from '../systems/PointsSystem';
import { play } from '../audio/sound';
import { spawnPieProjectile } from './PieProjectiles';
import { killZombie, isInstaKillActive } from '../systems/PowerupSystem';
import { getWindowById } from '../systems/WindowSystem';

const raycaster = new THREE.Raycaster();
const direction = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _body = new THREE.Vector3();
const _oc = new THREE.Vector3();

export function fireHitscan(camera, weaponDef, zombies, state, scoreState) {
  camera.getWorldDirection(direction);
  return fireHitscanFromRay(
    camera.position,
    direction,
    weaponDef,
    zombies,
    state,
    scoreState
  );
}

/**
 * @param {THREE.Vector3} origin
 * @param {THREE.Vector3} baseDir
 * @param {*} weaponDef
 * @param {array} zombies
 * @param {*} worldState — round / zombiesAlive
 * @param {*} [scoreState] — points / kills (defaults to worldState)
 */
export function fireHitscanFromRay(
  origin,
  baseDir,
  weaponDef,
  zombies,
  worldState,
  scoreState
) {
  const score = scoreState || worldState;

  if (weaponDef.projectile === 'pie') {
    const dir = baseDir.clone ? baseDir.clone() : new THREE.Vector3().copy(baseDir);
    spawnPieProjectile(worldState, origin, dir, weaponDef);
    return true;
  }

  if (weaponDef.melee) {
    return fireMelee(origin, baseDir, weaponDef, zombies, worldState, score);
  }

  const pellets = weaponDef.pellets || 1;
  const hits = [];
  const splashR = weaponDef.splash || 0;
  const pierce = Math.max(1, weaponDef.penetrate || 1);
  const pierceFalloff = weaponDef.penetrateFalloff ?? 0.75;

  for (let p = 0; p < pellets; p++) {
    _dir.copy(baseDir);
    const spread = weaponDef.spread || 0;
    if (spread > 0) {
      _dir.x += (Math.random() - 0.5) * spread * 2;
      _dir.y += (Math.random() - 0.5) * spread * 2;
      _dir.z += (Math.random() - 0.5) * spread * 2;
      _dir.normalize();
    }
    raycaster.set(origin, _dir);
    raycaster.far = 80;

    const rayHits = [];
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (z.dead) continue;
      const hit = rayHitZombie(origin, _dir, z, Infinity);
      if (hit) rayHits.push(hit);
    }
    rayHits.sort((a, b) => a.dist - b.dist);
    const n = Math.min(pierce, rayHits.length);
    for (let i = 0; i < n; i++) {
      hits.push({ ...rayHits[i], pierceIndex: i });
    }
  }

  const damaged = new Map();
  hits.forEach((h) => {
    const prev = damaged.get(h.zombie) || { damage: 0, headshot: false };
    const pierceMult = Math.pow(pierceFalloff, h.pierceIndex || 0);
    const dmg =
      weaponDef.damage *
      (h.headshot ? weaponDef.headMultiplier : 1) *
      (1 / Math.sqrt(pellets)) *
      pierceMult;
    damaged.set(h.zombie, {
      damage: prev.damage + dmg,
      headshot: prev.headshot || h.headshot,
      impact: h,
    });
  });

  // Crust Cannon splash around primary hit
  if (splashR > 0 && hits.length) {
    const primary = hits[0];
    const px = primary.zombie.x;
    const pz = primary.zombie.z;
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (z.dead || damaged.has(z)) continue;
      const dist = Math.hypot(z.x - px, z.z - pz);
      if (dist < splashR) {
        damaged.set(z, {
          damage: weaponDef.damage * (1 - dist / splashR) * 0.65,
          headshot: false,
        });
      }
    }
  }

  applyDamageMap(damaged, weaponDef, worldState, score, false);
  return hits.length > 0;
}

function fireMelee(origin, baseDir, weaponDef, zombies, worldState, score) {
  const range = weaponDef.meleeRange || 2.2;
  const knock = weaponDef.meleeKnockback || 0;
  _dir.copy(baseDir);
  _dir.y = 0;
  if (_dir.lengthSq() < 0.0001) _dir.set(0, 0, -1);
  else _dir.normalize();

  let best = null;
  let bestDist = range;

  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.dead) continue;
    const yOff = z.y || 0;
    // Prefer torso height vs camera
    const dx = z.x - origin.x;
    const dz = z.z - origin.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range || dist < 0.05) continue;
    const inv = 1 / dist;
    const dot = dx * inv * _dir.x + dz * inv * _dir.z;
    if (dot < 0.25) continue; // must be roughly in front
    const dy = Math.abs(origin.y - (1.0 + yOff));
    if (dy > 2.2) continue;
    if (dist < bestDist) {
      bestDist = dist;
      const headshot = origin.y > 1.35 + yOff && Math.abs(origin.y - (1.55 + yOff)) < 0.55;
      best = { zombie: z, headshot, dist };
    }
  }

  if (!best) {
    play('meleeWhiff');
    return false;
  }

  const damaged = new Map();
  damaged.set(best.zombie, {
    damage: weaponDef.damage * (best.headshot ? weaponDef.headMultiplier : 1),
    headshot: best.headshot,
  });

  if (knock > 0) {
    const z = best.zombie;
    const dx = z.x - origin.x;
    const dz = z.z - origin.z;
    const len = Math.hypot(dx, dz) || 1;
    z.x += (dx / len) * knock * 0.08;
    z.z += (dz / len) * knock * 0.08;
    z.hitFlash = Math.max(z.hitFlash || 0, 0.16);
  }

  applyDamageMap(damaged, weaponDef, worldState, score, true);
  return true;
}

function applyDamageMap(damaged, weaponDef, worldState, score, melee) {
  const insta = isInstaKillActive(worldState);
  damaged.forEach((info, zombie) => {
    const dmg = insta ? zombie.hp : info.damage;
    zombie.hp -= dmg;
    zombie.hitFlash = Math.max(zombie.hitFlash || 0, melee ? 0.16 : 0.12);
    awardHit(score, info.headshot);
    if (zombie.hp <= 0 && !zombie.dead) {
      killZombie(zombie, worldState, score, info.headshot);
    } else {
      play(melee ? 'meleeHit' : 'zombieHit');
    }
  });
}

/**
 * Window tear/climb zombies sit outside the wall — tiny spheres at their feet
 * are almost impossible to hit from an angle. Add a fat portal volume in the
 * opening so they register when you aim through the window from across the room.
 */
function rayHitZombie(origin, dir, z, bestDistCap) {
  let best = null;
  let bestDist = bestDistCap;
  const yOff = z.y || 0;

  const consider = (x, y, zz, r, headshot) => {
    _body.set(x, y, zz);
    const t = raySphere(origin, dir, _body, r);
    if (t != null && t < bestDist) {
      bestDist = t;
      best = { zombie: z, headshot, dist: t };
    }
  };

  consider(z.x, 0.95 + yOff, z.z, 0.5, false);
  consider(z.x, 1.55 + yOff, z.z, 0.26, true);

  if (
    z.windowId &&
    (z.phase === 'approach' || z.phase === 'tear' || z.phase === 'climb')
  ) {
    const win = getWindowById(z.windowId);
    if (win) {
      const climbT = z.phase === 'climb' ? Math.min(1, z.climbT || 0) : 0;
      const portalT = z.phase === 'climb' ? 0.35 + climbT * 0.45 : 0.4;
      const px = win.outside.x + (win.inside.x - win.outside.x) * portalT;
      const pz = win.outside.z + (win.inside.z - win.outside.z) * portalT;
      const ox = win.position[0];
      const oz = win.position[2];
      const halfW = (win.width || 1.75) * 0.45;

      consider(px, 1.05 + yOff, pz, 0.75, false);
      consider(px, 1.6 + yOff, pz, 0.38, true);
      consider(ox, 1.15, oz, halfW, false);
      consider(ox, 1.7, oz, 0.42, true);
    }
  }

  return best;
}

function raySphere(origin, dir, center, radius) {
  _oc.subVectors(origin, center);
  const b = _oc.dot(dir);
  const c = _oc.dot(_oc) - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0) {
    const t2 = -b + Math.sqrt(disc);
    return t2 >= 0 ? t2 : null;
  }
  return t;
}
