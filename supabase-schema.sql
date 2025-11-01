-- Gorbagana Trashnet Commitments Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Commitments table to track all user commitments
CREATE TABLE IF NOT EXISTS commitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  amount DECIMAL NOT NULL CHECK (amount > 0),
  transaction_signature TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster wallet address queries
CREATE INDEX IF NOT EXISTS idx_wallet_address ON commitments(wallet_address);

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_created_at ON commitments(created_at);

-- Index for transaction signature lookups
CREATE INDEX IF NOT EXISTS idx_transaction_signature ON commitments(transaction_signature);

-- Optional: Create a view for quick stats
CREATE OR REPLACE VIEW commitment_stats AS
SELECT
  COUNT(*) AS total_commitments,
  COUNT(DISTINCT wallet_address) AS unique_wallets,
  COALESCE(SUM(amount), 0) AS total_committed
FROM commitments;

-- Function to get user commitment stats
CREATE OR REPLACE FUNCTION get_user_stats(user_wallet TEXT)
RETURNS TABLE (
  user_total DECIMAL,
  user_count BIGINT,
  global_total DECIMAL,
  boost_pool_share DECIMAL,
  expected_ggor DECIMAL
) AS $$
DECLARE
  boost_pool CONSTANT DECIMAL := 500000;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN wallet_address = user_wallet THEN amount ELSE 0 END), 0) AS user_total,
    COUNT(CASE WHEN wallet_address = user_wallet THEN 1 END) AS user_count,
    COALESCE(SUM(amount), 0) AS global_total,
    CASE
      WHEN COALESCE(SUM(amount), 0) > 0 THEN
        (COALESCE(SUM(CASE WHEN wallet_address = user_wallet THEN amount ELSE 0 END), 0) / COALESCE(SUM(amount), 0)) * 100
      ELSE 0
    END AS boost_pool_share,
    CASE
      WHEN COALESCE(SUM(amount), 0) > 0 THEN
        COALESCE(SUM(CASE WHEN wallet_address = user_wallet THEN amount ELSE 0 END), 0) +
        ((COALESCE(SUM(CASE WHEN wallet_address = user_wallet THEN amount ELSE 0 END), 0) / COALESCE(SUM(amount), 0)) * boost_pool)
      ELSE 0
    END AS expected_ggor
  FROM commitments;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust based on your Supabase setup)
-- These are typically handled by Supabase Row Level Security (RLS)

-- Optional: Enable Row Level Security
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read commitments (for total stats)
CREATE POLICY "Allow public read access" ON commitments
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to insert their own commitments
-- Note: In production, you'd want to verify the wallet signature
CREATE POLICY "Allow insert for authenticated users" ON commitments
  FOR INSERT
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE commitments IS 'Stores all user commitments for the Gorbagana Trashnet Boost Pool';
COMMENT ON COLUMN commitments.wallet_address IS 'Solana wallet address of the user';
COMMENT ON COLUMN commitments.amount IS 'Amount of GOR tokens committed (in tokens, not lamports)';
COMMENT ON COLUMN commitments.transaction_signature IS 'Unique Solana transaction signature';
COMMENT ON COLUMN commitments.created_at IS 'Timestamp when the commitment was recorded';

