/**
 * Database Migration Definitions
 *
 * This file contains all the SQL migrations for the application.
 * Each migration is defined with a name, SQL, and optional check function.
 */

// Migration definitions are embedded directly in this file
// to avoid file system dependencies in serverless environments

/**
 * Main database schema migration
 */
const MAIN_SCHEMA_SQL = `
-- Broker Platform Database Schema
-- PostgreSQL Database Schema for Investment/Trading Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'investor' CHECK (role IN ('investor', 'admin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User balances - 6 distinct balance types
CREATE TABLE IF NOT EXISTS user_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_balance DECIMAL(15,2) DEFAULT 0.00,
    profit_balance DECIMAL(15,2) DEFAULT 0.00,
    deposit_balance DECIMAL(15,2) DEFAULT 0.00,
    bonus_balance DECIMAL(15,2) DEFAULT 0.00,
    credit_score_balance DECIMAL(15,2) DEFAULT 0.00,
    card_balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Investment plans configured by admin
CREATE TABLE IF NOT EXISTS investment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),
    daily_profit_rate DECIMAL(5,4) NOT NULL,
    duration_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User investments
CREATE TABLE IF NOT EXISTS user_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES investment_plans(id),
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'suspended', 'deactivated')),
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    total_profit DECIMAL(15,2) DEFAULT 0.00,
    last_profit_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily profit calculations
CREATE TABLE IF NOT EXISTS investment_profits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
    profit_amount DECIMAL(15,2) NOT NULL,
    profit_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(investment_id, profit_date)
);

-- Deposit requests
CREATE TABLE IF NOT EXISTS deposit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_proof TEXT,
    payment_proof_image TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    admin_notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    withdrawal_method VARCHAR(50),
    account_details JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'processed')),
    admin_notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Live Trade Plans (separate from investment_plans)
CREATE TABLE IF NOT EXISTS live_trade_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_amount DECIMAL(15,2) NOT NULL CHECK (min_amount > 0),
    max_amount DECIMAL(15,2) CHECK (max_amount IS NULL OR max_amount >= min_amount),
    hourly_profit_rate DECIMAL(5,4) NOT NULL CHECK (hourly_profit_rate > 0),
    duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Live Trades (separate from user_investments)
CREATE TABLE IF NOT EXISTS user_live_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    live_trade_plan_id UUID NOT NULL REFERENCES live_trade_plans(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_profit DECIMAL(15,2) DEFAULT 0,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hourly Live Trade Profits
CREATE TABLE IF NOT EXISTS hourly_live_trade_profits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_trade_id UUID NOT NULL REFERENCES user_live_trades(id) ON DELETE CASCADE,
    profit_amount DECIMAL(15,2) NOT NULL,
    profit_hour TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(live_trade_id, profit_hour)
);

-- Transaction history
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment')),
    amount DECIMAL(15,2) NOT NULL,
    balance_type VARCHAR(20) NOT NULL CHECK (balance_type IN ('total', 'profit', 'deposit', 'bonus', 'credit_score', 'card')),
    description TEXT,
    reference_id UUID,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral system
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,4) DEFAULT 0.0500,
    commission_earned DECIMAL(15,2) DEFAULT 0.00,
    commission_paid BOOLEAN DEFAULT false,
    total_commission DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'approved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(referrer_id, referred_id)
);

-- Referral commissions
CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    commission_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter posts
CREATE TABLE IF NOT EXISTS newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id UUID NOT NULL REFERENCES users(id),
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support ticket responses
CREATE TABLE IF NOT EXISTS ticket_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_admin_response BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

/**
 * Indexes migration
 */
const INDEXES_SQL = `
-- Indexes for performance (using IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_investments_user_id ON user_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_investments_status ON user_investments(status);
CREATE INDEX IF NOT EXISTS idx_investment_profits_investment_id ON investment_profits(investment_id);
CREATE INDEX IF NOT EXISTS idx_investment_profits_date ON investment_profits(profit_date);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
`;

/**
 * Triggers migration
 */
const TRIGGERS_SQL = `
-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (DROP IF EXISTS for idempotency)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_balances_updated_at ON user_balances;
CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON user_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_investment_plans_updated_at ON investment_plans;
CREATE TRIGGER update_investment_plans_updated_at BEFORE UPDATE ON investment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_investments_updated_at ON user_investments;
CREATE TRIGGER update_user_investments_updated_at BEFORE UPDATE ON user_investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deposit_requests_updated_at ON deposit_requests;
CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON deposit_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsletters_updated_at ON newsletters;
CREATE TRIGGER update_newsletters_updated_at BEFORE UPDATE ON newsletters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * Profit distributions table migration
 */
const PROFIT_DISTRIBUTIONS_SQL = `
-- Create profit_distributions table for tracking daily profit distributions
CREATE TABLE IF NOT EXISTS profit_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    profit_amount DECIMAL(15,2) NOT NULL,
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
ON profit_distributions(investment_id, date_trunc('day', distribution_date));
`;

/**
 * Transaction hash column migration
 */
const TRANSACTION_HASH_SQL = `
-- Add transaction_hash column to deposit_requests table for cryptocurrency deposits
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deposit_requests_transaction_hash
ON deposit_requests(transaction_hash);
`;

/**
 * Card balance migration
 */
const CARD_BALANCE_SQL = `
-- Add card_balance column to user_balances table if it doesn't exist
ALTER TABLE user_balances
ADD COLUMN IF NOT EXISTS card_balance DECIMAL(15,2) DEFAULT 0.00;

-- Initialize card_balance for existing users
UPDATE user_balances
SET card_balance = 0.00
WHERE card_balance IS NULL;
`;

/**
 * Live trade constraints migration
 */
const LIVE_TRADE_CONSTRAINTS_SQL = `
-- Update transaction type constraint to include live_trade_investment
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
CHECK (type IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment'));

-- Update balance type constraint to include card
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_balance_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_balance_type_check
CHECK (balance_type IN ('total', 'profit', 'deposit', 'bonus', 'credit_score', 'card'));
`;

/**
 * Enhanced features migration
 */
const ENHANCED_FEATURES_SQL = `
-- Update user_investments status constraint to include new statuses
ALTER TABLE user_investments DROP CONSTRAINT IF EXISTS user_investments_status_check;
ALTER TABLE user_investments ADD CONSTRAINT user_investments_status_check
CHECK (status IN ('active', 'cancelled', 'completed', 'suspended', 'deactivated'));

-- Add new columns to deposit_requests
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS payment_proof_image TEXT;

-- Update referrals table with new columns and constraints
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS commission_earned DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE referrals ADD CONSTRAINT referrals_status_check
CHECK (status IN ('active', 'inactive', 'pending', 'approved'));

-- Add image_url column to newsletters
ALTER TABLE newsletters
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create trigger for referrals updated_at if not exists
DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON referrals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * Export all migration definitions
 */
function getMigrationDefinitions() {
  return [
    {
      name: "001_main_schema",
      sql: MAIN_SCHEMA_SQL,
      checkFunction: async function () {
        return await this.tableExists("users");
      },
    },
    {
      name: "002_indexes",
      sql: INDEXES_SQL,
      checkFunction: null, // Always run indexes (they're idempotent)
    },
    {
      name: "003_triggers",
      sql: TRIGGERS_SQL,
      checkFunction: null, // Always run triggers (they're idempotent)
    },
    {
      name: "004_profit_distributions",
      sql: PROFIT_DISTRIBUTIONS_SQL,
      checkFunction: async function () {
        return await this.tableExists("profit_distributions");
      },
    },
    {
      name: "005_transaction_hash",
      sql: TRANSACTION_HASH_SQL,
      checkFunction: async function () {
        return await this.columnExists("deposit_requests", "transaction_hash");
      },
    },
    {
      name: "006_card_balance",
      sql: CARD_BALANCE_SQL,
      checkFunction: async function () {
        return await this.columnExists("user_balances", "card_balance");
      },
    },
    {
      name: "007_live_trade_constraints",
      sql: LIVE_TRADE_CONSTRAINTS_SQL,
      checkFunction: async function () {
        return await this.tableExists("live_trade_plans");
      },
    },
    {
      name: "008_enhanced_features",
      sql: ENHANCED_FEATURES_SQL,
      checkFunction: async function () {
        const hasPaymentProofImage = await this.columnExists(
          "deposit_requests",
          "payment_proof_image"
        );
        const hasCommissionEarned = await this.columnExists(
          "referrals",
          "commission_earned"
        );
        const hasNewsletterImage = await this.columnExists(
          "newsletters",
          "image_url"
        );
        return (
          hasPaymentProofImage && hasCommissionEarned && hasNewsletterImage
        );
      },
    },
  ];
}

module.exports = { getMigrationDefinitions };
