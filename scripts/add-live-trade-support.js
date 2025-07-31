const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addLiveTradeSupport() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding Live Trade support to investment system...');
    
    // 1. Add plan_type column to investment_plans table
    console.log('📝 Adding plan_type column to investment_plans...');
    await client.query(`
      ALTER TABLE investment_plans 
      ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'daily' 
      CHECK (plan_type IN ('daily', 'live_trade'))
    `);
    
    // 2. Add profit_interval column to investment_plans table
    console.log('📝 Adding profit_interval column to investment_plans...');
    await client.query(`
      ALTER TABLE investment_plans 
      ADD COLUMN IF NOT EXISTS profit_interval VARCHAR(20) DEFAULT 'daily' 
      CHECK (profit_interval IN ('daily', 'hourly'))
    `);
    
    // 3. Update existing plans to be 'daily' type
    console.log('📝 Updating existing plans to daily type...');
    await client.query(`
      UPDATE investment_plans 
      SET plan_type = 'daily', profit_interval = 'daily' 
      WHERE plan_type IS NULL OR profit_interval IS NULL
    `);
    
    // 4. Create hourly profit calculations table
    console.log('📝 Creating hourly_investment_profits table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hourly_investment_profits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
        profit_amount DECIMAL(15,2) NOT NULL,
        profit_hour TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(investment_id, profit_hour)
      )
    `);
    
    // 5. Add trigger for hourly profits table
    console.log('📝 Adding trigger for hourly_investment_profits...');
    await client.query(`
      CREATE TRIGGER IF NOT EXISTS update_hourly_investment_profits_updated_at 
      BEFORE UPDATE ON hourly_investment_profits 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    // 6. Create a sample Live Trade plan
    console.log('📝 Creating sample Live Trade investment plan...');
    const existingLiveTrade = await client.query(`
      SELECT id FROM investment_plans WHERE plan_type = 'live_trade' LIMIT 1
    `);
    
    if (existingLiveTrade.rows.length === 0) {
      await client.query(`
        INSERT INTO investment_plans (
          name, description, min_amount, max_amount, 
          daily_profit_rate, duration_days, is_active,
          plan_type, profit_interval
        ) VALUES (
          'Live Trade Pro',
          'Real-time trading with hourly profit calculations. Perfect for active traders who want to see immediate returns on their investments.',
          100.00,
          10000.00,
          2.5,
          30,
          true,
          'live_trade',
          'hourly'
        )
      `);
      console.log('✅ Created sample Live Trade plan');
    } else {
      console.log('✅ Live Trade plan already exists');
    }
    
    console.log('🎉 Live Trade support added successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('   ✅ Added plan_type column to investment_plans');
    console.log('   ✅ Added profit_interval column to investment_plans');
    console.log('   ✅ Created hourly_investment_profits table');
    console.log('   ✅ Updated existing plans to daily type');
    console.log('   ✅ Created sample Live Trade plan');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Update admin interface to support Live Trade plans');
    console.log('   2. Update user dashboard to show hourly profits');
    console.log('   3. Update profit calculation cron jobs');
    
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
