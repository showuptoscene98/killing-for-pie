import { POINTS, PLAYER, REVIVE } from '../constants';
import { createWeaponLoadout } from '../weapons/weaponDefs';
import { getActiveMap } from '../map/activeMap';
import { spawnOffset } from './roomCode';

export function createCoopPlayer(id, name, slotIndex, bonuses = {}) {
  const maxHp = Math.round(PLAYER.maxHp * (bonuses.hpMult || 1));
  const off = spawnOffset(slotIndex);
  const spawn = getActiveMap().PLAYER_SPAWN;
  return {
    id,
    name: name || 'Survivor',
    position: {
      x: spawn.x + off.x,
      y: PLAYER.height,
      z: spawn.z + off.z,
    },
    yaw: 0,
    pitch: 0,
    hp: maxHp,
    maxHp,
    points: POINTS.starting,
    weapons: [createWeaponLoadout('m1911')],
    activeWeapon: 0,
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    damageCooldown: 0,
    regenCooldown: 0,
    muzzleFlash: 0,
    recoilKick: 0,
    status: 'alive', // alive | downed | dead | spectator
    bleedoutTimer: 0,
    reviveProgress: 0,
    reviveTargetId: null,
    totalKills: 0,
    reloadMult: bonuses.reloadMult || 1,
    pointsMult: bonuses.pointsMult || 1,
    outfitId: bonuses.outfitId || 'chef',
    outfitColor: bonuses.outfitColor || 'default',
    outfitGender: bonuses.outfitGender || 'male',
    outfitYarmulke: !!bonuses.outfitYarmulke,
    outfitLoadout: bonuses.outfitLoadout || null,
    _semiLocked: false,
  };
}

/** Knock a coop player into the downed state (host-authoritative). */
export function knockDownPlayer(p) {
  if (!p || p.status === 'dead' || p.status === 'spectator') return;
  p.hp = 0;
  p.status = 'downed';
  p.bleedoutTimer = REVIVE.bleedoutTime;
  p.reviveProgress = 0;
  p.reviveTargetId = null;
  p.reloading = false;
  p.muzzleFlash = 0;
}

/** Bring a downed player back into the fight. */
export function revivePlayer(p) {
  if (!p || p.status !== 'downed') return;
  p.status = 'alive';
  p.hp = Math.max(1, Math.round(p.maxHp * REVIVE.reviveHpFrac));
  p.bleedoutTimer = 0;
  p.reviveProgress = 0;
  p.damageCooldown = REVIVE.invulnAfter;
  p.regenCooldown = REVIVE.invulnAfter;
}

export function snapshotPlayerNet(p) {
  const slot = p.weapons?.[p.activeWeapon];
  return {
    id: p.id,
    name: p.name,
    x: p.position.x,
    y: p.position.y,
    z: p.position.z,
    yaw: p.yaw,
    pitch: p.pitch,
    hp: p.hp,
    maxHp: p.maxHp,
    points: p.points,
    status: p.status,
    bleedoutTimer: p.status === 'downed' ? +(p.bleedoutTimer || 0).toFixed(2) : 0,
    reviveProgress: p.status === 'downed' ? +(p.reviveProgress || 0).toFixed(3) : 0,
    weapons: p.weapons,
    activeWeapon: p.activeWeapon,
    weaponId: slot?.id || 'm1911',
    mag: slot?.mag ?? 0,
    reserve: slot?.reserve ?? 0,
    reloading: !!p.reloading,
    muzzleFlash: p.muzzleFlash > 0,
    totalKills: p.totalKills || 0,
    outfitId: p.outfitId || 'chef',
    outfitColor: p.outfitColor || 'default',
    outfitGender: p.outfitGender || 'male',
    outfitYarmulke: !!p.outfitYarmulke,
    outfitLoadout: p.outfitLoadout || null,
  };
}

export function snapshotZombieNet(z) {
  return {
    id: z.id,
    x: +z.x.toFixed(2),
    z: +z.z.toFixed(2),
    y: +(z.y || 0).toFixed(2),
    yaw: +z.yaw.toFixed(3),
    hp: Math.round(z.hp),
    maxHp: z.maxHp,
    dead: !!z.dead,
    deathTimer: z.dead ? +z.deathTimer.toFixed(2) : 0,
    hitFlash: z.hitFlash > 0,
    phase: z.phase || 'chase',
    walkPhase: +(z.walkPhase || 0).toFixed(2),
    moving: !!z.moving,
    variant: z.variant || null,
    variantSeed: z.variantSeed ?? 0,
    attackT: z.attackT == null ? null : +z.attackT.toFixed(2),
    boss: !!z.boss,
    bossTheme: z.bossTheme || null,
    scale: z.scale || 1,
    radius: z.radius || 0.35,
  };
}

export function packDoors(doors) {
  const out = {};
  Object.keys(doors).forEach((id) => {
    out[id] = { open: !!doors[id].open };
  });
  return out;
}

export function packRooms(rooms) {
  const out = {};
  Object.keys(rooms).forEach((id) => {
    out[id] = { open: !!rooms[id].open };
  });
  return out;
}

export function packWindows(windows) {
  const out = {};
  Object.keys(windows).forEach((id) => {
    out[id] = { boards: windows[id].boards ?? 0 };
  });
  return out;
}
