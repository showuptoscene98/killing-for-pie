import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCamp } from './CampContext';
import { GameProvider, useGameApi, useHud } from '../GameContext';
import { useCoop } from '../net/CoopContext';
import { isRoomCode, MAX_COOP_PLAYERS, normalizeRoomCode, clearInviteFromUrl } from '../net/roomCode';
import HubCanvas from './HubCanvas';
import DialogueBox from '../ui/DialogueBox';
import BlackjackOverlay from '../ui/BlackjackOverlay';
import QuestLog from '../ui/QuestLog';
import SettingsPanel, { SettingsButton } from '../ui/SettingsPanel';
import MenuMuteButton from '../ui/MenuMuteButton';
import NotificationBell from '../ui/NotificationBell';
import AchievementsPanel from '../ui/AchievementsPanel';
import { useSocial } from '../net/SocialContext';
import { getNpc } from './npcData';
import { buildDialogue } from './dialogueData';
import {
  MAP_LIST,
  setActiveMap,
  enterHubMap,
  loadSavedMapId,
  getActiveMap,
} from '../map/activeMap';
import {
  TRANSIT_MAP_ORDER,
  TRANSIT_ROUNDS_PER_MAP,
  transitStartMapId,
} from '../systems/transitMode';
import { setPendingMatchOptions } from '../systems/matchOptions';
import { inputState } from '../player/PlayerControls';
import {
  play,
  unlockAudio,
  stopMenuAmbience,
} from '../audio/sound';
import { loadCamp, saveCamp, canBuyUpgrade, upgradeCost } from './campData';
import {
  onTalkNpc,
  acceptQuest as acceptQuestFn,
  isModeUnlocked,
} from './questSystem';
import { PLAYER } from '../constants';

function HubInteractPrompt() {
  const hud = useHud();
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
  gameMode,
  setGameMode,
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
  settingsOpen,
  setSettingsOpen,
}) {
  const { camp, bonuses, clearLastRun } = useCamp();
  const social = useSocial();
  const [copied, setCopied] = useState('');
  const [browserTab, setBrowserTab] = useState('all');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [friendMsg, setFriendMsg] = useState('');
  const [friendBusy, setFriendBusy] = useState(false);
  const connecting = squadPhase === 'connecting';
  const inLobby = squadPhase === 'lobby' || connecting;
  const transitUnlocked = isModeUnlocked(camp, 'transit');
  const transitSelected = gameMode === 'transit';

  useEffect(() => {
    if (!deployOpen || (deployMode !== 'browser' && deployMode !== 'friends')) return;
    social.listLobbies?.({
      tab: deployMode === 'friends' ? 'friends' : browserTab,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listLobbies identity churns
  }, [deployOpen, deployMode, browserTab, social.available, social.friends?.length]);

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

  const copyFriendCode = useCallback(async () => {
    if (!social.friendCode) return;
    try {
      await navigator.clipboard.writeText(social.friendCode);
      setCopied('friend');
      play('menuClick');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  }, [social.friendCode]);

  const mapLabel = (id) => MAP_LIST.find((m) => m.id === id)?.name || id;

  return (
    <>
      <div className="hub-hud-top">
        <div className="hub-bank">
          <span className="stat-label">Scrap</span>
          <span className="hub-bank-value">{camp.bank}</span>
        </div>
        <div className="hub-hud-actions">
          <NotificationBell
            onJoinLobby={(code) => {
              setJoinInput(code);
              setDeployMode('join');
              setDeployOpen(true);
              onJoinSquad(code);
            }}
            onOpenFriends={() => {
              setDeployMode('friends');
              setDeployOpen(true);
            }}
          />
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
            <span className="hub-squad-pill-wait">
              {connecting ? 'Connecting…' : 'Waiting on host…'}
            </span>
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
                <p className="coop-section-label">Lobby</p>
                <div className="hub-deploy-modes">
                  {[
                    { id: 'solo', label: 'Solo' },
                    { id: 'host', label: 'Host / Invite' },
                    { id: 'join', label: 'Join Code' },
                    { id: 'browser', label: 'Browser' },
                    { id: 'friends', label: 'Friends' },
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

            {(deployMode === 'solo' || deployMode === 'host' || inLobby) && (
              <>
                <p className="coop-section-label">Game Type</p>
                <div className="hub-deploy-modes">
                  <button
                    type="button"
                    className={`hub-mode-btn${gameMode === 'classic' ? ' is-selected' : ''}`}
                    disabled={inLobby && !isHost}
                    onClick={() => {
                      unlockAudio();
                      play('menuHover');
                      setGameMode('classic');
                    }}
                  >
                    Classic
                  </button>
                  <button
                    type="button"
                    className={`hub-mode-btn${transitSelected ? ' is-selected' : ''}`}
                    disabled={!transitUnlocked || (inLobby && !isHost)}
                    title={
                      transitUnlocked
                        ? 'Progress through every map as rounds rise — Pie Yard last'
                        : 'Talk to Imagine — quest: Let the Good Times Roll'
                    }
                    onClick={() => {
                      if (!transitUnlocked) return;
                      unlockAudio();
                      play('menuHover');
                      setGameMode('transit');
                    }}
                  >
                    {transitUnlocked ? 'Transit' : 'Transit 🔒'}
                  </button>
                </div>
              </>
            )}

            {(deployMode === 'solo' || deployMode === 'host' || inLobby) &&
              transitSelected && (
                <div className="coop-map-card is-selected" style={{ cursor: 'default' }}>
                  <span className="coop-map-name">Transit Route</span>
                  <span className="coop-map-blurb">
                    {TRANSIT_MAP_ORDER.map((id) => mapLabel(id)).join(' → ')}. Every{' '}
                    {TRANSIT_ROUNDS_PER_MAP} rounds the map shifts. Pie Yard is the finale.
                  </span>
                </div>
              )}

            {(deployMode === 'solo' || deployMode === 'host' || inLobby) &&
              !transitSelected && (
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

            {deployMode === 'host' && !inLobby && social.available && (
              <label className="hub-toggle-row">
                <input
                  type="checkbox"
                  checked={social.listPublic}
                  onChange={(e) => social.setListPublic(e.target.checked)}
                />
                <span>List publicly in server browser</span>
              </label>
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

            {deployMode === 'browser' && !inLobby && (
              <div className="hub-browser">
                {!social.configured ? (
                  <p className="hub-invite-hint">
                    Server browser needs VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
                    in .env.local (restart Vite after editing). For GitHub Pages,
                    set the same names as repo Actions secrets.
                  </p>
                ) : !social.available ? (
                  <p className="hub-invite-hint">
                    {social.error ||
                      'Social offline — enable Anonymous Sign-Ins in the Supabase dashboard.'}
                  </p>
                ) : (
                  <>
                    {social.error && (
                      <p className="hub-invite-hint">{social.error}</p>
                    )}
                    <div className="hub-deploy-modes">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'public', label: 'Public' },
                        { id: 'friends', label: 'Friends' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`hub-mode-btn${browserTab === t.id ? ' is-selected' : ''}`}
                          onClick={() => {
                            setBrowserTab(t.id);
                            play('menuHover');
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="hub-mode-btn"
                        onClick={() => {
                          play('menuClick');
                          social.listLobbies({ tab: browserTab });
                        }}
                      >
                        Refresh
                      </button>
                    </div>
                    <ul className="hub-browser-list">
                      {(social.lobbies || []).length === 0 && (
                        <li className="is-empty">No open lobbies — host one or wait.</li>
                      )}
                      {(social.lobbies || []).map((row) => (
                        <li key={row.id}>
                          <div className="hub-browser-row">
                            <div>
                              <span className="hub-browser-host">
                                {row.hostCallsign}
                                {row.isFriend ? ' · Friend' : ''}
                              </span>
                              <span className="hub-browser-meta">
                                {mapLabel(row.map_id)} · {row.player_count}/{row.max_players}
                                {row.is_public ? '' : ' · Private'}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="menu-btn"
                              disabled={squadBusy || row.player_count >= row.max_players}
                              onClick={() => onJoinSquad(row.room_code)}
                            >
                              Join
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {deployMode === 'friends' && !inLobby && (
              <div className="hub-friends">
                {!social.configured ? (
                  <p className="hub-invite-hint">
                    Friends need VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in
                    .env.local (restart Vite after editing).
                  </p>
                ) : !social.available ? (
                  <p className="hub-invite-hint">
                    {social.error ||
                      'Friends offline — enable Anonymous Sign-Ins in the Supabase dashboard.'}
                  </p>
                ) : (
                  <>
                    <div className="hub-invite-card">
                      <p className="coop-section-label">Your friend code</p>
                      <div className="hub-invite-code">{social.friendCode || '……'}</div>
                      <div className="hub-invite-actions">
                        <button type="button" className="menu-btn" onClick={copyFriendCode}>
                          {copied === 'friend' ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>
                      <p className="hub-invite-hint">
                        Callsign: {social.callsign} — change it in Settings.
                      </p>
                    </div>
                    <label className="hub-join-field">
                      <span>Add friend by code</span>
                      <input
                        value={friendCodeInput}
                        onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        maxLength={8}
                      />
                    </label>
                    <button
                      type="button"
                      className="menu-btn"
                      disabled={friendBusy || friendCodeInput.trim().length < 6}
                      onClick={async () => {
                        setFriendBusy(true);
                        setFriendMsg('');
                        try {
                          unlockAudio();
                          play('menuClick');
                          const t = await social.addFriendByCode(friendCodeInput);
                          setFriendMsg(`Request sent to ${t.callsign}`);
                          setFriendCodeInput('');
                        } catch (err) {
                          setFriendMsg(err?.message || 'Failed');
                        } finally {
                          setFriendBusy(false);
                        }
                      }}
                    >
                      {friendBusy ? 'Sending…' : 'Send Request'}
                    </button>
                    {friendMsg && <p className="hub-invite-hint">{friendMsg}</p>}

                    {social.pendingIncoming?.length > 0 && (
                      <>
                        <p className="coop-section-label">Incoming</p>
                        <ul className="hub-squad-list">
                          {social.pendingIncoming.map((f) => (
                            <li key={f.friendshipId}>
                              {f.callsign}
                              <div className="hub-invite-actions" style={{ marginTop: 6 }}>
                                <button
                                  type="button"
                                  className="menu-btn"
                                  onClick={() => social.acceptFriend(f.friendshipId)}
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="menu-btn menu-btn--ghost"
                                  onClick={() => social.declineFriend(f.friendshipId)}
                                >
                                  Decline
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <p className="coop-section-label">Squad mates</p>
                    <ul className="hub-squad-list">
                      {(social.friends || []).length === 0 && (
                        <li className="is-empty">No friends yet — share your code.</li>
                      )}
                      {(social.friends || []).map((f) => (
                        <li key={f.id}>
                          {f.callsign}
                          <span className="hub-browser-meta"> · {f.friendCode}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="coop-section-label">Friend lobbies</p>
                    <ul className="hub-browser-list">
                      {(social.lobbies || [])
                        .filter((r) => r.isFriend)
                        .map((row) => (
                          <li key={row.id}>
                            <div className="hub-browser-row">
                              <div>
                                <span className="hub-browser-host">{row.hostCallsign}</span>
                                <span className="hub-browser-meta">
                                  {mapLabel(row.map_id)} · {row.player_count}/{row.max_players}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="menu-btn"
                                disabled={squadBusy}
                                onClick={() => onJoinSquad(row.room_code)}
                              >
                                Join
                              </button>
                            </div>
                          </li>
                        ))}
                      {(social.lobbies || []).filter((r) => r.isFriend).length === 0 && (
                        <li className="is-empty">No friends hosting right now.</li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            )}

            {inLobby && (
              <div className="hub-invite-card">
                <p className="coop-section-label">Invite code</p>
                <div className="hub-invite-code">{roomCode || (connecting ? '…' : '……')}</div>
                {connecting && !isHost && (
                  <p className="hub-invite-hint">
                    Connecting to host… keep this tab open (adblock can block PeerJS).
                  </p>
                )}
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
                      {connecting ? 'Connecting…' : 'Waiting…'}
                    </li>
                  ))}
                </ul>
                {isHost && social.available && social.friends?.length > 0 && (
                  <>
                    <p className="coop-section-label">Invite friend</p>
                    <ul className="hub-squad-list">
                      {social.friends.map((f) => (
                        <li key={f.id}>
                          {f.callsign}
                          <button
                            type="button"
                            className="menu-btn menu-btn--ghost"
                            style={{ marginLeft: 8, padding: '0.25rem 0.5rem' }}
                            onClick={async () => {
                              try {
                                await social.inviteFriendToLobby(f.id, roomCode, mapId);
                                play('menuClick');
                                setCopied('invited');
                                setTimeout(() => setCopied(''), 1500);
                              } catch (err) {
                                console.warn(err);
                              }
                            }}
                          >
                            {copied === 'invited' ? 'Sent' : 'Invite'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
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
                  onClick={() =>
                    onConfirmDeploy(
                      transitSelected ? transitStartMapId() : mapId,
                      gameMode
                    )
                  }
                >
                  {transitSelected ? 'Deploy Transit' : 'Deploy Solo'}
                </button>
              )}
              {!inLobby && deployMode === 'host' && (
                <button
                  type="button"
                  className="menu-btn"
                  disabled={squadBusy}
                  onClick={() =>
                    onCreateSquad(
                      transitSelected ? transitStartMapId() : mapId,
                      gameMode
                    )
                  }
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
                  onClick={() =>
                    onStartMatch(
                      transitSelected ? transitStartMapId() : mapId,
                      gameMode
                    )
                  }
                >
                  Start Match · {(players || []).length}/{MAX_COOP_PLAYERS}
                </button>
              )}
              {inLobby && !isHost && !connecting && (
                <p className="menu-sub" style={{ margin: 0 }}>
                  Waiting for host to start… Walk the camp meanwhile.
                </p>
              )}
              {connecting && !isHost && (
                <p className="menu-sub" style={{ margin: 0 }}>
                  Connecting to host…
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
  const { stateRef } = useGameApi();
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
  // Lives here rather than in CampHUD so it can feed `overlayOpen` below —
  // otherwise the settings panel opens with the mouse still captured, which
  // leaves the sliders unclickable and the camera spinning behind it.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [blackjackOpen, setBlackjackOpen] = useState(false);
  const [deployMode, setDeployMode] = useState('solo');
  const [gameMode, setGameMode] = useState('classic');
  const [joinInput, setJoinInput] = useState('');
  const [mapId, setMapId] = useState(() => loadSavedMapId());
  const [dialogue, setDialogue] = useState(null);
  const [squadBusy, setSquadBusy] = useState(false);
  const [joinHint, setJoinHint] = useState('');
  const promptRef = useRef(null);
  const autoJoinTried = useRef(false);

  useEffect(() => {
    // Don't clobber combat map if Start Match already flipped phase
    if (phase === 'playing') return;
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
  }, [refreshCamp, stateRef, phase]);

  /* eslint-disable react-hooks/set-state-in-effect --
     These react to the coop session's async phase (invite consumed, lobby
     opened) and drive imperative work — hosting, joining, opening the squad
     panel — so they belong in effects. Each fires once per session change. */

  // Invite link / Play Setup co-op → auto-host or auto-join into this camp
  useEffect(() => {
    if (autoJoinTried.current) return;
    const fromProp = normalizeRoomCode(joinCodeProp);
    if (joinIntent === 'browser' || joinIntent === 'friends') {
      autoJoinTried.current = true;
      setDeployMode(joinIntent);
      setDeployOpen(true);
      onJoinConsumed?.();
      return;
    }
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
      } catch (err) {
        setJoinHint(
          err?.message ||
            'Could not join — check the code and that the host is still in camp'
        );
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

  /* eslint-enable react-hooks/set-state-in-effect */

  // Sync selected map to coop session while hosting (keep hub world until Start)
  useEffect(() => {
    if ((phase === 'lobby' || phase === 'connecting') && isHost && mapId) {
      setMap(mapId, { applyWorld: false });
    }
  }, [mapId, phase, isHost, setMap]);

  const overlayOpen =
    menuOpen ||
    questOpen ||
    deployOpen ||
    blackjackOpen ||
    settingsOpen ||
    !!dialogue;

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
    (id, mode = 'classic') => {
      leave();
      setPendingMatchOptions({ gameMode: mode });
      setActiveMap(id);
      onDeploy(id, { gameMode: mode });
    },
    [onDeploy, leave]
  );

  const onCreateSquad = useCallback(
    async (id, mode = 'classic') => {
      unlockAudio();
      play('menuClick');
      setJoinHint('');
      setSquadBusy(true);
      try {
        setGameMode(mode);
        setPendingMatchOptions({ gameMode: mode });
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
        setJoinHint('');
      } catch (err) {
        setJoinHint(
          err?.message ||
            'Could not join — check the code and that the host is still in camp'
        );
        setDeployOpen(true);
      } finally {
        setSquadBusy(false);
      }
    },
    [join, localName]
  );

  const onStartMatch = useCallback(
    (id, mode = 'classic') => {
      unlockAudio();
      play('menuClick');
      setGameMode(mode);
      setPendingMatchOptions({ gameMode: mode });
      // Stash + apply combat map NOW — HubShell must not be able to revert to hub
      setMap(id, { applyWorld: true });
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
        gameMode={gameMode}
        setGameMode={setGameMode}
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
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
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
  // Once per mount, BEFORE GameProvider snapshots spawn/rooms. A bare
  // enterHubMap() in render re-ran after Start Match (phase=playing while
  // HubShell still mounted) and stomped the combat map → black → camp hub.
  const hubBooted = useRef(false);
  if (!hubBooted.current) {
    enterHubMap();
    hubBooted.current = true;
  }

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
