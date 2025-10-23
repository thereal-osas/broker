#!/usr/bin/env node

/**
 * Local Connection Fix Script
 * 
 * This script helps diagnose and fix local database connection issues
 */

// Load environment variables
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function showEnvironmentVariables() {
  console.log('🔍 Current Environment Variables:');
  console.log('=================================');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL || 'NOT SET'}`);
  console.log(`DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
  console.log(`DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
  console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***HIDDEN***' : 'NOT SET'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
  console.log('');
}

function analyzeConnectionString() {
  console.log('🔍 Analyzing DATABASE_URL:');
  console.log('==========================');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('❌ DATABASE_URL is not set');
    return;
  }
  
  try {
    const url = new URL(dbUrl);
    console.log(`Protocol: ${url.protocol}`);
    console.log(`Host: ${url.hostname}`);
    console.log(`Port: ${url.port}`);
    console.log(`Database: ${url.pathname.slice(1)}`);
    console.log(`Username: ${url.username}`);
    console.log(`Password: ${url.password ? '***HIDDEN***' : 'NOT SET'}`);
    
    if (url.hostname.includes('railway')) {
      console.log('⚠️  WARNING: DATABASE_URL points to Railway (production)!');
      console.log('   This is why you\'re getting connection errors.');
      return false;
    } else if (url.hostname === 'localhost') {
      console.log('✅ DATABASE_URL correctly points to localhost');
      return true;
    } else {
      console.log(`⚠️  WARNING: DATABASE_URL points to unknown host: ${url.hostname}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Invalid DATABASE_URL format:', error.message);
    return false;
  }
}

async function testLocalConnection() {
  console.log('🔍 Testing Local Database Connection:');
  console.log('====================================');
  
  const localConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'broker_platform',
    password: 'Mirror1#@',
    port: 5432,
  };
  
  console.log('Attempting to connect with:');
  console.log(`  Host: ${localConfig.host}`);
  console.log(`  Port: ${localConfig.port}`);
  console.log(`  Database: ${localConfig.database}`);
  console.log(`  User: ${localConfig.user}`);
  console.log('');
  
  const pool = new Pool(localConfig);
  
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Local database connection successful!');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    return true;
  } catch (error) {
    console.log('❌ Local database connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log('');
    console.log('💡 Troubleshooting tips:');
    console.log('1. Make sure PostgreSQL is running locally');
    console.log('2. Verify the password is correct: Mirror1#@');
    console.log('3. Check if the database "broker_platform" exists');
    console.log('4. Ensure the postgres user has proper permissions');
    return false;
  } finally {
    await pool.end();
  }
}

function fixEnvironmentFile() {
  console.log('🔧 Fixing .env file:');
  console.log('====================');
  
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    let content = fs.readFileSync(envPath, 'utf8');
    
    // Check if DATABASE_URL is pointing to Railway
    if (content.includes('postgres-mxht.railway.internal') || 
        content.includes('turntable.proxy.rlwy.net')) {
      
      console.log('🔄 Fixing DATABASE_URL in .env file...');
      
      // Comment out any Railway DATABASE_URL
      content = content.replace(
        /^DATABASE_URL="postgresql:\/\/postgres:UUHFHLmfoRLVNTSTbDgrGxsNWTgDCbCx@.*$/gm,
        '# $&'
      );
      
      // Ensure local DATABASE_URL is uncommented and correct
      content = content.replace(
        /^# DATABASE_URL="postgresql:\/\/postgres:Mirror1#@localhost:5432\/broker_platform"$/gm,
        'DATABASE_URL="postgresql://postgres:Mirror1#@localhost:5432/broker_platform"'
      );
      
      // If local DATABASE_URL doesn't exist, add it
      if (!content.includes('DATABASE_URL="postgresql://postgres:Mirror1#@localhost:5432/broker_platform"')) {
        const localDbSection = content.split('# Database Configuration - LOCAL DEVELOPMENT')[1];
        if (localDbSection) {
          const insertPoint = content.indexOf('# Database Configuration - LOCAL DEVELOPMENT') + 
                             '# Database Configuration - LOCAL DEVELOPMENT'.length;
          const newLine = '\nDATABASE_URL="postgresql://postgres:Mirror1#@localhost:5432/broker_platform"';
          content = content.slice(0, insertPoint) + newLine + content.slice(insertPoint);
        }
      }
      
      fs.writeFileSync(envPath, content, 'utf8');
      console.log('✅ .env file updated successfully');
      
      return true;
    } else {
      console.log('✅ .env file already configured correctly');
      return false;
    }
  } catch (error) {
    console.log('❌ Error fixing .env file:', error.message);
    return false;
  }
}

function showNextSteps(envFixed) {
  console.log('\n📋 Next Steps:');
  console.log('==============');
  
  if (envFixed) {
    console.log('1. ⚠️  RESTART your development server (npm run dev)');
    console.log('   The environment variables are cached and need to be reloaded');
    console.log('');
  }
  
  console.log('2. 🔄 Run the migration script to get production data:');
  console.log('   node scripts/migrate-production-to-local.js');
  console.log('');
  console.log('3. 🧪 Test the connection again:');
  console.log('   node scripts/fix-local-connection.js test');
  console.log('');
  console.log('4. 🚀 Start development server:');
  console.log('   npm run dev');
  console.log('');
  console.log('5. 🌐 Visit: http://localhost:3000');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'diagnose';
  
  console.log('🔧 Local Connection Troubleshooter');
  console.log('==================================');
  console.log('');
  
  if (command === 'test') {
    await testLocalConnection();
    return;
  }
  
  // Show current environment
  showEnvironmentVariables();
  
  // Analyze DATABASE_URL
  const urlOk = analyzeConnectionString();
  
  // Test local connection
  const connectionOk = await testLocalConnection();
  
  // Fix environment file if needed
  const envFixed = fixEnvironmentFile();
  
  // Show next steps
  showNextSteps(envFixed);
  
  if (!urlOk || !connectionOk || envFixed) {
    console.log('\n⚠️  Issues detected. Please follow the next steps above.');
    process.exit(1);
  } else {
    console.log('\n✅ Everything looks good! Your local setup should be working.');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Troubleshooting script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
