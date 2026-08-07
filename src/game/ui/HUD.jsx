import React, { useEffect, useState } from 'react';
import { useGame } from '../GameContext';
import { WEAPONS } from '../weapons/weaponDefs';

export default function HUD() {
  const { hud, stateRef } = useGame();
  const [aiming, setAiming] = useState(false);
  const spectating =
    hud.coop &&
    (hud.coopSpectating || hud.status === 'dead' || hud.status === 'downed') &&
    !hud.coopMatchOver;

  useEffect(() => {
    let id = 0;
    const tick = () => {
      const s = stateRef.current;
      const slot = s.weapons?.[s.activeWeapon];
      const def = slot ? WEAPONS[slot.id] : null;
      const next =
        !spectating &&
        s.status === 'playing' &&
        !!def?.adsFov &&
        (s.adsAmount || 0) > 0.45;
      setAiming((prev) => (prev === next ? prev : next));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [stateRef, spectating]);

  if (
    (hud.status === 'dead' || hud.status === 'paused' || hud.status === 'downed') &&
    !spectating
  ) {
    return null;
  }

  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100);
  const lowHp = !spectating && hud.hp <= 40;

  return (
    <div className={`hud ${lowHp ? 'hud--hurt' : ''}${spectating ? ' hud--spectate' : ''}`}>
      {!spectating && (
        <div className={`crosshair${aiming ? ' crosshair--scoped' : ''}`}>
          {aiming ? (
            <>
              <div className="scope-lens" />
              <div className="scope-ring" />
              <div className="scope-cross-h" />
              <div className="scope-cross-v" />
              <div className="scope-hash scope-hash--h1" />
              <div className="scope-hash scope-hash--h2" />
              <div className="scope-hash scope-hash--v1" />
              <div className="scope-hash scope-hash--v2" />
              <div className="scope-dot" />
            </>
          ) : (
            <>
              <span />
              <span />
              <span />
              <span />
            </>
          )}
        </div>
      )}
      {!spectating && aiming && <div className="scope-vignette" aria-hidden />}

      {hud.roundBanner && (
        <div className="round-banner" key={hud.roundBanner}>
          {hud.roundBanner}
        </div>
      )}

      {!spectating && (hud.instaKill > 0 || hud.doublePoints > 0) && (
        <div className="powerup-status">
          {hud.instaKill > 0 && (
            <div className="powerup-chip powerup-chip--insta">
              INSTA-KILL <span>{hud.instaKill}s</span>
            </div>
          )}
          {hud.doublePoints > 0 && (
            <div className="powerup-chip powerup-chip--x2">
              x2 POINTS <span>{hud.doublePoints}s</span>
            </div>
          )}
        </div>
      )}

      <div className="hud-round">
        <span className="hud-label">Round</span>
        <span className="hud-round-num">{hud.round || 1}</span>
      </div>

      {!spectating && (
        <div className={`hud-points${hud.doublePoints > 0 ? ' hud-points--x2' : ''}`}>
          <span className="points-value">{hud.points}</span>
        </div>
      )}

      {!spectating && (
        <div className={`hud-health${lowHp ? ' hud-health--low' : ''}`}>
          <div className="hp-meta">
            <span className="hp-label">Health</span>
            <span className="hp-value">
              {Math.ceil(hud.hp)}
              <span className="hp-max">/{hud.maxHp}</span>
            </span>
          </div>
          <div className="hp-bar" role="progressbar" aria-valuenow={Math.ceil(hud.hp)} aria-valuemin={0} aria-valuemax={hud.maxHp}>
            <div className="hp-fill" style={{ width: `${hpPct}%` }} />
            <div className="hp-ticks" aria-hidden>
              <span /><span /><span /><span />
            </div>
          </div>
        </div>
      )}

      {!spectating && (
        <div className="hud-ammo">
          <div className="weapon-name">
            {hud.reloading ? 'RELOADING...' : hud.weaponName}
          </div>
          <div className="ammo-count">
            <span className="mag">{hud.mag}</span>
            <span className="sep">/</span>
            <span className="reserve">{hud.reserve}</span>
          </div>
        </div>
      )}

      {!spectating && hud.interactPrompt && (
        <div className="interact-prompt">{hud.interactPrompt.label}</div>
      )}

      {hud.roundPhase === 'intermission' && hud.round > 0 && (
        <div className="intermission">
          Next round in {hud.intermissionTimer}s
        </div>
      )}

      {hud.coop && hud.squad?.length > 0 && (
        <div className="hud-squad">
          {hud.squad.map((p) => {
            const downed = p.status === 'downed';
            const pct = downed
              ? Math.max(0, (p.reviveProgress || 0) * 100)
              : Math.max(0, ((p.hp || 0) / (p.maxHp || 100)) * 100);
            return (
              <div
                key={p.id}
                className={`squad-row${p.status === 'dead' ? ' is-dead' : ''}${
                  downed ? ' is-downed' : ''
                }${
                  spectating && hud.spectateName === p.name
                    ? ' is-spectate-target'
                    : ''
                }`}
              >
                <span className="squad-name">
                  {p.name}
                  {downed ? ' · DOWN' : ''}
                </span>
                <div className="squad-hp">
                  <div
                    className={`squad-hp-fill${downed ? ' squad-hp-fill--revive' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="hud-hint">
        {hud.status === 'downed'
          ? `Bleedout ${Math.ceil(hud.bleedoutTimer || 0)}s · teammates hold F to revive`
          : spectating
            ? `[ ] or ← → cycle player · Esc menu when match ends`
            : 'WASD move · Mouse aim · LMB shoot · RMB scope · Space jump · Shift sprint · Ctrl slide · R reload · F buy/revive · Esc pause'}
      </div>
    </div>
  );
}
