#!/usr/bin/env node

/**
 * Diagnose Critical Issues After Balance Structure Changes
 */

require('dotenv').config();
const { Pool } = require('pg');

async function diagnoseCriticalIssues() {
  console.log('🚨 Diagnosing Critical Issues After Balance Changes');
  console.log('==================================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Issue 1: Check actual database schema
    console.log('📋 Issue 1: Database Schema Reality Check');
    console.log('========================================');
    
    const userBalanceColumns = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      ORDER BY column_name
    `);
    
    console.log('ACTUAL user_balances columns in database:');
    userBalanceColumns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'}, nullable: ${col.is_nullable})`);
    });
    
    const actualColumns = userBalanceColumns.rows.map(row => row.column_name);
    const expectedColumns = ['total_balance', 'card_balance', 'credit_score_balance'];
    const oldColumns = ['profit_balance', 'deposit_balance', 'bonus_balance'];
    
    console.log('\nColumn Analysis:');
    console.log('Expected columns:', expectedColumns.join(', '));
    console.log('Old columns still present:', oldColumns.filter(col => actualColumns.includes(col)).join(', ') || 'None');
    console.log('Missing expected columns:', expectedColumns.filter(col => !actualColumns.includes(col)).join(', ') || 'None');

    // Issue 2: Test basic user query
    console.log('\n📋 Issue 2: User Query Test');
    console.log('===========================');
    
    try {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`✅ Users table accessible: ${userCount.rows[0].count} users found`);
      
      const userBalanceCount = await pool.query('SELECT COUNT(*) as count FROM user_balances');
      console.log(`✅ User_balances table accessible: ${userBalanceCount.rows[0].count} balance records found`);
      
      // Test JOIN query (what admin page likely uses)
      const joinTest = await pool.query(`
        SELECT u.id, u.email, u.first_name, u.last_name, ub.total_balance
        FROM users u
        LEFT JOIN user_balances ub ON u.id = ub.user_id
        LIMIT 5
      `);
      console.log(`✅ User-Balance JOIN works: ${joinTest.rows.length} records returned`);
      
      joinTest.rows.forEach(user => {
        console.log(`   👤 ${user.first_name} ${user.last_name} (${user.email}) - Balance: $${parseFloat(user.total_balance || 0).toFixed(2)}`);
      });
      
    } catch (error) {
      console.log('❌ User query failed:', error.message);
    }

    // Issue 3: Test authentication-related queries
    console.log('\n📋 Issue 3: Authentication Query Test');
    console.log('====================================');
    
    try {
      // Test user lookup by email (login flow)
      const testUser = await pool.query(`
        SELECT u.*, ub.total_balance, ub.card_balance, ub.credit_score_balance
        FROM users u
        LEFT JOIN user_balances ub ON u.id = ub.user_id
        WHERE u.email = $1
        LIMIT 1
      `, ['test@example.com']);
      
      console.log('✅ Authentication-style user lookup works');
      
    } catch (error) {
      console.log('❌ Authentication query failed:', error.message);
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('   🔍 This suggests the code is still referencing old balance columns!');
      }
    }

    // Issue 4: Check for queries that might still reference old columns
    console.log('\n📋 Issue 4: Database Constraint Check');
    console.log('====================================');
    
    try {
      // Test transaction constraints
      await pool.query('BEGIN');
      
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, ['00000000-0000-0000-0000-000000000000', 'investment', 50.00, 'total', 'Test transaction']);
      
      console.log('✅ Transaction creation with balance_type="total" works');
      
      await pool.query('ROLLBACK');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Transaction creation failed:', error.message);
    }

    // Issue 5: Check if balance creation still works
    console.log('\n📋 Issue 5: Balance Creation Test');
    console.log('================================');
    
    try {
      await pool.query('BEGIN');
      
      // Test creating a new user balance record
      const testUserId = '00000000-0000-0000-0000-000000000001';
      await pool.query(`
        INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO NOTHING
      `, [testUserId, 100.00, 0.00, 0]);
      
      console.log('✅ Balance creation with new structure works');
      
      await pool.query('ROLLBACK');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Balance creation failed:', error.message);
    }

    // Issue 6: Database connection and performance check
    console.log('\n📋 Issue 6: Database Performance Check');
    console.log('=====================================');
    
    const startTime = Date.now();
    try {
      await pool.query('SELECT 1');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`✅ Database response time: ${responseTime}ms`);
      
      if (responseTime > 5000) {
        console.log('⚠️  WARNING: Database response is slow (>5s) - this could cause 504 timeouts');
      } else if (responseTime > 1000) {
        console.log('⚠️  WARNING: Database response is slow (>1s) - this could affect performance');
      }
      
    } catch (error) {
      console.log('❌ Database connection test failed:', error.message);
    }

    // Summary and recommendations
    console.log('\n🎯 DIAGNOSIS SUMMARY');
    console.log('===================');
    
    const issues = [];
    
    // Check if old columns still exist
    if (oldColumns.some(col => actualColumns.includes(col))) {
      issues.push('Old balance columns still exist - migration may not have run');
    }
    
    // Check if expected columns are missing
    if (expectedColumns.some(col => !actualColumns.includes(col))) {
      issues.push('Expected balance columns are missing');
    }
    
    if (issues.length === 0) {
      console.log('✅ Database schema appears correct');
      console.log('❓ Issues may be in application code or caching');
    } else {
      console.log('❌ Database schema issues found:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n📋 RECOMMENDED FIXES:');
    console.log('1. If old columns still exist: Run the migration script properly');
    console.log('2. If columns are missing: Restore database or run schema creation');
    console.log('3. Check application code for references to old balance columns');
    console.log('4. Clear application cache/restart application');
    console.log('5. Check authentication middleware for balance-related queries');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

diagnoseCriticalIssues();
