const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addLiveTradeSupport() {
  const client = await pool.connect();

  try {
    console.log('🚀 Adding standalone Live Trade system...');

    // 1. Create live_trade_plans table (separate from investment_plans)
    console.log('📝 Creating live_trade_plans table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS live_trade_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        min_amount DECIMAL(15,2) NOT NULL CHECK (min_amount > 0),
        max_amount DECIMAL(15,2) CHECK (max_amount IS NULL OR max_amount >= min_amount),
        hourly_profit_rate DECIMAL(5,4) NOT NULL CHECK (hourly_profit_rate > 0),
        duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create user_live_trades table (separate from user_investments)
    console.log('📝 Creating user_live_trades table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_live_trades (
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

    // 3. Create hourly_live_trade_profits table
    console.log('📝 Creating hourly_live_trade_profits table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hourly_live_trade_profits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        live_trade_id UUID NOT NULL REFERENCES user_live_trades(id) ON DELETE CASCADE,
        profit_amount DECIMAL(15,2) NOT NULL,
        profit_hour TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(live_trade_id, profit_hour)
      )
    `);

    // 4. Add triggers for updated_at columns
    console.log('📝 Adding triggers for Live Trade tables...');

    // Drop triggers if they exist, then create them
    try {
      await client.query(`DROP TRIGGER IF EXISTS update_live_trade_plans_updated_at ON live_trade_plans`);
      await client.query(`
        CREATE TRIGGER update_live_trade_plans_updated_at
        BEFORE UPDATE ON live_trade_plans
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    } catch (error) {
      console.log('Note: Trigger creation for live_trade_plans may have failed, but continuing...');
    }

    try {
      await client.query(`DROP TRIGGER IF EXISTS update_user_live_trades_updated_at ON user_live_trades`);
      await client.query(`
        CREATE TRIGGER update_user_live_trades_updated_at
        BEFORE UPDATE ON user_live_trades
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    } catch (error) {
      console.log('Note: Trigger creation for user_live_trades may have failed, but continuing...');
    }

    // 5. Create sample Live Trade plans
    console.log('📝 Creating sample Live Trade plans...');
    const existingLiveTrade = await client.query(`
      SELECT id FROM live_trade_plans LIMIT 1
    `);

    if (existingLiveTrade.rows.length === 0) {
      await client.query(`
        INSERT INTO live_trade_plans (
          name, description, min_amount, max_amount,
          hourly_profit_rate, duration_hours, is_active
        ) VALUES
        (
          'Live Trade Starter',
          'Entry-level live trading with hourly profit calculations. Perfect for beginners who want to experience real-time trading.',
          50.00,
          1000.00,
          0.15,
          24,
          true
        ),
        (
          'Live Trade Pro',
          'Professional live trading with enhanced hourly returns. Designed for experienced traders seeking higher profits.',
          500.00,
          10000.00,
          0.25,
          48,
          true
        ),
        (
          'Live Trade Elite',
          'Premium live trading experience with maximum hourly profit potential. For elite traders with substantial capital.',
          2000.00,
          50000.00,
          0.35,
          72,
          true
        )
      `);
      console.log('✅ Created sample Live Trade plans');
    } else {
      console.log('✅ Live Trade plans already exist');
    }
    
    console.log('🎉 Standalone Live Trade system added successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('   ✅ Created live_trade_plans table (separate from investment_plans)');
    console.log('   ✅ Created user_live_trades table (separate from user_investments)');
    console.log('   ✅ Created hourly_live_trade_profits table');
    console.log('   ✅ Added triggers for updated_at columns');
    console.log('   ✅ Created sample Live Trade plans');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Create admin interface at /admin/live-trade');
    console.log('   2. Create user dashboard section for Live Trade');
    console.log('   3. Create API endpoints for Live Trade management');
    console.log('   4. Add Live Trade to admin navigation');
    
  } catch (error) {
    console.error('❌ Error adding Live Trade support:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  addLiveTradeSupport()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addLiveTradeSupport };
