-- ProbNexus: User Session Tracking Migration
-- Creates user_sessions table. Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS user_sessions (
  id                TEXT        PRIMARY KEY,
  user_id           TEXT        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  login_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at         TIMESTAMPTZ,
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id       ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active     ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at      ON user_sessions(login_at);
