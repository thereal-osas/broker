# Database Verification Guide

## 🔍 Complete Database Verification Procedures

### Prerequisites

- PostgreSQL client installed (psql, DBeaver, pgAdmin, or similar)
- Database connection details (host, port, username, password, database name)
- Access to production or local database

---

## 1. CONNECTION VERIFICATION

### Test Database Connection

```bash
# Using psql (command line)
psql -h localhost -p 5432 -U postgres -d broker_platform

# For Railway production database
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway

# Expected output:
# psql (14.x)
# Type "help" for help.
# broker_platform=#
```

### Connection String Verification

```bash
# Local development
postgresql://postgres:Mirror1%23%40@localhost:5432/broker_platform

# Production (Railway)
postgresql://postgres:PASSWORD@turntable.proxy.rlwy.net:30859/railway

# Note: Special characters must be URL-encoded
# @ = %40
# # = %23
# : = %3A
```

---

## 2. TABLE EXISTENCE VERIFICATION

### Check All Required Tables

```sql
-- List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables (minimum 15):
-- deposit_requests
-- hourly_live_trade_profits
-- investment_plans
-- investment_profits
-- live_trade_plans
-- newsletters
-- profit_distributions
-- referral_commissions
-- referrals
-- support_tickets
-- system_settings
-- ticket_responses
-- transactions
-- user_balances
-- user_investments
-- user_live_trades
-- users
-- withdrawal_requests
```

### Check Specific Tables for Profit Distribution

```sql
-- Check if profit_distributions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profit_distributions'
) AS table_exists;

-- Check if user_investments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_investments'
) AS table_exists;

-- Check if user_balances table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_balances'
) AS table_exists;

-- Check if transactions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'transactions'
) AS table_exists;
```

---

## 3. TABLE SCHEMA VERIFICATION

### Verify profit_distributions Table Schema

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profit_distributions'
ORDER BY ordinal_position;

-- Expected columns:
-- id | uuid | NO | gen_random_uuid()
-- investment_id | uuid | NO | 
-- user_id | uuid | NO | 
-- amount | numeric | NO | 
-- profit_amount | numeric | NO | 
-- distribution_date | timestamp with time zone | YES | CURRENT_TIMESTAMP
-- created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP
```

### Verify user_investments Table Schema

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_investments'
ORDER BY ordinal_position;

-- Expected columns:
-- id | uuid | NO | gen_random_uuid()
-- user_id | uuid | NO | 
-- plan_id | uuid | NO | 
-- amount | numeric | NO | 
-- status | character varying | YES | 'active'
-- end_date | timestamp | NO | 
-- created_at | timestamp | YES | CURRENT_TIMESTAMP
-- updated_at | timestamp | YES | CURRENT_TIMESTAMP
```

### Verify user_balances Table Schema

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_balances'
ORDER BY ordinal_position;

-- Expected columns:
-- id | uuid | NO | gen_random_uuid()
-- user_id | uuid | NO | 
-- total_balance | numeric | YES | 0.00
-- card_balance | numeric | YES | 0.00
-- credit_score_balance | integer | YES | 0
-- created_at | timestamp | YES | CURRENT_TIMESTAMP
-- updated_at | timestamp | YES | CURRENT_TIMESTAMP
```

---

## 4. INDEXES VERIFICATION

### Check Indexes on Critical Tables

```sql
-- Check indexes on profit_distributions
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profit_distributions';

-- Expected indexes:
-- idx_profit_distributions_investment_id
-- idx_profit_distributions_user_id
-- profit_distributions_pkey (primary key)
```

### Create Missing Indexes (if needed)

```sql
-- Create index on investment_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id 
ON profit_distributions(investment_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id 
ON profit_distributions(user_id);

-- Create index on distribution_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_profit_distributions_distribution_date 
ON profit_distributions(distribution_date);

-- Create index on user_investments status for active investment queries
CREATE INDEX IF NOT EXISTS idx_user_investments_status 
ON user_investments(status);

-- Create index on user_investments end_date for expiration checks
CREATE INDEX IF NOT EXISTS idx_user_investments_end_date 
ON user_investments(end_date);
```

---

## 5. FOREIGN KEY VERIFICATION

### Check Foreign Key Constraints

```sql
-- Check foreign keys on profit_distributions
SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
FROM information_schema.key_column_usage
WHERE table_name = 'profit_distributions'
AND constraint_name LIKE '%fk%';

-- Expected foreign keys:
-- profit_distributions_investment_id_fkey -> user_investments(id)
-- profit_distributions_user_id_fkey -> users(id)
```

### Check Foreign Keys on user_investments

```sql
SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
FROM information_schema.key_column_usage
WHERE table_name = 'user_investments'
AND constraint_name LIKE '%fk%';

-- Expected foreign keys:
-- user_investments_user_id_fkey -> users(id)
-- user_investments_plan_id_fkey -> investment_plans(id)
```

---

## 6. DATA VERIFICATION

### Check Data Integrity

```sql
-- Count records in each table
SELECT 
  'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'user_balances', COUNT(*) FROM user_balances
UNION ALL
SELECT 'investment_plans', COUNT(*) FROM investment_plans
UNION ALL
SELECT 'user_investments', COUNT(*) FROM user_investments
UNION ALL
SELECT 'profit_distributions', COUNT(*) FROM profit_distributions
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
ORDER BY table_name;
```

### Check Active Investments

```sql
-- Count active investments
SELECT COUNT(*) as active_investments
FROM user_investments
WHERE status = 'active' AND end_date > NOW();

-- List active investments
SELECT 
  ui.id,
  ui.user_id,
  u.email,
  ui.amount,
  ip.daily_profit_rate,
  ui.end_date,
  ui.created_at
FROM user_investments ui
JOIN users u ON ui.user_id = u.id
JOIN investment_plans ip ON ui.plan_id = ip.id
WHERE ui.status = 'active' AND ui.end_date > NOW()
ORDER BY ui.created_at DESC;
```

### Check Profit Distributions

```sql
-- Count profit distributions
SELECT COUNT(*) as total_distributions
FROM profit_distributions;

-- Count today's distributions
SELECT COUNT(*) as today_distributions
FROM profit_distributions
WHERE DATE(distribution_date) = CURRENT_DATE;

-- List recent distributions
SELECT 
  pd.id,
  pd.user_id,
  u.email,
  pd.amount,
  pd.profit_amount,
  pd.distribution_date
FROM profit_distributions pd
JOIN users u ON pd.user_id = u.id
ORDER BY pd.distribution_date DESC
LIMIT 20;
```

### Check User Balances

```sql
-- List user balances
SELECT 
  u.email,
  ub.total_balance,
  ub.card_balance,
  ub.credit_score_balance,
  ub.updated_at
FROM user_balances ub
JOIN users u ON ub.user_id = u.id
ORDER BY ub.total_balance DESC;

-- Check for missing balance records
SELECT u.id, u.email
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE ub.id IS NULL;
```

---

## 7. TEST DATA CREATION

### Create Complete Test Scenario

```sql
-- 1. Create test investment plan
INSERT INTO investment_plans (
  name, description, min_amount, max_amount, 
  daily_profit_rate, duration_days, is_active
) VALUES (
  'Test Plan', 'Test investment plan', 
  100.00, 10000.00, 0.015, 30, true
) RETURNING id;
-- Save as PLAN_ID

-- 2. Create test user
INSERT INTO users (
  email, password, first_name, last_name, role
) VALUES (
  'test@example.com', 'password123', 'Test', 'User', 'investor'
) RETURNING id;
-- Save as USER_ID

-- 3. Create user balance
INSERT INTO user_balances (user_id, total_balance)
VALUES ('USER_ID', 0.00)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create test investment
INSERT INTO user_investments (
  user_id, plan_id, amount, status, end_date
) VALUES (
  'USER_ID', 'PLAN_ID', 1000.00, 'active', 
  NOW() + INTERVAL '30 days'
) RETURNING id;
-- Save as INVESTMENT_ID
```

### Verify Test Data

```sql
-- Verify investment plan
SELECT * FROM investment_plans WHERE id = 'PLAN_ID';

-- Verify user
SELECT * FROM users WHERE id = 'USER_ID';

-- Verify user balance
SELECT * FROM user_balances WHERE user_id = 'USER_ID';

-- Verify investment
SELECT * FROM user_investments WHERE id = 'INVESTMENT_ID';
```

---

## 8. AUTOMATED VERIFICATION SCRIPT

### Run Verification Script

```bash
# Run the database verification script
node scripts/verify-db.js

# Expected output:
# ✅ Database connection successful
# ✅ users table exists
# ✅ user_investments table exists
# ✅ profit_distributions table exists
# ✅ user_balances table exists
# ✅ transactions table exists
# ✅ investment_plans table exists
# ✅ All required tables exist
```

---

## 9. TROUBLESHOOTING

### Issue: Table Does Not Exist

```sql
-- Create missing profit_distributions table
CREATE TABLE IF NOT EXISTS profit_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    profit_amount DECIMAL(15,2) NOT NULL,
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Issue: Missing Indexes

```sql
-- Create all required indexes
CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id 
ON profit_distributions(investment_id);

CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id 
ON profit_distributions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_investments_status 
ON user_investments(status);

CREATE INDEX IF NOT EXISTS idx_user_investments_end_date 
ON user_investments(end_date);
```

### Issue: Missing User Balance Records

```sql
-- Create missing balance records for all users
INSERT INTO user_balances (user_id, total_balance)
SELECT id, 0.00 FROM users
WHERE id NOT IN (SELECT user_id FROM user_balances)
ON CONFLICT (user_id) DO NOTHING;
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Database connection successful
- [ ] All required tables exist
- [ ] Table schemas match expected structure
- [ ] Foreign key constraints in place
- [ ] Indexes created on critical columns
- [ ] Test data created successfully
- [ ] Active investments exist
- [ ] User balances initialized
- [ ] No orphaned records (referential integrity)
- [ ] Database ready for profit distribution

