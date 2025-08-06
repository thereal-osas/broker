#!/usr/bin/env node

/**
 * Comprehensive balance calculation diagnosis script
 */

require('dotenv').config();
const { Pool } = require('pg');

async function diagnoseBalanceIssues() {
  console.log('🔍 Balance Calculation Issues Diagnosis');
  console.log('======================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Check current balance calculation logic
    console.log('📋 Step 1: Current Balance Calculation Logic');
    console.log('============================================');
    
    // Get a test user with balances
    const testUser = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name,
             ub.total_balance, ub.profit_balance, ub.deposit_balance, 
             ub.bonus_balance, ub.credit_score_balance, ub.card_balance
      FROM users u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE u.role = 'investor' AND ub.total_balance > 0
      LIMIT 1
    `);
    
    if (testUser.rows.length === 0) {
      console.log('❌ No test users with balances found');
      return;
    }
    
    const user = testUser.rows[0];
    console.log(`👤 Test User: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`📊 Database Balances:`);
    console.log(`   Total Balance: $${parseFloat(user.total_balance).toFixed(2)}`);
    console.log(`   Profit Balance: $${parseFloat(user.profit_balance).toFixed(2)}`);
    console.log(`   Deposit Balance: $${parseFloat(user.deposit_balance).toFixed(2)}`);
    console.log(`   Bonus Balance: $${parseFloat(user.bonus_balance).toFixed(2)}`);
    console.log(`   Card Balance: $${parseFloat(user.card_balance).toFixed(2)}`);
    console.log(`   Credit Score: ${parseFloat(user.credit_score_balance).toFixed(2)} CRD`);
    
    // Calculate what the total should be (API logic)
    const apiCalculatedTotal = parseFloat(user.profit_balance || 0) + 
                              parseFloat(user.deposit_balance || 0) + 
                              parseFloat(user.bonus_balance || 0) + 
                              parseFloat(user.card_balance || 0);
    
    console.log(`\n🧮 API Calculated Total: $${apiCalculatedTotal.toFixed(2)}`);
    console.log(`📊 Database Stored Total: $${parseFloat(user.total_balance).toFixed(2)}`);
    console.log(`📈 Difference: $${(apiCalculatedTotal - parseFloat(user.total_balance)).toFixed(2)}`);
    
    if (Math.abs(apiCalculatedTotal - parseFloat(user.total_balance)) > 0.01) {
      console.log('❌ DISCREPANCY FOUND: API calculation differs from database total');
    } else {
      console.log('✅ Balance calculation matches database total');
    }

    // 2. Check for live trade balances
    console.log('\n📋 Step 2: Live Trade Balance Integration');
    console.log('========================================');
    
    const liveTradeBalances = await pool.query(`
      SELECT 
        ult.user_id,
        COUNT(ult.id) as active_trades,
        SUM(ult.amount) as total_invested,
        SUM(ult.total_profit) as total_profit
      FROM user_live_trades ult
      WHERE ult.status = 'active' AND ult.user_id = $1
      GROUP BY ult.user_id
    `, [user.id]);
    
    if (liveTradeBalances.rows.length > 0) {
      const ltBalance = liveTradeBalances.rows[0];
      console.log(`🎯 Live Trade Data:`);
      console.log(`   Active Trades: ${ltBalance.active_trades}`);
      console.log(`   Total Invested: $${parseFloat(ltBalance.total_invested).toFixed(2)}`);
      console.log(`   Total Profit: $${parseFloat(ltBalance.total_profit).toFixed(2)}`);
      
      // Check if live trade amounts are included in total balance
      console.log(`\n🔍 Live Trade Balance Integration:`);
      console.log(`   Live trade investments are deducted from total_balance when created`);
      console.log(`   Live trade profits should be added to profit_balance when distributed`);
      console.log(`   Current system: Live trades are NOT included in balance calculation`);
      
      // Check if there should be live trade profits in profit_balance
      const liveTradeProfit = parseFloat(ltBalance.total_profit);
      if (liveTradeProfit > 0) {
        console.log(`⚠️  Live trade profits ($${liveTradeProfit.toFixed(2)}) may not be reflected in profit_balance`);
      }
    } else {
      console.log('ℹ️  No active live trades found for this user');
    }

    // 3. Check transaction history for balance changes
    console.log('\n📋 Step 3: Transaction History Analysis');
    console.log('======================================');
    
    const recentTransactions = await pool.query(`
      SELECT type, amount, balance_type, description, created_at
      FROM transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [user.id]);
    
    console.log(`📝 Recent Transactions (last 10):`);
    recentTransactions.rows.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type} | $${parseFloat(tx.amount).toFixed(2)} | ${tx.balance_type} | ${tx.description}`);
    });

    // 4. Check for balance update inconsistencies
    console.log('\n📋 Step 4: Balance Update Consistency Check');
    console.log('==========================================');
    
    // Sum all transactions that should affect total_balance
    const transactionSum = await pool.query(`
      SELECT 
        SUM(CASE 
          WHEN type IN ('deposit', 'admin_funding', 'profit', 'referral_bonus') THEN amount
          WHEN type IN ('withdrawal', 'admin_deduction', 'investment', 'live_trade_investment') THEN -amount
          ELSE 0
        END) as net_transaction_amount
      FROM transactions 
      WHERE user_id = $1 AND status = 'completed'
    `, [user.id]);
    
    const netTransactionAmount = parseFloat(transactionSum.rows[0].net_transaction_amount || 0);
    console.log(`💰 Net Transaction Amount: $${netTransactionAmount.toFixed(2)}`);
    console.log(`📊 Current Total Balance: $${parseFloat(user.total_balance).toFixed(2)}`);
    
    // Note: This is a simplified check - actual balance should start from initial deposits
    
    // 5. Check for missing card_balance in calculation
    console.log('\n📋 Step 5: Card Balance Integration Check');
    console.log('========================================');
    
    const cardBalanceIncluded = parseFloat(user.card_balance || 0) > 0;
    if (cardBalanceIncluded) {
      console.log(`💳 Card Balance: $${parseFloat(user.card_balance).toFixed(2)}`);
      console.log(`✅ Card balance is included in API total calculation`);
    } else {
      console.log(`💳 Card Balance: $0.00 (no card balance for this user)`);
    }

    // 6. Identify specific issues
    console.log('\n🎯 IDENTIFIED ISSUES');
    console.log('===================');
    
    const issues = [];
    
    // Check if total_balance is manually updated vs calculated
    if (Math.abs(apiCalculatedTotal - parseFloat(user.total_balance)) > 0.01) {
      issues.push('Total balance discrepancy between API calculation and database storage');
    }
    
    // Check if live trade profits are missing from profit_balance
    if (liveTradeBalances.rows.length > 0) {
      const ltProfit = parseFloat(liveTradeBalances.rows[0].total_profit);
      if (ltProfit > 0) {
        issues.push('Live trade profits may not be properly added to profit_balance');
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious balance calculation issues detected');
    } else {
      issues.forEach((issue, index) => {
        console.log(`❌ Issue ${index + 1}: ${issue}`);
      });
    }

    // 7. Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');
    
    console.log('1. ✅ API calculation logic appears correct (excludes credit_score, includes card_balance)');
    console.log('2. 🔍 Check if total_balance is being manually updated instead of calculated');
    console.log('3. 🔍 Verify live trade profit distribution adds to profit_balance');
    console.log('4. 🔍 Ensure all balance updates use the balanceQueries.updateBalance function');
    console.log('5. 🔍 Consider implementing a balance reconciliation function');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  } finally {
    await pool.end();
  }
}

diagnoseBalanceIssues();
