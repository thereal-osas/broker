#!/usr/bin/env node

/**
 * Fix Transaction Constraints
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixTransactionConstraints() {
  console.log('🔧 Fixing Transaction Constraints');
  console.log('=================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check existing transaction types
    console.log('📋 Checking Existing Transaction Types');
    console.log('=====================================');
    
    const existingTypes = await pool.query(`
      SELECT DISTINCT type, COUNT(*) as count
      FROM transactions 
      GROUP BY type
      ORDER BY count DESC
    `);
    
    console.log('Current transaction types:');
    existingTypes.rows.forEach(row => {
      console.log(`   ${row.type}: ${row.count} records`);
    });
    
    // Check for problematic types
    const allowedTypes = ['deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment'];
    const problematicTypes = existingTypes.rows.filter(row => !allowedTypes.includes(row.type));
    
    if (problematicTypes.length > 0) {
      console.log('\nProblematic transaction types found:');
      problematicTypes.forEach(row => {
        console.log(`   ${row.type}: ${row.count} records`);
      });
      
      // Fix problematic types
      for (const type of problematicTypes) {
        console.log(`\nFixing transaction type: ${type.type}`);
        
        // Map problematic types to valid ones
        let newType = 'admin_funding'; // default fallback
        
        if (type.type.includes('investment') || type.type.includes('trade')) {
          newType = 'investment';
        } else if (type.type.includes('withdrawal')) {
          newType = 'withdrawal';
        } else if (type.type.includes('deposit')) {
          newType = 'deposit';
        } else if (type.type.includes('profit')) {
          newType = 'profit';
        } else if (type.type.includes('bonus')) {
          newType = 'bonus';
        }
        
        const updateResult = await pool.query(`
          UPDATE transactions 
          SET type = $1 
          WHERE type = $2
        `, [newType, type.type]);
        
        console.log(`✅ Updated ${updateResult.rowCount} records from '${type.type}' to '${newType}'`);
      }
    } else {
      console.log('✅ All transaction types are valid');
    }
    
    // Now try to add the constraint
    console.log('\n📋 Adding Transaction Type Constraint');
    console.log('====================================');
    
    try {
      await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check');
      await pool.query(`
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
        CHECK (type IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment'))
      `);
      console.log('✅ Transaction type constraint added successfully');
    } catch (error) {
      console.log('❌ Failed to add constraint:', error.message);
      
      // Check what types are still problematic
      const stillProblematic = await pool.query(`
        SELECT DISTINCT type 
        FROM transactions 
        WHERE type NOT IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment')
      `);
      
      if (stillProblematic.rows.length > 0) {
        console.log('Still problematic types:');
        stillProblematic.rows.forEach(row => {
          console.log(`   ${row.type}`);
        });
      }
    }
    
    // Test transaction creation
    console.log('\n📋 Testing Transaction Creation');
    console.log('==============================');
    
    try {
      await pool.query('BEGIN');
      
      // Test each allowed type
      const testTypes = ['investment', 'live_trade_investment', 'deposit', 'withdrawal'];
      
      for (const testType of testTypes) {
        await pool.query(`
          INSERT INTO transactions (user_id, type, amount, balance_type, description)
          VALUES ($1, $2, $3, $4, $5)
        `, ['00000000-0000-0000-0000-000000000000', testType, 1.00, 'total', `Test ${testType}`]);
        console.log(`✅ ${testType} transaction creation works`);
      }
      
      await pool.query('ROLLBACK');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Transaction creation test failed:', error.message);
    }
    
    console.log('\n🎉 Transaction Constraints Fix Complete!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

fixTransactionConstraints();
