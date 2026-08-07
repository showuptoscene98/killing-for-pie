import { useCallback, useEffect, useState } from 'react';
import {
  unlockAudio,
  play,
  isSoundMuted,
  toggleSoundMuted,
} from '../audio/sound';
import { subscribeSettings } from '../settings';

export default function MenuMuteButton() {
  const [muted, setMuted] = useState(() => isSoundMuted());

  useEffect(() => subscribeSettings((s) => setMuted(s.muted)), []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    unlockAudio();
    const next = toggleSoundMuted();
    setMuted(next);
    if (!next) play('menuClick');
  }, []);

  return (
    <button
      type="button"
      className={`menu-mute-btn${muted ? ' is-muted' : ''}`}
      onClick={handleClick}
      aria-pressed={muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      title={muted ? 'Sound Off — click to unmute' : 'Sound On — click to mute'}
    >
      {muted ? 'Sound Off' : 'Sound On'}
    </button>
  );
}
