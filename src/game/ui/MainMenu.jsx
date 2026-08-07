import { useCallback, useEffect, useState } from 'react';
import {
  unlockAudio,
  startMenuAmbience,
  stopMenuAmbience,
  play,
  isAudioUnlocked,
} from '../audio/sound';
import { achievementProgress } from '../camp/achievements';
import MenuBackdrop from './MenuBackdrop';
import CharacterCustomize from './CharacterCustomize';
import MenuMuteButton from './MenuMuteButton';
import SettingsPanel, { SettingsButton } from './SettingsPanel';
import {
  getKeybinds,
  formatKeyCode,
  subscribeKeybinds,
} from '../keybinds';
import { useCamp } from '../camp/CampContext';

function controlsLines(binds) {
  const move = [
    formatKeyCode(binds.forward),
    formatKeyCode(binds.left),
    formatKeyCode(binds.back),
    formatKeyCode(binds.right),
  ].join(' ');
  return [
    { keys: move, text: 'Move' },
    { keys: 'Mouse', text: 'Look · LMB Fire' },
    {
      keys: `${formatKeyCode(binds.jump)} / ${formatKeyCode(binds.sprint)}`,
      text: 'Jump · Sprint',
    },
    {
      keys: `${formatKeyCode(binds.reload)} / ${formatKeyCode(binds.interact)}`,
      text: 'Reload · Interact',
    },
    {
      keys: `${formatKeyCode(binds.weapon1)} / ${formatKeyCode(binds.weapon2)}`,
      text: 'or Scroll Swap weapons',
    },
  ];
}

export default function MainMenu({ onPlay, onCamp, onPlaySetup }) {
  const { camp, refreshCamp } = useCamp();
  const [soundOn, setSoundOn] = useState(() => isAudioUnlocked());
  const [customize, setCustomize] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [binds, setBinds] = useState(() => getKeybinds());

  useEffect(() => subscribeKeybinds(setBinds), []);

  useEffect(() => {
    refreshCamp?.();
  }, [refreshCamp]);

  useEffect(() => {
    if (isAudioUnlocked()) {
      startMenuAmbience();
      setSoundOn(true);
    }
  }, []);

  const enableSound = useCallback(() => {
    unlockAudio();
    startMenuAmbience();
    setSoundOn(true);
  }, []);

  const handlePointerDown = useCallback(() => {
    if (!isAudioUnlocked()) enableSound();
  }, [enableSound]);

  const enterCamp = useCallback(() => {
    unlockAudio();
    play('menuClick');
    stopMenuAmbience();
    (onCamp || onPlay)?.();
  }, [onCamp, onPlay]);

  const ach = achievementProgress(camp);
  const hasProgress =
    (camp?.runs || 0) > 0 ||
    (camp?.bank || 0) > 0 ||
    (camp?.windowsRebuilt || 0) > 0 ||
    ach.done > 0 ||
    Object.values(camp?.levels || {}).some((n) => n > 0);

  return (
    <div className="screen menu-screen" onPointerDown={handlePointerDown}>
      <MenuBackdrop />
      <div className="menu-bg menu-bg--overlay" />
      <div className={`menu-layout${customize ? ' menu-layout--customize' : ''}`}>
        <div className="menu-content">
          <p className="menu-eyebrow">The hamlet endures</p>
          <h1 className="menu-title">Killing for Pie!</h1>
          <p className="menu-sub">
            Hold the bunker. Board the windows. Spend your spoils. Survive the rounds.
          </p>
          {hasProgress && (
            <p className="menu-save-hint">
              Saved · {camp.bank} scrap · {camp.runs} run{camp.runs === 1 ? '' : 's'}
              {ach.done > 0 ? ` · ${ach.done}/${ach.total} ach` : ''}
            </p>
          )}
          <div className="menu-actions">
            <button
              type="button"
              className="menu-btn"
              onMouseEnter={() => {
                unlockAudio();
                play('menuHover');
              }}
              onClick={enterCamp}
            >
              Enter Camp
            </button>
            {onPlaySetup && (
              <button
                type="button"
                className="menu-btn menu-btn--ghost"
                onMouseEnter={() => {
                  unlockAudio();
                  play('menuHover');
                }}
                onClick={() => {
                  unlockAudio();
                  play('menuClick');
                  onPlaySetup();
                }}
              >
                Quick Play
              </button>
            )}
            <button
              type="button"
              className={`menu-btn menu-btn--ghost${customize ? ' menu-btn--active' : ''}`}
              onMouseEnter={() => {
                unlockAudio();
                play('menuHover');
              }}
              onClick={() => {
                unlockAudio();
                play('menuClick');
                setCustomize((v) => !v);
              }}
            >
              {customize ? 'Close Look' : 'Customize'}
            </button>
          </div>
          {!soundOn && (
            <p className="menu-sub" style={{ marginTop: '0.75rem', opacity: 0.7 }}>
              Click anywhere for sound
            </p>
          )}
          <ul className="menu-controls">
            {controlsLines(binds).map((row) => (
              <li key={row.keys + row.text}>
                <kbd>{row.keys}</kbd> {row.text}
              </li>
            ))}
          </ul>
        </div>
        {customize && <CharacterCustomize />}
      </div>
      <div className="menu-corner-btns">
        <SettingsButton onClick={() => setSettingsOpen(true)} />
        <MenuMuteButton />
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
