#!/usr/bin/env node

/**
 * Fix transaction type constraint to include live_trade_investment
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function fixLiveTradeTransactionTypes() {
  console.log('🔧 Fixing transaction type constraint to include live_trade_investment...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // First, check current constraint
    console.log('🔍 Checking current constraint...');
    const currentConstraint = await client.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint 
      WHERE conrelid = 'transactions'::regclass 
      AND contype = 'c'
      AND conname LIKE '%type%'
    `);
    
    if (currentConstraint.rows.length > 0) {
      console.log('📋 Current constraint:', currentConstraint.rows[0].constraint_def);
    }
    
    // Drop the existing constraint
    console.log('🗑️  Dropping existing constraint...');
    await client.query(`
      ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_type_check
    `);
    
    // Add the new constraint with live_trade_investment included
    console.log('➕ Adding updated constraint...');
    await client.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT transactions_type_check 
      CHECK (type IN (
        'deposit', 
        'withdrawal', 
        'investment', 
        'profit', 
        'bonus', 
        'referral_commission', 
        'admin_funding',
        'admin_deduction',
        'live_trade_investment'
      ))
    `);
    
    console.log('✅ Transaction type constraint updated successfully!');
    console.log('   Added support for: live_trade_investment');
    
    // Test the new constraint
    console.log('\n🧪 Testing new constraint...');
    
    // Get a test user
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      try {
        await client.query(`
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, status
          ) VALUES ($1, 'live_trade_investment', 100.00, 'total', 'Test live trade', 'completed')
        `, [userId]);
        
        console.log('✅ Successfully inserted test live_trade_investment transaction');
        
        // Clean up test transaction
        await client.query(`
          DELETE FROM transactions 
          WHERE user_id = $1 AND type = 'live_trade_investment' AND description = 'Test live trade'
        `, [userId]);
        console.log('🧹 Test transaction cleaned up');
        
      } catch (error) {
        console.log('❌ Test failed:', error.message);
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixLiveTradeTransactionTypes();
}

module.exports = { fixLiveTradeTransactionTypes };
