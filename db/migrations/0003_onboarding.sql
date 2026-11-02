-- 0003: admin onboarding ("client paid" -> "store live + welcome sent"), support tools.

-- Client details captured when the store is created
ALTER TABLE stores ADD COLUMN owner_wilaya INTEGER;
ALTER TABLE stores ADD COLUMN facebook_url TEXT;
ALTER TABLE stores ADD COLUMN request_ref TEXT;          -- Next Level request ID, e.g. ST-0042

-- Sample product from the design template ("Replace this sample product")
ALTER TABLE products ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0;

-- Custom domain status on Cloudflare for SaaS (subdomains are always 'active')
ALTER TABLE domains ADD COLUMN status TEXT NOT NULL DEFAULT 'active';  -- pending | active | to_retry
ALTER TABLE domains ADD COLUMN last_error TEXT;
ALTER TABLE domains ADD COLUMN checked_at TEXT;

CREATE TABLE payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id     INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL CHECK (amount > 0),     -- DA
  method       TEXT    NOT NULL CHECK (method IN ('ccp', 'baridimob', 'chargily', 'cash')),
  receipt_key  TEXT,                                    -- R2 receipts/<uuid> (admin only)
  reference    TEXT,
  period_start TEXT    NOT NULL,
  period_end   TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX payments_store ON payments(store_id, created_at DESC);

-- Everything the owner does on a store from admin. nonce/used_at = single-use impersonation links.
CREATE TABLE admin_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  action     TEXT    NOT NULL CHECK (action IN ('create_store', 'impersonate', 'resend_welcome', 'check_domain')),
  store_id   INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  detail     TEXT    NOT NULL DEFAULT '',
  nonce      TEXT    UNIQUE,
  used_at    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX admin_log_store ON admin_log(store_id, created_at DESC);
