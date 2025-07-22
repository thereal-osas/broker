#!/usr/bin/env node

/**
 * Comprehensive login issue diagnostic script
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function diagnoseLoginIssue() {
  console.log('🔍 Diagnosing Login Issues');
  console.log('==========================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  const issues = [];
  const fixes = [];

  try {
    const client = await pool.connect();
    
    // 1. Check Database Connection
    console.log('🗄️ Checking Database Connection...');
    try {
      const dbTest = await client.query('SELECT NOW()');
      console.log('✅ Database connection successful');
      console.log(`   Connected at: ${dbTest.rows[0].now}`);
    } catch (error) {
      console.log('❌ Database connection failed');
      issues.push('Database connection failed');
      fixes.push('Check DATABASE_URL in .env file');
      console.log(`   Error: ${error.message}`);
    }
    
    // 2. Check Users Table
    console.log('\n👥 Checking Users Table...');
    try {
      const usersCount = await client.query('SELECT COUNT(*) FROM users');
      console.log(`✅ Users table accessible with ${usersCount.rows[0].count} users`);
      
      // Check table structure
      const tableStructure = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      const requiredColumns = ['id', 'email', 'password', 'first_name', 'last_name', 'role', 'is_active'];
      const existingColumns = tableStructure.rows.map(row => row.column_name);
      
      requiredColumns.forEach(col => {
        if (existingColumns.includes(col)) {
          console.log(`   ✅ Column '${col}' exists`);
        } else {
          console.log(`   ❌ Column '${col}' missing`);
          issues.push(`Missing column: ${col}`);
          fixes.push(`Add missing column: ALTER TABLE users ADD COLUMN ${col}`);
        }
      });
      
    } catch (error) {
      console.log('❌ Users table check failed');
      issues.push('Users table not accessible');
      fixes.push('Create users table or check permissions');
      console.log(`   Error: ${error.message}`);
    }
    
    // 3. Check Test Users
    console.log('\n🧪 Checking Test Users...');
    
    const testUsers = [
      { email: 'john@gmail.com', expectedRole: 'investor' },
      { email: 'admin@broker.com', expectedRole: 'admin' }
    ];
    
    for (const testUser of testUsers) {
      try {
        const userResult = await client.query(
          'SELECT id, email, password, role, is_active, email_verified FROM users WHERE email = $1',
          [testUser.email]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          console.log(`✅ User ${testUser.email} found`);
          console.log(`   Role: ${user.role} (expected: ${testUser.expectedRole})`);
          console.log(`   Active: ${user.is_active}`);
          console.log(`   Email Verified: ${user.email_verified}`);
          console.log(`   Password: ${user.password}`);
          
          if (user.role !== testUser.expectedRole) {
            issues.push(`User ${testUser.email} has wrong role: ${user.role}`);
            fixes.push(`Update role: UPDATE users SET role = '${testUser.expectedRole}' WHERE email = '${testUser.email}'`);
          }
          
          if (!user.is_active) {
            issues.push(`User ${testUser.email} is inactive`);
            fixes.push(`Activate user: UPDATE users SET is_active = true WHERE email = '${testUser.email}'`);
          }
          
        } else {
          console.log(`❌ User ${testUser.email} not found`);
          issues.push(`Missing test user: ${testUser.email}`);
          fixes.push(`Create test user: ${testUser.email}`);
        }
      } catch (error) {
        console.log(`❌ Error checking user ${testUser.email}: ${error.message}`);
      }
    }
    
    // 4. Check Environment Variables
    console.log('\n🔧 Checking Environment Variables...');
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];
    
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
        if (envVar === 'NEXTAUTH_URL') {
          console.log(`   Value: ${process.env[envVar]}`);
        }
      } else {
        console.log(`❌ ${envVar} is missing`);
        issues.push(`Missing environment variable: ${envVar}`);
        fixes.push(`Add ${envVar} to .env file`);
      }
    });
    
    // 5. Test Authentication Logic
    console.log('\n🔐 Testing Authentication Logic...');
    
    if (testUsers.length > 0) {
      const testEmail = 'john@gmail.com';
      const testPassword = 'password123';
      
      try {
        const userResult = await client.query(
          'SELECT * FROM users WHERE email = $1',
          [testEmail]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          console.log(`✅ Found user for auth test: ${user.email}`);
          
          // Test password comparison
          if (user.password === testPassword) {
            console.log('✅ Password comparison works');
          } else {
            console.log('❌ Password comparison failed');
            console.log(`   Expected: ${testPassword}`);
            console.log(`   Actual: ${user.password}`);
            issues.push('Password mismatch for test user');
            fixes.push(`Update password: UPDATE users SET password = '${testPassword}' WHERE email = '${testEmail}'`);
          }
          
          // Test user status
          if (user.is_active && user.email_verified) {
            console.log('✅ User status is valid for login');
          } else {
            console.log('❌ User status prevents login');
            if (!user.is_active) {
              issues.push('Test user is inactive');
              fixes.push(`Activate user: UPDATE users SET is_active = true WHERE email = '${testEmail}'`);
            }
            if (!user.email_verified) {
              console.log('⚠️ User email not verified (may affect login)');
            }
          }
        }
      } catch (error) {
        console.log(`❌ Auth logic test failed: ${error.message}`);
      }
    }
    
    // 6. Check NextAuth API Route
    console.log('\n🌐 Checking NextAuth API Route...');
    
    const fs = require('fs');
    const path = require('path');
    
    const authApiPath = path.join(process.cwd(), 'src/app/api/auth/[...nextauth]/route.ts');
    if (fs.existsSync(authApiPath)) {
      console.log('✅ NextAuth API route exists');
    } else {
      console.log('❌ NextAuth API route missing');
      issues.push('NextAuth API route not found');
      fixes.push('Create NextAuth API route at src/app/api/auth/[...nextauth]/route.ts');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    issues.push('Diagnostic script failed');
    fixes.push('Check database connection and permissions');
  } finally {
    await pool.end();
  }
  
  // 7. Summary and Recommendations
  console.log('\n📊 Diagnostic Summary');
  console.log('=====================');
  
  if (issues.length === 0) {
    console.log('🎉 No issues found! Login should be working.');
    console.log('\n🧪 Manual Testing Steps:');
    console.log('1. Start dev server: npm run dev');
    console.log('2. Go to: http://localhost:3000/auth/signin');
    console.log('3. Try login with: john@gmail.com / password123');
    console.log('4. Try admin login with: admin@broker.com / Admin123');
  } else {
    console.log(`❌ Found ${issues.length} issue(s):`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log('\n🔧 Recommended Fixes:');
    fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });
  }
  
  console.log('\n📋 Additional Troubleshooting:');
  console.log('1. Check browser console for JavaScript errors');
  console.log('2. Check Network tab for failed API requests');
  console.log('3. Check server terminal for error messages');
  console.log('4. Verify .env file is in project root');
  console.log('5. Restart development server after changes');
  
  return { issues, fixes };
}

// Run diagnostic if called directly
if (require.main === module) {
  diagnoseLoginIssue();
}

module.exports = { diagnoseLoginIssue };
