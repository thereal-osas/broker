# Profit Distribution System - Testing & Validation Guide

## Overview

This guide provides comprehensive testing procedures for the automated daily profit distribution system. The system calculates and distributes daily profits using the formula: `investment_amount × daily_profit_rate`.

## Prerequisites

Before testing, ensure:
- ✅ Database is set up with all required tables
- ✅ At least one admin user exists
- ✅ At least one investor user exists  
- ✅ Investment plans are created and active
- ✅ Development server is running

## Test Environment Setup

### 1. Create Test Data

Run the database seeding script to create test data:
```bash
node scripts/seed-db.js
```

Or manually create test data:
```sql
-- Create test investment plan
INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
VALUES ('Test Plan', 'Test investment plan for profit distribution', 100.00, 10000.00, 0.015, 30, true);

-- Create test investment (replace user_id and plan_id with actual values)
INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit)
VALUES ('your-user-id', 'your-plan-id', 1000.00, 'active', 0.00);
```

### 2. Verify Database Schema

Ensure the `profit_distributions` table exists:
```sql
SELECT * FROM profit_distributions LIMIT 1;
```

## Testing Scenarios

### Scenario 1: Manual Profit Distribution (Admin Panel)

**Objective**: Test manual profit distribution through admin interface

**Steps**:
1. Login as admin user
2. Navigate to `/admin/profit-distribution`
3. Verify active investments are displayed
4. Click "Run Distribution" button
5. Verify distribution results

**Expected Results**:
- Active investments shown with correct details
- Distribution completes successfully
- Profit amounts calculated correctly: `$1000 × 0.015 = $15.00`
- User balances updated
- Transaction records created

**Validation Queries**:
```sql
-- Check profit distribution records
SELECT * FROM profit_distributions ORDER BY distribution_date DESC LIMIT 5;

-- Check user balance updates
SELECT * FROM user_balances WHERE user_id = 'test-user-id';

-- Check transaction records
SELECT * FROM transactions WHERE type = 'profit' ORDER BY created_at DESC LIMIT 5;
```

### Scenario 2: Automated Profit Distribution (Cron Job)

**Objective**: Test automated profit distribution via API endpoint

**Steps**:
1. Set environment variable: `CRON_SECRET=test-secret-123`
2. Make API call to cron endpoint:
```bash
curl -X POST http://localhost:3000/api/cron/daily-profits \
  -H "Authorization: Bearer test-secret-123" \
  -H "Content-Type: application/json"
```
3. Verify response and database changes

**Expected Results**:
- API returns success response with distribution statistics
- Same validation as manual distribution

### Scenario 3: Duplicate Prevention Testing

**Objective**: Verify system prevents duplicate distributions on same day

**Steps**:
1. Run profit distribution once (manual or automated)
2. Immediately run distribution again
3. Verify second run skips already processed investments

**Expected Results**:
- First run: `processed: 1, skipped: 0, errors: 0`
- Second run: `processed: 0, skipped: 1, errors: 0`

**Validation Query**:
```sql
-- Should show only one distribution per investment per day
SELECT investment_id, DATE(distribution_date), COUNT(*) 
FROM profit_distributions 
GROUP BY investment_id, DATE(distribution_date)
HAVING COUNT(*) > 1;
-- Should return no rows
```

### Scenario 4: Investment Completion Testing

**Objective**: Test investment completion when duration expires

**Steps**:
1. Create short-duration investment (1-2 days for testing)
2. Run profit distribution for the duration period
3. Verify investment status changes to 'completed'
4. Verify principal amount returned to user balance

**Test Investment**:
```sql
-- Create 2-day test investment
INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit)
VALUES ('test-user-id', 'test-plan-id', 500.00, 'active', 0.00);

-- Update plan to have 2-day duration for testing
UPDATE investment_plans SET duration_days = 2 WHERE id = 'test-plan-id';
```

**Expected Results After 2 Distributions**:
- Investment status: `completed`
- Total profit: `$500 × 0.015 × 2 = $15.00`
- User balance increased by: `$500 (principal) + $15 (profit) = $515.00`

### Scenario 5: Multiple Investments Testing

**Objective**: Test profit distribution across multiple active investments

**Steps**:
1. Create multiple investments for same user with different amounts
2. Run profit distribution
3. Verify all investments receive correct profit amounts

**Test Data**:
```sql
INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit) VALUES
('test-user-id', 'plan-1', 1000.00, 'active', 0.00),
('test-user-id', 'plan-2', 2000.00, 'active', 0.00),
('test-user-id', 'plan-3', 500.00, 'active', 0.00);
```

**Expected Daily Profits**:
- Investment 1: `$1000 × 0.015 = $15.00`
- Investment 2: `$2000 × 0.015 = $30.00`  
- Investment 3: `$500 × 0.015 = $7.50`
- **Total**: `$52.50`

### Scenario 6: Error Handling Testing

**Objective**: Test system behavior with invalid data

**Test Cases**:

**A. Invalid Investment Data**:
```sql
-- Create investment with invalid amount
INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit)
VALUES ('test-user-id', 'test-plan-id', -100.00, 'active', 0.00);
```

**B. Missing User Balance Record**:
```sql
-- Delete user balance temporarily
DELETE FROM user_balances WHERE user_id = 'test-user-id';
```

**C. Invalid Plan Data**:
```sql
-- Create plan with invalid rate
UPDATE investment_plans SET daily_profit_rate = -0.01 WHERE id = 'test-plan-id';
```

**Expected Results**:
- System should handle errors gracefully
- Failed distributions should be logged
- Other valid investments should still process
- Database transactions should rollback on errors

## Validation Checklist

### ✅ Pre-Distribution Validation

- [ ] Active investments exist in database
- [ ] Investment plans have valid profit rates (> 0)
- [ ] User balance records exist
- [ ] No duplicate distributions for today

### ✅ Post-Distribution Validation

- [ ] Profit distribution records created
- [ ] User balances updated correctly
- [ ] Transaction records created with type 'profit'
- [ ] Investment total_profit updated
- [ ] Completed investments marked as 'completed'
- [ ] Principal returned for completed investments

### ✅ Calculation Validation

For each distribution, verify:
```sql
-- Profit calculation verification
SELECT 
  pd.investment_id,
  ui.amount as investment_amount,
  ip.daily_profit_rate,
  pd.profit_amount,
  (ui.amount * ip.daily_profit_rate) as expected_profit,
  CASE 
    WHEN ABS(pd.profit_amount - (ui.amount * ip.daily_profit_rate)) < 0.01 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END as validation_result
FROM profit_distributions pd
JOIN user_investments ui ON pd.investment_id = ui.id
JOIN investment_plans ip ON ui.plan_id = ip.id
WHERE DATE(pd.distribution_date) = CURRENT_DATE;
```

### ✅ Balance Validation

```sql
-- User balance consistency check
SELECT 
  ub.user_id,
  ub.total_balance,
  ub.profit_balance,
  COALESCE(SUM(pd.profit_amount), 0) as total_profits_received,
  CASE 
    WHEN ub.profit_balance >= COALESCE(SUM(pd.profit_amount), 0) 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END as balance_validation
FROM user_balances ub
LEFT JOIN profit_distributions pd ON ub.user_id = pd.user_id
GROUP BY ub.user_id, ub.total_balance, ub.profit_balance;
```

## Performance Testing

### Load Testing

Test with multiple investments:
```sql
-- Create 100 test investments
INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit)
SELECT 
  'test-user-id',
  'test-plan-id',
  (RANDOM() * 9000 + 1000)::DECIMAL(15,2), -- Random amount 1000-10000
  'active',
  0.00
FROM generate_series(1, 100);
```

**Performance Metrics to Monitor**:
- Distribution processing time
- Database query performance
- Memory usage during bulk operations
- Transaction rollback handling

## Troubleshooting Common Issues

### Issue 1: No Profits Distributed

**Possible Causes**:
- No active investments
- Profits already distributed today
- Invalid profit rates
- Database connection issues

**Debug Steps**:
```sql
-- Check active investments
SELECT COUNT(*) FROM user_investments WHERE status = 'active';

-- Check today's distributions
SELECT COUNT(*) FROM profit_distributions WHERE DATE(distribution_date) = CURRENT_DATE;

-- Check profit rates
SELECT * FROM investment_plans WHERE daily_profit_rate <= 0;
```

### Issue 2: Incorrect Profit Amounts

**Debug Steps**:
```sql
-- Verify calculation
SELECT 
  ui.amount,
  ip.daily_profit_rate,
  (ui.amount * ip.daily_profit_rate) as expected_profit
FROM user_investments ui
JOIN investment_plans ip ON ui.plan_id = ip.id
WHERE ui.status = 'active';
```

### Issue 3: Balance Not Updated

**Debug Steps**:
```sql
-- Check transaction records
SELECT * FROM transactions WHERE type = 'profit' ORDER BY created_at DESC;

-- Check balance update queries in application logs
-- Verify user_balances table has correct user_id
```

## Automated Testing Script

Run the comprehensive test script:
```bash
node scripts/test_profit_distribution.js
```

This script will:
- ✅ Check database connectivity
- ✅ Verify active investments
- ✅ Test profit calculations
- ✅ Validate API endpoints
- ✅ Check database constraints
- ✅ Generate test report

## Production Monitoring

### Daily Monitoring Checklist

- [ ] Check cron job execution logs
- [ ] Verify profit distribution completion
- [ ] Monitor for failed distributions
- [ ] Validate total profits distributed
- [ ] Check user balance consistency
- [ ] Review error logs

### Monitoring Queries

```sql
-- Daily distribution summary
SELECT 
  DATE(distribution_date) as date,
  COUNT(*) as distributions,
  SUM(profit_amount) as total_profits
FROM profit_distributions 
WHERE distribution_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(distribution_date)
ORDER BY date DESC;

-- Failed distribution detection
SELECT * FROM user_investments ui
WHERE ui.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM profit_distributions pd 
  WHERE pd.investment_id = ui.id 
  AND DATE(pd.distribution_date) = CURRENT_DATE
);
```

## Success Criteria

The profit distribution system passes testing when:

✅ **Accuracy**: All profit calculations match the formula `investment_amount × daily_profit_rate`
✅ **Reliability**: No duplicate distributions occur
✅ **Completeness**: All active investments receive daily profits
✅ **Data Integrity**: User balances and transaction records are consistent
✅ **Performance**: System handles multiple investments efficiently
✅ **Error Handling**: Graceful handling of edge cases and errors
✅ **Automation**: Cron job executes successfully without manual intervention
