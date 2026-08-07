import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './App.css';
import { CampProvider, useCamp } from './game/camp/CampContext';
import { CoopProvider, useCoop } from './game/net/CoopContext';
import { SocialProvider } from './game/net/SocialContext';
import { GameProvider, useGameApi, useHud } from './game/GameContext';
import GameCanvas from './game/GameCanvas';
import HUD from './game/ui/HUD';
import MainMenu from './game/ui/MainMenu';
import PlaySetup from './game/ui/PlaySetup';
import GameOver from './game/ui/GameOver';
import PauseMenu from './game/ui/PauseMenu';
import HubShell from './game/camp/HubShell';
import CoopDisconnect from './game/ui/CoopDisconnect';
import { inputState } from './game/player/PlayerControls';
import {
  setActiveMap,
  loadSavedMapId,
  DEFAULT_MAP_ID,
  HUB_MAP_ID,
  enterHubMap,
} from './game/map/activeMap';
import { transitStartMapId } from './game/systems/transitMode';
import { takePendingMatchOptions } from './game/systems/matchOptions';
import { toggleGameFullscreen } from './game/display';
import { stopMenuAmbience } from './game/audio/sound';

function PlayingShell({ onMenu, onEnterCamp, coop }) {
  const { depositedRef, stateRef, notify } = useGameApi();
  const hud = useHud();
  const { depositRun } = useCamp();
  const coopApi = useCoop();
  const [locked, setLocked] = useState(false);
  const handledDeath = useRef(false);
  const autoCampRef = useRef(false);
  /** Swallow Escape that Chromium used to exit pointer lock (avoids pause→resume flip) */
  const ignoreEscUntil = useRef(0);

  useEffect(() => {
    const syncLock = () => setLocked(!!document.pointerLockElement);
    syncLock();
    document.addEventListener('pointerlockchange', syncLock);
    return () => document.removeEventListener('pointerlockchange', syncLock);
  }, []);

  useEffect(() => {
    const pauseGame = () => {
      const state = stateRef.current;
      if (state.status !== 'playing') return;
      state.status = 'paused';
      inputState.wantsLock = false;
      document.exitPointerLock?.();
      notify();
    };

    const onKeyDown = (e) => {
      if (e.code === 'F11') {
        e.preventDefault();
        toggleGameFullscreen(document.documentElement).catch(() => {});
        return;
      }
      if (e.code !== 'Escape') return;
      if (coop && coopApi.phase === 'error') return;
      const state = stateRef.current;
      if (state.status === 'dead') return;
      e.preventDefault();
      if (performance.now() < ignoreEscUntil.current) return;
      if (state.status === 'paused') {
        state.status = 'playing';
        notify();
      } else if (state.status === 'playing') {
        pauseGame();
      }
    };

    // Escape while locked often only unlocks; treat unlock as pause so one Esc opens menu
    // (Left Alt free-cursor is intentional — do not pause)
    const onLockChange = () => {
      const isLocked = document.pointerLockElement != null;
      inputState.locked = isLocked;
      if (isLocked) return;
      if (inputState.altFreeCursor) return;
      const state = stateRef.current;
      if (state.status !== 'playing') return;
      if (state.coopSpectating) return;
      ignoreEscUntil.current = performance.now() + 250;
      pauseGame();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [stateRef, coop, coopApi.phase, notify]);

  useEffect(() => {
    if (hud.status !== 'dead') {
      handledDeath.current = false;
      autoCampRef.current = false;
      return;
    }
    const squadInPlay = hud.squad?.some(
      (p) => p.status === 'alive' || p.status === 'downed'
    );
    if (coop && !hud.coopMatchOver && (squadInPlay || hud.status === 'downed')) return;
    if (depositedRef.current || handledDeath.current) return;
    handledDeath.current = true;
    depositedRef.current = true;
    if (hud.coopSpectating) return;
    depositRun({
      points: hud.points,
      round: hud.round,
      kills: hud.totalKills,
      transitReached: stateRef.current?.transitReached || [],
    });
  }, [hud, depositRun, depositedRef, coop, stateRef]);

  const goCamp = useCallback(() => {
    // Keep the lobby alive and pull the whole squad back to camp.
    if (coop && coopApi.phase !== 'error') {
      coopApi.returnToCamp();
      return;
    }
    if (coop) coopApi.leave();
    onEnterCamp();
  }, [onEnterCamp, coop, coopApi]);

  const goMenu = useCallback(() => {
    if (coop) coopApi.leave();
    onMenu();
  }, [onMenu, coop, coopApi]);

  // After a full wipe, auto-return to camp hub (host drives the party; clients follow event)
  useEffect(() => {
    if (hud.status !== 'dead') return;
    const matchDone =
      !coop ||
      hud.coopMatchOver ||
      (!(hud.status === 'downed') &&
        !hud.squad?.some((p) => p.status === 'alive' || p.status === 'downed'));
    if (!matchDone || autoCampRef.current) return;
    autoCampRef.current = true;
    const t = setTimeout(() => {
      if (coop && !coopApi.isHost && coopApi.phase === 'playing') return;
      goCamp();
    }, 2800);
    return () => clearTimeout(t);
  }, [hud, coop, goCamp, coopApi.isHost, coopApi.phase]);

  useEffect(() => {
    if (coop && coopApi.phase === 'error') {
      document.exitPointerLock?.();
      if (stateRef.current.status === 'playing') {
        stateRef.current.status = 'paused';
      }
    }
  }, [coop, coopApi.phase, stateRef]);

  const resume = useCallback(() => {
    if (stateRef.current.status === 'paused') {
      stateRef.current.status = 'playing';
      notify();
    }
  }, [stateRef, notify]);

  if (coop && coopApi.phase === 'error') {
    return (
      <div className="play-shell">
        <GameCanvas coop={coop} />
        <CoopDisconnect message={coopApi.error} onMenu={goMenu} onCamp={goCamp} />
      </div>
    );
  }

  if (hud.status === 'dead') {
    const matchDone =
      !coop ||
      hud.coopMatchOver ||
      !hud.squad?.some((p) => p.status === 'alive' || p.status === 'downed');
    if (matchDone) {
      return (
        <GameOver
          round={hud.round}
          kills={hud.totalKills}
          points={hud.points}
          onCamp={goCamp}
          onRestart={goCamp}
          onMenu={goMenu}
        />
      );
    }
  }

  return (
    <div className="play-shell">
      <GameCanvas coop={coop} />
      <HUD />
      {!locked && hud.status === 'playing' && (
        <div className="click-hint">
          Click game to lock mouse · Hold Left Alt free cursor · F11 fullscreen
        </div>
      )}
      {hud.status === 'playing' && (
        <button
          type="button"
          className="play-fs-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleGameFullscreen(document.documentElement).catch(() => {});
          }}
          title="Toggle fullscreen (F11)"
        >
          Fullscreen
        </button>
      )}
      {coop &&
        (hud.status === 'dead' ||
          hud.status === 'downed' ||
          hud.coopSpectating) &&
        !hud.coopMatchOver && (
          <div className="coop-spectate">
            {hud.coopSpectating
              ? 'Joined mid-match · Spectating'
              : hud.status === 'downed'
                ? `Downed · bleedout ${Math.ceil(hud.bleedoutTimer || 0)}s`
                : 'You are down'}
            {hud.spectateName ? ` · ${hud.spectateName}` : ''}
            {hud.status === 'downed'
              ? ' · waiting for revive'
              : ' · [ ] cycle'}
          </div>
        )}
      {hud.status === 'paused' && (
        <PauseMenu onResume={resume} onCamp={goCamp} onMenu={goMenu} />
      )}
    </div>
  );
}

function AppRoutes() {
  const [screen, setScreen] = useState('menu'); // menu | play | playing | camp
  const [session, setSession] = useState(0);
  const [hubKey, setHubKey] = useState(0);
  const [coopMode, setCoopMode] = useState(false);
  const { bonuses, lastRun, clearLastRun } = useCamp();
  const {
    phase,
    pendingJoin,
    consumePendingJoin,
    leave,
    setMap,
    mapId: coopMapId,
  } = useCoop();
  const [joinCode, setJoinCode] = useState('');
  const [coopIntent, setCoopIntent] = useState(null); // 'host' | 'join' | 'browser' | 'friends' | null
  const [soloMapId, setSoloMapId] = useState(() => loadSavedMapId() || DEFAULT_MAP_ID);
  const [matchBonuses, setMatchBonuses] = useState(null);

  // Start Match flips phase before screen — drop hub immediately so HubCanvas
  // doesn't paint the combat map (or worse, re-enter hub) for a frame.
  const showHub = screen === 'camp' && phase !== 'playing';

  /* eslint-disable react-hooks/set-state-in-effect --
     Both of these route in response to something outside React (an invite
     arriving, or the coop session reaching 'playing') and have to run
     imperative side effects — stopping menu audio, swapping the active map —
     in the same step as the navigation. The extra render happens once per
     screen change, not per frame. */

  useEffect(() => {
    if (!pendingJoin) return;
    setJoinCode(pendingJoin);
    setCoopIntent('join');
    stopMenuAmbience();
    enterHubMap();
    setHubKey((k) => k + 1);
    setScreen('camp');
  }, [pendingJoin]);

  // Layout so screen/session/map settle before paint — avoids black flash + hub stomp
  useLayoutEffect(() => {
    if (phase !== 'playing') return;
    if (screen === 'playing' && coopMode) return;
    const opts = takePendingMatchOptions();
    const transit = opts.gameMode === 'transit';
    const mid = transit
      ? transitStartMapId()
      : coopMapId || loadSavedMapId() || DEFAULT_MAP_ID;
    if (mid && mid !== HUB_MAP_ID) setActiveMap(mid);
    clearLastRun();
    setMatchBonuses({
      ...bonuses,
      gameMode: opts.gameMode || 'classic',
      transitMode: transit,
    });
    setCoopMode(true);
    stopMenuAmbience();
    setSession((s) => s + 1);
    setScreen('playing');
  }, [phase, screen, clearLastRun, coopMode, coopMapId, bonuses]);

  // Party return-to-camp: leave the match UI but keep the co-op session in lobby
  useLayoutEffect(() => {
    if (phase !== 'lobby') return;
    if (screen !== 'playing') return;
    stopMenuAmbience();
    enterHubMap();
    setCoopMode(false);
    // Don't re-pass joinCode — session is already live; auto-join would reconnect.
    setJoinCode('');
    setCoopIntent(null);
    setHubKey((k) => k + 1);
    setScreen('camp');
  }, [phase, screen]);

  /* eslint-enable react-hooks/set-state-in-effect */

  const start = useCallback(
    (mapOverride, opts = {}) => {
      clearLastRun();
      setCoopMode(false);
      leave();
      stopMenuAmbience();
      const pending = takePendingMatchOptions();
      const gameMode = opts.gameMode || pending.gameMode || 'classic';
      const transit = gameMode === 'transit';
      const mid = transit
        ? transitStartMapId()
        : mapOverride || soloMapId || loadSavedMapId() || DEFAULT_MAP_ID;
      if (!transit) setSoloMapId(mid);
      setActiveMap(mid);
      setMatchBonuses({ ...bonuses, gameMode, transitMode: transit });
      setSession((s) => s + 1);
      setScreen('playing');
    },
    [clearLastRun, leave, soloMapId, bonuses]
  );

  const toMenu = useCallback(() => {
    leave();
    setCoopMode(false);
    setCoopIntent(null);
    setJoinCode('');
    setScreen('menu');
  }, [leave]);

  const toPlaySetup = useCallback(() => {
    setScreen('play');
  }, []);

  const toCamp = useCallback(() => {
    leave();
    setCoopMode(false);
    setCoopIntent(null);
    setJoinCode('');
    stopMenuAmbience();
    enterHubMap();
    setHubKey((k) => k + 1);
    setScreen('camp');
  }, [leave]);

  /** Co-op from Play Setup → camp hub (shared yard), not dedicated lobby screen */
  const toCoop = useCallback(
    (selectedMapId, opts = {}) => {
      const code =
        opts.code || consumePendingJoin() || joinCode || '';
      setJoinCode(code);
      setCoopIntent(opts.intent || (code ? 'join' : 'host'));
      if (selectedMapId) {
        setSoloMapId(selectedMapId);
        setMap(selectedMapId, { applyWorld: false });
      }
      stopMenuAmbience();
      enterHubMap();
      setHubKey((k) => k + 1);
      setScreen('camp');
    },
    [consumePendingJoin, joinCode, setMap]
  );

  return (
    <div className="App">
      {screen === 'menu' && (
        <MainMenu
          onPlay={toCamp}
          onCamp={toCamp}
          onPlaySetup={toPlaySetup}
          onJoinLobby={(code) => toCoop(null, { code, intent: 'join' })}
        />
      )}
      {screen === 'play' && (
        <PlaySetup
          onPlaySolo={start}
          onPlayCoop={toCoop}
          onBack={toCamp}
        />
      )}
      {showHub && (
        <HubShell
          key={hubKey}
          runSummary={lastRun}
          onDeploy={start}
          onMenu={toMenu}
          bonuses={bonuses}
          joinCode={joinCode}
          joinIntent={coopIntent}
          onJoinConsumed={() => {
            setJoinCode('');
            setCoopIntent(null);
          }}
        />
      )}
      {screen === 'playing' && (
        <GameProvider
          key={session}
          running
          bonuses={matchBonuses || bonuses}
        >
          <PlayingShell
            onMenu={toMenu}
            onEnterCamp={toCamp}
            coop={coopMode}
          />
        </GameProvider>
      )}
    </div>
  );
}

export default function App() {
  return (
    <CampProvider>
      <SocialProvider>
        <CoopProvider>
          <AppRoutes />
        </CoopProvider>
      </SocialProvider>
    </CampProvider>
  );
}
