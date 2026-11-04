-- 0004: daily renewals job, reminders, Google Sheet sync queue.

-- Expiry lifecycle written by the daily job (stores.status stays the admin switch active/suspended)
ALTER TABLE stores ADD COLUMN lifecycle TEXT NOT NULL DEFAULT 'active'
  CHECK (lifecycle IN ('active', 'grace', 'expired', 'to_delete'));

-- creation = first year, renewal = the next ones
ALTER TABLE payments ADD COLUMN kind TEXT NOT NULL DEFAULT 'creation' CHECK (kind IN ('creation', 'renewal'));

-- WhatsApp reminders: one per store, kind and subscription period (expires_at snapshot)
CREATE TABLE renewal_reminders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL CHECK (kind IN ('d30', 'd7', 'd0', 'after3')),
  expires_at TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  sent_at    TEXT,
  UNIQUE (store_id, kind, expires_at)
);
CREATE INDEX renewal_reminders_status ON renewal_reminders(status, created_at);

-- Google Sheet sync failures, retried by the daily job (the row is rebuilt at send time)
CREATE TABLE sheet_sync_queue (
  store_id        INTEGER PRIMARY KEY,
  attempts        INTEGER NOT NULL DEFAULT 1,
  last_error      TEXT,
  next_attempt_at TEXT    NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- admin_log: more actions, and the history must survive a deleted store (no CHECK, no cascade)
CREATE TABLE admin_log_v2 (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  action     TEXT    NOT NULL,
  store_id   INTEGER,
  detail     TEXT    NOT NULL DEFAULT '',
  nonce      TEXT    UNIQUE,
  used_at    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO admin_log_v2 (id, action, store_id, detail, nonce, used_at, created_at)
  SELECT id, action, store_id, detail, nonce, used_at, created_at FROM admin_log;
DROP TABLE admin_log;
ALTER TABLE admin_log_v2 RENAME TO admin_log;
CREATE INDEX admin_log_store ON admin_log(store_id, created_at DESC);
