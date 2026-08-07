import React from 'react';

/** Full-screen overlay when coop relay drops mid-match or in lobby */
export default function CoopDisconnect({ message, onMenu, onCamp, onRetry }) {
  return (
    <div className="screen pause-screen coop-disconnect">
      <div className="menu-bg menu-bg--dim" />
      <div className="menu-content">
        <p className="menu-eyebrow">Connection lost</p>
        <h1 className="menu-title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
          Disconnected
        </h1>
        <p className="menu-sub">
          {message ||
            'Lost connection to the coop relay. The host may have closed the game or the LAN link dropped.'}
        </p>
        <div className="menu-actions">
          {onRetry && (
            <button type="button" className="menu-btn" onClick={onRetry}>
              Try Again
            </button>
          )}
          {onCamp && (
            <button
              type="button"
              className="menu-btn"
              onClick={onCamp}
            >
              Return to Camp
            </button>
          )}
          <button
            type="button"
            className="menu-btn menu-btn--ghost"
            onClick={onMenu}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
