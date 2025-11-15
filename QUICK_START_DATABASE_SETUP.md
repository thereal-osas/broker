# Quick Start: Database Setup for Deposit Address Management

## 🚀 **3-Step Setup Process**

---

## **Step 1: Copy the SQL Script**

Open the file: **`CREATE_DEPOSIT_TABLES.sql`**

This file contains the complete SQL script to create:
- ✅ `deposit_addresses` table (15 columns)
- ✅ `deposit_address_audit_log` table (7 columns)
- ✅ 12 indexes for optimal performance
- ✅ Foreign key constraints
- ✅ Check constraints for data validation
- ✅ Trigger for auto-updating `updated_at` timestamp
- ✅ UUID extension

---

## **Step 2: Execute in Your PostgreSQL Client**

### **Option A: Using psql (Command Line)**

```bash
# Method 1: Execute the file directly
psql -U your_username -d your_database_name -f CREATE_DEPOSIT_TABLES.sql

# Method 2: Pipe the file
cat CREATE_DEPOSIT_TABLES.sql | psql -U your_username -d your_database_name

# Method 3: Interactive mode
psql -U your_username -d your_database_name
\i CREATE_DEPOSIT_TABLES.sql
```

**Replace:**
- `your_username` with your PostgreSQL username
- `your_database_name` with your database name

---

### **Option B: Using pgAdmin**

1. Open **pgAdmin**
2. Connect to your database
3. Right-click on your database → **Query Tool**
4. Open `CREATE_DEPOSIT_TABLES.sql` or copy-paste the contents
5. Click **Execute** (F5) or the ▶️ button
6. Check the **Messages** tab for success confirmation

---

### **Option C: Using DBeaver**

1. Open **DBeaver**
2. Connect to your database
3. Right-click on your database → **SQL Editor** → **New SQL Script**
4. Copy-paste the contents of `CREATE_DEPOSIT_TABLES.sql`
5. Click **Execute SQL Statement** (Ctrl+Enter) or the ▶️ button
6. Check the **Output** panel for results

---

### **Option D: Using TablePlus**

1. Open **TablePlus**
2. Connect to your database
3. Click **Query** tab (Cmd+T or Ctrl+T)
4. Copy-paste the contents of `CREATE_DEPOSIT_TABLES.sql`
5. Click **Run Current** (Cmd+Enter or Ctrl+Enter)
6. Check results in the output panel

---

### **Option E: Using Postico (Mac)**

1. Open **Postico**
2. Connect to your database
3. Click **SQL Query** button
4. Copy-paste the contents of `CREATE_DEPOSIT_TABLES.sql`
5. Click **Execute Query**
6. Check results

---

## **Step 3: Verify Tables Were Created**

After executing the script, run this verification query:

```sql
-- Quick verification
SELECT 
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deposit_addresses'
    ) AS deposit_addresses_exists,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deposit_address_audit_log'
    ) AS audit_log_exists;
```

**Expected Result:**
```
 deposit_addresses_exists | audit_log_exists 
--------------------------+------------------
 t                        | t
```

✅ Both should show `t` (true)

---

## **Detailed Verification (Optional)**

Run these queries to verify everything was created correctly:

### **1. Check Column Count**

```sql
-- Should return 15 for deposit_addresses
SELECT COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'deposit_addresses';

-- Should return 7 for deposit_address_audit_log
SELECT COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'deposit_address_audit_log';
```

### **2. Check Indexes**

```sql
-- Should show 8 indexes on deposit_addresses
SELECT COUNT(*) AS index_count
FROM pg_indexes
WHERE tablename = 'deposit_addresses';

-- Should show 4 indexes on deposit_address_audit_log
SELECT COUNT(*) AS index_count
FROM pg_indexes
WHERE tablename = 'deposit_address_audit_log';
```

### **3. Check Trigger**

```sql
-- Should show 1 trigger
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'deposit_addresses';
```

**Expected:** `trigger_update_deposit_addresses_updated_at`

---

## **What Gets Created**

### **Table 1: `deposit_addresses`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `payment_method` | VARCHAR(50) | Payment type (bitcoin, ethereum, etc.) |
| `label` | VARCHAR(100) | Display name |
| `address` | TEXT | Wallet address/account number |
| `network` | VARCHAR(50) | Network name (optional) |
| `qr_code_url` | TEXT | QR code image URL (optional) |
| `is_active` | BOOLEAN | Active status |
| `display_order` | INTEGER | Display order |
| `min_deposit` | NUMERIC(15,2) | Minimum deposit amount |
| `max_deposit` | NUMERIC(15,2) | Maximum deposit amount (optional) |
| `instructions` | TEXT | Custom instructions (optional) |
| `created_by` | UUID | Admin who created |
| `updated_by` | UUID | Admin who last updated |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Total: 15 columns**

---

### **Table 2: `deposit_address_audit_log`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `deposit_address_id` | UUID | Reference to deposit address |
| `action` | VARCHAR(20) | Action type (created, updated, etc.) |
| `changed_by` | UUID | Admin who made the change |
| `old_value` | JSONB | Previous state (optional) |
| `new_value` | JSONB | New state (optional) |
| `created_at` | TIMESTAMP | When change occurred |

**Total: 7 columns**

---

### **Indexes Created (12 total)**

**On `deposit_addresses` (8 indexes):**
1. Primary key on `id`
2. `payment_method`
3. `is_active`
4. `display_order`
5. `created_at`
6. `updated_at`
7. `created_by`
8. `updated_by`
9. Composite: `is_active + display_order` (for active addresses)

**On `deposit_address_audit_log` (4 indexes):**
1. Primary key on `id`
2. `deposit_address_id`
3. `changed_by`
4. `created_at`
5. `action`

---

### **Constraints Created**

**Foreign Keys:**
- `deposit_addresses.created_by` → `users.id`
- `deposit_addresses.updated_by` → `users.id`
- `deposit_address_audit_log.deposit_address_id` → `deposit_addresses.id`
- `deposit_address_audit_log.changed_by` → `users.id`

**Check Constraints:**
- `min_deposit >= 0`
- `max_deposit >= 0` (if not null)
- `max_deposit >= min_deposit` (if not null)
- `display_order >= 0`
- `action IN ('created', 'updated', 'deleted', 'activated', 'deactivated')`

---

### **Trigger Created**

**Name:** `trigger_update_deposit_addresses_updated_at`

**Purpose:** Automatically updates `updated_at` timestamp when a row is modified

**Function:** `update_deposit_addresses_updated_at()`

---

## **Troubleshooting**

### **Error: "extension 'uuid-ossp' does not exist"**

**Solution:**
```sql
-- Run as superuser
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

If you don't have superuser access, ask your database administrator.

---

### **Error: "relation 'users' does not exist"**

**Cause:** The `users` table doesn't exist in your database.

**Solution:** The deposit address tables require a `users` table with an `id` column (UUID). Create the users table first, or temporarily remove the foreign key constraints.

---

### **Error: "permission denied"**

**Cause:** Your database user doesn't have CREATE TABLE permissions.

**Solution:** 
```sql
-- Run as superuser or database owner
GRANT CREATE ON SCHEMA public TO your_username;
```

---

### **Error: "table already exists"**

**Cause:** Tables were already created.

**Solution:** The script uses `CREATE TABLE IF NOT EXISTS`, so this shouldn't happen. If you want to recreate the tables:

```sql
-- Drop existing tables (WARNING: This deletes all data!)
DROP TABLE IF EXISTS deposit_address_audit_log CASCADE;
DROP TABLE IF EXISTS deposit_addresses CASCADE;

-- Then run the CREATE_DEPOSIT_TABLES.sql script again
```

---

## **Next Steps After Setup**

1. ✅ **Verify tables exist** (run verification queries above)
2. ✅ **Test deposit address creation** in admin panel
3. ✅ **Check audit logging** works correctly
4. ✅ **Test user deposit flow** on `/dashboard/deposit`

---

## **Testing the Setup**

### **1. Create a Test Deposit Address**

Login as admin and go to `/admin/deposit-addresses`, then create a test address:

```
Payment Method: bitcoin
Label: Bitcoin (BTC)
Address: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
Network: BTC Mainnet
Min Deposit: 10
Max Deposit: 50000
Active: Yes
```

### **2. Verify in Database**

```sql
-- Check if address was created
SELECT * FROM deposit_addresses ORDER BY created_at DESC LIMIT 1;

-- Check if audit log entry was created
SELECT * FROM deposit_address_audit_log ORDER BY created_at DESC LIMIT 1;
```

### **3. Test User View**

Login as a regular user and go to `/dashboard/deposit`. You should see the Bitcoin payment option.

---

## **Summary**

✅ **File to execute:** `CREATE_DEPOSIT_TABLES.sql`  
✅ **Tables created:** 2 (`deposit_addresses`, `deposit_address_audit_log`)  
✅ **Indexes created:** 12  
✅ **Constraints:** Foreign keys + Check constraints  
✅ **Trigger:** Auto-update `updated_at` timestamp  
✅ **Ready to use:** Immediately after execution

**Total execution time:** < 1 second

---

## **Support**

If you encounter any issues:

1. Check the error message carefully
2. Verify your PostgreSQL version (should be 12+)
3. Ensure you have CREATE TABLE permissions
4. Verify the `users` table exists with an `id` column (UUID)
5. Check that the `uuid-ossp` extension is available

---

**You're all set! 🎉**

After running the SQL script, your deposit address management system will be fully operational.

