-- Core extension for multi-post assignment and user permission overrides

CREATE TABLE IF NOT EXISTS user_posts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_user_posts_user ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_post ON user_posts(post_id);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
