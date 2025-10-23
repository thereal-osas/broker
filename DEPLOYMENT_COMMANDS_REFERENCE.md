# Deployment Commands Reference

## 🔑 Quick Command Reference for Profit Distribution System

---

## 1️⃣ GENERATE SECRETS

```bash
# Generate CRON_SECRET (32 characters)
openssl rand -base64 32

# Generate NEXTAUTH_SECRET (32 characters)
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Select-Object -First 32
```

---

## 2️⃣ ENVIRONMENT VARIABLES

### Verify Local Variables

```bash
# Check .env.local exists
ls -la .env.local

# Verify CRON_SECRET
grep "CRON_SECRET" .env.local

# Verify DATABASE_URL
grep "DATABASE_URL" .env.local

# Verify NEXTAUTH_SECRET
grep "NEXTAUTH_SECRET" .env.local

# Verify NEXTAUTH_URL
grep "NEXTAUTH_URL" .env.local
```

### Add Vercel Environment Variables

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Add DATABASE_URL
vercel env add DATABASE_URL
# Paste: postgresql://postgres:PASSWORD@turntable.proxy.rlwy.net:30859/railway

# Add NEXTAUTH_URL
vercel env add NEXTAUTH_URL
# Paste: https://your-domain.vercel.app

# Add NEXTAUTH_SECRET
vercel env add NEXTAUTH_SECRET
# Paste: <generated-secret>

# Add CRON_SECRET
vercel env add CRON_SECRET
# Paste: <generated-secret>

# Add NODE_ENV
vercel env add NODE_ENV
# Paste: production

# Verify all variables
vercel env list
```

---

## 3️⃣ DATABASE VERIFICATION

### Connect to Local Database

```bash
# Connect to local PostgreSQL
psql -h localhost -p 5432 -U postgres -d broker_platform

# Or with password prompt
psql -h localhost -p 5432 -U postgres -d broker_platform -W
```

### Connect to Production Database (Railway)

```bash
# Connect to Railway PostgreSQL
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway

# Or with password prompt
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway -W
```

### Check Required Tables

```sql
-- Check if all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'users',
  'user_investments',
  'user_balances',
  'profit_distributions',
  'transactions',
  'investment_plans'
)
ORDER BY table_name;

-- Exit psql
\q
```

### Create Test Data

```sql
-- Create test investment plan
INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
VALUES ('Test Plan', 'Test investment plan', 100.00, 10000.00, 0.015, 30, true)
RETURNING id;

-- Create test user
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

### Verify Test Data

```sql
-- Check profit distributions
SELECT COUNT(*) FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;

-- Check user balance
SELECT total_balance FROM user_balances WHERE user_id = 'USER_ID_HERE';

-- Check transactions
SELECT * FROM transactions 
WHERE user_id = 'USER_ID_HERE' AND type = 'profit'
ORDER BY created_at DESC;
```

---

## 4️⃣ LOCAL TESTING

### Start Development Server

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Expected: Server running on http://localhost:3000
```

### Test Health Check Endpoint

```bash
# Test GET request (no auth required)
curl http://localhost:3000/api/cron/daily-profits

# Expected response:
# {
#   "success": true,
#   "status": "healthy",
#   "message": "Cron endpoint is ready",
#   "timestamp": "2024-01-15T09:00:00.000Z"
# }
```

### Test Manual Distribution

```bash
# Test POST request with CRON_SECRET
curl -X POST http://localhost:3000/api/cron/daily-profits \
  -H "Authorization: Bearer your-secure-cron-secret-change-in-production" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "success": true,
#   "timestamp": "2024-01-15T09:00:00.000Z",
#   "investment": {
#     "success": true,
#     "processed": 1,
#     "errors": 0,
#     "message": "Investment profit distribution completed"
#   }
# }
```

---

## 5️⃣ GIT COMMANDS

### Verify Git Status

```bash
# Check git status
git status

# Expected: working tree clean

# Check current branch
git branch

# Expected: * main

# View recent commits
git log --oneline -5
```

### Commit and Push

```bash
# Add all changes
git add .

# Commit changes
git commit -m "Fix profit distribution system and add cron configuration"

# Push to main branch
git push origin main

# Verify push
git log --oneline -1
```

---

## 6️⃣ DEPLOYMENT

### Deploy to Vercel

```bash
# Check deployment status
vercel status

# View deployment logs
vercel logs

# Redeploy if needed
vercel deploy --prod

# Check specific log entries
vercel logs | grep -i "profit"
vercel logs | grep -i "error"
```

---

## 7️⃣ PRODUCTION TESTING

### Test Production Endpoint

```bash
# Test health check
curl https://your-domain.vercel.app/api/cron/daily-profits

# Expected: 200 OK with healthy status

# Test with verbose output
curl -v https://your-domain.vercel.app/api/cron/daily-profits

# Test with authentication
curl -X POST https://your-domain.vercel.app/api/cron/daily-profits \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Check Cron Job Registration

```bash
# View Vercel dashboard
# https://vercel.com/dashboard

# Go to: Project Settings > Cron Jobs
# Expected: /api/cron/daily-profits with schedule "0 9 * * *"
```

### Monitor Production Logs

```bash
# View all logs
vercel logs

# View logs with filter
vercel logs | grep "profit"

# View error logs
vercel logs | grep -i "error"

# View logs in real-time
vercel logs --follow
```

---

## 8️⃣ DATABASE VERIFICATION (Production)

### Connect to Production Database

```bash
# Connect to Railway PostgreSQL
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway
```

### Check Profit Distributions

```sql
-- Count today's distributions
SELECT COUNT(*) FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;

-- List recent distributions
SELECT * FROM profit_distributions 
ORDER BY created_at DESC LIMIT 10;

-- Check user balance updates
SELECT total_balance FROM user_balances 
ORDER BY updated_at DESC LIMIT 5;

-- Check transaction records
SELECT * FROM transactions 
WHERE type = 'profit' 
AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

---

## 9️⃣ TROUBLESHOOTING

### Check for Errors

```bash
# View all errors in logs
vercel logs | grep -i "error"

# View specific error type
vercel logs | grep "Invalid cron secret"
vercel logs | grep "Database connection"
vercel logs | grep "404"

# View last 50 lines of logs
vercel logs | tail -50
```

### Verify Configuration

```bash
# Check vercel.json
cat vercel.json

# Check if cron endpoint exists
ls -la src/app/api/cron/daily-profits/route.ts

# Check environment variables
vercel env list

# Check git status
git status
```

### Redeploy

```bash
# If changes needed, commit and push
git add .
git commit -m "Fix issue"
git push origin main

# Monitor deployment
vercel status
vercel logs
```

---

## 🔟 MONITORING

### Daily Monitoring

```bash
# Check if cron job ran
vercel logs | grep "Starting automated daily profit distribution"

# Count today's distributions
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway -c \
  "SELECT COUNT(*) FROM profit_distributions WHERE DATE(distribution_date) = CURRENT_DATE;"

# Check for errors
vercel logs | grep -i "error"
```

### Weekly Monitoring

```bash
# View profit distribution statistics
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway -c \
  "SELECT DATE(distribution_date), COUNT(*) FROM profit_distributions GROUP BY DATE(distribution_date) ORDER BY DATE DESC LIMIT 7;"

# Check database size
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway -c \
  "SELECT pg_size_pretty(pg_database_size('railway'));"
```

---

## 📋 QUICK CHECKLIST

```bash
# 1. Generate secrets
openssl rand -base64 32

# 2. Add to Vercel
vercel env add CRON_SECRET

# 3. Verify database
psql -h localhost -p 5432 -U postgres -d broker_platform -c "SELECT COUNT(*) FROM profit_distributions;"

# 4. Test locally
curl http://localhost:3000/api/cron/daily-profits

# 5. Commit and push
git add . && git commit -m "Deploy" && git push origin main

# 6. Check deployment
vercel status

# 7. Test production
curl https://your-domain.vercel.app/api/cron/daily-profits

# 8. Monitor logs
vercel logs
```

---

## 🎯 COMMON ISSUES

```bash
# Issue: Invalid cron secret
# Solution: Verify CRON_SECRET in Vercel
vercel env list | grep CRON_SECRET

# Issue: Cron job not running
# Solution: Check vercel.json and redeploy
cat vercel.json
git push origin main

# Issue: Database connection error
# Solution: Verify DATABASE_URL
vercel env list | grep DATABASE_URL

# Issue: No profits distributed
# Solution: Check active investments
psql -h localhost -p 5432 -U postgres -d broker_platform -c \
  "SELECT COUNT(*) FROM user_investments WHERE status = 'active' AND end_date > NOW();"
```

---

## ✅ SUCCESS INDICATORS

```bash
# All checks should pass:

# 1. Health check responds
curl https://your-domain.vercel.app/api/cron/daily-profits
# Expected: 200 OK

# 2. Cron job registered
# Check Vercel Dashboard > Project Settings > Cron Jobs
# Expected: /api/cron/daily-profits listed

# 3. Profits distributed
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway -c \
  "SELECT COUNT(*) FROM profit_distributions WHERE DATE(distribution_date) = CURRENT_DATE;"
# Expected: > 0

# 4. No errors in logs
vercel logs | grep -i "error"
# Expected: (no output or only warnings)
```

---

## 📞 SUPPORT

For detailed information, see:
- `COMPREHENSIVE_DEPLOYMENT_CHECKLIST.md` - Full checklist
- `docs/PRE_DEPLOYMENT_CHECKLIST.md` - Pre-deployment guide
- `docs/DATABASE_VERIFICATION_GUIDE.md` - Database setup
- `docs/DEPLOYMENT_AND_TESTING_GUIDE.md` - Deployment steps
- `docs/TROUBLESHOOTING_GUIDE.md` - Common issues

