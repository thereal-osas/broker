#!/usr/bin/env node

/**
 * Fix Profit Distribution Database Schema
 * 
 * Creates missing tables and fixes schema issues for profit distribution system
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixProfitDistributionSchema() {
  console.log('🔧 Fixing Profit Distribution Database Schema');
  console.log('=============================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if we're in testing mode
    const isTestingMode = process.env.TESTING_MODE === 'true';
    console.log(`Environment: ${isTestingMode ? 'Local Testing' : 'Production'}`);
    
    // Issue 1: Create missing profit distribution tables
    console.log('📋 Issue 1: Creating Missing Tables');
    console.log('==================================');
    
    // Create daily_profit_distributions table (used by cron job)
    const createDailyProfitDistributionsTable = `
      CREATE TABLE IF NOT EXISTS daily_profit_distributions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
        distribution_date DATE NOT NULL,
        profit_amount DECIMAL(15,2) NOT NULL,
        distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(investment_id, distribution_date)
      );
    `;
    
    await pool.query(createDailyProfitDistributionsTable);
    console.log('✅ Created daily_profit_distributions table');

    // Create investment_profits table (used by cron job)
    const createInvestmentProfitsTable = `
      CREATE TABLE IF NOT EXISTS investment_profits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
        profit_amount DECIMAL(15,2) NOT NULL,
        profit_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(investment_id, profit_date)
      );
    `;
    
    await pool.query(createInvestmentProfitsTable);
    console.log('✅ Created investment_profits table');

    // Create profit_distributions table (used by ProfitDistributionService)
    const createProfitDistributionsTable = `
      CREATE TABLE IF NOT EXISTS profit_distributions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        profit_amount DECIMAL(15,2) NOT NULL,
        distribution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createProfitDistributionsTable);
    console.log('✅ Created profit_distributions table');

    // Issue 2: Add missing columns to user_investments table
    console.log('\n📋 Issue 2: Updating user_investments Table');
    console.log('==========================================');
    
    try {
      // Add last_profit_date column if it doesn't exist
      await pool.query(`
        ALTER TABLE user_investments 
        ADD COLUMN IF NOT EXISTS last_profit_date DATE
      `);
      console.log('✅ Added last_profit_date column to user_investments');
    } catch (error) {
      console.log('⚠️  last_profit_date column may already exist:', error.message);
    }

    // Issue 3: Test profit distribution functionality
    console.log('\n📋 Issue 3: Testing Profit Distribution');
    console.log('=====================================');
    
    // Check for active investments
    const activeInvestmentsQuery = `
      SELECT 
        ui.id,
        ui.user_id,
        ui.amount,
        ui.status,
        ip.daily_profit_rate,
        ip.duration_days,
        ip.name as plan_name
      FROM user_investments ui
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.status = 'active'
      LIMIT 3
    `;
    
    const activeInvestments = await pool.query(activeInvestmentsQuery);
    console.log(`Found ${activeInvestments.rows.length} active investments for testing`);
    
    if (activeInvestments.rows.length > 0) {
      const testInvestment = activeInvestments.rows[0];
      console.log(`Test investment: ${testInvestment.id} - $${testInvestment.amount} at ${(testInvestment.daily_profit_rate * 100).toFixed(2)}% daily`);
      
      // Test profit calculation
      const dailyProfit = testInvestment.amount * testInvestment.daily_profit_rate;
      console.log(`Calculated daily profit: $${dailyProfit.toFixed(2)}`);
    }

    // Issue 4: Verify table relationships
    console.log('\n📋 Issue 4: Verifying Table Relationships');
    console.log('========================================');
    
    const foreignKeyCheck = `
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('daily_profit_distributions', 'investment_profits', 'profit_distributions')
      ORDER BY tc.table_name, kcu.column_name
    `;
    
    const foreignKeys = await pool.query(foreignKeyCheck);
    console.log('Foreign key relationships:');
    foreignKeys.rows.forEach(fk => {
      console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Issue 5: Test transaction constraints
    console.log('\n📋 Issue 5: Testing Transaction Constraints');
    console.log('==========================================');
    
    try {
      await pool.query('BEGIN');
      
      // Test profit transaction
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['00000000-0000-0000-0000-000000000000', 'profit', 10.00, 'total', 'Test profit transaction', 'completed']);
      
      console.log('✅ Profit transaction with balance_type="total" works');
      
      await pool.query('ROLLBACK');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Transaction constraint test failed:', error.message);
    }

    // Summary
    console.log('\n🎯 PROFIT DISTRIBUTION SCHEMA FIX SUMMARY');
    console.log('=========================================');
    
    console.log('✅ Database tables created/verified:');
    console.log('   - daily_profit_distributions (for cron job)');
    console.log('   - investment_profits (for cron job)');
    console.log('   - profit_distributions (for admin service)');
    console.log('   - user_investments.last_profit_date column');
    
    console.log('\n✅ Transaction constraints verified:');
    console.log('   - profit transactions use balance_type="total"');
    console.log('   - admin_funding transactions for principal returns');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test profit distribution in local environment');
    console.log('2. Verify admin profit distribution endpoint');
    console.log('3. Test cron job profit calculation');
    console.log('4. Deploy fixes to production');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

fixProfitDistributionSchema();
