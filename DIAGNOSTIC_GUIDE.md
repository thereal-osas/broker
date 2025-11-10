# Diagnostic Guide - 500 Error Troubleshooting

## 🔍 How to Identify the Exact Error

Since you're experiencing a 500 Internal Server Error, I need you to help me identify the exact error message. Follow these steps:

---

## Step 1: Check Server Logs

### If running `npm run dev`:

1. **Open the terminal where you ran `npm run dev`**
2. **Try to adjust a user's balance** in the admin panel
3. **Look at the terminal output** - you should see error messages like:

```
Balance funding error: [ERROR MESSAGE HERE]
```

or

```
Transaction error: [ERROR MESSAGE HERE]
```

### What to look for:
- ❌ `Cannot find module` - Module import issue
- ❌ `db.transaction is not a function` - Database method issue
- ❌ `relation "transactions" does not exist` - Missing table
- ❌ `violates check constraint` - Invalid transaction type
- ❌ `column "..." does not exist` - Schema mismatch
- ❌ `null value in column` - Missing required field

**Please copy and paste the EXACT error message from the terminal.**

---

## Step 2: Check Browser Console

1. **Open browser Developer Tools** (F12)
2. **Go to the Console tab**
3. **Try to adjust balance again**
4. **Look for any JavaScript errors**

### What to look for:
- ❌ Network errors
- ❌ CORS errors
- ❌ JavaScript exceptions

---

## Step 3: Check Network Tab

1. **Open browser Developer Tools** (F12)
2. **Go to the Network tab**
3. **Try to adjust balance again**
4. **Click on the failed request** (`/api/admin/balance/fund`)
5. **Check the Response tab**

### What to look for:
```json
{
  "error": "Failed to fund balance",
  "details": "[ACTUAL ERROR MESSAGE]"
}
```

**Please copy and paste the response body.**

---

## Step 4: Verify Database Connection

Run this command to check if the database is properly connected:

```bash
node scripts/check-database-status.js
```

Expected output:
```
✓ Database connected
✓ All 17 tables exist
✓ transactions table has correct CHECK constraint
```

If you see errors, please share them.

---

## Step 5: Check Environment Variables

Make sure your `.env.local` file has:

```env
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

**Verify:**
- [ ] DATABASE_URL is correct
- [ ] Database is running and accessible
- [ ] NEXTAUTH_SECRET is set
- [ ] NEXTAUTH_URL matches your dev server URL

---

## Common Issues and Solutions

### Issue 1: "db.transaction is not a function"

**Cause**: The db export might not include the transaction method.

**Solution**: Check if `lib/db.ts` exports the Database class instance correctly.

### Issue 2: "relation 'transactions' does not exist"

**Cause**: Database tables not created.

**Solution**: Run `node scripts/setup-database.js`

### Issue 3: "violates check constraint 'transactions_type_check'"

**Cause**: The transaction type 'credit' or 'debit' is not in the CHECK constraint.

**Solution**: Run this SQL to update the constraint:

```sql
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 
                'referral_commission', 'admin_funding', 'live_trade_investment', 
                'credit', 'debit'));
```

### Issue 4: "Cannot find module '@/lib/auth'"

**Cause**: TypeScript path aliases not working in production.

**Solution**: Already fixed in the latest code. Make sure you've rebuilt:
```bash
npm run build
```

### Issue 5: Authentication fails (403 error)

**Cause**: Not logged in as admin or session expired.

**Solution**: 
1. Logout and login again
2. Make sure you're using admin credentials
3. Check if NEXTAUTH_SECRET matches between builds

---

## What I Need From You

To fix your specific issue, please provide:

1. **The exact error message from the server terminal** (Step 1)
2. **The response body from the Network tab** (Step 3)
3. **Which environment you're testing in**:
   - [ ] Development (`npm run dev`)
   - [ ] Production build (`npm start`)
4. **Output from** `node scripts/check-database-status.js`
5. **Confirm your DATABASE_URL is correct** (don't share the actual password, just confirm it's set)

---

## Quick Test

Try this quick test to see if the database operations work:

```bash
# Make sure database is set up
node scripts/setup-database.js

# Test balance adjustment directly
node scripts/debug-balance-api.js
```

If this works but the API doesn't, the issue is likely:
- Authentication/session problem
- Next.js routing issue
- Environment variable access in API routes

If this also fails, the issue is:
- Database connection problem
- Schema mismatch
- Missing tables or columns

---

## Next Steps

Once you provide the error details above, I can:
1. Identify the exact root cause
2. Provide a targeted fix
3. Test the fix
4. Verify it works in your environment

**Please run the steps above and share the results!**

