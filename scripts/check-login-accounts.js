#!/usr/bin/env node

/**
 * Check existing user accounts and help with login issues
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function checkLoginAccounts() {
  console.log('🔍 Checking User Accounts for Login Issues');
  console.log('==========================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // 1. Check if users table exists
    console.log('📋 Checking database structure...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Users table does not exist!');
      console.log('   You need to run database migrations first.');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // 2. Get all users
    console.log('\n👥 Existing User Accounts:');
    const usersResult = await client.query(`
      SELECT id, email, first_name, last_name, role, is_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found in database!');
      console.log('   You need to create user accounts first.');
      
      // Create a test admin user
      console.log('\n🔧 Creating test admin user...');
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      
      await client.query(`
        INSERT INTO users (
          email, password, first_name, last_name, role, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin@broker.com',
        hashedPassword,
        'Admin',
        'User',
        'admin',
        true
      ]);
      
      console.log('✅ Created admin user:');
      console.log('   Email: admin@broker.com');
      console.log('   Password: Admin123!');
      
      // Create a test investor user
      console.log('\n🔧 Creating test investor user...');
      const investorPassword = await bcrypt.hash('password123', 12);
      
      await client.query(`
        INSERT INTO users (
          email, password, first_name, last_name, role, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'john@gmail.com',
        investorPassword,
        'John',
        'Doe',
        'investor',
        true
      ]);
      
      console.log('✅ Created investor user:');
      console.log('   Email: john@gmail.com');
      console.log('   Password: password123');
      
    } else {
      console.log(`Found ${usersResult.rows.length} users:`);
      usersResult.rows.forEach((user, i) => {
        console.log(`${i+1}. ${user.email} (${user.role})`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Verified: ${user.is_verified ? 'Yes' : 'No'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log('');
      });
    }
    
    // 3. Test password verification for common accounts
    console.log('\n🔐 Testing Common Login Credentials:');
    
    const testCredentials = [
      { email: 'admin@broker.com', password: 'Admin123!' },
      { email: 'admin@broker.com', password: 'admin123' },
      { email: 'john@gmail.com', password: 'password123' },
      { email: 'john@gmail.com', password: 'john123' },
    ];
    
    for (const cred of testCredentials) {
      try {
        const userResult = await client.query(
          'SELECT id, email, password, role FROM users WHERE email = $1',
          [cred.email]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          const isValid = await bcrypt.compare(cred.password, user.password);
          
          console.log(`${isValid ? '✅' : '❌'} ${cred.email} / ${cred.password} - ${isValid ? 'VALID' : 'Invalid'}`);
          
          if (isValid) {
            console.log(`   → Role: ${user.role}`);
            console.log(`   → User ID: ${user.id}`);
          }
        } else {
          console.log(`❌ ${cred.email} - User not found`);
        }
      } catch (error) {
        console.log(`❌ ${cred.email} - Error: ${error.message}`);
      }
    }
    
    // 4. Check for common issues
    console.log('\n🔍 Checking for Common Issues:');
    
    // Check for unverified users
    const unverifiedResult = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE is_verified = false'
    );
    
    if (parseInt(unverifiedResult.rows[0].count) > 0) {
      console.log(`⚠️  ${unverifiedResult.rows[0].count} unverified users found`);
      console.log('   Unverified users cannot log in');
    } else {
      console.log('✅ All users are verified');
    }
    
    // Check password column
    const passwordCheck = await client.query(`
      SELECT email, 
             CASE 
               WHEN password IS NULL THEN 'NULL'
               WHEN password = '' THEN 'EMPTY'
               WHEN LENGTH(password) < 10 THEN 'TOO_SHORT'
               ELSE 'OK'
             END as password_status
      FROM users
    `);
    
    console.log('\n🔐 Password Status Check:');
    passwordCheck.rows.forEach(row => {
      const status = row.password_status === 'OK' ? '✅' : '❌';
      console.log(`${status} ${row.email}: ${row.password_status}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check your DATABASE_URL in .env file');
    console.log('2. Ensure Railway database is accessible');
    console.log('3. Verify database credentials are correct');
    console.log('4. Check if database migrations have been run');
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  checkLoginAccounts();
}

module.exports = { checkLoginAccounts };
