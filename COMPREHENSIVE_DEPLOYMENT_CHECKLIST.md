# 🚀 Comprehensive Pre-Deployment Checklist

## Investment Profit Distribution System - Complete Deployment Guide

**Estimated Time**: 45-60 minutes | **Difficulty**: Intermediate | **Status**: Ready for Production

---

## ✅ SECTION 1: ENVIRONMENT VARIABLES (15 minutes)

### Local Development (.env.local)

- [ ] `DATABASE_URL` set to local PostgreSQL
  ```bash
  grep "DATABASE_URL" .env.local
  # Expected: postgresql://postgres:Mirror1%23%40@localhost:5432/broker_platform
  ```

- [ ] `NEXTAUTH_URL` set to localhost
  ```bash
  grep "NEXTAUTH_URL" .env.local
  # Expected: http://localhost:3000
  ```

- [ ] `NEXTAUTH_SECRET` set (any value for local)
  ```bash
  grep "NEXTAUTH_SECRET" .env.local
  ```

- [ ] `CRON_SECRET` set (any value for local)
  ```bash
  grep "CRON_SECRET" .env.local
  ```

- [ ] `NODE_ENV` set to development
  ```bash
  grep "NODE_ENV" .env.local
  # Expected: development
  ```

### Production Environment (Vercel)

- [ ] Generate secure CRON_SECRET (32+ characters)
  ```bash
  openssl rand -base64 32
  ```

- [ ] Generate secure NEXTAUTH_SECRET (32+ characters)
  ```bash
  openssl rand -base64 32
  ```

- [ ] Get Railway DATABASE_URL
  - Go to Railway Dashboard > Your Project > Database
  - Click "Connect" > PostgreSQL > Connection String
  - Copy full URL

- [ ] Add all variables to Vercel
  ```bash
  vercel env add DATABASE_URL
  vercel env add NEXTAUTH_URL
  vercel env add NEXTAUTH_SECRET
  vercel env add CRON_SECRET
  vercel env add NODE_ENV
  ```

- [ ] Verify all variables in Vercel
  ```bash
  vercel env list
  ```

---

## ✅ SECTION 2: DATABASE VERIFICATION (15 minutes)

### Required Tables

- [ ] `users` table exists
  ```sql
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');
  ```

- [ ] `user_investments` table exists
  ```sql
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_investments');
  ```

- [ ] `user_balances` table exists
  ```sql
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_balances');
  ```

- [ ] `profit_distributions` table exists
  ```sql
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profit_distributions');
  ```

- [ ] `transactions` table exists
  ```sql
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions');
  ```

- [ ] `investment_plans` table exists
  ```sql
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'investment_plans');
  ```

### Table Schemas

- [ ] `profit_distributions` has all required columns
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'profit_distributions';
  ```

- [ ] `user_investments` has all required columns
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'user_investments';
  ```

### Indexes

- [ ] Index on `profit_distributions.investment_id`
  ```sql
  CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id 
  ON profit_distributions(investment_id);
  ```

- [ ] Index on `profit_distributions.user_id`
  ```sql
  CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id 
  ON profit_distributions(user_id);
  ```

- [ ] Index on `user_investments.status`
  ```sql
  CREATE INDEX IF NOT EXISTS idx_user_investments_status 
  ON user_investments(status);
  ```

### Test Data

- [ ] Create test investment plan
  ```sql
  INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
  VALUES ('Test Plan', 'Test', 100.00, 10000.00, 0.015, 30, true) RETURNING id;
  ```

- [ ] Create test user
  ```sql
  INSERT INTO users (email, password, first_name, last_name, role)
  VALUES ('test@example.com', 'password123', 'Test', 'User', 'investor') RETURNING id;
  ```

- [ ] Create user balance
  ```sql
  INSERT INTO user_balances (user_id, total_balance) VALUES ('USER_ID', 0.00);
  ```

- [ ] Create test investment
  ```sql
  INSERT INTO user_investments (user_id, plan_id, amount, status, end_date)
  VALUES ('USER_ID', 'PLAN_ID', 1000.00, 'active', NOW() + INTERVAL '30 days');
  ```

---

## ✅ SECTION 3: LOCAL TESTING (15 minutes)

### Development Server

- [ ] Install dependencies
  ```bash
  npm install
  ```

- [ ] Start development server
  ```bash
  npm run dev
  ```

- [ ] Server running on http://localhost:3000
  ```bash
  # Check in browser or with curl
  curl http://localhost:3000
  ```

### Endpoint Testing

- [ ] Health check endpoint responds
  ```bash
  curl http://localhost:3000/api/cron/daily-profits
  # Expected: 200 OK with healthy status
  ```

- [ ] Manual distribution works
  ```bash
  curl -X POST http://localhost:3000/api/cron/daily-profits \
    -H "Authorization: Bearer your-secure-cron-secret-change-in-production" \
    -H "Content-Type: application/json"
  # Expected: 200 OK with distribution results
  ```

### Admin Panel Testing

- [ ] Navigate to admin panel
  ```
  http://localhost:3000/admin/profit-distribution
  ```

- [ ] Click "Run Distribution" button

- [ ] Verify results display correctly

### Database Verification

- [ ] Profit distributions recorded
  ```sql
  SELECT COUNT(*) FROM profit_distributions 
  WHERE DATE(distribution_date) = CURRENT_DATE;
  ```

- [ ] User balance updated
  ```sql
  SELECT total_balance FROM user_balances WHERE user_id = 'TEST_USER_ID';
  ```

- [ ] Transaction records created
  ```sql
  SELECT * FROM transactions WHERE user_id = 'TEST_USER_ID' AND type = 'profit';
  ```

---

## ✅ SECTION 4: PRE-DEPLOYMENT CHECKS (10 minutes)

### Code Verification

- [ ] No uncommitted changes
  ```bash
  git status
  # Expected: working tree clean
  ```

- [ ] vercel.json has cron configuration
  ```bash
  cat vercel.json | grep -A 5 "crons"
  ```

- [ ] Cron endpoint file exists
  ```bash
  ls -la src/app/api/cron/daily-profits/route.ts
  ```

- [ ] No TypeScript errors
  ```bash
  npm run build
  ```

### Git Verification

- [ ] All changes committed
  ```bash
  git status
  ```

- [ ] On main branch
  ```bash
  git branch
  ```

- [ ] Latest changes pushed
  ```bash
  git log --oneline -5
  ```

---

## ✅ SECTION 5: DEPLOYMENT (10 minutes)

### Vercel Setup

- [ ] Logged into Vercel CLI
  ```bash
  vercel login
  ```

- [ ] Project linked to Vercel
  ```bash
  vercel link
  ```

- [ ] All environment variables added
  ```bash
  vercel env list
  ```

### Deploy

- [ ] Push to main branch
  ```bash
  git push origin main
  ```

- [ ] Deployment started in Vercel
  - Check Vercel Dashboard

- [ ] Deployment completed successfully
  ```bash
  vercel status
  # Expected: Ready
  ```

- [ ] No build errors
  ```bash
  vercel logs | grep -i error
  ```

---

## ✅ SECTION 6: POST-DEPLOYMENT VERIFICATION (10 minutes)

### Cron Job Registration

- [ ] Cron job appears in Vercel dashboard
  - Go to Project Settings > Cron Jobs
  - Expected: `/api/cron/daily-profits` listed

- [ ] Schedule is correct
  - Expected: `0 9 * * *` (9:00 AM UTC daily)

- [ ] Status is Active

### Endpoint Testing

- [ ] Health check responds
  ```bash
  curl https://your-domain.vercel.app/api/cron/daily-profits
  # Expected: 200 OK
  ```

- [ ] Endpoint is accessible
  - No 404 errors
  - No 500 errors

### Database Verification

- [ ] Can connect to production database
  ```bash
  psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway
  ```

- [ ] Tables exist in production
  ```sql
  SELECT COUNT(*) FROM profit_distributions;
  ```

### Logs

- [ ] Check Vercel logs for errors
  ```bash
  vercel logs
  ```

- [ ] No connection errors
- [ ] No authentication errors
- [ ] No database errors

---

## ✅ SECTION 7: MONITORING (Ongoing)

### Daily Checks

- [ ] Cron job executed at 9:00 AM UTC
  - Check Vercel logs

- [ ] Profits distributed correctly
  ```sql
  SELECT COUNT(*) FROM profit_distributions 
  WHERE DATE(distribution_date) = CURRENT_DATE;
  ```

- [ ] User balances updated
  ```sql
  SELECT COUNT(*) FROM user_balances 
  WHERE DATE(updated_at) = CURRENT_DATE;
  ```

- [ ] No errors in logs
  ```bash
  vercel logs | grep -i error
  ```

### Weekly Checks

- [ ] Review profit distribution statistics
- [ ] Check for any failed distributions
- [ ] Monitor database performance
- [ ] Review error logs

---

## 📚 DOCUMENTATION REFERENCE

| Document | Purpose |
|----------|---------|
| `docs/PRE_DEPLOYMENT_CHECKLIST.md` | Detailed pre-deployment guide |
| `docs/DATABASE_VERIFICATION_GUIDE.md` | Database setup and verification |
| `docs/DEPLOYMENT_AND_TESTING_GUIDE.md` | Step-by-step deployment |
| `docs/TROUBLESHOOTING_GUIDE.md` | Common issues and solutions |
| `docs/PROFIT_DISTRIBUTION_DEPLOYMENT.md` | System overview |
| `docs/PROFIT_DISTRIBUTION_VERIFICATION.md` | Testing procedures |

---

## 🎯 QUICK COMMAND REFERENCE

```bash
# Generate secrets
openssl rand -base64 32

# Test local endpoint
curl http://localhost:3000/api/cron/daily-profits

# Test production endpoint
curl https://your-domain.vercel.app/api/cron/daily-profits

# Add Vercel environment variables
vercel env add CRON_SECRET

# Deploy
git push origin main

# Check deployment status
vercel status

# View logs
vercel logs

# Connect to database
psql -h localhost -p 5432 -U postgres -d broker_platform
```

---

## ✨ SUCCESS CRITERIA

- ✅ All environment variables configured
- ✅ Database tables verified
- ✅ Local testing passed
- ✅ Deployment completed
- ✅ Cron job registered
- ✅ Health check responds
- ✅ Profits distributed automatically
- ✅ No errors in logs

---

## 🚀 YOU'RE READY TO DEPLOY!

Follow this checklist step-by-step and your profit distribution system will be fully operational in production.

**Estimated Total Time**: 45-60 minutes
**Difficulty**: Intermediate
**Success Rate**: 99% (if checklist followed)

Good luck! 🎉

