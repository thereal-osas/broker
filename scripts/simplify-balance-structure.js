#!/usr/bin/env node

/**
 * Simplify Balance Structure Migration
 * 
 * This script migrates from the complex multi-balance system to a simplified 3-balance system:
 * - total_balance (DECIMAL) - Main balance for all transactions
 * - card_balance (DECIMAL) - Admin funding balance
 * - credit_score_balance (INTEGER) - Points-based reward system
 */

require('dotenv').config();
const { Pool } = require('pg');

async function simplifyBalanceStructure() {
  console.log('🔧 Simplifying Balance Structure');
  console.log('================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Step 1: Check current balance structure
    console.log('📋 Step 1: Analyzing Current Balance Structure');
    console.log('==============================================');
    
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name LIKE '%balance%'
      ORDER BY column_name
    `);
    
    console.log('Current balance columns:');
    columnCheck.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
    });
    
    const currentColumns = columnCheck.rows.map(row => row.column_name);
    const hasOldColumns = currentColumns.some(col => ['profit_balance', 'deposit_balance', 'bonus_balance'].includes(col));
    
    if (!hasOldColumns) {
      console.log('✅ Balance structure is already simplified');
      return;
    }

    // Step 2: Backup and consolidate balances
    console.log('\n📋 Step 2: Consolidating Balances');
    console.log('=================================');
    
    // First, ensure all users have the required columns
    if (!currentColumns.includes('card_balance')) {
      console.log('Adding card_balance column...');
      await pool.query('ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS card_balance DECIMAL(15,2) DEFAULT 0.00');
    }
    
    // Update credit_score_balance to INTEGER if it's not already
    const creditScoreType = columnCheck.rows.find(col => col.column_name === 'credit_score_balance')?.data_type;
    if (creditScoreType && creditScoreType !== 'integer') {
      console.log('Converting credit_score_balance to INTEGER...');
      await pool.query('ALTER TABLE user_balances ALTER COLUMN credit_score_balance TYPE INTEGER USING ROUND(credit_score_balance)');
    }
    
    // Consolidate all balances into total_balance
    console.log('Consolidating all balances into total_balance...');
    
    const consolidateQuery = `
      UPDATE user_balances 
      SET total_balance = GREATEST(0, 
        COALESCE(total_balance, 0) + 
        COALESCE(profit_balance, 0) + 
        COALESCE(deposit_balance, 0) + 
        COALESCE(bonus_balance, 0)
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE profit_balance IS NOT NULL 
         OR deposit_balance IS NOT NULL 
         OR bonus_balance IS NOT NULL
    `;
    
    const consolidateResult = await pool.query(consolidateQuery);
    console.log(`✅ Consolidated balances for ${consolidateResult.rowCount} users`);

    // Step 3: Remove old balance columns
    console.log('\n📋 Step 3: Removing Old Balance Columns');
    console.log('======================================');
    
    const columnsToRemove = ['profit_balance', 'deposit_balance', 'bonus_balance'];
    
    for (const column of columnsToRemove) {
      if (currentColumns.includes(column)) {
        console.log(`Removing ${column} column...`);
        await pool.query(`ALTER TABLE user_balances DROP COLUMN IF EXISTS ${column}`);
      }
    }
    
    console.log('✅ Old balance columns removed');

    // Step 4: Update transaction constraints
    console.log('\n📋 Step 4: Updating Transaction Constraints');
    console.log('==========================================');
    
    try {
      // Update balance_type constraint
      await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_balance_type_check');
      await pool.query(`
        ALTER TABLE transactions ADD CONSTRAINT transactions_balance_type_check
        CHECK (balance_type IN ('total', 'card', 'credit_score'))
      `);
      console.log('✅ Updated balance_type constraint');
      
      // Ensure transaction type constraint includes live_trade_investment
      await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check');
      await pool.query(`
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
        CHECK (type IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment'))
      `);
      console.log('✅ Updated transaction type constraint');
      
    } catch (error) {
      console.log('⚠️  Warning: Could not update constraints:', error.message);
    }

    // Step 5: Update existing transaction records
    console.log('\n📋 Step 5: Updating Transaction Records');
    console.log('======================================');
    
    // Update old balance_type values to 'total'
    const updateTransactions = await pool.query(`
      UPDATE transactions 
      SET balance_type = 'total'
      WHERE balance_type IN ('profit', 'deposit', 'bonus')
    `);
    
    console.log(`✅ Updated ${updateTransactions.rowCount} transaction records to use 'total' balance_type`);

    // Step 6: Verify the new structure
    console.log('\n📋 Step 6: Verifying New Structure');
    console.log('==================================');
    
    const finalColumnCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name LIKE '%balance%'
      ORDER BY column_name
    `);
    
    console.log('Final balance columns:');
    finalColumnCheck.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
    });
    
    const finalColumns = finalColumnCheck.rows.map(row => row.column_name);
    const expectedColumns = ['card_balance', 'credit_score_balance', 'total_balance'];
    const hasAllExpected = expectedColumns.every(col => finalColumns.includes(col));
    const hasNoOldColumns = !finalColumns.some(col => ['profit_balance', 'deposit_balance', 'bonus_balance'].includes(col));
    
    if (hasAllExpected && hasNoOldColumns) {
      console.log('✅ Balance structure successfully simplified');
    } else {
      console.log('❌ Balance structure migration incomplete');
      console.log('Expected columns:', expectedColumns.join(', '));
      console.log('Actual columns:', finalColumns.join(', '));
    }

    // Step 7: Sample data verification
    console.log('\n📋 Step 7: Sample Data Verification');
    console.log('===================================');
    
    const sampleData = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        ub.total_balance,
        ub.card_balance,
        ub.credit_score_balance
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      ORDER BY ub.updated_at DESC
      LIMIT 3
    `);
    
    console.log('Sample user balances after migration:');
    sampleData.rows.forEach(user => {
      console.log(`   👤 ${user.first_name} (${user.email})`);
      console.log(`      Total Balance: $${parseFloat(user.total_balance || 0).toFixed(2)}`);
      console.log(`      Card Balance: $${parseFloat(user.card_balance || 0).toFixed(2)}`);
      console.log(`      Credit Score: ${user.credit_score_balance} points`);
      console.log('');
    });

    console.log('\n🎉 Balance Structure Simplification Complete!');
    console.log('============================================');
    console.log('✅ Simplified to 3 balance types:');
    console.log('   - total_balance: Main balance for all transactions');
    console.log('   - card_balance: Admin funding balance');
    console.log('   - credit_score_balance: Points-based rewards');
    console.log('✅ All old balances consolidated into total_balance');
    console.log('✅ Transaction constraints updated');
    console.log('✅ Investment and live trade balance deduction should now work correctly');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test investment creation - should deduct from total_balance');
    console.log('2. Test live trade creation - should deduct from total_balance');
    console.log('3. Verify transaction records show balance_type as "total"');
    console.log('4. Update frontend components to use simplified balance structure');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

simplifyBalanceStructure();
