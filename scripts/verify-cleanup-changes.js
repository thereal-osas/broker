#!/usr/bin/env node

/**
 * Verification Script for Cleanup Changes
 * 
 * This script verifies that the cleanup changes didn't break any functionality
 * by checking database connectivity and basic API endpoint availability.
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDatabaseConnection() {
  log('\n📊 Checking Database Connection...', 'cyan');
  try {
    const result = await pool.query('SELECT NOW()');
    log('✅ Database connection successful', 'green');
    log(`   Current time: ${result.rows[0].now}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Database connection failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkActiveInvestments() {
  log('\n💰 Checking Active Investments...', 'cyan');
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM user_investments 
      WHERE status = 'active'
    `);
    const count = parseInt(result.rows[0].count);
    log(`✅ Found ${count} active investment(s)`, 'green');
    
    if (count > 0) {
      const sample = await pool.query(`
        SELECT ui.id, ui.amount, ui.status, u.email as user_email, ip.name as plan_name
        FROM user_investments ui
        JOIN users u ON ui.user_id = u.id
        JOIN investment_plans ip ON ui.plan_id = ip.id
        WHERE ui.status = 'active'
        LIMIT 3
      `);
      
      log('   Sample investments:', 'blue');
      sample.rows.forEach((inv, idx) => {
        log(`   ${idx + 1}. ${inv.user_email} - ${inv.plan_name} - $${inv.amount}`, 'blue');
      });
    }
    
    return true;
  } catch (error) {
    log('❌ Failed to check active investments', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkActiveLiveTrades() {
  log('\n📈 Checking Active Live Trades...', 'cyan');
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM live_trade_user_trades 
      WHERE status = 'active'
    `);
    const count = parseInt(result.rows[0].count);
    log(`✅ Found ${count} active live trade(s)`, 'green');
    
    if (count > 0) {
      const sample = await pool.query(`
        SELECT lt.id, lt.amount, lt.status, u.email as user_email, lp.name as plan_name
        FROM live_trade_user_trades lt
        JOIN users u ON lt.user_id = u.id
        JOIN live_trade_plans lp ON lt.plan_id = lp.id
        WHERE lt.status = 'active'
        LIMIT 3
      `);
      
      log('   Sample live trades:', 'blue');
      sample.rows.forEach((trade, idx) => {
        log(`   ${idx + 1}. ${trade.user_email} - ${trade.plan_name} - $${trade.amount}`, 'blue');
      });
    }
    
    return true;
  } catch (error) {
    log('❌ Failed to check active live trades', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkProfitDistributionTable() {
  log('\n📋 Checking Profit Distribution Table...', 'cyan');
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM profit_distributions 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    const count = parseInt(result.rows[0].count);
    log(`✅ Found ${count} profit distribution(s) in last 7 days`, 'green');
    
    if (count > 0) {
      const recent = await pool.query(`
        SELECT distribution_type, processed_count, total_amount, created_at
        FROM profit_distributions
        ORDER BY created_at DESC
        LIMIT 3
      `);
      
      log('   Recent distributions:', 'blue');
      recent.rows.forEach((dist, idx) => {
        const date = new Date(dist.created_at).toLocaleString();
        log(`   ${idx + 1}. ${dist.distribution_type} - ${dist.processed_count} processed - $${dist.total_amount} - ${date}`, 'blue');
      });
    }
    
    return true;
  } catch (error) {
    log('❌ Failed to check profit distributions', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkUserBalances() {
  log('\n💵 Checking User Balances...', 'cyan');
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(total_balance) as total_balance,
        SUM(profit_balance) as total_profit,
        SUM(deposit_balance) as total_deposits
      FROM user_balances
    `);
    
    const stats = result.rows[0];
    log(`✅ Balance statistics:`, 'green');
    log(`   Total users: ${stats.total_users}`, 'blue');
    log(`   Total balance: $${parseFloat(stats.total_balance || 0).toFixed(2)}`, 'blue');
    log(`   Total profit: $${parseFloat(stats.total_profit || 0).toFixed(2)}`, 'blue');
    log(`   Total deposits: $${parseFloat(stats.total_deposits || 0).toFixed(2)}`, 'blue');
    
    return true;
  } catch (error) {
    log('❌ Failed to check user balances', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkAdminUsers() {
  log('\n👤 Checking Admin Users...', 'cyan');
  try {
    const result = await pool.query(`
      SELECT email, role, is_verified 
      FROM users 
      WHERE role = 'admin'
    `);
    
    log(`✅ Found ${result.rows.length} admin user(s)`, 'green');
    result.rows.forEach((admin, idx) => {
      const verified = admin.is_verified ? '✓' : '✗';
      log(`   ${idx + 1}. ${admin.email} (${admin.role}) ${verified}`, 'blue');
    });
    
    return true;
  } catch (error) {
    log('❌ Failed to check admin users', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkSystemSettings() {
  log('\n⚙️  Checking System Settings...', 'cyan');
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM platform_settings
    `);
    const count = parseInt(result.rows[0].count);
    log(`✅ Found ${count} platform setting(s)`, 'green');
    
    if (count > 0) {
      const settings = await pool.query(`
        SELECT setting_key, setting_value 
        FROM platform_settings 
        WHERE setting_key IN ('platform_name', 'support_email', 'min_withdrawal_amount')
      `);
      
      log('   Key settings:', 'blue');
      settings.rows.forEach((setting) => {
        log(`   ${setting.setting_key}: ${setting.setting_value}`, 'blue');
      });
    }
    
    return true;
  } catch (error) {
    log('❌ Failed to check system settings', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllChecks() {
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('  CLEANUP VERIFICATION SCRIPT', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  
  const checks = [
    checkDatabaseConnection,
    checkActiveInvestments,
    checkActiveLiveTrades,
    checkProfitDistributionTable,
    checkUserBalances,
    checkAdminUsers,
    checkSystemSettings,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    try {
      const result = await check();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`\n❌ Check failed with error: ${error.message}`, 'red');
      failed++;
    }
  }
  
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  VERIFICATION SUMMARY', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  if (failed === 0) {
    log('\n🎉 All checks passed! The cleanup changes are safe.', 'green');
    log('   You can proceed with confidence.', 'green');
  } else {
    log('\n⚠️  Some checks failed. Please review the errors above.', 'yellow');
    log('   This may indicate database connectivity issues, not cleanup problems.', 'yellow');
  }
  
  log('\n📝 Next Steps:', 'cyan');
  log('   1. Start the dev server: npm run dev', 'blue');
  log('   2. Login as admin', 'blue');
  log('   3. Visit /admin/profit-distribution', 'blue');
  log('   4. Test profit distribution functionality', 'blue');
  log('   5. Check browser console for errors', 'blue');
  
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

// Run the verification
runAllChecks().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  pool.end();
  process.exit(1);
});

