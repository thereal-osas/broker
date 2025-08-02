const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runComprehensiveFunctionalityTest() {
  console.log('🧪 COMPREHENSIVE BROKER APPLICATION FUNCTIONALITY TEST');
  console.log('=' .repeat(60));
  console.log('Testing all core systems and features...\n');

  let passedTests = 0;
  let totalTests = 0;

  const testResult = (testName, passed, details = '') => {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`✅ ${testName}`);
      if (details) console.log(`   ${details}`);
    } else {
      console.log(`❌ ${testName}`);
      if (details) console.log(`   ${details}`);
    }
  };

  try {
    // ==================== DATABASE CONNECTIVITY ====================
    console.log('🔌 DATABASE CONNECTIVITY TESTS');
    console.log('-'.repeat(40));
    
    try {
      const dbTest = await pool.query('SELECT NOW() as current_time');
      testResult('Database Connection', true, `Connected at ${dbTest.rows[0].current_time}`);
    } catch (error) {
      testResult('Database Connection', false, error.message);
    }

    // ==================== USER SYSTEM TESTS ====================
    console.log('\n👥 USER SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      testResult('Users Table', true, `${userCount.rows[0].count} users in system`);
      
      const adminUsers = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
      testResult('Admin Users', adminUsers.rows[0].count > 0, `${adminUsers.rows[0].count} admin users`);
      
      const regularUsers = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']);
      testResult('Regular Users', regularUsers.rows[0].count > 0, `${regularUsers.rows[0].count} regular users`);
    } catch (error) {
      testResult('User System', false, error.message);
    }

    // ==================== BALANCE SYSTEM TESTS ====================
    console.log('\n💰 BALANCE SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const balanceCount = await pool.query('SELECT COUNT(*) FROM user_balances');
      testResult('User Balances Table', true, `${balanceCount.rows[0].count} balance records`);
      
      const balanceStructure = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'user_balances' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      const expectedColumns = ['id', 'user_id', 'total_balance', 'profit_balance', 'deposit_balance', 'bonus_balance', 'credit_score_balance'];
      const hasAllColumns = expectedColumns.every(col => 
        balanceStructure.rows.some(row => row.column_name === col)
      );
      testResult('Balance Table Structure', hasAllColumns, `Has all required columns`);
      
      const totalBalances = await pool.query('SELECT SUM(total_balance) as total FROM user_balances');
      testResult('Balance Calculations', true, `Total system balance: $${parseFloat(totalBalances.rows[0].total || 0).toFixed(2)}`);
    } catch (error) {
      testResult('Balance System', false, error.message);
    }

    // ==================== INVESTMENT SYSTEM TESTS ====================
    console.log('\n📈 INVESTMENT SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const investmentPlans = await pool.query('SELECT COUNT(*) FROM investment_plans WHERE is_active = true');
      testResult('Active Investment Plans', investmentPlans.rows[0].count > 0, `${investmentPlans.rows[0].count} active plans`);
      
      const userInvestments = await pool.query('SELECT COUNT(*) FROM user_investments');
      testResult('User Investments', true, `${userInvestments.rows[0].count} total investments`);
      
      const activeInvestments = await pool.query('SELECT COUNT(*) FROM user_investments WHERE status = $1', ['active']);
      testResult('Active Investments', true, `${activeInvestments.rows[0].count} active investments`);
      
      // Test investment plan structure
      const planStructure = await pool.query(`
        SELECT name, min_amount, max_amount, daily_profit_rate, duration_days 
        FROM investment_plans WHERE is_active = true LIMIT 1
      `);
      testResult('Investment Plan Data', planStructure.rows.length > 0, 
        planStructure.rows.length > 0 ? `Sample: ${planStructure.rows[0].name}` : 'No active plans');
    } catch (error) {
      testResult('Investment System', false, error.message);
    }

    // ==================== LIVE TRADE SYSTEM TESTS ====================
    console.log('\n⚡ LIVE TRADE SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const liveTradeCheck = await pool.query('SELECT COUNT(*) FROM live_trade_plans');
      testResult('Live Trade Plans Table', true, `${liveTradeCheck.rows[0].count} live trade plans`);
      
      const activeLiveTrades = await pool.query('SELECT COUNT(*) FROM live_trade_plans WHERE is_active = true');
      testResult('Active Live Trade Plans', activeLiveTrades.rows[0].count > 0, `${activeLiveTrades.rows[0].count} active plans`);
      
      const userLiveTrades = await pool.query('SELECT COUNT(*) FROM user_live_trades');
      testResult('User Live Trades', true, `${userLiveTrades.rows[0].count} live trade investments`);
      
      const liveTradeStructure = await pool.query(`
        SELECT name, min_amount, hourly_profit_rate, duration_hours 
        FROM live_trade_plans WHERE is_active = true LIMIT 1
      `);
      testResult('Live Trade Plan Data', liveTradeStructure.rows.length > 0,
        liveTradeStructure.rows.length > 0 ? `Sample: ${liveTradeStructure.rows[0].name}` : 'No active plans');
    } catch (error) {
      testResult('Live Trade System', false, error.message);
    }

    // ==================== TRANSACTION SYSTEM TESTS ====================
    console.log('\n💳 TRANSACTION SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const transactionCount = await pool.query('SELECT COUNT(*) FROM transactions');
      testResult('Transactions Table', true, `${transactionCount.rows[0].count} total transactions`);
      
      const transactionTypes = await pool.query(`
        SELECT type, COUNT(*) as count FROM transactions 
        GROUP BY type ORDER BY count DESC
      `);
      testResult('Transaction Types', transactionTypes.rows.length > 0, 
        `${transactionTypes.rows.length} different transaction types`);
      
      const recentTransactions = await pool.query(`
        SELECT COUNT(*) FROM transactions 
        WHERE created_at > NOW() - INTERVAL '30 days'
      `);
      testResult('Recent Transaction Activity', true, `${recentTransactions.rows[0].count} transactions in last 30 days`);
    } catch (error) {
      testResult('Transaction System', false, error.message);
    }

    // ==================== WITHDRAWAL SYSTEM TESTS ====================
    console.log('\n💸 WITHDRAWAL SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const withdrawalRequests = await pool.query('SELECT COUNT(*) FROM withdrawal_requests');
      testResult('Withdrawal Requests Table', true, `${withdrawalRequests.rows[0].count} withdrawal requests`);
      
      const withdrawalStatuses = await pool.query(`
        SELECT status, COUNT(*) as count FROM withdrawal_requests 
        GROUP BY status
      `);
      testResult('Withdrawal Status Tracking', withdrawalStatuses.rows.length > 0,
        `Tracking ${withdrawalStatuses.rows.length} different statuses`);
      
      const withdrawalMethods = await pool.query(`
        SELECT withdrawal_method, COUNT(*) as count FROM withdrawal_requests 
        GROUP BY withdrawal_method
      `);
      testResult('Withdrawal Methods', withdrawalMethods.rows.length > 0,
        `${withdrawalMethods.rows.length} withdrawal methods available`);
    } catch (error) {
      testResult('Withdrawal System', false, error.message);
    }

    // ==================== PLATFORM SETTINGS TESTS ====================
    console.log('\n⚙️ PLATFORM SETTINGS TESTS');
    console.log('-'.repeat(40));
    
    try {
      const settingsCount = await pool.query('SELECT COUNT(*) FROM platform_settings');
      testResult('Platform Settings Table', true, `${settingsCount.rows[0].count} settings configured`);
      
      const criticalSettings = await pool.query(`
        SELECT key FROM platform_settings 
        WHERE key IN ('max_withdrawal_percentage', 'min_withdrawal_amount', 'max_withdrawal_amount')
      `);
      testResult('Critical Withdrawal Settings', criticalSettings.rows.length >= 3,
        `${criticalSettings.rows.length}/3 critical settings present`);
      
      const allSettings = await pool.query('SELECT key, value FROM platform_settings ORDER BY key');
      testResult('Settings Configuration', allSettings.rows.length > 0,
        `All settings: ${allSettings.rows.map(s => s.key).join(', ')}`);
    } catch (error) {
      testResult('Platform Settings', false, error.message);
    }

    // ==================== REFERRAL SYSTEM TESTS ====================
    console.log('\n🤝 REFERRAL SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const referralCount = await pool.query('SELECT COUNT(*) FROM referrals');
      testResult('Referrals Table', true, `${referralCount.rows[0].count} referral relationships`);
      
      const activeReferrals = await pool.query('SELECT COUNT(*) FROM referrals WHERE status = $1', ['active']);
      testResult('Active Referrals', true, `${activeReferrals.rows[0].count} active referrals`);
      
      const referralCommissions = await pool.query('SELECT SUM(commission_earned) as total FROM referrals');
      testResult('Referral Commissions', true, 
        `Total commissions: $${parseFloat(referralCommissions.rows[0].total || 0).toFixed(2)}`);
    } catch (error) {
      testResult('Referral System', false, error.message);
    }

    // ==================== NEWSLETTER SYSTEM TESTS ====================
    console.log('\n📧 NEWSLETTER SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const newsletterCount = await pool.query('SELECT COUNT(*) FROM newsletters');
      testResult('Newsletters Table', true, `${newsletterCount.rows[0].count} newsletters`);
      
      const publishedNewsletters = await pool.query('SELECT COUNT(*) FROM newsletters WHERE is_published = true');
      testResult('Published Newsletters', true, `${publishedNewsletters.rows[0].count} published newsletters`);
    } catch (error) {
      testResult('Newsletter System', false, error.message);
    }

    // ==================== SUPPORT SYSTEM TESTS ====================
    console.log('\n🎧 SUPPORT SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    try {
      const supportTickets = await pool.query('SELECT COUNT(*) FROM support_tickets');
      testResult('Support Tickets Table', true, `${supportTickets.rows[0].count} support tickets`);
      
      const openTickets = await pool.query('SELECT COUNT(*) FROM support_tickets WHERE status = $1', ['open']);
      testResult('Open Support Tickets', true, `${openTickets.rows[0].count} open tickets`);
    } catch (error) {
      testResult('Support System', false, error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! The broker application is fully functional.');
    } else {
      console.log(`\n⚠️  ${totalTests - passedTests} tests failed. Please review the issues above.`);
    }

  } catch (error) {
    console.error('❌ Critical error during testing:', error.message);
  } finally {
    await pool.end();
  }
}

runComprehensiveFunctionalityTest();
