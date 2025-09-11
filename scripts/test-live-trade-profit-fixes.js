#!/usr/bin/env node

/**
 * Test Live Trade Profit Distribution Fixes
 * 
 * Tests both issues:
 * 1. Manual profit distribution for expired trades
 * 2. Live trade status completion logic
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testLiveTradeFixes() {
  console.log('🧪 Testing Live Trade Profit Distribution Fixes');
  console.log('==============================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test 1: Analyze Current Live Trade Status
    console.log('📋 Test 1: Current Live Trade Status Analysis');
    console.log('============================================');
    
    const liveTradesQuery = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.amount,
        ult.status,
        ult.start_time,
        ult.end_time,
        ult.total_profit,
        ltp.duration_hours,
        ltp.hourly_profit_rate,
        ltp.name as plan_name,
        u.email as user_email,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed,
        CASE 
          WHEN ult.start_time + INTERVAL '1 hour' * ltp.duration_hours <= CURRENT_TIMESTAMP 
          THEN true 
          ELSE false 
        END as should_be_completed
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      JOIN users u ON ult.user_id = u.id
      WHERE ult.status = 'active'
      ORDER BY ult.start_time ASC
    `;
    
    const liveTrades = await pool.query(liveTradesQuery);
    console.log(`Found ${liveTrades.rows.length} active live trades`);
    
    liveTrades.rows.forEach((trade, index) => {
      const hoursElapsed = Math.floor(trade.hours_elapsed);
      const maxHours = Math.min(hoursElapsed, trade.duration_hours);
      const expectedProfit = maxHours * (trade.amount * trade.hourly_profit_rate);
      const status = trade.should_be_completed ? '🔴 SHOULD BE COMPLETED' : '🟢 STILL ACTIVE';
      
      console.log(`   ${index + 1}. ${trade.user_email}`);
      console.log(`      Trade ID: ${trade.id.substring(0, 8)}...`);
      console.log(`      Plan: ${trade.plan_name}`);
      console.log(`      Amount: $${trade.amount}`);
      console.log(`      Duration: ${trade.duration_hours} hours`);
      console.log(`      Hours Elapsed: ${hoursElapsed}`);
      console.log(`      Hours to Process: ${maxHours}`);
      console.log(`      Expected Total Profit: $${expectedProfit.toFixed(2)}`);
      console.log(`      Current Total Profit: $${trade.total_profit}`);
      console.log(`      Status: ${status}`);
      console.log('');
    });

    // Test 2: Check Existing Profit Distributions
    console.log('📋 Test 2: Existing Profit Distribution Check');
    console.log('===========================================');
    
    const profitDistributionsQuery = `
      SELECT 
        hltp.live_trade_id,
        COUNT(*) as hours_distributed,
        SUM(hltp.profit_amount) as total_distributed,
        MIN(hltp.profit_hour) as first_hour,
        MAX(hltp.profit_hour) as last_hour
      FROM hourly_live_trade_profits hltp
      GROUP BY hltp.live_trade_id
      ORDER BY total_distributed DESC
    `;
    
    const distributions = await pool.query(profitDistributionsQuery);
    console.log(`Found profit distributions for ${distributions.rows.length} live trades`);
    
    if (distributions.rows.length === 0) {
      console.log('   ⚠️  NO PROFIT DISTRIBUTIONS FOUND - This confirms the issue!');
    } else {
      distributions.rows.forEach((dist, index) => {
        console.log(`   ${index + 1}. Trade ${dist.live_trade_id.substring(0, 8)}...`);
        console.log(`      Hours Distributed: ${dist.hours_distributed}`);
        console.log(`      Total Distributed: $${dist.total_distributed}`);
        console.log(`      First Hour: ${dist.first_hour}`);
        console.log(`      Last Hour: ${dist.last_hour}`);
      });
    }

    // Test 3: Simulate Manual Profit Distribution Logic
    console.log('\n📋 Test 3: Manual Profit Distribution Simulation');
    console.log('===============================================');
    
    if (liveTrades.rows.length > 0) {
      for (const trade of liveTrades.rows) {
        console.log(`\nSimulating distribution for trade ${trade.id.substring(0, 8)}...`);
        console.log(`  User: ${trade.user_email}`);
        console.log(`  Amount: $${trade.amount}`);
        console.log(`  Hourly Rate: ${(trade.hourly_profit_rate * 100).toFixed(4)}%`);
        
        const startTime = new Date(trade.start_time);
        const currentTime = new Date();
        const hoursElapsed = Math.floor(
          (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        );
        
        // Process up to duration_hours (not unlimited)
        const maxHours = Math.min(hoursElapsed, trade.duration_hours);
        
        console.log(`  Hours Elapsed: ${hoursElapsed}`);
        console.log(`  Max Hours to Process: ${maxHours}`);
        
        if (maxHours > 0) {
          let missingHours = 0;
          let distributedHours = 0;
          
          for (let hour = 1; hour <= maxHours; hour++) {
            const profitHour = new Date(
              startTime.getTime() + hour * 60 * 60 * 1000
            );
            
            // Check if already distributed
            const checkQuery = `
              SELECT COUNT(*) as count
              FROM hourly_live_trade_profits
              WHERE live_trade_id = $1 
              AND DATE_TRUNC('hour', profit_hour) = DATE_TRUNC('hour', $2::timestamp)
            `;
            
            const checkResult = await pool.query(checkQuery, [
              trade.id,
              profitHour.toISOString()
            ]);
            
            const alreadyDistributed = parseInt(checkResult.rows[0].count) > 0;
            
            if (alreadyDistributed) {
              distributedHours++;
            } else {
              missingHours++;
            }
          }
          
          const expectedProfit = missingHours * (trade.amount * trade.hourly_profit_rate);
          
          console.log(`  Hours Already Distributed: ${distributedHours}/${maxHours}`);
          console.log(`  Missing Hours: ${missingHours}`);
          console.log(`  Expected Profit from Missing Hours: $${expectedProfit.toFixed(2)}`);
          
          if (missingHours > 0) {
            console.log(`  🎯 MANUAL DISTRIBUTION WOULD PROCESS ${missingHours} HOURS`);
          } else {
            console.log(`  ✅ All hours already distributed`);
          }
        } else {
          console.log(`  ⏰ No hours to process yet`);
        }
      }
    }

    // Test 4: Check Trade Completion Logic
    console.log('\n📋 Test 4: Trade Completion Logic Test');
    console.log('====================================');
    
    const expiredTradesQuery = `
      SELECT 
        ult.id,
        ult.status,
        ult.start_time,
        ltp.duration_hours,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours <= CURRENT_TIMESTAMP
    `;
    
    const expiredTrades = await pool.query(expiredTradesQuery);
    console.log(`Found ${expiredTrades.rows.length} trades that should be completed`);
    
    if (expiredTrades.rows.length > 0) {
      console.log('   🔴 ISSUE CONFIRMED: These trades should be "completed" but are still "active"');
      expiredTrades.rows.forEach((trade, index) => {
        console.log(`   ${index + 1}. Trade ${trade.id.substring(0, 8)}: ${Math.floor(trade.hours_elapsed)}h elapsed (${trade.duration_hours}h duration)`);
      });
    } else {
      console.log('   ✅ No overdue active trades found');
    }

    // Summary
    console.log('\n🎯 LIVE TRADE FIXES TEST SUMMARY');
    console.log('===============================');
    
    const issues = [];
    const fixes = [];
    
    if (liveTrades.rows.length === 0) {
      issues.push('No active live trades found for testing');
    } else {
      const expiredCount = liveTrades.rows.filter(t => t.should_be_completed).length;
      if (expiredCount > 0) {
        issues.push(`${expiredCount} trades should be completed but are still active`);
        fixes.push('Manual completion API available at /api/admin/live-trade/force-completion');
      }
      
      fixes.push(`${liveTrades.rows.length} active trades ready for manual profit distribution`);
    }
    
    if (distributions.rows.length === 0) {
      issues.push('No profit distributions found - confirms the main issue');
      fixes.push('Manual distribution will process all missing hours');
    }
    
    console.log('\n🚨 Issues Identified:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log('\n✅ Fixes Available:');
    fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });
    
    console.log('\n📋 Next Steps:');
    console.log('1. 🎯 Test manual profit distribution via admin panel');
    console.log('2. 🔄 Test trade completion via force completion API');
    console.log('3. ✅ Verify user balances increase after distribution');
    console.log('4. 📊 Check hourly_live_trade_profits table for new records');
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

testLiveTradeFixes();
