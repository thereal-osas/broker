#!/usr/bin/env node

/**
 * Authentication Setup Verification
 * 
 * This script creates a test API endpoint to verify what database
 * your Next.js server is actually connecting to
 */

const fs = require('fs');
const path = require('path');

// Create a temporary API endpoint to test database connection
const testApiContent = `import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection and get environment info
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    
    const connectionInfo = {
      success: true,
      timestamp: result.rows[0].current_time,
      postgresql_version: result.rows[0].pg_version,
      database_url: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      database_host: process.env.DATABASE_URL ? 
        (process.env.DATABASE_URL.includes('localhost') ? 'localhost' : 
         process.env.DATABASE_URL.includes('railway') ? 'railway' : 'other') : 'unknown',
      node_env: process.env.NODE_ENV,
      nextauth_url: process.env.NEXTAUTH_URL
    };
    
    return NextResponse.json(connectionInfo);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      database_url: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      database_host: process.env.DATABASE_URL ? 
        (process.env.DATABASE_URL.includes('localhost') ? 'localhost' : 
         process.env.DATABASE_URL.includes('railway') ? 'railway' : 'other') : 'unknown'
    }, { status: 500 });
  }
}`;

// Create the API directory if it doesn't exist
const apiDir = path.join(process.cwd(), 'src', 'app', 'api', 'test-db');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Write the test API endpoint
const apiFile = path.join(apiDir, 'route.ts');
fs.writeFileSync(apiFile, testApiContent);

console.log('🔧 Created test API endpoint: /api/test-db');
console.log('');
console.log('📋 Next Steps:');
console.log('==============');
console.log('');
console.log('1. 🛑 STOP your development server completely (Ctrl+C)');
console.log('');
console.log('2. 🚀 Start it again:');
console.log('   npm run dev');
console.log('');
console.log('3. 🧪 Test the database connection:');
console.log('   Open: http://localhost:3000/api/test-db');
console.log('   This will show you exactly which database your server is connecting to');
console.log('');
console.log('4. 🔐 Test authentication:');
console.log('   - Go to: http://localhost:3000');
console.log('   - Login with: admin@credcrypto.com / password');
console.log('');
console.log('5. 🧹 Clean up (after testing):');
console.log('   node scripts/cleanup-test-api.js');
console.log('');

// Create cleanup script
const cleanupScript = `const fs = require('fs');
const path = require('path');

const apiDir = path.join(process.cwd(), 'src', 'app', 'api', 'test-db');
if (fs.existsSync(apiDir)) {
  fs.rmSync(apiDir, { recursive: true });
  console.log('✅ Cleaned up test API endpoint');
} else {
  console.log('ℹ️  Test API endpoint not found');
}`;

fs.writeFileSync(path.join(process.cwd(), 'scripts', 'cleanup-test-api.js'), cleanupScript);

console.log('💡 Expected response from /api/test-db:');
console.log('   {');
console.log('     "success": true,');
console.log('     "database_host": "localhost",');
console.log('     "postgresql_version": "PostgreSQL 17.4",');
console.log('     "node_env": "development"');
console.log('   }');
console.log('');
console.log('❌ If you see "railway" in database_host, your server is still cached!');
console.log('');

console.log('🔑 Test Credentials:');
console.log('===================');
console.log('Admin: admin@credcrypto.com / password');
console.log('Investor: investor@test.com / password');
