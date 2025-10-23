#!/usr/bin/env node

/**
 * Local Database Connection Test
 * 
 * This script tests the connection to your local PostgreSQL database
 * and verifies that all required tables exist.
 */

// Load environment variables
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'broker_platform',
  password: process.env.DB_PASSWORD || 'Mirror1#@',
  port: parseInt(process.env.DB_PORT || '5432'),
};

const requiredTables = [
  'users',
  'user_balances',
  'investment_plans',
  'user_investments',
  'transactions',
  'live_trade_plans',
  'user_live_trades',
  'hourly_live_trade_profits',
  'profit_distributions'
];

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log(`Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  
  const pool = new Pool(dbConfig);
  
  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function checkTables() {
  console.log('\n🔍 Checking required tables...');
  
  const pool = new Pool(dbConfig);
  
  try {
    const missingTables = [];
    const existingTables = [];
    
    for (const tableName of requiredTables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      if (result.rows[0].exists) {
        existingTables.push(tableName);
        console.log(`✅ ${tableName}`);
      } else {
        missingTables.push(tableName);
        console.log(`❌ ${tableName} (missing)`);
      }
    }
    
    console.log(`\n📊 Summary: ${existingTables.length}/${requiredTables.length} tables exist`);
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables detected. Run the setup script:');
      console.log('   node scripts/setup-local-development.js');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function checkData() {
  console.log('\n🔍 Checking test data...');
  
  const pool = new Pool(dbConfig);
  
  try {
    // Check users
    const usersResult = await pool.query('SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE role = \'admin\') as admin_count FROM users');
    console.log(`👥 Users: ${usersResult.rows[0].count} total, ${usersResult.rows[0].admin_count} admin(s)`);
    
    // Check investment plans
    const plansResult = await pool.query('SELECT COUNT(*) as count FROM investment_plans WHERE is_active = true');
    console.log(`📈 Active investment plans: ${plansResult.rows[0].count}`);
    
    // Check live trade plans
    const liveTradeResult = await pool.query('SELECT COUNT(*) as count FROM live_trade_plans WHERE is_active = true');
    console.log(`⚡ Active live trade plans: ${liveTradeResult.rows[0].count}`);
    
    // Check balances
    const balancesResult = await pool.query('SELECT COUNT(*) as count, SUM(total_balance) as total_balance FROM user_balances');
    console.log(`💰 User balances: ${balancesResult.rows[0].count} users, $${parseFloat(balancesResult.rows[0].total_balance || 0).toFixed(2)} total`);
    
    return true;
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function testAPICompatibility() {
  console.log('\n🔍 Testing API compatibility...');
  
  const pool = new Pool(dbConfig);
  
  try {
    // Test a query similar to what the admin investments API would run
    const investmentsQuery = `
      SELECT 
        ui.id,
        ui.user_id,
        ui.amount,
        ui.status,
        u.first_name,
        u.last_name,
        u.email
      FROM user_investments ui
      JOIN users u ON ui.user_id = u.id
      WHERE ui.status = 'active'
      LIMIT 5
    `;
    
    const result = await pool.query(investmentsQuery);
    console.log(`✅ Investment query test: ${result.rows.length} active investments found`);
    
    // Test live trades query
    const liveTradesQuery = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.amount,
        ult.status,
        ltp.name as plan_name
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      LIMIT 5
    `;
    
    const liveTradesResult = await pool.query(liveTradesQuery);
    console.log(`✅ Live trades query test: ${liveTradesResult.rows.length} live trades found`);
    
    return true;
  } catch (error) {
    console.error('❌ API compatibility test failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🧪 Local Database Test');
  console.log('======================');
  
  let allTestsPassed = true;
  
  // Test connection
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('\n❌ Database connection failed. Please check:');
    console.log('1. PostgreSQL is running on your local machine');
    console.log('2. Database credentials in .env file are correct');
    console.log('3. Database user has proper permissions');
    process.exit(1);
  }
  
  // Check tables
  const tablesOk = await checkTables();
  allTestsPassed = allTestsPassed && tablesOk;
  
  // Check data
  const dataOk = await checkData();
  allTestsPassed = allTestsPassed && dataOk;
  
  // Test API compatibility
  const apiOk = await testAPICompatibility();
  allTestsPassed = allTestsPassed && apiOk;
  
  console.log('\n' + '='.repeat(50));
  
  if (allTestsPassed) {
    console.log('🎉 All tests passed! Your local database is ready.');
    console.log('\n📋 You can now:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Access the application at: http://localhost:3000');
    console.log('3. Test the admin panel and profit distribution features');
  } else {
    console.log('⚠️  Some tests failed. Please run the setup script:');
    console.log('   node scripts/setup-local-development.js');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
