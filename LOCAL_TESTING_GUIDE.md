# Local Testing Guide - Broker Application

## ✅ **Setup Complete!**

Your local development environment is now fully configured and ready for testing all the recent fixes.

## 🔑 **Test Account Credentials**

### Admin Accounts
- **Email**: `admin@credcrypto.com`
- **Password**: `password`
- **Balance**: $50,000.00
- **Credit Score**: 2000 CRD
- **Access**: Full admin panel, profit distribution, user management

### Investor Accounts

1. **Primary Test Investor**
   - **Email**: `investor@test.com`
   - **Password**: `password`
   - **Balance**: $5,000.00
   - **Credit Score**: 500 CRD

2. **John Doe**
   - **Email**: `john.doe@example.com`
   - **Password**: `password`
   - **Balance**: $2,500.00
   - **Credit Score**: 300 CRD

3. **Jane Smith**
   - **Email**: `jane.smith@example.com`
   - **Password**: `password`
   - **Balance**: $7,500.00
   - **Credit Score**: 750 CRD

4. **Mike Wilson**
   - **Email**: `mike.wilson@example.com`
   - **Password**: `password`
   - **Balance**: $1,200.00
   - **Credit Score**: 150 CRD

5. **Sarah Johnson**
   - **Email**: `sarah.johnson@example.com`
   - **Password**: `password`
   - **Balance**: $15,000.00
   - **Credit Score**: 1200 CRD

## 📊 **Test Data Available**

### Investment Plans
- **Starter Plan**: $100-$1,000, 1.5% daily, 30 days
- **Growth Plan**: $1,000-$5,000, 2.5% daily, 45 days
- **Premium Plan**: $5,000-$25,000, 3.5% daily, 60 days
- **VIP Plan**: $25,000+, 4.5% daily, 90 days

### Live Trade Plans
- **Quick Trade**: $50-$2,000, 0.1% hourly, 24 hours
- **Day Trader**: $200-$5,000, 0.15% hourly, 48 hours
- **Pro Trader**: $1,000-$20,000, 0.2% hourly, 72 hours

### Sample Data
- **8 users** with realistic balances
- **5 active investments** across different plans
- **3 live trades** (2 active, 1 completed)
- **9 investment plans** available
- **4 live trade plans** available

## 🧪 **Testing Your Recent Fixes**

### 1. **Admin Investment Management** (Fixed 503 Errors)
1. Login as `admin@credcrypto.com`
2. Navigate to `/admin/investments`
3. ✅ **Verify**: Page loads without 503 errors
4. ✅ **Verify**: Shows list of active investments
5. ✅ **Test**: Profit distribution functionality

### 2. **Live Trade Status Display** (Fixed Status Badges)
1. Login as any investor account
2. Navigate to live trades section
3. ✅ **Verify**: Active trades show "Active" badge
4. ✅ **Verify**: Completed trades show "Completed" badge
5. ✅ **Verify**: Timers stop for completed trades
6. ✅ **Test**: Create a new live trade and watch status updates

### 3. **Profit Distribution** (Fixed 400 Errors)
1. Login as admin
2. Go to profit distribution section
3. ✅ **Test**: Investment profit distribution
4. ✅ **Test**: Live trade profit distribution
5. ✅ **Verify**: "No eligible trades" message is resolved
6. ✅ **Verify**: Eligible trades are detected correctly

### 4. **Database Schema** (Fixed Table Issues)
1. All required tables exist and are properly configured
2. ✅ **Verify**: No more table name inconsistency errors
3. ✅ **Verify**: Balance operations work correctly
4. ✅ **Test**: All CRUD operations function properly

## 🚀 **How to Start Testing**

### Step 1: Start Development Server
```bash
# Make sure you're in the project directory
cd c:\Users\Osas\OneDrive\Desktop\ezzy\broker

# Start the development server
npm run dev
```

### Step 2: Access the Application
- Open your browser and go to: `http://localhost:3000`
- Login with any of the test credentials above

### Step 3: Test Key Features
1. **Admin Panel**: `/admin` (admin accounts only)
2. **Investment Dashboard**: Available after login
3. **Live Trades**: Test real-time status updates
4. **Profit Distribution**: Admin functionality

## 🔧 **Troubleshooting**

### If you get connection errors:
```bash
# Run the connection fix script
node scripts/fix-local-connection.js

# Restart your development server
npm run dev
```

### If you need to reset test data:
```bash
# Recreate comprehensive test data
node scripts/create-comprehensive-test-data.js
```

### If you need to switch environments:
```bash
# Switch to local development
node scripts/switch-environment.js local

# Switch to production
node scripts/switch-environment.js production

# Check current configuration
node scripts/switch-environment.js status
```

## 📋 **Testing Checklist**

### Admin Features
- [ ] Login as admin works
- [ ] Admin dashboard loads
- [ ] Investment management page loads (no 503 errors)
- [ ] Live trade management works
- [ ] Profit distribution functions correctly
- [ ] User management accessible

### Investor Features
- [ ] Login as investor works
- [ ] Dashboard shows correct balance and credit score
- [ ] Investment plans display correctly
- [ ] Live trade plans available
- [ ] Can create new investments
- [ ] Can create new live trades
- [ ] Status badges show correctly
- [ ] Timers work properly for active trades
- [ ] Completed trades show proper status

### Real-time Features
- [ ] Live trade progress updates
- [ ] Status changes from active to completed
- [ ] Timer stops for completed trades
- [ ] Profit calculations work

## 🎯 **Next Steps After Testing**

1. **Verify all fixes work correctly** in local environment
2. **Test edge cases** with different user scenarios
3. **Confirm profit distribution** works for both investments and live trades
4. **Switch to production configuration** when ready to deploy:
   ```bash
   node scripts/switch-environment.js production
   ```
5. **Deploy to Vercel** with confidence that all issues are resolved

## 📞 **Support**

If you encounter any issues during testing:
1. Check the browser console for JavaScript errors
2. Check the terminal for server-side errors
3. Run the database test: `node scripts/test-local-db.js`
4. Verify environment configuration: `node scripts/switch-environment.js status`

Your local development environment is now production-ready with comprehensive test data!
