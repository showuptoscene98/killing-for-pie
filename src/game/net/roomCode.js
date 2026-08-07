const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const MAX_COOP_PLAYERS = 4;

/** PeerJS peer id prefix — must stay alphanumeric. */
export const PEER_ID_PREFIX = 'kfp';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(raw) {
  if (!raw) return '';
  let text = String(raw).trim().toUpperCase();
  // Accept full invite URLs
  try {
    if (/^https?:\/\//i.test(text) || text.includes('?coop=')) {
      const url = new URL(
        text.includes('://') ? text : `https://dummy.local${text.startsWith('/') ? '' : '/'}${text}`
      );
      const q = url.searchParams.get('coop');
      if (q) text = q;
    }
  } catch (_) {
    /* fall through */
  }
  text = text.replace(/^KFP[-_]?/i, '');
  text = text.replace(/[^A-Z0-9]/g, '');
  return text.slice(0, 8);
}

export function isRoomCode(raw) {
  const code = normalizeRoomCode(raw);
  return code.length >= 4 && code.length <= 8;
}

export function peerIdFromRoomCode(code) {
  return `${PEER_ID_PREFIX}${normalizeRoomCode(code)}`;
}

export function roomCodeFromPeerId(peerId) {
  const id = String(peerId || '');
  if (id.toLowerCase().startsWith(PEER_ID_PREFIX)) {
    return id.slice(PEER_ID_PREFIX.length).toUpperCase();
  }
  return id.toUpperCase();
}

export function buildInviteUrl(roomCode) {
  const code = normalizeRoomCode(roomCode);
  if (!code || typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('coop', code);
  url.hash = '';
  return url.toString();
}

export function randomPlayerName() {
  const tags = ['Rifle', 'Breach', 'Surge', 'Ash', 'Bolt', 'Wraith', 'Pike', 'Nova'];
  const n = Math.floor(Math.random() * 90) + 10;
  return `${tags[Math.floor(Math.random() * tags.length)]}-${n}`;
}

export function spawnOffset(index) {
  const offsets = [
    { x: 0, z: 0 },
    { x: -1.2, z: 0.4 },
    { x: 1.2, z: 0.4 },
    { x: 0, z: 1.1 },
  ];
  return offsets[index % offsets.length];
}

export function readInviteFromUrl() {
  if (typeof window === 'undefined') return '';
  try {
    const url = new URL(window.location.href);
    return normalizeRoomCode(url.searchParams.get('coop') || '');
  } catch {
    return '';
  }
}

export function clearInviteFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('coop')) return;
  url.searchParams.delete('coop');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}
