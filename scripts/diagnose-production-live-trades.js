#!/usr/bin/env node

/**
 * Diagnose Production Live Trade Issues
 * 
 * This script diagnoses why live trade profit distribution
 * is not working in production environment
 */

require('dotenv').config();
const { Pool } = require('pg');

async function diagnoseProductionLiveTrades() {
  console.log('🔍 Diagnosing Production Live Trade Issues');
  console.log('=========================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check 1: Verify Database Connection
    console.log('📋 Check 1: Database Connection');
    console.log('==============================');
    
    const connectionTest = await pool.query('SELECT NOW() as current_time, version()');
    console.log(`✅ Connected to database at: ${connectionTest.rows[0].current_time}`);
    console.log(`✅ Database version: ${connectionTest.rows[0].version.split(' ')[0]}`);

    // Check 2: Verify Live Trade Tables
    console.log('\n📋 Check 2: Live Trade Tables');
    console.log('============================');
    
    const tables = ['user_live_trades', 'live_trade_plans', 'hourly_live_trade_profits'];
    
    for (const table of tables) {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      console.log(`   ${table}: ${tableCheck.rows[0].exists ? '✅' : '❌'}`);
    }

    // Check 3: Current Live Trades Status
    console.log('\n📋 Check 3: Current Live Trades Status');
    console.log('====================================');
    
    const liveTradesQuery = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.amount,
        ult.status,
        ult.start_time,
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
      ORDER BY ult.start_time DESC
      LIMIT 10
    `;
    
    const liveTrades = await pool.query(liveTradesQuery);
    console.log(`Found ${liveTrades.rows.length} active live trades`);
    
    if (liveTrades.rows.length === 0) {
      console.log('⚠️  No active live trades found - this might explain "0 processed"');
    } else {
      liveTrades.rows.forEach((trade, index) => {
        const hoursElapsed = Math.floor(trade.hours_elapsed);
        const maxHours = Math.min(hoursElapsed, trade.duration_hours);
        const expectedProfit = maxHours * (trade.amount * trade.hourly_profit_rate);
        const status = trade.should_be_completed ? '🔴 EXPIRED' : '🟢 ACTIVE';
        
        console.log(`   ${index + 1}. ${trade.user_email}`);
        console.log(`      Trade ID: ${trade.id.substring(0, 8)}...`);
        console.log(`      Plan: ${trade.plan_name}`);
        console.log(`      Amount: $${trade.amount}`);
        console.log(`      Duration: ${trade.duration_hours} hours`);
        console.log(`      Hours Elapsed: ${hoursElapsed}`);
        console.log(`      Hours to Process: ${maxHours}`);
        console.log(`      Expected Profit: $${expectedProfit.toFixed(2)}`);
        console.log(`      Current Profit: $${trade.total_profit}`);
        console.log(`      Status: ${status}`);
        console.log('');
      });
    }

    // Check 4: Existing Profit Distributions
    console.log('📋 Check 4: Existing Profit Distributions');
    console.log('========================================');
    
    const profitDistributionsQuery = `
      SELECT 
        COUNT(*) as total_distributions,
        COUNT(DISTINCT live_trade_id) as unique_trades,
        SUM(profit_amount) as total_profit_distributed,
        MIN(created_at) as first_distribution,
        MAX(created_at) as last_distribution
      FROM hourly_live_trade_profits
    `;
    
    const distributions = await pool.query(profitDistributionsQuery);
    const dist = distributions.rows[0];
    
    console.log(`   Total Distributions: ${dist.total_distributions}`);
    console.log(`   Unique Trades: ${dist.unique_trades}`);
    console.log(`   Total Profit Distributed: $${dist.total_profit_distributed || 0}`);
    console.log(`   First Distribution: ${dist.first_distribution || 'None'}`);
    console.log(`   Last Distribution: ${dist.last_distribution || 'None'}`);
    
    if (dist.total_distributions == 0) {
      console.log('⚠️  No profit distributions found - confirms the issue');
    }

    // Check 5: Test Manual Distribution Query
    console.log('\n📋 Check 5: Test Manual Distribution Query');
    console.log('=========================================');
    
    const manualDistributionQuery = `
      SELECT
        ult.id,
        ult.user_id,
        ult.live_trade_plan_id,
        ult.amount,
        ult.start_time,
        ult.total_profit,
        ltp.hourly_profit_rate,
        ltp.duration_hours
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      ORDER BY ult.start_time ASC
    `;
    
    const manualTrades = await pool.query(manualDistributionQuery);
    console.log(`Manual distribution query returns: ${manualTrades.rows.length} trades`);
    
    if (manualTrades.rows.length === 0) {
      console.log('🚨 ISSUE FOUND: Manual distribution query returns 0 trades!');
      console.log('   This explains why you see "0 processed"');
    } else {
      console.log('✅ Manual distribution query working correctly');
    }

    // Check 6: Test Automated Distribution Query (for comparison)
    console.log('\n📋 Check 6: Test Automated Distribution Query');
    console.log('============================================');
    
    const automatedDistributionQuery = `
      SELECT
        ult.id,
        ult.user_id,
        ult.live_trade_plan_id,
        ult.amount,
        ult.start_time,
        ult.total_profit,
        ltp.hourly_profit_rate,
        ltp.duration_hours
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours > CURRENT_TIMESTAMP
    `;
    
    const automatedTrades = await pool.query(automatedDistributionQuery);
    console.log(`Automated distribution query returns: ${automatedTrades.rows.length} trades`);
    
    if (automatedTrades.rows.length < manualTrades.rows.length) {
      console.log('✅ Automated query filters out expired trades (as expected)');
      console.log(`   Difference: ${manualTrades.rows.length - automatedTrades.rows.length} expired trades`);
    }

    // Check 7: Simulate Profit Distribution Logic
    console.log('\n📋 Check 7: Simulate Profit Distribution Logic');
    console.log('=============================================');
    
    if (manualTrades.rows.length > 0) {
      let totalHoursToProcess = 0;
      let totalExpectedProfit = 0;
      
      for (const trade of manualTrades.rows) {
        const startTime = new Date(trade.start_time);
        const currentTime = new Date();
        const hoursElapsed = Math.floor(
          (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        );
        
        const maxHours = Math.min(hoursElapsed, trade.duration_hours);
        
        if (maxHours > 0) {
          // Check how many hours are already distributed
          const distributedQuery = `
            SELECT COUNT(*) as count
            FROM hourly_live_trade_profits
            WHERE live_trade_id = $1
          `;
          
          const distributedResult = await pool.query(distributedQuery, [trade.id]);
          const alreadyDistributed = parseInt(distributedResult.rows[0].count);
          
          const missingHours = maxHours - alreadyDistributed;
          const expectedProfit = missingHours * (trade.amount * trade.hourly_profit_rate);
          
          totalHoursToProcess += missingHours;
          totalExpectedProfit += expectedProfit;
          
          console.log(`   Trade ${trade.id.substring(0, 8)}: ${missingHours} missing hours → $${expectedProfit.toFixed(2)}`);
        }
      }
      
      console.log(`\n   Total Hours to Process: ${totalHoursToProcess}`);
      console.log(`   Total Expected Profit: $${totalExpectedProfit.toFixed(2)}`);
      
      if (totalHoursToProcess === 0) {
        console.log('🚨 ISSUE FOUND: No hours to process - all already distributed or no elapsed time');
      } else {
        console.log('✅ Hours available for processing');
      }
    }

    // Summary and Recommendations
    console.log('\n🎯 DIAGNOSIS SUMMARY');
    console.log('==================');
    
    const issues = [];
    const recommendations = [];
    
    if (liveTrades.rows.length === 0) {
      issues.push('No active live trades found');
      recommendations.push('Create a new live trade for testing');
    }
    
    if (dist.total_distributions == 0) {
      issues.push('No profit distributions have ever been created');
      recommendations.push('Check if the profit distribution function is working');
    }
    
    if (manualTrades.rows.length === 0) {
      issues.push('Manual distribution query returns 0 trades');
      recommendations.push('Check live trade status and database data');
    }
    
    console.log('\n🚨 Issues Found:');
    if (issues.length === 0) {
      console.log('   No issues detected - system should be working');
    } else {
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    if (recommendations.length === 0) {
      console.log('   System appears healthy - try manual distribution again');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. If no active trades: Create a new live trade investment');
    console.log('2. If trades exist but no processing: Check server logs during manual distribution');
    console.log('3. If still failing: Verify hosting platform has deployed latest code');
    console.log('4. Test the API endpoint directly via browser/Postman');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

diagnoseProductionLiveTrades();
