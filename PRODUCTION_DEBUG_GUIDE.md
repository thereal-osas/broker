# Production Debugging Guide - 500 Error Fix

## 🎯 Production-Specific Issues

Since your database tables exist but you're still getting "Failed to fund balance" errors in production, the issue is likely one of these:

---

## 🔍 Step 1: Get the Actual Error Message

### For Railway/Vercel/Most Platforms:

**Option A: View Logs in Dashboard**
1. Go to your hosting platform dashboard
2. Navigate to your project
3. Click on "Logs" or "Runtime Logs"
4. Try the balance adjustment again
5. Look for lines containing:
   - `Balance funding error:`
   - `Transaction error:`
   - `Error:`

**Option B: Use CLI**

For Railway:
```bash
railway logs
```

For Vercel:
```bash
vercel logs [deployment-url]
```

For Heroku:
```bash
heroku logs --tail
```

**What to look for:**
```
Balance funding error: [THE ACTUAL ERROR MESSAGE]
```

---

## 🐛 Most Common Production Issues

### Issue #1: Environment Variables Not Set (MOST LIKELY)

**Symptoms:**
- Works locally but fails in production
- Error mentions "undefined" or "null"
- Database connection issues

**Check:**
1. Go to your hosting platform's environment variables settings
2. Verify these are set:
   - `DATABASE_URL` ✓
   - `NEXTAUTH_SECRET` ✓
   - `NEXTAUTH_URL` ✓ (should be your production URL)
   - `NODE_ENV=production` ✓

**Common mistake:**
- `NEXTAUTH_URL` is set to `http://localhost:3000` instead of your production URL
- `DATABASE_URL` is missing or incorrect

**Fix:**
Set the correct production values:
```env
DATABASE_URL=postgresql://user:pass@host:port/db
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-secret
NODE_ENV=production
```

---

### Issue #2: Database Connection Pool Exhaustion

**Symptoms:**
- Error mentions "too many clients"
- Error mentions "connection pool"
- Works initially, then fails

**Check the db.ts configuration:**

The issue might be that the connection pool is too small or connections aren't being released.

**Fix:**
Add this to your production environment variables:
```env
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

---

### Issue #3: Missing User Balance Record

**Symptoms:**
- Error mentions "Cannot read property"
- Error mentions "undefined"
- Specific to certain users

**Diagnosis:**
Run this SQL query on your production database:
```sql
-- Check if user has a balance record
SELECT u.id, u.email, ub.user_id 
FROM users u 
LEFT JOIN user_balances ub ON u.id = ub.user_id 
WHERE ub.user_id IS NULL;
```

If this returns any rows, those users don't have balance records.

**Fix:**
Run this SQL on production:
```sql
-- Create missing balance records
INSERT INTO user_balances (user_id, total_balance, available_balance, invested_balance, profit_balance)
SELECT id, 0, 0, 0, 0 
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_balances);
```

---

### Issue #4: Transaction Type Constraint

**Symptoms:**
- Error mentions "violates check constraint"
- Error mentions "transactions_type_check"

**Diagnosis:**
Run this SQL on production:
```sql
-- Check the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
AND contype = 'c';
```

Look for the constraint definition. It should include 'credit' and 'debit'.

**Fix:**
If 'credit' and 'debit' are missing, run:
```sql
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type::text = ANY (ARRAY[
  'deposit'::character varying,
  'withdrawal'::character varying,
  'investment'::character varying,
  'profit'::character varying,
  'bonus'::character varying,
  'referral_commission'::character varying,
  'admin_funding'::character varying,
  'live_trade_investment'::character varying,
  'credit'::character varying,
  'debit'::character varying
]::text[]));
```

---

### Issue #5: Database Column Mismatch

**Symptoms:**
- Error mentions "column does not exist"
- Error mentions specific column name

**Diagnosis:**
Run this SQL to check the transactions table structure:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- user_id (uuid)
- type (varchar)
- amount (numeric)
- balance_type (varchar)
- description (text)
- reference_id (varchar)
- status (varchar)
- created_at (timestamp)
- updated_at (timestamp)

**Fix:**
If any columns are missing, you need to run the schema migration.

---

### Issue #6: Database Permissions

**Symptoms:**
- Error mentions "permission denied"
- Error mentions "must be owner"

**Diagnosis:**
Check if your database user has the correct permissions:
```sql
-- Check permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='transactions';
```

**Fix:**
Grant necessary permissions:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO your_db_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_balances TO your_db_user;
```

---

## 🔧 Production-Specific Code Issues

### Check #1: Verify the API Route is Deployed

Sometimes the API route doesn't get deployed correctly.

**Test:**
Visit: `https://your-domain.com/api/admin/balance/fund`

You should get a 405 error (Method Not Allowed) or 403 (Forbidden), NOT 404.

If you get 404, the route wasn't deployed.

**Fix:**
Redeploy:
```bash
git add .
git commit -m "Redeploy API routes"
git push
```

---

### Check #2: Database Connection in Production

The database connection might be failing silently.

**Add this diagnostic endpoint temporarily:**

Create `src/app/api/admin/debug/db-test/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Test basic connection
    const result = await db.query('SELECT NOW()');
    
    // Test transactions table
    const transTest = await db.query('SELECT COUNT(*) FROM transactions');
    
    // Test user_balances table
    const balanceTest = await db.query('SELECT COUNT(*) FROM user_balances');
    
    return NextResponse.json({
      status: 'success',
      timestamp: result.rows[0].now,
      transactions_count: transTest.rows[0].count,
      balances_count: balanceTest.rows[0].count,
      database_url: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      database_url: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    }, { status: 500 });
  }
}
```

Then visit: `https://your-domain.com/api/admin/debug/db-test`

This will tell you if the database connection works in production.

---

## 📊 Diagnostic Checklist

Run through this checklist:

- [ ] **Environment Variables**
  - [ ] DATABASE_URL is set correctly
  - [ ] NEXTAUTH_URL is set to production URL (not localhost)
  - [ ] NEXTAUTH_SECRET is set
  - [ ] NODE_ENV=production

- [ ] **Database Tables**
  - [ ] `transactions` table exists ✓ (you confirmed)
  - [ ] `user_balances` table exists ✓ (you confirmed)
  - [ ] All users have balance records
  - [ ] Transaction type constraint includes 'credit' and 'debit'

- [ ] **API Route**
  - [ ] `/api/admin/balance/fund` returns 403 or 405 (not 404)
  - [ ] Import paths use aliases (`@/lib/auth`)
  - [ ] Route is deployed correctly

- [ ] **Authentication**
  - [ ] Can login as admin
  - [ ] Session persists
  - [ ] Admin role is set correctly

---

## 🚀 Quick Fix Steps

**Step 1: Check Environment Variables**
```bash
# For Railway
railway variables

# For Vercel
vercel env ls
```

**Step 2: Check Production Logs**
```bash
# For Railway
railway logs --tail

# For Vercel
vercel logs --follow
```

**Step 3: Test Database Connection**
Create the debug endpoint above and visit it.

**Step 4: Check for Missing Balance Records**
Run the SQL query to find users without balance records.

**Step 5: Verify Transaction Constraint**
Run the SQL query to check if 'credit' and 'debit' are in the constraint.

---

## 💡 Most Likely Solution

Based on production-specific issues, the most common causes are:

1. **NEXTAUTH_URL is wrong** (set to localhost instead of production URL)
2. **Missing balance records** for the user you're testing with
3. **Transaction type constraint** doesn't include 'credit'/'debit'

**Try this first:**
1. Check NEXTAUTH_URL in production environment variables
2. Run the SQL to create missing balance records
3. Run the SQL to update the transaction constraint
4. Redeploy

---

## 📞 What to Share

To help you further, please provide:

1. **Production logs** showing the error (from Step 1)
2. **Result of the debug endpoint** (if you create it)
3. **Environment variables** (confirm they're set, don't share values):
   - DATABASE_URL: SET or NOT SET?
   - NEXTAUTH_URL: What is it set to?
   - NEXTAUTH_SECRET: SET or NOT SET?
4. **Result of this SQL query:**
   ```sql
   SELECT COUNT(*) as users_without_balance
   FROM users u 
   LEFT JOIN user_balances ub ON u.id = ub.user_id 
   WHERE ub.user_id IS NULL;
   ```

Once you provide these, I can give you the exact fix!

