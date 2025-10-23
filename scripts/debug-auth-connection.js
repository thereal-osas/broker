#!/usr/bin/env node

/**
 * Authentication & Database Connection Debugger
 * 
 * This script helps debug and fix authentication issues by testing
 * database connections and verifying user credentials
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

function showEnvironmentStatus() {
  console.log('🔍 Environment Variables Status:');
  console.log('================================');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL || 'NOT SET'}`);
  console.log(`DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
  console.log(`DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
  console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***HIDDEN***' : 'NOT SET'}`);
  console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'NOT SET'}`);
  console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '***HIDDEN***' : 'NOT SET'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
  console.log('');
  
  // Analyze DATABASE_URL
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log('📊 DATABASE_URL Analysis:');
      console.log(`  Protocol: ${url.protocol}`);
      console.log(`  Host: ${url.hostname}`);
      console.log(`  Port: ${url.port}`);
      console.log(`  Database: ${url.pathname.slice(1)}`);
      console.log(`  Username: ${url.username}`);
      
      if (url.hostname === 'localhost') {
        console.log('✅ DATABASE_URL correctly points to localhost');
        return true;
      } else if (url.hostname.includes('railway')) {
        console.log('❌ DATABASE_URL still points to Railway!');
        return false;
      } else {
        console.log(`⚠️  DATABASE_URL points to: ${url.hostname}`);
        return false;
      }
    } catch (error) {
      console.log('❌ Invalid DATABASE_URL format');
      return false;
    }
  } else {
    console.log('❌ DATABASE_URL not set');
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection:');
  console.log('==============================');
  
  const dbConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: false,
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'broker_platform',
        password: process.env.DB_PASSWORD || 'Mirror1#@',
        port: parseInt(process.env.DB_PORT || '5432'),
      };
  
  console.log('Connection Configuration:');
  if (process.env.DATABASE_URL) {
    console.log(`  Using DATABASE_URL: ${process.env.DATABASE_URL}`);
  } else {
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
  }
  console.log('');
  
  const pool = new Pool(dbConfig);
  
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful!');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    return { success: true, pool };
  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('railway') || error.message.includes('postgres-mxht')) {
      console.log('\n💡 The error indicates Railway connection attempt!');
      console.log('   Your Next.js server is still using cached environment variables.');
    }
    
    await pool.end();
    return { success: false, pool: null };
  }
}

async function verifyTestUsers(pool) {
  console.log('👥 Verifying Test Users:');
  console.log('========================');
  
  const testEmails = [
    'admin@credcrypto.com',
    'investor@test.com',
    'john.doe@example.com',
    'jane.smith@example.com',
    'mike.wilson@example.com',
    'sarah.johnson@example.com'
  ];
  
  try {
    for (const email of testEmails) {
      const result = await pool.query(
        'SELECT id, email, first_name, last_name, role, password FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log(`✅ ${email} (${user.role})`);
        
        // Test password verification
        const isValidPassword = await bcrypt.compare('password', user.password);
        if (isValidPassword) {
          console.log(`   🔒 Password verification: ✅ Valid`);
        } else {
          console.log(`   🔒 Password verification: ❌ Invalid`);
        }
      } else {
        console.log(`❌ ${email} - Not found`);
      }
    }
    
    // Count total users
    const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log(`\n📊 Total users in database: ${countResult.rows[0].total}`);
    
    return true;
  } catch (error) {
    console.log('❌ Error verifying users:', error.message);
    return false;
  }
}

async function testAuthFlow(pool) {
  console.log('\n🔐 Testing Authentication Flow:');
  console.log('===============================');
  
  const testEmail = 'admin@credcrypto.com';
  const testPassword = 'password';
  
  try {
    // Simulate the authentication process
    console.log(`Testing login for: ${testEmail}`);
    
    // Step 1: Find user by email (same as auth.ts does)
    const userResult = await pool.query(
      'SELECT id, email, password, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [testEmail]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      return false;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ User found: ${user.first_name} ${user.last_name} (${user.role})`);
    console.log(`   Active: ${user.is_active}`);
    
    // Step 2: Verify password
    const isValidPassword = await bcrypt.compare(testPassword, user.password);
    if (isValidPassword) {
      console.log('✅ Password verification successful');
    } else {
      console.log('❌ Password verification failed');
      return false;
    }
    
    // Step 3: Check if user is active
    if (!user.is_active) {
      console.log('❌ User account is deactivated');
      return false;
    }
    
    console.log('✅ Authentication flow test passed!');
    console.log('   The database and credentials are working correctly.');
    console.log('   If login still fails, the issue is with environment variables in Next.js.');
    
    return true;
  } catch (error) {
    console.log('❌ Authentication flow test failed:', error.message);
    return false;
  }
}

function showTroubleshootingSteps() {
  console.log('\n🔧 Troubleshooting Steps:');
  console.log('=========================');
  console.log('');
  console.log('1. 🛑 COMPLETELY STOP your development server:');
  console.log('   - Press Ctrl+C in the terminal running npm run dev');
  console.log('   - Wait for the process to fully terminate');
  console.log('   - Make sure you see the command prompt return');
  console.log('');
  console.log('2. 🧹 Clear Node.js cache (optional but recommended):');
  console.log('   - Close your terminal completely');
  console.log('   - Open a new terminal window');
  console.log('   - Navigate back to your project directory');
  console.log('');
  console.log('3. 🔄 Restart the development server:');
  console.log('   npm run dev');
  console.log('');
  console.log('4. 🧪 Test authentication:');
  console.log('   - Go to http://localhost:3000');
  console.log('   - Try logging in with: admin@credcrypto.com / password');
  console.log('');
  console.log('5. 🔍 If still failing, check browser network tab:');
  console.log('   - Open browser developer tools (F12)');
  console.log('   - Go to Network tab');
  console.log('   - Attempt login and check the POST request to /api/auth/callback/credentials');
  console.log('   - Look for any error messages in the response');
  console.log('');
  console.log('6. 📋 Check server logs:');
  console.log('   - Look at your terminal running npm run dev');
  console.log('   - Check for any database connection errors');
  console.log('   - Look for Railway-related error messages');
}

function showTestCredentials() {
  console.log('\n🔑 Test Account Credentials:');
  console.log('============================');
  console.log('');
  console.log('👑 ADMIN ACCOUNT:');
  console.log('📧 Email: admin@credcrypto.com');
  console.log('🔒 Password: password');
  console.log('');
  console.log('👤 INVESTOR ACCOUNTS:');
  console.log('📧 Email: investor@test.com');
  console.log('🔒 Password: password');
  console.log('');
  console.log('📧 Email: john.doe@example.com');
  console.log('🔒 Password: password');
  console.log('');
  console.log('📧 Email: jane.smith@example.com');
  console.log('🔒 Password: password');
  console.log('');
  console.log('📧 Email: mike.wilson@example.com');
  console.log('🔒 Password: password');
  console.log('');
  console.log('📧 Email: sarah.johnson@example.com');
  console.log('🔒 Password: password');
  console.log('');
  console.log('💡 All passwords are: password');
}

async function main() {
  console.log('🔍 Authentication & Database Connection Debugger');
  console.log('================================================');
  console.log('');
  
  // Show environment status
  const envOk = showEnvironmentStatus();
  
  // Test database connection
  const { success: dbOk, pool } = await testDatabaseConnection();
  
  if (!dbOk) {
    console.log('\n❌ Database connection failed. Cannot proceed with user verification.');
    showTroubleshootingSteps();
    process.exit(1);
  }
  
  // Verify test users exist and passwords work
  const usersOk = await verifyTestUsers(pool);
  
  // Test authentication flow
  const authOk = await testAuthFlow(pool);
  
  await pool.end();
  
  // Show results and next steps
  console.log('\n📊 Diagnostic Results:');
  console.log('======================');
  console.log(`Environment Configuration: ${envOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Database Connection: ${dbOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`User Verification: ${usersOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Authentication Flow: ${authOk ? '✅ OK' : '❌ FAILED'}`);
  
  if (envOk && dbOk && usersOk && authOk) {
    console.log('\n🎉 All tests passed!');
    console.log('The database and authentication system are working correctly.');
    console.log('If you\'re still getting 401 errors, the issue is with cached environment variables.');
    console.log('\n⚠️  SOLUTION: Completely restart your development server!');
  } else {
    console.log('\n⚠️  Issues detected. Please follow the troubleshooting steps below.');
  }
  
  showTroubleshootingSteps();
  showTestCredentials();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Debug script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
