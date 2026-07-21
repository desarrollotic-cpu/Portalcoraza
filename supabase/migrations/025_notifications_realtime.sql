-- Enable Supabase Realtime for notifications (openspec 2.8).
-- Equivalent to Dashboard → Database → Replication → enable `notifications`.
--
-- Security model (openspec design.md Decisión 3): NestJS owns CRUD via DATABASE_URL;
-- Angular subscribes with the publishable/anon key and filters by user_id.
-- Do NOT enable RLS without SELECT policies for anon — that would silently drop
-- postgres_changes events (custom JWT is not Supabase Auth).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
