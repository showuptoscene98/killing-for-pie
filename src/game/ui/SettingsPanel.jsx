import { useCallback, useEffect, useState } from 'react';
import {
  unlockAudio,
  play,
  isSoundMuted,
  toggleSoundMuted,
} from '../audio/sound';
import {
  getVolume,
  setVolume,
  getLookSensMultiplier,
  setLookSensMultiplier,
  getBodyStyle,
  setBodyStyle,
  subscribeSettings,
} from '../settings';
import {
  isFullscreen,
  toggleGameFullscreen,
  subscribeFullscreen,
} from '../display';
import {
  KEYBIND_ORDER,
  KEYBIND_LABELS,
  getKeybinds,
  setKeybind,
  resetKeybinds,
  formatKeyCode,
  isBlockedCode,
  subscribeKeybinds,
} from '../keybinds';
import { useCamp } from '../camp/CampContext';
import { useSocial } from '../net/SocialContext';
import { useCoop } from '../net/CoopContext';

export default function SettingsPanel({ open, onClose }) {
  const { camp, wipeProgress, refreshCamp } = useCamp();
  const social = useSocial();
  const { setLocalName } = useCoop();
  const [volume, setVol] = useState(() => getVolume());
  const [sens, setSens] = useState(() => getLookSensMultiplier());
  const [muted, setMuted] = useState(() => isSoundMuted());
  const [bodyStyle, setBodyStyleUi] = useState(() => getBodyStyle());
  const [binds, setBinds] = useState(() => getKeybinds());
  const [listening, setListening] = useState(null); // action id or null
  const [bindError, setBindError] = useState('');
  const [fs, setFs] = useState(() => isFullscreen());
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [callsignDraft, setCallsignDraft] = useState('');

  useEffect(() => {
    if (open && social?.callsign) setCallsignDraft(social.callsign);
  }, [open, social?.callsign]);

  useEffect(() => {
    if (!open) return undefined;
    return subscribeSettings((s) => {
      setVol(s.volume);
      setSens(s.lookSens);
      setMuted(s.muted);
      if (s.bodyStyle) setBodyStyleUi(s.bodyStyle);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    return subscribeFullscreen(setFs);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    return subscribeKeybinds((b) => setBinds(b));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setListening(null);
      setBindError('');
      setConfirmWipe(false);
    } else {
      refreshCamp?.();
    }
  }, [open, refreshCamp]);

  // Esc: cancel rebind first, else close panel
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (listening) {
        setListening(null);
        setBindError('');
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose, listening]);

  // Capture next key while rebinding
  useEffect(() => {
    if (!open || !listening) return undefined;

    const onKey = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.code === 'Escape') return; // handled above

      if (isBlockedCode(e.code)) {
        setBindError('That key is reserved');
        play('menuHover');
        return;
      }

      const result = setKeybind(listening, e.code);
      if (!result.ok) {
        setBindError(result.error || 'Could not bind');
        return;
      }
      setBinds(result.binds);
      setListening(null);
      setBindError('');
      unlockAudio();
      play('menuClick');
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, listening]);

  const onVolume = useCallback((e) => {
    unlockAudio();
    setVolume(Number(e.target.value) / 100);
  }, []);

  const onSens = useCallback((e) => {
    setLookSensMultiplier(Number(e.target.value) / 100);
  }, []);

  const onMute = useCallback((e) => {
    e.stopPropagation();
    unlockAudio();
    const next = toggleSoundMuted();
    setMuted(next);
    if (!next) play('menuClick');
  }, []);

  const startListen = useCallback((action) => {
    unlockAudio();
    play('menuHover');
    setBindError('');
    setListening(action);
  }, []);

  const onResetBinds = useCallback(() => {
    unlockAudio();
    play('menuClick');
    setBinds(resetKeybinds());
    setListening(null);
    setBindError('');
  }, []);

  const onWipeProgress = useCallback(() => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      return;
    }
    unlockAudio();
    play('menuClick');
    wipeProgress();
    setConfirmWipe(false);
  }, [confirmWipe, wipeProgress]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose} role="presentation">
      <div
        className="settings-panel settings-panel--wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <h2 className="settings-title">Settings</h2>

        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="settings-section-title">Character style</h3>
          </div>
          <p className="settings-hint">
            Block = soft boxes. Low-poly = sausage capsules. Applies to zombies, NPCs,
            and remotes.
          </p>
          <div className="hub-deploy-modes" style={{ marginTop: 8 }}>
            {[
              { id: 'block', label: 'Block' },
              { id: 'lowpoly', label: 'Low-poly' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`hub-mode-btn${bodyStyle === opt.id ? ' is-selected' : ''}`}
                onClick={() => {
                  unlockAudio();
                  play('menuClick');
                  setBodyStyle(opt.id);
                  setBodyStyleUi(opt.id);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {social?.available && (
          <div className="settings-section">
            <div className="settings-section-head">
              <h3 className="settings-section-title">Callsign</h3>
            </div>
            <p className="settings-hint">
              Shown in co-op and the server browser. Friend code:{' '}
              <strong>{social.friendCode || '…'}</strong>
            </p>
            <label className="hub-join-field" style={{ marginTop: 0 }}>
              <span>Display name</span>
              <input
                value={callsignDraft}
                maxLength={16}
                onChange={(e) => setCallsignDraft(e.target.value)}
                onBlur={() => {
                  const n = callsignDraft.trim().slice(0, 16) || 'Survivor';
                  social.setCallsign(n);
                  setLocalName?.(n);
                }}
              />
            </label>
          </div>
        )}

        <label className="settings-row">
          <span className="settings-label">Volume</span>
          <span className="settings-value">{Math.round(volume * 100)}%</span>
          <input
            type="range"
            className="settings-slider"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={onVolume}
            disabled={muted}
          />
        </label>

        <label className="settings-row">
          <span className="settings-label">Turn Sensitivity</span>
          <span className="settings-value">{sens.toFixed(2)}×</span>
          <input
            type="range"
            className="settings-slider"
            min={25}
            max={250}
            value={Math.round(sens * 100)}
            onChange={onSens}
          />
        </label>

        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="settings-section-title">Keybinds</h3>
            <button
              type="button"
              className="settings-reset-btn"
              onClick={onResetBinds}
            >
              Reset
            </button>
          </div>
          <p className="settings-hint">
            {listening
              ? `Press a key for ${KEYBIND_LABELS[listening]}… (Esc to cancel)`
              : 'Click a bind, then press a new key. Conflicts swap.'}
          </p>
          {bindError && <p className="settings-bind-error">{bindError}</p>}
          <div className="keybind-list">
            {KEYBIND_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={`keybind-row${listening === id ? ' is-listening' : ''}`}
                onClick={() => startListen(id)}
              >
                <span className="keybind-action">{KEYBIND_LABELS[id]}</span>
                <kbd className="keybind-key">
                  {listening === id ? '…' : formatKeyCode(binds[id])}
                </kbd>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="settings-section-title">Progress</h3>
          </div>
          <p className="settings-hint">
            Scrap, upgrades, and character unlocks autosave in this browser
            ({camp.bank} scrap · {camp.runs} runs).
          </p>
          <button
            type="button"
            className="settings-reset-btn"
            onClick={onWipeProgress}
          >
            {confirmWipe ? 'Confirm wipe save?' : 'Reset camp progress'}
          </button>
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="menu-btn menu-btn--ghost"
            onClick={() => {
              unlockAudio();
              play('menuClick');
              toggleGameFullscreen(document.documentElement)
                .then((on) => setFs(!!on))
                .catch(() => {});
            }}
          >
            {fs ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            type="button"
            className={`menu-btn menu-btn--ghost${muted ? ' is-muted-toggle' : ''}`}
            onClick={onMute}
          >
            {muted ? 'Sound Off' : 'Sound On'}
          </button>
          <button type="button" className="menu-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton({ onClick }) {
  return (
    <button
      type="button"
      className="menu-settings-btn"
      onClick={(e) => {
        e.stopPropagation();
        unlockAudio();
        play('menuClick');
        onClick?.(e);
      }}
      aria-label="Open settings"
      title="Settings"
    >
      Settings
    </button>
  );
}
