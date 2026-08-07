/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Bridge exposed by electron/preload.js; absent in the browser build. */
interface KfpDesktopBridge {
  isDesktop?: boolean;
  platform?: string;
  version?: string;
  steamId?: string | null;
  lanRelayPort?: number | null;
}

interface Window {
  kfpDesktop?: KfpDesktopBridge;
}
