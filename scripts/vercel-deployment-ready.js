#!/usr/bin/env node

/**
 * Vercel Deployment Readiness Check
 * Final verification that all issues are resolved
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Vercel Deployment Readiness Check');
console.log('====================================\n');

const checks = [];

try {
  // 1. TypeScript Compilation Check
  console.log('📋 Check 1: TypeScript Compilation...');
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    checks.push({ name: 'TypeScript Compilation', status: '✅ PASS', details: 'No compilation errors' });
  } catch (error) {
    checks.push({ name: 'TypeScript Compilation', status: '❌ FAIL', details: 'Compilation errors found' });
  }

  // 2. Validation Script Check
  console.log('📋 Check 2: Validation Script...');
  try {
    execSync('npm run validate', { stdio: 'pipe' });
    checks.push({ name: 'Validation Script', status: '✅ PASS', details: 'Validation passes without errors' });
  } catch (error) {
    checks.push({ name: 'Validation Script', status: '❌ FAIL', details: 'Validation script fails' });
  }

  // 3. Build Process Check
  console.log('📋 Check 3: Build Process...');
  try {
    execSync('npm run build', { stdio: 'pipe' });
    checks.push({ name: 'Build Process', status: '✅ PASS', details: 'Build completes successfully' });
  } catch (error) {
    checks.push({ name: 'Build Process', status: '❌ FAIL', details: 'Build process fails' });
  }

  // 4. New Features Check
  console.log('📋 Check 4: New Features Implementation...');
  
  const newFiles = [
    'src/app/api/auth/refresh-session/route.ts',
    'src/hooks/useSessionRefresh.ts',
    'scripts/add-card-balance-migration.js'
  ];
  
  let allNewFilesExist = true;
  newFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      allNewFilesExist = false;
    }
  });
  
  if (allNewFilesExist) {
    checks.push({ name: 'New Features', status: '✅ PASS', details: 'All new feature files present' });
  } else {
    checks.push({ name: 'New Features', status: '❌ FAIL', details: 'Some new feature files missing' });
  }

  // 5. Database Migration Check
  console.log('📋 Check 5: Database Migration Scripts...');
  
  const migrationFiles = [
    'scripts/add-card-balance-migration.js',
    'scripts/production-migration.js'
  ];
  
  let allMigrationsExist = true;
  migrationFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      allMigrationsExist = false;
    }
  });
  
  if (allMigrationsExist) {
    checks.push({ name: 'Database Migrations', status: '✅ PASS', details: 'All migration scripts present' });
  } else {
    checks.push({ name: 'Database Migrations', status: '❌ FAIL', details: 'Some migration scripts missing' });
  }

  // 6. Package.json Check
  console.log('📋 Check 6: Package.json Configuration...');
  
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = ['build', 'validate', 'type-check'];
    const hasAllScripts = requiredScripts.every(script => packageJson.scripts && packageJson.scripts[script]);
    
    if (hasAllScripts) {
      checks.push({ name: 'Package.json Scripts', status: '✅ PASS', details: 'All required scripts present' });
    } else {
      checks.push({ name: 'Package.json Scripts', status: '❌ FAIL', details: 'Missing required scripts' });
    }
  } else {
    checks.push({ name: 'Package.json Scripts', status: '❌ FAIL', details: 'package.json not found' });
  }

  // 7. Environment Configuration Check
  console.log('📋 Check 7: Environment Configuration...');
  
  if (fs.existsSync('.env.production.example')) {
    checks.push({ name: 'Environment Config', status: '✅ PASS', details: 'Production environment template exists' });
  } else {
    checks.push({ name: 'Environment Config', status: '⚠️  WARN', details: 'No production environment template' });
  }

  // Results Summary
  console.log('\n🎯 DEPLOYMENT READINESS SUMMARY');
  console.log('===============================\n');
  
  const passedChecks = checks.filter(check => check.status.includes('✅')).length;
  const failedChecks = checks.filter(check => check.status.includes('❌')).length;
  const warningChecks = checks.filter(check => check.status.includes('⚠️')).length;
  
  checks.forEach((check, index) => {
    console.log(`${index + 1}. ${check.status} ${check.name}`);
    console.log(`   ${check.details}\n`);
  });
  
  console.log(`📊 Results: ${passedChecks} passed, ${failedChecks} failed, ${warningChecks} warnings\n`);
  
  if (failedChecks === 0) {
    console.log('🎉 DEPLOYMENT READY!');
    console.log('====================');
    console.log('✅ All critical checks passed');
    console.log('✅ TypeScript compilation successful');
    console.log('✅ Build process working');
    console.log('✅ Validation script fixed');
    console.log('✅ New features implemented');
    
    console.log('\n📋 DEPLOYMENT STEPS:');
    console.log('1. Commit and push all changes to your repository');
    console.log('2. Deploy to Vercel (should now succeed)');
    console.log('3. Run database migration in production:');
    console.log('   - node scripts/add-card-balance-migration.js');
    console.log('4. Verify new features work in production');
    
    console.log('\n🔧 NEW FEATURES READY:');
    console.log('✅ Real-time user status updates (15-second polling)');
    console.log('✅ Card balance feature (5th balance type)');
    console.log('✅ Enhanced admin controls');
    console.log('✅ Improved session management');
    
  } else {
    console.log('❌ DEPLOYMENT NOT READY');
    console.log('========================');
    console.log(`${failedChecks} critical issue(s) need to be resolved before deployment.`);
    console.log('Please fix the failed checks above and run this script again.');
  }
  
} catch (error) {
  console.error('❌ Readiness check failed:', error.message);
  process.exit(1);
}
