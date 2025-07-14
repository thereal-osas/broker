#!/usr/bin/env node

/**
 * Database Verification Script
 * 
 * This script verifies that your Railway PostgreSQL database is properly set up
 * and all tables exist with the correct structure.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifyDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying database setup...\n');
    
    // Test connection
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Connected at: ${result.rows[0].now}\n`);
    
    // Check all required tables
    const expectedTables = [
      'users',
      'user_balances',
      'investment_plans',
      'user_investments',
      'investment_profits',
      'profit_distributions',
      'deposit_requests',
      'withdrawal_requests',
      'transactions',
      'referrals',
      'referral_commissions',
      'newsletters',
      'support_tickets',
      'ticket_responses',
      'system_settings'
    ];
    
    console.log('📋 Checking required tables...');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    let allTablesExist = true;
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - MISSING`);
        allTablesExist = false;
      }
    }
    
    if (!allTablesExist) {
      console.log('\n❌ Some tables are missing. Please run the migration script:');
      console.log('   node scripts/migrate-production.js\n');
      return;
    }
    
    // Check for admin users
    console.log('\n👤 Checking admin users...');
    const adminResult = await client.query(
      "SELECT email, first_name, last_name FROM users WHERE role = 'admin'"
    );
    
    if (adminResult.rows.length === 0) {
      console.log('   ⚠️  No admin users found');
      console.log('   Run migration script to create default admin user');
    } else {
      console.log('   ✅ Admin users found:');
      adminResult.rows.forEach(admin => {
        console.log(`      - ${admin.email} (${admin.first_name} ${admin.last_name})`);
      });
    }
    
    // Check investment plans
    console.log('\n💼 Checking investment plans...');
    const plansResult = await client.query('SELECT name, min_amount, max_amount, daily_profit_rate FROM investment_plans WHERE is_active = true');
    
    if (plansResult.rows.length === 0) {
      console.log('   ⚠️  No active investment plans found');
      console.log('   Run migration script to create default plans');
    } else {
      console.log('   ✅ Active investment plans:');
      plansResult.rows.forEach(plan => {
        console.log(`      - ${plan.name}: $${plan.min_amount}-${plan.max_amount || '∞'} (${(plan.daily_profit_rate * 100).toFixed(2)}% daily)`);
      });
    }
    
    // Check database size and record counts
    console.log('\n📊 Database statistics...');
    
    const stats = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM users'),
      client.query('SELECT COUNT(*) as count FROM user_investments'),
      client.query('SELECT COUNT(*) as count FROM transactions'),
      client.query('SELECT COUNT(*) as count FROM deposit_requests'),
      client.query('SELECT COUNT(*) as count FROM withdrawal_requests')
    ]);
    
    console.log(`   Users: ${stats[0].rows[0].count}`);
    console.log(`   Investments: ${stats[1].rows[0].count}`);
    console.log(`   Transactions: ${stats[2].rows[0].count}`);
    console.log(`   Deposit Requests: ${stats[3].rows[0].count}`);
    console.log(`   Withdrawal Requests: ${stats[4].rows[0].count}`);
    
    console.log('\n🎉 Database verification completed!');
    
    if (allTablesExist && adminResult.rows.length > 0 && plansResult.rows.length > 0) {
      console.log('✅ Your database is ready for production use!');
    } else {
      console.log('⚠️  Your database needs some setup. Run the migration script:');
      console.log('   node scripts/migrate-production.js');
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your DATABASE_URL environment variable');
    console.error('2. Ensure your Railway database is running');
    console.error('3. Verify network connectivity to Railway');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please set it to your Railway PostgreSQL connection string:');
    console.error('export DATABASE_URL="postgresql://username:password@host:port/database"');
    process.exit(1);
  }
  
  verifyDatabase();
}

module.exports = { verifyDatabase };
