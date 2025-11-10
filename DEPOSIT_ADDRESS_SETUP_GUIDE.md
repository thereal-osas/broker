# Deposit Address Management - Quick Setup Guide

## 🎯 Overview

This guide will help you set up the new **Admin-Configurable Deposit Address Management System** in your production environment.

## ✅ What's New

### Before (Old System)
- ❌ Hardcoded wallet addresses in environment variables
- ❌ Required code deployment to change addresses
- ❌ No audit trail of changes
- ❌ Limited to 3 cryptocurrencies

### After (New System)
- ✅ Dynamic deposit addresses managed through admin panel
- ✅ Change addresses without code deployment
- ✅ Full audit logging of all changes
- ✅ Support for unlimited payment methods
- ✅ Custom instructions per payment method
- ✅ Min/max deposit limits
- ✅ Enable/disable payment methods on the fly
- ✅ QR code support

---

## 📋 Prerequisites

- ✅ Database access (PostgreSQL)
- ✅ Admin account credentials
- ✅ Node.js installed (for running migration script)
- ✅ `DATABASE_URL` environment variable configured

---

## 🚀 Installation Steps

### Step 1: Run Database Migration

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the migration script
node scripts/migrate-deposit-addresses.js
```

**Expected Output:**
```
🚀 Starting deposit addresses migration...

✅ Migration completed successfully!

📋 Summary:
   - Created deposit_addresses table
   - Created deposit_address_audit_log table
   - Added indexes for performance
   - Inserted default deposit addresses (Bitcoin, Ethereum, USDT)
   - Created audit logging triggers

✅ Verified: 3 deposit addresses in database

📍 Default Deposit Addresses:
   1. Bitcoin (BTC) (BTC)
      Address: 12fRdYfNvvbAgoRM3bD8rByorieo5ZqD9P
   2. Ethereum (ETH) (ETH)
      Address: 0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855
   3. Tether (USDT) (ERC20)
      Address: 0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855
```

### Step 2: Update Default Addresses (Important!)

The migration inserts placeholder addresses. **You MUST update these with your actual wallet addresses:**

1. **Login to Admin Panel**
   - Navigate to: `https://your-domain.com/admin/deposit-addresses`
   - Login with your admin credentials

2. **Update Each Address**
   - Click the **Edit** icon (pencil) next to each address
   - Replace the placeholder address with your **actual wallet address**
   - Click **Update**

3. **Verify Changes**
   - Check that all addresses are correct
   - Ensure all payment methods are marked as **Active** (green badge)

### Step 3: Deploy to Production

```bash
# Build the application
npm run build

# Deploy to your production server
# (Your deployment process here)
```

### Step 4: Test the Feature

#### Test Admin Panel
1. Go to `/admin/deposit-addresses`
2. Verify you can:
   - ✅ View all deposit addresses
   - ✅ Add a new address
   - ✅ Edit an existing address
   - ✅ Delete an address
   - ✅ Toggle active/inactive status

#### Test User Deposit Page
1. Go to `/dashboard/deposit`
2. Verify:
   - ✅ Payment methods are displayed
   - ✅ Correct addresses are shown
   - ✅ QR codes are generated
   - ✅ Instructions are displayed
   - ✅ Min/max limits are enforced

---

## 🔧 Configuration

### Adding a New Payment Method

1. Go to `/admin/deposit-addresses`
2. Click **"Add New Address"**
3. Fill in the form:
   - **Payment Method**: Select from dropdown (e.g., `litecoin`, `bnb`, `solana`)
   - **Label**: Display name (e.g., "Litecoin (LTC)")
   - **Address**: Your wallet address
   - **Network**: Network type (e.g., "LTC", "BEP20")
   - **Display Order**: Number to control sort order (lower = first)
   - **Min Deposit**: Minimum amount in USD (e.g., 10.00)
   - **Max Deposit**: Maximum amount in USD (leave empty for no limit)
   - **Instructions**: Special instructions for users
   - **Active**: Check to make visible to users
4. Click **"Create"**

### Supported Payment Methods

The system includes validation for:
- Bitcoin (BTC)
- Ethereum (ETH)
- Tether (USDT) - ERC20 or TRC20
- Litecoin (LTC)
- Binance Coin (BNB)
- Cardano (ADA)
- Solana (SOL)
- Dogecoin (DOGE)
- Polygon (MATIC)
- Bank Transfer
- PayPal
- Other (custom)

---

## 📊 Monitoring & Audit

### View Audit Log

To see who changed what and when:

```sql
SELECT 
  dal.action,
  dal.created_at,
  u.email as changed_by,
  da.label as address_label,
  dal.old_value,
  dal.new_value
FROM deposit_address_audit_log dal
LEFT JOIN users u ON dal.changed_by = u.id
LEFT JOIN deposit_addresses da ON dal.deposit_address_id = da.id
ORDER BY dal.created_at DESC
LIMIT 50;
```

### Check Active Addresses

```sql
SELECT 
  payment_method,
  label,
  address,
  network,
  is_active,
  min_deposit,
  max_deposit
FROM deposit_addresses
WHERE is_active = true
ORDER BY display_order;
```

---

## 🛡️ Security Best Practices

1. **Verify Addresses Before Saving**
   - Double-check wallet addresses
   - Test with a small transaction first
   - Use address validation tools

2. **Limit Admin Access**
   - Only trusted admins should have access
   - Review audit logs regularly

3. **Backup Before Changes**
   - Export current addresses before major changes
   - Keep a record of all wallet addresses

4. **Monitor Deposits**
   - Check that deposits are going to correct addresses
   - Verify blockchain transactions

---

## 🐛 Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** The tables already exist. You can skip the migration or drop the tables first:

```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS deposit_address_audit_log CASCADE;
DROP TABLE IF EXISTS deposit_addresses CASCADE;
```

Then run the migration again.

### Issue: "Admin access required" error

**Solution:** Make sure you're logged in as an admin user. Check your user role:

```sql
SELECT email, role FROM users WHERE email = 'your-email@example.com';
```

If role is not 'admin', update it:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Issue: No payment methods showing on user deposit page

**Solution:** Make sure at least one address is active:

```sql
UPDATE deposit_addresses SET is_active = true WHERE id = 'address-id';
```

Or use the admin panel to toggle the status.

### Issue: Invalid address format error

**Solution:** 
- Verify the address format matches the payment method
- For custom payment methods, validation may be less strict
- Check the address doesn't have extra spaces or characters

---

## 📝 Migration Checklist

Use this checklist to ensure a smooth migration:

- [ ] Backup current database
- [ ] Run migration script successfully
- [ ] Verify tables created: `deposit_addresses`, `deposit_address_audit_log`
- [ ] Update default addresses with actual wallet addresses
- [ ] Test adding a new payment method
- [ ] Test editing an existing address
- [ ] Test deleting an address
- [ ] Test toggling active/inactive status
- [ ] Verify user deposit page shows correct addresses
- [ ] Test QR code generation
- [ ] Test deposit amount validation (min/max)
- [ ] Review audit log
- [ ] Deploy to production
- [ ] Test in production environment
- [ ] Remove old environment variables (optional)
- [ ] Document new wallet addresses securely

---

## 📚 Additional Resources

- **Full Documentation**: See `docs/DEPOSIT_ADDRESS_MANAGEMENT.md`
- **Database Schema**: See `database/migrations/add_deposit_addresses_table.sql`
- **API Documentation**: See API endpoints section in full docs

---

## 🎉 Success!

Once you've completed all steps, you should have:

✅ A fully functional admin panel for managing deposit addresses  
✅ Dynamic user deposit page with configurable payment methods  
✅ Full audit trail of all changes  
✅ Ability to add/edit/delete payment methods without code deployment  
✅ QR code support for cryptocurrency addresses  
✅ Custom instructions and limits per payment method  

**Congratulations! Your deposit address management system is now live!** 🚀

---

**Need Help?**

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the audit log for recent changes
3. Check server logs for detailed error messages
4. Refer to the full documentation in `docs/DEPOSIT_ADDRESS_MANAGEMENT.md`

---

**Last Updated:** 2025-11-10  
**Version:** 1.0.0

