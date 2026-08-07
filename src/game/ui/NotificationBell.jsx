import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocial } from '../net/SocialContext';
import { unlockAudio, play } from '../audio/sound';

/**
 * Grim-themed notification bell for friend requests + lobby invites.
 */
export default function NotificationBell({ onJoinLobby, onOpenFriends }) {
  const {
    available,
    notifications,
    unreadCount,
    acceptFriend,
    declineFriend,
    markNotificationRead,
    dismissAllNotifications,
  } = useSocial();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const toggle = useCallback(() => {
    unlockAudio();
    play('menuHover');
    setOpen((v) => !v);
  }, []);

  if (!available) return null;

  return (
    <div className="notif-bell" ref={rootRef}>
      <button
        type="button"
        className="hub-hud-btn notif-bell-btn"
        onClick={toggle}
        aria-label="Notifications"
        title="Notifications"
      >
        Alerts
        {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown hub-deploy-panel">
          <div className="notif-dropdown-head">
            <h3>Alerts</h3>
            {notifications.length > 0 && (
              <button
                type="button"
                className="menu-btn menu-btn--ghost notif-dismiss-all"
                onClick={() => {
                  unlockAudio();
                  play('menuClick');
                  dismissAllNotifications();
                }}
              >
                Clear
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="hub-invite-hint">No pending alerts.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => {
                const from = n.payload?.from_callsign || 'Survivor';
                if (n.type === 'friend_request') {
                  return (
                    <li key={n.id} className="notif-item">
                      <p className="notif-item-text">
                        <strong>{from}</strong> wants to squad up
                      </p>
                      <div className="notif-item-actions">
                        <button
                          type="button"
                          className="menu-btn"
                          disabled={busy === n.id}
                          onClick={async () => {
                            setBusy(n.id);
                            try {
                              unlockAudio();
                              play('menuClick');
                              if (n.payload?.friendship_id) {
                                await acceptFriend(n.payload.friendship_id);
                              }
                              await markNotificationRead(n.id);
                            } catch (err) {
                              console.warn(err);
                            } finally {
                              setBusy('');
                            }
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="menu-btn menu-btn--ghost"
                          disabled={busy === n.id}
                          onClick={async () => {
                            setBusy(n.id);
                            try {
                              if (n.payload?.friendship_id) {
                                await declineFriend(n.payload.friendship_id);
                              }
                              await markNotificationRead(n.id);
                            } finally {
                              setBusy('');
                            }
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  );
                }
                if (n.type === 'lobby_invite') {
                  const code = n.payload?.room_code || '';
                  return (
                    <li key={n.id} className="notif-item">
                      <p className="notif-item-text">
                        <strong>{from}</strong> invites you · {code}
                        {n.payload?.map_id ? ` · ${n.payload.map_id}` : ''}
                      </p>
                      <div className="notif-item-actions">
                        <button
                          type="button"
                          className="menu-btn"
                          disabled={!code || busy === n.id}
                          onClick={async () => {
                            setBusy(n.id);
                            try {
                              unlockAudio();
                              play('menuClick');
                              await markNotificationRead(n.id);
                              setOpen(false);
                              onJoinLobby?.(code);
                            } finally {
                              setBusy('');
                            }
                          }}
                        >
                          Join
                        </button>
                        <button
                          type="button"
                          className="menu-btn menu-btn--ghost"
                          onClick={() => markNotificationRead(n.id)}
                        >
                          Dismiss
                        </button>
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={n.id} className="notif-item">
                    <p className="notif-item-text">Unknown alert</p>
                    <button
                      type="button"
                      className="menu-btn menu-btn--ghost"
                      onClick={() => markNotificationRead(n.id)}
                    >
                      Dismiss
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {onOpenFriends && (
            <button
              type="button"
              className="menu-btn menu-btn--ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => {
                setOpen(false);
                onOpenFriends();
              }}
            >
              Friends
            </button>
          )}
        </div>
      )}
    </div>
  );
}
