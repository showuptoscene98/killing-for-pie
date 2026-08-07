import { ACHIEVEMENTS, achievementProgress } from '../camp/achievements';

export default function AchievementsPanel({ camp }) {
  const unlocked = camp?.achievements?.unlocked || {};
  const { done, total } = achievementProgress(camp);

  return (
    <div className="achievements-panel">
      <div className="achievements-head">
        <h3 className="achievements-title">Achievements</h3>
        <span className="achievements-count">
          {done}/{total}
        </span>
      </div>
      <div className="achievements-grid">
        {ACHIEVEMENTS.map((a) => {
          const on = !!unlocked[a.id];
          return (
            <div
              key={a.id}
              className={`achievement-card${on ? ' achievement-card--on' : ''}`}
              title={a.desc}
            >
              <span className="achievement-icon" aria-hidden>
                {a.icon}
              </span>
              <div className="achievement-meta">
                <span className="achievement-name">{a.name}</span>
                <span className="achievement-desc">{a.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
