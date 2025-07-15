#!/usr/bin/env node

/**
 * Create profit_distributions table
 * Simple script to create the missing table
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function createProfitDistributionsTable() {
  console.log('🔧 Creating profit_distributions table...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // Create the table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profit_distributions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(15,2) NOT NULL,
          profit_amount DECIMAL(15,2) NOT NULL,
          distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id ON profit_distributions(investment_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id ON profit_distributions(user_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profit_distributions_date ON profit_distributions(distribution_date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_date ON profit_distributions(user_id, distribution_date);
    `);
    
    // Skip unique constraint for now due to function immutability issues
    console.log('⚠️  Skipping unique daily constraint due to PostgreSQL function restrictions');
    
    client.release();
    console.log('✅ profit_distributions table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createProfitDistributionsTable();
}

module.exports = { createProfitDistributionsTable };
