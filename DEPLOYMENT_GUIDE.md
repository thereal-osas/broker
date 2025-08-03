# 🚀 Deployment Guide - Admin Control Features

## Overview
This guide helps you deploy the broker application with the new admin control features:
- Configurable withdrawal percentage limits
- User deletion functionality  
- Enhanced user deactivation system

## 🔧 Pre-Deployment Checklist

### 1. Environment Variables
Ensure these environment variables are set in your deployment platform:

```bash
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-super-secret-key-minimum-32-characters"
NODE_ENV="production"
```

### 2. Database Migration
Run the production migration script to create the `system_settings` table:

```bash
node scripts/production-migration.js
```

### 3. TypeScript Compilation
Verify TypeScript compilation works:

```bash
npm run build
```

## 🚀 Deployment Steps

### Step 1: Deploy Code Changes
1. Push all changes to your repository
2. Deploy to your platform (Vercel, Railway, etc.)

### Step 2: Run Database Migration
After deployment, run the migration script in your production environment:

**For Railway:**
```bash
railway run node scripts/production-migration.js
```

**For Vercel (using serverless function):**
Create a temporary API endpoint to run the migration, then remove it.

**For other platforms:**
Connect to your production environment and run the script.

### Step 3: Verify Deployment
Run the verification script:

```bash
node scripts/verify-deployment.js
```

## 🔍 Troubleshooting Common Issues

### Issue 1: Database Connection Error
**Symptoms:** "Connection refused" or "SSL required"
**Solution:**
- Verify DATABASE_URL is correct
- Ensure SSL is enabled for production databases
- Check firewall settings

### Issue 2: Middleware Token Error
**Symptoms:** "Cannot read property 'isActive' of undefined"
**Solution:**
- Verify NEXTAUTH_SECRET is set
- Clear browser cookies and sessions
- Check middleware.ts configuration

### Issue 3: TypeScript Compilation Error
**Symptoms:** Build fails with type errors
**Solution:**
- Run `npx tsc --noEmit` to check types
- Verify all imports use correct paths
- Check next-auth.d.ts types

### Issue 4: Missing System Settings
**Symptoms:** Admin settings page shows no data
**Solution:**
- Run the production migration script
- Check database connection
- Verify system_settings table exists

## 📋 Post-Deployment Verification

### 1. Test Admin Features
- [ ] Login as admin user
- [ ] Access `/admin/settings` 
- [ ] Modify withdrawal percentage limits
- [ ] Test user deactivation in `/admin/users`
- [ ] Verify user deletion functionality

### 2. Test User Experience
- [ ] Login as regular user
- [ ] Test withdrawal with new limits
- [ ] Deactivate a test user and verify restrictions
- [ ] Ensure support pages are accessible for deactivated users

### 3. Test API Endpoints
- [ ] `/api/admin/settings` - Admin settings management
- [ ] `/api/platform-settings` - Public platform settings
- [ ] `/api/admin/users/[id]/delete` - User deletion
- [ ] `/api/withdrawals` - Withdrawal with percentage limits

## 🔒 Security Considerations

### 1. Admin Access
- Ensure only trusted users have admin role
- Regularly audit admin actions
- Monitor user deletion activities

### 2. Database Security
- Use strong database passwords
- Enable SSL connections
- Regularly backup data before major operations

### 3. Environment Security
- Keep NEXTAUTH_SECRET secure and unique
- Use HTTPS in production
- Regularly rotate secrets

## 📞 Support

If you encounter issues during deployment:

1. Check the diagnostic script output: `node scripts/diagnose-deployment.js`
2. Review deployment logs for specific error messages
3. Verify all environment variables are correctly set
4. Test database connectivity separately

## 🎯 Success Indicators

Your deployment is successful when:
- ✅ All diagnostic checks pass
- ✅ Admin can modify withdrawal limits
- ✅ User deletion works with proper confirmations
- ✅ Deactivated users can access support but not other features
- ✅ Middleware properly restricts API access
- ✅ No TypeScript compilation errors

## 📝 Rollback Plan

If deployment fails:
1. Revert code changes in your repository
2. Restore database from backup if needed
3. Remove any partially created database tables
4. Clear application cache and restart services

The system is designed to be backward compatible, so existing functionality should continue working even if new features fail.
