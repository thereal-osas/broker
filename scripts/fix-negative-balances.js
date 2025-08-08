#!/usr/bin/env node

/**
 * Script to fix negative balance issues in the database
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixNegativeBalances() {
  console.log('🔧 Fixing Negative Balance Issues');
  console.log('=================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Check for negative balances before fixing
    console.log('📋 Step 1: Checking for Negative Balances');
    console.log('==========================================');
    
    const negativeCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN profit_balance < 0 THEN 1 END) as negative_profit,
        COUNT(CASE WHEN deposit_balance < 0 THEN 1 END) as negative_deposit,
        COUNT(CASE WHEN bonus_balance < 0 THEN 1 END) as negative_bonus,
        COUNT(CASE WHEN card_balance < 0 THEN 1 END) as negative_card,
        COUNT(CASE WHEN total_balance < 0 THEN 1 END) as negative_total
      FROM user_balances
    `);
    
    const stats = negativeCheck.rows[0];
    console.log(`Total users: ${stats.total_users}`);
    console.log(`Users with negative profit balance: ${stats.negative_profit}`);
    console.log(`Users with negative deposit balance: ${stats.negative_deposit}`);
    console.log(`Users with negative bonus balance: ${stats.negative_bonus}`);
    console.log(`Users with negative card balance: ${stats.negative_card}`);
    console.log(`Users with negative total balance: ${stats.negative_total}`);

    // 2. Fix negative individual balances
    console.log('\n📋 Step 2: Fixing Negative Individual Balances');
    console.log('==============================================');
    
    const fixIndividualBalances = await pool.query(`
      UPDATE user_balances 
      SET 
        profit_balance = GREATEST(0, profit_balance),
        deposit_balance = GREATEST(0, deposit_balance),
        bonus_balance = GREATEST(0, bonus_balance),
        card_balance = GREATEST(0, card_balance),
        updated_at = CURRENT_TIMESTAMP
      WHERE profit_balance < 0 
         OR deposit_balance < 0 
         OR bonus_balance < 0 
         OR card_balance < 0
      RETURNING user_id
    `);
    
    console.log(`✅ Fixed negative balances for ${fixIndividualBalances.rows.length} users`);

    // 3. Recalculate all total balances
    console.log('\n📋 Step 3: Recalculating Total Balances');
    console.log('=======================================');
    
    const recalculateResult = await pool.query(`
      UPDATE user_balances 
      SET total_balance = GREATEST(0, profit_balance + deposit_balance + bonus_balance + card_balance),
          updated_at = CURRENT_TIMESTAMP
      RETURNING user_id, total_balance
    `);
    
    console.log(`✅ Recalculated total balances for ${recalculateResult.rows.length} users`);

    // 4. Verify fixes
    console.log('\n📋 Step 4: Verifying Fixes');
    console.log('==========================');
    
    const verificationCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN profit_balance < 0 THEN 1 END) as negative_profit,
        COUNT(CASE WHEN deposit_balance < 0 THEN 1 END) as negative_deposit,
        COUNT(CASE WHEN bonus_balance < 0 THEN 1 END) as negative_bonus,
        COUNT(CASE WHEN card_balance < 0 THEN 1 END) as negative_card,
        COUNT(CASE WHEN total_balance < 0 THEN 1 END) as negative_total,
        COUNT(CASE WHEN ABS(total_balance - (profit_balance + deposit_balance + bonus_balance + card_balance)) > 0.01 THEN 1 END) as discrepancies
      FROM user_balances
    `);
    
    const verifyStats = verificationCheck.rows[0];
    console.log(`Total users: ${verifyStats.total_users}`);
    console.log(`Users with negative profit balance: ${verifyStats.negative_profit}`);
    console.log(`Users with negative deposit balance: ${verifyStats.negative_deposit}`);
    console.log(`Users with negative bonus balance: ${verifyStats.negative_bonus}`);
    console.log(`Users with negative card balance: ${verifyStats.negative_card}`);
    console.log(`Users with negative total balance: ${verifyStats.negative_total}`);
    console.log(`Users with balance discrepancies: ${verifyStats.discrepancies}`);

    // 5. Sample data after fixes
    console.log('\n📋 Step 5: Sample Data After Fixes');
    console.log('==================================');
    
    const sampleData = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        u.last_name,
        ub.total_balance,
        ub.profit_balance,
        ub.deposit_balance,
        ub.bonus_balance,
        ub.card_balance,
        ub.credit_score_balance
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      ORDER BY ub.updated_at DESC
      LIMIT 3
    `);
    
    console.log('Sample balance records after fixes:');
    sampleData.rows.forEach(user => {
      console.log(`   👤 ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`      Total: $${parseFloat(user.total_balance || 0).toFixed(2)}`);
      console.log(`      Profit: $${parseFloat(user.profit_balance || 0).toFixed(2)}`);
      console.log(`      Deposit: $${parseFloat(user.deposit_balance || 0).toFixed(2)}`);
      console.log(`      Bonus: $${parseFloat(user.bonus_balance || 0).toFixed(2)}`);
      console.log(`      Card: $${parseFloat(user.card_balance || 0).toFixed(2)}`);
      console.log(`      Credit Score: ${user.credit_score_balance}`);
      console.log('');
    });

    if (verifyStats.negative_profit === '0' && 
        verifyStats.negative_deposit === '0' && 
        verifyStats.negative_bonus === '0' && 
        verifyStats.negative_card === '0' && 
        verifyStats.negative_total === '0' && 
        verifyStats.discrepancies === '0') {
      console.log('🎉 All balance issues have been successfully fixed!');
      console.log('✅ No negative balances found');
      console.log('✅ No balance discrepancies found');
      console.log('✅ Database is now consistent');
    } else {
      console.log('⚠️  Some issues may still exist. Please review the verification results above.');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixNegativeBalances();
