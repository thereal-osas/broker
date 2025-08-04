#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

async function quickFixCardConstraint() {
  console.log('🔧 Quick Fix: Card Balance Transaction Constraint');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Dropping existing constraint...');
    await pool.query(`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_balance_type_check`);
    
    console.log('Adding new constraint with card support...');
    await pool.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT transactions_balance_type_check 
      CHECK (balance_type IN ('total', 'profit', 'deposit', 'bonus', 'credit_score', 'card'))
    `);
    
    console.log('✅ Card balance constraint fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

quickFixCardConstraint();
