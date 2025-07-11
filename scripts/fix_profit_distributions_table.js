// Script to create the missing profit_distributions table
// Run with: node scripts/fix_profit_distributions_table.js

const { Pool } = require('pg');

// Database configuration (same as in lib/db.ts)
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'broker_platform',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
};

const pool = new Pool(dbConfig);

async function createProfitDistributionsTable() {
  console.log('🔧 Creating profit_distributions table...');
  
  try {
    // Test connection first
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Enable UUID extension
    console.log('🔧 Enabling UUID extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Create profit_distributions table
    console.log('🔧 Creating profit_distributions table...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS profit_distributions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(15,2) NOT NULL,
          profit_amount DECIMAL(15,2) NOT NULL,
          distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ profit_distributions table created');

    // Create indexes
    console.log('🔧 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id ON profit_distributions(investment_id)',
      'CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id ON profit_distributions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_profit_distributions_date ON profit_distributions(distribution_date)',
      'CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_date ON profit_distributions(user_id, distribution_date)'
    ];

    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    console.log('✅ Indexes created');

    // Create unique constraint
    console.log('🔧 Creating unique constraint...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_profit_distributions_unique_daily 
      ON profit_distributions(investment_id, DATE(distribution_date))
    `);
    console.log('✅ Unique constraint created');

    // Verify table exists
    console.log('🔍 Verifying table creation...');
    const verifyQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profit_distributions'
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(verifyQuery);
    console.log('✅ Table verification:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Test the profit distribution service query
    console.log('🔍 Testing profit distribution query...');
    const testQuery = `
      SELECT 
        ui.id,
        ui.user_id,
        ui.amount,
        ui.created_at,
        ip.daily_profit_rate,
        ip.duration_days,
        COALESCE(
          (SELECT COUNT(*) FROM profit_distributions pd WHERE pd.investment_id = ui.id),
          0
        ) as days_completed
      FROM user_investments ui
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.status = 'active'
      LIMIT 5
    `;
    
    const testResult = await pool.query(testQuery);
    console.log(`✅ Query test successful - found ${testResult.rows.length} active investments`);

    console.log('\n🎉 profit_distributions table setup completed successfully!');
    console.log('📋 You can now:');
    console.log('   1. Access /admin/profit-distribution without errors');
    console.log('   2. Run profit distribution via admin panel');
    console.log('   3. Test automated profit distribution');

  } catch (error) {
    console.error('❌ Error creating profit_distributions table:', error);
    
    if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Try:');
      console.log('   1. Check your database password');
      console.log('   2. Set DB_PASSWORD environment variable');
      console.log('   3. Update password in lib/db.ts');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Try:');
      console.log('   1. Make sure PostgreSQL is running');
      console.log('   2. Check database host and port');
      console.log('   3. Verify database name exists');
    } else {
      console.log('\n💡 Database error details:', {
        code: error.code,
        message: error.message,
        detail: error.detail
      });
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
createProfitDistributionsTable();
