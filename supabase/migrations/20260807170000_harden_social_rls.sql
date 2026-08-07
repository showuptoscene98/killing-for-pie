-- Close four holes in the initial social policies:
--   1. profiles_select USING (true) let any guest dump every row, including
--      friend_code — the one secret the "add by code" flow depends on.
--   2. friendships_update allowed requester_id = auth.uid(), so a requester
--      could flip their own pending request to 'accepted' and force-friend
--      anyone. Only the addressee may answer a request now.
--   3. notifications_insert only checked payload.from_id, so any user could
--      push notifications at any other user with no relationship at all.
--   4. Nothing let either party remove a friendship (unfriend / cancel).

-- SECURITY DEFINER so policies can consult these tables without tripping over
-- the very RLS policies being defined (which would recurse).

CREATE OR REPLACE FUNCTION public.has_friend_link(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.requester_id = a AND f.addressee_id = b)
       OR (f.requester_id = b AND f.addressee_id = a)
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_friend_link(uuid, uuid) TO authenticated;

-- Profiles: yourself, confirmed friends, and the counterpart of a friendship
-- row you are already part of (so a pending request can render a name).
-- Lobby host names deliberately do NOT come from here — see list_open_lobbies.
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_friend_link(auth.uid(), id)
  );

-- Add-by-code needs to resolve exactly one stranger's profile without granting
-- read access to the table. Returns the id and callsign only, never the code,
-- so codes stay unenumerable.
CREATE OR REPLACE FUNCTION public.find_profile_by_friend_code(code text)
RETURNS TABLE (id uuid, callsign text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.callsign
  FROM public.profiles p
  WHERE upper(p.friend_code) = upper(trim(code))
    AND p.id <> auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_profile_by_friend_code(text) TO authenticated;

-- The browser needs host callsigns for lobbies whose hosts are strangers.
-- Returning them through a definer function keeps friend_code out of reach.
CREATE OR REPLACE FUNCTION public.list_open_lobbies()
RETURNS TABLE (
  id uuid,
  host_id uuid,
  host_callsign text,
  room_code text,
  map_id text,
  player_count int,
  max_players int,
  is_public boolean,
  status text,
  heartbeat_at timestamptz,
  is_friend boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.host_id,
    p.callsign AS host_callsign,
    l.room_code,
    l.map_id,
    l.player_count,
    l.max_players,
    l.is_public,
    l.status,
    l.heartbeat_at,
    public.are_friends(auth.uid(), l.host_id) AS is_friend
  FROM public.lobbies l
  JOIN public.profiles p ON p.id = l.host_id
  WHERE l.status = 'open'
    AND l.heartbeat_at > now() - interval '45 seconds'
    AND (
      l.is_public
      OR l.host_id = auth.uid()
      OR public.are_friends(auth.uid(), l.host_id)
    )
  ORDER BY l.heartbeat_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.list_open_lobbies() TO authenticated;

-- Friendships: only the addressee answers, and only a pending row. USING sees
-- the old row, WITH CHECK the new one, which pins the allowed transition.
DROP POLICY IF EXISTS friendships_update ON public.friendships;
DROP POLICY IF EXISTS friendships_respond ON public.friendships;
CREATE POLICY friendships_respond ON public.friendships
  FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    addressee_id = auth.uid()
    AND status IN ('accepted', 'declined')
  );

-- Either side may unfriend, and a requester cancels by deleting.
DROP POLICY IF EXISTS friendships_delete ON public.friendships;
CREATE POLICY friendships_delete ON public.friendships
  FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Notifications: a real relationship must already exist. A friend request is
-- only allowed once the friendship row is in place (the client inserts it
-- first); a lobby invite requires an accepted friendship.
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    (payload->>'from_id')::uuid = auth.uid()
    AND user_id <> auth.uid()
    AND (
      (type = 'friend_request' AND public.has_friend_link(auth.uid(), user_id))
      OR (type = 'lobby_invite' AND public.are_friends(auth.uid(), user_id))
    )
  );

DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Match the client's default deploy map (Pie Yard), not the old 'house'.
ALTER TABLE public.lobbies ALTER COLUMN map_id SET DEFAULT 'camp';
