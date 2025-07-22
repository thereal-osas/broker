# 🚀 Deployment Troubleshooting Guide

## 🔧 **Quick Fixes for Common Deployment Errors**

### **1. Environment Variables (Most Common Issue)**

**Problem**: Missing or incorrect environment variables in production

**Solution**: Update your deployment platform with correct environment variables:

#### **For Vercel:**
```bash
# In Vercel Dashboard → Project → Settings → Environment Variables
DATABASE_URL=your_production_database_url
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_production_secret_key
APP_NAME=CredCrypto
APP_URL=https://your-domain.vercel.app
```

#### **For Netlify:**
```bash
# In Netlify Dashboard → Site → Environment Variables
DATABASE_URL=your_production_database_url
NEXTAUTH_URL=https://your-domain.netlify.app
NEXTAUTH_SECRET=your_production_secret_key
```

---

### **2. Database Migration Issues**

**Problem**: New support tables don't exist in production database

**Solution**: Run database setup script in production:

```bash
# Option 1: Run migration script
node scripts/create-support-chat-tables.js

# Option 2: Manual SQL execution in your database
# Copy the SQL from the script and run in your database console
```

---

### **3. Build Errors**

**Problem**: TypeScript or build compilation errors

**Common Fixes:**

#### **A. Missing Dependencies**
```bash
npm install
npm run build
```

#### **B. TypeScript Errors**
Check for:
- Missing imports
- Type mismatches
- Unused variables

#### **C. Next.js App Router Issues**
Ensure all API routes have proper exports:
```typescript
// Each route.ts file must have:
export async function GET() { ... }
export async function POST() { ... }
```

---

### **4. Import/Export Issues**

**Problem**: Module import errors in production

**Check These Files:**
- `src/app/api/support/tickets/route.ts`
- `src/app/api/support/messages/route.ts`
- `src/app/dashboard/support/page.tsx`
- `src/app/admin/support/page.tsx`

**Common Fixes:**
```typescript
// Ensure proper imports
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

// Ensure proper exports
export async function GET() { ... }
export async function POST() { ... }
export default function Component() { ... }
```

---

### **5. Database Connection Issues**

**Problem**: Cannot connect to database in production

**Solutions:**

#### **A. Check Database URL Format**
```bash
# PostgreSQL format:
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Railway format:
DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:port/railway?sslmode=require
```

#### **B. SSL Configuration**
Ensure your database connection includes SSL:
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Important for production
});
```

---

### **6. NextAuth Configuration Issues**

**Problem**: Authentication not working in production

**Solutions:**

#### **A. Correct NEXTAUTH_URL**
```bash
# Development
NEXTAUTH_URL=http://localhost:3000

# Production (Vercel)
NEXTAUTH_URL=https://your-app.vercel.app

# Production (Custom Domain)
NEXTAUTH_URL=https://your-domain.com
```

#### **B. Strong Secret**
```bash
# Generate a strong secret
NEXTAUTH_SECRET=your-very-long-random-secret-key-here
```

---

### **7. API Route Issues**

**Problem**: API routes returning 404 or 500 errors

**Check:**

#### **A. File Structure**
```
src/app/api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts
├── support/
│   ├── tickets/
│   │   └── route.ts
│   └── messages/
│       └── route.ts
```

#### **B. Route Exports**
Each `route.ts` must export HTTP methods:
```typescript
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
```

---

### **8. Frontend Component Issues**

**Problem**: Pages not rendering or showing errors

**Common Fixes:**

#### **A. Client Component Declaration**
```typescript
"use client"; // Must be at the top of client components
```

#### **B. Import Statements**
```typescript
// Correct imports
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation"; // Not "next/router"
```

---

## 🔍 **Debugging Steps**

### **1. Local Testing**
```bash
# Test build locally
npm run build
npm start

# Check for errors
npm run lint
```

### **2. Check Deployment Logs**
- **Vercel**: Go to Deployments → Click on failed deployment → View logs
- **Netlify**: Go to Deploys → Click on failed deploy → View logs

### **3. Test API Endpoints**
```bash
# Test in production
curl https://your-domain.com/api/support/tickets
```

---

## 📋 **Pre-Deployment Checklist**

### **Environment Variables Set:**
- [ ] `DATABASE_URL` (production database)
- [ ] `NEXTAUTH_URL` (production domain)
- [ ] `NEXTAUTH_SECRET` (strong secret)

### **Database Ready:**
- [ ] Production database accessible
- [ ] Support tables created
- [ ] Test connection works

### **Code Ready:**
- [ ] `npm run build` succeeds locally
- [ ] No TypeScript errors
- [ ] All imports/exports correct

### **Files Present:**
- [ ] `src/app/api/support/tickets/route.ts`
- [ ] `src/app/api/support/messages/route.ts`
- [ ] `src/app/dashboard/support/page.tsx`
- [ ] `src/app/admin/support/page.tsx`

---

## 🆘 **If Still Having Issues**

### **Share These Details:**
1. **Exact error message** from deployment logs
2. **Deployment platform** (Vercel, Netlify, etc.)
3. **Which step fails** (build, deploy, runtime)
4. **Environment variables** you've set (without sensitive values)

### **Quick Diagnostic Commands:**
```bash
# Check local build
npm run build

# Check for missing files
node scripts/check-deployment-issues.js

# Test database connection
node scripts/verify-db.js
```

---

## 🎯 **Most Likely Solutions**

Based on common issues, try these in order:

1. **Update NEXTAUTH_URL** to production domain
2. **Set all environment variables** in deployment platform
3. **Run database migration** script in production
4. **Check deployment logs** for specific error messages
5. **Test local build** with `npm run build`

**90% of deployment issues are environment variable related!** 🔧
