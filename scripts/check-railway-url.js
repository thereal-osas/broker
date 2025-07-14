#!/usr/bin/env node

/**
 * Railway URL Checker
 * 
 * This script helps identify and fix Railway URL issues for Vercel deployment
 */

function checkRailwayURL() {
  console.log('🚂 Railway URL Checker for Vercel Deployment\n');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL environment variable is not set');
    console.log('Please set your DATABASE_URL first:');
    console.log('export DATABASE_URL="your-railway-url-here"');
    return;
  }
  
  const url = process.env.DATABASE_URL;
  console.log('🔍 Checking your DATABASE_URL...');
  console.log('URL (masked):', url.replace(/:([^:@]+)@/, ':***@'));
  
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    
    console.log('\n📋 URL Analysis:');
    console.log('Protocol:', parsed.protocol);
    console.log('Username:', parsed.username);
    console.log('Password:', parsed.password ? '***' : 'MISSING');
    console.log('Hostname:', hostname);
    console.log('Port:', parsed.port || '5432');
    console.log('Database:', parsed.pathname.slice(1));
    
    // Check if it's a Railway internal URL
    if (hostname.includes('.railway.internal')) {
      console.log('\n🚨 PROBLEM DETECTED: Railway Internal URL');
      console.log('❌ You are using a Railway internal hostname:', hostname);
      console.log('❌ This will NOT work with Vercel (external service)');
      
      console.log('\n🔧 SOLUTION:');
      console.log('1. Go to Railway dashboard → PostgreSQL service → Variables');
      console.log('2. Find the PGHOST variable with format: containers-us-west-xxx.railway.app');
      console.log('3. Replace your hostname with the public one');
      
      console.log('\n✅ Your URL should look like:');
      const fixedHostname = 'containers-us-west-123.railway.app'; // Example
      const fixedUrl = url.replace(hostname, fixedHostname);
      console.log(fixedUrl.replace(/:([^:@]+)@/, ':***@'));
      
      console.log('\n📝 Steps to fix:');
      console.log('1. Get public hostname from Railway dashboard');
      console.log('2. Update DATABASE_URL in Vercel environment variables');
      console.log('3. Redeploy your application');
      
      return false;
    }
    
    // Check if it's a Railway public URL
    if (hostname.includes('containers-') && hostname.includes('.railway.app')) {
      console.log('\n✅ GOOD: Railway Public URL Detected');
      console.log('✅ This hostname should work with Vercel');
      
      // Test the connection
      console.log('\n🔍 Testing connection...');
      testConnection(url);
      return true;
    }
    
    // Check for other database providers
    if (hostname.includes('supabase.co')) {
      console.log('\n✅ GOOD: Supabase URL Detected');
      console.log('✅ This should work with Vercel');
      testConnection(url);
      return true;
    }
    
    if (hostname.includes('amazonaws.com')) {
      console.log('\n✅ GOOD: AWS RDS URL Detected');
      console.log('✅ This should work with Vercel');
      testConnection(url);
      return true;
    }
    
    // Unknown provider
    console.log('\n⚠️  Unknown database provider');
    console.log('Hostname:', hostname);
    console.log('This might work, but verify it\'s a public hostname');
    testConnection(url);
    return true;
    
  } catch (error) {
    console.log('\n❌ Invalid DATABASE_URL format');
    console.log('Error:', error.message);
    console.log('\nExpected format:');
    console.log('postgresql://username:password@hostname:port/database');
    return false;
  }
}

async function testConnection(url) {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connection test successful!');
    console.log('Server time:', result.rows[0].now);
    client.release();
    await pool.end();
    
    console.log('\n🎉 Your DATABASE_URL is ready for Vercel deployment!');
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🔧 This suggests a hostname resolution issue:');
      console.log('- The hostname might not be publicly accessible');
      console.log('- Check if you\'re using the correct public hostname');
      console.log('- For Railway, ensure you\'re using containers-xxx.railway.app');
    } else if (error.message.includes('authentication') || error.message.includes('password')) {
      console.log('\n🔧 This suggests an authentication issue:');
      console.log('- Check your username and password');
      console.log('- Ensure special characters in password are URL-encoded');
    } else if (error.message.includes('timeout')) {
      console.log('\n🔧 This suggests a network timeout:');
      console.log('- The database might be slow to respond');
      console.log('- Check if the database service is running');
    }
  }
}

// Run the checker
if (require.main === module) {
  const isValid = checkRailwayURL();
  
  if (!isValid) {
    console.log('\n❌ Please fix the DATABASE_URL before deploying to Vercel');
    process.exit(1);
  }
}

module.exports = { checkRailwayURL };
