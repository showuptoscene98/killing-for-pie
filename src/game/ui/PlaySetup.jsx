import { useCallback, useEffect, useState } from 'react';
import {
  unlockAudio,
  startMenuAmbience,
  stopMenuAmbience,
  play,
  isAudioUnlocked,
} from '../audio/sound';
import { MAP_LIST, loadSavedMapId, setActiveMap } from '../map/activeMap';
import MenuBackdrop from './MenuBackdrop';
import MenuMuteButton from './MenuMuteButton';
import SettingsPanel, { SettingsButton } from './SettingsPanel';

const MODES = [
  {
    id: 'solo',
    name: 'Solo',
    blurb: 'Hold the line alone. Your run, your scrap.',
  },
  {
    id: 'coop',
    name: 'Co-op',
    blurb: 'Squad up in camp — host an invite or join a code, then deploy together.',
  },
];

export default function PlaySetup({ onPlaySolo, onPlayCoop, onBack }) {
  const [mapId, setMapId] = useState(() => loadSavedMapId());
  const [mode, setMode] = useState('coop');
  const [coopIntent, setCoopIntent] = useState('host');
  const [joinCode, setJoinCode] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (isAudioUnlocked()) startMenuAmbience();
  }, []);

  const pickMap = useCallback((id) => {
    unlockAudio();
    play('menuHover');
    setMapId(id);
    setActiveMap(id);
  }, []);

  const pickMode = useCallback((id) => {
    unlockAudio();
    play('menuHover');
    setMode(id);
  }, []);

  const handlePlay = useCallback(() => {
    unlockAudio();
    play('menuClick');
    setActiveMap(mapId);
    if (mode === 'coop') {
      const intent =
        coopIntent === 'join'
          ? 'join'
          : coopIntent === 'browser'
            ? 'browser'
            : coopIntent === 'friends'
              ? 'friends'
              : 'host';
      onPlayCoop?.(mapId, {
        intent,
        code: intent === 'join' ? joinCode.trim() : '',
      });
      return;
    }
    stopMenuAmbience();
    onPlaySolo?.(mapId);
  }, [mapId, mode, coopIntent, joinCode, onPlaySolo, onPlayCoop]);

  const handleBack = useCallback(() => {
    unlockAudio();
    play('menuClick');
    onBack?.();
  }, [onBack]);

  const selectedMap = MAP_LIST.find((m) => m.id === mapId) || MAP_LIST[0];
  const selectedMode = MODES.find((m) => m.id === mode) || MODES[0];

  return (
    <div className="screen menu-screen play-setup-screen" onPointerDown={() => unlockAudio()}>
      <MenuBackdrop />
      <div className="menu-bg menu-bg--overlay" />
      <div className="menu-content play-setup-content">
        <p className="menu-eyebrow">Deploy</p>
        <h1 className="menu-title">Play Game</h1>
        <p className="menu-sub">Pick a map and how you fight — then drop in.</p>

        <div className="play-setup-section">
          <p className="coop-section-label">Map</p>
          <div className="coop-map-cards">
            {MAP_LIST.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`coop-map-card${mapId === m.id ? ' is-selected' : ''}`}
                onClick={() => pickMap(m.id)}
                onMouseEnter={() => {
                  unlockAudio();
                  play('menuHover');
                }}
              >
                <span className="coop-map-name">{m.name}</span>
                <span className="coop-map-blurb">{m.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="play-setup-section">
          <p className="coop-section-label">Mode</p>
          <div className="coop-map-cards">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`coop-map-card${mode === m.id ? ' is-selected' : ''}`}
                onClick={() => pickMode(m.id)}
                onMouseEnter={() => {
                  unlockAudio();
                  play('menuHover');
                }}
              >
                <span className="coop-map-name">{m.name}</span>
                <span className="coop-map-blurb">{m.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        {mode === 'coop' && (
          <div className="play-setup-section">
            <p className="coop-section-label">Squad</p>
            <div className="hub-deploy-modes">
              <button
                type="button"
                className={`hub-mode-btn${coopIntent === 'host' ? ' is-selected' : ''}`}
                onClick={() => {
                  unlockAudio();
                  play('menuHover');
                  setCoopIntent('host');
                }}
              >
                Host / Invite
              </button>
              <button
                type="button"
                className={`hub-mode-btn${coopIntent === 'join' ? ' is-selected' : ''}`}
                onClick={() => {
                  unlockAudio();
                  play('menuHover');
                  setCoopIntent('join');
                }}
              >
                Join Code
              </button>
              <button
                type="button"
                className={`hub-mode-btn${coopIntent === 'browser' ? ' is-selected' : ''}`}
                onClick={() => {
                  unlockAudio();
                  play('menuHover');
                  setCoopIntent('browser');
                }}
              >
                Browser
              </button>
              <button
                type="button"
                className={`hub-mode-btn${coopIntent === 'friends' ? ' is-selected' : ''}`}
                onClick={() => {
                  unlockAudio();
                  play('menuHover');
                  setCoopIntent('friends');
                }}
              >
                Friends
              </button>
            </div>
            {coopIntent === 'join' && (
              <label className="hub-join-field" style={{ marginTop: 12 }}>
                <span>Friend&apos;s room code</span>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={24}
                />
              </label>
            )}
            <p className="menu-sub" style={{ marginTop: 10 }}>
              {coopIntent === 'browser'
                ? 'Opens the server browser in camp.'
                : coopIntent === 'friends'
                  ? 'Manage friend codes and join friend lobbies from camp.'
                  : `Drops you in camp together — walk the yard, then deploy to ${selectedMap.name}.`}
            </p>
          </div>
        )}

        <p className="coop-map-current">
          {selectedMode.name}
          {mode === 'coop' ? ` · ${
            coopIntent === 'join'
              ? 'Join'
              : coopIntent === 'browser'
                ? 'Browser'
                : coopIntent === 'friends'
                  ? 'Friends'
                  : 'Host'
          }` : ''}
          {' · '}
          {selectedMap.name}
        </p>

        <div className="menu-actions">
          <button
            type="button"
            className="menu-btn"
            onMouseEnter={() => {
              unlockAudio();
              play('menuHover');
            }}
            onClick={handlePlay}
          >
            Play
          </button>
          <button
            type="button"
            className="menu-btn menu-btn--ghost"
            onMouseEnter={() => {
              unlockAudio();
              play('menuHover');
            }}
            onClick={handleBack}
          >
            Back
          </button>
        </div>
      </div>
      <div className="menu-corner-btns">
        <SettingsButton onClick={() => setSettingsOpen(true)} />
        <MenuMuteButton />
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
