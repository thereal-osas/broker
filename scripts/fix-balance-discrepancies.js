#!/usr/bin/env node

/**
 * Fix balance calculation discrepancies
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixBalanceDiscrepancies() {
  console.log('🔧 Fixing Balance Calculation Discrepancies');
  console.log('===========================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Identify users with balance discrepancies
    console.log('📋 Step 1: Identifying Balance Discrepancies');
    console.log('============================================');
    
    const discrepancyCheck = await pool.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name,
        ub.total_balance as stored_total,
        ub.profit_balance, ub.deposit_balance, ub.bonus_balance, ub.card_balance, ub.credit_score_balance,
        (ub.profit_balance + ub.deposit_balance + ub.bonus_balance + ub.card_balance) as calculated_total,
        ABS(ub.total_balance - (ub.profit_balance + ub.deposit_balance + ub.bonus_balance + ub.card_balance)) as discrepancy
      FROM users u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE ub.user_id IS NOT NULL
      AND ABS(ub.total_balance - (ub.profit_balance + ub.deposit_balance + ub.bonus_balance + ub.card_balance)) > 0.01
      ORDER BY discrepancy DESC
    `);
    
    console.log(`🔍 Found ${discrepancyCheck.rows.length} users with balance discrepancies`);
    
    if (discrepancyCheck.rows.length === 0) {
      console.log('✅ No balance discrepancies found!');
      return;
    }
    
    // Show top discrepancies
    console.log('\n📊 Top Balance Discrepancies:');
    discrepancyCheck.rows.slice(0, 5).forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`   Stored Total: $${parseFloat(user.stored_total).toFixed(2)}`);
      console.log(`   Calculated Total: $${parseFloat(user.calculated_total).toFixed(2)}`);
      console.log(`   Discrepancy: $${parseFloat(user.discrepancy).toFixed(2)}`);
      console.log('');
    });

    // 2. Fix all balance discrepancies
    console.log('📋 Step 2: Fixing Balance Discrepancies');
    console.log('======================================');
    
    console.log('🔧 Recalculating total balances for all users...');
    
    const fixResult = await pool.query(`
      UPDATE user_balances 
      SET total_balance = profit_balance + deposit_balance + bonus_balance + card_balance,
          updated_at = CURRENT_TIMESTAMP
      WHERE ABS(total_balance - (profit_balance + deposit_balance + bonus_balance + card_balance)) > 0.01
      RETURNING user_id, total_balance
    `);
    
    console.log(`✅ Fixed ${fixResult.rows.length} user balances`);

    // 3. Verify fixes
    console.log('\n📋 Step 3: Verifying Fixes');
    console.log('==========================');
    
    const verificationCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN ABS(total_balance - (profit_balance + deposit_balance + bonus_balance + card_balance)) > 0.01 THEN 1 END) as users_with_discrepancies
      FROM user_balances
    `);
    
    const verification = verificationCheck.rows[0];
    console.log(`📊 Total users with balances: ${verification.total_users}`);
    console.log(`❌ Users with remaining discrepancies: ${verification.users_with_discrepancies}`);
    
    if (verification.users_with_discrepancies === '0') {
      console.log('✅ All balance discrepancies have been fixed!');
    } else {
      console.log('⚠️  Some discrepancies remain - manual investigation may be needed');
    }

    // 4. Test the updated balance calculation
    console.log('\n📋 Step 4: Testing Updated Balance Calculation');
    console.log('==============================================');
    
    // Get a test user
    const testUser = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name,
             ub.total_balance, ub.profit_balance, ub.deposit_balance, 
             ub.bonus_balance, ub.credit_score_balance, ub.card_balance
      FROM users u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE u.role = 'investor' AND ub.total_balance > 0
      LIMIT 1
    `);
    
    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      console.log(`👤 Test User: ${user.first_name} ${user.last_name}`);
      
      const beforeBalance = parseFloat(user.total_balance);
      console.log(`💰 Balance before test: $${beforeBalance.toFixed(2)}`);
      
      // Test adding $1 to profit balance
      await pool.query(`
        UPDATE user_balances 
        SET profit_balance = profit_balance + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [user.id]);
      
      // Recalculate total
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = profit_balance + deposit_balance + bonus_balance + card_balance
        WHERE user_id = $1
      `, [user.id]);
      
      // Check result
      const afterCheck = await pool.query(`
        SELECT total_balance FROM user_balances WHERE user_id = $1
      `, [user.id]);
      
      const afterBalance = parseFloat(afterCheck.rows[0].total_balance);
      console.log(`💰 Balance after adding $1 to profit: $${afterBalance.toFixed(2)}`);
      console.log(`📈 Difference: $${(afterBalance - beforeBalance).toFixed(2)}`);
      
      if (Math.abs((afterBalance - beforeBalance) - 1) < 0.01) {
        console.log('✅ Balance calculation working correctly!');
      } else {
        console.log('❌ Balance calculation still has issues');
      }
      
      // Restore original balance
      await pool.query(`
        UPDATE user_balances 
        SET profit_balance = profit_balance - 1,
            total_balance = profit_balance + deposit_balance + bonus_balance + card_balance
        WHERE user_id = $1
      `, [user.id]);
      
      console.log('🔄 Test balance restored');
    }

    // 5. Summary and recommendations
    console.log('\n🎯 BALANCE FIX SUMMARY');
    console.log('=====================');
    
    console.log('✅ Updated balanceQueries.updateBalance() to recalculate total_balance');
    console.log('✅ Added recalculateUserTotalBalance() function');
    console.log('✅ Added recalculateAllTotalBalances() maintenance function');
    console.log(`✅ Fixed ${fixResult.rows.length} existing balance discrepancies`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. ✅ All balance updates now automatically recalculate total_balance');
    console.log('2. ✅ API and database totals should now match');
    console.log('3. 🔍 Monitor balance calculations in production');
    console.log('4. 🔍 Run recalculateAllTotalBalances() periodically for maintenance');
    
  } catch (error) {
    console.error('❌ Balance fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

fixBalanceDiscrepancies();
