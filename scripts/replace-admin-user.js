#!/usr/bin/env node

/**
 * Replace admin user with new credentials
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function replaceAdminUser() {
  console.log('🔄 Admin User Replacement Tool');
  console.log('=====================================\n');
  
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
    
    // Get new admin details
    console.log('\n📝 Enter new admin user details:');
    const email = await askQuestion('Email: ');
    const password = await askQuestion('Password: ');
    const firstName = await askQuestion('First Name: ');
    const lastName = await askQuestion('Last Name: ');
    
    // Confirm replacement
    console.log('\n⚠️  This will:');
    console.log('   1. Delete all existing admin users');
    console.log('   2. Create a new admin user with the provided credentials');
    console.log(`   3. New admin: ${email} (${firstName} ${lastName})`);
    
    const confirm = await askQuestion('\nProceed? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Operation cancelled');
      rl.close();
      return;
    }
    
    console.log('\n🗑️  Removing existing admin users...');
    
    // Delete existing admin users and their balances
    for (const admin of currentAdmins.rows) {
      // Delete user balance first (foreign key constraint)
      await client.query('DELETE FROM user_balances WHERE user_id = $1', [admin.id]);
      console.log(`   ✅ Deleted balance for ${admin.email}`);
      
      // Delete user
      await client.query('DELETE FROM users WHERE id = $1', [admin.id]);
      console.log(`   ✅ Deleted user ${admin.email}`);
    }
    
    console.log('\n👤 Creating new admin user...');
    
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
      email.toLowerCase().trim(),
      password,
      firstName.trim(),
      lastName.trim(),
      'admin',
      true,
      true,
      referralCode
    ]);
    
    const newAdmin = newAdminResult.rows[0];
    
    // Create admin user balance
    await client.query(`
      INSERT INTO user_balances (
        user_id, total_balance, profit_balance, deposit_balance, 
        bonus_balance, credit_score_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [newAdmin.id, 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    console.log('✅ New admin user created successfully!');
    console.log(`   ID: ${newAdmin.id}`);
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Referral Code: ${referralCode}`);
    
    console.log('\n🧪 Testing login credentials...');
    
    // Test the new credentials
    const testUser = await client.query(`
      SELECT * FROM users WHERE email = $1 AND password = $2 AND role = 'admin'
    `, [email.toLowerCase().trim(), password]);
    
    if (testUser.rows.length > 0) {
      console.log('✅ Login test successful - credentials work correctly!');
    } else {
      console.log('❌ Login test failed - there may be an issue');
    }
    
    client.release();
    console.log('\n🎉 Admin user replacement completed successfully!');
    console.log('\n📝 Login Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Please test login in your application now.');
    
  } catch (error) {
    console.error('❌ Error replacing admin user:', error.message);
  } finally {
    await pool.end();
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  replaceAdminUser();
}

module.exports = { replaceAdminUser };
