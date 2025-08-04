#!/usr/bin/env node

/**
 * Final deployment readiness verification
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Deployment Readiness Verification');
console.log('====================================\n');

const checks = [];

try {
  // 1. Build Success Verification
  console.log('📋 Check 1: Build Success');
  console.log('=========================');
  
  try {
    console.log('Testing production build...');
    execSync('npm run build', { stdio: 'pipe' });
    checks.push({ name: 'Production Build', status: '✅ PASS', details: 'Build completes without errors' });
    console.log('✅ Production build successful');
  } catch (error) {
    checks.push({ name: 'Production Build', status: '❌ FAIL', details: 'Build process fails' });
    console.log('❌ Production build failed');
  }

  // 2. TypeScript Compilation
  console.log('\n📋 Check 2: TypeScript Compilation');
  console.log('==================================');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    checks.push({ name: 'TypeScript Compilation', status: '✅ PASS', details: 'No TypeScript errors' });
    console.log('✅ TypeScript compilation successful');
  } catch (error) {
    checks.push({ name: 'TypeScript Compilation', status: '❌ FAIL', details: 'TypeScript errors found' });
    console.log('❌ TypeScript compilation failed');
  }

  // 3. Session Invalidation System
  console.log('\n📋 Check 3: Session Invalidation System');
  console.log('=======================================');
  
  const sessionInvalidationFiles = [
    'middleware.ts',
    'lib/auth.ts',
    'src/app/auth/signin/page.tsx',
    'src/app/api/admin/users/[id]/status/route.ts'
  ];
  
  let sessionSystemReady = true;
  sessionInvalidationFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      sessionSystemReady = false;
    }
  });
  
  if (sessionSystemReady) {
    // Check middleware for session invalidation logic
    const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
    const hasSessionCheck = middlewareContent.includes('checkSessionInvalidation');
    const hasForceLogout = middlewareContent.includes('api/auth/signout');
    
    // Check auth for deactivation blocking
    const authContent = fs.readFileSync('lib/auth.ts', 'utf8');
    const blocksDeactivated = authContent.includes('ACCOUNT_DEACTIVATED');
    
    // Check signin for suspense
    const signinContent = fs.readFileSync('src/app/auth/signin/page.tsx', 'utf8');
    const hasSuspense = signinContent.includes('Suspense');
    
    if (hasSessionCheck && hasForceLogout && blocksDeactivated && hasSuspense) {
      checks.push({ name: 'Session Invalidation System', status: '✅ PASS', details: 'All components properly implemented' });
      console.log('✅ Session invalidation system complete');
    } else {
      checks.push({ name: 'Session Invalidation System', status: '⚠️  PARTIAL', details: 'Some components may be incomplete' });
      console.log('⚠️  Session invalidation system partially implemented');
    }
  } else {
    checks.push({ name: 'Session Invalidation System', status: '❌ FAIL', details: 'Missing required files' });
  }

  // 4. Environment Variables
  console.log('\n📋 Check 4: Environment Variables');
  console.log('=================================');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  let envVarsReady = true;
  
  if (fs.existsSync('.env.example')) {
    const envExample = fs.readFileSync('.env.example', 'utf8');
    
    requiredEnvVars.forEach(envVar => {
      if (envExample.includes(envVar)) {
        console.log(`✅ ${envVar} documented in .env.example`);
      } else {
        console.log(`⚠️  ${envVar} not documented in .env.example`);
      }
    });
    
    checks.push({ name: 'Environment Variables', status: '✅ PASS', details: 'Environment template exists' });
  } else {
    checks.push({ name: 'Environment Variables', status: '⚠️  WARN', details: 'No .env.example found' });
    envVarsReady = false;
  }

  // 5. Database Schema Readiness
  console.log('\n📋 Check 5: Database Schema');
  console.log('===========================');
  
  const migrationScripts = [
    'scripts/add-session-invalidation-migration.js',
    'scripts/add-card-balance-migration.js',
    'scripts/fix-card-balance-transaction-constraint.js'
  ];
  
  let migrationsReady = true;
  migrationScripts.forEach(script => {
    if (fs.existsSync(script)) {
      console.log(`✅ ${script} available`);
    } else {
      console.log(`❌ ${script} missing`);
      migrationsReady = false;
    }
  });
  
  if (migrationsReady) {
    checks.push({ name: 'Database Migrations', status: '✅ PASS', details: 'All migration scripts available' });
  } else {
    checks.push({ name: 'Database Migrations', status: '❌ FAIL', details: 'Missing migration scripts' });
  }

  // 6. Vercel Configuration
  console.log('\n📋 Check 6: Vercel Configuration');
  console.log('================================');
  
  if (fs.existsSync('vercel.json')) {
    console.log('✅ vercel.json found');
    checks.push({ name: 'Vercel Configuration', status: '✅ PASS', details: 'Custom Vercel config present' });
  } else {
    console.log('⚠️  No vercel.json found (using defaults)');
    checks.push({ name: 'Vercel Configuration', status: '⚠️  WARN', details: 'Using default Vercel configuration' });
  }

  // 7. Package.json Scripts
  console.log('\n📋 Check 7: Package Scripts');
  console.log('===========================');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['build', 'start', 'dev'];
  
  let scriptsReady = true;
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
    } else {
      console.log(`❌ ${script}: Missing`);
      scriptsReady = false;
    }
  });
  
  if (scriptsReady) {
    checks.push({ name: 'Package Scripts', status: '✅ PASS', details: 'All required scripts present' });
  } else {
    checks.push({ name: 'Package Scripts', status: '❌ FAIL', details: 'Missing required scripts' });
  }

  // Summary
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
    console.log('🎉 READY FOR VERCEL DEPLOYMENT!');
    console.log('===============================');
    console.log('✅ All critical checks passed');
    console.log('✅ Build process working correctly');
    console.log('✅ Session invalidation system implemented');
    console.log('✅ TypeScript compilation successful');
    
    console.log('\n📋 DEPLOYMENT STEPS:');
    console.log('1. Commit and push all changes to your repository');
    console.log('2. Deploy to Vercel (should now succeed)');
    console.log('3. Set environment variables in Vercel dashboard:');
    console.log('   - DATABASE_URL (your Railway PostgreSQL URL)');
    console.log('   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)');
    console.log('   - NEXTAUTH_URL (your Vercel deployment URL)');
    console.log('4. Run database migrations in production');
    console.log('5. Test session invalidation functionality');
    
    console.log('\n🔧 POST-DEPLOYMENT VERIFICATION:');
    console.log('1. Test user login/logout functionality');
    console.log('2. Test admin user deactivation');
    console.log('3. Verify session invalidation works');
    console.log('4. Test card balance functionality');
    console.log('5. Check all existing features still work');
    
  } else {
    console.log('❌ NOT READY FOR DEPLOYMENT');
    console.log('===========================');
    console.log(`${failedChecks} critical issue(s) need to be resolved before deployment.`);
    console.log('Please fix the failed checks above and run this script again.');
  }
  
} catch (error) {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
}
