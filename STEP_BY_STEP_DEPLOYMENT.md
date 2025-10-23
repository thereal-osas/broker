# Step-by-Step Deployment Guide

## 🎯 Exact Steps to Deploy Your Profit Distribution System

**Total Time**: 45-60 minutes | **Difficulty**: Intermediate

---

## STEP 1: GENERATE SECURE SECRETS (2 minutes)

### On Mac/Linux:
```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Example output:
# aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890+/==

# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Example output:
# xYz9876543210+/==aBcDeFgHiJkLmNoPqRsTuVwX
```

### On Windows PowerShell:
```powershell
# Generate CRON_SECRET
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Select-Object -First 32

# Generate NEXTAUTH_SECRET
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Select-Object -First 32
```

**✅ Save these values - you'll need them in Step 3**

---

## STEP 2: VERIFY LOCAL SETUP (5 minutes)

### 2.1 Check Git Status
```bash
cd c:\Users\Osas\OneDrive\Desktop\ezzy\broker

git status
# Expected: working tree clean
```

### 2.2 Verify Files Exist
```bash
# Check if cron endpoint exists
ls src/app/api/cron/daily-profits/route.ts

# Check if vercel.json exists
ls vercel.json

# Check if .env.local exists
ls .env.local
```

### 2.3 Verify vercel.json Configuration
```bash
cat vercel.json

# Expected output should include:
# "crons": [
#   {
#     "path": "/api/cron/daily-profits",
#     "schedule": "0 9 * * *"
#   }
# ]
```

**✅ All files should exist and be properly configured**

---

## STEP 3: ADD ENVIRONMENT VARIABLES TO VERCEL (10 minutes)

### 3.1 Login to Vercel
```bash
vercel login

# Follow the prompts to authenticate
# You'll be redirected to browser to confirm
```

### 3.2 Link Your Project
```bash
vercel link

# Follow the prompts:
# - Set up and deploy? → Yes
# - Which scope? → Select your account
# - Link to existing project? → Yes
# - Which project? → Select "broker" or your project name
```

### 3.3 Add Environment Variables

**Add DATABASE_URL:**
```bash
vercel env add DATABASE_URL

# When prompted, paste:
# postgresql://postgres:UUHFHLmfoRLVNTSTbDgrGxsNWTgDCbCx@turntable.proxy.rlwy.net:30859/railway
```

**Add NEXTAUTH_URL:**
```bash
vercel env add NEXTAUTH_URL

# When prompted, paste:
# https://broker-weld.vercel.app
# (Replace with your actual Vercel domain)
```

**Add NEXTAUTH_SECRET:**
```bash
vercel env add NEXTAUTH_SECRET

# When prompted, paste:
# <the NEXTAUTH_SECRET you generated in Step 1>
```

**Add CRON_SECRET:**
```bash
vercel env add CRON_SECRET

# When prompted, paste:
# <the CRON_SECRET you generated in Step 1>
```

**Add NODE_ENV:**
```bash
vercel env add NODE_ENV

# When prompted, paste:
# production
```

### 3.4 Verify All Variables
```bash
vercel env list

# Expected output:
# DATABASE_URL (Production)
# NEXTAUTH_URL (Production)
# NEXTAUTH_SECRET (Production)
# CRON_SECRET (Production)
# NODE_ENV (Production)
```

**✅ All 5 environment variables should be listed**

---

## STEP 4: VERIFY DATABASE (5 minutes)

### 4.1 Connect to Local Database
```bash
psql -h localhost -p 5432 -U postgres -d broker_platform

# If prompted for password, enter: Mirror1#@
```

### 4.2 Check Required Tables
```sql
-- Copy and paste this entire block:
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

-- Expected output (6 rows):
-- investment_plans
-- profit_distributions
-- transactions
-- user_balances
-- user_investments
-- users
```

### 4.3 Exit Database
```sql
\q
```

**✅ All 6 required tables should exist**

---

## STEP 5: LOCAL TESTING (10 minutes)

### 5.1 Start Development Server
```bash
npm run dev

# Expected output:
# ▲ Next.js 14.x.x
# - Local: http://localhost:3000
# - Environments: .env.local
```

### 5.2 Test Health Check Endpoint
```bash
# Open a new terminal and run:
curl http://localhost:3000/api/cron/daily-profits

# Expected response (200 OK):
# {
#   "success": true,
#   "status": "healthy",
#   "message": "Cron endpoint is ready",
#   "timestamp": "2024-01-15T09:00:00.000Z"
# }
```

### 5.3 Test Manual Distribution
```bash
curl -X POST http://localhost:3000/api/cron/daily-profits \
  -H "Authorization: Bearer your-secure-cron-secret-change-in-production" \
  -H "Content-Type: application/json"

# Expected response (200 OK):
# {
#   "success": true,
#   "timestamp": "2024-01-15T09:00:00.000Z",
#   "investment": {
#     "success": true,
#     "processed": 0,
#     "errors": 0,
#     "message": "Investment profit distribution completed"
#   }
# }
```

**✅ Both endpoints should respond successfully**

---

## STEP 6: COMMIT AND PUSH (5 minutes)

### 6.1 Stop Development Server
```bash
# In the terminal running npm run dev, press Ctrl+C
```

### 6.2 Verify Git Status
```bash
git status

# Expected: working tree clean
# (All changes should already be committed)
```

### 6.3 Push to Main Branch
```bash
git push origin main

# Expected output:
# Enumerating objects: X, done.
# Counting objects: 100% (X/X), done.
# ...
# To github.com:your-repo/broker.git
#    abc1234..def5678  main -> main
```

**✅ Changes pushed to GitHub**

---

## STEP 7: DEPLOY TO VERCEL (10 minutes)

### 7.1 Monitor Deployment
```bash
vercel status

# Expected output:
# Deployment Status: Ready
# Production URL: https://broker-weld.vercel.app
```

### 7.2 Wait for Deployment
- Go to Vercel Dashboard: https://vercel.com/dashboard
- Select your project
- Wait for status to show "Ready" (usually 2-5 minutes)

### 7.3 Check Deployment Logs
```bash
vercel logs

# Look for:
# - "Build completed"
# - "Deployment ready"
# - No error messages
```

**✅ Deployment should complete successfully**

---

## STEP 8: VERIFY CRON JOB REGISTRATION (5 minutes)

### 8.1 Check Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** > **Cron Jobs**
4. Verify you see:
   - **Path**: `/api/cron/daily-profits`
   - **Schedule**: `0 9 * * *` (9:00 AM UTC daily)
   - **Status**: Active

### 8.2 Test Production Endpoint
```bash
curl https://broker-weld.vercel.app/api/cron/daily-profits

# Expected response (200 OK):
# {
#   "success": true,
#   "status": "healthy",
#   "message": "Cron endpoint is ready",
#   "timestamp": "2024-01-15T09:00:00.000Z"
# }
```

**✅ Cron job registered and endpoint responds**

---

## STEP 9: MONITOR FIRST RUN (Ongoing)

### 9.1 Wait for 9:00 AM UTC
- Cron job will automatically run at 9:00 AM UTC daily
- First run will be at the next scheduled time

### 9.2 Check Logs
```bash
vercel logs

# Look for:
# - "Starting automated daily profit distribution..."
# - "Found X eligible investments"
# - "Successfully processed: X"
# - "Daily profit distribution completed"
```

### 9.3 Verify Database
```bash
psql -h turntable.proxy.rlwy.net -p 30859 -U postgres -d railway

# Check profit distributions
SELECT COUNT(*) FROM profit_distributions 
WHERE DATE(distribution_date) = CURRENT_DATE;

# Exit
\q
```

**✅ Profits should be distributed at scheduled time**

---

## ✅ DEPLOYMENT COMPLETE!

Your profit distribution system is now:
- ✅ Configured with all environment variables
- ✅ Deployed to production
- ✅ Cron job registered
- ✅ Ready to distribute profits automatically

---

## 🎯 QUICK REFERENCE

| Step | Action | Time |
|------|--------|------|
| 1 | Generate secrets | 2 min |
| 2 | Verify local setup | 5 min |
| 3 | Add Vercel env vars | 10 min |
| 4 | Verify database | 5 min |
| 5 | Local testing | 10 min |
| 6 | Commit and push | 5 min |
| 7 | Deploy to Vercel | 10 min |
| 8 | Verify cron job | 5 min |
| 9 | Monitor first run | Ongoing |
| **TOTAL** | | **45-60 min** |

---

## 🆘 TROUBLESHOOTING

### If Step 3 fails (Vercel env vars):
```bash
# Verify you're logged in
vercel whoami

# If not logged in, login again
vercel login

# Try adding variables again
vercel env add CRON_SECRET
```

### If Step 5 fails (Local testing):
```bash
# Check if port 3000 is in use
lsof -i :3000

# If in use, kill the process
kill -9 <PID>

# Try starting dev server again
npm run dev
```

### If Step 7 fails (Deployment):
```bash
# Check for build errors
npm run build

# Fix any errors, then push again
git add .
git commit -m "Fix build errors"
git push origin main
```

### If Step 8 fails (Cron job not registered):
```bash
# Verify vercel.json is correct
cat vercel.json

# Redeploy
git push origin main

# Wait 5 minutes and check again
vercel status
```

---

## 📞 NEED HELP?

See these documents:
- `COMPREHENSIVE_DEPLOYMENT_CHECKLIST.md` - Full checklist
- `DEPLOYMENT_COMMANDS_REFERENCE.md` - All commands
- `docs/TROUBLESHOOTING_GUIDE.md` - Common issues
- `docs/DEPLOYMENT_AND_TESTING_GUIDE.md` - Detailed steps

**You've got this! 🚀**

