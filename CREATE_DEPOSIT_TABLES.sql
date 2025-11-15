-- ============================================================================
-- DEPOSIT ADDRESS MANAGEMENT TABLES - COMPLETE CREATION SCRIPT
-- ============================================================================
-- This script creates all necessary tables, indexes, constraints, and triggers
-- for the deposit address management system.
--
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Paste into your PostgreSQL client (psql, pgAdmin, DBeaver, etc.)
-- 3. Execute the script
-- 4. Verify tables were created successfully
--
-- REQUIREMENTS:
-- - PostgreSQL 12 or higher
-- - Existing 'users' table with 'id' column (UUID)
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================================
-- Enable UUID generation functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 2: CREATE DEPOSIT_ADDRESSES TABLE
-- ============================================================================
-- This table stores all deposit addresses/accounts for various payment methods
-- (Bitcoin, Ethereum, Bank Transfer, PayPal, etc.)

CREATE TABLE IF NOT EXISTS deposit_addresses (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Payment Method Information
    payment_method VARCHAR(50) NOT NULL,  -- e.g., 'bitcoin', 'ethereum', 'bank_transfer', 'paypal'
    label VARCHAR(100) NOT NULL,          -- Display name, e.g., 'Bitcoin (BTC)', 'Bank Account'
    address TEXT NOT NULL,                -- The actual wallet address, account number, or email
    network VARCHAR(50),                  -- Network name, e.g., 'BTC Mainnet', 'ERC-20', 'TRC-20' (nullable)
    
    -- QR Code
    qr_code_url TEXT,                     -- URL to uploaded QR code image (nullable)
    
    -- Status and Display
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Whether this address is currently active
    display_order INTEGER DEFAULT 0 NOT NULL, -- Order in which to display (lower = first)
    
    -- Deposit Limits
    min_deposit NUMERIC(15, 2) DEFAULT 10.00 NOT NULL,  -- Minimum deposit amount
    max_deposit NUMERIC(15, 2),                         -- Maximum deposit amount (nullable = no limit)
    
    -- Instructions
    instructions TEXT,                    -- Custom instructions for users (nullable)
    
    -- Audit Fields
    created_by UUID NOT NULL,             -- Admin user who created this address
    updated_by UUID NOT NULL,             -- Admin user who last updated this address
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_deposit_addresses_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_deposit_addresses_updated_by 
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Check Constraints
    CONSTRAINT chk_deposit_addresses_min_deposit_positive 
        CHECK (min_deposit >= 0),
    CONSTRAINT chk_deposit_addresses_max_deposit_positive 
        CHECK (max_deposit IS NULL OR max_deposit >= 0),
    CONSTRAINT chk_deposit_addresses_max_greater_than_min 
        CHECK (max_deposit IS NULL OR max_deposit >= min_deposit),
    CONSTRAINT chk_deposit_addresses_display_order_non_negative 
        CHECK (display_order >= 0)
);

-- ============================================================================
-- SECTION 3: CREATE DEPOSIT_ADDRESS_AUDIT_LOG TABLE
-- ============================================================================
-- This table tracks all changes made to deposit addresses for audit purposes

CREATE TABLE IF NOT EXISTS deposit_address_audit_log (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference to deposit address
    deposit_address_id UUID NOT NULL,
    
    -- Audit Information
    action VARCHAR(20) NOT NULL,          -- Type of action: 'created', 'updated', 'deleted', 'activated', 'deactivated'
    changed_by UUID NOT NULL,             -- Admin user who made the change
    old_value JSONB,                      -- Previous state (nullable for 'created' action)
    new_value JSONB,                      -- New state (nullable for 'deleted' action)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_deposit_address_audit_log_deposit_address 
        FOREIGN KEY (deposit_address_id) REFERENCES deposit_addresses(id) ON DELETE CASCADE,
    CONSTRAINT fk_deposit_address_audit_log_changed_by 
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Check Constraints
    CONSTRAINT chk_deposit_address_audit_log_action 
        CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated'))
);

-- ============================================================================
-- SECTION 4: CREATE INDEXES FOR OPTIMAL PERFORMANCE
-- ============================================================================

-- Indexes on deposit_addresses table
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_payment_method 
    ON deposit_addresses(payment_method);

CREATE INDEX IF NOT EXISTS idx_deposit_addresses_is_active 
    ON deposit_addresses(is_active);

CREATE INDEX IF NOT EXISTS idx_deposit_addresses_display_order 
    ON deposit_addresses(display_order);

CREATE INDEX IF NOT EXISTS idx_deposit_addresses_created_at 
    ON deposit_addresses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposit_addresses_updated_at 
    ON deposit_addresses(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposit_addresses_created_by 
    ON deposit_addresses(created_by);

CREATE INDEX IF NOT EXISTS idx_deposit_addresses_updated_by 
    ON deposit_addresses(updated_by);

-- Composite index for common query pattern (active addresses ordered by display_order)
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_active_display 
    ON deposit_addresses(is_active, display_order) 
    WHERE is_active = true;

-- Indexes on deposit_address_audit_log table
CREATE INDEX IF NOT EXISTS idx_deposit_address_audit_log_deposit_address_id 
    ON deposit_address_audit_log(deposit_address_id);

CREATE INDEX IF NOT EXISTS idx_deposit_address_audit_log_changed_by 
    ON deposit_address_audit_log(changed_by);

CREATE INDEX IF NOT EXISTS idx_deposit_address_audit_log_created_at 
    ON deposit_address_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposit_address_audit_log_action 
    ON deposit_address_audit_log(action);

-- ============================================================================
-- SECTION 5: CREATE TRIGGER FUNCTION FOR AUTO-UPDATING UPDATED_AT
-- ============================================================================
-- This function automatically updates the 'updated_at' timestamp whenever
-- a row in the deposit_addresses table is modified

CREATE OR REPLACE FUNCTION update_deposit_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set the updated_at column to the current timestamp
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 6: CREATE TRIGGER
-- ============================================================================
-- This trigger calls the function above before any UPDATE on deposit_addresses

-- Drop trigger if it already exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_deposit_addresses_updated_at ON deposit_addresses;

-- Create the trigger
CREATE TRIGGER trigger_update_deposit_addresses_updated_at
    BEFORE UPDATE ON deposit_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_deposit_addresses_updated_at();

-- ============================================================================
-- SECTION 7: GRANT PERMISSIONS (OPTIONAL)
-- ============================================================================
-- Uncomment these lines if you need to grant permissions to specific database users
-- Replace 'your_app_user' with your actual database user

-- GRANT SELECT, INSERT, UPDATE, DELETE ON deposit_addresses TO your_app_user;
-- GRANT SELECT, INSERT ON deposit_address_audit_log TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- SECTION 8: VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after executing the script to verify everything was created

-- Check if tables exist
SELECT 
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deposit_addresses'
    ) AS deposit_addresses_exists,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deposit_address_audit_log'
    ) AS audit_log_exists;

-- Count columns in deposit_addresses (should be 15)
SELECT COUNT(*) AS deposit_addresses_column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'deposit_addresses';

-- Count columns in deposit_address_audit_log (should be 7)
SELECT COUNT(*) AS audit_log_column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'deposit_address_audit_log';

-- List all indexes on deposit_addresses
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'deposit_addresses'
ORDER BY indexname;

-- List all indexes on deposit_address_audit_log
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'deposit_address_audit_log'
ORDER BY indexname;

-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'deposit_addresses';

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================
-- If all verification queries return expected results, the tables are ready!
--
-- Expected Results:
-- - deposit_addresses_exists: true
-- - audit_log_exists: true
-- - deposit_addresses_column_count: 15
-- - audit_log_column_count: 7
-- - 8 indexes on deposit_addresses
-- - 4 indexes on deposit_address_audit_log
-- - 1 trigger on deposit_addresses
-- ============================================================================

