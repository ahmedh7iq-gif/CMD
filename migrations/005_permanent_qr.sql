-- Store a recoverable copy of the original QR token encrypted at rest.
-- The token_hash remains the public lookup key. No sale records are changed.
ALTER TABLE account_deliveries ADD COLUMN encrypted_token TEXT;
