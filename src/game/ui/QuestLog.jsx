import React from 'react';
import { useCamp } from '../camp/CampContext';

export default function QuestLog({ open, onClose }) {
  const { questLog } = useCamp();
  if (!open) return null;

  const { active = [], completed = [], available = [] } = questLog || {};

  return (
    <div className="quest-log-overlay" role="dialog" aria-modal="true">
      <div className="quest-log-panel">
        <div className="quest-log-head">
          <h2>Quest Log</h2>
          <button type="button" className="menu-btn menu-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <section className="quest-log-section">
          <h3>Active</h3>
          {active.length === 0 && <p className="quest-log-empty">No active quests.</p>}
          {active.map((q) => (
            <div key={q.id} className="quest-log-item">
              <div className="quest-log-title">{q.title}</div>
              <div className="quest-log-step">
                Step {q.stepIndex + 1}/{q.stepTotal}: {q.currentStep}
                {q.progressMax > 0
                  ? ` (${Math.min(q.progress, q.progressMax)}/${q.progressMax})`
                  : ''}
                {q.readyToTurnIn ? ' · Ready to turn in' : ''}
              </div>
              {q.blurb && <div className="quest-log-blurb">{q.blurb}</div>}
            </div>
          ))}
        </section>

        <section className="quest-log-section">
          <h3>Available</h3>
          {available.length === 0 && (
            <p className="quest-log-empty">Talk to NPCs for jobs.</p>
          )}
          {available.map((q) => (
            <div key={q.id} className="quest-log-item quest-log-item--avail">
              <div className="quest-log-title">{q.title}</div>
              <div className="quest-log-blurb">
                {q.blurb} · Ask {q.giver}
              </div>
            </div>
          ))}
        </section>

        <section className="quest-log-section">
          <h3>Completed</h3>
          {completed.length === 0 && <p className="quest-log-empty">None yet.</p>}
          {completed.map((q) => (
            <div key={q.id} className="quest-log-item quest-log-item--done">
              <div className="quest-log-title">{q.title}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
