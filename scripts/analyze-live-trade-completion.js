#!/usr/bin/env node

/**
 * Comprehensive Live Trade Completion System Analysis
 */

require('dotenv').config();
const { Pool } = require('pg');

async function analyzeLiveTradeCompletion() {
  console.log('🔍 Comprehensive Live Trade Completion System Analysis');
  console.log('====================================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Step 1: Check live trade table schema
    console.log('📋 Step 1: Live Trade Database Schema Analysis');
    console.log('==============================================');
    
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_live_trades' 
      ORDER BY ordinal_position
    `);
    
    console.log('user_live_trades table schema:');
    schemaCheck.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'}, nullable: ${col.is_nullable})`);
    });

    // Step 2: Analyze current live trade data
    console.log('\n📋 Step 2: Current Live Trade Data Analysis');
    console.log('==========================================');
    
    const liveTradesAnalysis = await pool.query(`
      SELECT 
        ult.id,
        ult.status,
        ult.amount,
        ult.start_time,
        ult.end_time,
        ltp.duration_hours,
        ltp.name as plan_name,
        EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 as hours_elapsed,
        CASE 
          WHEN ult.end_time IS NOT NULL THEN 'Has end_time'
          WHEN EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 > ltp.duration_hours THEN 'Should be completed'
          ELSE 'Still active'
        END as duration_status
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      ORDER BY ult.start_time DESC
      LIMIT 10
    `);
    
    console.log('Recent live trades analysis:');
    if (liveTradesAnalysis.rows.length === 0) {
      console.log('   No live trades found');
    } else {
      liveTradesAnalysis.rows.forEach(trade => {
        console.log(`   Trade ${trade.id.substring(0, 8)}:`);
        console.log(`      Status: ${trade.status}`);
        console.log(`      Plan: ${trade.plan_name} (${trade.duration_hours}h duration)`);
        console.log(`      Started: ${new Date(trade.start_time).toLocaleString()}`);
        console.log(`      Hours Elapsed: ${parseFloat(trade.hours_elapsed).toFixed(2)}`);
        console.log(`      Duration Status: ${trade.duration_status}`);
        console.log(`      End Time: ${trade.end_time ? new Date(trade.end_time).toLocaleString() : 'Not set'}`);
        console.log('');
      });
    }

    // Step 3: Check for overdue active trades
    console.log('📋 Step 3: Overdue Active Trades Detection');
    console.log('=========================================');
    
    const overdueTradesQuery = await pool.query(`
      SELECT 
        ult.id,
        ult.status,
        ult.amount,
        ult.start_time,
        ltp.duration_hours,
        ltp.name as plan_name,
        u.email as user_email,
        EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 as hours_elapsed,
        (EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600) - ltp.duration_hours as hours_overdue
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      JOIN users u ON ult.user_id = u.id
      WHERE ult.status = 'active'
        AND EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 > ltp.duration_hours
      ORDER BY hours_overdue DESC
    `);
    
    if (overdueTradesQuery.rows.length === 0) {
      console.log('✅ No overdue active trades found');
    } else {
      console.log(`❌ Found ${overdueTradesQuery.rows.length} overdue active trades:`);
      overdueTradesQuery.rows.forEach(trade => {
        console.log(`   🚨 Trade ${trade.id.substring(0, 8)} (${trade.user_email})`);
        console.log(`      Plan: ${trade.plan_name} (${trade.duration_hours}h duration)`);
        console.log(`      Hours Overdue: ${parseFloat(trade.hours_overdue).toFixed(2)}`);
        console.log(`      Amount: $${parseFloat(trade.amount).toFixed(2)}`);
        console.log('');
      });
    }

    // Step 4: Check profit distribution records
    console.log('📋 Step 4: Profit Distribution Analysis');
    console.log('======================================');
    
    const profitAnalysis = await pool.query(`
      SELECT 
        hltp.live_trade_id,
        COUNT(*) as profit_distributions,
        SUM(hltp.profit_amount) as total_profits,
        MIN(hltp.profit_hour) as first_profit,
        MAX(hltp.profit_hour) as last_profit,
        ult.status as trade_status,
        ltp.duration_hours
      FROM hourly_live_trade_profits hltp
      JOIN user_live_trades ult ON hltp.live_trade_id = ult.id
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      GROUP BY hltp.live_trade_id, ult.status, ltp.duration_hours
      ORDER BY last_profit DESC
      LIMIT 10
    `);
    
    console.log('Profit distribution patterns:');
    if (profitAnalysis.rows.length === 0) {
      console.log('   No profit distributions found');
    } else {
      profitAnalysis.rows.forEach(profit => {
        console.log(`   Trade ${profit.live_trade_id.substring(0, 8)}:`);
        console.log(`      Status: ${profit.trade_status}`);
        console.log(`      Duration: ${profit.duration_hours} hours`);
        console.log(`      Profit Distributions: ${profit.profit_distributions}`);
        console.log(`      Total Profits: $${parseFloat(profit.total_profits).toFixed(2)}`);
        console.log(`      Last Profit: ${new Date(profit.last_profit).toLocaleString()}`);
        console.log('');
      });
    }

    // Step 5: Check for automated completion processes
    console.log('📋 Step 5: Automated Process Detection');
    console.log('=====================================');
    
    // Check if there are any cron jobs or scheduled tasks
    const cronJobCheck = await pool.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename LIKE '%cron%' OR tablename LIKE '%job%' OR tablename LIKE '%schedule%'
    `);
    
    if (cronJobCheck.rows.length > 0) {
      console.log('Found potential scheduling tables:');
      cronJobCheck.rows.forEach(table => {
        console.log(`   ${table.schemaname}.${table.tablename}`);
      });
    } else {
      console.log('⚠️  No scheduling tables found - completion may be manual only');
    }

    // Step 6: Status transition analysis
    console.log('\n📋 Step 6: Status Transition Analysis');
    console.log('====================================');
    
    const statusCounts = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (NOW() - start_time)) / 3600) as avg_hours_since_start
      FROM user_live_trades
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('Live trade status distribution:');
    statusCounts.rows.forEach(status => {
      console.log(`   ${status.status}: ${status.count} trades (avg ${parseFloat(status.avg_hours_since_start).toFixed(2)}h old)`);
    });

    // Step 7: Generate recommendations
    console.log('\n🎯 ANALYSIS SUMMARY & RECOMMENDATIONS');
    console.log('====================================');
    
    const issues = [];
    const recommendations = [];
    
    if (overdueTradesQuery.rows.length > 0) {
      issues.push(`${overdueTradesQuery.rows.length} active trades are past their duration`);
      recommendations.push('Implement automated status transition for overdue trades');
      recommendations.push('Create admin interface to manually complete overdue trades');
    }
    
    if (cronJobCheck.rows.length === 0) {
      issues.push('No automated scheduling system detected');
      recommendations.push('Implement cron job or scheduled task for trade completion');
    }
    
    const hasEndTimeColumn = schemaCheck.rows.some(col => col.column_name === 'end_time');
    if (!hasEndTimeColumn) {
      issues.push('Missing end_time column for tracking completion');
      recommendations.push('Add end_time column to track when trades should complete');
    }
    
    if (issues.length === 0) {
      console.log('✅ No critical issues detected in live trade completion system');
    } else {
      console.log('❌ Issues detected:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n📋 Recommendations:');
    if (recommendations.length === 0) {
      console.log('   System appears to be functioning correctly');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Review lib/liveTradeProfit.ts for completion logic');
    console.log('2. Check if there are API endpoints for manual completion');
    console.log('3. Implement automated status transition system');
    console.log('4. Add admin controls for profit distribution management');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

analyzeLiveTradeCompletion();
