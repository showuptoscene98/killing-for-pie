import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createInitialGameState, getActiveWeapon } from './systems/gameState';

/** Stable refs/actions — 3D systems subscribe here so HUD ticks never remount meshes. */
const GameApiContext = createContext(null);
/** HUD snapshot store — DOM / rare UI only. */
const HudContext = createContext(null);

export function GameProvider({ children, running, bonuses }) {
  const bonusesRef = useRef(bonuses);
  bonusesRef.current = bonuses;

  const stateRef = useRef(createInitialGameState(bonuses));
  const zombiesRef = useRef([]);
  const remotesRef = useRef([]);
  const depositedRef = useRef(false);
  const hudRef = useRef(snapshotHud(stateRef.current, remotesRef.current));
  const hudListeners = useRef(new Set());

  const subscribeHud = useCallback((cb) => {
    hudListeners.current.add(cb);
    return () => hudListeners.current.delete(cb);
  }, []);

  const getHud = useCallback(() => hudRef.current, []);

  const notify = useCallback(() => {
    const next = snapshotHud(stateRef.current, remotesRef.current);
    const prev = hudRef.current;
    if (prev && hudEqual(prev, next)) return;
    hudRef.current = next;
    hudListeners.current.forEach((cb) => cb());
  }, []);

  const resetGame = useCallback(() => {
    stateRef.current = createInitialGameState(bonusesRef.current);
    zombiesRef.current = [];
    remotesRef.current = [];
    depositedRef.current = false;
    notify();
  }, [notify]);

  useEffect(() => {
    if (!running) return undefined;
    // Do NOT resetGame() here — child CoopSync inits coop on the same tick;
    // a post-child reset was wiping state.coop / isHost (broken online matches).
    // Fresh state comes from remounting GameProvider via key={session}.
    const id = setInterval(() => notify(), 200);
    return () => clearInterval(id);
  }, [running, notify]);

  // Stable forever for this provider instance — never put hud in here.
  const api = useMemo(
    () => ({
      stateRef,
      zombiesRef,
      remotesRef,
      notify,
      resetGame,
      depositedRef,
      getWeapon: () => getActiveWeapon(stateRef.current),
      subscribeHud,
      getHud,
    }),
    [notify, resetGame, subscribeHud, getHud]
  );

  return (
    <GameApiContext.Provider value={api}>
      <HudContext.Provider value={{ subscribeHud, getHud }}>
        {children}
      </HudContext.Provider>
    </GameApiContext.Provider>
  );
}

function snapshotHud(s, remotes = []) {
  const weapon = getActiveWeapon(s);
  const melee = !!weapon?.melee;
  const prompt = s.interactPrompt;
  return {
    status: s.status,
    mapId: s.mapId,
    mapRevision: s.mapRevision || 0,
    transitMode: !!s.transitMode,
    points: s.points,
    round: s.round,
    roundPhase: s.roundPhase,
    intermissionTimer: Math.ceil(s.intermissionTimer),
    hp: s.hp,
    maxHp: s.maxHp,
    weaponName: weapon?.name ?? '',
    mag: melee ? '∞' : (weapon?.mag ?? 0),
    reserve: melee ? 'FISTS' : (weapon?.reserve ?? 0),
    reloading: s.reloading,
    aiming: !!(weapon?.adsFov && (s.adsAmount || 0) > 0.45),
    interactPrompt: prompt
      ? {
          type: prompt.type || '',
          id: prompt.id || '',
          label: prompt.label || '',
        }
      : null,
    roundBanner: s.roundBanner,
    totalKills: s.totalKills,
    zombiesAlive: s.zombiesAlive,
    coop: !!s.coop,
    coopMatchOver: !!s.coopMatchOver,
    coopSpectating: !!s.coopSpectating,
    spectateName: s.spectateName || '',
    bleedoutTimer: Math.ceil(s.bleedoutTimer || 0),
    reviveProgress: Math.round((s.reviveProgress || 0) * 20) / 20,
    instaKill: Math.ceil(s.powerups?.instaKillTimer || 0),
    doublePoints: Math.ceil(s.powerups?.doublePointsTimer || 0),
    powerupBanner: s.powerups?.banner || null,
    squad: (remotes || [])
      .filter((r) => r.status !== 'spectator')
      .map((r) => ({
        id: r.id,
        name: r.name,
        hp: Math.round(r.hp || 0),
        maxHp: r.maxHp,
        status: r.status,
        bleedoutTimer: Math.ceil(r.bleedoutTimer || 0),
        reviveProgress: Math.round((r.reviveProgress || 0) * 20) / 20,
      })),
  };
}

function promptEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.type === b.type && a.id === b.id && a.label === b.label;
}

function hudEqual(a, b) {
  if (
    a.status !== b.status ||
    a.mapId !== b.mapId ||
    a.mapRevision !== b.mapRevision ||
    a.transitMode !== b.transitMode ||
    a.points !== b.points ||
    a.round !== b.round ||
    a.roundPhase !== b.roundPhase ||
    a.intermissionTimer !== b.intermissionTimer ||
    a.hp !== b.hp ||
    a.maxHp !== b.maxHp ||
    a.weaponName !== b.weaponName ||
    a.mag !== b.mag ||
    a.reserve !== b.reserve ||
    a.reloading !== b.reloading ||
    a.aiming !== b.aiming ||
    !promptEqual(a.interactPrompt, b.interactPrompt) ||
    a.roundBanner !== b.roundBanner ||
    a.totalKills !== b.totalKills ||
    a.zombiesAlive !== b.zombiesAlive ||
    a.coop !== b.coop ||
    a.coopMatchOver !== b.coopMatchOver ||
    a.coopSpectating !== b.coopSpectating ||
    a.spectateName !== b.spectateName ||
    a.bleedoutTimer !== b.bleedoutTimer ||
    a.reviveProgress !== b.reviveProgress ||
    a.instaKill !== b.instaKill ||
    a.doublePoints !== b.doublePoints ||
    a.powerupBanner !== b.powerupBanner
  ) {
    return false;
  }
  const as = a.squad || [];
  const bs = b.squad || [];
  if (as.length !== bs.length) return false;
  for (let i = 0; i < as.length; i++) {
    if (
      as[i].id !== bs[i].id ||
      as[i].hp !== bs[i].hp ||
      as[i].status !== bs[i].status ||
      as[i].name !== bs[i].name ||
      as[i].bleedoutTimer !== bs[i].bleedoutTimer ||
      as[i].reviveProgress !== bs[i].reviveProgress
    ) {
      return false;
    }
  }
  return true;
}

/** Stable game API (refs). Safe inside Canvas — does not re-render on HUD ticks. */
export function useGameApi() {
  const ctx = useContext(GameApiContext);
  if (!ctx) throw new Error('useGameApi must be used within GameProvider');
  return ctx;
}

/** HUD snapshot — DOM overlays only. Re-renders when hud values change. */
export function useHud() {
  const ctx = useContext(HudContext);
  if (!ctx) throw new Error('useHud must be used within GameProvider');
  return useSyncExternalStore(ctx.subscribeHud, ctx.getHud, ctx.getHud);
}

/**
 * Convenience: api + hud. Prefer useGameApi() in R3F trees so HUD polling
 * doesn't reconcile zombies/map/viewmodel every tick.
 */
export function useGame() {
  const api = useGameApi();
  const hud = useHud();
  return { ...api, hud };
}
