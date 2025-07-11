-- Manual SQL commands to create profit_distributions table
-- Copy and paste these commands into your PostgreSQL client (pgAdmin, DBeaver, etc.)

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create profit_distributions table
CREATE TABLE IF NOT EXISTS profit_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    profit_amount DECIMAL(15,2) NOT NULL,
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id ON profit_distributions(investment_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id ON profit_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_date ON profit_distributions(distribution_date);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_date ON profit_distributions(user_id, distribution_date);

-- 4. Create unique constraint to prevent duplicate distributions
CREATE UNIQUE INDEX IF NOT EXISTS idx_profit_distributions_unique_daily 
ON profit_distributions(investment_id, DATE(distribution_date));

-- 5. Verify table was created successfully
SELECT 'profit_distributions table created successfully' as status;

-- 6. Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profit_distributions'
ORDER BY ordinal_position;
