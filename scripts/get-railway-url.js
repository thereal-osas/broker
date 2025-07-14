#!/usr/bin/env node

/**
 * Railway URL Helper
 * 
 * This script helps you construct the correct DATABASE_URL for Railway
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function encodePassword(password) {
  return encodeURIComponent(password);
}

async function getConnectionDetails() {
  console.log('🚂 Railway PostgreSQL Connection Helper\n');
  console.log('Please provide your Railway database details:');
  console.log('(You can find these in your Railway dashboard → PostgreSQL service → Variables)\n');

  try {
    const host = await question('Host (e.g., containers-us-west-xxx.railway.app): ');
    const port = await question('Port (usually 5432): ') || '5432';
    const database = await question('Database name (usually "railway"): ') || 'railway';
    const username = await question('Username (usually "postgres"): ') || 'postgres';
    const password = await question('Password: ');

    console.log('\n📋 Connection Details:');
    console.log('Host:', host);
    console.log('Port:', port);
    console.log('Database:', database);
    console.log('Username:', username);
    console.log('Password:', password ? '***' : 'MISSING');

    if (!host || !password) {
      console.log('\n❌ Missing required information');
      process.exit(1);
    }

    // Check if password needs encoding
    const needsEncoding = /[^a-zA-Z0-9]/.test(password);
    const encodedPassword = needsEncoding ? encodePassword(password) : password;

    const connectionUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${database}`;

    console.log('\n🔗 Your DATABASE_URL:');
    console.log(connectionUrl);

    if (needsEncoding) {
      console.log('\n⚠️  Your password contained special characters and was URL-encoded.');
      console.log('Original password characters that were encoded:');
      const specialChars = password.match(/[^a-zA-Z0-9]/g);
      if (specialChars) {
        specialChars.forEach(char => {
          console.log(`  "${char}" → "${encodeURIComponent(char)}"`);
        });
      }
    }

    console.log('\n📝 To use this URL:');
    console.log(`export DATABASE_URL="${connectionUrl}"`);
    console.log('\nThen run:');
    console.log('npm run db:migrate');

    // Test the connection
    const testConnection = await question('\n🔍 Test this connection now? (y/n): ');
    
    if (testConnection.toLowerCase() === 'y' || testConnection.toLowerCase() === 'yes') {
      console.log('\n🔍 Testing connection...');
      
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: connectionUrl,
        ssl: { rejectUnauthorized: false }
      });

      try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Connection successful!');
        console.log('Server time:', result.rows[0].now);
        client.release();
        
        console.log('\n🎉 Great! Your connection string works.');
        console.log('You can now run: npm run db:migrate');
        
      } catch (error) {
        console.log('❌ Connection failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Double-check your Railway dashboard for correct credentials');
        console.log('2. Ensure your Railway PostgreSQL service is running');
        console.log('3. Try copying the DATABASE_URL directly from Railway');
      } finally {
        await pool.end();
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

getConnectionDetails();
