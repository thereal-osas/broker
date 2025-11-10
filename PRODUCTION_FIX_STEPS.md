# Production 500 Error - Complete Fix Guide

## ✅ What I've Done

I've created **diagnostic endpoints** to help identify the exact cause of the 500 error in your production environment. The production build is successful with **0 errors**.

---

## 🎯 Next Steps - Follow These in Order

### **Step 1: Deploy the Latest Code**

The latest code includes two new diagnostic endpoints that will help us identify the exact issue.

**Deploy to production:**
```bash
git add .
git commit -m "Add diagnostic endpoints for production debugging"
git push
```

Wait for the deployment to complete.

---

### **Step 2: Test Database Connection**

Visit this URL in your browser (replace with your production domain):
```
https://your-production-domain.com/api/admin/debug/db-test
```

**Expected Response (if everything is working):**
```json
{
  "status": "success",
  "timestamp": "2025-11-10T...",
  "database": {
    "connected": true,
    "url_set": true,
    "url_preview": "your-db-host"
  },
  "tables": {
    "users": 5,
    "transactions": 10,
    "user_balances": 5,
    "users_without_balance": 0
  },
  "constraints": [
    {
      "name": "transactions_type_check",
      "definition": "CHECK (...)"
    }
  ],
  "environment": {
    "node_env": "production",
    "nextauth_url": "https://your-domain.com",
    "nextauth_secret_set": true
  }
}
```

**If you get an error response:**
The response will tell you exactly what's wrong. Share it with me.

---

### **Step 3: Test Balance Adjustment Logic**

Visit this URL (you need to be logged in as admin):
```
POST https://your-production-domain.com/api/admin/debug/balance-test
```

**Use this request body:**
```json
{
  "userId": "your-test-user-id",
  "balanceType": "total_balance",
  "amount": 100,
  "description": "Test adjustment"
}
```

**How to make the request:**

**Option A: Using Browser Console**
1. Login to your admin panel
2. Open Developer Tools (F12)
3. Go to Console tab
4. Paste this code (replace the userId):

```javascript
fetch('/api/admin/debug/balance-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'REPLACE_WITH_ACTUAL_USER_ID',
    balanceType: 'total_balance',
    amount: 100,
    description: 'Test adjustment'
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
```

**Option B: Using Postman/Insomnia**
1. Create a new POST request
2. URL: `https://your-domain.com/api/admin/debug/balance-test`
3. Headers: `Content-Type: application/json`
4. Body: The JSON above
5. Make sure to include your session cookie

**Expected Response (if working):**
```json
{
  "message": "Test successful - balance adjustment works!",
  "diagnostics": {
    "step": "completed",
    "auth": { "is_admin": true },
    "user": { "exists": true },
    "balance_record": { "exists": true },
    "db_transaction_available": true,
    "balance_updated": { "success": true },
    "transaction_created": { "success": true }
  }
}
```

**If you get an error:**
The `diagnostics` object will show you exactly which step failed. Share the full response with me.

---

## 🔍 Common Issues and Solutions

### Issue #1: `users_without_balance > 0`

**Diagnosis:** Step 2 shows `users_without_balance: 5` (or any number > 0)

**Solution:** Run this SQL on your production database:
```sql
INSERT INTO user_balances (user_id, total_balance, available_balance, invested_balance, profit_balance)
SELECT id, 0, 0, 0, 0 
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_balances);
```

---

### Issue #2: Transaction constraint doesn't include 'credit' or 'debit'

**Diagnosis:** Step 2 shows the constraint definition doesn't include 'credit' or 'debit'

**Solution:** Run this SQL on your production database:
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

### Issue #3: NEXTAUTH_URL is wrong

**Diagnosis:** Step 2 shows `nextauth_url: "http://localhost:3000"`

**Solution:** Update your production environment variable:
```
NEXTAUTH_URL=https://your-actual-production-domain.com
```

Then redeploy.

---

### Issue #4: Database connection fails

**Diagnosis:** Step 2 returns error with "connection" or "ECONNREFUSED"

**Solution:** 
1. Check if DATABASE_URL is set correctly in production
2. Verify your database is running and accessible
3. Check if your hosting platform's IP is whitelisted in your database firewall

---

### Issue #5: Authentication fails

**Diagnosis:** Step 3 returns `{ "error": "Admin access required" }`

**Solution:**
1. Make sure you're logged in as admin
2. Check if NEXTAUTH_SECRET matches between deployments
3. Try logging out and logging in again

---

## 📊 What the Diagnostic Endpoints Tell Us

### `/api/admin/debug/db-test`
This endpoint checks:
- ✓ Database connection works
- ✓ All required tables exist
- ✓ Transaction type constraint is correct
- ✓ Environment variables are set
- ✓ Users have balance records

### `/api/admin/debug/balance-test`
This endpoint tests the **exact same logic** as the real balance adjustment endpoint, but provides detailed diagnostics at each step:
1. Authentication check
2. Request validation
3. User existence check
4. Balance record check
5. Database transaction method availability
6. Balance update operation
7. Transaction record creation

If this endpoint works, the real endpoint should work too.
If this endpoint fails, the diagnostics will show exactly where and why.

---

## 🚀 After Fixing

Once the diagnostic endpoints show everything is working:

1. **Test the real balance adjustment feature:**
   - Login as admin
   - Go to `/admin/users`
   - Select a user
   - Try to credit/debit their balance

2. **If it still fails:**
   - Check the production logs for the actual error
   - The error should now be more specific
   - Share the error with me

3. **If it works:**
   - The issue is fixed! 🎉
   - You can optionally remove the debug endpoints for security

---

## 📞 What I Need From You

Please run Steps 1-3 above and share:

1. **Response from `/api/admin/debug/db-test`**
2. **Response from `/api/admin/debug/balance-test`**
3. **Any error messages from production logs**

With this information, I can provide the exact fix for your specific issue.

---

## 🔒 Security Note

The debug endpoints are protected by admin authentication, but they do expose some system information. After fixing the issue, you may want to:

1. Remove the debug endpoints:
   ```bash
   rm -rf src/app/api/admin/debug
   ```

2. Or restrict them to specific IPs/environments

---

## 📝 Summary

**What's been fixed:**
- ✅ Import paths changed to use aliases
- ✅ Production build successful (0 errors)
- ✅ Database transaction method verified
- ✅ Diagnostic endpoints created

**What you need to do:**
1. Deploy the latest code
2. Visit the diagnostic endpoints
3. Share the responses with me
4. Apply the specific fix based on the diagnostics

**Most likely issues:**
1. Missing user balance records
2. Transaction type constraint missing 'credit'/'debit'
3. Wrong NEXTAUTH_URL in production
4. Database connection issue

Let's identify and fix the exact issue! 🚀

