-- Add transaction_hash column to deposit_requests table for cryptocurrency deposits
ALTER TABLE deposit_requests 
ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deposit_requests_transaction_hash 
ON deposit_requests(transaction_hash);

-- Update existing records to have empty string for transaction_hash if null
UPDATE deposit_requests 
SET transaction_hash = '' 
WHERE transaction_hash IS NULL;
