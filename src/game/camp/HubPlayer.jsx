import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../GameContext';
import { useCamp } from './CampContext';
import { collidePlayer, buildFrameColliders } from '../systems/collision';
import {
  stepVertical,
  moveSpeedScale,
  tryStartSlide,
  stepSlide,
} from '../systems/movement';
import {
  usePlayerControls,
  consumeLook,
  consumeFlags,
  inputState,
} from '../player/PlayerControls';
import { getLookSensitivity } from '../settings';
import { requestGamePointerLock } from '../display';
import { unlockAudio } from '../audio/sound';
import { findHubInteract } from './HubInteract';

/**
 * Hub-only FPS mover — jump / slide / parkour stats for Max's quests.
 */
export default function HubPlayer({
  enabled = true,
  onInteract,
  promptRef,
}) {
  const { stateRef } = useGame();
  const { recordParkour } = useCamp();
  const { camera, gl } = useThree();
  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;
  const recordRef = useRef(recordParkour);
  recordRef.current = recordParkour;
  const wasGrounded = useRef(true);
  const lastFloorY = useRef(0);
  usePlayerControls(enabled);

  useEffect(() => {
    if (!enabled) {
      inputState.wantsLock = false;
      return undefined;
    }
    inputState.lockTarget = gl.domElement;
    if (!inputState.altFreeCursor) inputState.wantsLock = true;
    const canvas = gl.domElement;
    const onContextMenu = (e) => e.preventDefault();
    const onDown = (e) => {
      if (e.button !== 0) return;
      if (inputState.altFreeCursor) return;
      if (!inputState.wantsLock) return;
      unlockAudio();
      requestGamePointerLock(canvas);
    };
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('mousedown', onDown);
    return () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('mousedown', onDown);
      if (inputState.lockTarget === canvas) {
        inputState.lockTarget = null;
        inputState.wantsLock = false;
      }
    };
  }, [gl, enabled]);

  useFrame((_, dt) => {
    if (!enabled) return;
    const state = stateRef.current;
    if (!state || state.status !== 'playing') return;

    const clampedDt = Math.min(dt, 0.05);
    const look = consumeLook();
    const sens = getLookSensitivity();
    state.yaw -= look.dx * sens;
    state.pitch -= look.dy * sens;
    state.pitch = THREE.MathUtils.clamp(state.pitch, -1.2, 1.2);

    camera.up.set(0, 1, 0);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(state.pitch, state.yaw, 0);
    if (camera.isPerspectiveCamera && camera.fov !== 72) {
      camera.fov = 72;
      camera.updateProjectionMatrix();
    }

    const flags = consumeFlags();
    const jumpEdge = !!flags.jump || inputState.jumpPressed;
    if (inputState.jumpPressed) inputState.jumpPressed = false;
    const jumpHeld = !!inputState.keys?.space;

    const { keys } = inputState;
    let inputX = 0;
    let inputF = 0;
    if (keys.w) inputF += 1;
    if (keys.s) inputF -= 1;
    if (keys.a) inputX -= 1;
    if (keys.d) inputX += 1;

    const crouchEdge = !!flags.crouch || inputState.crouchPressed;
    if (inputState.crouchPressed) inputState.crouchPressed = false;
    const startedSlide = tryStartSlide(state, {
      sprinting: !!keys.shift,
      crouchPressed: crouchEdge,
      movingForward: inputF > 0,
    });
    if (startedSlide) {
      recordRef.current?.({ slide: true });
    }

    const colliders = buildFrameColliders([], []);
    const slideMove = stepSlide(state, clampedDt);
    if (slideMove) {
      const next = collidePlayer(
        state.position.x + slideMove.dx,
        state.position.z + slideMove.dz,
        colliders,
        state.floorY ?? 0
      );
      state.position.x = next.x;
      state.position.z = next.z;
    } else if (inputX !== 0 || inputF !== 0) {
      const len = Math.hypot(inputX, inputF);
      inputX /= len;
      inputF /= len;
      const speed = moveSpeedScale(state, keys.shift) * clampedDt;
      const forwardX = -Math.sin(state.yaw);
      const forwardZ = -Math.cos(state.yaw);
      const rightX = Math.cos(state.yaw);
      const rightZ = -Math.sin(state.yaw);
      const dx = (forwardX * inputF + rightX * inputX) * speed;
      const dz = (forwardZ * inputF + rightZ * inputX) * speed;
      const next = collidePlayer(
        state.position.x + dx,
        state.position.z + dz,
        colliders,
        state.floorY ?? 0
      );
      state.position.x = next.x;
      state.position.z = next.z;
    }

    const beforeGrounded = !!state.grounded;
    const hadCoyote = (state.coyote || 0) > 0;

    stepVertical(state, clampedDt, {
      jumpPressed: jumpEdge,
      jumpHeld: jumpHeld || jumpEdge,
    });

    // Parkour telemetry
    if (
      jumpEdge &&
      (beforeGrounded || hadCoyote) &&
      !state.slide &&
      (state.velocityY || 0) > 2
    ) {
      recordRef.current?.({ jump: true });
    }
    if (!beforeGrounded && state.grounded) {
      const fy = state.floorY ?? 0;
      if (fy >= 0.7 && fy > lastFloorY.current + 0.15) {
        recordRef.current?.({ highLand: true, floorY: fy });
      } else if (fy > (state._pkMaxReported || 0) + 0.05) {
        state._pkMaxReported = fy;
        recordRef.current?.({ floorY: fy });
      }
    }
    if (state.grounded) {
      const fy = state.floorY ?? 0;
      if (fy > (state._pkMaxReported || 0) + 0.05) {
        state._pkMaxReported = fy;
        recordRef.current?.({ floorY: fy });
      }
      lastFloorY.current = fy;
    }

    wasGrounded.current = !!state.grounded;

    const eyeDrop = state.slideEyeDrop || 0;
    camera.position.set(
      state.position.x,
      state.position.y - eyeDrop,
      state.position.z
    );

    const hit = findHubInteract(state.position.x, state.position.z);
    state.interactPrompt = hit.label
      ? { label: hit.label, type: hit.type, npcId: hit.npcId }
      : null;
    if (promptRef) promptRef.current = state.interactPrompt;

    if (flags.interact && hit.type) {
      onInteractRef.current?.(hit);
    }
  });

  return null;
}
