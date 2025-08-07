const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugLiveTradeProfit() {
  console.log('🔍 Live Trade Profit Distribution Debug Tool');
  console.log('===========================================\n');

  try {
    const client = await pool.connect();

    // 1. Check all live trades
    console.log('📊 STEP 1: All Live Trades');
    console.log('---------------------------');
    const allTradesQuery = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.amount,
        ult.status,
        ult.start_time,
        ult.end_time,
        ult.total_profit,
        ult.created_at,
        ltp.name as plan_name,
        ltp.hourly_profit_rate,
        ltp.duration_hours,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed,
        ult.start_time + INTERVAL '1 hour' * ltp.duration_hours as expected_end_time
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      ORDER BY ult.created_at DESC
      LIMIT 10
    `;

    const allTrades = await client.query(allTradesQuery);
    
    if (allTrades.rows.length === 0) {
      console.log('❌ No live trades found in database');
      client.release();
      return;
    }

    console.log(`Found ${allTrades.rows.length} live trades:`);
    allTrades.rows.forEach((trade, index) => {
      console.log(`\n${index + 1}. Live Trade ID: ${trade.id}`);
      console.log(`   Plan: ${trade.plan_name}`);
      console.log(`   Amount: $${trade.amount}`);
      console.log(`   Status: ${trade.status}`);
      console.log(`   Started: ${trade.start_time}`);
      console.log(`   Hours Elapsed: ${parseFloat(trade.hours_elapsed).toFixed(2)}`);
      console.log(`   Duration: ${trade.duration_hours} hours`);
      console.log(`   Expected End: ${trade.expected_end_time}`);
      console.log(`   Hourly Rate: ${(trade.hourly_profit_rate * 100).toFixed(2)}%`);
      console.log(`   Total Profit So Far: $${trade.total_profit}`);
    });

    // 2. Check active trades specifically
    console.log('\n\n📈 STEP 2: Active Live Trades (Eligible for Profits)');
    console.log('----------------------------------------------------');
    const activeTradesQuery = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.live_trade_plan_id,
        ult.amount,
        ult.start_time,
        ult.total_profit,
        ltp.hourly_profit_rate,
        ltp.duration_hours,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed,
        CURRENT_TIMESTAMP as current_time,
        ult.start_time + INTERVAL '1 hour' * ltp.duration_hours as expiry_time
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours > CURRENT_TIMESTAMP
    `;

    const activeTrades = await client.query(activeTradesQuery);
    
    if (activeTrades.rows.length === 0) {
      console.log('❌ No active live trades found that are eligible for profit distribution');
      console.log('   This could mean:');
      console.log('   - All trades have status other than "active"');
      console.log('   - All active trades have already expired');
      console.log('   - No live trades exist');
    } else {
      console.log(`✅ Found ${activeTrades.rows.length} active live trades eligible for profits:`);
      
      activeTrades.rows.forEach((trade, index) => {
        const hoursElapsed = parseFloat(trade.hours_elapsed);
        const eligibleHours = Math.floor(hoursElapsed);
        
        console.log(`\n${index + 1}. Active Trade ID: ${trade.id}`);
        console.log(`   Amount: $${trade.amount}`);
        console.log(`   Started: ${trade.start_time}`);
        console.log(`   Current Time: ${trade.current_time}`);
        console.log(`   Hours Elapsed: ${hoursElapsed.toFixed(2)}`);
        console.log(`   Eligible Hours: ${eligibleHours} (should get ${eligibleHours} profit payments)`);
        console.log(`   Hourly Rate: ${(trade.hourly_profit_rate * 100).toFixed(2)}%`);
        console.log(`   Expected Hourly Profit: $${(trade.amount * trade.hourly_profit_rate).toFixed(2)}`);
        console.log(`   Expires: ${trade.expiry_time}`);
      });
    }

    // 3. Check existing hourly profit distributions
    console.log('\n\n💰 STEP 3: Existing Hourly Profit Distributions');
    console.log('-----------------------------------------------');
    const profitsQuery = `
      SELECT 
        hltp.id,
        hltp.live_trade_id,
        hltp.profit_amount,
        hltp.profit_hour,
        hltp.created_at,
        ult.amount as trade_amount,
        ltp.hourly_profit_rate
      FROM hourly_live_trade_profits hltp
      JOIN user_live_trades ult ON hltp.live_trade_id = ult.id
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      ORDER BY hltp.created_at DESC
      LIMIT 20
    `;

    const existingProfits = await client.query(profitsQuery);
    
    if (existingProfits.rows.length === 0) {
      console.log('❌ No hourly profit distributions found in database');
      console.log('   This suggests profits have never been distributed');
    } else {
      console.log(`Found ${existingProfits.rows.length} recent profit distributions:`);
      existingProfits.rows.forEach((profit, index) => {
        console.log(`\n${index + 1}. Profit Distribution ID: ${profit.id}`);
        console.log(`   Live Trade ID: ${profit.live_trade_id}`);
        console.log(`   Profit Amount: $${profit.profit_amount}`);
        console.log(`   Profit Hour: ${profit.profit_hour}`);
        console.log(`   Created: ${profit.created_at}`);
        console.log(`   Trade Amount: $${profit.trade_amount}`);
        console.log(`   Rate: ${(profit.hourly_profit_rate * 100).toFixed(2)}%`);
      });
    }

    // 4. Simulate the profit distribution logic
    console.log('\n\n🧮 STEP 4: Simulating Profit Distribution Logic');
    console.log('----------------------------------------------');
    
    if (activeTrades.rows.length > 0) {
      for (const trade of activeTrades.rows) {
        console.log(`\nAnalyzing Trade ${trade.id}:`);
        
        const startTime = new Date(trade.start_time);
        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0); // Round to the hour
        
        console.log(`   Start Time: ${startTime.toISOString()}`);
        console.log(`   Current Hour (rounded): ${currentHour.toISOString()}`);
        
        const hoursElapsed = Math.floor(
          (currentHour.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        );
        
        console.log(`   Hours Elapsed (calculated): ${hoursElapsed}`);
        
        if (hoursElapsed <= 0) {
          console.log(`   ⚠️  No hours elapsed yet - no profits due`);
          continue;
        }
        
        console.log(`   Should process hours 1 through ${hoursElapsed}:`);
        
        for (let hour = 1; hour <= hoursElapsed; hour++) {
          const profitHour = new Date(
            startTime.getTime() + hour * 60 * 60 * 1000
          );
          
          console.log(`     Hour ${hour}: ${profitHour.toISOString()}`);
          
          if (profitHour <= currentHour) {
            // Check if already distributed
            const checkQuery = `
              SELECT COUNT(*) as count
              FROM hourly_live_trade_profits
              WHERE live_trade_id = $1 
              AND DATE_TRUNC('hour', profit_hour) = DATE_TRUNC('hour', $2::timestamp)
            `;
            
            const checkResult = await client.query(checkQuery, [trade.id, profitHour.toISOString()]);
            const alreadyDistributed = parseInt(checkResult.rows[0].count) > 0;
            
            if (alreadyDistributed) {
              console.log(`       ✅ Already distributed`);
            } else {
              console.log(`       🎯 SHOULD BE PROCESSED - Not yet distributed`);
              console.log(`       Expected profit: $${(trade.amount * trade.hourly_profit_rate).toFixed(2)}`);
            }
          } else {
            console.log(`       ⏰ Future hour - skip`);
          }
        }
      }
    }

    // 5. Check for any database constraints or issues
    console.log('\n\n🔧 STEP 5: Database Constraint Check');
    console.log('-----------------------------------');
    
    // Check if hourly_live_trade_profits table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hourly_live_trade_profits'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ hourly_live_trade_profits table exists');
    } else {
      console.log('❌ hourly_live_trade_profits table does NOT exist!');
      console.log('   This would prevent profit distribution from working');
    }

    client.release();
    
    console.log('\n\n📋 SUMMARY & RECOMMENDATIONS:');
    console.log('=============================');
    console.log('1. Check if any active trades were found');
    console.log('2. Verify hours elapsed calculation is correct');
    console.log('3. Confirm no existing profit distributions are blocking new ones');
    console.log('4. Check server console logs during profit distribution');
    console.log('5. Verify database table exists and is accessible');
    console.log('\nRun this script to see detailed debugging information.');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the debug function
if (require.main === module) {
  debugLiveTradeProfit().catch(console.error);
}

module.exports = debugLiveTradeProfit;
