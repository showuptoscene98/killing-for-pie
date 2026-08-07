/** One-shot options for the next combat session (solo deploy or coop Start Match). */

let pending = { gameMode: 'classic' };

export function setPendingMatchOptions(opts = {}) {
  pending = {
    gameMode: opts.gameMode || 'classic',
  };
}

export function takePendingMatchOptions() {
  const next = { ...pending };
  pending = { gameMode: 'classic' };
  return next;
}

export function peekPendingMatchOptions() {
  return { ...pending };
}
