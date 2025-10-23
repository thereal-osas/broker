# Deployment and Testing Guide

## 🚀 Complete Deployment Procedure

### Phase 1: Pre-Deployment (Local Environment)

#### Step 1.1: Verify Local Environment

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check git status
git status

# Expected: working tree clean
```

#### Step 1.2: Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm list | head -20
```

#### Step 1.3: Start Development Server

```bash
# Start development server
npm run dev

# Expected output:
# ▲ Next.js 14.x.x
# - Local: http://localhost:3000
# - Environments: .env.local
```

#### Step 1.4: Test Health Check Endpoint

```bash
# In a new terminal, test the endpoint
curl http://localhost:3000/api/cron/daily-profits

# Expected response (200 OK):
# {
#   "success": true,
#   "status": "healthy",
#   "message": "Cron endpoint is ready",
#   "timestamp": "2024-01-15T09:00:00.000Z"
# }
```

#### Step 1.5: Test Manual Distribution

```bash
# Test with CRON_SECRET
curl -X POST http://localhost:3000/api/cron/daily-profits \
  -H "Authorization: Bearer your-secure-cron-secret-change-in-production" \
  -H "Content-Type: application/json"

# Expected response (200 OK):
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

#### Step 1.6: Verify Database Records

```bash
# Connect to local database
psql -h localhost -p 5432 -U postgres -d broker_platform

# Check profit distributions
SELECT COUNT(*) FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;

# Check user balance updated
SELECT total_balance FROM user_balances 
WHERE user_id = 'YOUR_TEST_USER_ID';

# Exit psql
\q
```

---

### Phase 2: Pre-Deployment Checks

#### Step 2.1: Verify All Files Are Committed

```bash
# Check git status
git status

# Expected: nothing to commit, working tree clean

# If not clean, commit changes:
git add .
git commit -m "Fix profit distribution system and add cron configuration"
```

#### Step 2.2: Verify vercel.json Configuration

```bash
# Check vercel.json exists and has cron config
cat vercel.json

# Expected output:
# {
#   "functions": {
#     "src/app/api/**/*.ts": {
#       "maxDuration": 30
#     }
#   },
#   "env": {
#     "NODE_ENV": "production"
#   },
#   "crons": [
#     {
#       "path": "/api/cron/daily-profits",
#       "schedule": "0 9 * * *"
#     }
#   ]
# }
```

#### Step 2.3: Verify Cron Endpoint Exists

```bash
# Check if cron endpoint file exists
ls -la src/app/api/cron/daily-profits/route.ts

# Expected: file exists and is readable
```

#### Step 2.4: Generate Secure Secrets

```bash
# Generate CRON_SECRET (32 characters)
openssl rand -base64 32

# Generate NEXTAUTH_SECRET (32 characters)
openssl rand -base64 32

# Save these values - you'll need them for Vercel
```

---

### Phase 3: Vercel Configuration

#### Step 3.1: Login to Vercel

```bash
# Login to Vercel CLI
vercel login

# Follow the prompts to authenticate
```

#### Step 3.2: Link Project to Vercel

```bash
# Link project (if not already linked)
vercel link

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? Yes (if already created)
# - Which project? Select your project
```

#### Step 3.3: Add Environment Variables

```bash
# Add DATABASE_URL
vercel env add DATABASE_URL
# Paste: postgresql://postgres:PASSWORD@turntable.proxy.rlwy.net:30859/railway

# Add NEXTAUTH_URL
vercel env add NEXTAUTH_URL
# Paste: https://your-domain.vercel.app

# Add NEXTAUTH_SECRET
vercel env add NEXTAUTH_SECRET
# Paste: <generated-secret-from-step-2.4>

# Add CRON_SECRET
vercel env add CRON_SECRET
# Paste: <generated-secret-from-step-2.4>

# Add NODE_ENV
vercel env add NODE_ENV
# Paste: production

# Verify all variables
vercel env list
```

#### Step 3.4: Verify Environment Variables in Dashboard

```bash
# Go to Vercel Dashboard
# https://vercel.com/dashboard

# Select your project
# Go to Settings > Environment Variables

# Verify all variables are present:
# - DATABASE_URL (Production)
# - NEXTAUTH_URL (Production)
# - NEXTAUTH_SECRET (Production)
# - CRON_SECRET (Production)
# - NODE_ENV (Production)
```

---

### Phase 4: Deploy to Production

#### Step 4.1: Push to Main Branch

```bash
# Ensure all changes are committed
git status

# Push to main branch
git push origin main

# Vercel will automatically start deployment
```

#### Step 4.2: Monitor Deployment

```bash
# Check deployment status
vercel status

# View deployment logs
vercel logs

# Expected: Deployment completed successfully
```

#### Step 4.3: Wait for Deployment to Complete

```bash
# Check deployment in Vercel Dashboard
# https://vercel.com/dashboard

# Expected status: Ready
# Expected: All checks passed
```

---

### Phase 5: Post-Deployment Verification

#### Step 5.1: Verify Cron Job Registration

```bash
# Go to Vercel Dashboard
# Project > Settings > Cron Jobs

# Verify:
# - Path: /api/cron/daily-profits
# - Schedule: 0 9 * * * (9:00 AM UTC daily)
# - Status: Active
```

#### Step 5.2: Test Health Check Endpoint

```bash
# Test production health check
curl https://your-domain.vercel.app/api/cron/daily-profits

# Expected response (200 OK):
# {
#   "success": true,
#   "status": "healthy",
#   "message": "Cron endpoint is ready",
#   "timestamp": "2024-01-15T09:00:00.000Z"
# }
```

#### Step 5.3: Check Vercel Logs

```bash
# View production logs
vercel logs

# Look for:
# - "Starting automated daily profit distribution..."
# - "Found X eligible investments"
# - "Successfully processed: X"
# - "Daily profit distribution completed"
```

#### Step 5.4: Verify Database Records

```bash
# Connect to production database
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway

# Check profit distributions
SELECT COUNT(*) FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;

# Check recent distributions
SELECT * FROM profit_distributions 
ORDER BY created_at DESC LIMIT 5;

# Exit psql
\q
```

---

## 🧪 Testing Procedures

### Local Testing

#### Test 1: Health Check

```bash
# Test GET request (no auth)
curl http://localhost:3000/api/cron/daily-profits

# Expected: 200 OK with healthy status
```

#### Test 2: Manual Distribution

```bash
# Test POST request with auth
curl -X POST http://localhost:3000/api/cron/daily-profits \
  -H "Authorization: Bearer your-secure-cron-secret-change-in-production" \
  -H "Content-Type: application/json"

# Expected: 200 OK with distribution results
```

#### Test 3: Admin Panel

```bash
# Navigate to admin panel
# http://localhost:3000/admin/profit-distribution

# Click "Run Distribution" button
# Verify results display correctly
```

#### Test 4: Database Verification

```bash
# Check profit distributions created
SELECT COUNT(*) FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;

# Check user balance updated
SELECT total_balance FROM user_balances 
WHERE user_id = 'TEST_USER_ID';

# Check transactions created
SELECT * FROM transactions 
WHERE user_id = 'TEST_USER_ID' 
AND type = 'profit'
ORDER BY created_at DESC;
```

### Production Testing

#### Test 1: Health Check

```bash
# Test production health check
curl https://your-domain.vercel.app/api/cron/daily-profits

# Expected: 200 OK
```

#### Test 2: Monitor Cron Job

```bash
# Wait for scheduled time (9:00 AM UTC)
# Check Vercel logs for execution

# Expected log messages:
# - "Starting automated daily profit distribution..."
# - "Found X eligible investments"
# - "Successfully processed: X"
```

#### Test 3: Verify Database Updates

```bash
# Connect to production database
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway

# Check today's distributions
SELECT COUNT(*) FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;

# Check user balances updated
SELECT total_balance FROM user_balances 
ORDER BY updated_at DESC LIMIT 5;
```

#### Test 4: Check Transaction Records

```bash
# Verify transaction records created
SELECT * FROM transactions 
WHERE type = 'profit' 
AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

---

## 🔍 Monitoring and Verification

### Daily Monitoring Checklist

- [ ] Check Vercel logs for cron job execution
- [ ] Verify profit distributions in database
- [ ] Check user balances updated correctly
- [ ] Verify transaction records created
- [ ] Monitor for any error messages
- [ ] Check database connection status

### Weekly Monitoring

- [ ] Review profit distribution statistics
- [ ] Check for any failed distributions
- [ ] Verify user balance accuracy
- [ ] Monitor database performance
- [ ] Check for any security issues

### Monthly Monitoring

- [ ] Review total profits distributed
- [ ] Analyze distribution patterns
- [ ] Check database size and growth
- [ ] Review error logs
- [ ] Plan for any optimizations

---

## ✅ SUCCESS INDICATORS

- ✅ Deployment completed without errors
- ✅ Cron job registered in Vercel
- ✅ Health check endpoint responds
- ✅ Profits distributed at scheduled time
- ✅ Database records created correctly
- ✅ User balances updated
- ✅ Transaction records created
- ✅ No errors in logs

