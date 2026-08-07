/** Private / non-publicly-routable IPv4 helpers (LAN-only coop). */

export const COOP_PORT = 27541;

export function isPrivateIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const cleaned = ip.trim().replace(/^\[|\]$/g, '').replace(/^::ffff:/i, '');
  if (cleaned === '127.0.0.1' || cleaned === 'localhost') return true;
  const m = cleaned.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127) return true;
  return false;
}

/**
 * Parse "192.168.1.5:27541" or "192.168.1.5"
 * Rejects public / non-private IPs (non-attackable policy).
 */
export function parseJoinAddress(raw) {
  if (!raw) return { ok: false, error: 'Enter host IP (e.g. 192.168.1.12)' };
  let text = String(raw).trim();
  text = text.replace(/^https?:\/\//i, '');
  text = text.replace(/^ws:\/\//i, '');
  text = text.split('/')[0];

  let host = text;
  let port = COOP_PORT;

  const idx = text.lastIndexOf(':');
  if (idx > -1) {
    const maybePort = text.slice(idx + 1);
    if (/^\d+$/.test(maybePort)) {
      host = text.slice(0, idx);
      port = Number(maybePort);
    }
  }

  host = host.trim().toLowerCase();
  if (host === 'localhost') host = '127.0.0.1';

  if (!isPrivateIPv4(host)) {
    return {
      ok: false,
      error:
        'Only private LAN IPs allowed (10.x / 172.16–31.x / 192.168.x / 127.0.0.1) — public IPs blocked',
    };
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { ok: false, error: 'Invalid port' };
  }

  return {
    ok: true,
    host,
    port,
    display: `${host}:${port}`,
    wsUrl: `ws://${host}:${port}`,
  };
}

export function defaultHostWsUrl() {
  return `ws://127.0.0.1:${COOP_PORT}`;
}
