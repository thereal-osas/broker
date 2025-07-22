# 🔐 Login Troubleshooting Guide

## ✅ **Issue Identified and Fixed**

The main login issue was caused by incorrect `NEXTAUTH_URL` configuration in the `.env` file.

### **Root Cause:**
- `NEXTAUTH_URL` was set to production URL (`https://broker-weld.vercel.app`) instead of localhost
- This caused NextAuth to redirect to the wrong URL during authentication

### **Fix Applied:**
```env
# Changed from:
NEXTAUTH_URL=https://broker-weld.vercel.app

# To:
NEXTAUTH_URL=http://localhost:3000
```

---

## 🧪 **Test Login Credentials**

### **Investor Account:**
- **Email:** `john@gmail.com`
- **Password:** `password123`
- **Role:** investor
- **Redirects to:** `/dashboard`

### **Admin Account:**
- **Email:** `admin@broker.com`
- **Password:** `Admin123`
- **Role:** admin
- **Redirects to:** `/admin/dashboard`

---

## 🔍 **Step-by-Step Testing Instructions**

### **1. Start Development Server**
```bash
npm run dev
```
**Expected:** Server starts on http://localhost:3000

### **2. Test Investor Login**
1. Go to: `http://localhost:3000/auth/signin`
2. Enter: `john@gmail.com` / `password123`
3. Click "Sign In"
4. **Expected:** Redirect to `/dashboard`

### **3. Test Admin Login**
1. Logout if logged in
2. Go to: `http://localhost:3000/auth/signin`
3. Enter: `admin@broker.com` / `Admin123`
4. Click "Sign In"
5. **Expected:** Redirect to `/admin/dashboard`

### **4. Verify Authentication**
- Check that user session persists on page refresh
- Verify protected routes redirect to login when not authenticated
- Confirm role-based access control works

---

## 🚨 **Common Login Issues & Solutions**

### **Issue 1: "Invalid email or password" Error**
**Causes:**
- Wrong credentials
- User account inactive
- Database connection issues

**Solutions:**
```bash
# Check user credentials in database
node scripts/diagnose-login-issue.js

# Fix user accounts
node scripts/fix-login-users.js
```

### **Issue 2: Infinite Redirect Loop**
**Causes:**
- Wrong NEXTAUTH_URL
- Missing NextAuth secret

**Solutions:**
```env
# Ensure correct URLs in .env
NEXTAUTH_URL=http://localhost:3000  # For development
NEXTAUTH_SECRET=your-secret-key-here
```

### **Issue 3: "Configuration Error"**
**Causes:**
- Missing NextAuth API route
- Incorrect auth configuration

**Solutions:**
- Verify `src/app/api/auth/[...nextauth]/route.ts` exists
- Check `lib/auth.ts` configuration

### **Issue 4: Database Connection Timeout**
**Causes:**
- Invalid DATABASE_URL
- Network connectivity issues
- Database server down

**Solutions:**
```bash
# Test database connection
node scripts/verify-db.js

# Check DATABASE_URL in .env file
```

---

## 🔧 **Browser Debugging Steps**

### **1. Check Browser Console**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for JavaScript errors
4. Common errors:
   - Network request failures
   - Authentication errors
   - Missing environment variables

### **2. Check Network Tab**
1. Open Developer Tools (F12)
2. Go to Network tab
3. Attempt login
4. Look for failed requests:
   - `/api/auth/signin` should return 200
   - `/api/auth/session` should return user data

### **3. Check Application Tab**
1. Open Developer Tools (F12)
2. Go to Application tab
3. Check Cookies section
4. Look for NextAuth session cookies

---

## 🗄️ **Database Verification**

### **Check User Accounts:**
```sql
-- Verify test users exist and are active
SELECT id, email, password, role, is_active, email_verified 
FROM users 
WHERE email IN ('john@gmail.com', 'admin@broker.com');
```

### **Check User Balances:**
```sql
-- Verify user balances exist
SELECT ub.*, u.email 
FROM user_balances ub
JOIN users u ON ub.user_id = u.id
WHERE u.email IN ('john@gmail.com', 'admin@broker.com');
```

---

## 🌐 **Environment Configuration**

### **Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# NextAuth (CRITICAL for login)
NEXTAUTH_URL=http://localhost:3000  # Development
NEXTAUTH_SECRET=your-secret-key-here

# Application
APP_NAME=CredCrypto
APP_URL=http://localhost:3000  # Development
```

### **Development vs Production:**
```env
# Development (.env)
NEXTAUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000

# Production (.env.production)
NEXTAUTH_URL=https://your-domain.com
APP_URL=https://your-domain.com
```

---

## 📊 **Diagnostic Tools**

### **Run Comprehensive Diagnosis:**
```bash
node scripts/diagnose-login-issue.js
```

### **Fix User Accounts:**
```bash
node scripts/fix-login-users.js
```

### **Verify Database:**
```bash
node scripts/verify-db.js
```

---

## ✅ **Success Indicators**

Login is working correctly when:

1. ✅ Development server starts without errors
2. ✅ Login page loads at `/auth/signin`
3. ✅ Valid credentials redirect to appropriate dashboard
4. ✅ Invalid credentials show error message
5. ✅ Session persists across page refreshes
6. ✅ Logout functionality works
7. ✅ Protected routes redirect to login when not authenticated

---

## 🚀 **Next Steps**

Once login is working:

1. **Test All Features:** Verify all dashboard functionality
2. **Test Admin Features:** Check admin panel access and features
3. **Test User Management:** Verify user creation and management
4. **Deploy to Production:** Update environment variables for production

---

## 📞 **Additional Support**

If login issues persist:

1. **Check Server Logs:** Look for error messages in terminal
2. **Restart Development Server:** `Ctrl+C` then `npm run dev`
3. **Clear Browser Cache:** Hard refresh or incognito mode
4. **Check Database Status:** Verify database is accessible
5. **Review Environment Variables:** Ensure all required vars are set

**🎉 Login should now be working correctly with the NEXTAUTH_URL fix!**
