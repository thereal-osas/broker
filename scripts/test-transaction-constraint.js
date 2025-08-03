#!/usr/bin/env node

/**
 * Test transaction type constraint for live_trade_investment
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testTransactionConstraint() {
  console.log('🧪 Testing transaction type constraint for live_trade_investment...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get a test user
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('📋 Using user ID:', userId);
    
    // Try to insert a transaction with live_trade_investment type
    try {
      await pool.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, status
        ) VALUES ($1, 'live_trade_investment', 100.00, 'total', 'Test live trade', 'completed')
      `, [userId]);
      
      console.log('✅ Successfully inserted live_trade_investment transaction');
      
      // Clean up
      await pool.query(`
        DELETE FROM transactions 
        WHERE user_id = $1 AND type = 'live_trade_investment' AND description = 'Test live trade'
      `, [userId]);
      console.log('🧹 Test transaction cleaned up');
      
    } catch (error) {
      console.log('❌ Failed to insert live_trade_investment transaction:');
      console.log('   Error:', error.message);

      // Check ALL constraints
      console.log('\n🔍 Checking ALL constraints on transactions table...');
      const constraintResult = await pool.query(`
        SELECT
          conname as constraint_name,
          pg_get_constraintdef(oid) as constraint_def
        FROM pg_constraint
        WHERE conrelid = 'transactions'::regclass
        AND contype = 'c'
        ORDER BY conname
      `);

      console.log('📋 All check constraints:');
      constraintResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.constraint_name}:`);
        console.log(`   ${row.constraint_def}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testTransactionConstraint();
