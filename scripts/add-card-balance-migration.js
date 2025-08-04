#!/usr/bin/env node

/**
 * Migration script to add card_balance field to user_balances table
 */

require('dotenv').config();
const { Pool } = require('pg');

async function addCardBalanceMigration() {
  console.log('🚀 Adding Card Balance to Database Schema');
  console.log('=========================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if card_balance column already exists
    console.log('🔍 Checking if card_balance column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name = 'card_balance'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ card_balance column already exists');
      console.log('🎉 Migration not needed - database is up to date!');
      return;
    }

    console.log('📝 Adding card_balance column to user_balances table...');
    
    // Add card_balance column
    await pool.query(`
      ALTER TABLE user_balances 
      ADD COLUMN card_balance DECIMAL(15,2) DEFAULT 0.00
    `);
    
    console.log('✅ card_balance column added successfully');

    // Update existing records to have 0.00 card balance
    console.log('📝 Initializing card_balance for existing users...');
    const updateResult = await pool.query(`
      UPDATE user_balances 
      SET card_balance = 0.00 
      WHERE card_balance IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} existing user balance records`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name LIKE '%balance%'
      ORDER BY column_name
    `);
    
    console.log('Balance columns in user_balances table:');
    verifyResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
    });

    // Test balance calculation with card balance
    console.log('\n🧪 Testing balance calculation...');
    const sampleBalance = await pool.query(`
      SELECT 
        total_balance,
        profit_balance,
        deposit_balance,
        bonus_balance,
        credit_score_balance,
        card_balance
      FROM user_balances 
      LIMIT 1
    `);

    if (sampleBalance.rows.length > 0) {
      const balance = sampleBalance.rows[0];
      const newCalculatedTotal = parseFloat(balance.deposit_balance || 0) + 
                                parseFloat(balance.profit_balance || 0) + 
                                parseFloat(balance.bonus_balance || 0) + 
                                parseFloat(balance.card_balance || 0);
      
      console.log('Sample balance calculation:');
      console.log(`   Deposit: $${parseFloat(balance.deposit_balance || 0).toFixed(2)}`);
      console.log(`   Profit: $${parseFloat(balance.profit_balance || 0).toFixed(2)}`);
      console.log(`   Bonus: $${parseFloat(balance.bonus_balance || 0).toFixed(2)}`);
      console.log(`   Card: $${parseFloat(balance.card_balance || 0).toFixed(2)}`);
      console.log(`   Credit Score: ${balance.credit_score_balance} (excluded from total)`);
      console.log(`   New Total: $${newCalculatedTotal.toFixed(2)}`);
      console.log(`   Current Stored Total: $${parseFloat(balance.total_balance || 0).toFixed(2)}`);
    }

    console.log('\n🎉 Card Balance Migration Completed Successfully!');
    console.log('✅ card_balance column added to user_balances table');
    console.log('✅ Existing users initialized with $0.00 card balance');
    console.log('✅ Database schema is ready for card balance feature');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update balance APIs to include card_balance');
    console.log('2. Update balance calculation logic');
    console.log('3. Add card balance to admin interface');
    console.log('4. Add card balance card to frontend');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addCardBalanceMigration();
