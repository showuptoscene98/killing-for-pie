const KEYBINDS_KEY = 'kfp_keybinds';

export const DEFAULT_KEYBINDS = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: 'ShiftLeft',
  crouch: 'ControlLeft',
  jump: 'Space',
  reload: 'KeyR',
  interact: 'KeyF',
  weapon1: 'Digit1',
  weapon2: 'Digit2',
  weapon3: 'Digit3',
} as const;

export type KeybindAction = keyof typeof DEFAULT_KEYBINDS;
export type Keybinds = Record<KeybindAction, string>;
export type KeybindsListener = (binds: Keybinds) => void;

export const KEYBIND_ORDER: readonly KeybindAction[] = [
  'forward',
  'back',
  'left',
  'right',
  'sprint',
  'crouch',
  'jump',
  'reload',
  'interact',
  'weapon1',
  'weapon2',
  'weapon3',
];

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  forward: 'Move Forward',
  back: 'Move Back',
  left: 'Strafe Left',
  right: 'Strafe Right',
  sprint: 'Sprint',
  crouch: 'Crouch / Slide',
  jump: 'Jump',
  reload: 'Reload',
  interact: 'Interact',
  weapon1: 'Weapon 1',
  weapon2: 'Weapon 2',
  weapon3: 'Weapon 3',
};

/** Keys that cannot be bound (system / UI) */
const BLOCKED_CODES = new Set<string>([
  'Escape',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'Tab',
  'MetaLeft',
  'MetaRight',
  'ContextMenu',
]);

const listeners = new Set<KeybindsListener>();

function readBinds(): Keybinds {
  try {
    const raw = localStorage.getItem(KEYBINDS_KEY);
    if (!raw) return { ...DEFAULT_KEYBINDS };
    const parsed = JSON.parse(raw) as Partial<Record<KeybindAction, unknown>>;
    const out: Keybinds = { ...DEFAULT_KEYBINDS };
    KEYBIND_ORDER.forEach((id) => {
      const v = parsed[id];
      if (typeof v === 'string' && v) out[id] = v;
    });
    return out;
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

/**
 * Replaced wholesale on every change rather than mutated, so the object
 * doubles as a stable `useSyncExternalStore` snapshot. Treat as read-only.
 */
let keybinds: Keybinds = readBinds();

function writeBinds(): void {
  try {
    localStorage.setItem(KEYBINDS_KEY, JSON.stringify(keybinds));
  } catch {
    /* ignore */
  }
}

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn(keybinds);
    } catch {
      /* ignore */
    }
  });
}

export function getKeybinds(): Keybinds {
  return keybinds;
}

export function getKeybind(action: KeybindAction): string {
  return keybinds[action] || DEFAULT_KEYBINDS[action];
}

export function subscribeKeybinds(fn: KeybindsListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isBlockedCode(code: string): boolean {
  return BLOCKED_CODES.has(code);
}

/** ShiftLeft/ShiftRight treated as the same for matching */
export function codesMatch(
  bound: string | null | undefined,
  pressed: string | null | undefined
): boolean {
  if (!bound || !pressed) return false;
  if (bound === pressed) return true;
  const shift = (c: string) => c === 'ShiftLeft' || c === 'ShiftRight';
  if (shift(bound) && shift(pressed)) return true;
  const ctrl = (c: string) => c === 'ControlLeft' || c === 'ControlRight';
  if (ctrl(bound) && ctrl(pressed)) return true;
  const alt = (c: string) => c === 'AltLeft' || c === 'AltRight';
  if (alt(bound) && alt(pressed)) return true;
  return false;
}

/** Find which action a code currently triggers */
export function actionForCode(code: string): KeybindAction | null {
  for (const id of KEYBIND_ORDER) {
    if (codesMatch(keybinds[id], code)) return id;
  }
  return null;
}

export interface SetKeybindResult {
  ok: boolean;
  error?: string;
  binds: Keybinds;
}

/**
 * Bind a code to an action. If another action had that code, swap.
 */
export function setKeybind(
  action: KeybindAction,
  code: string
): SetKeybindResult {
  if (!DEFAULT_KEYBINDS[action]) {
    return { ok: false, error: 'Unknown action', binds: getKeybinds() };
  }
  if (!code || isBlockedCode(code)) {
    return { ok: false, error: 'Key not allowed', binds: getKeybinds() };
  }

  const prev = keybinds[action];
  const conflict = actionForCode(code);
  const next: Keybinds = { ...keybinds, [action]: code };
  if (conflict && conflict !== action) {
    next[conflict] = prev;
  }
  keybinds = next;
  writeBinds();
  notify();
  return { ok: true, binds: getKeybinds() };
}

export function resetKeybinds(): Keybinds {
  keybinds = { ...DEFAULT_KEYBINDS };
  writeBinds();
  notify();
  return getKeybinds();
}

/** Pretty label for KeyboardEvent.code */
export function formatKeyCode(code: string | null | undefined): string {
  if (!code) return '—';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  if (code === 'Space') return 'Space';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num${code.slice(6)}`;
  if (code.startsWith('Arrow')) return code.slice(5);
  if (code === 'Mouse0') return 'LMB';
  if (code === 'Mouse1') return 'RMB';
  if (code === 'Mouse2') return 'MMB';
  return code.replace(/([A-Z])/g, ' $1').trim();
}
