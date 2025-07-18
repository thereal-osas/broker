#!/usr/bin/env node

/**
 * Add transaction_hash column to deposit_requests table
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function addTransactionHashColumn() {
  console.log('🔧 Adding transaction_hash column to deposit_requests table...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'deposit_requests' 
      AND column_name = 'transaction_hash'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ transaction_hash column already exists');
      client.release();
      return;
    }
    
    // Add the column
    await client.query(`
      ALTER TABLE deposit_requests 
      ADD COLUMN transaction_hash VARCHAR(255)
    `);
    
    console.log('✅ transaction_hash column added successfully');
    
    // Add index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deposit_requests_transaction_hash 
      ON deposit_requests(transaction_hash)
    `);
    
    console.log('✅ Index created for transaction_hash column');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error adding column:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addTransactionHashColumn();
}

module.exports = { addTransactionHashColumn };
