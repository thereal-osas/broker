# 🧪 Live Trade & Deposit Testing Guide

## 🎯 **COMPREHENSIVE TESTING FOR BOTH ISSUES**

This guide covers testing for both the live trade profit distribution system and the fixed deposit approval functionality.

---

## 📋 **ISSUE SUMMARY & FIXES APPLIED**

### **Issue 1: Live Trade Profit Distribution ✅ FIXED**

- **Root Cause**: `getActiveLiveTrades()` excluded expired trades from manual distribution
- **Fix Applied**: Created `runManualProfitDistribution()` that includes expired trades
- **File**: `lib/liveTradeProfit.ts` and `src/app/api/admin/live-trade/profit-distribution/route.ts`
- **Result**: Manual distribution now processes ALL active trades (including expired)

### **Issue 2: Live Trade Status Not Updating ✅ IDENTIFIED**

- **Root Cause**: `completeExpiredLiveTrades()` exists but needs manual trigger
- **Fix Available**: Force completion API at `/api/admin/live-trade/force-completion`
- **Manual Process**: Admin can trigger completion after profit distribution

### **Issue 3: Deposit Approval ✅ FIXED**

- **Root Cause**: Invalid balance type `"deposit"` (not in allowed types)
- **Fix Applied**: Changed to `balanceType: "total"`
- **File**: `src/app/api/admin/deposits/[id]/approve/route.ts`

---

## 🧪 **STEP 1: RUN COMPREHENSIVE ANALYSIS**

### 1.1 Test Live Trade Fixes

```bash
# Test the specific fixes for profit distribution issues
node scripts/test-live-trade-profit-fixes.js
```

**Expected Output:**

- ✅ 3 active live trades found (2 expired, 1 active)
- ✅ 0 profit distributions found (confirms the issue)
- ✅ Manual distribution would process 8 total hours
- ✅ 2 trades should be completed but are still active

### 1.2 Test Original Live Trade System

```bash
# Analyze overall live trade profit distribution system
node scripts/test-live-trade-profit-distribution.js
```

### 1.3 Test Deposit Approval Fix

The scripts above also test the deposit approval balance type fix.

---

## 🌐 **STEP 2: BROWSER TESTING**

### 2.1 Start Development Server

```bash
npm run dev
```

### 2.2 Login as Admin

- **URL**: `http://localhost:3000`
- **Email**: `admin@test.com`
- **Password**: Any password (local testing)

---

## 🎯 **STEP 3: TEST LIVE TRADE PROFIT DISTRIBUTION**

### 3.1 Navigate to Live Trade Admin

1. Go to admin live trade profit distribution page
2. Look for active live trades
3. Check current profit distribution status

### 3.2 Manual Profit Distribution Test (MAIN FIX)

1. **Click**: "Run Profit Distribution" button
2. **Expected Result**: Shows "8 processed" (total hours from all trades)
3. **Verify**: User balances increase by expected amounts:
   - bitcapitaltrade29@gmail.com: +$150.00
   - innocentilas07@gmail.com: +$300.00 + $140.00 = +$440.00
4. **Check**: Transaction records created with type "profit"
5. **Verify**: hourly_live_trade_profits table has 8 new records

### 3.3 Test Live Trade Completion (SECONDARY FIX)

1. **Navigate**: Go to `/api/admin/live-trade/force-completion` (or admin panel)
2. **Trigger**: Force completion of expired trades
3. **Expected**: 2 trades change status from "active" to "completed"
4. **Verify**: end_time is set for completed trades
5. **Check**: Original investment capital returned to users

### 3.4 Verify Database Changes

```sql
-- Check profit distributions were created
SELECT COUNT(*) FROM hourly_live_trade_profits;
-- Should show 8 records

-- Check user balance increases
SELECT u.email, ub.total_balance
FROM user_balances ub
JOIN users u ON ub.user_id = u.id
WHERE u.email IN ('bitcapitaltrade29@gmail.com', 'innocentilas07@gmail.com');

-- Check trade status updates
SELECT id, status, end_time FROM user_live_trades WHERE status = 'completed';
```

---

## 💰 **STEP 4: TEST DEPOSIT APPROVAL (MAIN FIX)**

### 4.1 Navigate to Admin Deposits

1. Go to admin deposits page
2. Find pending deposit requests
3. Look for "Approve" button

### 4.2 Test Deposit Approval

1. **Click**: "Approve" on a pending deposit
2. **Add**: Admin notes (optional)
3. **Submit**: Approval
4. **Expected Result**: ✅ Success message (no internal server error)
5. **Verify**: Status changes to "approved"
6. **Check**: User balance increases

### 4.3 Verify Transaction Record

1. Check user's transaction history
2. **Expected**: New transaction with type "deposit"
3. **Balance Type**: Should be "total" (not "deposit")
4. **Amount**: Should match approved deposit amount

---

## 🔍 **STEP 5: VERIFY DATABASE CHANGES**

### 5.1 Check Live Trade Profits

```sql
-- Check recent live trade profit distributions
SELECT
  hltp.profit_amount,
  hltp.profit_hour,
  u.email as user_email,
  ult.amount as trade_amount
FROM hourly_live_trade_profits hltp
JOIN user_live_trades ult ON hltp.live_trade_id = ult.id
JOIN users u ON ult.user_id = u.id
ORDER BY hltp.created_at DESC
LIMIT 10;
```

### 5.2 Check Deposit Approvals

```sql
-- Check approved deposits and their transactions
SELECT
  dr.amount as deposit_amount,
  dr.status,
  dr.processed_at,
  t.amount as transaction_amount,
  t.balance_type,
  u.email
FROM deposit_requests dr
JOIN users u ON dr.user_id = u.id
LEFT JOIN transactions t ON t.reference_id = dr.id AND t.type = 'deposit'
WHERE dr.status = 'approved'
ORDER BY dr.processed_at DESC
LIMIT 5;
```

### 5.3 Check User Balance Updates

```sql
-- Check if user balances were updated correctly
SELECT
  u.email,
  ub.total_balance,
  ub.updated_at
FROM user_balances ub
JOIN users u ON ub.user_id = u.id
ORDER BY ub.updated_at DESC
LIMIT 10;
```

---

## ✅ **STEP 6: SUCCESS CRITERIA**

### **Live Trade Profit Distribution:**

- ✅ Shows actual number of hours processed (not "0")
- ✅ User balances increase by calculated hourly profits
- ✅ Can process profits for completed trades
- ✅ Prevents duplicate distributions
- ✅ Transaction records created with correct balance types

### **Deposit Approval:**

- ✅ No internal server error when approving deposits
- ✅ Status changes to "approved" successfully
- ✅ User balance increases by deposit amount
- ✅ Transaction record created with `balance_type: "total"`
- ✅ Admin notes saved correctly

---

## 🚨 **TROUBLESHOOTING**

### **If Live Trade Distribution Shows "0 processed":**

1. Check if you have active live trades: `SELECT * FROM user_live_trades WHERE status = 'active'`
2. Verify hours have elapsed since start_time
3. Check for existing profit distributions
4. Review server logs for specific errors

### **If Deposit Approval Still Fails:**

1. Check server logs for specific error messages
2. Verify deposit request exists and is pending
3. Confirm admin user has proper permissions
4. Check database constraints are correct

### **If Balance Updates Don't Appear:**

1. Verify transaction records were created
2. Check `user_balances` table for updates
3. Confirm balance calculation logic
4. Review database transaction rollbacks

---

## 🎯 **TECHNICAL DETAILS**

### **Live Trade Profit Distribution Logic:**

```javascript
// Hourly profit calculation
const hourlyProfit = tradeAmount * hourlyProfitRate;

// Hours elapsed calculation
const hoursElapsed = Math.floor((currentTime - startTime) / (1000 * 60 * 60));

// Distribute for each elapsed hour (prevents duplicates)
for (let hour = 1; hour <= hoursElapsed; hour++) {
  if (!alreadyDistributed(hour)) {
    distributeProfit(hour);
  }
}
```

### **Deposit Approval Balance Types:**

```javascript
// ❌ BEFORE (Broken)
balanceType: "deposit"; // Not in allowed types

// ✅ AFTER (Fixed)
balanceType: "total"; // Valid balance type
```

### **Allowed Balance Types:**

- `"total"` - Main user balance
- `"card"` - Admin funding balance
- `"credit_score"` - Points system

---

## 📞 **SUPPORT**

If you encounter issues during testing:

1. **Check Console Logs**: Browser developer tools
2. **Review Server Logs**: Terminal running `npm run dev`
3. **Database Queries**: Use the SQL queries above
4. **Error Messages**: Note specific error messages for debugging

Both systems should now work correctly with the applied fixes!
