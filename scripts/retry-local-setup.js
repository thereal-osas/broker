#!/usr/bin/env node

/**
 * Retry Local Setup with Fixes
 * 
 * Cleans up and retries the local testing setup with all fixes applied
 */

const { Pool } = require('pg');

async function retryLocalSetup() {
  console.log('🔄 Retrying Local Setup with Fixes');
  console.log('==================================\n');

  // Step 1: Clean up any existing test database
  console.log('📋 Step 1: Cleaning up existing test database...');
  
  const adminPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Mirror1#@'
  });

  try {
    // Drop existing test database if it exists
    await adminPool.query('DROP DATABASE IF EXISTS broker_local_test');
    console.log('✅ Cleaned up existing test database');
    
    await adminPool.end();
    
    // Step 2: Verify environment configuration
    console.log('\n📋 Step 2: Verifying environment configuration...');
    
    const fs = require('fs');
    const envContent = fs.readFileSync('.env.local', 'utf8');
    
    const isLocalDb = envContent.includes('broker_local_test');
    const isTestingMode = envContent.includes('TESTING_MODE="true"');
    const noActiveProductionDb = !envContent.match(/^DATABASE_URL=.*railway/m);
    
    console.log(`Local Database: ${isLocalDb ? '✅' : '❌'}`);
    console.log(`Testing Mode: ${isTestingMode ? '✅' : '❌'}`);
    console.log(`Production Safety: ${noActiveProductionDb ? '✅' : '❌'}`);
    
    if (!isLocalDb || !isTestingMode || !noActiveProductionDb) {
      console.log('\n❌ Environment configuration issues detected');
      console.log('Please run: node scripts/switch-to-local-testing.js');
      return;
    }
    
    // Step 3: Run the setup script
    console.log('\n📋 Step 3: Running database setup...');
    
    const { spawn } = require('child_process');
    
    const setupProcess = spawn('node', ['scripts/setup-local-testing-db.js'], {
      stdio: 'inherit'
    });
    
    setupProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 LOCAL SETUP SUCCESSFUL!');
        console.log('=========================');
        console.log('✅ Local test database created');
        console.log('✅ Test data populated');
        console.log('✅ Ready for testing');
        
        console.log('\n📋 Next Steps:');
        console.log('1. Run: npm run dev');
        console.log('2. Login as admin@test.com');
        console.log('3. Test profit distribution');
        console.log('4. Test deposit decline functionality');
      } else {
        console.log('\n❌ Setup failed with exit code:', code);
        console.log('Check the error messages above for details');
      }
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    await adminPool.end();
  }
}

retryLocalSetup();
