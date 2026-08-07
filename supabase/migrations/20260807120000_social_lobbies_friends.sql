-- Profiles, friendships, lobbies, notifications for KFP social

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  callsign text NOT NULL DEFAULT 'Survivor',
  friend_code text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_callsign_len CHECK (char_length(callsign) BETWEEN 1 AND 16),
  CONSTRAINT profiles_friend_code_len CHECK (char_length(friend_code) BETWEEN 6 AND 8)
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_friend_code_uidx ON public.profiles (upper(friend_code));

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
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

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
      SELECT 1 FROM public.profiles p WHERE upper(p.friend_code) = code
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
BEGIN
  seed := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'callsign'), ''),
    'Survivor'
  );
  INSERT INTO public.profiles (id, callsign, friend_code)
  VALUES (NEW.id, left(seed, 16), public.generate_friend_code())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

CREATE OR REPLACE FUNCTION public.prune_stale_lobbies()
RETURNS int
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

GRANT EXECUTE ON FUNCTION public.prune_stale_lobbies() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated, anon;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS friendships_select ON public.friendships;
CREATE POLICY friendships_select ON public.friendships
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS friendships_insert ON public.friendships;
CREATE POLICY friendships_insert ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS friendships_update ON public.friendships;
CREATE POLICY friendships_update ON public.friendships
  FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid() OR requester_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid() OR requester_id = auth.uid());

DROP POLICY IF EXISTS lobbies_select ON public.lobbies;
CREATE POLICY lobbies_select ON public.lobbies
  FOR SELECT TO authenticated
  USING (
    status IN ('open', 'playing')
    AND (
      host_id = auth.uid()
      OR is_public = true
      OR public.are_friends(auth.uid(), host_id)
    )
    AND heartbeat_at > now() - interval '45 seconds'
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
  WITH CHECK ((payload->>'from_id')::uuid = auth.uid());

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
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
END $$;
