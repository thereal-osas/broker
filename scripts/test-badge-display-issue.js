#!/usr/bin/env node

/**
 * Test script to investigate badge display issue
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testBadgeDisplayIssue() {
  console.log('🔍 Testing Badge Display Issue');
  console.log('==============================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Check raw database data
    console.log('📋 Step 1: Checking raw database data...');
    
    const rawUsers = await pool.query(`
      SELECT id, email, first_name, last_name, is_active, role
      FROM users 
      WHERE role = 'investor'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('Raw database users:');
    rawUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`   is_active: ${user.is_active} (type: ${typeof user.is_active})`);
      console.log(`   Should show badge: ${!user.is_active ? 'YES' : 'NO'}`);
      console.log('');
    });

    // 2. Simulate the admin API query
    console.log('📋 Step 2: Simulating admin API query...');
    
    const apiQuery = `
      SELECT 
        u.*,
        ub.total_balance,
        ub.profit_balance,
        ub.deposit_balance,
        ub.bonus_balance,
        ub.credit_score_balance,
        ub.card_balance
      FROM users u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      ORDER BY u.created_at DESC
    `;
    
    const apiResult = await pool.query(apiQuery);
    
    console.log('API query results (first 3 users):');
    apiResult.rows.slice(0, 3).forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`   is_active: ${user.is_active} (type: ${typeof user.is_active})`);
      console.log(`   Badge condition (!user.is_active): ${!user.is_active}`);
      console.log(`   Should show badge: ${!user.is_active ? 'YES' : 'NO'}`);
      console.log('');
    });

    // 3. Test the mapping logic
    console.log('📋 Step 3: Testing mapping logic...');
    
    const mappedUsers = apiResult.rows.slice(0, 3).map((user) => ({
      id: user.id,
      email: user.email,
      password: user.password,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      email_verified: user.email_verified,
      referral_code: user.referral_code,
      referred_by: user.referred_by,
      created_at: user.created_at,
      updated_at: user.updated_at,
      balance: {
        total_balance: parseFloat(user.total_balance || "0"),
        profit_balance: parseFloat(user.profit_balance || "0"),
        deposit_balance: parseFloat(user.deposit_balance || "0"),
        bonus_balance: parseFloat(user.bonus_balance || "0"),
        credit_score_balance: parseFloat(user.credit_score_balance || "0"),
        card_balance: parseFloat(user.card_balance || "0"),
      },
    }));
    
    console.log('Mapped users (as returned by API):');
    mappedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`   is_active: ${user.is_active} (type: ${typeof user.is_active})`);
      console.log(`   Badge condition (!user.is_active): ${!user.is_active}`);
      console.log(`   Should show badge: ${!user.is_active ? 'YES' : 'NO'}`);
      console.log('');
    });

    // 4. Test specific badge scenarios
    console.log('📋 Step 4: Testing badge scenarios...');
    
    // Find users with different statuses
    const activeUser = apiResult.rows.find(user => user.is_active === true);
    const inactiveUser = apiResult.rows.find(user => user.is_active === false);
    
    if (activeUser) {
      console.log(`Active user test: ${activeUser.first_name} ${activeUser.last_name}`);
      console.log(`   is_active: ${activeUser.is_active}`);
      console.log(`   !user.is_active: ${!activeUser.is_active}`);
      console.log(`   Badge should show: NO`);
      console.log(`   Badge will show: ${!activeUser.is_active ? 'YES' : 'NO'} ${!activeUser.is_active ? '❌ ERROR' : '✅ CORRECT'}`);
    }
    
    if (inactiveUser) {
      console.log(`\nInactive user test: ${inactiveUser.first_name} ${inactiveUser.last_name}`);
      console.log(`   is_active: ${inactiveUser.is_active}`);
      console.log(`   !user.is_active: ${!inactiveUser.is_active}`);
      console.log(`   Badge should show: YES`);
      console.log(`   Badge will show: ${!inactiveUser.is_active ? 'YES' : 'NO'} ${!inactiveUser.is_active ? '✅ CORRECT' : '❌ ERROR'}`);
    } else {
      console.log('\n⚠️  No inactive users found for testing');
      console.log('Creating a test scenario...');
      
      // Test with a manually created inactive user scenario
      const testInactiveUser = { ...activeUser, is_active: false };
      console.log(`Test inactive user: ${testInactiveUser.first_name} ${testInactiveUser.last_name}`);
      console.log(`   is_active: ${testInactiveUser.is_active}`);
      console.log(`   !user.is_active: ${!testInactiveUser.is_active}`);
      console.log(`   Badge should show: YES`);
      console.log(`   Badge will show: ${!testInactiveUser.is_active ? 'YES' : 'NO'} ${!testInactiveUser.is_active ? '✅ CORRECT' : '❌ ERROR'}`);
    }

    // 5. Check for data type issues
    console.log('\n📋 Step 5: Checking for data type issues...');
    
    const dataTypeIssues = [];
    apiResult.rows.slice(0, 5).forEach((user, index) => {
      if (typeof user.is_active !== 'boolean') {
        dataTypeIssues.push(`User ${index + 1}: is_active is ${typeof user.is_active} (${user.is_active}) instead of boolean`);
      }
    });
    
    if (dataTypeIssues.length > 0) {
      console.log('❌ Data type issues found:');
      dataTypeIssues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('✅ All is_active fields are proper booleans');
    }

    console.log('\n🎯 BADGE DISPLAY ANALYSIS SUMMARY');
    console.log('=================================');
    
    const totalUsers = apiResult.rows.length;
    const activeUsers = apiResult.rows.filter(user => user.is_active === true).length;
    const inactiveUsers = apiResult.rows.filter(user => user.is_active === false).length;
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Active users: ${activeUsers} (should NOT show badge)`);
    console.log(`Inactive users: ${inactiveUsers} (should show badge)`);
    
    if (dataTypeIssues.length === 0 && inactiveUsers > 0) {
      console.log('\n✅ Badge logic should work correctly');
      console.log('💡 If badges are not showing, check frontend rendering or CSS issues');
    } else if (dataTypeIssues.length > 0) {
      console.log('\n❌ Data type issues detected');
      console.log('💡 Fix: Ensure is_active is returned as boolean from database');
    } else {
      console.log('\n⚠️  No inactive users to test badge display');
      console.log('💡 Create a test inactive user to verify badge functionality');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testBadgeDisplayIssue();
