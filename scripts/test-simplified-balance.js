#!/usr/bin/env node

/**
 * Test Simplified Balance System
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testSimplifiedBalance() {
  console.log('🧪 Testing Simplified Balance System');
  console.log('===================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test 1: Check current schema
    console.log('📋 Test 1: Current Schema Check');
    console.log('==============================');
    
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name LIKE '%balance%'
      ORDER BY column_name
    `);
    
    console.log('Current balance columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    // Test 2: Test balance update
    console.log('\n📋 Test 2: Balance Update Test');
    console.log('=============================');
    
    try {
      await pool.query('BEGIN');
      
      // Test updating total_balance
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = GREATEST(0, total_balance - 10)
        WHERE user_id = (SELECT id FROM users LIMIT 1)
      `);
      
      console.log('✅ total_balance update works');
      
      await pool.query('ROLLBACK');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Balance update failed:', error.message);
    }
    
    // Test 3: Test transaction creation
    console.log('\n📋 Test 3: Transaction Creation Test');
    console.log('===================================');
    
    try {
      await pool.query('BEGIN');
      
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, ['00000000-0000-0000-0000-000000000000', 'investment', 50.00, 'total', 'Test investment']);
      
      console.log('✅ Investment transaction creation works');
      
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, ['00000000-0000-0000-0000-000000000000', 'live_trade_investment', 25.00, 'total', 'Test live trade']);
      
      console.log('✅ Live trade transaction creation works');
      
      await pool.query('ROLLBACK');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Transaction creation failed:', error.message);
    }
    
    console.log('\n🎉 Simplified Balance System Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testSimplifiedBalance();
