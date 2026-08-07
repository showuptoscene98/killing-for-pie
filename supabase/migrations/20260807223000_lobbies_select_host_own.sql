-- Host must always SELECT their own lobby rows (incl. closed) so PostgREST
-- RETURNING after status='closed' does not 403.

DROP POLICY IF EXISTS lobbies_select ON public.lobbies;
CREATE POLICY lobbies_select ON public.lobbies
  FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    OR (
      status = ANY (ARRAY['open'::text, 'playing'::text])
      AND heartbeat_at > (now() - interval '45 seconds')
      AND (is_public = true OR public.are_friends(auth.uid(), host_id))
    )
  );
