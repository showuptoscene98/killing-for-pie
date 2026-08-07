import { useCallback, useEffect, useRef, useState } from 'react';
import {
  unlockAudio,
  startMenuAmbience,
  stopMenuAmbience,
  play,
} from '../audio/sound';
import { isRoomCode, MAX_COOP_PLAYERS, normalizeRoomCode } from '../net/roomCode';
import { parseJoinAddress } from '../net/lanAddress';
import { useCoop } from '../net/CoopContext';
import { MAP_LIST } from '../map/activeMap';
import MenuBackdrop from './MenuBackdrop';
import MenuMuteButton from './MenuMuteButton';
import CharacterCustomize from './CharacterCustomize';

export default function CoopLobby({ onBack, initialCode = '', initialIntent = null }) {
  const {
    phase,
    role,
    joinAddress,
    roomCode,
    inviteUrl,
    backend,
    players,
    localName,
    setLocalName,
    error,
    host,
    hostLan,
    join,
    joinLan,
    startGame,
    leave,
    mapId,
    setMap,
  } = useCoop();

  const [mode, setMode] = useState(
    initialIntent === 'host' ? 'host' : initialCode || initialIntent === 'join' ? 'join' : 'pick'
  );
  const [joinInput, setJoinInput] = useState(initialCode);
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const autoJoinedRef = useRef(false);
  const autoHostedRef = useRef(false);

  useEffect(() => {
    startMenuAmbience();
    return () => stopMenuAmbience();
  }, []);

  useEffect(() => {
    if (initialCode && phase === 'idle') {
      setMode('join');
      setJoinInput(initialCode);
    }
  }, [initialCode, phase]);

  // Auto-host when opened from camp "Host Squad"
  useEffect(() => {
    if (initialIntent !== 'host' || autoHostedRef.current || phase !== 'idle') return;
    autoHostedRef.current = true;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setMode('host');
      try {
        await host(localName);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIntent]);

  // Auto-join when opened via ?coop= invite link
  useEffect(() => {
    if (!initialCode || autoJoinedRef.current || phase !== 'idle') return;
    if (!isRoomCode(initialCode) && !parseJoinAddress(initialCode).ok) return;
    autoJoinedRef.current = true;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setMode('join');
      try {
        const lan = parseJoinAddress(initialCode);
        if (lan.ok) {
          await joinLan(lan.display, localName);
        } else if (!cancelled) {
          await join(normalizeRoomCode(initialCode), localName);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentionally once per invite code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const joinLooksLan = parseJoinAddress(joinInput).ok;
  const joinLooksCode = isRoomCode(joinInput);
  const canJoin = joinLooksLan || joinLooksCode;

  const handleHost = useCallback(async () => {
    unlockAudio();
    play('menuClick');
    setBusy(true);
    setMode('host');
    try {
      await host(localName);
    } finally {
      setBusy(false);
    }
  }, [host, localName]);

  const handleHostLan = useCallback(async () => {
    unlockAudio();
    play('menuClick');
    setBusy(true);
    setMode('host');
    try {
      await hostLan(localName);
    } finally {
      setBusy(false);
    }
  }, [hostLan, localName]);

  const handleJoin = useCallback(async () => {
    unlockAudio();
    play('menuClick');
    if (!canJoin) return;
    setBusy(true);
    setMode('join');
    try {
      if (joinLooksLan) {
        const parsed = parseJoinAddress(joinInput);
        await joinLan(parsed.display, localName);
      } else {
        await join(normalizeRoomCode(joinInput), localName);
      }
    } finally {
      setBusy(false);
    }
  }, [canJoin, join, joinInput, joinLan, joinLooksLan, localName]);

  const copyText = useCallback(async (text, key) => {
    unlockAudio();
    play('menuHover');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    } catch (_) {
      /* ignore */
    }
  }, []);

  const handleStart = useCallback(() => {
    unlockAudio();
    play('menuClick');
    stopMenuAmbience();
    startGame(mapId);
  }, [startGame, mapId]);

  const handleLeave = useCallback(() => {
    unlockAudio();
    play('menuClick');
    leave();
    onBack();
  }, [leave, onBack]);

  const handleBack = useCallback(() => {
    unlockAudio();
    play('menuClick');
    leave();
    onBack();
  }, [leave, onBack]);

  const handleSelectMap = useCallback(
    (id) => {
      if (role !== 'host') return;
      unlockAudio();
      play('menuHover');
      setMap(id);
    },
    [role, setMap]
  );

  const inLobby = phase === 'lobby' || phase === 'connecting';
  const showLobby = inLobby && (role === 'host' || role === 'client');
  const selectedMap = MAP_LIST.find((m) => m.id === mapId) || MAP_LIST[0];
  const isOnline = backend === 'peer' || (!backend && mode !== 'lan');
  const shareValue =
    backend === 'lan'
      ? joinAddress
      : inviteUrl || roomCode || joinAddress;

  return (
    <div className="screen menu-screen coop-screen" onPointerDown={() => unlockAudio()}>
      <MenuBackdrop />
      <div className="menu-bg menu-bg--overlay" />
      <div className={`coop-layout${showLobby ? ' coop-layout--ready' : ''}`}>
        <div className="menu-content coop-content">
          <p className="menu-eyebrow">Squad protocol</p>
          <h1 className="menu-title coop-title">Co-op</h1>
          <p className="menu-sub">
            Free online via invite link · up to {MAX_COOP_PLAYERS} survivors. Keep the host tab open.
          </p>

          {!showLobby && (
            <>
              <label className="coop-field">
                <span>Callsign</span>
                <input
                  value={localName}
                  maxLength={16}
                  onChange={(e) => setLocalName(e.target.value)}
                  disabled={busy}
                />
              </label>

              {mode === 'pick' && (
                <div className="menu-actions">
                  <button
                    type="button"
                    className="menu-btn"
                    disabled={busy}
                    onMouseEnter={() => play('menuHover')}
                    onClick={handleHost}
                  >
                    Host Online
                  </button>
                  <button
                    type="button"
                    className="menu-btn menu-btn--ghost"
                    disabled={busy}
                    onMouseEnter={() => play('menuHover')}
                    onClick={() => {
                      play('menuClick');
                      setMode('join');
                    }}
                  >
                    Join with Code / Link
                  </button>
                  <button
                    type="button"
                    className="menu-btn menu-btn--ghost"
                    disabled={busy}
                    onMouseEnter={() => play('menuHover')}
                    onClick={() => {
                      play('menuClick');
                      setMode('lan');
                    }}
                  >
                    LAN (same Wi‑Fi)
                  </button>
                </div>
              )}

              {mode === 'join' && (
                <div className="coop-join">
                  <label className="coop-field">
                    <span>Room code or invite link</span>
                    <input
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      placeholder="ABC123 or paste invite URL"
                      disabled={busy}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </label>
                  {joinInput.trim() && !canJoin && (
                    <p className="coop-error">Need a room code or private LAN IP</p>
                  )}
                  <div className="menu-actions">
                    <button
                      type="button"
                      className="menu-btn"
                      disabled={busy || !canJoin}
                      onMouseEnter={() => play('menuHover')}
                      onClick={handleJoin}
                    >
                      {busy ? 'Connecting…' : 'Join'}
                    </button>
                    <button
                      type="button"
                      className="menu-btn menu-btn--ghost"
                      disabled={busy}
                      onClick={() => {
                        play('menuClick');
                        setMode('pick');
                      }}
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {mode === 'lan' && (
                <div className="coop-join">
                  <p className="menu-sub" style={{ marginTop: 0 }}>
                    Same network only. Host must run with the LAN relay (`npm start` / Electron).
                  </p>
                  <div className="menu-actions">
                    <button
                      type="button"
                      className="menu-btn"
                      disabled={busy}
                      onMouseEnter={() => play('menuHover')}
                      onClick={handleHostLan}
                    >
                      Host LAN
                    </button>
                    <button
                      type="button"
                      className="menu-btn menu-btn--ghost"
                      disabled={busy}
                      onClick={() => {
                        play('menuClick');
                        setMode('join');
                      }}
                    >
                      Join LAN IP
                    </button>
                    <button
                      type="button"
                      className="menu-btn menu-btn--ghost"
                      disabled={busy}
                      onClick={() => {
                        play('menuClick');
                        setMode('pick');
                      }}
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {mode === 'host' && phase === 'connecting' && (
                <p className="menu-sub">
                  {isOnline ? 'Creating online room…' : 'Starting LAN host…'}
                </p>
              )}
            </>
          )}

          {showLobby && (
            <div className="coop-lobby">
              <div className="coop-invite">
                <div className="coop-code">
                  {backend === 'lan' ? joinAddress || '…' : roomCode || joinAddress || '…'}
                </div>
                <p className="coop-invite-hint">
                  {backend === 'lan'
                    ? 'Share this private LAN IP. Friends can Join anytime — mid-match joins spectate in 3rd person.'
                    : 'Share the invite link (or room code). Friends can Join mid-match as spectators. Keep this tab open.'}
                </p>
                <div className="coop-link-row">
                  <input readOnly value={shareValue} className="coop-link" />
                  <button
                    type="button"
                    className="menu-btn menu-btn--small"
                    onClick={() =>
                      copyText(
                        shareValue,
                        backend === 'lan' ? 'ip' : 'link'
                      )
                    }
                  >
                    {copied === 'link' || copied === 'ip'
                      ? 'Copied'
                      : backend === 'lan'
                        ? 'Copy IP'
                        : 'Copy Link'}
                  </button>
                </div>
                {backend === 'peer' && roomCode && (
                  <div className="coop-link-row" style={{ marginTop: '0.5rem' }}>
                    <input readOnly value={roomCode} className="coop-link" />
                    <button
                      type="button"
                      className="menu-btn menu-btn--small"
                      onClick={() => copyText(roomCode, 'code')}
                    >
                      {copied === 'code' ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>
                )}
                {backend === 'peer' &&
                  typeof window !== 'undefined' &&
                  /localhost|127\.0\.0\.1/i.test(window.location.hostname) && (
                    <p className="coop-error" style={{ marginTop: '0.75rem' }}>
                      You&apos;re on localhost — deploy the build (Netlify/Vercel) so friends can open the invite link. Or test with two tabs on this PC.
                    </p>
                  )}
              </div>

              <div className="coop-map-select">
                <p className="coop-section-label">
                  Map {role === 'host' ? '(host picks)' : '(locked by host)'}
                </p>
                <div className="coop-map-cards">
                  {MAP_LIST.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`coop-map-card${mapId === m.id ? ' is-selected' : ''}${
                        role !== 'host' ? ' is-locked' : ''
                      }`}
                      disabled={role !== 'host'}
                      onClick={() => handleSelectMap(m.id)}
                      onMouseEnter={() => role === 'host' && play('menuHover')}
                    >
                      <span className="coop-map-name">{m.name}</span>
                      <span className="coop-map-blurb">{m.blurb}</span>
                    </button>
                  ))}
                </div>
                <p className="coop-map-current">Deploying: {selectedMap.name}</p>
              </div>

              <ul className="coop-players">
                {players.map((p) => (
                  <li key={p.id} className={p.isHost ? 'is-host' : ''}>
                    <span>{p.name}</span>
                    {p.isHost && <em>Host</em>}
                  </li>
                ))}
                {Array.from({
                  length: Math.max(0, MAX_COOP_PLAYERS - players.length),
                }).map((_, i) => (
                  <li key={`empty-${i}`} className="is-empty">
                    Waiting…
                  </li>
                ))}
              </ul>

              <div className="menu-actions">
                {role === 'host' && (
                  <button
                    type="button"
                    className="menu-btn"
                    disabled={players.length < 1 || phase === 'connecting'}
                    onMouseEnter={() => play('menuHover')}
                    onClick={handleStart}
                  >
                    Start · {selectedMap.name} ({players.length}/{MAX_COOP_PLAYERS})
                  </button>
                )}
                {role === 'client' && (
                  <p className="menu-sub" style={{ margin: 0 }}>
                    Waiting for host · {selectedMap.name}
                  </p>
                )}
                <button
                  type="button"
                  className="menu-btn menu-btn--ghost"
                  onClick={handleLeave}
                >
                  Leave
                </button>
              </div>
            </div>
          )}

          {error && <p className="coop-error">{error}</p>}

          {phase === 'error' && (
            <div className="menu-actions" style={{ marginTop: '1.25rem' }}>
              {mode === 'host' && (
                <button
                  type="button"
                  className="menu-btn"
                  disabled={busy}
                  onClick={backend === 'lan' ? handleHostLan : handleHost}
                >
                  Host Again
                </button>
              )}
              {mode === 'join' && (
                <button
                  type="button"
                  className="menu-btn"
                  disabled={busy || !canJoin}
                  onClick={handleJoin}
                >
                  Rejoin
                </button>
              )}
              <button
                type="button"
                className="menu-btn menu-btn--ghost"
                onClick={handleBack}
              >
                Back to Camp
              </button>
            </div>
          )}

          {!showLobby && mode === 'pick' && phase !== 'error' && (
            <button
              type="button"
              className="menu-btn menu-btn--ghost"
              style={{ marginTop: '1.25rem' }}
              onClick={handleBack}
            >
              Back to Camp
            </button>
          )}
        </div>

        {showLobby && (
          <div className="coop-customize">
            <CharacterCustomize />
          </div>
        )}
      </div>
      <MenuMuteButton />
    </div>
  );
}
