# Profit Distribution System - Verification Guide

## Pre-Deployment Verification

### 1. Database Schema Check

Verify all required tables exist:

```sql
-- Check profit_distributions table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profit_distributions'
);

-- Check user_investments table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_investments'
);

-- Check user_balances table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_balances'
);

-- Check transactions table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'transactions'
);
```

### 2. Test Data Setup

Create test investment plan and investment:

```sql
-- Create test investment plan
INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
VALUES ('Test Plan', 'Test investment plan', 100.00, 10000.00, 0.015, 30, true)
RETURNING id;

-- Create test user (if needed)
INSERT INTO users (email, password, first_name, last_name, role)
VALUES ('test@example.com', 'password123', 'Test', 'User', 'investor')
RETURNING id;

-- Create user balance
INSERT INTO user_balances (user_id, total_balance)
VALUES ('USER_ID_HERE', 0.00)
ON CONFLICT (user_id) DO NOTHING;

-- Create test investment
INSERT INTO user_investments (user_id, plan_id, amount, status, end_date)
VALUES ('USER_ID_HERE', 'PLAN_ID_HERE', 1000.00, 'active', NOW() + INTERVAL '30 days')
RETURNING id;
```

## Local Testing

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test Health Check Endpoint

```bash
curl http://localhost:3000/api/cron/daily-profits
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "message": "Cron endpoint is ready",
  "timestamp": "2024-01-15T09:00:00.000Z"
}
```

### 3. Test Manual Distribution (Admin Panel)

1. Navigate to `http://localhost:3000/admin/profit-distribution`
2. Click "Run Distribution" button
3. Verify results show processed investments

### 4. Test Cron Endpoint with Secret

```bash
# Set environment variable
export CRON_SECRET=your-secure-cron-secret-change-in-production

# Test POST request
curl -X POST http://localhost:3000/api/cron/daily-profits \
  -H "Authorization: Bearer your-secure-cron-secret-change-in-production" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-01-15T09:00:00.000Z",
  "investment": {
    "success": true,
    "processed": 1,
    "skipped": 0,
    "errors": 0,
    "message": "Investment profit distribution completed",
    "details": [
      "Found 1 eligible investments",
      "Successfully processed: 1",
      "Errors: 0",
      "Distributed profit for investment abc-123 (User: test@example.com)"
    ],
    "timestamp": "2024-01-15T09:00:00.000Z"
  }
}
```

## Database Verification

### 1. Check Profit Distribution Records

```sql
-- View recent profit distributions
SELECT * FROM profit_distributions 
ORDER BY distribution_date DESC 
LIMIT 10;

-- Check today's distributions
SELECT COUNT(*) as today_distributions 
FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;
```

### 2. Check User Balance Updates

```sql
-- View user balance
SELECT * FROM user_balances 
WHERE user_id = 'USER_ID_HERE';

-- Check balance history
SELECT * FROM transactions 
WHERE user_id = 'USER_ID_HERE' 
AND type = 'profit' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Check Investment Status

```sql
-- View investment details
SELECT 
  ui.id,
  ui.amount,
  ui.total_profit,
  ui.status,
  ui.end_date,
  COUNT(pd.id) as profit_distributions_count
FROM user_investments ui
LEFT JOIN profit_distributions pd ON ui.id = pd.investment_id
WHERE ui.id = 'INVESTMENT_ID_HERE'
GROUP BY ui.id;
```

## Production Verification

### 1. Verify Cron Job Registration

In Vercel dashboard:
1. Go to Project Settings
2. Look for "Cron Jobs" section
3. Verify `/api/cron/daily-profits` is listed
4. Schedule should show: "0 9 * * *" (9:00 AM UTC daily)

### 2. Monitor First Run

1. Wait for scheduled time (9:00 AM UTC)
2. Check Vercel logs for execution
3. Verify database for new profit distributions

### 3. Check Logs

```bash
# In Vercel dashboard
# Deployments > Select latest > Logs

# Look for:
# - "Starting automated daily profit distribution..."
# - "Found X eligible investments"
# - "Successfully processed: X"
# - "Daily profit distribution completed"
```

## Troubleshooting Checklist

- [ ] All required tables exist in database
- [ ] Test investment plan created
- [ ] Test investment created with active status
- [ ] User balance record exists
- [ ] Health check endpoint responds
- [ ] Manual distribution works via admin panel
- [ ] Cron endpoint accepts valid CRON_SECRET
- [ ] Profit distributions recorded in database
- [ ] User balances updated correctly
- [ ] Transaction records created
- [ ] Vercel cron job registered
- [ ] Environment variables set in Vercel

## Common Issues

### No profits distributed

**Check:**
1. Are there active investments? `SELECT COUNT(*) FROM user_investments WHERE status = 'active' AND end_date > NOW()`
2. Have profits already been distributed today? `SELECT COUNT(*) FROM profit_distributions WHERE DATE(distribution_date) = CURRENT_DATE`
3. Do user_balances records exist? `SELECT COUNT(*) FROM user_balances`

### Database connection errors

**Check:**
1. Is DATABASE_URL correct?
2. Can Vercel reach the database?
3. Are connection pool settings appropriate?

### Cron job not running

**Check:**
1. Is vercel.json properly formatted?
2. Has the deployment completed?
3. Is CRON_SECRET set in environment variables?

## Success Indicators

✅ Cron job appears in Vercel dashboard
✅ Health check endpoint responds
✅ Manual distribution works
✅ Profit distributions recorded in database
✅ User balances updated
✅ Transaction records created
✅ No errors in logs

