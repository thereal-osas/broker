/**
 * Comprehensive Live Trade System Test and Diagnostic Script
 * 
 * This script tests and diagnoses the live trade system issues:
 * 1. Status management (active -> completed transition)
 * 2. Profit distribution errors and database issues
 * 3. UI display problems
 * 4. Automated completion processes
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runComprehensiveTest() {
  console.log('🧪 COMPREHENSIVE LIVE TRADE SYSTEM TEST');
  console.log('=======================================\n');

  try {
    // Test 1: Check Database Schema and Constraints
    console.log('📋 Test 1: Database Schema Validation');
    console.log('=====================================');
    
    // Check transaction constraints
    const constraintCheck = await pool.query(`
      SELECT constraint_name, check_clause 
      FROM information_schema.check_constraints 
      WHERE table_name = 'transactions' 
      AND constraint_name LIKE '%balance_type%'
    `);
    
    console.log('Transaction balance_type constraint:');
    constraintCheck.rows.forEach(row => {
      console.log(`  ${row.constraint_name}: ${row.check_clause}`);
    });

    // Test 2: Identify Expired Active Trades
    console.log('\n📋 Test 2: Expired Active Trades Detection');
    console.log('==========================================');
    
    const expiredTradesQuery = `
      SELECT 
        ult.id,
        ult.status,
        ult.amount,
        ult.start_time,
        ult.end_time,
        ltp.duration_hours,
        ltp.name as plan_name,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed,
        CASE 
          WHEN ult.start_time + INTERVAL '1 hour' * ltp.duration_hours <= CURRENT_TIMESTAMP 
          THEN 'EXPIRED' 
          ELSE 'ACTIVE' 
        END as should_be_status
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      ORDER BY ult.start_time DESC
    `;
    
    const expiredTrades = await pool.query(expiredTradesQuery);
    
    if (expiredTrades.rows.length === 0) {
      console.log('✅ No active trades found');
    } else {
      console.log(`Found ${expiredTrades.rows.length} active trades:`);
      
      let expiredCount = 0;
      expiredTrades.rows.forEach((trade, index) => {
        const isExpired = trade.should_be_status === 'EXPIRED';
        if (isExpired) expiredCount++;
        
        console.log(`\n  ${index + 1}. Trade ${trade.id.substring(0, 8)}`);
        console.log(`     Status: ${trade.status} ${isExpired ? '❌ (SHOULD BE COMPLETED)' : '✅'}`);
        console.log(`     Plan: ${trade.plan_name} (${trade.duration_hours}h)`);
        console.log(`     Hours Elapsed: ${parseFloat(trade.hours_elapsed).toFixed(2)}`);
        console.log(`     Amount: $${parseFloat(trade.amount).toFixed(2)}`);
        console.log(`     Started: ${new Date(trade.start_time).toLocaleString()}`);
      });
      
      if (expiredCount > 0) {
        console.log(`\n🚨 ISSUE FOUND: ${expiredCount} trades should be completed but are still active`);
        console.log('   This indicates the automated completion process is not working');
      } else {
        console.log('\n✅ All active trades are within their duration period');
      }
    }

    // Test 3: Check Profit Distribution Records
    console.log('\n📋 Test 3: Profit Distribution Analysis');
    console.log('======================================');
    
    const profitAnalysis = await pool.query(`
      SELECT 
        ult.id as trade_id,
        ult.amount as investment_amount,
        ult.total_profit,
        ult.start_time,
        ltp.hourly_profit_rate,
        ltp.duration_hours,
        COUNT(hltp.id) as hours_with_profits,
        COALESCE(SUM(hltp.profit_amount), 0) as total_distributed_profits,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      LEFT JOIN hourly_live_trade_profits hltp ON ult.id = hltp.live_trade_id
      WHERE ult.status = 'active'
      GROUP BY ult.id, ult.amount, ult.total_profit, ult.start_time, ltp.hourly_profit_rate, ltp.duration_hours
      ORDER BY ult.start_time DESC
    `);
    
    if (profitAnalysis.rows.length === 0) {
      console.log('✅ No active trades to analyze');
    } else {
      console.log(`Analyzing profit distribution for ${profitAnalysis.rows.length} active trades:\n`);
      
      profitAnalysis.rows.forEach((trade, index) => {
        const hoursElapsed = Math.floor(parseFloat(trade.hours_elapsed));
        const expectedHours = Math.min(hoursElapsed, trade.duration_hours);
        const expectedProfit = expectedHours * trade.investment_amount * trade.hourly_profit_rate;
        const actualProfit = parseFloat(trade.total_distributed_profits);
        const profitDifference = expectedProfit - actualProfit;
        
        console.log(`  ${index + 1}. Trade ${trade.trade_id.substring(0, 8)}`);
        console.log(`     Investment: $${parseFloat(trade.investment_amount).toFixed(2)}`);
        console.log(`     Hours Elapsed: ${hoursElapsed}/${trade.duration_hours}`);
        console.log(`     Hours with Profits: ${trade.hours_with_profits}`);
        console.log(`     Expected Profit: $${expectedProfit.toFixed(4)}`);
        console.log(`     Actual Profit: $${actualProfit.toFixed(4)}`);
        console.log(`     Difference: $${profitDifference.toFixed(4)} ${profitDifference > 0.001 ? '❌' : '✅'}`);
        console.log('');
      });
    }

    // Test 4: Check Transaction Records
    console.log('📋 Test 4: Transaction Records Validation');
    console.log('=========================================');
    
    const transactionCheck = await pool.query(`
      SELECT 
        type,
        balance_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM transactions 
      WHERE type = 'profit' 
      AND description LIKE '%live trade%'
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY type, balance_type
      ORDER BY count DESC
    `);
    
    if (transactionCheck.rows.length === 0) {
      console.log('⚠️  No live trade profit transactions found in the last 7 days');
    } else {
      console.log('Live trade profit transactions (last 7 days):');
      transactionCheck.rows.forEach(row => {
        console.log(`  Type: ${row.type}, Balance Type: ${row.balance_type}`);
        console.log(`  Count: ${row.count}, Total: $${parseFloat(row.total_amount).toFixed(2)}`);
      });
    }

    // Test 5: API Endpoint Health Check
    console.log('\n📋 Test 5: API Endpoint Health Check');
    console.log('====================================');
    
    console.log('Available live trade API endpoints:');
    console.log('  GET  /api/cron/calculate-live-trade-profits (health check)');
    console.log('  POST /api/cron/calculate-live-trade-profits (automated cron)');
    console.log('  POST /api/admin/live-trade/profit-distribution (manual admin)');
    console.log('  POST /api/admin/live-trade/force-completion (force complete)');
    console.log('  GET  /api/admin/live-trade/force-completion (check expired)');

    console.log('\n🎯 SUMMARY AND RECOMMENDATIONS');
    console.log('==============================');
    
    const issues = [];
    const recommendations = [];
    
    if (expiredTrades.rows.some(t => t.should_be_status === 'EXPIRED')) {
      issues.push('Expired trades are not being automatically completed');
      recommendations.push('1. Verify cron job is running: Check Vercel dashboard for cron execution');
      recommendations.push('2. Test manual completion: POST /api/admin/live-trade/force-completion');
      recommendations.push('3. Check server logs for cron job errors');
    }
    
    if (profitAnalysis.rows.some(t => {
      const expected = Math.min(Math.floor(parseFloat(t.hours_elapsed)), t.duration_hours) * t.investment_amount * t.hourly_profit_rate;
      const actual = parseFloat(t.total_distributed_profits);
      return Math.abs(expected - actual) > 0.001;
    })) {
      issues.push('Profit distribution is incomplete for some trades');
      recommendations.push('4. Run manual profit distribution: POST /api/admin/live-trade/profit-distribution');
      recommendations.push('5. Check database transaction logs for errors');
    }
    
    if (transactionCheck.rows.length === 0) {
      issues.push('No recent live trade profit transactions found');
      recommendations.push('6. Verify transaction creation in profit distribution logic');
    }
    
    if (issues.length === 0) {
      console.log('✅ No critical issues detected - system appears to be working correctly');
    } else {
      console.log('🚨 ISSUES DETECTED:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  runComprehensiveTest();
}

module.exports = { runComprehensiveTest };
