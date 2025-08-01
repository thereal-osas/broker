const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyLiveTrade() {
  try {
    console.log('🔍 Verifying Live Trade database setup...\n');
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE 'live_%' OR table_name LIKE '%live%')
      ORDER BY table_name
    `);
    
    console.log('📋 Live Trade tables found:');
    if (tablesResult.rows.length === 0) {
      console.log('❌ No Live Trade tables found!');
      return;
    }
    
    tablesResult.rows.forEach(row => {
      console.log(`✅ ${row.table_name}`);
    });
    
    // Check sample data
    const plansResult = await pool.query('SELECT id, name, min_amount, hourly_profit_rate, duration_hours, is_active FROM live_trade_plans');
    console.log('\n📊 Sample Live Trade plans:');
    if (plansResult.rows.length === 0) {
      console.log('❌ No Live Trade plans found!');
    } else {
      plansResult.rows.forEach(plan => {
        const status = plan.is_active ? '🟢 Active' : '🔴 Inactive';
        console.log(`${status} ${plan.name}:`);
        console.log(`   💰 Min: $${plan.min_amount}`);
        console.log(`   📈 Rate: ${(plan.hourly_profit_rate * 100).toFixed(2)}% hourly`);
        console.log(`   ⏱️  Duration: ${plan.duration_hours} hours`);
        console.log('');
      });
    }
    
    console.log('✅ Live Trade system verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying Live Trade setup:', error.message);
  } finally {
    await pool.end();
  }
}

verifyLiveTrade();
