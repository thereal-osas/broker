-- ============================================================================
-- QUICK FIX: Add 'credit' and 'debit' to transactions_type_check constraint
-- ============================================================================
-- 
-- Problem: Balance adjustment feature fails with error:
--   "new row for relation 'transactions' violates check constraint 'transactions_type_check'"
--
-- Solution: Update the constraint to include 'credit' and 'debit' types
--
-- Time to run: ~1 second
-- Risk: Very low (only adds allowed values, doesn't modify data)
-- Downtime: None
-- ============================================================================

-- Step 1: Drop the old constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Step 2: Add the new constraint with 'credit' and 'debit' included
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

-- Step 3: Verify the constraint was updated (optional)
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
AND contype = 'c'
AND conname = 'transactions_type_check';

-- Expected output should show 'credit' and 'debit' in the constraint definition

-- ============================================================================
-- After running this SQL:
-- 1. Test the balance adjustment feature in your admin panel
-- 2. You should be able to credit and debit user balances without errors
-- 3. Check the transactions table to see the new records with type='credit' or type='debit'
-- ============================================================================

