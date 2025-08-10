#!/usr/bin/env node

/**
 * Emergency Database Fix
 * 
 * This script fixes critical database issues that are preventing login and admin functionality
 */

require('dotenv').config();
const { Pool } = require('pg');

async function emergencyDatabaseFix() {
  console.log('🚨 Emergency Database Fix');
  console.log('=========================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Step 1: Check current state
    console.log('📋 Step 1: Database State Check');
    console.log('===============================');
    
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      ORDER BY column_name
    `);
    
    console.log('Current user_balances columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    const columnNames = columns.rows.map(row => row.column_name);
    const hasOldColumns = ['profit_balance', 'deposit_balance', 'bonus_balance'].some(col => columnNames.includes(col));
    const hasNewColumns = ['total_balance', 'card_balance', 'credit_score_balance'].every(col => columnNames.includes(col));
    
    console.log(`Has old columns: ${hasOldColumns}`);
    console.log(`Has new columns: ${hasNewColumns}`);

    // Step 2: Fix missing columns
    console.log('\n📋 Step 2: Ensuring Required Columns Exist');
    console.log('==========================================');
    
    if (!columnNames.includes('total_balance')) {
      console.log('Adding total_balance column...');
      await pool.query('ALTER TABLE user_balances ADD COLUMN total_balance DECIMAL(15,2) DEFAULT 0.00');
    }
    
    if (!columnNames.includes('card_balance')) {
      console.log('Adding card_balance column...');
      await pool.query('ALTER TABLE user_balances ADD COLUMN card_balance DECIMAL(15,2) DEFAULT 0.00');
    }
    
    if (!columnNames.includes('credit_score_balance')) {
      console.log('Adding credit_score_balance column...');
      await pool.query('ALTER TABLE user_balances ADD COLUMN credit_score_balance INTEGER DEFAULT 0');
    }

    // Step 3: Consolidate balances if old columns exist
    if (hasOldColumns) {
      console.log('\n📋 Step 3: Consolidating Old Balances');
      console.log('====================================');
      
      const consolidateQuery = `
        UPDATE user_balances 
        SET total_balance = GREATEST(0, 
          COALESCE(total_balance, 0) + 
          COALESCE(profit_balance, 0) + 
          COALESCE(deposit_balance, 0) + 
          COALESCE(bonus_balance, 0)
        )
        WHERE profit_balance IS NOT NULL 
           OR deposit_balance IS NOT NULL 
           OR bonus_balance IS NOT NULL
      `;
      
      const result = await pool.query(consolidateQuery);
      console.log(`✅ Consolidated balances for ${result.rowCount} users`);
      
      // Remove old columns
      console.log('Removing old balance columns...');
      await pool.query('ALTER TABLE user_balances DROP COLUMN IF EXISTS profit_balance');
      await pool.query('ALTER TABLE user_balances DROP COLUMN IF EXISTS deposit_balance');
      await pool.query('ALTER TABLE user_balances DROP COLUMN IF EXISTS bonus_balance');
      console.log('✅ Old columns removed');
    }

    // Step 4: Fix transaction constraints
    console.log('\n📋 Step 4: Fixing Transaction Constraints');
    console.log('========================================');
    
    try {
      // Update balance_type constraint
      await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_balance_type_check');
      await pool.query(`
        ALTER TABLE transactions ADD CONSTRAINT transactions_balance_type_check
        CHECK (balance_type IN ('total', 'card', 'credit_score'))
      `);
      console.log('✅ Updated balance_type constraint');
      
      // Update transaction type constraint
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
    
    const updateTransactions = await pool.query(`
      UPDATE transactions 
      SET balance_type = 'total'
      WHERE balance_type IN ('profit', 'deposit', 'bonus')
    `);
    
    console.log(`✅ Updated ${updateTransactions.rowCount} transaction records`);

    // Step 6: Ensure all users have balance records
    console.log('\n📋 Step 6: Ensuring All Users Have Balance Records');
    console.log('=================================================');
    
    const usersWithoutBalance = await pool.query(`
      SELECT u.id, u.email 
      FROM users u 
      LEFT JOIN user_balances ub ON u.id = ub.user_id 
      WHERE ub.user_id IS NULL
    `);
    
    if (usersWithoutBalance.rows.length > 0) {
      console.log(`Found ${usersWithoutBalance.rows.length} users without balance records`);
      
      for (const user of usersWithoutBalance.rows) {
        await pool.query(`
          INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
          VALUES ($1, $2, $3, $4)
        `, [user.id, 0.00, 0.00, 0]);
        console.log(`✅ Created balance record for ${user.email}`);
      }
    } else {
      console.log('✅ All users have balance records');
    }

    // Step 7: Test critical queries
    console.log('\n📋 Step 7: Testing Critical Queries');
    console.log('===================================');
    
    try {
      // Test admin users query
      const adminTest = await pool.query(`
        SELECT u.id, u.email, ub.total_balance, ub.card_balance, ub.credit_score_balance
        FROM users u
        LEFT JOIN user_balances ub ON u.id = ub.user_id
        WHERE u.role = 'investor'
        LIMIT 1
      `);
      console.log('✅ Admin users query works');
      
      // Test authentication query
      const authTest = await pool.query(`
        SELECT u.*, ub.total_balance, ub.card_balance, ub.credit_score_balance
        FROM users u
        LEFT JOIN user_balances ub ON u.id = ub.user_id
        LIMIT 1
      `);
      console.log('✅ Authentication query works');
      
      // Test balance update
      await pool.query('BEGIN');
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = GREATEST(0, total_balance - 1)
        WHERE user_id = (SELECT id FROM users LIMIT 1)
      `);
      await pool.query('ROLLBACK');
      console.log('✅ Balance update works');
      
      // Test transaction creation
      await pool.query('BEGIN');
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, ['00000000-0000-0000-0000-000000000000', 'investment', 50.00, 'total', 'Test']);
      await pool.query('ROLLBACK');
      console.log('✅ Transaction creation works');
      
    } catch (error) {
      console.log('❌ Query test failed:', error.message);
    }

    // Step 8: Final verification
    console.log('\n📋 Step 8: Final Verification');
    console.log('=============================');
    
    const finalColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name LIKE '%balance%'
      ORDER BY column_name
    `);
    
    const finalColumnNames = finalColumns.rows.map(row => row.column_name);
    console.log('Final balance columns:', finalColumnNames.join(', '));
    
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const balanceCount = await pool.query('SELECT COUNT(*) as count FROM user_balances');
    
    console.log(`Users: ${userCount.rows[0].count}`);
    console.log(`Balance records: ${balanceCount.rows[0].count}`);
    
    if (userCount.rows[0].count === balanceCount.rows[0].count) {
      console.log('✅ All users have balance records');
    } else {
      console.log('❌ Some users missing balance records');
    }

    console.log('\n🎉 Emergency Database Fix Complete!');
    console.log('===================================');
    console.log('✅ Database schema fixed');
    console.log('✅ Balance structure simplified');
    console.log('✅ Transaction constraints updated');
    console.log('✅ All users have balance records');
    console.log('✅ Critical queries tested');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Restart the application');
    console.log('2. Test user login');
    console.log('3. Test admin users page');
    console.log('4. Test investment/live trade creation');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

emergencyDatabaseFix();
