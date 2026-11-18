-- Run once in the Cloudflare D1 production database console.
-- Each row represents one independent sold Apple/Google account.
CREATE TABLE IF NOT EXISTS sold_accounts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 account_type TEXT NOT NULL CHECK(account_type IN ('apple','google')),
 customer_name TEXT NOT NULL,
 account_email TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '',
 sale_price_iqd INTEGER NOT NULL DEFAULT 0 CHECK(sale_price_iqd>=0),
 cost_iqd INTEGER NOT NULL DEFAULT 0 CHECK(cost_iqd>=0),
 created_by INTEGER NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sold_accounts_created ON sold_accounts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sold_accounts_email ON sold_accounts(account_email);
