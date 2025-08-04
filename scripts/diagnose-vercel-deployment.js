#!/usr/bin/env node

/**
 * Vercel Deployment Diagnostic Script
 * Identifies issues that could cause deployment failures
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Vercel Deployment Diagnostic');
console.log('===============================\n');

const issues = [];
const warnings = [];

try {
  // 1. Check package.json for validation script
  console.log('📋 Step 1: Checking package.json configuration...');
  
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    console.log('✅ package.json found');
    
    // Check for validate script
    if (packageJson.scripts && packageJson.scripts.validate) {
      console.log(`✅ Validate script found: ${packageJson.scripts.validate}`);
    } else {
      console.log('⚠️  No validate script found in package.json');
    }
    
    // Check for build script
    if (packageJson.scripts && packageJson.scripts.build) {
      console.log(`✅ Build script found: ${packageJson.scripts.build}`);
    } else {
      issues.push('❌ Missing build script in package.json');
    }
    
    // Check for type checking script
    if (packageJson.scripts && packageJson.scripts['type-check']) {
      console.log(`✅ Type-check script found: ${packageJson.scripts['type-check']}`);
    } else {
      warnings.push('⚠️  No type-check script found');
    }
    
  } else {
    issues.push('❌ package.json not found');
  }

  // 2. Check TypeScript configuration
  console.log('\n📋 Step 2: Checking TypeScript configuration...');
  
  if (fs.existsSync('tsconfig.json')) {
    console.log('✅ tsconfig.json found');
    
    try {
      const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
      
      // Check for strict mode
      if (tsConfig.compilerOptions && tsConfig.compilerOptions.strict) {
        console.log('✅ TypeScript strict mode enabled');
      } else {
        warnings.push('⚠️  TypeScript strict mode not enabled');
      }
      
      // Check for path mapping
      if (tsConfig.compilerOptions && tsConfig.compilerOptions.paths) {
        console.log('✅ Path mapping configured');
      } else {
        warnings.push('⚠️  No path mapping found');
      }
      
    } catch (error) {
      issues.push('❌ Invalid tsconfig.json format');
    }
  } else {
    issues.push('❌ tsconfig.json not found');
  }

  // 3. Check for TypeScript compilation errors
  console.log('\n📋 Step 3: Checking TypeScript compilation...');
  
  try {
    console.log('Running TypeScript type check...');
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
  } catch (error) {
    const errorOutput = error.stdout ? error.stdout.toString() : error.stderr.toString();
    issues.push('❌ TypeScript compilation errors found');
    console.log('TypeScript errors:');
    console.log(errorOutput);
  }

  // 4. Check for recent file changes that might cause issues
  console.log('\n📋 Step 4: Checking recent changes...');
  
  const recentFiles = [
    'src/app/api/auth/refresh-session/route.ts',
    'src/hooks/useSessionRefresh.ts',
    'src/app/dashboard/layout.tsx',
    'lib/db.ts',
    'src/app/api/balance/route.ts',
    'src/components/user/BalanceCards.tsx',
    'src/components/admin/BalanceManager.tsx'
  ];
  
  recentFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      issues.push(`❌ Missing file: ${file}`);
    }
  });

  // 5. Check for import/export issues
  console.log('\n📋 Step 5: Checking import/export issues...');
  
  const filesToCheck = [
    'src/app/api/auth/refresh-session/route.ts',
    'src/hooks/useSessionRefresh.ts'
  ];
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for proper imports
      if (content.includes('import') && content.includes('from')) {
        console.log(`✅ ${file} has proper imports`);
      } else {
        warnings.push(`⚠️  ${file} may have import issues`);
      }
      
      // Check for proper exports
      if (content.includes('export')) {
        console.log(`✅ ${file} has exports`);
      } else {
        warnings.push(`⚠️  ${file} may have export issues`);
      }
    }
  });

  // 6. Check for dependency issues
  console.log('\n📋 Step 6: Checking dependencies...');
  
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredDeps = [
      'next',
      'react',
      'next-auth',
      'framer-motion',
      'lucide-react'
    ];
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        console.log(`✅ ${dep}: ${allDeps[dep]}`);
      } else {
        issues.push(`❌ Missing dependency: ${dep}`);
      }
    });
  }

  // 7. Check for Next.js configuration
  console.log('\n📋 Step 7: Checking Next.js configuration...');
  
  if (fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs')) {
    console.log('✅ Next.js config found');
  } else {
    warnings.push('⚠️  No Next.js config found');
  }

  // 8. Check for environment variables template
  console.log('\n📋 Step 8: Checking environment configuration...');
  
  if (fs.existsSync('.env.example') || fs.existsSync('.env.local.example')) {
    console.log('✅ Environment template found');
  } else {
    warnings.push('⚠️  No environment template found');
  }

  // Summary
  console.log('\n🎯 DIAGNOSTIC SUMMARY');
  console.log('====================');
  
  if (issues.length === 0) {
    console.log('✅ No critical issues found!');
  } else {
    console.log(`❌ Found ${issues.length} critical issue(s):`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Found ${warnings.length} warning(s):`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }

  // Recommendations
  console.log('\n🔧 RECOMMENDATIONS:');
  
  if (issues.length > 0) {
    console.log('1. Fix all critical issues listed above');
    console.log('2. Run TypeScript compilation locally: npx tsc --noEmit');
    console.log('3. Test build locally: npm run build');
    console.log('4. Check Vercel build logs for specific error details');
  } else {
    console.log('1. Run local build test: npm run build');
    console.log('2. Check Vercel environment variables');
    console.log('3. Review Vercel build logs for specific errors');
  }

} catch (error) {
  console.error('❌ Diagnostic script failed:', error.message);
}
