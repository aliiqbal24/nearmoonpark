CREATE TABLE IF NOT EXISTS moon_cloud_save (
  user_id text NOT NULL,
  contract_id text NOT NULL,
  account_id text NOT NULL,
  run_id text NOT NULL,
  recovery text NOT NULL,
  updated_at bigint NOT NULL,
  PRIMARY KEY (user_id, contract_id, run_id)
);
CREATE INDEX IF NOT EXISTS moon_cloud_save_latest ON moon_cloud_save(user_id, updated_at DESC);

ALTER TABLE moon_cloud_save ADD COLUMN IF NOT EXISTS authority_revision bigint NOT NULL DEFAULT 0;

ALTER TABLE moon_cloud_save DROP CONSTRAINT IF EXISTS moon_cloud_save_pkey;
ALTER TABLE moon_cloud_save ADD PRIMARY KEY (user_id, contract_id, run_id);
