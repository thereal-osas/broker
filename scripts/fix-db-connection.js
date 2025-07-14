#!/usr/bin/env node

/**
 * Database Connection Fixer
 * 
 * This script helps diagnose and fix Railway PostgreSQL connection issues
 */

function encodePassword(password) {
  return encodeURIComponent(password);
}

function parseConnectionString(url) {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol,
      username: parsed.username,
      password: parsed.password,
      hostname: parsed.hostname,
      port: parsed.port,
      database: parsed.pathname.slice(1)
    };
  } catch (error) {
    return null;
  }
}

function buildConnectionString(parts) {
  const encodedPassword = encodePassword(parts.password);
  return `postgresql://${parts.username}:${encodedPassword}@${parts.hostname}:${parts.port}/${parts.database}`;
}

console.log('🔧 Railway PostgreSQL Connection Fixer\n');

if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL environment variable is not set\n');
  console.log('Please set it first:');
  console.log('export DATABASE_URL="your-railway-url-here"\n');
  console.log('To get your Railway URL:');
  console.log('1. Go to https://railway.app/dashboard');
  console.log('2. Select your PostgreSQL service');
  console.log('3. Go to Variables tab');
  console.log('4. Copy the DATABASE_URL value\n');
  process.exit(1);
}

const originalUrl = process.env.DATABASE_URL;
console.log('Original URL:', originalUrl.replace(/:([^:@]+)@/, ':***@'));

const parts = parseConnectionString(originalUrl);

if (!parts) {
  console.log('❌ Invalid DATABASE_URL format\n');
  console.log('Expected format:');
  console.log('postgresql://username:password@host:port/database\n');
  process.exit(1);
}

console.log('\nParsed connection details:');
console.log('- Protocol:', parts.protocol);
console.log('- Username:', parts.username);
console.log('- Password:', parts.password ? '***' : 'MISSING');
console.log('- Host:', parts.hostname);
console.log('- Port:', parts.port);
console.log('- Database:', parts.database);

// Check for common issues
const issues = [];

if (!parts.password) {
  issues.push('Password is missing from the connection string');
}

if (parts.password && /[^a-zA-Z0-9]/.test(parts.password)) {
  issues.push('Password contains special characters that may need encoding');
}

if (parts.port !== '5432') {
  console.log('\n⚠️  Non-standard port detected:', parts.port);
}

if (issues.length > 0) {
  console.log('\n🚨 Potential issues found:');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  
  if (parts.password && /[^a-zA-Z0-9]/.test(parts.password)) {
    const fixedUrl = buildConnectionString(parts);
    console.log('\n🔧 Try this URL-encoded version:');
    console.log(fixedUrl.replace(/:([^:@]+)@/, ':***@'));
    console.log('\nTo use it:');
    console.log(`export DATABASE_URL="${fixedUrl}"`);
  }
}

// Test the connection
console.log('\n🔍 Testing connection...');

const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    connectionString: originalUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connection successful!');
    console.log('Server time:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.message.includes('SCRAM-SERVER-FIRST-MESSAGE')) {
      console.log('\n🔧 This is a password encoding issue. Try:');
      console.log('1. Check your Railway dashboard for the correct password');
      console.log('2. Make sure there are no extra spaces in the URL');
      console.log('3. If password has special characters, use the encoded version above');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 This is a network connectivity issue. Check:');
      console.log('1. Your internet connection');
      console.log('2. Railway service status');
      console.log('3. Firewall settings');
    }
  } finally {
    await pool.end();
  }
}

testConnection();
