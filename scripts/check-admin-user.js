#!/usr/bin/env node

/**
 * Check current admin user in database
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function checkAdminUser() {
  console.log('👤 Checking current admin user...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // Get all admin users
    const adminResult = await client.query(`
      SELECT id, email, password, first_name, last_name, role, is_active, email_verified, referral_code, created_at
      FROM users 
      WHERE role = 'admin'
      ORDER BY created_at
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} admin user(s):`);
    
    adminResult.rows.forEach((admin, index) => {
      console.log(`\n👤 Admin ${index + 1}:`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}`);
      console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
      console.log(`   Active: ${admin.is_active}`);
      console.log(`   Email Verified: ${admin.email_verified}`);
      console.log(`   Referral Code: ${admin.referral_code}`);
      console.log(`   Created: ${admin.created_at}`);
    });
    
    // Check if there are any users with the expected email
    const credCryptoAdmin = await client.query(`
      SELECT * FROM users WHERE email = 'admin@credcrypto.com'
    `);
    
    if (credCryptoAdmin.rows.length > 0) {
      console.log('\n🔍 Found admin@credcrypto.com user:');
      const user = credCryptoAdmin.rows[0];
      console.log(`   Password in DB: "${user.password}"`);
      console.log(`   Expected: "Admin123!@#"`);
      console.log(`   Match: ${user.password === 'Admin123!@#'}`);
    } else {
      console.log('\n❌ No user found with email admin@credcrypto.com');
    }
    
    // Check all users to see what's in the database
    const allUsers = await client.query(`
      SELECT email, role, is_active FROM users ORDER BY created_at
    `);
    
    console.log(`\n📋 All users in database (${allUsers.rows.length} total):`);
    allUsers.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - Active: ${user.is_active}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking admin user:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  checkAdminUser();
}

module.exports = { checkAdminUser };
