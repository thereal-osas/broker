# Troubleshooting Guide - Profit Distribution System

## 🔧 Common Issues and Solutions

### Issue 1: "Invalid cron secret" Error

**Symptoms:**
- Cron endpoint returns 401 Unauthorized
- Error message: "Invalid cron secret"
- Manual distribution fails with auth error

**Root Causes:**
1. CRON_SECRET not set in Vercel environment variables
2. CRON_SECRET value doesn't match between local and production
3. Extra spaces or special characters in CRON_SECRET
4. CRON_SECRET not deployed yet

**Solutions:**

```bash
# Step 1: Verify CRON_SECRET is set in Vercel
vercel env list

# Expected output should include CRON_SECRET

# Step 2: If not set, add it
vercel env add CRON_SECRET
# Paste: <your-secure-secret>

# Step 3: Redeploy to apply environment variables
git push origin main

# Step 4: Wait for deployment to complete
vercel status

# Step 5: Test the endpoint
curl -X POST https://your-domain.vercel.app/api/cron/daily-profits \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Prevention:**
- Always verify environment variables before deployment
- Use strong, unique secrets (32+ characters)
- Never commit secrets to git

---

### Issue 2: Cron Job Not Running

**Symptoms:**
- Cron job doesn't appear in Vercel dashboard
- No logs at scheduled time (9:00 AM UTC)
- Profits not distributed automatically

**Root Causes:**
1. vercel.json not properly configured
2. Cron configuration not deployed
3. Cron endpoint file doesn't exist
4. Deployment failed

**Solutions:**

```bash
# Step 1: Verify vercel.json has cron configuration
cat vercel.json

# Expected output should include:
# "crons": [
#   {
#     "path": "/api/cron/daily-profits",
#     "schedule": "0 9 * * *"
#   }
# ]

# Step 2: Verify cron endpoint file exists
ls -la src/app/api/cron/daily-profits/route.ts

# Step 3: Commit and push changes
git add vercel.json
git commit -m "Add cron job configuration"
git push origin main

# Step 4: Wait for deployment
vercel status

# Step 5: Check Vercel dashboard for cron job
# Project Settings > Cron Jobs
# Should show: /api/cron/daily-profits with schedule "0 9 * * *"
```

**Prevention:**
- Always verify vercel.json before deployment
- Test cron endpoint locally before deploying
- Check Vercel dashboard after deployment

---

### Issue 3: Database Connection Error

**Symptoms:**
- Error: "connect ECONNREFUSED"
- Error: "FATAL: password authentication failed"
- Profits not distributed, database error in logs

**Root Causes:**
1. DATABASE_URL not set in Vercel
2. DATABASE_URL incorrect or expired
3. Database credentials wrong
4. Database not accessible from Vercel
5. SSL connection issues

**Solutions:**

```bash
# Step 1: Verify DATABASE_URL is set
vercel env list | grep DATABASE_URL

# Step 2: Check DATABASE_URL format
# Should be: postgresql://user:password@host:port/database

# Step 3: Verify Railway database is running
# Go to Railway dashboard > Your project > Database
# Check status: should be "Running"

# Step 4: Get correct DATABASE_URL from Railway
# Railway Dashboard > Connect > PostgreSQL > Connection String
# Copy the full connection string

# Step 5: Update DATABASE_URL in Vercel
vercel env add DATABASE_URL
# Paste: <correct-railway-url>

# Step 6: Redeploy
git push origin main

# Step 7: Test connection
curl https://your-domain.vercel.app/api/cron/daily-profits
```

**Prevention:**
- Regularly verify DATABASE_URL is correct
- Monitor database connection status
- Set up alerts for connection failures

---

### Issue 4: No Profits Distributed

**Symptoms:**
- Cron job runs but no profits distributed
- profit_distributions table empty
- User balances not updated

**Root Causes:**
1. No active investments exist
2. All investments already received today's profit
3. Investments have expired (end_date in past)
4. Database query error

**Solutions:**

```bash
# Step 1: Check if active investments exist
psql -h localhost -p 5432 -U postgres -d broker_platform

SELECT COUNT(*) FROM user_investments 
WHERE status = 'active' AND end_date > NOW();

# If count is 0, create test investment:
INSERT INTO user_investments (user_id, plan_id, amount, status, end_date)
VALUES ('USER_ID', 'PLAN_ID', 1000.00, 'active', NOW() + INTERVAL '30 days');

# Step 2: Check if profits already distributed today
SELECT COUNT(*) FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;

# Step 3: Check investment end dates
SELECT id, end_date FROM user_investments 
WHERE status = 'active' AND end_date <= NOW();

# If any found, update them:
UPDATE user_investments 
SET end_date = NOW() + INTERVAL '30 days'
WHERE id = 'INVESTMENT_ID';

# Step 4: Check for database errors in logs
vercel logs | grep -i error
```

**Prevention:**
- Create test investments before deployment
- Monitor active investment count
- Set up alerts for zero active investments

---

### Issue 5: Endpoint Returns 404

**Symptoms:**
- Error: "404 Not Found"
- Cron endpoint doesn't exist
- Health check fails

**Root Causes:**
1. Cron endpoint file not created
2. File path incorrect
3. Deployment failed
4. File not committed to git

**Solutions:**

```bash
# Step 1: Verify file exists locally
ls -la src/app/api/cron/daily-profits/route.ts

# If not, create it:
mkdir -p src/app/api/cron/daily-profits
# Copy route.ts file to this directory

# Step 2: Verify file is committed
git status

# If not committed:
git add src/app/api/cron/daily-profits/route.ts
git commit -m "Add cron endpoint"

# Step 3: Push to main
git push origin main

# Step 4: Wait for deployment
vercel status

# Step 5: Test endpoint
curl https://your-domain.vercel.app/api/cron/daily-profits
```

**Prevention:**
- Always verify files are created before committing
- Test locally before deployment
- Check deployment logs for errors

---

### Issue 6: Profit Amount Incorrect

**Symptoms:**
- Profits distributed but amount is wrong
- Calculation doesn't match expected value
- User balance increased by wrong amount

**Root Causes:**
1. daily_profit_rate incorrect in investment_plans
2. Investment amount incorrect
3. Calculation error in SmartDistributionService
4. Database precision issue

**Solutions:**

```bash
# Step 1: Verify investment plan rate
SELECT id, name, daily_profit_rate FROM investment_plans;

# Expected: daily_profit_rate should be decimal (e.g., 0.015 for 1.5%)

# Step 2: Verify investment amount
SELECT id, amount FROM user_investments WHERE id = 'INVESTMENT_ID';

# Step 3: Calculate expected profit
# Expected = amount × daily_profit_rate
# Example: 1000 × 0.015 = 15.00

# Step 4: Check actual profit distributed
SELECT profit_amount FROM profit_distributions 
WHERE investment_id = 'INVESTMENT_ID'
ORDER BY created_at DESC LIMIT 1;

# Step 5: If incorrect, check SmartDistributionService code
# File: lib/smartDistributionService.ts
# Look for: const dailyProfit = investment.amount * investment.daily_profit_rate;
```

**Prevention:**
- Verify investment plan rates before creating investments
- Test profit calculation with known values
- Monitor profit amounts in database

---

### Issue 7: Database Timeout

**Symptoms:**
- Error: "query timeout"
- Error: "connection timeout"
- Cron job fails intermittently

**Root Causes:**
1. Database query too slow
2. Missing indexes
3. Too many concurrent connections
4. Database overloaded

**Solutions:**

```bash
# Step 1: Check if indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'profit_distributions';

# Step 2: Create missing indexes
CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id 
ON profit_distributions(investment_id);

CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id 
ON profit_distributions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_investments_status 
ON user_investments(status);

# Step 3: Check database connection pool settings
# File: lib/db.ts
# Verify: max connections, timeout settings

# Step 4: Monitor database performance
# Railway Dashboard > Metrics
# Check: CPU, Memory, Connections
```

**Prevention:**
- Create indexes on frequently queried columns
- Monitor database performance regularly
- Set appropriate connection pool limits

---

### Issue 8: Deployment Fails

**Symptoms:**
- Deployment error in Vercel
- Build fails
- Deployment stuck

**Root Causes:**
1. TypeScript errors
2. Missing dependencies
3. Environment variables not set
4. Build configuration issue

**Solutions:**

```bash
# Step 1: Check for TypeScript errors locally
npm run build

# Step 2: Fix any errors found
# Review error messages and fix code

# Step 3: Verify dependencies installed
npm install

# Step 4: Check environment variables
vercel env list

# Step 5: Verify vercel.json is valid JSON
cat vercel.json | jq .

# Step 6: Commit and push again
git add .
git commit -m "Fix deployment issues"
git push origin main

# Step 7: Monitor deployment
vercel logs
```

**Prevention:**
- Always run `npm run build` before pushing
- Test locally before deployment
- Verify environment variables before deployment

---

## 🔍 Diagnostic Commands

### Check System Status

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check git status
git status

# Check Vercel status
vercel status

# Check database connection
psql -h localhost -p 5432 -U postgres -d broker_platform -c "SELECT NOW();"
```

### View Logs

```bash
# View Vercel logs
vercel logs

# View Vercel logs with filter
vercel logs | grep -i "profit"

# View local development logs
npm run dev 2>&1 | tee dev.log
```

### Test Endpoints

```bash
# Test health check
curl https://your-domain.vercel.app/api/cron/daily-profits

# Test with authentication
curl -X POST https://your-domain.vercel.app/api/cron/daily-profits \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Test with verbose output
curl -v https://your-domain.vercel.app/api/cron/daily-profits
```

### Database Diagnostics

```bash
# Check table existence
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

# Check record counts
SELECT COUNT(*) FROM profit_distributions;

# Check recent errors
SELECT * FROM profit_distributions 
WHERE DATE(created_at) = CURRENT_DATE;

# Check database size
SELECT pg_size_pretty(pg_database_size('broker_platform'));
```

---

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the logs**: `vercel logs`
2. **Review error messages**: Look for specific error details
3. **Check database**: Verify data integrity
4. **Test locally**: Reproduce issue in local environment
5. **Review documentation**: Check deployment guide
6. **Contact support**: Reach out to Vercel or Railway support

---

## ✅ Verification Checklist

- [ ] CRON_SECRET set in Vercel
- [ ] DATABASE_URL correct and accessible
- [ ] Cron job registered in Vercel
- [ ] Health check endpoint responds
- [ ] Database tables exist
- [ ] Active investments exist
- [ ] No TypeScript errors
- [ ] Deployment completed successfully

