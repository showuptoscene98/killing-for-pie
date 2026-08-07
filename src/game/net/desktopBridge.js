/**
 * Desktop / Steam bridge helpers for the renderer.
 * Browser builds get nulls; Electron exposes window.kfpDesktop via preload.
 */

export function getDesktopApi() {
  if (typeof window === 'undefined') return null;
  return window.kfpDesktop || null;
}

export function isDesktopApp() {
  return !!getDesktopApi()?.isDesktop;
}

/**
 * Current multiplayer transport.
 * 'lan-ws' — private-IP WebSocket relay (current)
 * 'steam'  — Steam Networking host-as-peer (future)
 */
export async function getNetBackend() {
  const api = getDesktopApi();
  if (!api?.getInfo) return 'lan-ws';
  try {
    const info = await api.getInfo();
    return info?.netBackend || 'lan-ws';
  } catch {
    return 'lan-ws';
  }
}

export async function isSteamNetworkingReady() {
  const api = getDesktopApi();
  if (!api?.steam?.isAvailable) return false;
  try {
    return !!(await api.steam.isAvailable());
  } catch {
    return false;
  }
}
