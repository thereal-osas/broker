#!/usr/bin/env node

/**
 * Fix login users to ensure they can authenticate properly
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function fixLoginUsers() {
  console.log('🔧 Fixing Login Users');
  console.log('=====================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // 1. Fix john@gmail.com user
    console.log('👤 Fixing john@gmail.com user...');
    
    const johnResult = await client.query(`
      UPDATE users 
      SET 
        password = 'password123',
        is_active = true,
        email_verified = true,
        role = 'investor'
      WHERE email = 'john@gmail.com'
      RETURNING id, email, password, role, is_active, email_verified
    `);
    
    if (johnResult.rows.length > 0) {
      const john = johnResult.rows[0];
      console.log('✅ Updated john@gmail.com:');
      console.log(`   Password: ${john.password}`);
      console.log(`   Role: ${john.role}`);
      console.log(`   Active: ${john.is_active}`);
      console.log(`   Email Verified: ${john.email_verified}`);
    } else {
      console.log('❌ john@gmail.com user not found');
    }
    
    // 2. Fix admin@broker.com user
    console.log('\n👨‍💼 Fixing admin@broker.com user...');
    
    const adminResult = await client.query(`
      UPDATE users 
      SET 
        password = 'Admin123',
        is_active = true,
        email_verified = true,
        role = 'admin'
      WHERE email = 'admin@broker.com'
      RETURNING id, email, password, role, is_active, email_verified
    `);
    
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log('✅ Updated admin@broker.com:');
      console.log(`   Password: ${admin.password}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.is_active}`);
      console.log(`   Email Verified: ${admin.email_verified}`);
    } else {
      console.log('❌ admin@broker.com user not found');
    }
    
    // 3. Verify user balances exist
    console.log('\n💰 Checking user balances...');
    
    const users = await client.query(`
      SELECT id, email FROM users WHERE email IN ('john@gmail.com', 'admin@broker.com')
    `);
    
    for (const user of users.rows) {
      const balanceCheck = await client.query(`
        SELECT * FROM user_balances WHERE user_id = $1
      `, [user.id]);
      
      if (balanceCheck.rows.length === 0) {
        console.log(`🔧 Creating balance for ${user.email}...`);
        await client.query(`
          INSERT INTO user_balances (
            user_id, total_balance, profit_balance, deposit_balance, 
            bonus_balance, credit_score_balance
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [user.id, 1000.00, 0.00, 0.00, 0.00, 0.00]);
        console.log(`✅ Created balance for ${user.email}`);
      } else {
        console.log(`✅ Balance exists for ${user.email}: $${balanceCheck.rows[0].total_balance}`);
      }
    }
    
    console.log('\n🎉 User fixes completed!');
    console.log('\n🧪 Test Login Credentials:');
    console.log('Investor: john@gmail.com / password123');
    console.log('Admin: admin@broker.com / Admin123');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run fix if called directly
if (require.main === module) {
  fixLoginUsers();
}

module.exports = { fixLoginUsers };
