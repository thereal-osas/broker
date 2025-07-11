# Step-by-Step Profit Distribution Testing Guide

## Prerequisites Checklist

Before starting testing, ensure you have:

- ✅ **Database Setup**: PostgreSQL running with all tables created
- ✅ **Server Running**: Development server running on port 3001 (or update config)
- ✅ **Admin User**: At least one admin user account
- ✅ **Investor User**: At least one investor user account
- ✅ **Investment Plans**: At least one active investment plan
- ✅ **Environment Variables**: `CRON_SECRET` set for API testing

## Step 1: Initial System Validation

### 1.1 Run Basic Test Script
```bash
node scripts/test_profit_distribution.js
```

**Expected Output:**
- ✅ Database connection successful
- ✅ Active investments found (or warning if none)
- ✅ Profit calculations working
- ✅ API endpoints accessible

### 1.2 Run Comprehensive Test Script
```bash
node scripts/comprehensive_profit_test.js
```

**Expected Output:**
- ✅ Database schema validation
- ✅ Investment validation
- ✅ Calculation verification
- ✅ Balance consistency checks

## Step 2: Create Test Investment

### 2.1 Via Admin Panel
1. Login as admin user
2. Navigate to `/admin/investments`
3. Create a test investment plan if needed:
   - **Name**: "Test Plan"
   - **Min Amount**: $100
   - **Max Amount**: $10,000
   - **Daily Rate**: 1.5% (0.015)
   - **Duration**: 30 days

### 2.2 Via User Dashboard
1. Login as investor user
2. Navigate to `/dashboard`
3. Invest $1,000 in the test plan
4. Verify investment appears in "My Investments"

### 2.3 Verify Database
```sql
-- Check the investment was created
SELECT ui.*, ip.name, ip.daily_profit_rate, ip.duration_days
FROM user_investments ui
JOIN investment_plans ip ON ui.plan_id = ip.id
WHERE ui.status = 'active'
ORDER BY ui.created_at DESC
LIMIT 5;
```

**Expected Result:**
- Investment record with status 'active'
- Correct amount and plan details
- Expected daily profit: $1,000 × 0.015 = $15.00

## Step 3: Test Manual Profit Distribution

### 3.1 Via Admin Panel
1. Login as admin
2. Navigate to `/admin/profit-distribution`
3. Verify active investments are displayed
4. Note the "Daily Profit Pool" amount
5. Click "Run Distribution" button
6. Verify success message and results

### 3.2 Verify Results
```sql
-- Check profit distribution records
SELECT * FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE
ORDER BY distribution_date DESC;

-- Check user balance updates
SELECT ub.*, 
       (SELECT SUM(profit_amount) FROM profit_distributions WHERE user_id = ub.user_id) as total_profits
FROM user_balances ub
WHERE user_id = 'your-test-user-id';

-- Check transaction records
SELECT * FROM transactions 
WHERE type = 'profit' 
AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

**Expected Results:**
- ✅ Profit distribution record created
- ✅ User profit_balance increased by $15.00
- ✅ User total_balance increased by $15.00
- ✅ Transaction record with type 'profit'

## Step 4: Test Automated Distribution (Cron Job)

### 4.1 Set Environment Variable
```bash
export CRON_SECRET=test-secret-123
```

### 4.2 Test API Endpoint
```bash
# Health check
curl http://localhost:3001/api/cron/daily-profits

# Run distribution
curl -X POST http://localhost:3001/api/cron/daily-profits \
  -H "Authorization: Bearer test-secret-123" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Daily profit distribution completed",
  "result": {
    "processed": 0,
    "skipped": 1,
    "errors": 0
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

**Note**: `processed: 0, skipped: 1` is expected if you already ran manual distribution today.

## Step 5: Test Duplicate Prevention

### 5.1 Run Distribution Twice
1. Run manual distribution via admin panel
2. Immediately run automated distribution via API
3. Verify second run shows "skipped" investments

### 5.2 Verify Database Constraint
```sql
-- This should return no rows (no duplicates)
SELECT investment_id, DATE(distribution_date), COUNT(*) 
FROM profit_distributions 
GROUP BY investment_id, DATE(distribution_date)
HAVING COUNT(*) > 1;
```

## Step 6: Test Investment Completion

### 6.1 Create Short-Duration Investment
```sql
-- Create 2-day test plan
INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
VALUES ('2-Day Test', 'Short test plan', 100.00, 5000.00, 0.02, 2, true);

-- Create investment with this plan
INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit)
VALUES ('your-user-id', 'new-plan-id', 500.00, 'active', 0.00);
```

### 6.2 Run Distribution Twice
1. Run distribution on day 1
2. Run distribution on day 2
3. Verify investment status changes to 'completed'
4. Verify principal ($500) is returned to user balance

### 6.3 Verify Completion
```sql
-- Check investment status
SELECT * FROM user_investments WHERE id = 'test-investment-id';

-- Check total profits received
SELECT SUM(profit_amount) FROM profit_distributions WHERE investment_id = 'test-investment-id';

-- Expected: 2 distributions × $10.00 = $20.00 total profit
-- Expected: Investment status = 'completed'
-- Expected: User balance increased by $520.00 ($500 principal + $20 profit)
```

## Step 7: Test Multiple Investments

### 7.1 Create Multiple Investments
Create 3 investments with different amounts:
- Investment 1: $1,000 (expected daily profit: $15.00)
- Investment 2: $2,000 (expected daily profit: $30.00)
- Investment 3: $500 (expected daily profit: $7.50)

### 7.2 Run Distribution
1. Run profit distribution
2. Verify all 3 investments receive profits
3. Total expected profit: $52.50

### 7.3 Verify Results
```sql
-- Check all distributions for today
SELECT 
  pd.investment_id,
  ui.amount,
  pd.profit_amount,
  (ui.amount * ip.daily_profit_rate) as expected_profit
FROM profit_distributions pd
JOIN user_investments ui ON pd.investment_id = ui.id
JOIN investment_plans ip ON ui.plan_id = ip.id
WHERE DATE(pd.distribution_date) = CURRENT_DATE;
```

## Step 8: Test Error Handling

### 8.1 Test Invalid Data
```sql
-- Create investment with negative amount (should be handled gracefully)
INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit)
VALUES ('test-user-id', 'test-plan-id', -100.00, 'active', 0.00);
```

### 8.2 Test Missing User Balance
```sql
-- Temporarily remove user balance record
UPDATE user_balances SET user_id = user_id || '_backup' WHERE user_id = 'test-user-id';
```

### 8.3 Run Distribution
1. Run distribution
2. Verify system handles errors gracefully
3. Check error count in response
4. Restore test data:
```sql
UPDATE user_balances SET user_id = REPLACE(user_id, '_backup', '') WHERE user_id LIKE '%_backup';
DELETE FROM user_investments WHERE amount < 0;
```

## Step 9: Performance Testing

### 9.1 Create Multiple Test Investments
```bash
# Run with createTestData = true
node scripts/comprehensive_profit_test.js
```

### 9.2 Monitor Performance
1. Run distribution with multiple investments
2. Monitor processing time
3. Check database performance
4. Verify all investments processed correctly

## Step 10: User Interface Testing

### 10.1 Test User Dashboard
1. Login as investor
2. Navigate to `/dashboard`
3. Verify profit history component shows distributions
4. Check balance updates are reflected

### 10.2 Test Admin Dashboard
1. Login as admin
2. Navigate to `/admin/profit-distribution`
3. Verify active investments display
4. Check statistics are accurate
5. Test manual distribution trigger

## Step 11: Investment Cancellation Testing

### 11.1 Test Cancellation Restriction
1. Create new investment
2. Try to cancel immediately
3. Verify cancellation is blocked with appropriate message
4. Check that cancellation is only allowed after duration expires

### 11.2 Verify Cancellation Logic
```sql
-- Check investment end date calculation
SELECT 
  ui.id,
  ui.created_at,
  ip.duration_days,
  ui.created_at + INTERVAL '1 day' * ip.duration_days as end_date,
  CASE 
    WHEN CURRENT_TIMESTAMP < ui.created_at + INTERVAL '1 day' * ip.duration_days 
    THEN 'ACTIVE' 
    ELSE 'CAN_CANCEL' 
  END as status
FROM user_investments ui
JOIN investment_plans ip ON ui.plan_id = ip.id
WHERE ui.status = 'active';
```

## Step 12: Newsletter System Testing

### 12.1 Test Admin Newsletter Creation
1. Login as admin
2. Navigate to `/admin/newsletter`
3. Create a test newsletter
4. Publish the newsletter

### 12.2 Test User Newsletter Access
1. Login as investor
2. Navigate to `/dashboard/newsletters`
3. Verify published newsletters are visible
4. Test newsletter reading functionality

## Validation Checklist

After completing all tests, verify:

- ✅ **Profit Calculations**: All profits calculated correctly using `amount × rate`
- ✅ **Balance Updates**: User balances updated accurately
- ✅ **Transaction Records**: All distributions logged as transactions
- ✅ **Duplicate Prevention**: No duplicate distributions on same day
- ✅ **Investment Completion**: Investments complete after duration expires
- ✅ **Principal Return**: Original investment returned on completion
- ✅ **Error Handling**: System handles edge cases gracefully
- ✅ **API Endpoints**: All endpoints respond correctly
- ✅ **User Interface**: Dashboards display accurate information
- ✅ **Cancellation Restriction**: Investments cannot be cancelled early
- ✅ **Newsletter System**: Users can view published newsletters

## Troubleshooting Common Issues

### Issue: No Active Investments
**Solution**: Create test investments via admin panel or database

### Issue: API Endpoints Not Accessible
**Solution**: Verify server is running and check port configuration

### Issue: Incorrect Profit Amounts
**Solution**: Verify investment plan daily_profit_rate values

### Issue: Balance Not Updated
**Solution**: Check user_balances table and transaction records

### Issue: Duplicate Distributions
**Solution**: Verify unique constraint on profit_distributions table

## Production Deployment Checklist

Before deploying to production:

- ✅ Set secure `CRON_SECRET` environment variable
- ✅ Set up automated cron job for daily distribution
- ✅ Configure monitoring and alerting
- ✅ Test with real user data (small amounts)
- ✅ Verify backup and recovery procedures
- ✅ Document operational procedures
- ✅ Train support staff on system monitoring
