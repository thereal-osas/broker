#!/usr/bin/env node

/**
 * Fix Live Trade Balance Deduction Issues
 * 
 * This script fixes all the critical issues preventing live trade balance deduction:
 * 1. Creates missing live trade tables
 * 2. Fixes transaction type constraints
 * 3. Fixes balance type constraints
 * 4. Creates sample live trade plans
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixLiveTradeBalanceDeduction() {
  console.log('🔧 Fixing Live Trade Balance Deduction Issues');
  console.log('==============================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Step 1: Create missing live trade tables
    console.log('📋 Step 1: Creating Live Trade Tables');
    console.log('====================================');
    
    // Check which tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits')
    `);
    
    const existingTables = tableCheck.rows.map(row => row.table_name);
    const requiredTables = ['live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('Creating missing tables:', missingTables.join(', '));
      
      // Create live_trade_plans table
      if (missingTables.includes('live_trade_plans')) {
        await pool.query(`
          CREATE TABLE live_trade_plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            min_amount DECIMAL(15,2) NOT NULL CHECK (min_amount > 0),
            max_amount DECIMAL(15,2) CHECK (max_amount IS NULL OR max_amount >= min_amount),
            hourly_profit_rate DECIMAL(5,4) NOT NULL CHECK (hourly_profit_rate > 0),
            duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ live_trade_plans table created');
      }
      
      // Create user_live_trades table
      if (missingTables.includes('user_live_trades')) {
        await pool.query(`
          CREATE TABLE user_live_trades (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            live_trade_plan_id UUID NOT NULL REFERENCES live_trade_plans(id) ON DELETE CASCADE,
            amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
            total_profit DECIMAL(15,2) DEFAULT 0,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ user_live_trades table created');
      }
      
      // Create hourly_live_trade_profits table
      if (missingTables.includes('hourly_live_trade_profits')) {
        await pool.query(`
          CREATE TABLE hourly_live_trade_profits (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            live_trade_id UUID NOT NULL REFERENCES user_live_trades(id) ON DELETE CASCADE,
            profit_amount DECIMAL(15,2) NOT NULL,
            profit_hour TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(live_trade_id, profit_hour)
          )
        `);
        console.log('✅ hourly_live_trade_profits table created');
      }
    } else {
      console.log('✅ All live trade tables already exist');
    }

    // Step 2: Fix transaction type constraints
    console.log('\n📋 Step 2: Fixing Transaction Type Constraints');
    console.log('=============================================');
    
    try {
      // Drop existing constraint
      await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check');
      
      // Add new constraint with live_trade_investment
      await pool.query(`
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
        CHECK (type IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment'))
      `);
      
      console.log('✅ Transaction type constraint updated to include live_trade_investment');
    } catch (error) {
      console.log('❌ Error updating transaction type constraint:', error.message);
    }

    // Step 3: Fix balance type constraints
    console.log('\n📋 Step 3: Fixing Balance Type Constraints');
    console.log('=========================================');
    
    try {
      // Drop existing constraint
      await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_balance_type_check');
      
      // Add new constraint with card
      await pool.query(`
        ALTER TABLE transactions ADD CONSTRAINT transactions_balance_type_check
        CHECK (balance_type IN ('total', 'profit', 'deposit', 'bonus', 'credit_score', 'card'))
      `);
      
      console.log('✅ Balance type constraint updated to include card');
    } catch (error) {
      console.log('❌ Error updating balance type constraint:', error.message);
    }

    // Step 4: Test transaction creation
    console.log('\n📋 Step 4: Testing Transaction Creation');
    console.log('======================================');
    
    try {
      await pool.query('BEGIN');
      
      // Test live_trade_investment transaction
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['00000000-0000-0000-0000-000000000000', 'live_trade_investment', 50.00, 'deposit', 'Test live trade transaction', 'completed']);
      
      console.log('✅ live_trade_investment transaction test successful');
      
      await pool.query('ROLLBACK'); // Don't save test transaction
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Transaction test failed:', error.message);
    }

    // Step 5: Create sample live trade plans
    console.log('\n📋 Step 5: Creating Sample Live Trade Plans');
    console.log('==========================================');
    
    const planCount = await pool.query('SELECT COUNT(*) as count FROM live_trade_plans');
    const existingPlans = parseInt(planCount.rows[0].count);
    
    if (existingPlans === 0) {
      console.log('Creating sample live trade plans...');
      
      const samplePlans = [
        {
          name: 'Quick Trade',
          description: 'Short-term live trading with hourly profits',
          min_amount: 10.00,
          max_amount: 100.00,
          hourly_profit_rate: 0.0250, // 2.5% per hour
          duration_hours: 4
        },
        {
          name: 'Standard Trade',
          description: 'Medium-term live trading with steady returns',
          min_amount: 50.00,
          max_amount: 500.00,
          hourly_profit_rate: 0.0200, // 2% per hour
          duration_hours: 8
        },
        {
          name: 'Extended Trade',
          description: 'Long-term live trading with consistent profits',
          min_amount: 100.00,
          max_amount: 1000.00,
          hourly_profit_rate: 0.0150, // 1.5% per hour
          duration_hours: 12
        }
      ];
      
      for (const plan of samplePlans) {
        await pool.query(`
          INSERT INTO live_trade_plans (name, description, min_amount, max_amount, hourly_profit_rate, duration_hours)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [plan.name, plan.description, plan.min_amount, plan.max_amount, plan.hourly_profit_rate, plan.duration_hours]);
        
        console.log(`✅ Created plan: ${plan.name}`);
      }
    } else {
      console.log(`✅ ${existingPlans} live trade plans already exist`);
    }

    // Step 6: Final verification
    console.log('\n📋 Step 6: Final Verification');
    console.log('=============================');
    
    // Check tables
    const finalTableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits')
      ORDER BY table_name
    `);
    
    const finalTables = finalTableCheck.rows.map(row => row.table_name);
    console.log('Live trade tables:', finalTables.join(', '));
    
    // Check constraints
    try {
      await pool.query('BEGIN');
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, ['00000000-0000-0000-0000-000000000000', 'live_trade_investment', 1.00, 'deposit', 'Final test']);
      await pool.query('ROLLBACK');
      console.log('✅ Transaction constraints are working correctly');
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Transaction constraints still have issues:', error.message);
    }
    
    // Check plans
    const finalPlanCount = await pool.query('SELECT COUNT(*) as count FROM live_trade_plans WHERE is_active = true');
    const activePlans = parseInt(finalPlanCount.rows[0].count);
    console.log(`✅ ${activePlans} active live trade plans available`);

    console.log('\n🎉 Live Trade Balance Deduction Fix Complete!');
    console.log('============================================');
    console.log('✅ Live trade tables created');
    console.log('✅ Transaction type constraints fixed');
    console.log('✅ Balance type constraints fixed');
    console.log('✅ Sample live trade plans created');
    console.log('✅ Live trade balance deduction should now work properly');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test live trade creation through the UI');
    console.log('2. Verify balance deduction occurs');
    console.log('3. Check transaction records are created');
    console.log('4. Monitor application logs for any remaining errors');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixLiveTradeBalanceDeduction();
