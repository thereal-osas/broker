# 🏦 Comprehensive Deposit System Testing Guide

This guide provides step-by-step procedures for testing the complete deposit functionality in your broker application.

## 📋 Overview

The deposit system consists of:
- **User Interface**: Deposit page with crypto wallet addresses and QR codes
- **API Endpoints**: Deposit submission and admin management
- **Database**: Deposit requests, balance updates, and transaction records
- **Admin Panel**: Deposit approval/decline functionality

## 🔧 Prerequisites

1. **Development Server Running**: `npm run dev`
2. **Database Seeded**: Admin user and investment plans created
3. **Environment Variables**: Crypto wallet addresses configured

## 🧪 Testing Scenarios

### 1. Wallet Address Configuration Test

**Purpose**: Verify that cryptocurrency wallet addresses are properly configured and displayed.

**Steps**:
1. Check environment variables in `.env`:
   ```bash
   # Current placeholder addresses (need to be updated)
   NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=your-bitcoin-address-here
   NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=your-ethereum-address-here
   NEXT_PUBLIC_CRYPTO_WALLET_USDT=your-usdt-address-here
   NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=your-litecoin-address-here
   ```

2. Run wallet validation script:
   ```bash
   node scripts/validate-wallet-addresses.js
   ```

3. Navigate to deposit page: `http://localhost:3000/dashboard/deposit`
4. Verify each cryptocurrency shows correct wallet address
5. Check QR code generation for each address

**Expected Results**:
- ✅ All wallet addresses display correctly
- ✅ QR codes generate properly
- ✅ Copy functionality works for addresses

### 2. User Deposit Submission Test

**Purpose**: Test the deposit submission workflow from user perspective.

**Steps**:
1. Login as investor user
2. Navigate to `/dashboard/deposit`
3. Select cryptocurrency (Bitcoin, Ethereum, USDT, Litecoin)
4. Enter deposit amount (minimum $10)
5. Copy wallet address or scan QR code
6. Enter transaction hash (use test hash: `test_tx_123456789`)
7. Submit deposit request

**Expected Results**:
- ✅ Form validation works (minimum amount, required fields)
- ✅ Deposit request created with "pending" status
- ✅ Success message displayed
- ✅ Request appears in user's deposit history

### 3. Admin Deposit Management Test

**Purpose**: Test admin approval/decline functionality and balance updates.

**Steps**:
1. Login as admin user (`admin@broker.com` / `Admin123`)
2. Navigate to `/admin/deposits`
3. View pending deposit requests
4. Click on a deposit to view details
5. Test approval:
   - Add admin notes
   - Click "Approve"
   - Verify success message
6. Test decline:
   - Select another deposit
   - Add decline reason
   - Click "Decline"

**Expected Results**:
- ✅ Pending deposits display correctly
- ✅ Approval updates deposit status to "approved"
- ✅ User's balance increases by deposit amount
- ✅ Transaction record created
- ✅ Decline updates status to "declined"
- ✅ No balance change for declined deposits

### 4. Balance Update Verification

**Purpose**: Verify that approved deposits correctly update user balances.

**Steps**:
1. Check user balance before deposit approval
2. Approve a deposit through admin panel
3. Check user balance after approval
4. Verify transaction history

**Expected Results**:
- ✅ `total_balance` increases by deposit amount
- ✅ `deposit_balance` increases by deposit amount
- ✅ Transaction record shows type "deposit"
- ✅ Balance changes reflect immediately

### 5. Automated Testing

**Purpose**: Run comprehensive automated tests.

**Command**:
```bash
node scripts/test-deposit-system.js
```

**What it tests**:
- Creates test user and deposits
- Tests approval workflow
- Verifies balance updates
- Checks transaction records
- Tests decline functionality

## 🛠️ Manual Testing Procedures

### Setting Up Test Wallet Addresses

For testing purposes, update your `.env` file with test addresses:

```env
# Test wallet addresses (DO NOT use in production)
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e
NEXT_PUBLIC_CRYPTO_WALLET_USDT=0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e
NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
```

### Creating Test Deposits

1. **Register Test User**:
   - Go to `/auth/signup`
   - Create account: `testuser@example.com` / `testpass123`

2. **Submit Test Deposit**:
   - Login and go to `/dashboard/deposit`
   - Amount: $100
   - Crypto: Bitcoin
   - Transaction Hash: `test_tx_bitcoin_123456789`
   - Submit request

3. **Admin Approval**:
   - Login as admin
   - Go to `/admin/deposits`
   - Find pending deposit
   - Approve with notes: "Test deposit approved"

### Database Verification

Check database directly:

```sql
-- Check deposit requests
SELECT * FROM deposit_requests ORDER BY created_at DESC;

-- Check user balances
SELECT u.email, ub.* FROM user_balances ub 
JOIN users u ON ub.user_id = u.id;

-- Check transactions
SELECT u.email, t.* FROM transactions t 
JOIN users u ON t.user_id = u.id 
ORDER BY t.created_at DESC;
```

## 🚨 Important Notes

### Current Implementation Status

✅ **Working**:
- Deposit page UI with wallet addresses
- QR code generation
- Deposit request submission
- Admin deposit listing
- Database schema and tables

✅ **Fixed**:
- Admin approval/decline API endpoints (just created)
- Balance update logic
- Transaction recording

### Limitations

❌ **Not Implemented**:
- Automatic blockchain transaction monitoring
- Real-time deposit detection
- Email notifications for deposit status
- File upload for payment proof

### Security Considerations

⚠️ **Important**:
- Wallet addresses in `.env` are currently placeholders
- Replace with your actual wallet addresses before production
- Never commit real wallet private keys to version control
- Use testnet addresses for testing

## 🔄 Testing Workflow Summary

1. **Setup**: Configure wallet addresses and start dev server
2. **User Flow**: Register → Login → Submit deposit
3. **Admin Flow**: Login → Review deposits → Approve/Decline
4. **Verification**: Check balances and transaction history
5. **Automated**: Run test script for comprehensive validation

## 📞 Troubleshooting

**Common Issues**:
- **"Internal Server Error"**: Check server logs and database connection
- **Missing Deposits**: Verify API endpoints are working
- **Balance Not Updated**: Check admin approval API and transaction logic
- **QR Code Not Showing**: Verify wallet addresses in environment variables

**Debug Commands**:
```bash
# Check database connection
node scripts/test-railway-connection.js

# Verify database tables
node scripts/verify-db.js

# Run deposit system test
node scripts/test-deposit-system.js
```
