import { PLAYER } from '../constants';
import { sampleSupportY } from './collision';

/**
 * Shared jump / gravity / slide for combat + hub movers.
 * Mutates state.position.y, velocityY, grounded, floorY, coyote, jumpBuffer, slide.
 */
export function stepVertical(state, dt, { jumpPressed = false, jumpHeld = false } = {}) {
  if (state.velocityY == null) state.velocityY = 0;
  if (state.grounded == null) state.grounded = true;
  if (state.coyote == null) state.coyote = 0;
  if (state.jumpBuffer == null) state.jumpBuffer = 0;

  // Jump cancels an active slide
  if (state.slide && jumpPressed) {
    state.slide = null;
    state.slideCooldown = PLAYER.slideCooldown * 0.5;
  }

  if (jumpPressed) state.jumpBuffer = PLAYER.jumpBuffer;
  else state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);

  if (state.grounded) state.coyote = PLAYER.coyoteTime;
  else state.coyote = Math.max(0, state.coyote - dt);

  const canJump = (state.grounded || state.coyote > 0) && !state.slide;
  if (state.jumpBuffer > 0 && canJump) {
    state.velocityY = PLAYER.jumpSpeed;
    state.grounded = false;
    state.coyote = 0;
    state.jumpBuffer = 0;
    state.jumpCutApplied = false;
  }

  // Variable jump — release once cuts ascent
  if (!jumpHeld && state.velocityY > 0 && !state.jumpCutApplied) {
    state.velocityY *= PLAYER.jumpCut ?? 0.52;
    state.jumpCutApplied = true;
  }
  if (jumpHeld) state.jumpCutApplied = false;

  state.velocityY -= PLAYER.gravity * dt;
  // Terminal fall speed
  const term = PLAYER.terminalVelocity ?? -28;
  if (state.velocityY < term) state.velocityY = term;

  state.position.y += state.velocityY * dt;

  let feetY = state.position.y - PLAYER.height;
  const support = sampleSupportY(
    state.position.x,
    state.position.z,
    feetY,
    state.velocityY,
    state.floorY ?? 0
  );
  state.floorY = support.floorY;

  const eyeOnFloor = state.floorY + PLAYER.height;
  if (state.velocityY <= 0 && state.position.y <= eyeOnFloor) {
    state.position.y = eyeOnFloor;
    state.velocityY = 0;
    state.grounded = true;
    state.coyote = PLAYER.coyoteTime;
  } else if (feetY > state.floorY + 0.04) {
    state.grounded = false;
  } else if (state.velocityY <= 0) {
    state.position.y = eyeOnFloor;
    state.velocityY = 0;
    state.grounded = true;
    state.coyote = PLAYER.coyoteTime;
  } else {
    // Ascending through a ceiling/deck from below — don't stick
    state.grounded = false;
  }
}

/** Horizontal move speed scale — slightly less air control for parkour feel */
export function moveSpeedScale(state, sprinting) {
  if (state.slide) return 0;
  const base = PLAYER.speed * (sprinting ? PLAYER.sprintMultiplier : 1);
  if (state.grounded) return base;
  return base * (PLAYER.airControl ?? 0.9);
}

/**
 * Start a slide if sprinting forward on the ground.
 * @returns {boolean} whether a slide began this frame
 */
export function tryStartSlide(state, { sprinting, crouchPressed, movingForward }) {
  if (!crouchPressed) return false;
  if (state.slide) return false;
  if ((state.slideCooldown || 0) > 0) return false;
  if (!state.grounded) return false;
  if (!sprinting || !movingForward) return false;

  const fx = -Math.sin(state.yaw ?? 0);
  const fz = -Math.cos(state.yaw ?? 0);
  state.slide = { t: 0, dirX: fx, dirZ: fz };
  return true;
}

/**
 * Advance slide timer / cooldown. Returns displacement for this frame, or null.
 * eyeDrop: how much to lower the camera (crouch feel).
 */
export function stepSlide(state, dt) {
  if (state.slideCooldown == null) state.slideCooldown = 0;
  if (state.slideCooldown > 0) {
    state.slideCooldown = Math.max(0, state.slideCooldown - dt);
  }

  if (!state.slide) {
    // Ease camera back up
    if (state.slideEyeDrop) {
      state.slideEyeDrop = Math.max(0, state.slideEyeDrop - dt * 4.5);
      if (state.slideEyeDrop < 0.01) state.slideEyeDrop = 0;
    }
    return null;
  }

  // Leave ground → cancel slide
  if (!state.grounded) {
    state.slide = null;
    state.slideCooldown = PLAYER.slideCooldown;
    return null;
  }

  const m = state.slide;
  m.t += dt;
  const dur = PLAYER.slideDuration;
  if (m.t >= dur) {
    state.slide = null;
    state.slideCooldown = PLAYER.slideCooldown;
    return null;
  }

  const u = m.t / dur;
  // Fast burst then hard decelerate
  const speed = PLAYER.slideSpeed * (1 - u * u * 0.85);
  state.slideEyeDrop = PLAYER.slideCrouch * Math.sin(Math.min(1, u * 3) * Math.PI * 0.5);

  const dx = m.dirX * speed * dt;
  const dz = m.dirZ * speed * dt;
  state.velocityX = m.dirX * speed;
  state.velocityZ = m.dirZ * speed;
  return { dx, dz };
}
