-- Índice para la purga diaria de notificaciones (migración hermana de la 086).
--
-- `idx_notifications_user` encabeza por `user_id`, así que no sirve para barrer
-- la tabla por fecha. La purga filtra por `read_at` y por `created_at`.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_notifications_read_at
  ON notifications (read_at)
  WHERE read_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at_unread
  ON notifications (created_at)
  WHERE read_at IS NULL;

COMMIT;
