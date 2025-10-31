/**
 * Create Missing Live Trade Tables
 * 
 * This script creates the missing live trade tables in the production database:
 * 1. live_trade_plans
 * 2. user_live_trades
 * 3. hourly_live_trade_profits
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createLiveTradeTables() {
  console.log('🔧 Creating Missing Live Trade Tables...\n');

  try {
    // Enable UUID extension first
    console.log('1️⃣ Enabling UUID extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('   ✅ UUID extension enabled\n');

    // Check which tables exist
    console.log('2️⃣ Checking existing tables...');
    const existingTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits')
      ORDER BY table_name
    `);
    
    const existing = existingTables.rows.map(r => r.table_name);
    console.log('   Existing tables:', existing.length > 0 ? existing.join(', ') : 'None');
    console.log('');

    // Create live_trade_plans table
    if (!existing.includes('live_trade_plans')) {
      console.log('3️⃣ Creating live_trade_plans table...');
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
        );
      `);
      console.log('   ✅ live_trade_plans table created');
    } else {
      console.log('3️⃣ live_trade_plans table already exists ✅');
    }
    console.log('');

    // Create user_live_trades table
    if (!existing.includes('user_live_trades')) {
      console.log('4️⃣ Creating user_live_trades table...');
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
        );
      `);
      console.log('   ✅ user_live_trades table created');
      
      // Create index for better query performance
      await pool.query(`
        CREATE INDEX idx_user_live_trades_user_id ON user_live_trades(user_id);
      `);
      await pool.query(`
        CREATE INDEX idx_user_live_trades_status ON user_live_trades(status);
      `);
      console.log('   ✅ Indexes created');
    } else {
      console.log('4️⃣ user_live_trades table already exists ✅');
    }
    console.log('');

    // Create hourly_live_trade_profits table
    if (!existing.includes('hourly_live_trade_profits')) {
      console.log('5️⃣ Creating hourly_live_trade_profits table...');
      await pool.query(`
        CREATE TABLE hourly_live_trade_profits (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          live_trade_id UUID NOT NULL REFERENCES user_live_trades(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          profit_amount DECIMAL(15,2) NOT NULL,
          profit_hour INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(live_trade_id, profit_hour)
        );
      `);
      console.log('   ✅ hourly_live_trade_profits table created');
      
      // Create index
      await pool.query(`
        CREATE INDEX idx_hourly_profits_live_trade_id ON hourly_live_trade_profits(live_trade_id);
      `);
      console.log('   ✅ Index created');
    } else {
      console.log('5️⃣ hourly_live_trade_profits table already exists ✅');
    }
    console.log('');

    // Verify all tables now exist
    console.log('6️⃣ Verifying all tables...');
    const verifyTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits')
      ORDER BY table_name
    `);
    
    const verified = verifyTables.rows.map(r => r.table_name);
    console.log('   Tables now in database:');
    verified.forEach(table => {
      console.log(`   ✅ ${table}`);
    });
    console.log('');

    // Check if we need to seed some test plans
    const planCount = await pool.query('SELECT COUNT(*) FROM live_trade_plans');
    const count = parseInt(planCount.rows[0].count);

    if (count === 0) {
      console.log('7️⃣ No live trade plans found. Creating sample plans...');
      
      const samplePlans = [
        {
          name: 'Quick Trade - 24 Hours',
          description: 'Short-term live trading with hourly profits for 24 hours',
          min_amount: 100,
          max_amount: 5000,
          hourly_profit_rate: 0.0042, // 0.42% per hour = ~10% per 24 hours
          duration_hours: 24
        },
        {
          name: 'Standard Trade - 48 Hours',
          description: 'Medium-term live trading with hourly profits for 48 hours',
          min_amount: 500,
          max_amount: 10000,
          hourly_profit_rate: 0.0035, // 0.35% per hour = ~16.8% per 48 hours
          duration_hours: 48
        },
        {
          name: 'Extended Trade - 72 Hours',
          description: 'Long-term live trading with hourly profits for 72 hours',
          min_amount: 1000,
          max_amount: 20000,
          hourly_profit_rate: 0.0031, // 0.31% per hour = ~22.3% per 72 hours
          duration_hours: 72
        },
        {
          name: 'Premium Trade - 168 Hours (1 Week)',
          description: 'Premium live trading with hourly profits for one full week',
          min_amount: 5000,
          max_amount: null,
          hourly_profit_rate: 0.0025, // 0.25% per hour = ~42% per week
          duration_hours: 168
        }
      ];

      for (const plan of samplePlans) {
        await pool.query(`
          INSERT INTO live_trade_plans (
            name, description, min_amount, max_amount, 
            hourly_profit_rate, duration_hours, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, true)
        `, [
          plan.name,
          plan.description,
          plan.min_amount,
          plan.max_amount,
          plan.hourly_profit_rate,
          plan.duration_hours
        ]);
        console.log(`   ✅ Created plan: ${plan.name}`);
      }
      console.log('');
    } else {
      console.log(`7️⃣ Found ${count} existing live trade plan(s) ✅\n`);
    }

    console.log('✅ SUCCESS! All live trade tables are now ready.\n');
    console.log('📊 NEXT STEPS:');
    console.log('   1. Try creating a new live trade as a test user');
    console.log('   2. Navigate to /admin/live-trade');
    console.log('   3. Click on "User Trades" tab');
    console.log('   4. The table should now display the live trade');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
createLiveTradeTables().catch(console.error);

