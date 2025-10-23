#!/usr/bin/env node

/**
 * Development Server Restart Script
 * 
 * This script helps restart the development server with fresh environment variables
 */

const { spawn } = require('child_process');
const path = require('path');

function clearEnvironmentCache() {
  console.log('🧹 Clearing environment cache...');
  
  // Clear Node.js module cache for environment-related modules
  const moduleKeys = Object.keys(require.cache);
  moduleKeys.forEach(key => {
    if (key.includes('dotenv') || key.includes('.env')) {
      delete require.cache[key];
    }
  });
  
  // Clear specific environment variables that might be cached
  delete process.env.DATABASE_URL;
  delete process.env.DB_HOST;
  delete process.env.DB_PORT;
  delete process.env.DB_NAME;
  delete process.env.DB_USER;
  delete process.env.DB_PASSWORD;
  
  console.log('✅ Environment cache cleared');
}

function showCurrentEnvironment() {
  // Reload environment variables
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
  
  console.log('\n🔍 Current Environment Variables:');
  console.log('=================================');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL || 'NOT SET'}`);
  console.log(`DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
  console.log(`DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
  console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***HIDDEN***' : 'NOT SET'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
  
  // Check if DATABASE_URL points to local
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.includes('localhost')) {
      console.log('✅ DATABASE_URL correctly points to localhost');
    } else if (process.env.DATABASE_URL.includes('railway')) {
      console.log('❌ DATABASE_URL still points to Railway!');
      return false;
    } else {
      console.log('⚠️  DATABASE_URL points to unknown host');
      return false;
    }
  }
  
  return true;
}

function startDevServer() {
  console.log('\n🚀 Starting development server...');
  console.log('==================================');
  
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    env: {
      ...process.env,
      // Force reload environment variables
      FORCE_COLOR: '1',
    }
  });
  
  devProcess.on('error', (error) => {
    console.error('❌ Failed to start development server:', error);
  });
  
  devProcess.on('close', (code) => {
    console.log(`\n📊 Development server exited with code ${code}`);
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development server...');
    devProcess.kill('SIGINT');
    process.exit(0);
  });
}

async function testDatabaseConnection() {
  console.log('\n🔍 Testing database connection...');
  
  // Clear cache and reload environment
  clearEnvironmentCache();
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
  
  const { Pool } = require('pg');
  
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
  
  console.log('Attempting connection with:');
  if (process.env.DATABASE_URL) {
    console.log(`  Connection String: ${process.env.DATABASE_URL}`);
  } else {
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
  }
  
  const pool = new Pool(dbConfig);
  
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log(`   Time: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('railway')) {
      console.log('\n💡 The error shows Railway connection - environment variables are still cached!');
      console.log('   Please completely stop your development server and run this script again.');
    }
    
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🔄 Development Server Restart Tool');
  console.log('===================================');
  
  const args = process.argv.slice(2);
  const command = args[0] || 'restart';
  
  if (command === 'test') {
    const success = await testDatabaseConnection();
    process.exit(success ? 0 : 1);
  }
  
  if (command === 'env') {
    clearEnvironmentCache();
    const envOk = showCurrentEnvironment();
    process.exit(envOk ? 0 : 1);
  }
  
  // Clear environment cache
  clearEnvironmentCache();
  
  // Show current environment
  const envOk = showCurrentEnvironment();
  
  if (!envOk) {
    console.log('\n❌ Environment configuration issues detected.');
    console.log('Please check your .env and .env.local files.');
    process.exit(1);
  }
  
  // Test database connection
  const dbOk = await testDatabaseConnection();
  
  if (!dbOk) {
    console.log('\n❌ Database connection failed.');
    console.log('Please ensure PostgreSQL is running and credentials are correct.');
    process.exit(1);
  }
  
  console.log('\n✅ Environment and database checks passed!');
  console.log('\n📋 Instructions:');
  console.log('1. Make sure to COMPLETELY STOP your current development server (Ctrl+C)');
  console.log('2. Wait for it to fully stop');
  console.log('3. Then run: npm run dev');
  console.log('4. Or let this script start it for you...');
  
  console.log('\n⏳ Starting development server in 3 seconds...');
  console.log('   Press Ctrl+C to cancel and start manually');
  
  setTimeout(() => {
    startDevServer();
  }, 3000);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Restart script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
