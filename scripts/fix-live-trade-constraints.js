const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixLiveTradeConstraints() {
  console.log('🔧 Fixing Live Trade Transaction Constraints');
  console.log('===========================================\n');

  try {
    const client = await pool.connect();
    
    // 1. Check current transaction type constraint
    console.log('🔍 Checking current transaction type constraint...');
    const currentTypeConstraint = await client.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint 
      WHERE conrelid = 'transactions'::regclass 
      AND contype = 'c'
      AND conname LIKE '%type_check%'
    `);
    
    if (currentTypeConstraint.rows.length > 0) {
      console.log('📋 Current type constraint:', currentTypeConstraint.rows[0].constraint_def);
    } else {
      console.log('⚠️  No transaction type constraint found');
    }

    // 2. Check current balance type constraint
    console.log('\n🔍 Checking current balance type constraint...');
    const currentBalanceConstraint = await client.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint 
      WHERE conrelid = 'transactions'::regclass 
      AND contype = 'c'
      AND conname LIKE '%balance_type%'
    `);
    
    if (currentBalanceConstraint.rows.length > 0) {
      console.log('📋 Current balance type constraint:', currentBalanceConstraint.rows[0].constraint_def);
    } else {
      console.log('⚠️  No balance type constraint found');
    }

    // 3. Drop existing transaction type constraint
    console.log('\n🗑️  Dropping existing transaction type constraint...');
    await client.query(`
      ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_type_check
    `);
    console.log('✅ Transaction type constraint dropped');

    // 4. Add updated transaction type constraint with live trade operations
    console.log('\n➕ Adding updated transaction type constraint...');
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
        'live_trade_investment',
        'live_trade_deactivation',
        'live_trade_deletion',
        'live_trade_profit',
        'live_trade_refund'
      ))
    `);
    console.log('✅ Updated transaction type constraint added');
    console.log('   Added support for: live_trade_deactivation, live_trade_deletion, live_trade_profit, live_trade_refund');

    // 5. Drop existing balance type constraint
    console.log('\n🗑️  Dropping existing balance type constraint...');
    await client.query(`
      ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_balance_type_check
    `);
    console.log('✅ Balance type constraint dropped');

    // 6. Add updated balance type constraint with system type
    console.log('\n➕ Adding updated balance type constraint...');
    await client.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT transactions_balance_type_check 
      CHECK (balance_type IN (
        'total', 
        'profit', 
        'deposit', 
        'bonus', 
        'credit_score',
        'card',
        'system'
      ))
    `);
    console.log('✅ Updated balance type constraint added');
    console.log('   Added support for: system');

    // 7. Test the new constraints
    console.log('\n🧪 Testing new constraints...');
    
    // Get a test user
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      // Test live_trade_deactivation
      try {
        await client.query(`
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, status
          ) VALUES ($1, 'live_trade_deactivation', 0, 'system', 'Test deactivation', 'completed')
        `, [userId]);
        
        console.log('✅ live_trade_deactivation: OK');
        
        // Clean up
        await client.query(`
          DELETE FROM transactions 
          WHERE user_id = $1 AND type = 'live_trade_deactivation' AND description = 'Test deactivation'
        `, [userId]);
        
      } catch (error) {
        console.log(`❌ live_trade_deactivation: FAILED - ${error.message}`);
      }

      // Test live_trade_deletion
      try {
        await client.query(`
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, status
          ) VALUES ($1, 'live_trade_deletion', 0, 'system', 'Test deletion', 'completed')
        `, [userId]);
        
        console.log('✅ live_trade_deletion: OK');
        
        // Clean up
        await client.query(`
          DELETE FROM transactions 
          WHERE user_id = $1 AND type = 'live_trade_deletion' AND description = 'Test deletion'
        `, [userId]);
        
      } catch (error) {
        console.log(`❌ live_trade_deletion: FAILED - ${error.message}`);
      }

      // Test system balance type
      try {
        await client.query(`
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, status
          ) VALUES ($1, 'admin_funding', 10, 'system', 'Test system balance', 'completed')
        `, [userId]);
        
        console.log('✅ system balance_type: OK');
        
        // Clean up
        await client.query(`
          DELETE FROM transactions 
          WHERE user_id = $1 AND balance_type = 'system' AND description = 'Test system balance'
        `, [userId]);
        
      } catch (error) {
        console.log(`❌ system balance_type: FAILED - ${error.message}`);
      }
    }

    client.release();
    
    console.log('\n🎉 Live trade constraints fixed successfully!');
    console.log('   - Transaction types now support live trade operations');
    console.log('   - Balance types now support system transactions');
    console.log('   - Live trade deactivation and deletion should now work');

  } catch (error) {
    console.error('❌ Error fixing live trade constraints:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixLiveTradeConstraints().catch(console.error);
}

module.exports = fixLiveTradeConstraints;
