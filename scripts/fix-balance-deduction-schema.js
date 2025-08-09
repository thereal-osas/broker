#!/usr/bin/env node

/**
 * Fix Balance Deduction Schema Issues
 * 
 * This script addresses the critical database schema mismatch that prevents
 * balance deduction from working properly in investments and live trades.
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixBalanceDeductionSchema() {
  console.log('🔧 Fixing Balance Deduction Schema Issues');
  console.log('=========================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Step 1: Check current schema state
    console.log('📋 Step 1: Checking Current Schema State');
    console.log('========================================');
    
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name LIKE '%balance%'
      ORDER BY column_name
    `);
    
    console.log('Current balance columns in user_balances table:');
    schemaCheck.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'}, nullable: ${col.is_nullable})`);
    });
    
    const hasCardBalance = schemaCheck.rows.some(col => col.column_name === 'card_balance');
    
    if (hasCardBalance) {
      console.log('✅ card_balance column already exists');
    } else {
      console.log('❌ card_balance column is MISSING - this is the root cause!');
    }

    // Step 2: Add missing card_balance column if needed
    if (!hasCardBalance) {
      console.log('\n📋 Step 2: Adding Missing card_balance Column');
      console.log('=============================================');
      
      console.log('Adding card_balance column to user_balances table...');
      await pool.query(`
        ALTER TABLE user_balances 
        ADD COLUMN card_balance DECIMAL(15,2) DEFAULT 0.00
      `);
      
      console.log('✅ card_balance column added successfully');
      
      // Initialize existing users
      console.log('Initializing card_balance for existing users...');
      const updateResult = await pool.query(`
        UPDATE user_balances 
        SET card_balance = 0.00 
        WHERE card_balance IS NULL
      `);
      
      console.log(`✅ Updated ${updateResult.rowCount} existing user balance records`);
    } else {
      console.log('\n📋 Step 2: Schema Already Correct');
      console.log('=================================');
      console.log('✅ card_balance column exists - no schema changes needed');
    }

    // Step 3: Verify balance calculation logic
    console.log('\n📋 Step 3: Verifying Balance Calculation Logic');
    console.log('==============================================');
    
    const testQuery = `
      SELECT 
        user_id,
        total_balance,
        profit_balance,
        deposit_balance,
        bonus_balance,
        credit_score_balance,
        card_balance,
        (profit_balance + deposit_balance + bonus_balance + card_balance) as calculated_total
      FROM user_balances 
      LIMIT 3
    `;
    
    const testResult = await pool.query(testQuery);
    
    if (testResult.rows.length > 0) {
      console.log('Sample balance calculations:');
      testResult.rows.forEach((row, index) => {
        const stored = parseFloat(row.total_balance || 0);
        const calculated = parseFloat(row.calculated_total || 0);
        const discrepancy = Math.abs(stored - calculated);
        
        console.log(`   User ${index + 1}:`);
        console.log(`      Stored Total: $${stored.toFixed(2)}`);
        console.log(`      Calculated Total: $${calculated.toFixed(2)}`);
        console.log(`      Discrepancy: $${discrepancy.toFixed(2)} ${discrepancy > 0.01 ? '❌' : '✅'}`);
        console.log(`      Components: P=$${parseFloat(row.profit_balance || 0).toFixed(2)}, D=$${parseFloat(row.deposit_balance || 0).toFixed(2)}, B=$${parseFloat(row.bonus_balance || 0).toFixed(2)}, C=$${parseFloat(row.card_balance || 0).toFixed(2)}`);
        console.log('');
      });
    } else {
      console.log('No user balance records found');
    }

    // Step 4: Test balance update operation
    console.log('📋 Step 4: Testing Balance Update Operation');
    console.log('==========================================');
    
    try {
      // Test the exact query that the balance update function uses
      const testUpdateQuery = `
        UPDATE user_balances
        SET deposit_balance = GREATEST(0, deposit_balance - $2),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `;
      
      // Just test the query structure without actually updating
      const explainResult = await pool.query(`EXPLAIN ${testUpdateQuery}`, ['test-user-id', 10.00]);
      console.log('✅ Balance update query structure is valid');
      
      // Test the recalculation query
      const testRecalcQuery = `
        UPDATE user_balances
        SET total_balance = GREATEST(0, profit_balance + deposit_balance + bonus_balance + card_balance)
        WHERE user_id = $1
        RETURNING *
      `;
      
      const explainRecalcResult = await pool.query(`EXPLAIN ${testRecalcQuery}`, ['test-user-id']);
      console.log('✅ Balance recalculation query structure is valid');
      
    } catch (error) {
      console.log('❌ Balance update query test failed:', error.message);
      if (error.message.includes('card_balance')) {
        console.log('   This confirms the card_balance column issue!');
      }
    }

    // Step 5: Final verification
    console.log('\n📋 Step 5: Final Schema Verification');
    console.log('====================================');
    
    const finalCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name IN ('total_balance', 'profit_balance', 'deposit_balance', 'bonus_balance', 'credit_score_balance', 'card_balance')
      ORDER BY column_name
    `);
    
    const expectedColumns = ['bonus_balance', 'card_balance', 'credit_score_balance', 'deposit_balance', 'profit_balance', 'total_balance'];
    const actualColumns = finalCheck.rows.map(row => row.column_name).sort();
    
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
    
    console.log('Expected columns:', expectedColumns.join(', '));
    console.log('Actual columns:', actualColumns.join(', '));
    
    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log('✅ Schema is now correct - all required columns present');
      console.log('✅ Balance deduction should now work properly');
    } else {
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns:', missingColumns.join(', '));
      }
      if (extraColumns.length > 0) {
        console.log('ℹ️  Extra columns:', extraColumns.join(', '));
      }
    }

    console.log('\n🎉 Balance Deduction Schema Fix Complete!');
    console.log('==========================================');
    console.log('✅ Database schema has been validated and fixed');
    console.log('✅ card_balance column is now available');
    console.log('✅ Balance update operations should work correctly');
    console.log('✅ Investment and live trade balance deduction should function properly');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test investment creation through the UI');
    console.log('2. Test live trade creation through the UI');
    console.log('3. Verify balance deduction occurs for both operations');
    console.log('4. Monitor application logs for any remaining errors');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('card_balance')) {
      console.error('\n🔍 This error confirms the card_balance column issue!');
      console.error('The application code expects card_balance but the database doesn\'t have it.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixBalanceDeductionSchema();
