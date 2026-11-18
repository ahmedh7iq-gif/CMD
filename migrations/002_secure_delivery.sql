-- Apply manually to the existing production Cloudflare D1 database before enabling delivery.
-- This migration does not modify or delete existing sold_accounts records.
CREATE TABLE IF NOT EXISTS account_deliveries (
 account_id INTEGER PRIMARY KEY REFERENCES sold_accounts(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE,
 pin_hash TEXT NOT NULL,
 failed_attempts INTEGER NOT NULL DEFAULT 0,
 lock_level INTEGER NOT NULL DEFAULT 0,
 locked_until INTEGER,
 permanently_locked INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_deliveries_token ON account_deliveries(token_hash);
