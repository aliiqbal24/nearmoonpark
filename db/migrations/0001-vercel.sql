CREATE TABLE IF NOT EXISTS moon_profile (
  user_id text PRIMARY KEY,
  player_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS moon_provisioning (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  session_key text NOT NULL,
  player_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'ready')),
  ip text NOT NULL,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS moon_provisioning_created ON moon_provisioning(created_at);
CREATE INDEX IF NOT EXISTS moon_provisioning_ip_created ON moon_provisioning(ip, created_at);

CREATE TABLE IF NOT EXISTS provisioning (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  session_key text NOT NULL,
  status text NOT NULL,
  ip text NOT NULL,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS provisioning_created ON provisioning(created_at);
CREATE INDEX IF NOT EXISTS provisioning_ip_created ON provisioning(ip, created_at);
