-- Apply after 002. No existing sales are altered.
ALTER TABLE account_deliveries ADD COLUMN encrypted_password TEXT;
ALTER TABLE account_deliveries ADD COLUMN account_full_name TEXT;
ALTER TABLE account_deliveries ADD COLUMN birth_date TEXT;
ALTER TABLE account_deliveries ADD COLUMN address TEXT;
CREATE TABLE IF NOT EXISTS delivery_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 account_id INTEGER NOT NULL REFERENCES sold_accounts(id) ON DELETE CASCADE,
 action TEXT NOT NULL,
 actor TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_delivery_audit_account ON delivery_audit(account_id,created_at DESC);
