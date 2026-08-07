import { getActiveMap } from '../map/activeMap';
import { PLAYER, ROUND } from '../constants';

function overlaps(ax, az, ar, bx, bz, bw, bd) {
  const closestX = Math.max(bx - bw / 2, Math.min(ax, bx + bw / 2));
  const closestZ = Math.max(bz - bd / 2, Math.min(az, bz + bd / 2));
  const dx = ax - closestX;
  const dz = az - closestZ;
  return dx * dx + dz * dz < ar * ar;
}

function resolveCircleRect(px, pz, radius, wx, wz, ww, wd) {
  const halfW = ww / 2;
  const halfD = wd / 2;
  const closestX = Math.max(wx - halfW, Math.min(px, wx + halfW));
  const closestZ = Math.max(wz - halfD, Math.min(pz, wz + halfD));
  const dx = px - closestX;
  const dz = pz - closestZ;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius || distSq === 0) {
    if (distSq === 0) {
      const toL = px - (wx - halfW);
      const toR = wx + halfW - px;
      const toT = pz - (wz - halfD);
      const toB = wz + halfD - pz;
      const min = Math.min(toL, toR, toT, toB);
      if (min === toL) return { x: wx - halfW - radius, z: pz };
      if (min === toR) return { x: wx + halfW + radius, z: pz };
      if (min === toT) return { x: px, z: wz - halfD - radius };
      return { x: px, z: wz + halfD + radius };
    }
    return { x: px, z: pz };
  }
  const dist = Math.sqrt(distSq);
  const push = (radius - dist) / dist;
  return { x: px + dx * push, z: pz + dz * push };
}

function pointInRect(x, z, r) {
  return (
    x >= r.x - r.w / 2 &&
    x <= r.x + r.w / 2 &&
    z >= r.z - r.d / 2 &&
    z <= r.z + r.d / 2
  );
}

/** Feet Y for which this collider blocks (multi-story walls/doors/windows) */
function colliderActiveAtY(c, feetY) {
  if (c.y0 === undefined && c.y1 === undefined) return true;
  const y0 = c.y0 ?? 0;
  const y1 = c.y1 ?? y0 + (c.h ?? 99);
  return feetY >= y0 - 0.2 && feetY <= y1 - 0.35;
}

/**
 * Walkable parkour props — top Y + footprint for landing / solids.
 * Mesh sizes match MapWorld Crate / Barrel / Dumpster / Platform.
 */
const PROP_PARKOUR = {
  crate: {
    w: 1.05,
    d: 0.85,
    /** center.y is mid-box; top = cy + halfH */
    topFromCenter: 0.425,
    solidH: 0.85,
    solid: true,
  },
  barrel: {
    w: 0.78,
    d: 0.78,
    /** group origin at ground; top of drum */
    topFromBase: 1.2,
    solidH: 1.2,
    solid: true,
  },
  dumpster: {
    w: 1.8,
    d: 1.1,
    topFromBase: 1.4,
    solidH: 1.4,
    solid: true,
  },
  platform: {
    w: 1.6,
    d: 1.2,
    topFromCenter: 0.08,
    solidH: 0.16,
    solid: true,
    sizeFromProp: true,
  },
  crashedHeli: {
    /** local Z-long; yaw ~PI/2 swaps to span the south gate */
    w: 2.6,
    d: 7.6,
    topFromBase: 1.85,
    solidH: 1.85,
    solid: true,
  },
  sandbags: {
    w: 1.9,
    d: 0.55,
    topFromBase: 0.72,
    solidH: 0.72,
    solid: true,
  },
  ammoCrate: {
    w: 0.9,
    d: 0.7,
    topFromBase: 0.7,
    solidH: 0.7,
    solid: true,
  },
  tent: {
    w: 2.2,
    d: 2.6,
    topFromBase: 1.55,
    solidH: 1.55,
    solid: true,
  },
  shed: {
    w: 5.2,
    d: 3.8,
    topFromBase: 3.1,
    solidH: 3.1,
    solid: true,
  },
  barn: {
    w: 11.4,
    d: 10.4,
    topFromBase: 3.7,
    solidH: 3.7,
    solid: true,
  },
  bunkerExterior: {
    w: 11.4,
    d: 10.4,
    topFromBase: 3.55,
    solidH: 3.55,
    solid: true,
  },
  panelFlat: {
    w: 4.2,
    d: 1.8,
    topFromBase: 5.4,
    solidH: 5.4,
    solid: true,
  },
  silo: {
    w: 2.8,
    d: 2.8,
    topFromBase: 6.4,
    solidH: 6.4,
    solid: true,
  },
  marketStall: {
    w: 2.6,
    d: 1.2,
    topFromBase: 1.65,
    solidH: 1.65,
    solid: true,
  },
  kiosk: {
    w: 1.7,
    d: 1.35,
    topFromBase: 1.85,
    solidH: 1.85,
    solid: true,
  },
  hayBale: {
    w: 1.1,
    d: 1.1,
    topFromBase: 1.1,
    solidH: 1.1,
    solid: true,
  },
  tractor: {
    w: 2.0,
    d: 2.4,
    topFromBase: 1.7,
    solidH: 1.7,
    solid: true,
  },
  tramStop: {
    w: 2.0,
    d: 1.0,
    topFromBase: 0.9,
    solidH: 0.9,
    solid: true,
  },
};

function propYawSwap(yaw) {
  if (yaw == null) return false;
  const a = Math.abs(((yaw % Math.PI) + Math.PI) % Math.PI);
  return a > Math.PI * 0.25 && a < Math.PI * 0.75;
}

function propToSurface(p, i) {
  const def = PROP_PARKOUR[p.type];
  if (!def || p.parkour === false) return null;
  const pos = p.position || [0, 0, 0];
  let w = p.w ?? def.w;
  let d = p.d ?? def.d;
  let halfH = def.topFromCenter ?? null;
  if (def.sizeFromProp && p.size) {
    w = p.size[0] ?? w;
    d = p.size[2] ?? d;
    halfH = (p.size[1] ?? 0.16) / 2;
  }
  if (propYawSwap(p.yaw)) {
    const t = w;
    w = d;
    d = t;
  }
  let y;
  let y0;
  if (halfH != null) {
    y = pos[1] + (p.topOffset ?? halfH);
    y0 = pos[1] - halfH;
  } else {
    y = pos[1] + (p.topOffset ?? def.topFromBase);
    y0 = pos[1];
  }
  return {
    id: `prop_${p.type}_${i}`,
    x: pos[0],
    z: pos[2],
    w,
    d,
    y,
    y0,
    solid: def.solid !== false && p.solid !== false,
    solidH: y - y0,
  };
}

let parkourCache = null;
let parkourCacheMap = null;

function getParkourSurfaces() {
  const map = getActiveMap();
  if (parkourCache && parkourCacheMap === map) return parkourCache;
  parkourCacheMap = map;
  const list = [];
  const props = map.props || [];
  for (let i = 0; i < props.length; i++) {
    const s = propToSurface(props[i], i);
    if (s) list.push(s);
  }
  const extras = map.PARKOUR || [];
  for (let i = 0; i < extras.length; i++) {
    const p = extras[i];
    list.push({
      id: `parkour_${i}`,
      x: p.x,
      z: p.z,
      w: p.w,
      d: p.d,
      y: p.y,
      y0: p.y0 ?? p.y - (p.h ?? 0.2),
      solid: p.solid !== false,
      solidH: (p.h ?? p.y - (p.y0 ?? p.y - 0.2)),
    });
  }
  parkourCache = list;
  return list;
}

/** Invalidate when hot-reloading maps in dev */
export function clearCollisionCache() {
  parkourCache = null;
  parkourCacheMap = null;
  wallCache = null;
  wallCacheMap = null;
}

function collectSurfacesAt(x, z) {
  const map = getActiveMap();
  const base = map.FLOOR_Y ?? 0;
  const out = [{ x: 0, z: 0, w: 999, d: 999, y: base, infinite: true }];

  const stairs = map.STAIRS;
  if (stairs) {
    for (let i = 0; i < stairs.length; i++) {
      const s = stairs[i];
      if (!pointInRect(x, z, s)) continue;
      const axis = s.axis || 'z';
      const span = axis === 'z' ? s.d : s.w;
      const center = axis === 'z' ? s.z : s.x;
      const pos = axis === 'z' ? z : x;
      let t = (pos - (center - span / 2)) / span;
      if (s.dir === -1) t = 1 - t;
      t = Math.max(0, Math.min(1, t));
      out.push({ ...s, y: s.y0 + (s.y1 - s.y0) * t, stair: true });
    }
  }

  const decks = map.WALK_FLOORS;
  if (decks) {
    for (let i = 0; i < decks.length; i++) {
      const f = decks[i];
      if (pointInRect(x, z, f)) out.push(f);
    }
  }

  const props = getParkourSurfaces();
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    if (pointInRect(x, z, p)) out.push(p);
  }

  return out;
}

/**
 * Walkable height at (x,z). Stairs first; then decks near prevY.
 * Ground default is map.FLOOR_Y — upper decks only snap when already elevated.
 * @deprecated prefer sampleSupportY for player; kept for zombies/entities
 */
export function sampleFloorY(x, z, prevY = 0) {
  const surfaces = collectSurfacesAt(x, z);
  const map = getActiveMap();
  const base = map.FLOOR_Y ?? 0;

  // Prefer walk decks / props near prevY over stairs when elevated
  let bestY = base;
  let bestDist = Math.abs(prevY - base);
  let stairY = null;

  for (let i = 0; i < surfaces.length; i++) {
    const f = surfaces[i];
    if (f.infinite) continue;
    const fy = f.y ?? 0;
    if (f.stair) {
      stairY = fy;
      continue;
    }
    const dist = Math.abs(prevY - fy);
    const maxSnap = f.solidH != null && f.solidH < 2.5 ? 1.6 : 1.35;
    if (dist < maxSnap && dist <= bestDist) {
      bestDist = dist;
      bestY = fy;
    }
  }

  if (stairY != null) {
    const stairDist = Math.abs(prevY - stairY);
    // Use stairs only when closer than deck (or no deck nearby)
    if (bestY === base || stairDist + 0.08 < bestDist) {
      return stairY;
    }
  }

  return bestY;
}

/**
 * Walkable height at (x,z) while airborne — highest surface at or below feet.
 * Used so floorY doesn't drop to ground mid-jump above a deck.
 */
export function sampleSupportY(x, z, feetY, velocityY = 0, prevFloorY = 0) {
  const surfaces = collectSurfacesAt(x, z);
  const stepUp = PLAYER.stepUp ?? 0.45;
  const landGrace = prevFloorY > 1 ? 1.15 : 0.65;
  let bestStand = -Infinity;
  let bestBelow = -Infinity;
  let bestStair = null;

  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    const fy = s.y ?? 0;
    if (s.stair) {
      // Only treat as stair support when feet are near the ramp surface
      if (Math.abs(feetY - fy) <= 1.15 || (feetY >= fy - 0.2 && feetY <= fy + stepUp)) {
        bestStair = fy;
      }
      continue;
    }
    if (s.infinite) {
      if (fy <= feetY + stepUp && fy > bestBelow) bestBelow = fy;
      if (feetY <= fy + stepUp && fy > bestStand) bestStand = fy;
      continue;
    }
    // Stand / step-up
    if (feetY >= fy - 0.08 && feetY <= fy + stepUp) {
      if (fy > bestStand) bestStand = fy;
    }
    // Landing while falling
    if (velocityY <= 0.35 && feetY >= fy && feetY <= fy + landGrace) {
      if (fy > bestStand) bestStand = fy;
    }
    // Track surface under feet for airborne floorY reference
    if (fy <= feetY + 0.12 && fy > bestBelow) bestBelow = fy;
  }

  // Elevated decks beat stairs only when already upstairs (near that deck).
  // Never let ground (y≈0) win over a stair ramp — that blocks walking up.
  if (bestStand > -Infinity && bestStair != null && bestStand > 0.85) {
    if (bestStand >= bestStair - 0.05 && feetY >= bestStand - 0.2) {
      return {
        floorY: bestStand,
        supported: feetY <= bestStand + stepUp + 0.08 && velocityY <= 1.2,
      };
    }
    if (Math.abs(feetY - bestStand) + 0.05 <= Math.abs(feetY - bestStair)) {
      return {
        floorY: bestStand,
        supported: feetY <= bestStand + stepUp + 0.08 && velocityY <= 1.2,
      };
    }
  }

  if (bestStair != null) {
    // Stick to ramp; allow step-up onto it from below
    const onRamp =
      Math.abs(feetY - bestStair) <= 1.15 ||
      (feetY >= bestStair - 0.2 && feetY <= bestStair + stepUp);
    return { floorY: bestStair, supported: onRamp && velocityY <= 1.2 };
  }

  if (bestStand > -Infinity) {
    return {
      floorY: bestStand,
      supported: feetY <= bestStand + stepUp + 0.08 && velocityY <= 1.2,
    };
  }

  // Hysteresis: keep elevated floor while feet still near it (tiny XZ gaps)
  if (
    prevFloorY > 0.85 &&
    feetY >= prevFloorY - 0.12 &&
    feetY <= prevFloorY + stepUp + 0.15
  ) {
    for (let i = 0; i < surfaces.length; i++) {
      const s = surfaces[i];
      if (s.infinite || s.stair) continue;
      const fy = s.y ?? 0;
      if (Math.abs(fy - prevFloorY) < 0.2) {
        return {
          floorY: fy,
          supported: velocityY <= 1.2,
        };
      }
    }
  }

  if (bestBelow > -Infinity) {
    return { floorY: bestBelow, supported: false };
  }

  const map = getActiveMap();
  const base = map.FLOOR_Y ?? 0;
  return { floorY: base, supported: feetY <= base + 0.1 };
}

let wallCache = null;
let wallCacheMap = null;

/** Static wall AABBs — rebuilt only when active map changes */
export function getWallColliders() {
  const map = getActiveMap();
  if (wallCache && wallCacheMap === map) return wallCache;
  wallCacheMap = map;
  const defaultH = map.WALL_HEIGHT;
  wallCache = map.WALLS.map((w, i) => {
    const y0 = w.y ?? 0;
    const h = w.h ?? defaultH;
    return {
      id: `wall_${i}`,
      x: w.x,
      z: w.z,
      w: w.w,
      d: w.d,
      y0,
      y1: y0 + h,
    };
  });

  // Solid sides of parkour props (crates, barrels, etc.)
  const props = getParkourSurfaces();
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    if (!p.solid) continue;
    wallCache.push({
      id: p.id,
      x: p.x,
      z: p.z,
      w: p.w * 0.92,
      d: p.d * 0.92,
      y0: p.y0 ?? 0,
      y1: p.y,
    });
  }
  return wallCache;
}

/** One list per frame: walls + closed doors + boarded windows */
export function buildFrameColliders(closedDoors = [], boardedWindows = []) {
  const walls = getWallColliders();
  const out = walls.slice();
  for (let i = 0; i < closedDoors.length; i++) {
    const d = closedDoors[i];
    out.push({
      id: d.id,
      x: d.x,
      z: d.z,
      w: d.w,
      d: d.d,
      y0: d.y0,
      y1: d.y1,
    });
  }
  for (let i = 0; i < boardedWindows.length; i++) {
    const w = boardedWindows[i];
    out.push({
      id: w.id,
      x: w.x,
      z: w.z,
      w: w.w,
      d: w.d,
      y0: w.y0,
      y1: w.y1,
    });
  }
  return out;
}

/** @deprecated prefer buildFrameColliders once per frame */
export function getAllColliders(closedDoors = [], boardedWindows = []) {
  return buildFrameColliders(closedDoors, boardedWindows);
}

function resolveAgainst(px, pz, radius, colliders, feetY = 0) {
  let x = px;
  let z = pz;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (!colliderActiveAtY(c, feetY)) continue;
    if (overlaps(x, z, radius, c.x, c.z, c.w, c.d)) {
      const resolved = resolveCircleRect(x, z, radius, c.x, c.z, c.w, c.d);
      x = resolved.x;
      z = resolved.z;
    }
  }
  const bound = getActiveMap().worldBound ?? 13.5;
  x = Math.max(-bound, Math.min(bound, x));
  z = Math.max(-bound, Math.min(bound, z));
  return { x, z };
}

/** colliders = prebuilt list from buildFrameColliders; feetY = walk height */
export function collidePlayer(x, z, colliders = [], feetY = 0) {
  return resolveAgainst(x, z, PLAYER.radius, colliders, feetY);
}

export function collideEntity(x, z, radius, colliders = [], feetY = 0) {
  const pos = resolveAgainst(x, z, radius, colliders, feetY);
  return { x: pos.x, z: pos.z, y: sampleFloorY(pos.x, pos.z, feetY) };
}

/**
 * Solid body collision vs boss zombies. Mutates boss xz when pushBoss is true.
 * Returns the resolved player xz.
 */
export function separateFromBossZombies(
  px,
  pz,
  zombies,
  {
    playerRadius = PLAYER.radius,
    playerFeetY = 0,
    pushBoss = true,
  } = {}
) {
  let x = px;
  let z = pz;
  if (!zombies?.length) return { x, z };

  for (let i = 0; i < zombies.length; i++) {
    const boss = zombies[i];
    if (!boss || !boss.boss || boss.dead) continue;
    if (boss.phase && boss.phase !== 'chase') continue;
    if (Math.abs((boss.y || 0) - playerFeetY) > 1.25) continue;

    const br = boss.radius || ROUND.bossRadius;
    const minDist = playerRadius + br;
    const dx = x - boss.x;
    const dz = z - boss.z;
    const dist = Math.hypot(dx, dz);
    if (dist >= minDist) continue;

    if (dist < 1e-4) {
      const a = (boss.id || 0) * 2.399;
      const nx = Math.cos(a);
      const nz = Math.sin(a);
      x = boss.x + nx * minDist;
      z = boss.z + nz * minDist;
      continue;
    }

    const push = minDist - dist;
    const nx = dx / dist;
    const nz = dz / dist;
    // Player takes most of the shove so bosses feel like solid walls
    const playerShare = pushBoss ? 0.72 : 1;
    x += nx * push * playerShare;
    z += nz * push * playerShare;
    if (pushBoss) {
      boss.x -= nx * push * (1 - playerShare);
      boss.z -= nz * push * (1 - playerShare);
    }
  }

  return { x, z };
}
