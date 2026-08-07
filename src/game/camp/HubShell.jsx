import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCamp } from './CampContext';
import { GameProvider, useGame } from '../GameContext';
import { useCoop } from '../net/CoopContext';
import { isRoomCode, MAX_COOP_PLAYERS, normalizeRoomCode, clearInviteFromUrl } from '../net/roomCode';
import HubCanvas from './HubCanvas';
import DialogueBox from '../ui/DialogueBox';
import BlackjackOverlay from '../ui/BlackjackOverlay';
import QuestLog from '../ui/QuestLog';
import SettingsPanel, { SettingsButton } from '../ui/SettingsPanel';
import MenuMuteButton from '../ui/MenuMuteButton';
import AchievementsPanel from '../ui/AchievementsPanel';
import { getNpc } from './npcData';
import { buildDialogue } from './dialogueData';
import {
  MAP_LIST,
  setActiveMap,
  enterHubMap,
  loadSavedMapId,
  getActiveMap,
} from '../map/activeMap';
import { inputState } from '../player/PlayerControls';
import {
  play,
  unlockAudio,
  stopMenuAmbience,
} from '../audio/sound';
import { loadCamp, saveCamp, canBuyUpgrade, upgradeCost } from './campData';
import { onTalkNpc, acceptQuest as acceptQuestFn } from './questSystem';
import { PLAYER } from '../constants';

function HubInteractPrompt() {
  const { hud } = useGame();
  const label = hud?.interactPrompt?.label;
  if (!label) return null;
  return <div className="interact-prompt hub-prompt">{label}</div>;
}

function CampHUD({
  runSummary,
  onMenu,
  menuOpen,
  setMenuOpen,
  setQuestOpen,
  setDeployOpen,
  deployOpen,
  onConfirmDeploy,
  mapId,
  setMapId,
  deployMode,
  setDeployMode,
  joinInput,
  setJoinInput,
  squadBusy,
  squadError,
  roomCode,
  inviteUrl,
  players,
  isHost,
  squadPhase,
  onCreateSquad,
  onJoinSquad,
  onStartMatch,
  onLeaveSquad,
}) {
  const { camp, bonuses, clearLastRun } = useCamp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const inLobby = squadPhase === 'lobby' || squadPhase === 'connecting';

  const copyCode = useCallback(async () => {
    const text = roomCode || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied('code');
      play('menuClick');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  }, [roomCode]);

  const copyLink = useCallback(async () => {
    const text = inviteUrl || roomCode || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied('link');
      play('menuClick');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  }, [inviteUrl, roomCode]);

  return (
    <>
      <div className="hub-hud-top">
        <div className="hub-bank">
          <span className="stat-label">Scrap</span>
          <span className="hub-bank-value">{camp.bank}</span>
        </div>
        <div className="hub-hud-actions">
          <button type="button" className="hub-hud-btn" onClick={() => setQuestOpen(true)}>
            Quests (J)
          </button>
          <button
            type="button"
            className="hub-hud-btn"
            onClick={() => {
              setDeployMode(inLobby ? 'host' : 'host');
              setDeployOpen(true);
            }}
          >
            {inLobby ? 'Squad' : 'Invite'}
          </button>
          <button type="button" className="hub-hud-btn hub-hud-btn--deploy" onClick={() => setDeployOpen(true)}>
            Deploy
          </button>
        </div>
      </div>

      {inLobby && !deployOpen && (
        <div className="hub-squad-pill">
          <span className="hub-squad-pill-code">{roomCode || '…'}</span>
          <span className="hub-squad-pill-count">
            {(players || []).length}/{MAX_COOP_PLAYERS}
          </span>
          <span className="hub-squad-pill-names">
            {(players || []).map((p) => p.name).join(' · ')}
          </span>
          {isHost ? (
            <button
              type="button"
              className="hub-hud-btn"
              onClick={() => setDeployOpen(true)}
            >
              Start
            </button>
          ) : (
            <span className="hub-squad-pill-wait">Waiting on host…</span>
          )}
        </div>
      )}

      {runSummary && (
        <div className="hub-deposit-toast">
          <span>+{runSummary.earned} scrap banked</span>
          <span className="hub-deposit-meta">
            R{runSummary.round} · {runSummary.kills} kills
          </span>
          <button type="button" className="hub-toast-dismiss" onClick={clearLastRun}>
            ×
          </button>
        </div>
      )}

      <HubInteractPrompt />

      {!menuOpen && !deployOpen && (
        <div className="click-hint hub-click-hint">
          {inLobby
            ? 'Squad in camp · Walk around — friends appear as avatars · Hold Left Alt free cursor · Deploy to start match'
            : 'Walkable hub · Click to look · Hold Left Alt free cursor · WASD · Space jump · F talk · Deploy pad'}
        </div>
      )}

      {menuOpen && (
        <div className="hub-esc-menu">
          <div className="hub-esc-panel">
            <h2>Camp</h2>
            <p className="menu-sub">
              HP ×{bonuses.hpMult.toFixed(2)} · Reload ×
              {bonuses.reloadMult.toFixed(2)} · Points ×
              {bonuses.pointsMult.toFixed(2)}
            </p>
            <AchievementsPanel camp={camp} />
            <div className="menu-actions">
              <button
                type="button"
                className="menu-btn"
                onClick={() => {
                  setMenuOpen(false);
                  setDeployOpen(true);
                }}
              >
                Deploy
              </button>
              <button
                type="button"
                className="menu-btn menu-btn--ghost"
                onClick={() => setQuestOpen(true)}
              >
                Quest Log
              </button>
              <button
                type="button"
                className="menu-btn menu-btn--ghost"
                onClick={() => setSettingsOpen(true)}
              >
                Settings
              </button>
              <button type="button" className="menu-btn menu-btn--ghost" onClick={onMenu}>
                Main Menu
              </button>
              <button type="button" className="menu-btn" onClick={() => setMenuOpen(false)}>
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {deployOpen && (
        <div className="hub-deploy-overlay">
          <div className="hub-deploy-panel">
            <h2>{inLobby ? 'Squad Lobby' : 'Deploy'}</h2>

            {!inLobby && (
              <>
                <p className="coop-section-label">Mode</p>
                <div className="hub-deploy-modes">
                  {[
                    { id: 'solo', label: 'Solo' },
                    { id: 'host', label: 'Host / Invite' },
                    { id: 'join', label: 'Join Code' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`hub-mode-btn${deployMode === m.id ? ' is-selected' : ''}`}
                      onClick={() => {
                        unlockAudio();
                        play('menuHover');
                        setDeployMode(m.id);
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(deployMode !== 'join' || inLobby) && (
              <>
                <p className="coop-section-label">Map</p>
                <div className="coop-map-cards">
                  {MAP_LIST.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`coop-map-card${mapId === m.id ? ' is-selected' : ''}`}
                      disabled={inLobby && !isHost}
                      onClick={() => {
                        unlockAudio();
                        play('menuHover');
                        setMapId(m.id);
                      }}
                    >
                      <span className="coop-map-name">{m.name}</span>
                      <span className="coop-map-blurb">{m.blurb}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {deployMode === 'join' && !inLobby && (
              <label className="hub-join-field">
                <span>Friend&apos;s room code</span>
                <input
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  autoFocus
                  maxLength={24}
                />
              </label>
            )}

            {inLobby && (
              <div className="hub-invite-card">
                <p className="coop-section-label">Invite code</p>
                <div className="hub-invite-code">{roomCode || '……'}</div>
                <div className="hub-invite-actions">
                  <button type="button" className="menu-btn" onClick={copyCode} disabled={!roomCode}>
                    {copied === 'code' ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    type="button"
                    className="menu-btn menu-btn--ghost"
                    onClick={copyLink}
                    disabled={!inviteUrl && !roomCode}
                  >
                    {copied === 'link' ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
                <ul className="hub-squad-list">
                  {(players || []).map((p) => (
                    <li key={p.id}>
                      {p.name}
                      {p.isHost ? ' · Host' : ''}
                    </li>
                  ))}
                  {Array.from({
                    length: Math.max(0, MAX_COOP_PLAYERS - (players?.length || 0)),
                  }).map((_, i) => (
                    <li key={`e${i}`} className="is-empty">
                      Waiting…
                    </li>
                  ))}
                </ul>
                <p className="hub-invite-hint">
                  Invite link drops friends into this camp — walk the yard together, then Start Match.
                </p>
              </div>
            )}

            {squadError && <p className="coop-error">{squadError}</p>}

            <div className="menu-actions">
              {!inLobby && deployMode === 'solo' && (
                <button
                  type="button"
                  className="menu-btn"
                  onClick={() => onConfirmDeploy(mapId)}
                >
                  Deploy Solo
                </button>
              )}
              {!inLobby && deployMode === 'host' && (
                <button
                  type="button"
                  className="menu-btn"
                  disabled={squadBusy}
                  onClick={() => onCreateSquad(mapId)}
                >
                  {squadBusy ? 'Hosting…' : 'Create Invite'}
                </button>
              )}
              {!inLobby && deployMode === 'join' && (
                <button
                  type="button"
                  className="menu-btn"
                  disabled={squadBusy || !joinInput.trim()}
                  onClick={() => onJoinSquad(joinInput.trim())}
                >
                  {squadBusy ? 'Joining…' : 'Join Squad'}
                </button>
              )}
              {inLobby && isHost && (
                <button
                  type="button"
                  className="menu-btn"
                  disabled={squadBusy || squadPhase === 'connecting'}
                  onClick={() => onStartMatch(mapId)}
                >
                  Start Match · {(players || []).length}/{MAX_COOP_PLAYERS}
                </button>
              )}
              {inLobby && !isHost && (
                <p className="menu-sub" style={{ margin: 0 }}>
                  Waiting for host to start… Walk the camp meanwhile.
                </p>
              )}
              {inLobby && (
                <button
                  type="button"
                  className="menu-btn"
                  onClick={() => {
                    unlockAudio();
                    play('menuClick');
                    setDeployOpen(false);
                  }}
                >
                  Walk Camp
                </button>
              )}
              {inLobby ? (
                <button type="button" className="menu-btn menu-btn--ghost" onClick={onLeaveSquad}>
                  Leave Squad
                </button>
              ) : (
                <button
                  type="button"
                  className="menu-btn menu-btn--ghost"
                  onClick={() => setDeployOpen(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="menu-corner-btns">
        <SettingsButton onClick={() => setSettingsOpen(true)} />
        <MenuMuteButton />
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function HubShellInner({
  runSummary,
  onDeploy,
  onMenu,
  joinCode: joinCodeProp = '',
  joinIntent = null,
  onJoinConsumed,
}) {
  const {
    camp,
    purchase,
    turnInQuest,
    talkNpc,
    refreshCamp,
  } = useCamp();
  const { stateRef } = useGame();
  const {
    phase,
    error: coopError,
    host,
    join,
    leave,
    startGame,
    setMap,
    roomCode,
    inviteUrl,
    players,
    isHost,
    localName,
    consumePendingJoin,
  } = useCoop();

  const [menuOpen, setMenuOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [blackjackOpen, setBlackjackOpen] = useState(false);
  const [deployMode, setDeployMode] = useState('solo');
  const [joinInput, setJoinInput] = useState('');
  const [mapId, setMapId] = useState(() => loadSavedMapId());
  const [dialogue, setDialogue] = useState(null);
  const [squadBusy, setSquadBusy] = useState(false);
  const [joinHint, setJoinHint] = useState('');
  const promptRef = useRef(null);
  const autoJoinTried = useRef(false);

  useEffect(() => {
    enterHubMap();
    refreshCamp?.();
    stopMenuAmbience();
    const map = getActiveMap();
    if (stateRef.current) {
      stateRef.current.position.x = map.PLAYER_SPAWN.x;
      stateRef.current.position.z = map.PLAYER_SPAWN.z;
      stateRef.current.position.y = PLAYER.height;
      stateRef.current.velocityY = 0;
      stateRef.current.grounded = true;
      stateRef.current.yaw = 0;
      stateRef.current.pitch = 0;
      stateRef.current.status = 'playing';
      stateRef.current.mapId = map.id;
    }
  }, [refreshCamp, stateRef]);

  // Invite link / Play Setup co-op → auto-host or auto-join into this camp
  useEffect(() => {
    if (autoJoinTried.current) return;
    const fromProp = normalizeRoomCode(joinCodeProp);
    const wantHost = joinIntent === 'host' && !fromProp;
    const wantJoin = joinIntent === 'join' || !!fromProp;

    if (wantHost) {
      autoJoinTried.current = true;
      setDeployMode('host');
      setDeployOpen(true);
      setJoinHint('');
      onJoinConsumed?.();
      setSquadBusy(true);
      (async () => {
        try {
          await host(localName, mapId);
        } catch {
          setJoinHint('Could not create invite — check network / adblock');
        } finally {
          setSquadBusy(false);
        }
      })();
      return;
    }

    if (!wantJoin) return;
    const fromPending = fromProp
      ? ''
      : normalizeRoomCode(consumePendingJoin?.() || '');
    const code = fromProp || fromPending;
    if (!isRoomCode(code)) {
      if (wantJoin && (fromProp || joinIntent === 'join')) {
        autoJoinTried.current = true;
        setDeployMode('join');
        setDeployOpen(true);
        setJoinHint('Enter a valid room code (4–8 characters)');
        onJoinConsumed?.();
      }
      return;
    }

    autoJoinTried.current = true;
    setJoinInput(code);
    setDeployMode('join');
    setJoinHint('');
    setSquadBusy(true);
    (async () => {
      try {
        await join(code, localName);
        clearInviteFromUrl();
        setDeployOpen(false);
        onJoinConsumed?.();
      } catch {
        setJoinHint('Could not join — check the code and that the host is still in camp');
        setDeployOpen(true);
      } finally {
        setSquadBusy(false);
      }
    })();
  }, [
    joinCodeProp,
    joinIntent,
    join,
    host,
    localName,
    mapId,
    consumePendingJoin,
    onJoinConsumed,
  ]);

  // Host: open squad panel once when lobby first appears (copy code), then Walk Camp
  const sawLobby = useRef(false);
  useEffect(() => {
    if (phase === 'lobby') {
      setJoinHint('');
      if (!sawLobby.current && isHost) {
        setDeployOpen(true);
      }
      sawLobby.current = true;
    } else if (phase === 'connecting') {
      sawLobby.current = true;
    } else if (phase === 'idle' || phase === 'error') {
      sawLobby.current = false;
    }
  }, [phase, isHost]);

  // Sync selected map to coop session while hosting (keep hub world until Start)
  useEffect(() => {
    if ((phase === 'lobby' || phase === 'connecting') && isHost && mapId) {
      setMap(mapId, { applyWorld: false });
    }
  }, [mapId, phase, isHost, setMap]);

  const overlayOpen = menuOpen || questOpen || deployOpen || blackjackOpen || !!dialogue;

  useEffect(() => {
    if (inputState.altFreeCursor) {
      inputState.wantsLock = false;
      return;
    }
    inputState.wantsLock = !overlayOpen;
    if (overlayOpen) document.exitPointerLock?.();
  }, [overlayOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyJ' && !dialogue && !blackjackOpen) {
        e.preventDefault();
        inputState.wantsLock = false;
        document.exitPointerLock?.();
        setQuestOpen((v) => !v);
        setMenuOpen(false);
        return;
      }
      if (e.code !== 'Escape') return;
      e.preventDefault();
      // Drop lock intent sync — waiting for useEffect lets the next click re-lock
      const releaseForUi = () => {
        inputState.wantsLock = false;
        document.exitPointerLock?.();
      };
      if (dialogue) {
        setDialogue(null);
        return;
      }
      if (blackjackOpen) {
        setBlackjackOpen(false);
        return;
      }
      if (questOpen) {
        setQuestOpen(false);
        return;
      }
      if (deployOpen) {
        // Allow closing squad panel to walk the camp (Esc = Walk Camp)
        setDeployOpen(false);
        return;
      }
      setMenuOpen((v) => {
        const next = !v;
        if (next) releaseForUi();
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogue, questOpen, deployOpen, blackjackOpen, phase]);

  const openNpcDialogue = useCallback(
    (npcId) => {
      document.exitPointerLock?.();
      const next = onTalkNpc(loadCamp(), npcId);
      saveCamp(next);
      refreshCamp?.();
      const tree = buildDialogue(npcId, next, {
        canBuy: (id) => canBuyUpgrade(next, id),
        costOf: (id) => upgradeCost(id, next.levels[id] || 0),
      });
      setDialogue({ npcId, tree, nodeId: tree.start });
    },
    [refreshCamp]
  );

  const onInteract = useCallback(
    (hit) => {
      if (overlayOpen) return;
      unlockAudio();
      if (hit.type === 'npc') openNpcDialogue(hit.npcId);
      else if (hit.type === 'deploy') {
        document.exitPointerLock?.();
        setDeployOpen(true);
      }
    },
    [overlayOpen, openNpcDialogue]
  );

  const handleChoose = useCallback(
    (choice) => {
      play('menuHover');
      const action = choice.action;

      if (action === 'close') {
        setDialogue(null);
        return;
      }
      if (action === 'openDeploy') {
        setDialogue(null);
        setDeployOpen(true);
        return;
      }
      if (action === 'openBlackjack') {
        setDialogue(null);
        setBlackjackOpen(true);
        return;
      }
      if (action === 'talkProgress') {
        talkNpc?.(dialogue?.npcId);
      } else if (action?.startsWith('buyUpgrade:')) {
        purchase(action.split(':')[1]);
      } else if (action?.startsWith('acceptQuest:')) {
        const qid = action.split(':')[1];
        let next = acceptQuestFn(loadCamp(), qid);
        next = onTalkNpc(next, dialogue?.npcId);
        saveCamp(next);
        refreshCamp?.();
      } else if (action?.startsWith('turnInQuest:')) {
        turnInQuest(action.split(':')[1]);
      }

      if (choice.next && dialogue) {
        setDialogue((d) => (d ? { ...d, nodeId: choice.next } : null));
      }
    },
    [dialogue, purchase, turnInQuest, talkNpc, refreshCamp]
  );

  const onConfirmDeploy = useCallback(
    (id) => {
      leave();
      setActiveMap(id);
      onDeploy(id);
    },
    [onDeploy, leave]
  );

  const onCreateSquad = useCallback(
    async (id) => {
      unlockAudio();
      play('menuClick');
      setJoinHint('');
      setSquadBusy(true);
      try {
        setMap(id, { applyWorld: false });
        await host(localName, id);
      } catch {
        setJoinHint('Could not create invite — check network / adblock');
      } finally {
        setSquadBusy(false);
      }
    },
    [host, localName, setMap]
  );

  const onJoinSquad = useCallback(
    async (raw) => {
      unlockAudio();
      play('menuClick');
      const code = normalizeRoomCode(raw);
      if (!isRoomCode(code)) {
        setJoinHint('Enter a valid room code (4–8 characters)');
        return;
      }
      setJoinHint('');
      setSquadBusy(true);
      try {
        await join(code, localName);
        // Stay on squad panel so roster is visible; Esc / Walk Camp to close
        setDeployOpen(true);
        setDeployMode('join');
      } catch {
        setJoinHint('Could not join — check the code and that the host is still in camp');
        setDeployOpen(true);
      } finally {
        setSquadBusy(false);
      }
    },
    [join, localName]
  );

  const onStartMatch = useCallback(
    (id) => {
      unlockAudio();
      play('menuClick');
      // Pass id explicitly — React setMap state is async and was stomping with stale 'camp'
      setMap(id, { applyWorld: false });
      startGame(id);
    },
    [setMap, startGame]
  );

  const onLeaveSquad = useCallback(() => {
    unlockAudio();
    play('menuClick');
    leave();
    enterHubMap();
    setDeployOpen(false);
  }, [leave]);

  const npc = dialogue ? getNpc(dialogue.npcId) : null;
  const node = dialogue?.tree?.nodes?.[dialogue.nodeId];

  return (
    <div className="play-shell hub-shell">
      <HubCanvas
        onInteract={onInteract}
        promptRef={promptRef}
        controlsEnabled={!overlayOpen}
      />
      <CampHUD
        runSummary={runSummary}
        onMenu={onMenu}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        setQuestOpen={setQuestOpen}
        setDeployOpen={setDeployOpen}
        deployOpen={deployOpen}
        onConfirmDeploy={onConfirmDeploy}
        mapId={mapId}
        setMapId={setMapId}
        deployMode={deployMode}
        setDeployMode={setDeployMode}
        joinInput={joinInput}
        setJoinInput={setJoinInput}
        squadBusy={squadBusy}
        squadError={joinHint || coopError}
        roomCode={roomCode}
        inviteUrl={inviteUrl}
        players={players}
        isHost={isHost}
        squadPhase={phase}
        onCreateSquad={onCreateSquad}
        onJoinSquad={onJoinSquad}
        onStartMatch={onStartMatch}
        onLeaveSquad={onLeaveSquad}
      />
      <QuestLog open={questOpen} onClose={() => setQuestOpen(false)} />
      <DialogueBox
        open={!!dialogue && !!node}
        speaker={npc?.name}
        text={node?.text}
        choices={node?.choices || []}
        onChoose={handleChoose}
        onClose={() => setDialogue(null)}
      />
      <BlackjackOverlay
        open={blackjackOpen}
        bank={camp?.bank ?? 0}
        onClose={() => setBlackjackOpen(false)}
        onBankChange={() => refreshCamp?.()}
      />
    </div>
  );
}

export default function HubShell({
  runSummary,
  onDeploy,
  onMenu,
  bonuses,
  joinCode = '',
  joinIntent = null,
  onJoinConsumed,
}) {
  // Ensure hub map is active before GameProvider snapshots spawn/rooms
  enterHubMap();
  return (
    <GameProvider running bonuses={bonuses}>
      <HubShellInner
        runSummary={runSummary}
        onDeploy={onDeploy}
        onMenu={onMenu}
        joinCode={joinCode}
        joinIntent={joinIntent}
        onJoinConsumed={onJoinConsumed}
      />
    </GameProvider>
  );
}
