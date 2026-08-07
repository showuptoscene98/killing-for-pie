import React, { useEffect, useState } from 'react';

export default function GameOver({
  round,
  kills,
  points,
  onCamp,
  onRestart,
  onMenu,
}) {
  const [secs, setSecs] = useState(3);

  useEffect(() => {
    const id = setInterval(() => {
      setSecs((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="screen gameover-screen">
      <div className="menu-bg" />
      <div className="menu-content">
        <h1 className="menu-title gameover-title">Game Over</h1>
        <p className="menu-sub">You survived to round {round}</p>
        <div className="stats-row">
          <div>
            <span className="stat-label">Kills</span>
            <span className="stat-value">{kills}</span>
          </div>
          <div>
            <span className="stat-label">Points</span>
            <span className="stat-value">{points}</span>
          </div>
          <div>
            <span className="stat-label">Round</span>
            <span className="stat-value">{round}</span>
          </div>
        </div>
        <p className="menu-sub" style={{ marginTop: 0 }}>
          Scrap banked. Returning to camp{secs > 0 ? ` in ${secs}…` : '…'}
        </p>
        <div className="menu-actions">
          <button type="button" className="menu-btn" onClick={onCamp}>
            Return to Camp
          </button>
          {onRestart && onRestart !== onCamp && (
            <button type="button" className="menu-btn menu-btn--ghost" onClick={onRestart}>
              Retry
            </button>
          )}
          <button type="button" className="menu-btn menu-btn--ghost" onClick={onMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
