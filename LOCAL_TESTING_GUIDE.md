# 🧪 Local Testing Guide for Broker Application

## 🎯 **SAFE LOCAL TESTING WITHOUT AFFECTING PRODUCTION**

This guide helps you test critical fixes locally without risking your production Railway database.

---

## 📋 **Prerequisites**

1. **PostgreSQL installed locally** (version 12+)
2. **Node.js** (version 18+)
3. **Your broker application** running locally

---

## 🔧 **Step 1: Setup Local Testing Environment**

### 1.1 Switch to Local Testing Configuration
```bash
# Switch your environment to use local database
node scripts/switch-to-local-testing.js
```

### 1.2 Create Local Test Database
```bash
# Create local database with test data
node scripts/setup-local-testing-db.js
```

### 1.3 Fix Database Schema for Profit Distribution
```bash
# Fix missing tables and schema issues
node scripts/fix-profit-distribution-schema.js
```

---

## 🧪 **Step 2: Test the Fixes**

### 2.1 Test Profit Distribution System
```bash
# Test profit distribution functionality
node scripts/test-profit-distribution-fixes.js
```

### 2.2 Start Development Server
```bash
# Start your application with local database
npm run dev
```

### 2.3 Test Admin Functionality

#### **Test Profit Distribution:**
1. Login as admin (admin@test.com)
2. Navigate to admin profit distribution
3. Click "Run Profit Distribution"
4. Verify: Shows "X processed" instead of "0 processed"
5. Check user balances increased

#### **Test Deposit Decline:**
1. Navigate to admin deposits
2. Find a pending deposit request
3. Click "Decline" 
4. Add admin notes
5. Verify: No error occurs, status changes to "declined"

---

## 🔍 **Step 3: Verify Fixes Work**

### 3.1 Check Profit Distribution Results
```sql
-- Check if profits were distributed
SELECT 
  pd.*,
  u.email as user_email,
  ui.amount as investment_amount
FROM profit_distributions pd
JOIN user_investments ui ON pd.investment_id = ui.id
JOIN users u ON pd.user_id = u.id
ORDER BY pd.distribution_date DESC
LIMIT 10;
```

### 3.2 Check Balance Updates
```sql
-- Check if user balances were updated
SELECT 
  u.email,
  ub.total_balance,
  ub.updated_at
FROM user_balances ub
JOIN users u ON ub.user_id = u.id
ORDER BY ub.updated_at DESC
LIMIT 5;
```

### 3.3 Check Transaction Records
```sql
-- Check if transaction records were created
SELECT 
  t.*,
  u.email as user_email
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE t.type = 'profit'
ORDER BY t.created_at DESC
LIMIT 10;
```

---

## ✅ **Step 4: Deploy to Production**

### 4.1 Switch Back to Production Environment
```bash
# Restore production configuration
node scripts/switch-to-production.js
```

### 4.2 Apply Database Schema Fixes to Production
```bash
# Apply schema fixes to production database
# (This will use your production DATABASE_URL)
node scripts/fix-profit-distribution-schema.js
```

### 4.3 Deploy Code Changes
```bash
# Deploy your tested fixes
git add .
git commit -m "Fix profit distribution and deposit decline functionality"
git push origin main
```

---

## 🚨 **Critical Fixes Applied**

### **Fix 1: Profit Distribution Balance Types**
- ❌ **Before**: `balanceType: "profit"` (invalid)
- ✅ **After**: `balanceType: "total"` (valid)

### **Fix 2: Transaction Types**
- ❌ **Before**: `"investment_completed"` (invalid)
- ✅ **After**: `"admin_funding"` (valid)

### **Fix 3: Database Schema**
- ✅ **Added**: Missing profit distribution tables
- ✅ **Added**: `last_profit_date` column to `user_investments`
- ✅ **Fixed**: Foreign key relationships

### **Fix 4: Deposit Decline Functionality**
- ✅ **Verified**: No code changes needed
- ✅ **Tested**: Admin decline functionality works correctly

---

## 📊 **Expected Results After Fixes**

### **Profit Distribution:**
- ✅ Shows actual number of investments processed (not "0 processed")
- ✅ User balances increase by calculated daily profits
- ✅ Transaction records created with correct balance types
- ✅ No internal server errors

### **Deposit Decline:**
- ✅ Admin can decline deposit requests without errors
- ✅ Status updates to "declined" correctly
- ✅ Admin notes are saved
- ✅ No internal server errors

---

## 🔧 **Troubleshooting**

### **If Profit Distribution Still Shows "0 processed":**
1. Check if you have active investments: `SELECT * FROM user_investments WHERE status = 'active'`
2. Verify profit distribution tables exist: `\dt *profit*`
3. Check for constraint violations in server logs

### **If Deposit Decline Still Fails:**
1. Check deposit request exists: `SELECT * FROM deposit_requests WHERE status = 'pending'`
2. Verify admin user permissions
3. Check server logs for specific error messages

### **If Local Database Connection Fails:**
1. Ensure PostgreSQL is running: `pg_ctl status`
2. Check database exists: `psql -l | grep broker_local_test`
3. Verify connection string in `.env.local`

---

## 🎯 **Success Criteria**

✅ **Local Testing Complete When:**
- Profit distribution shows actual processed count
- User balances increase after profit distribution
- Deposit decline works without errors
- All database operations complete successfully
- No constraint violation errors in logs

✅ **Ready for Production When:**
- All local tests pass
- Database schema fixes applied to production
- Code changes deployed
- Production monitoring shows no errors

---

## 📞 **Support**

If you encounter issues during testing:
1. Check the console logs for specific error messages
2. Verify your local PostgreSQL is running
3. Ensure all required tables exist
4. Check that your `.env.local` points to local database

Remember: All testing is done safely on your local database - your production Railway database remains untouched during testing!
