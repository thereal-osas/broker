#!/usr/bin/env node

/**
 * Create email verification tokens table
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function createEmailVerificationTable() {
  console.log('🔧 Creating email verification tokens table...');
  
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
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
      );
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id 
      ON email_verification_tokens(user_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token 
      ON email_verification_tokens(token);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at 
      ON email_verification_tokens(expires_at);
    `);
    
    console.log('✅ Email verification tokens table created successfully');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createEmailVerificationTable();
}

module.exports = { createEmailVerificationTable };
