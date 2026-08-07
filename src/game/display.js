/** Fullscreen + pointer-lock helpers for multi-monitor FPS play */

export function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    null
  );
}

export function isFullscreen() {
  return !!getFullscreenElement();
}

export function requestGameFullscreen(el = document.documentElement) {
  const target = el || document.documentElement;
  const req =
    target.requestFullscreen?.bind(target) ||
    target.webkitRequestFullscreen?.bind(target);
  if (!req) return Promise.reject(new Error('Fullscreen unsupported'));
  return Promise.resolve(req()).catch((err) => {
    console.warn('[display] fullscreen failed', err);
    throw err;
  });
}

export function exitGameFullscreen() {
  const exit =
    document.exitFullscreen?.bind(document) ||
    document.webkitExitFullscreen?.bind(document);
  if (!exit || !isFullscreen()) return Promise.resolve();
  return Promise.resolve(exit()).catch(() => {});
}

export function toggleGameFullscreen(el = document.documentElement) {
  if (isFullscreen()) return exitGameFullscreen().then(() => false);
  return requestGameFullscreen(el).then(() => true);
}

/**
 * Request pointer lock from a real user-gesture handler (mousedown/click).
 * Calling this from rAF/useFrame often fails silently → cursor escapes to other monitors.
 */
export function requestGamePointerLock(el) {
  if (!el?.requestPointerLock) return;
  if (document.pointerLockElement === el) return;

  const tryLock = (opts) => {
    try {
      const ret = el.requestPointerLock(opts);
      if (ret && typeof ret.then === 'function') {
        return ret.catch(() => {
          if (opts) return tryLock(undefined);
          return undefined;
        });
      }
    } catch {
      if (opts) return tryLock(undefined);
    }
    return undefined;
  };

  // unadjustedMovement = raw mouse (better FPS feel); fall back if unsupported
  return tryLock({ unadjustedMovement: true });
}

export function exitGamePointerLock() {
  if (!document.pointerLockElement) return;
  try {
    document.exitPointerLock?.();
  } catch {
    /* ignore */
  }
}

export function subscribeFullscreen(fn) {
  const fire = () => fn(isFullscreen());
  document.addEventListener('fullscreenchange', fire);
  document.addEventListener('webkitfullscreenchange', fire);
  return () => {
    document.removeEventListener('fullscreenchange', fire);
    document.removeEventListener('webkitfullscreenchange', fire);
  };
}
