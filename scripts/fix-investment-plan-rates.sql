-- Fix Investment Plan Daily Profit Rates
-- This script fixes any investment plans that have incorrect daily_profit_rate values
-- (stored as percentages instead of decimals)

-- ============================================================================
-- STEP 1: BACKUP EXISTING DATA
-- ============================================================================

-- Create a backup table (optional but recommended)
CREATE TABLE IF NOT EXISTS investment_plans_backup AS 
SELECT * FROM investment_plans;

-- ============================================================================
-- STEP 2: IDENTIFY INCORRECT VALUES
-- ============================================================================

-- Check for plans with incorrect values (> 1.0 means they're stored as percentages)
SELECT 
    id,
    name,
    daily_profit_rate as current_rate,
    daily_profit_rate / 100 as corrected_rate,
    CASE 
        WHEN daily_profit_rate > 1.0 THEN 'NEEDS FIX'
        ELSE 'OK'
    END as status
FROM investment_plans
ORDER BY daily_profit_rate DESC;

-- ============================================================================
-- STEP 3: FIX INCORRECT VALUES
-- ============================================================================

-- Update plans with incorrect values (only if daily_profit_rate > 1.0)
UPDATE investment_plans 
SET 
    daily_profit_rate = daily_profit_rate / 100,
    updated_at = CURRENT_TIMESTAMP
WHERE daily_profit_rate > 1.0;

-- ============================================================================
-- STEP 4: VERIFY THE FIX
-- ============================================================================

-- Check all plans to ensure values are now correct
SELECT 
    id,
    name,
    daily_profit_rate,
    CASE 
        WHEN daily_profit_rate <= 1.0 THEN '✓ Correct'
        ELSE '✗ Still incorrect'
    END as validation
FROM investment_plans
ORDER BY daily_profit_rate DESC;

-- ============================================================================
-- STEP 5: VERIFY ACTIVE INVESTMENTS
-- ============================================================================

-- Check if any active investments are affected
SELECT 
    ui.id as investment_id,
    u.email as user_email,
    ip.name as plan_name,
    ip.daily_profit_rate,
    ui.amount as investment_amount,
    ui.total_profit,
    ui.status
FROM user_investments ui
JOIN users u ON ui.user_id = u.id
JOIN investment_plans ip ON ui.plan_id = ip.id
WHERE ui.status = 'active'
ORDER BY ip.daily_profit_rate DESC;

-- ============================================================================
-- NOTES:
-- ============================================================================

-- 1. This script should be run AFTER deploying the API fix
-- 2. The backup table is created for safety - you can drop it later
-- 3. Only plans with daily_profit_rate > 1.0 will be updated
-- 4. The updated_at timestamp will be updated for modified records
-- 5. Test in staging environment first before running in production

-- ============================================================================
-- ROLLBACK (if needed):
-- ============================================================================

-- If something goes wrong, you can restore from backup:
-- DELETE FROM investment_plans;
-- INSERT INTO investment_plans SELECT * FROM investment_plans_backup;

-- ============================================================================
-- CLEANUP (after verification):
-- ============================================================================

-- Once you've verified everything is correct, you can drop the backup:
-- DROP TABLE investment_plans_backup;

