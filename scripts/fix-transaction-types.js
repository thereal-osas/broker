#!/usr/bin/env node

/**
 * Fix transaction type constraint to include admin_deduction
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function fixTransactionTypes() {
  console.log('🔧 Fixing transaction type constraint...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // Drop the existing constraint
    console.log('🗑️  Dropping existing constraint...');
    await client.query(`
      ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_type_check
    `);
    
    // Add the new constraint with admin_deduction included
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
        'admin_deduction'
      ))
    `);
    
    console.log('✅ Transaction type constraint updated successfully!');
    console.log('   Added support for: admin_deduction');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixTransactionTypes();
}

module.exports = { fixTransactionTypes };
