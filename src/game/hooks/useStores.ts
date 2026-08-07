import { useSyncExternalStore } from 'react';
import { getSettings, subscribeSettings, type Settings } from '../settings';
import { getKeybinds, subscribeKeybinds, type Keybinds } from '../keybinds';
import { isFullscreen, subscribeFullscreen } from '../display';

/**
 * These wrap the module-level stores with `useSyncExternalStore` instead of the
 * older subscribe-in-effect-then-setState pattern, which double-rendered on
 * mount and could miss changes fired between render and effect commit.
 */

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
}

export function useKeybinds(): Keybinds {
  return useSyncExternalStore(subscribeKeybinds, getKeybinds, getKeybinds);
}

export function useIsFullscreen(): boolean {
  return useSyncExternalStore(
    subscribeFullscreen,
    isFullscreen,
    () => false
  );
}
