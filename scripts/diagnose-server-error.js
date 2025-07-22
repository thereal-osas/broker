#!/usr/bin/env node

/**
 * Diagnose server errors
 */

// Load environment variables
require('dotenv').config();

async function diagnoseServerError() {
  console.log('🔍 Diagnosing Server Errors');
  console.log('============================\n');
  
  // 1. Check environment variables
  console.log('🔧 Checking Environment Variables...');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL', 
    'NEXTAUTH_SECRET'
  ];
  
  let envIssues = 0;
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Set`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      envIssues++;
    }
  });
  
  if (envIssues > 0) {
    console.log(`\n⚠️  Found ${envIssues} environment variable issues`);
  }
  
  // 2. Test database connection
  console.log('\n🗄️ Testing Database Connection...');
  
  try {
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
      max: 1,
    });
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log(`✅ Database query successful: ${result.rows[0].now}`);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
  }
  
  // 3. Check file imports
  console.log('\n📥 Testing File Imports...');
  
  const filesToTest = [
    { path: './lib/auth.js', name: 'Auth Config' },
    { path: './lib/db.js', name: 'Database Config' },
    { path: './src/hooks/useToast.js', name: 'useToast Hook' }
  ];
  
  for (const file of filesToTest) {
    try {
      require(file.path);
      console.log(`✅ ${file.name}: Import successful`);
    } catch (error) {
      console.log(`❌ ${file.name}: Import failed - ${error.message}`);
    }
  }
  
  // 4. Check Next.js configuration
  console.log('\n⚙️ Checking Next.js Configuration...');
  
  const fs = require('fs');
  
  // Check tsconfig.json
  if (fs.existsSync('tsconfig.json')) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
      if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
        console.log('✅ TypeScript path mapping configured');
        console.log('   Paths:', Object.keys(tsconfig.compilerOptions.paths));
      } else {
        console.log('⚠️  TypeScript path mapping not found');
      }
    } catch (error) {
      console.log(`❌ tsconfig.json parse error: ${error.message}`);
    }
  } else {
    console.log('❌ tsconfig.json not found');
  }
  
  // Check package.json
  if (fs.existsSync('package.json')) {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      console.log('✅ package.json found');
      console.log(`   Next.js version: ${packageJson.dependencies?.next || 'Not found'}`);
    } catch (error) {
      console.log(`❌ package.json parse error: ${error.message}`);
    }
  }
  
  // 5. Check for common issues
  console.log('\n🚨 Common Issues Check...');
  
  // Check for port conflicts
  console.log('🔌 Checking for port conflicts...');
  console.log('   Development server should be on port 3000 or 3002');
  
  // Check for missing dependencies
  console.log('📦 Checking critical dependencies...');
  const criticalDeps = ['next', 'react', 'next-auth', 'pg'];
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    criticalDeps.forEach(dep => {
      if (allDeps[dep]) {
        console.log(`✅ ${dep}: ${allDeps[dep]}`);
      } else {
        console.log(`❌ ${dep}: Missing`);
      }
    });
  } catch (error) {
    console.log('❌ Could not check dependencies');
  }
  
  // 6. Recommendations
  console.log('\n💡 Troubleshooting Recommendations');
  console.log('===================================');
  
  console.log('1. 🔄 Restart Development Server:');
  console.log('   - Stop current server (Ctrl+C)');
  console.log('   - Run: npm run dev');
  console.log('   - Check terminal for error messages');
  
  console.log('\n2. 🧹 Clear Next.js Cache:');
  console.log('   - Delete .next folder');
  console.log('   - Run: npm run dev');
  
  console.log('\n3. 🔧 Check Environment Variables:');
  console.log('   - Ensure .env file exists');
  console.log('   - Verify DATABASE_URL is correct');
  console.log('   - Ensure NEXTAUTH_URL=http://localhost:3000');
  
  console.log('\n4. 🗄️ Database Issues:');
  console.log('   - Run: node scripts/verify-db.js');
  console.log('   - Check database connection');
  console.log('   - Verify support tables exist');
  
  console.log('\n5. 📱 Browser Issues:');
  console.log('   - Clear browser cache');
  console.log('   - Try incognito/private mode');
  console.log('   - Check browser console for errors');
  
  console.log('\n6. 🔍 Debug Steps:');
  console.log('   - Check server terminal for error messages');
  console.log('   - Look for import/export errors');
  console.log('   - Verify all files exist and are accessible');
  
  console.log('\n📞 If issues persist:');
  console.log('   - Share the exact error message from browser');
  console.log('   - Share server terminal output');
  console.log('   - Specify which page/action causes the error');
}

// Run diagnosis if called directly
if (require.main === module) {
  diagnoseServerError().catch(console.error);
}

module.exports = { diagnoseServerError };
