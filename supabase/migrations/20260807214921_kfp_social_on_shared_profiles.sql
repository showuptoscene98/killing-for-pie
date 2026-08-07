-- Applied against the shared Pie Guy Guide project (edmxyxwphjnspowcefkp),
-- which already had public.profiles with character_name/server/lfg_server_url.
-- Additive only: do NOT recreate profiles from the greenfield migration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS callsign text NOT NULL DEFAULT 'Survivor',
  ADD COLUMN IF NOT EXISTS friend_code text;

UPDATE public.profiles
SET friend_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE friend_code IS NULL OR btrim(friend_code) = '';

ALTER TABLE public.profiles
  ALTER COLUMN friend_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_callsign_len'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_callsign_len
      CHECK (char_length(callsign) BETWEEN 1 AND 16);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_friend_code_len'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_friend_code_len
      CHECK (char_length(friend_code) BETWEEN 6 AND 8);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_friend_code_uidx
  ON public.profiles (upper(friend_code));

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_uidx
  ON public.friendships (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  );

CREATE INDEX IF NOT EXISTS friendships_requester_idx ON public.friendships (requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee_id);

CREATE TABLE IF NOT EXISTS public.lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_code text NOT NULL,
  map_id text NOT NULL DEFAULT 'house',
  player_count int NOT NULL DEFAULT 1 CHECK (player_count >= 1 AND player_count <= 4),
  max_players int NOT NULL DEFAULT 4 CHECK (max_players BETWEEN 1 AND 4),
  is_public boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'playing', 'closed')),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lobbies_room_code_len CHECK (char_length(room_code) BETWEEN 4 AND 24)
);

CREATE UNIQUE INDEX IF NOT EXISTS lobbies_host_open_uidx
  ON public.lobbies (host_id)
  WHERE status IN ('open', 'playing');

CREATE INDEX IF NOT EXISTS lobbies_browser_idx
  ON public.lobbies (status, is_public, heartbeat_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('friend_request', 'lobby_invite')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.friend_code IS NOT NULL AND upper(p.friend_code) = code
    );
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seed text;
  code text;
BEGIN
  seed := coalesce(nullif(trim(NEW.raw_user_meta_data->>'callsign'), ''), 'Survivor');
  code := public.generate_friend_code();
  -- character_name stays empty for KFP anon users so we don't collide with
  -- Pie Guy Guide's unique (character_name, server) constraint.
  INSERT INTO public.profiles (id, callsign, friend_code, character_name, updated_at)
  VALUES (
    NEW.id,
    left(seed, 16),
    code,
    coalesce(nullif(trim(NEW.raw_user_meta_data->>'character_name'), ''), ''),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    callsign = COALESCE(NULLIF(public.profiles.callsign, ''), EXCLUDED.callsign),
    friend_code = COALESCE(public.profiles.friend_code, EXCLUDED.friend_code),
    updated_at = now();
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.generate_friend_code() TO postgres, supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = a AND f.addressee_id = b)
        OR (f.requester_id = b AND f.addressee_id = a)
      )
  );
$$;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_friend_link(auth.uid(), id)
  );

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

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

CREATE OR REPLACE FUNCTION public.list_open_lobbies()
RETURNS TABLE (
  id uuid,
  host_id uuid,
  host_callsign text,
  room_code text,
  map_id text,
  player_count integer,
  max_players integer,
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

CREATE OR REPLACE FUNCTION public.prune_stale_lobbies()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  UPDATE public.lobbies
  SET status = 'closed'
  WHERE status IN ('open', 'playing')
    AND heartbeat_at < now() - interval '45 seconds';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

DROP POLICY IF EXISTS friendships_select ON public.friendships;
CREATE POLICY friendships_select ON public.friendships
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS friendships_insert ON public.friendships;
CREATE POLICY friendships_insert ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND requester_id <> addressee_id);

DROP POLICY IF EXISTS friendships_respond ON public.friendships;
CREATE POLICY friendships_respond ON public.friendships
  FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid());

DROP POLICY IF EXISTS friendships_delete ON public.friendships;
CREATE POLICY friendships_delete ON public.friendships
  FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS lobbies_select ON public.lobbies;
CREATE POLICY lobbies_select ON public.lobbies
  FOR SELECT TO authenticated
  USING (
    is_public
    OR host_id = auth.uid()
    OR public.are_friends(auth.uid(), host_id)
  );

DROP POLICY IF EXISTS lobbies_insert ON public.lobbies;
CREATE POLICY lobbies_insert ON public.lobbies
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS lobbies_update ON public.lobbies;
CREATE POLICY lobbies_update ON public.lobbies
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS lobbies_delete ON public.lobbies;
CREATE POLICY lobbies_delete ON public.lobbies
  FOR DELETE TO authenticated
  USING (host_id = auth.uid());

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    (payload->>'from_id')::uuid = auth.uid()
    AND (
      type = 'friend_request'
      OR (
        type = 'lobby_invite'
        AND public.are_friends(auth.uid(), user_id)
      )
    )
  );

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_friend_link(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_friend_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Invokers still need EXECUTE even for SECURITY DEFINER (RLS policies call these).
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.has_friend_link(uuid, uuid) TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.generate_friend_code() TO postgres, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, supabase_auth_admin;

REVOKE ALL ON FUNCTION public.find_profile_by_friend_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_open_lobbies() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prune_stale_lobbies() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.find_profile_by_friend_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_open_lobbies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_stale_lobbies() TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.lobbies;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
