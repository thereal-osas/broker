#!/usr/bin/env node

/**
 * Check and fix database schema issues
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function checkAndFixSchema() {
  console.log('🔧 Checking and Fixing Database Schema');
  console.log('=====================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // 1. Check current users table structure
    console.log('📋 Checking users table structure...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // 2. Check for missing columns and add them
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    const requiredColumns = [
      { name: 'is_verified', type: 'BOOLEAN', default: 'false' },
      { name: 'verification_token', type: 'VARCHAR(255)', default: 'NULL' },
      { name: 'phone', type: 'VARCHAR(20)', default: 'NULL' },
      { name: 'referral_code', type: 'VARCHAR(50)', default: 'NULL' },
      { name: 'referred_by', type: 'UUID', default: 'NULL' }
    ];
    
    console.log('\n🔧 Adding missing columns...');
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Adding column: ${col.name}`);
        try {
          await client.query(`
            ALTER TABLE users 
            ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}
          `);
          console.log(`✅ Added ${col.name} column`);
        } catch (error) {
          console.log(`❌ Failed to add ${col.name}: ${error.message}`);
        }
      } else {
        console.log(`✅ Column ${col.name} already exists`);
      }
    }
    
    // 3. Update all users to be verified (for testing)
    console.log('\n🔧 Setting all users as verified...');
    await client.query('UPDATE users SET is_verified = true WHERE is_verified IS NULL OR is_verified = false');
    console.log('✅ All users are now verified');
    
    // 4. Check existing users
    console.log('\n👥 Current Users:');
    const usersResult = await client.query(`
      SELECT id, email, first_name, last_name, role, is_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found! Creating test users...');
      
      // Create admin user
      const adminPassword = await bcrypt.hash('Admin123!', 12);
      await client.query(`
        INSERT INTO users (
          email, password, first_name, last_name, role, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, [
        'admin@broker.com',
        adminPassword,
        'Admin',
        'User',
        'admin',
        true
      ]);
      
      // Create investor user
      const investorPassword = await bcrypt.hash('password123', 12);
      await client.query(`
        INSERT INTO users (
          email, password, first_name, last_name, role, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, [
        'john@gmail.com',
        investorPassword,
        'John',
        'Doe',
        'investor',
        true
      ]);
      
      console.log('✅ Created test users');
    } else {
      console.log(`Found ${usersResult.rows.length} users:`);
      usersResult.rows.forEach((user, i) => {
        console.log(`${i+1}. ${user.email} (${user.role}) - Verified: ${user.is_verified}`);
      });
    }
    
    // 5. Test login credentials
    console.log('\n🔐 Testing Login Credentials:');
    
    const testCredentials = [
      { email: 'admin@broker.com', password: 'Admin123!' },
      { email: 'john@gmail.com', password: 'password123' },
    ];
    
    for (const cred of testCredentials) {
      try {
        const userResult = await client.query(
          'SELECT id, email, password, role, is_verified FROM users WHERE email = $1',
          [cred.email]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          
          if (!user.is_verified) {
            console.log(`❌ ${cred.email} - User not verified`);
            continue;
          }
          
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
    
    console.log('\n✅ Database schema check and fix completed!');
    console.log('\n📋 Login Instructions:');
    console.log('Admin Login:');
    console.log('  Email: admin@broker.com');
    console.log('  Password: Admin123!');
    console.log('');
    console.log('Investor Login:');
    console.log('  Email: john@gmail.com');
    console.log('  Password: password123');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  checkAndFixSchema();
}

module.exports = { checkAndFixSchema };
