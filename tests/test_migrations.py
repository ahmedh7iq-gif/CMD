"""Disposable SQLite migration regression test. Never connects to Cloudflare production.
Run: python3 -m unittest discover -s tests -p 'test_migrations.py'
"""
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = [ROOT / "migrations" / f"{n:03d}_{name}.sql" for n, name in [
    (1, "sold_accounts"), (2, "secure_delivery"), (3, "delivery_credentials"),
    (4, "encrypted_profile"), (5, "permanent_qr")
]]

class MigrationTests(unittest.TestCase):
    def test_schema_preserves_existing_sale_and_permanent_qr(self):
        db = sqlite3.connect(":memory:")
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY)")
        db.execute("INSERT INTO users(id) VALUES (1)")
        db.executescript(MIGRATIONS[0].read_text())
        db.execute("""INSERT INTO sold_accounts
            (id,account_type,customer_name,account_email,sale_price_iqd,cost_iqd,created_by)
            VALUES (1,'apple','Test customer','test@example.invalid',10000,0,1)""")
        before = db.execute("SELECT * FROM sold_accounts WHERE id=1").fetchone()
        for migration in MIGRATIONS[1:]:
            db.executescript(migration.read_text())
        self.assertEqual(db.execute("SELECT * FROM sold_accounts WHERE id=1").fetchone(), before)
        columns = {row[1] for row in db.execute("PRAGMA table_info(account_deliveries)")}
        self.assertTrue({"token_hash","pin_hash","encrypted_password","encrypted_profile","encrypted_token"}.issubset(columns))
        db.execute("""INSERT INTO account_deliveries
            (account_id,token_hash,pin_hash,encrypted_token)
            VALUES (1,'hash','pin-hash','encrypted-original-token')""")
        db.execute("UPDATE account_deliveries SET encrypted_password='cipher',pin_hash='new-pin-hash' WHERE account_id=1")
        self.assertEqual(db.execute("SELECT token_hash,encrypted_token FROM account_deliveries WHERE account_id=1").fetchone(),
                         ("hash","encrypted-original-token"))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM sold_accounts").fetchone()[0], 1)
        db.close()

if __name__ == "__main__":
    unittest.main()
