-- Create profit_distributions table for tracking daily profit distributions
-- Run this script to fix the missing table error

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profit_distributions table
CREATE TABLE IF NOT EXISTS profit_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL, -- Original investment amount
    profit_amount DECIMAL(15,2) NOT NULL, -- Daily profit amount
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id ON profit_distributions(investment_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id ON profit_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_date ON profit_distributions(distribution_date);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_date ON profit_distributions(user_id, distribution_date);

-- Create unique constraint to prevent duplicate distributions on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_profit_distributions_unique_daily 
ON profit_distributions(investment_id, DATE(distribution_date));

-- Add comments for documentation
COMMENT ON TABLE profit_distributions IS 'Tracks daily profit distributions for active investments';
COMMENT ON COLUMN profit_distributions.investment_id IS 'Reference to the user investment';
COMMENT ON COLUMN profit_distributions.user_id IS 'Reference to the user receiving the profit';
COMMENT ON COLUMN profit_distributions.amount IS 'Original investment amount';
COMMENT ON COLUMN profit_distributions.profit_amount IS 'Daily profit amount distributed';
COMMENT ON COLUMN profit_distributions.distribution_date IS 'Date and time when profit was distributed';

-- Verify table was created
SELECT 'profit_distributions table created successfully' as status;
