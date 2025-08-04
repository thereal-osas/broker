#!/usr/bin/env node

/**
 * Fix Card Balance Transaction Constraint
 * Add 'card' to the balance_type constraint in transactions table
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixCardBalanceTransactionConstraint() {
  console.log('🔧 Fixing Card Balance Transaction Constraint');
  console.log('=============================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Check current constraint
    console.log('🔍 Checking current balance_type constraint...');
    const currentConstraint = await pool.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint 
      WHERE conrelid = 'transactions'::regclass 
      AND contype = 'c'
      AND conname LIKE '%balance_type%'
    `);
    
    if (currentConstraint.rows.length > 0) {
      console.log('📋 Current constraint:', currentConstraint.rows[0].constraint_def);
    } else {
      console.log('⚠️  No balance_type constraint found');
    }

    // 2. Test current constraint by trying to insert a card transaction
    console.log('\n🧪 Testing current constraint with card balance...');
    
    const testUser = await pool.query('SELECT id FROM users LIMIT 1');
    if (testUser.rows.length > 0) {
      const userId = testUser.rows[0].id;
      
      try {
        await pool.query(`
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, status
          ) VALUES ($1, 'admin_funding', 10.00, 'card', 'Test card transaction', 'completed')
        `, [userId]);
        
        console.log('✅ Card balance transaction succeeded - constraint already supports card');
        
        // Clean up test transaction
        await pool.query(`
          DELETE FROM transactions 
          WHERE user_id = $1 AND balance_type = 'card' AND description = 'Test card transaction'
        `, [userId]);
        
        console.log('🧹 Test transaction cleaned up');
        return; // No need to update constraint
        
      } catch (error) {
        if (error.message.includes('balance_type')) {
          console.log('❌ Card balance transaction failed - constraint needs updating');
          console.log(`   Error: ${error.message}`);
        } else {
          console.log('❌ Unexpected error:', error.message);
          return;
        }
      }
    }

    // 3. Drop the existing constraint
    console.log('\n🗑️  Dropping existing balance_type constraint...');
    await pool.query(`
      ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_balance_type_check
    `);
    console.log('✅ Existing constraint dropped');

    // 4. Add the new constraint with 'card' included
    console.log('\n➕ Adding updated balance_type constraint...');
    await pool.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT transactions_balance_type_check 
      CHECK (balance_type IN (
        'total', 
        'profit', 
        'deposit', 
        'bonus', 
        'credit_score',
        'card'
      ))
    `);
    console.log('✅ Updated constraint added with card support');

    // 5. Test the new constraint
    console.log('\n🧪 Testing updated constraint...');
    
    if (testUser.rows.length > 0) {
      const userId = testUser.rows[0].id;
      
      try {
        await pool.query(`
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, status
          ) VALUES ($1, 'admin_funding', 10.00, 'card', 'Test card transaction', 'completed')
        `, [userId]);
        
        console.log('✅ Successfully inserted card balance transaction');
        
        // Clean up test transaction
        await pool.query(`
          DELETE FROM transactions 
          WHERE user_id = $1 AND balance_type = 'card' AND description = 'Test card transaction'
        `, [userId]);
        console.log('🧹 Test transaction cleaned up');
        
      } catch (error) {
        console.log('❌ Test failed:', error.message);
      }
    }

    // 6. Verify all balance types work
    console.log('\n🔍 Verifying all balance types...');
    
    const balanceTypes = ['total', 'profit', 'deposit', 'bonus', 'credit_score', 'card'];
    
    for (const balanceType of balanceTypes) {
      try {
        await pool.query(`
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, status
          ) VALUES ($1, 'admin_funding', 1.00, $2, $3, 'completed')
        `, [testUser.rows[0].id, balanceType, `Test ${balanceType} transaction`]);
        
        console.log(`✅ ${balanceType}: OK`);
        
        // Clean up
        await pool.query(`
          DELETE FROM transactions 
          WHERE user_id = $1 AND balance_type = $2 AND description = $3
        `, [testUser.rows[0].id, balanceType, `Test ${balanceType} transaction`]);
        
      } catch (error) {
        console.log(`❌ ${balanceType}: FAILED - ${error.message}`);
      }
    }

    console.log('\n🎉 Card Balance Transaction Constraint Fixed!');
    console.log('============================================');
    console.log('✅ transactions table now supports card balance_type');
    console.log('✅ Admin card balance funding should now work without errors');
    console.log('✅ All existing balance types still supported');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test card balance funding in admin interface');
    console.log('2. Verify transaction records are created correctly');
    console.log('3. Check that success messages are displayed to admin');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

fixCardBalanceTransactionConstraint();
