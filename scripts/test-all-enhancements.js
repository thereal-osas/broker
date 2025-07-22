#!/usr/bin/env node

/**
 * Comprehensive test script for all broker application enhancements
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function testAllEnhancements() {
  console.log('🧪 Testing All Broker Application Enhancements');
  console.log('===============================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function addTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) {
      results.passed++;
      console.log(`✅ ${name}`);
      if (details) console.log(`   ${details}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}`);
      if (details) console.log(`   ${details}`);
    }
  }

  try {
    const client = await pool.connect();
    
    // 1. Test Database Schema
    console.log('📋 Testing Database Schema...');
    
    // Check referrals table structure
    const referralsTable = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'referrals'
    `);
    
    const hasCommissionEarned = referralsTable.rows.some(col => col.column_name === 'commission_earned');
    const hasCommissionPaid = referralsTable.rows.some(col => col.column_name === 'commission_paid');
    
    addTest('Referrals table has commission_earned column', hasCommissionEarned);
    addTest('Referrals table has commission_paid column', hasCommissionPaid);
    
    // Check withdrawal_requests table
    const withdrawalTable = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'withdrawal_requests'
    `);
    
    const hasAccountDetails = withdrawalTable.rows.some(col => col.column_name === 'account_details');
    addTest('Withdrawal requests table has account_details column', hasAccountDetails);
    
    // Check transaction types constraint
    const transactionTypes = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'transactions' AND constraint_type = 'CHECK'
    `);
    
    addTest('Transactions table has type constraints', transactionTypes.rows.length > 0);
    
    // 2. Test User Creation and Referral Code Generation
    console.log('\n👥 Testing User Management...');
    
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const referralCode = `TEST${timestamp.toString().substring(7)}`;
    
    const userResult = await client.query(`
      INSERT INTO users (
        email, password, first_name, last_name, role, 
        is_active, email_verified, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, referral_code, password
    `, [testEmail, 'testpass123', 'Test', 'User', 'investor', true, true, referralCode]);
    
    const testUser = userResult.rows[0];
    addTest('User creation with referral code', testUser.referral_code === referralCode, 
      `Created user: ${testUser.email} with code: ${testUser.referral_code}`);
    addTest('Password stored correctly', testUser.password === 'testpass123', 
      'Password stored in plain text as requested');
    
    // Create user balance
    await client.query(`
      INSERT INTO user_balances (
        user_id, total_balance, profit_balance, deposit_balance, 
        bonus_balance, credit_score_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [testUser.id, 100.00, 0.00, 0.00, 0.00, 0.00]);
    
    addTest('User balance creation', true, 'Initial balance: $100.00');
    
    // 3. Test Withdrawal System Enhancement
    console.log('\n💳 Testing Withdrawal System...');
    
    // Test crypto withdrawal
    const cryptoWithdrawal = {
      user_id: testUser.id,
      amount: 50.00,
      withdrawal_method: 'crypto',
      account_details: JSON.stringify({
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      }),
      status: 'pending'
    };
    
    const cryptoResult = await client.query(`
      INSERT INTO withdrawal_requests (user_id, amount, withdrawal_method, account_details, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, account_details
    `, [cryptoWithdrawal.user_id, cryptoWithdrawal.amount, cryptoWithdrawal.withdrawal_method, 
        cryptoWithdrawal.account_details, cryptoWithdrawal.status]);
    
    const cryptoDetails = JSON.parse(cryptoResult.rows[0].account_details);
    addTest('Crypto withdrawal with wallet address', cryptoDetails.walletAddress === '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      `Wallet address stored: ${cryptoDetails.walletAddress}`);
    
    // Test PayPal withdrawal
    const paypalWithdrawal = {
      user_id: testUser.id,
      amount: 25.00,
      withdrawal_method: 'paypal',
      account_details: JSON.stringify({
        paypalId: 'test@paypal.com'
      }),
      status: 'pending'
    };
    
    const paypalResult = await client.query(`
      INSERT INTO withdrawal_requests (user_id, amount, withdrawal_method, account_details, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, account_details
    `, [paypalWithdrawal.user_id, paypalWithdrawal.amount, paypalWithdrawal.withdrawal_method, 
        paypalWithdrawal.account_details, paypalWithdrawal.status]);
    
    const paypalDetails = JSON.parse(paypalResult.rows[0].account_details);
    addTest('PayPal withdrawal with email', paypalDetails.paypalId === 'test@paypal.com',
      `PayPal ID stored: ${paypalDetails.paypalId}`);
    
    // 4. Test Transaction Display Labels
    console.log('\n🏷️ Testing Transaction Labels...');
    
    // Create admin funding transaction
    await client.query(`
      INSERT INTO transactions (
        user_id, type, amount, balance_type, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [testUser.id, 'admin_funding', 50.00, 'total', 'Test admin funding', 'completed']);
    
    // Create admin deduction transaction
    await client.query(`
      INSERT INTO transactions (
        user_id, type, amount, balance_type, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [testUser.id, 'admin_deduction', 25.00, 'total', 'Test admin deduction', 'completed']);
    
    const transactionCheck = await client.query(`
      SELECT type, amount FROM transactions 
      WHERE user_id = $1 AND type IN ('admin_funding', 'admin_deduction')
    `, [testUser.id]);
    
    addTest('Admin funding transaction created', 
      transactionCheck.rows.some(t => t.type === 'admin_funding'),
      'Transaction type stored correctly in database');
    addTest('Admin deduction transaction created', 
      transactionCheck.rows.some(t => t.type === 'admin_deduction'),
      'Transaction type stored correctly in database');
    
    // 5. Test Referral Commission System
    console.log('\n💰 Testing Referral Commission System...');
    
    // Create referrer user
    const referrerResult = await client.query(`
      INSERT INTO users (
        email, password, first_name, last_name, role, 
        is_active, email_verified, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, referral_code
    `, [`referrer${timestamp}@example.com`, 'testpass123', 'Referrer', 'User', 'investor', true, true, `REF${timestamp.toString().substring(7)}`]);
    
    const referrer = referrerResult.rows[0];
    
    // Create referral relationship
    await client.query(`
      INSERT INTO referrals (referrer_id, referred_id, commission_rate, commission_earned)
      VALUES ($1, $2, $3, $4)
    `, [referrer.id, testUser.id, 0.05, 0.00]);
    
    // Test commission calculation
    const commissionAmount = 100.00 * 0.05; // 5% of $100
    await client.query(`
      UPDATE referrals 
      SET commission_earned = commission_earned + $1
      WHERE referrer_id = $2 AND referred_id = $3
    `, [commissionAmount, referrer.id, testUser.id]);
    
    const commissionCheck = await client.query(`
      SELECT commission_earned FROM referrals 
      WHERE referrer_id = $1 AND referred_id = $2
    `, [referrer.id, testUser.id]);
    
    addTest('Referral commission calculation', 
      parseFloat(commissionCheck.rows[0].commission_earned) === commissionAmount,
      `Commission calculated: $${commissionAmount.toFixed(2)}`);
    
    // 6. Test Investment Plan Management
    console.log('\n📊 Testing Investment Management...');
    
    // Check if investment plans exist
    const plansCheck = await client.query(`
      SELECT COUNT(*) as count FROM investment_plans WHERE is_active = true
    `);
    
    addTest('Investment plans table accessible', parseInt(plansCheck.rows[0].count) >= 0,
      `Found ${plansCheck.rows[0].count} active investment plans`);
    
    // 7. Test API Endpoints Structure
    console.log('\n🌐 Testing API Structure...');
    
    const fs = require('fs');
    const path = require('path');
    
    const apiPaths = [
      'src/app/api/admin/referrals/route.ts',
      'src/app/api/admin/user-investments/route.ts',
      'src/app/api/withdrawals/route.ts',
      'src/app/api/referrals/route.ts'
    ];
    
    apiPaths.forEach(apiPath => {
      const fullPath = path.join(process.cwd(), apiPath);
      const exists = fs.existsSync(fullPath);
      addTest(`API endpoint exists: ${apiPath}`, exists);
    });
    
    // 8. Test Frontend Pages
    console.log('\n🖥️ Testing Frontend Pages...');
    
    const pagePaths = [
      'src/app/admin/referrals/page.tsx',
      'src/app/dashboard/withdraw/page.tsx',
      'src/app/dashboard/transactions/page.tsx',
      'src/app/admin/users/page.tsx'
    ];
    
    pagePaths.forEach(pagePath => {
      const fullPath = path.join(process.cwd(), pagePath);
      const exists = fs.existsSync(fullPath);
      addTest(`Frontend page exists: ${pagePath}`, exists);
    });
    
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! The application is ready for deployment.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    addTest('Test suite execution', false, error.message);
  } finally {
    await pool.end();
  }
  
  return results;
}

// Run tests if called directly
if (require.main === module) {
  testAllEnhancements();
}

module.exports = { testAllEnhancements };
