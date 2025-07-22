#!/usr/bin/env node

/**
 * Quick verification script for broker application enhancements
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function quickVerification() {
  console.log('🔍 Quick Verification of Broker Application');
  console.log('==========================================\n');
  
  let allPassed = true;
  
  // 1. Check Build Files
  console.log('📦 Checking Build Status...');
  
  const nextConfigExists = fs.existsSync(path.join(process.cwd(), 'next.config.js'));
  const packageJsonExists = fs.existsSync(path.join(process.cwd(), 'package.json'));
  
  console.log(`✅ next.config.js exists: ${nextConfigExists}`);
  console.log(`✅ package.json exists: ${packageJsonExists}`);
  
  // 2. Check Critical Files
  console.log('\n📁 Checking Critical Files...');
  
  const criticalFiles = [
    'src/app/api/admin/referrals/route.ts',
    'src/app/api/admin/user-investments/route.ts',
    'src/app/admin/referrals/page.tsx',
    'src/app/dashboard/withdraw/page.tsx',
    'src/app/dashboard/transactions/page.tsx'
  ];
  
  criticalFiles.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allPassed = false;
  });
  
  // 3. Check Database Connection
  console.log('\n🗄️ Checking Database Connection...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check key tables
    const tables = ['users', 'referrals', 'withdrawal_requests', 'transactions'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ Table ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`❌ Table ${table}: Error - ${error.message}`);
        allPassed = false;
      }
    }
    
    // Check referrals table structure
    const referralsColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'referrals'
    `);
    
    const columnNames = referralsColumns.rows.map(row => row.column_name);
    const hasCommissionEarned = columnNames.includes('commission_earned');
    const hasCommissionPaid = columnNames.includes('commission_paid');
    
    console.log(`${hasCommissionEarned ? '✅' : '❌'} Referrals table has commission_earned column`);
    console.log(`${hasCommissionPaid ? '✅' : '❌'} Referrals table has commission_paid column`);
    
    if (!hasCommissionEarned || !hasCommissionPaid) allPassed = false;
    
    client.release();
    
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    allPassed = false;
  } finally {
    await pool.end();
  }
  
  // 4. Check Environment Variables
  console.log('\n🔧 Checking Environment Variables...');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  requiredEnvVars.forEach(envVar => {
    const exists = !!process.env[envVar];
    console.log(`${exists ? '✅' : '❌'} ${envVar}`);
    if (!exists) allPassed = false;
  });
  
  // 5. Summary
  console.log('\n📊 Verification Summary');
  console.log('=======================');
  
  if (allPassed) {
    console.log('🎉 All checks passed! Application is ready for testing and deployment.');
    console.log('\n📋 Next Steps:');
    console.log('1. Run: npm run build (to verify build)');
    console.log('2. Run: npm run dev (to start development server)');
    console.log('3. Test manually using the testing guide');
    console.log('4. Deploy to production when ready');
  } else {
    console.log('⚠️ Some checks failed. Please review the issues above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check file paths and ensure all files exist');
    console.log('2. Verify database connection and schema');
    console.log('3. Ensure all environment variables are set');
    console.log('4. Run database migrations if needed');
  }
  
  return allPassed;
}

// Run verification if called directly
if (require.main === module) {
  quickVerification().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { quickVerification };
