import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createInitialGameState, getActiveWeapon } from './systems/gameState';

const GameContext = createContext(null);

export function GameProvider({ children, running, bonuses }) {
  const bonusesRef = useRef(bonuses);
  bonusesRef.current = bonuses;

  const stateRef = useRef(createInitialGameState(bonuses));
  const zombiesRef = useRef([]);
  const remotesRef = useRef([]);
  const [hud, setHud] = useState(() => snapshotHud(stateRef.current, remotesRef.current));
  const depositedRef = useRef(false);

  const hudRef = useRef(null);

  const notify = useCallback(() => {
    const next = snapshotHud(stateRef.current, remotesRef.current);
    const prev = hudRef.current;
    if (prev && hudEqual(prev, next)) return;
    hudRef.current = next;
    setHud(next);
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
    const id = setInterval(() => notify(), 150);
    return () => clearInterval(id);
  }, [running, notify]);

  const value = useMemo(
    () => ({
      stateRef,
      zombiesRef,
      remotesRef,
      hud,
      notify,
      resetGame,
      depositedRef,
      getWeapon: () => getActiveWeapon(stateRef.current),
    }),
    [hud, notify, resetGame]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function snapshotHud(s, remotes = []) {
  const weapon = getActiveWeapon(s);
  const melee = !!weapon?.melee;
  return {
    status: s.status,
    mapId: s.mapId,
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
    interactPrompt: s.interactPrompt,
    roundBanner: s.roundBanner,
    totalKills: s.totalKills,
    zombiesAlive: s.zombiesAlive,
    coop: !!s.coop,
    coopMatchOver: !!s.coopMatchOver,
    coopSpectating: !!s.coopSpectating,
    spectateName: s.spectateName || '',
    bleedoutTimer: s.bleedoutTimer || 0,
    reviveProgress: s.reviveProgress || 0,
    instaKill: Math.ceil(s.powerups?.instaKillTimer || 0),
    doublePoints: Math.ceil(s.powerups?.doublePointsTimer || 0),
    powerupBanner: s.powerups?.banner || null,
    squad: (remotes || [])
      .filter((r) => r.status !== 'spectator')
      .map((r) => ({
        id: r.id,
        name: r.name,
        hp: r.hp,
        maxHp: r.maxHp,
        status: r.status,
        bleedoutTimer: r.bleedoutTimer || 0,
        reviveProgress: r.reviveProgress || 0,
      })),
  };
}

function hudEqual(a, b) {
  if (
    a.status !== b.status ||
    a.mapId !== b.mapId ||
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
    a.interactPrompt !== b.interactPrompt ||
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

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
