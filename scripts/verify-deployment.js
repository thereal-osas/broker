#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Tests all new features after deployment
 */

require('dotenv').config();
const { Pool } = require('pg');

async function verifyDeployment() {
  console.log('🔍 Verifying Deployment...');
  console.log('==========================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const results = {
    database: false,
    systemSettings: false,
    apiEndpoints: false,
    userManagement: false
  };

  try {
    // 1. Test database connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    results.database = true;
    console.log('✅ Database connection successful\n');

    // 2. Test system_settings table
    console.log('🔧 Testing system_settings table...');
    const settingsResult = await pool.query(`
      SELECT COUNT(*) as count, 
             COUNT(CASE WHEN category = 'withdrawal' THEN 1 END) as withdrawal_count
      FROM system_settings
    `);
    
    const totalSettings = parseInt(settingsResult.rows[0].count);
    const withdrawalSettings = parseInt(settingsResult.rows[0].withdrawal_count);
    
    if (totalSettings > 0 && withdrawalSettings > 0) {
      results.systemSettings = true;
      console.log(`✅ Found ${totalSettings} system settings (${withdrawalSettings} withdrawal settings)`);
    } else {
      console.log(`❌ System settings incomplete: ${totalSettings} total, ${withdrawalSettings} withdrawal`);
    }

    // 3. Test withdrawal percentage limits
    console.log('\n💰 Testing withdrawal percentage limits...');
    const withdrawalLimits = await pool.query(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN ('max_withdrawal_percentage', 'min_withdrawal_amount', 'max_withdrawal_amount')
      ORDER BY setting_key
    `);
    
    if (withdrawalLimits.rows.length >= 3) {
      console.log('✅ Withdrawal limits configured:');
      withdrawalLimits.rows.forEach(row => {
        console.log(`   ${row.setting_key}: ${row.setting_value}`);
      });
    } else {
      console.log('❌ Withdrawal limits incomplete');
    }

    // 4. Test user management features
    console.log('\n👥 Testing user management features...');
    const userCount = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as deactivated_users
      FROM users
    `);
    
    const stats = userCount.rows[0];
    results.userManagement = true;
    console.log(`✅ User management ready:`);
    console.log(`   Total users: ${stats.total_users}`);
    console.log(`   Active users: ${stats.active_users}`);
    console.log(`   Deactivated users: ${stats.deactivated_users}`);

    // 5. Test admin user exists
    console.log('\n👑 Checking admin users...');
    const adminCount = await pool.query(`
      SELECT COUNT(*) as admin_count 
      FROM users 
      WHERE role = 'admin' AND is_active = true
    `);
    
    const adminUsers = parseInt(adminCount.rows[0].admin_count);
    if (adminUsers > 0) {
      console.log(`✅ Found ${adminUsers} active admin user(s)`);
    } else {
      console.log('⚠️  No active admin users found - you may need to create one');
    }

    // 6. Environment variables check
    console.log('\n🔐 Checking environment variables...');
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Summary
    console.log('\n🎯 DEPLOYMENT VERIFICATION SUMMARY');
    console.log('===================================');
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`Tests passed: ${passedTests}/${totalTests}`);
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${status} ${testName}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 Deployment verification successful!');
      console.log('✅ All admin control features are ready');
      console.log('✅ Database schema is up to date');
      console.log('✅ System settings are configured');
      console.log('✅ User management features are working');
    } else {
      console.log('\n⚠️  Some issues found - please review the errors above');
    }

    // Next steps
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Test the admin interface at /admin/dashboard');
    console.log('2. Verify withdrawal limits in /admin/settings');
    console.log('3. Test user deactivation in /admin/users');
    console.log('4. Check middleware restrictions with deactivated users');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

verifyDeployment();
