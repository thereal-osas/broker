-- ============================================================================
-- Migration: Add Deposit Addresses Management
-- Description: Create table for admin-configurable deposit addresses
-- Date: 2025-11-10
-- ============================================================================

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

-- ============================================================================
-- Rollback Instructions:
-- To rollback this migration, run:
-- DROP TABLE IF EXISTS deposit_address_audit_log CASCADE;
-- DROP TABLE IF EXISTS deposit_addresses CASCADE;
-- DROP FUNCTION IF EXISTS update_deposit_addresses_updated_at() CASCADE;
-- ============================================================================

