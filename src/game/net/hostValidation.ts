import { INTERACT_RANGE, PLAYER } from '../constants';

/**
 * The co-op host is authoritative, but until now it took whatever clients sent:
 * raw positions, arbitrary fire-ray origins, and whole interact prompts. That
 * let a modified or simply buggy client teleport, shoot from across the map, or
 * buy from a wall it was nowhere near — and a single NaN in a position poisoned
 * the host's world state, which then went out to everyone in the next snapshot.
 *
 * These are deliberately forgiving rather than strict: packets arrive late and
 * bursty, so the goal is to bound what a client can claim, not to police it to
 * the centimetre. Everything here is pure so it can be tested without a peer.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FireRayMessage {
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
}

export interface InteractPrompt {
  type?: string;
  id?: string;
}

interface MapLike {
  worldBound?: number;
  DOORS?: Array<{ id: string; position: number[] }>;
  WALLBUYS?: Array<{ id: string; position: number[] }>;
  WINDOWS?: Array<{ id: string; position: number[] }>;
  MYSTERY_BOX?: { position: number[] } | null;
}

/** A slide is the fastest legitimate movement; the margin covers camp buffs. */
const MAX_SPEED = PLAYER.slideSpeed * 1.4;
/** Absorbs a dropped packet or two without rubber-banding an honest client. */
const STEP_SLACK = 1.5;
/** Falling out of the world and flying both land outside this band. */
const MIN_Y = -6;
const MAX_Y = 14;
/** Used when a map forgets to declare its extent. */
const FALLBACK_BOUND = 40;
/** A shot has to start at the shooter's head, not at its victim's. */
const MAX_MUZZLE_DRIFT = 2.5;
/** Clients prompt from the eye at INTERACT_RANGE; this covers lag and stance. */
const INTERACT_SLACK = 2.2;

const RANGED_INTERACTS = new Set(['door', 'wallbuy', 'window', 'mystery']);

export function isFiniteVec3(v: Partial<Vec3> | null | undefined): v is Vec3 {
  return (
    !!v &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z)
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Clamp a claimed position into the map and within reach of where the player
 * already was. Returns null only when the claim is unusable (non-finite), in
 * which case the caller should keep the previous position.
 *
 * @param elapsed seconds since this peer's last accepted input
 */
export function sanitizePlayerPosition(
  prev: Partial<Vec3> | null,
  claimed: Partial<Vec3> | null,
  elapsed: number,
  worldBound?: number
): Vec3 | null {
  if (!isFiniteVec3(claimed)) return null;

  const bound =
    typeof worldBound === 'number' && worldBound > 0 ? worldBound : FALLBACK_BOUND;
  // A little past the wall line, so brushing geometry never fights the clamp.
  const limit = bound + 1.5;

  let x = clamp(claimed.x, -limit, limit);
  let y = clamp(claimed.y, MIN_Y, MAX_Y);
  let z = clamp(claimed.z, -limit, limit);

  if (isFiniteVec3(prev)) {
    const budget =
      MAX_SPEED * clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, 1) + STEP_SLACK;
    const dx = x - prev.x;
    const dy = y - prev.y;
    const dz = z - prev.z;
    const moved = Math.hypot(dx, dy, dz);
    if (moved > budget) {
      // Drag the claim back onto the edge of what was reachable instead of
      // dropping it, so a laggy client still advances toward where it thinks
      // it is rather than freezing in place.
      const k = budget / moved;
      x = prev.x + dx * k;
      y = prev.y + dy * k;
      z = prev.z + dz * k;
    }
  }

  return { x, y, z };
}

/**
 * Normalize a fire ray and pin its origin to the shooter the host is tracking.
 * Returns null for a ray that cannot produce a meaningful raycast.
 */
export function sanitizeFireRay(
  ray: Partial<FireRayMessage> | null | undefined,
  shooterPos?: Partial<Vec3> | null
): { origin: Vec3; dir: Vec3 } | null {
  if (!ray) return null;
  const origin = { x: ray.ox, y: ray.oy, z: ray.oz };
  const aim = { x: ray.dx, y: ray.dy, z: ray.dz };
  if (!isFiniteVec3(origin) || !isFiniteVec3(aim)) return null;

  const len = Math.hypot(aim.x, aim.y, aim.z);
  // THREE's normalize() quietly yields (0,0,0) here, which raycasts nothing.
  if (len < 1e-6) return null;
  const dir: Vec3 = { x: aim.x / len, y: aim.y / len, z: aim.z / len };

  let out: Vec3 = origin;
  if (isFiniteVec3(shooterPos)) {
    const drift = distance(origin, shooterPos);
    if (drift > MAX_MUZZLE_DRIFT) {
      // Keep the aim direction but move the muzzle back to the body, so a
      // client cannot originate shots behind cover or next to its target.
      const k = MAX_MUZZLE_DRIFT / drift;
      out = {
        x: shooterPos.x + (origin.x - shooterPos.x) * k,
        y: shooterPos.y + (origin.y - shooterPos.y) * k,
        z: shooterPos.z + (origin.z - shooterPos.z) * k,
      };
    }
  }

  return { origin: out, dir };
}

/** Where the map says an interactable actually is, or null if it has no such id. */
export function interactTargetPosition(
  map: MapLike | null | undefined,
  prompt: InteractPrompt | null | undefined
): Vec3 | null {
  if (!map || !prompt) return null;

  const find = (list: Array<{ id: string; position: number[] }> | undefined) =>
    list?.find((entry) => entry.id === prompt.id) ?? null;

  let position: number[] | undefined;
  if (prompt.type === 'door') position = find(map.DOORS)?.position;
  else if (prompt.type === 'wallbuy') position = find(map.WALLBUYS)?.position;
  else if (prompt.type === 'window') position = find(map.WINDOWS)?.position;
  else if (prompt.type === 'mystery') position = map.MYSTERY_BOX?.position;

  if (!position || position.length < 3) return null;
  const [x, y, z] = position as [number, number, number];
  return isFiniteVec3({ x, y, z }) ? { x, y, z } : null;
}

/**
 * Whether a player is close enough to act on a prompt it sent. Prompt types
 * this module does not own (revive, which the host validates against its own
 * downed list) pass through untouched.
 */
export function canPlayerInteract(
  map: MapLike | null | undefined,
  prompt: InteractPrompt | null | undefined,
  playerPos: Partial<Vec3> | null | undefined
): boolean {
  if (!prompt?.type) return false;
  if (!RANGED_INTERACTS.has(prompt.type)) return true;

  const target = interactTargetPosition(map, prompt);
  // A ranged interact naming something the map does not have is never valid.
  if (!target) return false;
  if (!isFiniteVec3(playerPos)) return false;

  return distance(target, playerPos) <= INTERACT_RANGE + INTERACT_SLACK;
}
