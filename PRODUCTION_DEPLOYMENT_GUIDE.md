# Production Deployment Guide - Admin Balance Adjustment Fix

## 🎯 Issue Fixed

**Problem**: 500 Internal Server Error when testing admin balance adjustment feature in production build.

**Root Cause**: 
1. Missing database tables (transactions table didn't exist)
2. Import path issues in production build (using long relative paths instead of path aliases)

**Solution**:
1. ✅ Set up complete database schema with all 17 required tables
2. ✅ Fixed import paths to use TypeScript path aliases (`@/lib/auth` instead of `../../../../../../lib/auth`)
3. ✅ Verified database supports 'credit' and 'debit' transaction types
4. ✅ Production build successful with 0 errors

---

## 📋 Pre-Deployment Checklist

### 1. Database Setup (CRITICAL)

Before deploying, ensure your production database has all required tables:

```bash
# Run this script on your production database
node scripts/setup-database.js
```

This will create all 17 required tables:
- ✅ users
- ✅ user_balances
- ✅ transactions
- ✅ deposit_requests
- ✅ withdrawal_requests
- ✅ investment_plans
- ✅ user_investments
- ✅ investment_profits
- ✅ live_trade_plans
- ✅ user_live_trades
- ✅ hourly_live_trade_profits
- ✅ referrals
- ✅ referral_commissions
- ✅ support_tickets
- ✅ ticket_responses
- ✅ newsletters
- ✅ system_settings

### 2. Environment Variables

Ensure these environment variables are set in production:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# NextAuth
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-secure-secret-key

# Application
NODE_ENV=production
APP_NAME=CredCrypto
APP_URL=https://your-production-domain.com

# Security
JWT_SECRET=your-jwt-secret
CRON_SECRET=your-cron-secret
```

### 3. Admin User

Create an admin user in production:

```bash
# Run this script to create admin user
node scripts/create-admin-user.js
```

Default credentials:
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

---

## 🚀 Deployment Steps

### Step 1: Build the Application

```bash
npm run build
```

Expected output:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (74/74)
✓ Finalizing page optimization
```

### Step 2: Test Production Build Locally (Optional but Recommended)

```bash
# Start production server locally
npm start

# In another terminal, test the database connection
node scripts/check-database-status.js

# Test balance adjustment directly
node scripts/debug-balance-api.js
```

### Step 3: Deploy to Production

Deploy the built application to your hosting platform (Vercel, Railway, etc.)

```bash
# Example for Vercel
vercel --prod

# Example for Railway
railway up
```

### Step 4: Verify Production Deployment

1. **Check Database Connection**:
   - Visit: `https://your-domain.com/api/health/database`
   - Should return: `{"status": "connected", ...}`

2. **Login as Admin**:
   - Visit: `https://your-domain.com/auth/signin`
   - Email: `admin@example.com`
   - Password: `admin123`

3. **Test Balance Adjustment**:
   - Navigate to: `https://your-domain.com/admin/users`
   - Select a user
   - Try adjusting their balance
   - Should see success message, no 500 error

---

## 🔍 Troubleshooting

### Issue: Still Getting 500 Error

**Check 1: Database Tables Exist**
```bash
node scripts/check-database-status.js
```

**Check 2: Environment Variables**
- Verify `DATABASE_URL` is correct
- Verify `NEXTAUTH_SECRET` is set
- Check server logs for detailed error messages

**Check 3: Transaction Types**
```sql
-- Run this query on your database
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
AND contype = 'c';
```

Should show 'credit' and 'debit' in the CHECK constraint.

### Issue: Authentication Fails

**Solution**: Ensure `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set correctly in production environment variables.

### Issue: Database Connection Fails

**Solution**: 
1. Check `DATABASE_URL` format
2. Ensure database server is accessible from production environment
3. Verify database credentials are correct

---

## 📊 What Was Changed

### Files Modified:

1. **`src/app/api/admin/balance/fund/route.ts`**
   - Changed imports from relative paths to path aliases
   - Before: `import { authOptions } from "../../../../../../lib/auth"`
   - After: `import { authOptions } from "@/lib/auth"`

2. **`database/schema.sql`**
   - Already includes 'credit' and 'debit' transaction types
   - No changes needed

3. **`scripts/setup-database.js`**
   - Modified to add "IF NOT EXISTS" clauses
   - Makes script idempotent (safe to run multiple times)

### Files Created:

1. **`scripts/check-database-status.js`** - Verify database setup
2. **`scripts/create-admin-user.js`** - Create admin user
3. **`scripts/debug-balance-api.js`** - Test balance adjustment logic
4. **`scripts/test-balance-adjustment.js`** - Direct database testing

---

## ✅ Success Criteria

After deployment, verify these work:

- [ ] Admin can login successfully
- [ ] Admin can view users list
- [ ] Admin can credit (add) funds to user balance
- [ ] Admin can debit (deduct) funds from user balance
- [ ] Custom transaction dates work
- [ ] Transaction records are created correctly
- [ ] Balance updates reflect immediately
- [ ] No 500 errors in server logs

---

## 🎉 Expected Behavior

### Credit Operation (Add Funds):
1. Admin selects user
2. Chooses "Credit" operation
3. Enters amount (e.g., $100)
4. Optionally sets custom date
5. Clicks submit
6. ✅ Success message appears
7. ✅ User balance increases by $100
8. ✅ Transaction record created with type 'credit'

### Debit Operation (Deduct Funds):
1. Admin selects user
2. Chooses "Debit" operation
3. Enters amount (e.g., $50)
4. Optionally sets custom date
5. Clicks submit
6. ✅ Success message appears
7. ✅ User balance decreases by $50
8. ✅ Transaction record created with type 'debit'

---

## 📞 Support

If you encounter any issues during deployment:

1. Check server logs for detailed error messages
2. Run diagnostic scripts:
   - `node scripts/check-database-status.js`
   - `node scripts/debug-balance-api.js`
3. Verify all environment variables are set correctly
4. Ensure database schema is up to date

---

## 🔐 Security Notes

1. **Change default admin password** immediately after deployment
2. Use strong, unique values for:
   - `NEXTAUTH_SECRET`
   - `JWT_SECRET`
   - `CRON_SECRET`
3. Ensure `DATABASE_URL` is kept secure and not exposed
4. Use HTTPS in production (`NEXTAUTH_URL` should start with `https://`)

---

**Last Updated**: 2025-11-10
**Build Status**: ✅ Successful (0 errors, 0 warnings)
**Production Ready**: ✅ Yes

