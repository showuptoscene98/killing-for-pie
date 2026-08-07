import React, { useEffect, useState } from 'react';
import { useCamp } from '../camp/CampContext';
import MenuBackdrop from './MenuBackdrop';
import MenuMuteButton from './MenuMuteButton';
import SettingsPanel, { SettingsButton } from './SettingsPanel';
import {
  startMenuAmbience,
  isAudioUnlocked,
  play,
  unlockAudio,
} from '../audio/sound';
import { MAP_LIST, loadSavedMapId, setActiveMap } from '../map/activeMap';
import AchievementsPanel from './AchievementsPanel';

export default function Camp({ runSummary, onDeploy, onMenu }) {
  const { camp, purchase, canBuy, costOf, upgrades, bonuses, refreshCamp } = useCamp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapId, setMapId] = useState(() => loadSavedMapId());

  useEffect(() => {
    refreshCamp?.();
  }, [refreshCamp]);

  useEffect(() => {
    if (isAudioUnlocked()) startMenuAmbience();
  }, []);

  const pickMap = (id) => {
    unlockAudio();
    play('menuHover');
    setMapId(id);
    setActiveMap(id);
  };

  return (
    <div className="screen camp-screen">
      <MenuBackdrop />
      <div className="menu-bg menu-bg--overlay" />
      <div className="camp-content">
        <p className="menu-eyebrow">Safehouse</p>
        <h1 className="menu-title camp-title">Camp</h1>
        <p className="menu-sub">
          Spend scrap on permanent loadout upgrades. Scrap, ranks, and unlocks
          autosave on this device — close the tab and they&apos;re still here.
        </p>

        {runSummary && (
          <div className="camp-deposit">
            <span className="stat-label">Last run deposited</span>
            <span className="camp-deposit-value">+{runSummary.earned} scrap</span>
            <span className="camp-deposit-meta">
              Round {runSummary.round} · {runSummary.kills} kills · {runSummary.points} pts
            </span>
          </div>
        )}

        <div className="camp-bank">
          <span className="stat-label">Scrap</span>
          <span className="camp-bank-value">{camp.bank}</span>
        </div>

        <div className="camp-upgrades">
          {Object.values(upgrades).map((up) => {
            const level = camp.levels[up.id] || 0;
            const maxed = level >= up.maxLevel;
            const cost = costOf(up.id);
            const affordable = canBuy(up.id);
            const effect =
              up.id === 'vitality'
                ? `+${Math.round(level * up.effectPerLevel * 100)}% HP`
                : up.id === 'quickHands'
                  ? `−${Math.round(level * up.effectPerLevel * 100)}% reload`
                  : `+${Math.round(level * up.effectPerLevel * 100)}% points`;

            return (
              <div key={up.id} className="camp-card">
                <div className="camp-card-top">
                  <h3>{up.name}</h3>
                  <span className="camp-rank">
                    Rank {level}/{up.maxLevel}
                  </span>
                </div>
                <p className="camp-card-desc">{up.desc}</p>
                <p className="camp-card-effect">{effect}</p>
                <button
                  type="button"
                  className="menu-btn camp-buy-btn"
                  disabled={maxed || !affordable}
                  onClick={() => purchase(up.id)}
                >
                  {maxed ? 'Maxed' : `Upgrade · ${cost}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="camp-active">
          <span>
            Active · HP ×{bonuses.hpMult.toFixed(2)} · Reload ×
            {bonuses.reloadMult.toFixed(2)} · Points ×{bonuses.pointsMult.toFixed(2)}
          </span>
        </div>

        <div className="camp-map-select">
          <p className="coop-section-label">Deploy map</p>
          <div className="coop-map-cards">
            {MAP_LIST.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`coop-map-card${mapId === m.id ? ' is-selected' : ''}`}
                onClick={() => pickMap(m.id)}
              >
                <span className="coop-map-name">{m.name}</span>
                <span className="coop-map-blurb">{m.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <AchievementsPanel camp={camp} />

        <div className="menu-actions">
          <button
            type="button"
            className="menu-btn"
            onClick={() => {
              setActiveMap(mapId);
              onDeploy(mapId);
            }}
          >
            Deploy
          </button>
          <button type="button" className="menu-btn menu-btn--ghost" onClick={onMenu}>
            Main Menu
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
