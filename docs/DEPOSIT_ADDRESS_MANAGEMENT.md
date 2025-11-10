# Deposit Address Management System

## Overview

The Deposit Address Management System allows administrators to configure and manage cryptocurrency and payment deposit addresses through a user-friendly admin interface. This replaces the previous hardcoded environment variable approach with a dynamic, database-driven solution.

## Features

### Admin Features
- ✅ View all configured deposit addresses
- ✅ Add new payment methods and deposit addresses
- ✅ Edit existing deposit addresses
- ✅ Delete deposit addresses
- ✅ Enable/disable payment methods
- ✅ Set minimum and maximum deposit limits
- ✅ Add custom instructions for users
- ✅ Configure display order
- ✅ QR code support (URL or auto-generated)
- ✅ Full audit logging of all changes

### User Features
- ✅ Dynamic payment method selection
- ✅ View only active payment methods
- ✅ See payment-specific instructions
- ✅ Copy addresses to clipboard
- ✅ QR code display for easy scanning
- ✅ Min/max deposit validation

## Database Schema

### `deposit_addresses` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `payment_method` | VARCHAR(50) | Payment method identifier (e.g., 'bitcoin', 'ethereum') |
| `label` | VARCHAR(100) | Display name (e.g., 'Bitcoin (BTC)') |
| `address` | TEXT | Wallet address or account details |
| `network` | VARCHAR(50) | Network type (e.g., 'BTC', 'ETH', 'ERC20', 'TRC20') |
| `qr_code_url` | TEXT | Optional URL to QR code image |
| `is_active` | BOOLEAN | Whether this payment method is visible to users |
| `display_order` | INTEGER | Order in which to display (lower = first) |
| `min_deposit` | DECIMAL(15,2) | Minimum deposit amount in USD |
| `max_deposit` | DECIMAL(15,2) | Maximum deposit amount in USD (NULL = no limit) |
| `instructions` | TEXT | Special instructions for users |
| `created_by` | UUID | Admin user who created this |
| `updated_by` | UUID | Admin user who last updated this |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### `deposit_address_audit_log` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `deposit_address_id` | UUID | Reference to deposit_addresses |
| `action` | VARCHAR(20) | Action type: 'created', 'updated', 'deleted', 'activated', 'deactivated' |
| `changed_by` | UUID | Admin user who made the change |
| `old_value` | JSONB | Previous state (for updates/deletes) |
| `new_value` | JSONB | New state (for creates/updates) |
| `created_at` | TIMESTAMP | When the change occurred |

## Installation

### 1. Run Database Migration

```bash
# Make sure your DATABASE_URL is set in .env
node scripts/migrate-deposit-addresses.js
```

This will:
- Create the `deposit_addresses` table
- Create the `deposit_address_audit_log` table
- Add necessary indexes
- Insert default addresses (Bitcoin, Ethereum, USDT)
- Set up audit logging triggers

### 2. Verify Installation

Check that the tables were created:

```sql
SELECT * FROM deposit_addresses;
SELECT * FROM deposit_address_audit_log;
```

## Usage

### Admin Interface

#### Access the Admin Panel

Navigate to: `/admin/deposit-addresses`

**Requirements:** Must be logged in as an admin user.

#### Add New Deposit Address

1. Click "Add New Address" button
2. Fill in the form:
   - **Payment Method**: Select from dropdown (bitcoin, ethereum, usdt, etc.)
   - **Label**: Display name (e.g., "Bitcoin Wallet")
   - **Address**: The actual wallet address or account details
   - **Network**: Optional network identifier (e.g., "BTC", "ERC20")
   - **Display Order**: Number to control sort order (lower = first)
   - **Min Deposit**: Minimum amount in USD
   - **Max Deposit**: Maximum amount in USD (leave empty for no limit)
   - **QR Code URL**: Optional URL to QR code image
   - **Instructions**: Special instructions for users
   - **Active**: Check to make visible to users
3. Click "Create"

#### Edit Deposit Address

1. Click the edit icon (pencil) next to any address
2. Modify the fields
3. Click "Update"

#### Delete Deposit Address

1. Click the delete icon (trash) next to any address
2. Confirm the deletion

**Note:** Deletion is logged in the audit log.

#### Toggle Active Status

Click the eye icon to quickly enable/disable a payment method without editing.

### API Endpoints

#### Admin Endpoints (Require Admin Authentication)

**GET `/api/admin/deposit-addresses`**
- Fetch all deposit addresses (including inactive)
- Returns: `{ addresses: DepositAddress[] }`

**POST `/api/admin/deposit-addresses`**
- Create new deposit address
- Body: `{ payment_method, label, address, network?, qr_code_url?, is_active?, display_order?, min_deposit?, max_deposit?, instructions? }`
- Returns: `{ message, address }`

**PUT `/api/admin/deposit-addresses/[id]`**
- Update existing deposit address
- Body: Same as POST
- Returns: `{ message, address }`

**DELETE `/api/admin/deposit-addresses/[id]`**
- Delete deposit address
- Returns: `{ message, address }`

**PATCH `/api/admin/deposit-addresses/[id]`**
- Toggle active status
- Body: `{ is_active: boolean }`
- Returns: `{ message, address }`

#### Public Endpoint (No Authentication Required)

**GET `/api/deposit-addresses`**
- Fetch active deposit addresses for users
- Returns: `{ addresses: DepositAddress[] }`
- Only returns addresses where `is_active = true`

### Address Validation

The system includes built-in validation for common cryptocurrency address formats:

- **Bitcoin**: `^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$`
- **Ethereum**: `^0x[a-fA-F0-9]{40}$`
- **USDT**: ERC20 or TRC20 format
- **Litecoin**: `^(ltc1|[LM3])[a-zA-HJ-NP-Z0-9]{26,62}$`
- **BNB**: Ethereum or Binance Chain format
- **Cardano**: `^addr1[a-z0-9]{58,}$`
- **Solana**: `^[1-9A-HJ-NP-Za-km-z]{32,44}$`
- **Dogecoin**: `^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$`
- **Polygon**: `^0x[a-fA-F0-9]{40}$`

Invalid addresses will be rejected with a descriptive error message.

## User Deposit Flow

### Updated Deposit Page

The user deposit page (`/dashboard/deposit`) now:

1. **Fetches active deposit addresses** from `/api/deposit-addresses`
2. **Displays payment method options** dynamically based on active addresses
3. **Shows payment-specific details**:
   - Network type (e.g., "ERC20", "TRC20")
   - Custom instructions
   - Min/max deposit limits
4. **Generates QR codes** automatically or displays custom QR code images
5. **Validates deposit amounts** against configured min/max limits

### Example User Experience

1. User navigates to `/dashboard/deposit`
2. Sees available payment methods (only active ones)
3. Selects a payment method (e.g., "Bitcoin (BTC)")
4. Sees:
   - Wallet address with copy button
   - QR code for easy scanning
   - Network information ("BTC")
   - Instructions ("Send Bitcoin to this address. Minimum 3 confirmations required.")
   - Min/max deposit limits
5. Enters deposit amount (validated against limits)
6. Submits deposit request with transaction hash

## Audit Logging

All changes to deposit addresses are logged in the `deposit_address_audit_log` table:

### View Audit Log

```sql
SELECT 
  dal.action,
  dal.created_at,
  u.email as changed_by,
  dal.old_value,
  dal.new_value
FROM deposit_address_audit_log dal
LEFT JOIN users u ON dal.changed_by = u.id
ORDER BY dal.created_at DESC;
```

### Tracked Actions

- `created` - New deposit address added
- `updated` - Deposit address modified
- `deleted` - Deposit address removed
- `activated` - Payment method enabled
- `deactivated` - Payment method disabled

## Migration from Environment Variables

If you were previously using environment variables for crypto wallets:

### Old Approach (Deprecated)
```env
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=12fRdYfNvvbAgoRM3bD8rByorieo5ZqD9P
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855
NEXT_PUBLIC_CRYPTO_WALLET_USDT=0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855
```

### New Approach (Current)
Addresses are stored in the database and managed through the admin interface.

**Migration Steps:**
1. Run the migration script (it automatically inserts default addresses)
2. Update the default addresses in the admin panel with your actual addresses
3. Remove the old environment variables (optional, but recommended)

## Security Considerations

### Admin Authentication
- All admin endpoints require authentication
- Only users with `role = 'admin'` can access
- Uses `next-auth` session validation

### Input Validation
- Address format validation for known cryptocurrencies
- SQL injection protection via parameterized queries
- XSS protection via React's built-in escaping

### Audit Trail
- All changes are logged with user ID and timestamp
- Old and new values stored for accountability
- Cannot be modified or deleted (audit log is append-only)

## Troubleshooting

### Issue: "Failed to fetch deposit addresses"

**Cause:** Database connection issue or table doesn't exist

**Solution:**
1. Check DATABASE_URL in .env
2. Run migration: `node scripts/migrate-deposit-addresses.js`
3. Verify tables exist: `\dt` in psql

### Issue: "Invalid address format"

**Cause:** Address doesn't match expected format for the payment method

**Solution:**
1. Double-check the address
2. Ensure you selected the correct payment method
3. For custom payment methods, validation may be less strict

### Issue: No payment methods showing for users

**Cause:** All deposit addresses are inactive

**Solution:**
1. Go to `/admin/deposit-addresses`
2. Click the eye icon to activate at least one address
3. Refresh the user deposit page

## Future Enhancements

Potential improvements for future versions:

- [ ] Bulk import/export of deposit addresses
- [ ] Automatic QR code generation and storage
- [ ] Multi-currency support (display amounts in crypto)
- [ ] Real-time address validation via blockchain APIs
- [ ] Email notifications when addresses are changed
- [ ] Role-based permissions (e.g., view-only admins)
- [ ] Address rotation/expiration
- [ ] Integration with payment processors
- [ ] Analytics dashboard for deposit methods

## Support

For issues or questions:
1. Check the audit log for recent changes
2. Verify database connectivity
3. Review server logs for detailed error messages
4. Contact system administrator

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0

