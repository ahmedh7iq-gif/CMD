-- Encrypt sensitive identity details; leave legacy profile fields unused and NULL.
ALTER TABLE account_deliveries ADD COLUMN encrypted_profile TEXT;
-- Keep the original columns for compatibility with existing migrations; never write sensitive values to them.
