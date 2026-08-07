/** Angle lerp that takes the short way around the circle. */
export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/**
 * Exponential catch-up toward a networked pose. Teleports on large gaps so
 * respawns / hard corrections don't smear across the map.
 */
export function smoothToward(state, target, dt, { rate = 14, snapDist = 6 } = {}) {
  if (!state.init || state.id !== target.id) {
    state.init = true;
    state.id = target.id;
    state.x = target.x;
    state.y = target.y;
    state.z = target.z;
    state.yaw = target.yaw;
    return state;
  }
  const jump = Math.hypot(target.x - state.x, target.z - state.z);
  if (jump > snapDist) {
    state.x = target.x;
    state.y = target.y;
    state.z = target.z;
    state.yaw = target.yaw;
    return state;
  }
  const a = 1 - Math.exp(-Math.max(0, dt) * rate);
  state.x += (target.x - state.x) * a;
  state.y += (target.y - state.y) * a;
  state.z += (target.z - state.z) * a;
  state.yaw = lerpAngle(state.yaw, target.yaw, a);
  return state;
}
