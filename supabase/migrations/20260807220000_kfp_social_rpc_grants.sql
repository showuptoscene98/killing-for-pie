-- Follow-up grants after kfp_social_on_shared_profiles (already applied remotely
-- as kfp_social_rpc_grants / fix_auth_trigger_grants / fix_rls_helper_execute).

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

REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_friend_link(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_friend_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_profile_by_friend_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_open_lobbies() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prune_stale_lobbies() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.has_friend_link(uuid, uuid) TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.generate_friend_code() TO postgres, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.find_profile_by_friend_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_open_lobbies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_stale_lobbies() TO authenticated;
