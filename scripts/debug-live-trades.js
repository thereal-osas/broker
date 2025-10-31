/**
 * Debug Script: Live Trades Data Investigation
 * 
 * This script checks:
 * 1. If user_live_trades table exists
 * 2. What data is in the user_live_trades table
 * 3. What data is in the live_trade_plans table
 * 4. If there are any JOIN issues
 * 5. What the actual SQL query returns
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debugLiveTrades() {
  console.log('🔍 Starting Live Trades Debug Investigation...\n');

  try {
    // 1. Check if user_live_trades table exists
    console.log('1️⃣ Checking if user_live_trades table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_live_trades'
      );
    `);
    console.log('   Table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('   ❌ ERROR: user_live_trades table does not exist!');
      return;
    }
    console.log('   ✅ Table exists\n');

    // 2. Check table schema
    console.log('2️⃣ Checking user_live_trades table schema...');
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_live_trades'
      ORDER BY ordinal_position;
    `);
    console.log('   Columns:');
    schemaCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('');

    // 3. Count total records in user_live_trades
    console.log('3️⃣ Counting records in user_live_trades...');
    const countResult = await pool.query('SELECT COUNT(*) FROM user_live_trades');
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`   Total records: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('   ⚠️  WARNING: No records found in user_live_trades table!');
      console.log('   This explains why the table is empty.\n');
    } else {
      console.log('   ✅ Records found\n');
    }

    // 4. Show all records in user_live_trades
    console.log('4️⃣ Fetching all records from user_live_trades...');
    const allTrades = await pool.query(`
      SELECT 
        id,
        user_id,
        live_trade_plan_id,
        amount,
        status,
        total_profit,
        start_time,
        end_time,
        created_at
      FROM user_live_trades
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (allTrades.rows.length === 0) {
      console.log('   ❌ No live trades found in database!');
      console.log('   The table is empty - no trades have been created.\n');
    } else {
      console.log(`   Found ${allTrades.rows.length} live trade(s):`);
      allTrades.rows.forEach((trade, index) => {
        console.log(`\n   Trade #${index + 1}:`);
        console.log(`   - ID: ${trade.id}`);
        console.log(`   - User ID: ${trade.user_id}`);
        console.log(`   - Plan ID: ${trade.live_trade_plan_id}`);
        console.log(`   - Amount: $${trade.amount}`);
        console.log(`   - Status: ${trade.status}`);
        console.log(`   - Total Profit: $${trade.total_profit}`);
        console.log(`   - Start Time: ${trade.start_time}`);
        console.log(`   - End Time: ${trade.end_time || 'N/A'}`);
        console.log(`   - Created At: ${trade.created_at}`);
      });
      console.log('');
    }

    // 5. Check live_trade_plans table
    console.log('5️⃣ Checking live_trade_plans table...');
    const plansCount = await pool.query('SELECT COUNT(*) FROM live_trade_plans');
    console.log(`   Total plans: ${plansCount.rows[0].count}`);
    
    const activePlans = await pool.query(`
      SELECT id, name, is_active, hourly_profit_rate, duration_hours
      FROM live_trade_plans
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    console.log(`   Active plans: ${activePlans.rows.length}`);
    
    if (activePlans.rows.length > 0) {
      activePlans.rows.forEach((plan, index) => {
        console.log(`   Plan #${index + 1}: ${plan.name} (ID: ${plan.id})`);
        console.log(`     - Rate: ${plan.hourly_profit_rate}, Duration: ${plan.duration_hours}h`);
      });
    }
    console.log('');

    // 6. Test the actual SQL query used by the API
    console.log('6️⃣ Testing the actual API SQL query...');
    const apiQuery = `
      SELECT
        ult.*,
        ltp.hourly_profit_rate,
        ltp.duration_hours,
        EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 as hours_elapsed,
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 >= ltp.duration_hours THEN true
          ELSE false
        END as is_expired,
        COALESCE(
          (SELECT SUM(profit_amount) FROM hourly_live_trade_profits
           WHERE live_trade_id = ult.id),
          0
        ) as total_profits_earned
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      ORDER BY ult.start_time DESC
    `;
    
    try {
      const apiResult = await pool.query(apiQuery);
      console.log(`   ✅ Query executed successfully`);
      console.log(`   Rows returned: ${apiResult.rows.length}`);
      
      if (apiResult.rows.length === 0) {
        console.log('   ⚠️  Query returned 0 rows!');
        console.log('   This means either:');
        console.log('   - No trades exist in user_live_trades table, OR');
        console.log('   - The JOIN with live_trade_plans is failing');
        console.log('');
        
        // Check for orphaned trades (trades without matching plans)
        console.log('   Checking for orphaned trades (trades without matching plans)...');
        const orphanCheck = await pool.query(`
          SELECT ult.id, ult.live_trade_plan_id
          FROM user_live_trades ult
          LEFT JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
          WHERE ltp.id IS NULL
        `);
        
        if (orphanCheck.rows.length > 0) {
          console.log(`   ❌ Found ${orphanCheck.rows.length} orphaned trade(s)!`);
          console.log('   These trades reference non-existent plans:');
          orphanCheck.rows.forEach(trade => {
            console.log(`   - Trade ID: ${trade.id}, Plan ID: ${trade.live_trade_plan_id}`);
          });
        } else {
          console.log('   ✅ No orphaned trades found');
        }
      } else {
        console.log('   ✅ Query returned data:');
        apiResult.rows.forEach((trade, index) => {
          console.log(`\n   Result #${index + 1}:`);
          console.log(`   - ID: ${trade.id}`);
          console.log(`   - User ID: ${trade.user_id}`);
          console.log(`   - Amount: $${trade.amount}`);
          console.log(`   - Status: ${trade.status}`);
          console.log(`   - Hours Elapsed: ${parseFloat(trade.hours_elapsed).toFixed(2)}`);
          console.log(`   - Is Expired: ${trade.is_expired}`);
          console.log(`   - Total Profits Earned: $${trade.total_profits_earned}`);
        });
      }
    } catch (queryError) {
      console.log('   ❌ Query failed!');
      console.log('   Error:', queryError.message);
    }
    console.log('');

    // 7. Check users table for the trades
    if (allTrades.rows.length > 0) {
      console.log('7️⃣ Checking if users exist for the trades...');
      const userIds = allTrades.rows.map(t => t.user_id);
      const usersCheck = await pool.query(`
        SELECT id, email, first_name, last_name
        FROM users
        WHERE id = ANY($1::uuid[])
      `, [userIds]);
      
      console.log(`   Found ${usersCheck.rows.length} user(s) for ${userIds.length} trade(s)`);
      usersCheck.rows.forEach(user => {
        console.log(`   - ${user.first_name} ${user.last_name} (${user.email})`);
      });
      console.log('');
    }

    // 8. Summary
    console.log('📊 SUMMARY:');
    console.log('─'.repeat(60));
    console.log(`Total live trades in database: ${totalCount}`);
    console.log(`Total active plans: ${activePlans.rows.length}`);
    
    if (totalCount === 0) {
      console.log('\n❌ ROOT CAUSE: No live trades exist in the database!');
      console.log('   The user_live_trades table is empty.');
      console.log('   This is why the admin page shows 0 trades.');
      console.log('\n💡 SOLUTION:');
      console.log('   1. Create a live trade as a test user');
      console.log('   2. Check if the trade creation API is working');
      console.log('   3. Verify the trade is being inserted into user_live_trades table');
    } else {
      console.log('\n✅ Live trades exist in database');
      console.log('   If the admin page still shows 0 trades, check:');
      console.log('   1. API endpoint response format');
      console.log('   2. Frontend data parsing');
      console.log('   3. Browser console for errors');
    }
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error during debug:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugLiveTrades().catch(console.error);

