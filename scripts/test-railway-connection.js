#!/usr/bin/env node

/**
 * Railway Connection Tester
 * 
 * This script specifically tests Railway database connections
 * and helps identify the correct URL format for Vercel deployment.
 */

const { Pool } = require('pg');

async function testRailwayConnection() {
  console.log('🚂 Railway PostgreSQL Connection Tester\n');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL environment variable is not set');
    console.log('Please set your Railway DATABASE_URL:');
    console.log('export DATABASE_URL="your-railway-url-here"');
    return false;
  }
  
  const url = process.env.DATABASE_URL;
  console.log('🔍 Testing Railway connection...');
  console.log('URL (masked):', url.replace(/:([^:@]+)@/, ':***@'));
  
  try {
    const parsed = new URL(url);
    console.log('\n📋 Connection Details:');
    console.log('Protocol:', parsed.protocol);
    console.log('Username:', parsed.username);
    console.log('Password:', parsed.password ? '***' : 'MISSING');
    console.log('Hostname:', parsed.hostname);
    console.log('Port:', parsed.port || '5432');
    console.log('Database:', parsed.pathname.slice(1));
    
    // Analyze Railway URL type
    const hostname = parsed.hostname;
    
    if (hostname.includes('.railway.internal')) {
      console.log('\n🚨 ISSUE: Railway Internal URL');
      console.log('❌ This is an internal Railway URL that won\'t work with Vercel');
      console.log('❌ Internal URLs only work within Railway\'s network');
      
      console.log('\n🔧 SOLUTION: Get Public Railway URL');
      console.log('1. Go to Railway dashboard → PostgreSQL service → Variables');
      console.log('2. Look for PGHOST with format: containers-*.railway.app');
      console.log('3. Or look for a public DATABASE_URL');
      
      return false;
    }
    
    if (hostname.includes('.proxy.rlwy.net')) {
      console.log('\n✅ Railway Proxy URL Detected');
      console.log('✅ This should work with external services like Vercel');
    } else if (hostname.includes('containers-') && hostname.includes('.railway.app')) {
      console.log('\n✅ Railway Public URL Detected');
      console.log('✅ This should work with external services like Vercel');
    } else {
      console.log('\n⚠️  Unknown Railway URL format');
      console.log('This might be an older or custom Railway URL');
    }
    
    // Test connection with different SSL configurations
    console.log('\n🔍 Testing connection...');
    
    const connectionConfigs = [
      {
        name: 'SSL with rejectUnauthorized: false',
        config: {
          connectionString: url,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000
        }
      },
      {
        name: 'SSL required',
        config: {
          connectionString: url,
          ssl: { require: true, rejectUnauthorized: false },
          connectionTimeoutMillis: 10000
        }
      },
      {
        name: 'No SSL',
        config: {
          connectionString: url,
          ssl: false,
          connectionTimeoutMillis: 10000
        }
      }
    ];
    
    let connectionWorked = false;
    
    for (const { name, config } of connectionConfigs) {
      try {
        console.log(`\n🔌 Trying: ${name}`);
        
        const pool = new Pool(config);
        const client = await pool.connect();
        
        // Test basic query
        const result = await client.query('SELECT NOW(), version()');
        console.log('✅ Connection successful!');
        console.log('Server time:', result.rows[0].now);
        console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
        
        // Test if we can create tables (important for migrations)
        try {
          await client.query('CREATE TABLE IF NOT EXISTS connection_test (id SERIAL PRIMARY KEY, test_time TIMESTAMP DEFAULT NOW())');
          await client.query('DROP TABLE IF EXISTS connection_test');
          console.log('✅ CREATE/DROP permissions confirmed');
        } catch (permError) {
          console.log('⚠️  Limited permissions:', permError.message);
        }
        
        client.release();
        await pool.end();
        
        connectionWorked = true;
        console.log(`\n🎉 Connection working with: ${name}`);
        break;
        
      } catch (error) {
        console.log(`❌ Failed with ${name}:`, error.message);
      }
    }
    
    if (!connectionWorked) {
      console.log('\n❌ All connection attempts failed');
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check if your Railway PostgreSQL service is running');
      console.log('2. Verify the DATABASE_URL is current (Railway URLs can change)');
      console.log('3. Get a fresh DATABASE_URL from Railway dashboard');
      console.log('4. Ensure your Railway plan allows external connections');
      
      return false;
    }
    
    // Test with migration system configuration
    console.log('\n🧪 Testing with migration system configuration...');
    try {
      const migrationPool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 3 // Same as migration system
      });
      
      const client = await migrationPool.connect();
      await client.query('SELECT 1');
      client.release();
      await migrationPool.end();
      
      console.log('✅ Migration system configuration works!');
      
    } catch (error) {
      console.log('❌ Migration system configuration failed:', error.message);
      return false;
    }
    
    console.log('\n🎉 Railway connection is ready for Vercel deployment!');
    console.log('\n📝 Next steps:');
    console.log('1. Set this DATABASE_URL in Vercel environment variables');
    console.log('2. Deploy to Vercel');
    console.log('3. Check deployment logs for successful migration');
    
    return true;
    
  } catch (error) {
    console.log('\n❌ URL parsing failed:', error.message);
    console.log('\nExpected format:');
    console.log('postgresql://username:password@hostname:port/database');
    return false;
  }
}

// Get fresh Railway URL helper
function showRailwayURLInstructions() {
  console.log('\n📋 How to get fresh Railway DATABASE_URL:');
  console.log('\n1. Railway Dashboard Method:');
  console.log('   - Go to https://railway.app/dashboard');
  console.log('   - Select your PostgreSQL service');
  console.log('   - Click "Variables" tab');
  console.log('   - Copy the DATABASE_URL value');
  console.log('\n2. Railway CLI Method:');
  console.log('   - npm install -g @railway/cli');
  console.log('   - railway login');
  console.log('   - railway link (select your project)');
  console.log('   - railway variables | grep DATABASE_URL');
  console.log('\n3. Railway Connect Tab:');
  console.log('   - Go to your PostgreSQL service');
  console.log('   - Click "Connect" tab');
  console.log('   - Copy the "External Connection" URL');
}

// Run the test
if (require.main === module) {
  testRailwayConnection()
    .then((success) => {
      if (!success) {
        showRailwayURLInstructions();
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Test failed:', error);
      showRailwayURLInstructions();
      process.exit(1);
    });
}

module.exports = { testRailwayConnection };
