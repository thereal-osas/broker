#!/usr/bin/env node

/**
 * Test Script for Automated Migration System
 * 
 * This script tests the automated migration system locally
 * to ensure it works before deploying to Vercel.
 */

const { runAutomatedMigration, healthCheck } = require('./auto-migrate');

async function testMigrationSystem() {
  console.log('🧪 Testing Automated Migration System\n');
  
  // Check environment
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not set');
    console.log('Please set your database URL:');
    console.log('export DATABASE_URL="postgresql://username:password@host:port/database"');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is configured');
  
  try {
    // Test 1: Run full migration
    console.log('\n📋 Test 1: Running full migration...');
    await runAutomatedMigration();
    console.log('✅ Full migration test passed');
    
    // Test 2: Run migration again (should skip existing)
    console.log('\n📋 Test 2: Running migration again (idempotency test)...');
    await runAutomatedMigration();
    console.log('✅ Idempotency test passed');
    
    // Test 3: Health check
    console.log('\n📋 Test 3: Testing health check...');
    const health = await healthCheck();
    console.log('Health status:', health.status);
    console.log('Health message:', health.message);
    
    if (health.status === 'healthy') {
      console.log('✅ Health check test passed');
    } else {
      console.log('❌ Health check test failed');
      process.exit(1);
    }
    
    console.log('\n🎉 All tests passed! Migration system is ready for deployment.');
    console.log('\n📝 Next steps:');
    console.log('1. Set DATABASE_URL in Vercel environment variables');
    console.log('2. Deploy your application to Vercel');
    console.log('3. Check deployment logs for migration status');
    console.log('4. Visit /api/health/database to verify setup');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check your DATABASE_URL format');
    console.error('2. Ensure database is accessible');
    console.error('3. Verify database user has necessary permissions');
    process.exit(1);
  }
}

// Run tests
testMigrationSystem();
