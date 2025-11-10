-- Migration: Add 'credit' and 'debit' transaction types
-- Date: 2025-11-10
-- Description: Adds 'credit' and 'debit' to the allowed transaction types for manual balance adjustments

-- Drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add the new constraint with 'credit' and 'debit' types
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
  'deposit', 
  'withdrawal', 
  'investment', 
  'profit', 
  'bonus', 
  'referral_commission', 
  'admin_funding', 
  'live_trade_investment',
  'credit',
  'debit'
));

-- Verify the migration
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'transactions_type_check';

