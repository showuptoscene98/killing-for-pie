import React, { useCallback, useEffect, useState } from 'react';
import SettingsPanel from './SettingsPanel';
import { useCoop } from '../net/CoopContext';
import { play, unlockAudio } from '../audio/sound';
import {
  isFullscreen,
  toggleGameFullscreen,
  subscribeFullscreen,
} from '../display';

export default function PauseMenu({ onResume, onCamp, onMenu }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const [fs, setFs] = useState(() => isFullscreen());
  const { roomCode, inviteUrl, joinAddress, phase, backend } = useCoop();

  const code = roomCode || joinAddress || '';
  const canShowInvite = phase === 'playing' && !!code;

  useEffect(() => subscribeFullscreen(setFs), []);

  const copyCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied('code');
      play('menuClick');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  }, [code]);

  const copyLink = useCallback(async () => {
    const text = inviteUrl || code;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied('link');
      play('menuClick');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  }, [inviteUrl, code]);

  const onFullscreen = () => {
    unlockAudio();
    play('menuClick');
    toggleGameFullscreen(document.documentElement)
      .then((on) => setFs(!!on))
      .catch(() => {});
  };

  return (
    <div className="screen pause-screen">
      <div className="menu-bg menu-bg--dim" />
      <div className="menu-content">
        <h1 className="menu-title">Paused</h1>
        <p className="menu-sub">Esc again to continue · F11 fullscreen</p>
        {canShowInvite && inviteOpen && (
          <div className="hub-invite-card pause-invite-card">
            <p className="coop-section-label">
              {backend === 'lan' ? 'Join address' : 'Invite code'}
            </p>
            <div className="hub-invite-code">{code}</div>
            <div className="hub-invite-actions">
              <button type="button" className="menu-btn" onClick={copyCode}>
                {copied === 'code' ? 'Copied!' : 'Copy Code'}
              </button>
              {backend !== 'lan' && (
                <button
                  type="button"
                  className="menu-btn menu-btn--ghost"
                  onClick={copyLink}
                  disabled={!inviteUrl && !code}
                >
                  {copied === 'link' ? 'Copied!' : 'Copy Link'}
                </button>
              )}
            </div>
            <p className="hub-invite-hint">
              Friends can join mid-match with this code (spectate until the next deploy). Keep this
              tab open.
            </p>
          </div>
        )}
        <div className="menu-actions">
          <button type="button" className="menu-btn" onClick={onResume}>
            Resume
          </button>
          {canShowInvite && (
            <button
              type="button"
              className="menu-btn menu-btn--ghost"
              onClick={() => {
                unlockAudio();
                play('menuClick');
                setInviteOpen((v) => !v);
              }}
            >
              {inviteOpen ? 'Hide Invite Code' : 'Show Invite Code'}
            </button>
          )}
          <button
            type="button"
            className="menu-btn menu-btn--ghost"
            onClick={onFullscreen}
          >
            {fs ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            type="button"
            className="menu-btn menu-btn--ghost"
            onClick={() => {
              unlockAudio();
              play('menuClick');
              setSettingsOpen(true);
            }}
          >
            Settings
          </button>
          {onCamp && (
            <button
              type="button"
              className="menu-btn"
              onClick={() => {
                unlockAudio();
                play('menuClick');
                onCamp();
              }}
            >
              Return to Camp
            </button>
          )}
          <button type="button" className="menu-btn menu-btn--ghost" onClick={onMenu}>
            Main Menu
          </button>
        </div>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
