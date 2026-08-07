import * as THREE from 'three';
import { inputState } from './PlayerControls';

const _behind = new THREE.Vector3();
const _look = new THREE.Vector3();

/** Living teammates to follow (3rd person). */
export function livingSpectateTargets(remotesRef) {
  const out = [];
  const list = remotesRef?.current || [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r && r.status === 'alive') out.push(r);
  }
  return out;
}

export function isSpectating(state) {
  if (!state?.coop || state.coopMatchOver) return false;
  return (
    !!state.coopSpectating ||
    state.status === 'dead' ||
    state.status === 'downed'
  );
}

/**
 * 3rd-person follow cam behind a living teammate.
 * [ / ] (or ← / →) cycle targets.
 */
export function updateSpectateCamera(state, remotesRef, camera, dt) {
  const targets = livingSpectateTargets(remotesRef);
  if (!targets.length) {
    state.spectateName = '';
    return false;
  }

  const keys = inputState.keys || {};
  const cycle =
    !!keys.spectateNext ||
    !!keys.spectatePrev ||
    !!keys.bracketRight ||
    !!keys.bracketLeft ||
    !!keys.arrowRight ||
    !!keys.arrowLeft;

  // Edge-detect via latch on state
  if (cycle && !state._spectateCycleLatch) {
    state._spectateCycleLatch = true;
    const dir =
      keys.spectatePrev || keys.bracketLeft || keys.arrowLeft ? -1 : 1;
    state.spectateIndex = (state.spectateIndex || 0) + dir;
  } else if (!cycle) {
    state._spectateCycleLatch = false;
  }

  let idx = state.spectateIndex || 0;
  idx = ((idx % targets.length) + targets.length) % targets.length;
  state.spectateIndex = idx;
  const t = targets[idx];
  state.spectateName = t.name || 'Survivor';

  const dist = 3.4;
  const height = 2.15;
  const yaw = t.yaw || 0;
  // Behind look direction (forward = -sin/-cos in this game)
  _behind.set(
    t.x + Math.sin(yaw) * dist,
    height,
    t.z + Math.cos(yaw) * dist
  );
  _look.set(t.x, 1.35, t.z);

  const blend = 1 - Math.exp(-dt * 7);
  camera.position.lerp(_behind, blend);
  camera.up.set(0, 1, 0);
  camera.lookAt(_look);
  // Widen FOV slightly for spectator (restore on exit is optional — match ends soon)
  if (camera.isPerspectiveCamera && camera.fov < 78) {
    camera.fov = 82;
    camera.updateProjectionMatrix();
  }
  return true;
}
