#!/usr/bin/env node

/**
 * Test script for the fixed profit distribution system
 * 
 * This script helps verify that both investment and live trade
 * profit distributions are working correctly.
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function main() {
  console.log('🧪 PROFIT DISTRIBUTION SYSTEM TEST\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Check database tables
    console.log('\n📋 Test 1: Database Tables Check');
    console.log('-'.repeat(60));
    await checkDatabaseTables();
    
    // Test 2: Check active investments
    console.log('\n📋 Test 2: Active Investments Analysis');
    console.log('-'.repeat(60));
    await checkActiveInvestments();
    
    // Test 3: Check active live trades
    console.log('\n📋 Test 3: Active Live Trades Analysis');
    console.log('-'.repeat(60));
    await checkActiveLiveTrades();
    
    // Test 4: Simulate live trade distribution
    console.log('\n📋 Test 4: Live Trade Distribution Simulation');
    console.log('-'.repeat(60));
    await simulateLiveTradeDistribution();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function checkDatabaseTables() {
  const requiredTables = [
    'user_investments',
    'profit_distributions',
    'user_live_trades',
    'hourly_live_trade_profits',
    'user_balances',
    'transactions'
  ];
  
  for (const table of requiredTables) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [table]);
    
    const exists = result.rows[0].exists;
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    
    if (!exists) {
      console.log(`     ⚠️  Table missing! Create it before using the system.`);
    }
  }
}

async function checkActiveInvestments() {
  // Get active investments
  const result = await pool.query(`
    SELECT 
      ui.id,
      ui.amount,
      ip.daily_profit_rate,
      ip.duration_days,
      ui.start_date,
      ui.end_date,
      COALESCE(
        (SELECT COUNT(*) FROM profit_distributions pd 
         WHERE pd.investment_id = ui.id),
        0
      ) as distributions_count,
      COALESCE(
        (SELECT COUNT(*) FROM profit_distributions pd 
         WHERE pd.investment_id = ui.id 
         AND DATE(pd.distribution_date) = CURRENT_DATE),
        0
      ) as today_distributed
    FROM user_investments ui
    JOIN investment_plans ip ON ui.plan_id = ip.id
    WHERE ui.status = 'active'
      AND ui.end_date > NOW()
    ORDER BY ui.start_date ASC
    LIMIT 10
  `);
  
  if (result.rows.length === 0) {
    console.log('  ℹ️  No active investments found');
    return;
  }
  
  console.log(`  Found ${result.rows.length} active investments:\n`);
  
  result.rows.forEach((inv, index) => {
    const dailyProfit = inv.amount * inv.daily_profit_rate;
    const needsDistribution = inv.today_distributed === 0;
    
    console.log(`  ${index + 1}. Investment ${inv.id.substring(0, 8)}...`);
    console.log(`     Amount: $${parseFloat(inv.amount).toFixed(2)}`);
    console.log(`     Daily Rate: ${(inv.daily_profit_rate * 100).toFixed(2)}%`);
    console.log(`     Daily Profit: $${dailyProfit.toFixed(2)}`);
    console.log(`     Total Distributions: ${inv.distributions_count}`);
    console.log(`     Today's Distribution: ${inv.today_distributed > 0 ? '✅ Done' : '⏳ Pending'}`);
    console.log(`     ${needsDistribution ? '🎯 Eligible for distribution' : '⏭️  Already distributed today'}`);
    console.log('');
  });
}

async function checkActiveLiveTrades() {
  const result = await pool.query(`
    SELECT 
      ult.id,
      ult.amount,
      ltp.hourly_profit_rate,
      ltp.duration_hours,
      ult.start_time,
      ult.status,
      FLOOR(EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600) as hours_elapsed,
      COALESCE(
        (SELECT COUNT(*) FROM hourly_live_trade_profits hltp 
         WHERE hltp.live_trade_id = ult.id),
        0
      ) as hours_distributed
    FROM user_live_trades ult
    JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
    WHERE ult.status = 'active'
    ORDER BY ult.start_time ASC
    LIMIT 10
  `);
  
  if (result.rows.length === 0) {
    console.log('  ℹ️  No active live trades found');
    return;
  }
  
  console.log(`  Found ${result.rows.length} active live trades:\n`);
  
  result.rows.forEach((trade, index) => {
    const hoursElapsed = parseInt(trade.hours_elapsed);
    const hoursDistributed = parseInt(trade.hours_distributed);
    const maxHours = Math.min(hoursElapsed, trade.duration_hours);
    const missingHours = Math.max(0, maxHours - hoursDistributed);
    const hourlyProfit = trade.amount * trade.hourly_profit_rate;
    const missingProfit = missingHours * hourlyProfit;
    
    console.log(`  ${index + 1}. Live Trade ${trade.id.substring(0, 8)}...`);
    console.log(`     Amount: $${parseFloat(trade.amount).toFixed(2)}`);
    console.log(`     Hourly Rate: ${(trade.hourly_profit_rate * 100).toFixed(2)}%`);
    console.log(`     Hourly Profit: $${hourlyProfit.toFixed(2)}`);
    console.log(`     Duration: ${trade.duration_hours} hours`);
    console.log(`     Started: ${new Date(trade.start_time).toLocaleString()}`);
    console.log(`     Hours Elapsed: ${hoursElapsed}`);
    console.log(`     Hours Distributed: ${hoursDistributed}`);
    console.log(`     Missing Hours: ${missingHours}`);
    console.log(`     Missing Profit: $${missingProfit.toFixed(2)}`);
    console.log(`     ${missingHours > 0 ? '🎯 Eligible for distribution' : '✅ Fully distributed'}`);
    console.log('');
  });
}

async function simulateLiveTradeDistribution() {
  const result = await pool.query(`
    SELECT 
      ult.id,
      ult.amount,
      ltp.hourly_profit_rate,
      ltp.duration_hours,
      ult.start_time,
      FLOOR(EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600) as hours_elapsed,
      COALESCE(
        (SELECT COUNT(*) FROM hourly_live_trade_profits hltp 
         WHERE hltp.live_trade_id = ult.id),
        0
      ) as hours_distributed
    FROM user_live_trades ult
    JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
    WHERE ult.status = 'active'
      AND EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 >= 1
      AND COALESCE(
        (SELECT COUNT(*) FROM hourly_live_trade_profits hltp 
         WHERE hltp.live_trade_id = ult.id),
        0
      ) < LEAST(
        FLOOR(EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600),
        ltp.duration_hours
      )
    ORDER BY ult.start_time ASC
  `);
  
  if (result.rows.length === 0) {
    console.log('  ℹ️  No live trades need distribution at this time');
    return;
  }
  
  console.log(`  Simulation: ${result.rows.length} trades would be processed\n`);
  
  let totalHours = 0;
  let totalProfit = 0;
  
  result.rows.forEach((trade, index) => {
    const hoursElapsed = parseInt(trade.hours_elapsed);
    const hoursDistributed = parseInt(trade.hours_distributed);
    const maxHours = Math.min(hoursElapsed, trade.duration_hours);
    const hoursToDistribute = maxHours - hoursDistributed;
    const hourlyProfit = trade.amount * trade.hourly_profit_rate;
    const profitToDistribute = hoursToDistribute * hourlyProfit;
    
    totalHours += hoursToDistribute;
    totalProfit += profitToDistribute;
    
    console.log(`  ${index + 1}. Trade ${trade.id.substring(0, 8)}...`);
    console.log(`     Would distribute: ${hoursToDistribute} hours`);
    console.log(`     Profit amount: $${profitToDistribute.toFixed(2)}`);
    console.log('');
  });
  
  console.log(`  📊 Summary:`);
  console.log(`     Total trades: ${result.rows.length}`);
  console.log(`     Total hours: ${totalHours}`);
  console.log(`     Total profit: $${totalProfit.toFixed(2)}`);
}

// Run the tests
main().catch(console.error);

