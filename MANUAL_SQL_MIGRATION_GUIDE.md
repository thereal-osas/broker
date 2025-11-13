# Manual SQL Migration Guide - Deposit Addresses

## 📋 Overview

This guide provides the complete SQL script to manually create the `deposit_addresses` and `deposit_address_audit_log` tables in your production PostgreSQL database.

---

## ⚠️ Prerequisites & Warnings

### **Before You Begin:**

1. **✅ Backup Your Database**
   ```bash
   pg_dump -U your_username -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **✅ Check UUID Extension**
   The script requires the `uuid-ossp` extension. Verify it's installed:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
   ```
   
   If not installed, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

3. **✅ Verify Users Table Exists**
   The script references the `users` table. Verify it exists:
   ```sql
   SELECT EXISTS (
       SELECT FROM information_schema.tables 
       WHERE table_name = 'users'
   );
   ```

4. **✅ Check for Existing Tables**
   Verify these tables don't already exist:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name IN ('deposit_addresses', 'deposit_address_audit_log');
   ```

### **Warnings:**

- ⚠️ **Run in a transaction** - The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- ⚠️ **Update default addresses** - The script inserts placeholder addresses that you MUST update with your actual wallet addresses
- ⚠️ **Admin access required** - Only run this with database admin privileges
- ⚠️ **Production environment** - Test in staging first if possible

---

## 📝 Complete SQL Script

**Copy and paste this entire script into your PostgreSQL client:**

```sql
-- ============================================================================
-- Migration: Add Deposit Addresses Management
-- Description: Create table for admin-configurable deposit addresses
-- Date: 2025-11-10
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create deposit_addresses table
CREATE TABLE IF NOT EXISTS deposit_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_method VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    network VARCHAR(50), -- e.g., 'BTC', 'ETH', 'TRC20', 'ERC20', 'BEP20'
    qr_code_url TEXT, -- Optional QR code image URL
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    min_deposit DECIMAL(15,2) DEFAULT 10.00,
    max_deposit DECIMAL(15,2),
    instructions TEXT, -- Additional instructions for users
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_payment_method ON deposit_addresses(payment_method);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_is_active ON deposit_addresses(is_active);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_display_order ON deposit_addresses(display_order);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_deposit_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deposit_addresses_updated_at
    BEFORE UPDATE ON deposit_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_deposit_addresses_updated_at();

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS deposit_address_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deposit_address_id UUID REFERENCES deposit_addresses(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated')),
    changed_by UUID REFERENCES users(id),
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_deposit_address_audit_log_address_id ON deposit_address_audit_log(deposit_address_id);
CREATE INDEX IF NOT EXISTS idx_deposit_address_audit_log_created_at ON deposit_address_audit_log(created_at);

-- Insert default deposit addresses (migrating from environment variables)
INSERT INTO deposit_addresses (payment_method, label, address, network, is_active, display_order, instructions)
VALUES 
    ('bitcoin', 'Bitcoin (BTC)', '12fRdYfNvvbAgoRM3bD8rByorieo5ZqD9P', 'BTC', true, 1, 'Send Bitcoin to this address. Minimum 3 confirmations required.'),
    ('ethereum', 'Ethereum (ETH)', '0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855', 'ETH', true, 2, 'Send Ethereum to this address. ERC-20 network.'),
    ('usdt', 'Tether (USDT)', '0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855', 'ERC20', true, 3, 'Send USDT to this address. ERC-20 network only.')
ON CONFLICT DO NOTHING;

-- Display success message
SELECT 'Migration completed successfully!' AS status;
```

---

## ✅ Verification Steps

### **Step 1: Verify Tables Were Created**

```sql
-- Check if tables exist
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('deposit_addresses', 'deposit_address_audit_log')
ORDER BY table_name;
```

**Expected Output:**
```
        table_name         | column_count 
---------------------------+--------------
 deposit_address_audit_log |            6
 deposit_addresses         |           14
```

### **Step 2: Verify Indexes Were Created**

```sql
-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('deposit_addresses', 'deposit_address_audit_log')
ORDER BY tablename, indexname;
```

**Expected Output:**
```
                    indexname                     |        tablename         
--------------------------------------------------+--------------------------
 deposit_addresses_pkey                           | deposit_addresses
 idx_deposit_addresses_display_order              | deposit_addresses
 idx_deposit_addresses_is_active                  | deposit_addresses
 idx_deposit_addresses_payment_method             | deposit_addresses
 deposit_address_audit_log_pkey                   | deposit_address_audit_log
 idx_deposit_address_audit_log_address_id         | deposit_address_audit_log
 idx_deposit_address_audit_log_created_at         | deposit_address_audit_log
```

### **Step 3: Verify Trigger Was Created**

```sql
-- Check trigger
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'deposit_addresses';
```

**Expected Output:**
```
          trigger_name           | event_manipulation | event_object_table 
---------------------------------+--------------------+--------------------
 update_deposit_addresses_updated_at | UPDATE             | deposit_addresses
```

### **Step 4: Verify Default Data Was Inserted**

```sql
-- Check default deposit addresses
SELECT payment_method, label, address, network, is_active, display_order
FROM deposit_addresses
ORDER BY display_order;
```

**Expected Output:**
```
 payment_method |     label      |                  address                   | network | is_active | display_order 
----------------+----------------+--------------------------------------------+---------+-----------+---------------
 bitcoin        | Bitcoin (BTC)  | 12fRdYfNvvbAgoRM3bD8rByorieo5ZqD9P         | BTC     | t         |             1
 ethereum       | Ethereum (ETH) | 0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855 | ETH     | t         |             2
 usdt           | Tether (USDT)  | 0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855 | ERC20   | t         |             3
```

### **Step 5: Verify Table Structure**

```sql
-- Check deposit_addresses columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'deposit_addresses'
ORDER BY ordinal_position;
```

### **Step 6: Test Trigger Functionality**

```sql
-- Test the updated_at trigger
UPDATE deposit_addresses 
SET label = 'Bitcoin (BTC) - Test' 
WHERE payment_method = 'bitcoin';

-- Verify updated_at changed
SELECT payment_method, label, created_at, updated_at
FROM deposit_addresses
WHERE payment_method = 'bitcoin';

-- Rollback the test change
UPDATE deposit_addresses 
SET label = 'Bitcoin (BTC)' 
WHERE payment_method = 'bitcoin';
```

---

## 🔧 How to Execute the SQL

### **Option 1: Using psql (Command Line)**

```bash
# Connect to your database
psql -U your_username -d your_database_name

# Paste the SQL script and press Enter
# Or execute from file:
\i /path/to/migration.sql
```

### **Option 2: Using pgAdmin**

1. Open pgAdmin
2. Connect to your database
3. Right-click on your database → **Query Tool**
4. Paste the SQL script
5. Click **Execute** (F5)
6. Check the **Messages** tab for success confirmation

### **Option 3: Using Database Management Tool (e.g., DBeaver, DataGrip)**

1. Open your database management tool
2. Connect to your production database
3. Open a new SQL editor
4. Paste the SQL script
5. Execute the script
6. Verify the results

### **Option 4: Using Heroku Postgres (if applicable)**

```bash
# Connect to Heroku database
heroku pg:psql -a your-app-name

# Paste the SQL script and press Enter
```

### **Option 5: Using Railway/Render/Other Cloud Providers**

Most cloud providers have a built-in SQL console:
1. Navigate to your database dashboard
2. Open the SQL console/query editor
3. Paste the SQL script
4. Execute

---

## 🚨 Troubleshooting

### **Error: "extension 'uuid-ossp' does not exist"**

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

If you don't have permission, contact your database administrator.

---

### **Error: "relation 'users' does not exist"**

**Cause:** The `users` table doesn't exist in your database.

**Solution:** This is a critical issue. The deposit addresses feature requires the `users` table. Check your database schema:

```sql
\dt users
```

If the table doesn't exist, you need to run your main database schema setup first.

---

### **Error: "duplicate key value violates unique constraint"**

**Cause:** The default addresses already exist in the table.

**Solution:** This is safe to ignore. The script uses `ON CONFLICT DO NOTHING`, so it won't insert duplicates.

---

### **Error: "permission denied"**

**Cause:** Your database user doesn't have sufficient privileges.

**Solution:** Run the script with a superuser account or grant necessary permissions:

```sql
GRANT CREATE ON DATABASE your_database TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
```

---

## 🔄 Rollback Instructions

If you need to undo this migration:

```sql
-- WARNING: This will delete all deposit addresses and audit logs!
DROP TABLE IF EXISTS deposit_address_audit_log CASCADE;
DROP TABLE IF EXISTS deposit_addresses CASCADE;
DROP FUNCTION IF EXISTS update_deposit_addresses_updated_at() CASCADE;
```

---

## ⚡ Quick Verification Command

Run this single command to verify everything:

```sql
SELECT 
    'Tables Created' AS check_type,
    COUNT(*) AS count
FROM information_schema.tables
WHERE table_name IN ('deposit_addresses', 'deposit_address_audit_log')

UNION ALL

SELECT 
    'Indexes Created' AS check_type,
    COUNT(*) AS count
FROM pg_indexes
WHERE tablename IN ('deposit_addresses', 'deposit_address_audit_log')

UNION ALL

SELECT 
    'Default Addresses' AS check_type,
    COUNT(*) AS count
FROM deposit_addresses

UNION ALL

SELECT 
    'Triggers Created' AS check_type,
    COUNT(*) AS count
FROM information_schema.triggers
WHERE event_object_table = 'deposit_addresses';
```

**Expected Output:**
```
   check_type     | count 
------------------+-------
 Tables Created   |     2
 Indexes Created  |     7
 Default Addresses|     3
 Triggers Created |     1
```

---

## 🎯 Next Steps After Migration

### **1. Update Default Addresses (CRITICAL!)**

The migration inserts **placeholder addresses**. You MUST update them with your actual wallet addresses:

```sql
-- Update Bitcoin address
UPDATE deposit_addresses 
SET address = 'YOUR_ACTUAL_BITCOIN_ADDRESS',
    updated_at = CURRENT_TIMESTAMP
WHERE payment_method = 'bitcoin';

-- Update Ethereum address
UPDATE deposit_addresses 
SET address = 'YOUR_ACTUAL_ETHEREUM_ADDRESS',
    updated_at = CURRENT_TIMESTAMP
WHERE payment_method = 'ethereum';

-- Update USDT address
UPDATE deposit_addresses 
SET address = 'YOUR_ACTUAL_USDT_ADDRESS',
    updated_at = CURRENT_TIMESTAMP
WHERE payment_method = 'usdt';
```

**Or use the admin panel:**
1. Go to `/admin/deposit-addresses`
2. Click **Edit** on each address
3. Update with your actual addresses
4. Click **Update**

### **2. Deploy Your Application**

```bash
npm run build
# Deploy to production
```

### **3. Test the Feature**

1. **Admin Panel**: Go to `/admin/deposit-addresses`
   - Verify you can view addresses
   - Test adding a new address
   - Test editing an address
   - Test toggling active/inactive

2. **User Deposit Page**: Go to `/dashboard/deposit`
   - Verify payment methods are displayed
   - Check addresses are correct
   - Test QR code generation
   - Verify min/max validation

---

## 📊 Monitoring & Maintenance

### **View All Active Addresses**

```sql
SELECT payment_method, label, address, network, min_deposit, max_deposit
FROM deposit_addresses
WHERE is_active = true
ORDER BY display_order;
```

### **View Audit Log**

```sql
SELECT 
    dal.action,
    dal.created_at,
    u.email as changed_by,
    da.label as address_label
FROM deposit_address_audit_log dal
LEFT JOIN users u ON dal.changed_by = u.id
LEFT JOIN deposit_addresses da ON dal.deposit_address_id = da.id
ORDER BY dal.created_at DESC
LIMIT 20;
```

### **Check Table Sizes**

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('deposit_addresses', 'deposit_address_audit_log')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ✅ Success Checklist

- [ ] Backed up database
- [ ] Verified UUID extension is installed
- [ ] Executed SQL script successfully
- [ ] Verified tables created (2 tables)
- [ ] Verified indexes created (7 indexes)
- [ ] Verified trigger created (1 trigger)
- [ ] Verified default data inserted (3 addresses)
- [ ] Updated default addresses with actual wallet addresses
- [ ] Tested admin panel functionality
- [ ] Tested user deposit page
- [ ] Verified audit logging works
- [ ] Deployed application to production

---

## 📞 Support

If you encounter any issues:

1. Check the **Troubleshooting** section above
2. Verify all prerequisites are met
3. Check PostgreSQL logs for detailed error messages
4. Ensure your database user has sufficient privileges

---

**Last Updated:** 2025-11-10  
**Version:** 1.0.0

