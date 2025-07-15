#!/usr/bin/env node

/**
 * Create new admin user with specified credentials
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function createNewAdmin() {
  console.log('🔄 Creating new admin user...');
  console.log('=====================================\n');
  
  // New admin credentials
  const newAdmin = {
    email: 'admin@broker.com',
    password: 'Admin123',
    firstName: 'Admin',
    lastName: 'User'
  };
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // Show current admin users
    const currentAdmins = await client.query(`
      SELECT id, email, first_name, last_name FROM users WHERE role = 'admin'
    `);
    
    console.log('📋 Current admin users:');
    currentAdmins.rows.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.email} (${admin.first_name} ${admin.last_name})`);
    });
    
    console.log('\n🗑️  Removing existing admin users...');

    // Delete existing admin users and their related data
    for (const admin of currentAdmins.rows) {
      // Delete newsletters authored by this admin first
      const newsletterResult = await client.query('DELETE FROM newsletters WHERE author_id = $1', [admin.id]);
      if (newsletterResult.rowCount > 0) {
        console.log(`   ✅ Deleted ${newsletterResult.rowCount} newsletter(s) for ${admin.email}`);
      }

      // Delete user balance
      await client.query('DELETE FROM user_balances WHERE user_id = $1', [admin.id]);
      console.log(`   ✅ Deleted balance for ${admin.email}`);

      // Delete user
      await client.query('DELETE FROM users WHERE id = $1', [admin.id]);
      console.log(`   ✅ Deleted user ${admin.email}`);
    }
    
    console.log('\n👤 Creating new admin user...');
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Password: ${newAdmin.password}`);
    console.log(`   Name: ${newAdmin.firstName} ${newAdmin.lastName}`);
    
    // Generate referral code
    const referralCode = 'ADMIN' + Date.now().toString().substring(8);
    
    // Create new admin user
    const newAdminResult = await client.query(`
      INSERT INTO users (
        email, password, first_name, last_name, role, 
        is_active, email_verified, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email
    `, [
      newAdmin.email.toLowerCase().trim(),
      newAdmin.password,
      newAdmin.firstName.trim(),
      newAdmin.lastName.trim(),
      'admin',
      true,
      true,
      referralCode
    ]);
    
    const createdAdmin = newAdminResult.rows[0];
    
    // Create admin user balance
    await client.query(`
      INSERT INTO user_balances (
        user_id, total_balance, profit_balance, deposit_balance, 
        bonus_balance, credit_score_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [createdAdmin.id, 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    console.log('\n✅ New admin user created successfully!');
    console.log(`   ID: ${createdAdmin.id}`);
    console.log(`   Email: ${createdAdmin.email}`);
    console.log(`   Referral Code: ${referralCode}`);
    
    console.log('\n🧪 Testing login credentials...');
    
    // Test the new credentials
    const testUser = await client.query(`
      SELECT * FROM users WHERE email = $1 AND password = $2 AND role = 'admin'
    `, [newAdmin.email.toLowerCase().trim(), newAdmin.password]);
    
    if (testUser.rows.length > 0) {
      console.log('✅ Login test successful - credentials work correctly!');
      console.log(`   User found: ${testUser.rows[0].first_name} ${testUser.rows[0].last_name}`);
      console.log(`   Active: ${testUser.rows[0].is_active}`);
      console.log(`   Email verified: ${testUser.rows[0].email_verified}`);
    } else {
      console.log('❌ Login test failed - there may be an issue');
    }
    
    client.release();
    console.log('\n🎉 Admin user replacement completed successfully!');
    console.log('\n📝 Login Details:');
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Password: ${newAdmin.password}`);
    console.log('\n⚠️  Please test login in your application now.');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createNewAdmin();
}

module.exports = { createNewAdmin };
