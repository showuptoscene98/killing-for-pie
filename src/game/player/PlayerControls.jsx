import { useEffect, useRef } from 'react';
import { getKeybinds, codesMatch } from '../keybinds';
import { requestGamePointerLock, exitGamePointerLock } from '../display';

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
  ctrl: false,
  space: false,
  r: false,
  f: false,
  digit1: false,
  digit2: false,
  digit3: false,
  bracketLeft: false,
  bracketRight: false,
  arrowLeft: false,
  arrowRight: false,
};

export const inputState = {
  keys,
  mouseDown: false,
  mouseRight: false,
  dx: 0,
  dy: 0,
  locked: false,
  interactPressed: false,
  reloadPressed: false,
  jumpPressed: false,
  crouchPressed: false,
  swap1: false,
  swap2: false,
  swap3: false,
  swapNext: false,
  swapPrev: false,
  /** Canvas element to re-lock against while playing */
  lockTarget: null,
  wantsLock: false,
  /** Hold Left Alt → free cursor (do not pause on unlock) */
  altFreeCursor: false,
};

function applyCode(code, down, isRepeat) {
  const binds = getKeybinds();

  if (codesMatch(binds.forward, code)) keys.w = down;
  if (codesMatch(binds.back, code)) keys.s = down;
  if (codesMatch(binds.left, code)) keys.a = down;
  if (codesMatch(binds.right, code)) keys.d = down;
  if (codesMatch(binds.sprint, code)) keys.shift = down;

  if (codesMatch(binds.crouch, code)) {
    keys.ctrl = down;
    if (down && !isRepeat) inputState.crouchPressed = true;
  }

  if (codesMatch(binds.jump, code)) {
    keys.space = down;
    if (down && !isRepeat) inputState.jumpPressed = true;
  }

  if (codesMatch(binds.interact, code)) {
    keys.f = down;
    if (down && !isRepeat) inputState.interactPressed = true;
  }
  if (codesMatch(binds.reload, code) && down && !isRepeat) {
    inputState.reloadPressed = true;
  }
  if (codesMatch(binds.weapon1, code) && down && !isRepeat) {
    inputState.swap1 = true;
  }
  if (codesMatch(binds.weapon2, code) && down && !isRepeat) {
    inputState.swap2 = true;
  }
  if (codesMatch(binds.weapon3, code) && down && !isRepeat) {
    inputState.swap3 = true;
  }

  // Spectate cycle (fixed keys — not remappable)
  if (code === 'BracketLeft' || code === 'Comma') keys.bracketLeft = down;
  if (code === 'BracketRight' || code === 'Period') keys.bracketRight = down;
  if (code === 'ArrowLeft') keys.arrowLeft = down;
  if (code === 'ArrowRight') keys.arrowRight = down;
}

export function usePlayerControls(enabled) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (e) => {
      // Hold Left Alt = free the cursor without pausing / opening menus
      if (e.code === 'AltLeft') {
        e.preventDefault();
        if (!e.repeat) {
          inputState.altFreeCursor = true;
          inputState.wantsLock = false;
          exitGamePointerLock();
          inputState.locked = false;
        }
        return;
      }
      applyCode(e.code, true, e.repeat);
      if (e.code === 'Space' && inputState.wantsLock) e.preventDefault();
    };

    const onKeyUp = (e) => {
      if (e.code === 'AltLeft') {
        e.preventDefault();
        inputState.altFreeCursor = false;
        // Re-enable lock intent; next click re-locks (gesture required)
        if (enabledRef.current) inputState.wantsLock = true;
        return;
      }
      applyCode(e.code, false, false);
    };

    const onMouseDown = (e) => {
      if (e.button === 0) inputState.mouseDown = true;
      if (e.button === 2) {
        inputState.mouseRight = true;
        e.preventDefault();
      }
      // Must request lock inside the user-gesture handler (not useFrame)
      if (inputState.altFreeCursor) return;
      if (!inputState.wantsLock || e.button !== 0) return;
      // Overlay / menu clicks must not re-engage pointer lock (eats the click)
      const el = e.target;
      if (
        el &&
        typeof el.closest === 'function' &&
        el.closest(
          'button, a, input, textarea, select, label, .screen, .hub-esc-menu, .hub-deploy-overlay, .quest-log-overlay, .dialogue-overlay, .menu-content, .settings-overlay, .settings-panel, [role="dialog"]'
        )
      ) {
        return;
      }
      const target = inputState.lockTarget || el;
      if (target?.requestPointerLock) {
        requestGamePointerLock(target);
      }
    };
    const onMouseUp = (e) => {
      if (e.button === 0) inputState.mouseDown = false;
      if (e.button === 2) inputState.mouseRight = false;
    };

    // Pointer events: more reliable RMB under pointer-lock (esp. Electron)
    const onPointerDown = (e) => {
      if (e.button === 2) {
        inputState.mouseRight = true;
        e.preventDefault();
      }
    };
    const onPointerUp = (e) => {
      if (e.button === 2) inputState.mouseRight = false;
    };

    const onContextMenu = (e) => {
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!inputState.locked) return;
      // Cap insane deltas from multi-monitor edge jumps if lock blips
      const dx = Math.max(-80, Math.min(80, e.movementX || 0));
      const dy = Math.max(-80, Math.min(80, e.movementY || 0));
      inputState.dx += dx;
      inputState.dy += dy;
    };

    const onWheel = (e) => {
      if (!inputState.locked) return;
      e.preventDefault();
      if (e.deltaY > 0) inputState.swapNext = true;
      else if (e.deltaY < 0) inputState.swapPrev = true;
    };

    const onLockChange = () => {
      inputState.locked = document.pointerLockElement != null;
    };

    const onLockError = () => {
      inputState.locked = false;
    };

    // Clear held keys if window blurs mid-press
    const onBlur = () => {
      Object.keys(keys).forEach((k) => {
        keys[k] = false;
      });
      inputState.mouseDown = false;
      inputState.mouseRight = false;
    };

    // If focus returns while playing, next click re-locks (handled in mousedown)
    const onFocus = () => {
      /* lock needs a gesture — click-hint covers this */
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('pointerlockerror', onLockError);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('pointerlockerror', onLockError);
      Object.keys(keys).forEach((k) => {
        keys[k] = false;
      });
      inputState.mouseDown = false;
      inputState.mouseRight = false;
      inputState.swapNext = false;
      inputState.swapPrev = false;
      inputState.wantsLock = false;
    };
  }, [enabled]);

  return inputState;
}

export function consumeLook() {
  const { dx, dy } = inputState;
  inputState.dx = 0;
  inputState.dy = 0;
  return { dx, dy };
}

export function consumeFlags() {
  const flags = {
    interact: inputState.interactPressed,
    reload: inputState.reloadPressed,
    jump: inputState.jumpPressed,
    crouch: inputState.crouchPressed,
    swap1: inputState.swap1,
    swap2: inputState.swap2,
    swap3: inputState.swap3,
    swapNext: inputState.swapNext,
    swapPrev: inputState.swapPrev,
  };
  inputState.interactPressed = false;
  inputState.reloadPressed = false;
  inputState.jumpPressed = false;
  inputState.crouchPressed = false;
  inputState.swap1 = false;
  inputState.swap2 = false;
  inputState.swap3 = false;
  inputState.swapNext = false;
  inputState.swapPrev = false;
  return flags;
}
