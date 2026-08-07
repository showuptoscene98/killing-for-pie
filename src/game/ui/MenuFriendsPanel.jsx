import { useCallback, useEffect, useState } from 'react';
import { useSocial } from '../net/SocialContext';
import { MAP_LIST } from '../map/activeMap';
import { unlockAudio, play } from '../audio/sound';

function mapLabel(id) {
  return MAP_LIST.find((m) => m.id === id)?.name || id;
}

/**
 * Main-menu friends rail: join friend lobbies / paste a squad code.
 */
export default function MenuFriendsPanel({ onJoinLobby }) {
  const social = useSocial();
  const [joinInput, setJoinInput] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!social.available) return undefined;
    social.listLobbies?.({ tab: 'friends' });
    const id = setInterval(() => {
      social.listLobbies?.({ tab: 'friends' });
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listLobbies identity churns
  }, [social.available, social.friends?.length]);

  const join = useCallback(
    async (code) => {
      const room = String(code || '')
        .trim()
        .toUpperCase();
      if (!room || !onJoinLobby) return;
      setBusy(room);
      setMsg('');
      try {
        unlockAudio();
        play('menuClick');
        onJoinLobby(room);
      } catch (err) {
        setMsg(err?.message || 'Join failed');
        setBusy('');
      }
    },
    [onJoinLobby]
  );

  const friendLobbies = (social.lobbies || []).filter((r) => r.isFriend);

  return (
    <aside className="menu-friends-panel">
      <h3 className="menu-friends-title">Join Friends</h3>
      <p className="menu-friends-sub">Drop into a squad mate&apos;s camp or match.</p>

      {!social.configured ? (
        <p className="hub-invite-hint">
          Friends need Supabase keys in .env.local.
        </p>
      ) : !social.ready ? (
        <p className="hub-invite-hint">Connecting…</p>
      ) : !social.available ? (
        <p className="hub-invite-hint">
          {social.error || 'Friends offline — check Anonymous Sign-Ins.'}
        </p>
      ) : (
        <>
          <p className="coop-section-label">Live lobbies</p>
          <ul className="hub-browser-list menu-friends-list">
            {friendLobbies.length === 0 && (
              <li className="is-empty">No friends hosting right now.</li>
            )}
            {friendLobbies.map((row) => (
              <li key={row.id}>
                <div className="hub-browser-row">
                  <div>
                    <span className="hub-browser-host">{row.hostCallsign}</span>
                    <span className="hub-browser-meta">
                      {mapLabel(row.map_id)} · {row.player_count}/{row.max_players} · open
                    </span>
                  </div>
                  <button
                    type="button"
                    className="menu-btn"
                    disabled={!!busy}
                    onMouseEnter={() => {
                      unlockAudio();
                      play('menuHover');
                    }}
                    onClick={() => join(row.room_code)}
                  >
                    Join
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <label className="hub-join-field menu-friends-join">
            <span>Join by code</span>
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              placeholder="ROOM"
              maxLength={12}
              onKeyDown={(e) => {
                if (e.key === 'Enter') join(joinInput);
              }}
            />
          </label>
          <button
            type="button"
            className="menu-btn"
            style={{ width: '100%' }}
            disabled={!!busy || joinInput.trim().length < 4}
            onMouseEnter={() => {
              unlockAudio();
              play('menuHover');
            }}
            onClick={() => join(joinInput)}
          >
            Join Squad
          </button>
          {msg && <p className="hub-invite-hint">{msg}</p>}

          <p className="coop-section-label" style={{ marginTop: '1rem' }}>
            Squad mates
          </p>
          <ul className="hub-squad-list menu-friends-squad">
            {(social.friends || []).length === 0 && (
              <li className="is-empty">No friends yet — add codes in Camp.</li>
            )}
            {(social.friends || []).map((f) => {
              const live = friendLobbies.find(
                (r) => r.host_id === f.id || r.hostCallsign === f.callsign
              );
              return (
                <li key={f.id}>
                  <span>{f.callsign}</span>
                  {live ? (
                    <button
                      type="button"
                      className="menu-btn menu-btn--ghost"
                      disabled={!!busy}
                      onClick={() => join(live.room_code)}
                    >
                      Join
                    </button>
                  ) : (
                    <span className="hub-browser-meta"> offline</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </aside>
  );
}
