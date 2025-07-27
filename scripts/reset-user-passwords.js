#!/usr/bin/env node

/**
 * Reset user passwords for testing
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function resetUserPasswords() {
  console.log('🔐 Resetting User Passwords for Testing');
  console.log('======================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // 1. Reset admin password
    console.log('🔧 Resetting admin password...');
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    
    const adminResult = await client.query(`
      UPDATE users 
      SET password = $1, is_verified = true 
      WHERE email = 'admin@broker.com'
      RETURNING id, email, role
    `, [adminPassword]);
    
    if (adminResult.rows.length > 0) {
      console.log('✅ Admin password reset successfully');
      console.log(`   Email: admin@broker.com`);
      console.log(`   Password: Admin123!`);
      console.log(`   Role: ${adminResult.rows[0].role}`);
    } else {
      console.log('❌ Admin user not found');
    }
    
    // 2. Reset investor password
    console.log('\n🔧 Resetting investor password...');
    const investorPassword = await bcrypt.hash('password123', 12);
    
    const investorResult = await client.query(`
      UPDATE users 
      SET password = $1, is_verified = true 
      WHERE email = 'john@gmail.com'
      RETURNING id, email, role
    `, [investorPassword]);
    
    if (investorResult.rows.length > 0) {
      console.log('✅ Investor password reset successfully');
      console.log(`   Email: john@gmail.com`);
      console.log(`   Password: password123`);
      console.log(`   Role: ${investorResult.rows[0].role}`);
    } else {
      console.log('❌ Investor user not found');
    }
    
    // 3. Test the new passwords
    console.log('\n🧪 Testing New Passwords:');
    
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
            console.log(`   → Verified: ${user.is_verified}`);
          }
        } else {
          console.log(`❌ ${cred.email} - User not found`);
        }
      } catch (error) {
        console.log(`❌ ${cred.email} - Error: ${error.message}`);
      }
    }
    
    // 4. Show all available users for reference
    console.log('\n👥 All Available Users:');
    const allUsersResult = await client.query(`
      SELECT email, role, is_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    
    allUsersResult.rows.forEach((user, i) => {
      const status = user.is_verified ? '✅' : '❌';
      console.log(`${i+1}. ${status} ${user.email} (${user.role})`);
    });
    
    console.log('\n🎯 Ready to Login!');
    console.log('==================');
    console.log('Admin Access:');
    console.log('  URL: http://localhost:3002/auth/signin');
    console.log('  Email: admin@broker.com');
    console.log('  Password: Admin123!');
    console.log('');
    console.log('Investor Access:');
    console.log('  URL: http://localhost:3002/auth/signin');
    console.log('  Email: john@gmail.com');
    console.log('  Password: password123');
    console.log('');
    console.log('After login, you can:');
    console.log('- Admin: Access /admin dashboard');
    console.log('- Investor: Access /dashboard');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  resetUserPasswords();
}

module.exports = { resetUserPasswords };
