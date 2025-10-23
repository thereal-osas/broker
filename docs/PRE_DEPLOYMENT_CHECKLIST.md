# Pre-Deployment Checklist - Investment Profit Distribution System

## 📋 Quick Overview

This checklist ensures your broker application's profit distribution system is properly configured and ready for production deployment on Vercel with Railway PostgreSQL database.

**Estimated Time**: 30-45 minutes
**Difficulty**: Intermediate
**Prerequisites**: Git, Node.js, PostgreSQL client (optional)

---

## 1️⃣ ENVIRONMENT VARIABLES VERIFICATION

### 1.1 Local Development (.env.local)

**Required Variables for Profit Distribution:**

```env
# Database Connection (LOCAL)
DATABASE_URL=postgresql://postgres:Mirror1%23%40@localhost:5432/broker_platform

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production

# Cron Job Configuration (CRITICAL FOR PROFIT DISTRIBUTION)
CRON_SECRET=your-secure-cron-secret-change-in-production

# Application Configuration
APP_URL=http://localhost:3000
NODE_ENV=development
```

**Verification Steps:**

```bash
# 1. Check .env.local exists
ls -la .env.local

# 2. Verify CRON_SECRET is set
grep "CRON_SECRET" .env.local

# 3. Verify DATABASE_URL is set
grep "DATABASE_URL" .env.local

# 4. Verify NEXTAUTH_SECRET is set
grep "NEXTAUTH_SECRET" .env.local
```

### 1.2 Production Environment (Vercel)

**Required Variables for Production:**

| Variable | Value | Source | Notes |
|----------|-------|--------|-------|
| `DATABASE_URL` | Railway PostgreSQL URL | Railway Dashboard | Must include SSL |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Your Vercel domain | Must match deployment URL |
| `NEXTAUTH_SECRET` | Strong random string | Generate new | Different from local |
| `CRON_SECRET` | Strong random string (32+ chars) | Generate new | **CRITICAL** for cron jobs |
| `NODE_ENV` | `production` | Set to production | Required for Vercel |

**Generate Secure Secrets:**

```bash
# Generate CRON_SECRET (32 characters)
openssl rand -base64 32

# Generate NEXTAUTH_SECRET (32 characters)
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Select-Object -First 32
```

**Verification Steps:**

```bash
# 1. List all environment variables in Vercel
vercel env list

# 2. Check specific variable
vercel env pull

# 3. Verify in Vercel Dashboard:
#    - Go to Project Settings > Environment Variables
#    - Confirm all required variables are present
#    - Verify values are correct (don't show full secrets)
```

### 1.3 Environment Variable Differences

| Variable | Local | Production | Why Different |
|----------|-------|------------|----------------|
| `DATABASE_URL` | localhost:5432 | Railway URL | Different database hosts |
| `NEXTAUTH_URL` | http://localhost:3000 | https://your-domain.vercel.app | Different domains |
| `NEXTAUTH_SECRET` | Placeholder | Unique strong secret | Security best practice |
| `CRON_SECRET` | Placeholder | Unique strong secret | Security best practice |
| `NODE_ENV` | development | production | Vercel requirement |

---

## 2️⃣ DATABASE VERIFICATION

### 2.1 Required Tables

**Critical Tables for Profit Distribution:**

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
```

**Expected Output:**
```
        table_name
─────────────────────────
investment_plans
profit_distributions
transactions
user_balances
user_investments
users
(6 rows)
```

### 2.2 Table Schemas

**user_investments Table:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_investments'
ORDER BY ordinal_position;
```

**Required Columns:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `plan_id` (UUID) - Foreign key to investment_plans
- `amount` (DECIMAL) - Investment amount
- `status` (VARCHAR) - 'active', 'completed', 'cancelled'
- `end_date` (TIMESTAMP) - Investment end date
- `created_at` (TIMESTAMP) - Creation timestamp

**profit_distributions Table:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profit_distributions'
ORDER BY ordinal_position;
```

**Required Columns:**
- `id` (UUID) - Primary key
- `investment_id` (UUID) - Foreign key to user_investments
- `user_id` (UUID) - Foreign key to users
- `amount` (DECIMAL) - Original investment amount
- `profit_amount` (DECIMAL) - Daily profit amount
- `distribution_date` (TIMESTAMP) - Distribution date
- `created_at` (TIMESTAMP) - Creation timestamp

### 2.3 Database Verification Script

```bash
# Run verification script
node scripts/verify-db.js

# Expected output:
# ✅ Database connection successful
# ✅ users table exists
# ✅ user_investments table exists
# ✅ profit_distributions table exists
# ✅ user_balances table exists
# ✅ transactions table exists
# ✅ investment_plans table exists
```

### 2.4 Create Test Data

```sql
-- 1. Create test investment plan
INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
VALUES ('Test Plan', 'Test investment plan', 100.00, 10000.00, 0.015, 30, true)
RETURNING id;
-- Save the returned ID as PLAN_ID

-- 2. Create test user (if needed)
INSERT INTO users (email, password, first_name, last_name, role)
VALUES ('test@example.com', 'password123', 'Test', 'User', 'investor')
RETURNING id;
-- Save the returned ID as USER_ID

-- 3. Create user balance
INSERT INTO user_balances (user_id, total_balance)
VALUES ('USER_ID_HERE', 0.00)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create test investment
INSERT INTO user_investments (user_id, plan_id, amount, status, end_date)
VALUES ('USER_ID_HERE', 'PLAN_ID_HERE', 1000.00, 'active', NOW() + INTERVAL '30 days')
RETURNING id;
-- Save the returned ID as INVESTMENT_ID
```

### 2.5 Verify Test Data

```sql
-- Check test investment
SELECT * FROM user_investments WHERE id = 'INVESTMENT_ID_HERE';

-- Check user balance
SELECT * FROM user_balances WHERE user_id = 'USER_ID_HERE';

-- Check investment plan
SELECT * FROM investment_plans WHERE id = 'PLAN_ID_HERE';
```

---

## 3️⃣ LOCAL TESTING

### 3.1 Start Development Server

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Expected output:
# ▲ Next.js 14.x.x
# - Local: http://localhost:3000
```

### 3.2 Test Health Check Endpoint

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

### 3.3 Test Manual Distribution (Admin Panel)

```bash
# 1. Navigate to admin panel
# http://localhost:3000/admin/profit-distribution

# 2. Click "Run Distribution" button

# 3. Verify results show:
# - Processed: 1
# - Errors: 0
# - Message: "Investment profit distribution completed"
```

### 3.4 Test Cron Endpoint with Authentication

```bash
# Set environment variable
export CRON_SECRET=your-secure-cron-secret-change-in-production

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

### 3.5 Verify Database Records

```sql
-- Check profit distributions created
SELECT * FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE
ORDER BY created_at DESC;

-- Check user balance updated
SELECT * FROM user_balances 
WHERE user_id = 'USER_ID_HERE';

-- Check transactions created
SELECT * FROM transactions 
WHERE user_id = 'USER_ID_HERE' 
AND type = 'profit'
ORDER BY created_at DESC;
```

---

## 4️⃣ DEPLOYMENT STEPS

### 4.1 Pre-Deployment Checklist

- [ ] All environment variables verified locally
- [ ] Database tables verified to exist
- [ ] Test data created and verified
- [ ] Local testing completed successfully
- [ ] Health check endpoint responds
- [ ] Manual distribution works
- [ ] Cron endpoint accepts CRON_SECRET
- [ ] Git repository is clean (no uncommitted changes)

### 4.2 Configure Vercel Environment Variables

```bash
# 1. Login to Vercel
vercel login

# 2. Link project (if not already linked)
vercel link

# 3. Add environment variables
vercel env add DATABASE_URL
# Paste: postgresql://user:password@host:port/database

vercel env add NEXTAUTH_URL
# Paste: https://your-domain.vercel.app

vercel env add NEXTAUTH_SECRET
# Paste: <generated-secret>

vercel env add CRON_SECRET
# Paste: <generated-secret>

vercel env add NODE_ENV
# Paste: production

# 4. Verify all variables are set
vercel env list
```

### 4.3 Deploy to Vercel

```bash
# 1. Commit all changes
git add .
git commit -m "Fix profit distribution system and add cron configuration"

# 2. Push to main branch
git push origin main

# 3. Vercel will automatically deploy
# Monitor deployment in Vercel dashboard

# 4. Wait for deployment to complete
# Check status: vercel status
```

### 4.4 Post-Deployment Verification

```bash
# 1. Verify deployment completed
vercel status

# 2. Check cron job registration
# Go to Vercel Dashboard > Project Settings > Cron Jobs
# Verify: /api/cron/daily-profits with schedule "0 9 * * *"

# 3. Test health check endpoint
curl https://your-domain.vercel.app/api/cron/daily-profits

# 4. Check Vercel logs
vercel logs

# 5. Monitor first cron run at 9:00 AM UTC
```

---

## 5️⃣ COMMON ISSUES & SOLUTIONS

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid cron secret" | CRON_SECRET not set in Vercel | Add CRON_SECRET to Vercel env vars |
| Cron job not running | vercel.json not deployed | Verify vercel.json has cron config |
| Database connection error | DATABASE_URL incorrect | Verify Railway URL in Vercel env vars |
| No profits distributed | No active investments | Create test investment with active status |
| Endpoint returns 404 | Route file not created | Verify src/app/api/cron/daily-profits/route.ts exists |

---

## ✅ SUCCESS INDICATORS

- ✅ All environment variables set correctly
- ✅ All required database tables exist
- ✅ Test data created successfully
- ✅ Local testing passes
- ✅ Deployment completes without errors
- ✅ Cron job appears in Vercel dashboard
- ✅ Health check endpoint responds
- ✅ Profits distributed at scheduled time

