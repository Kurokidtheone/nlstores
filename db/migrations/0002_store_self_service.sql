-- 0002: seller self-service (settings, security, setup checklist).
-- The seller account lives on the stores row (phone + password), so the security columns go here.

ALTER TABLE stores ADD COLUMN logo_key TEXT;                                   -- R2 key, square logo
ALTER TABLE stores ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#111827';    -- 2nd color (announcement bar, badges, footer)
ALTER TABLE stores ADD COLUMN announcement TEXT NOT NULL DEFAULT '';           -- one line at the top of the store
ALTER TABLE stores ADD COLUMN announcement_on INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stores ADD COLUMN policy TEXT;                                     -- delivery & returns; NULL = default text (lib/policy.ts) in the store language
ALTER TABLE stores ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0; -- 1 = sent to the change-password screen after login
ALTER TABLE stores ADD COLUMN password_changed_at TEXT;
ALTER TABLE stores ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;      -- +1 on password change = other devices logged out
ALTER TABLE stores ADD COLUMN delivery_checked INTEGER NOT NULL DEFAULT 0;     -- 1 once the seller saved the delivery page
