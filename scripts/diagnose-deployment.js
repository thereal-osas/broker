#!/usr/bin/env node

/**
 * Deployment Diagnostic Script
 * Checks for common issues that could cause deployment failures
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Deployment Diagnostic Tool');
console.log('=====================================\n');

const issues = [];
const warnings = [];

// 1. Check if system_settings table creation script exists
console.log('📋 Step 1: Checking database setup...');
const dbSetupScript = 'scripts/create-system-settings.js';
if (fs.existsSync(dbSetupScript)) {
  console.log('✅ System settings creation script found');
} else {
  issues.push('❌ Missing system_settings table creation script');
}

// 2. Check middleware.ts configuration
console.log('\n📋 Step 2: Checking middleware configuration...');
const middlewarePath = 'middleware.ts';
if (fs.existsSync(middlewarePath)) {
  console.log('✅ Middleware file found');
  
  try {
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
    
    // Check for common middleware issues
    if (middlewareContent.includes('getToken')) {
      console.log('✅ NextAuth token handling found');
    } else {
      warnings.push('⚠️  NextAuth token handling might be missing');
    }
    
    if (middlewareContent.includes('matcher')) {
      console.log('✅ Middleware matcher configuration found');
    } else {
      warnings.push('⚠️  Middleware matcher configuration might be missing');
    }
    
    if (middlewareContent.includes('NEXTAUTH_SECRET')) {
      console.log('✅ NextAuth secret reference found');
    } else {
      warnings.push('⚠️  NextAuth secret reference might be missing');
    }
    
  } catch (error) {
    issues.push(`❌ Error reading middleware.ts: ${error.message}`);
  }
} else {
  issues.push('❌ Missing middleware.ts file');
}

// 3. Check TypeScript types
console.log('\n📋 Step 3: Checking TypeScript configuration...');
const typesPath = 'types/next-auth.d.ts';
if (fs.existsSync(typesPath)) {
  console.log('✅ NextAuth types file found');
  
  try {
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    
    if (typesContent.includes('isActive')) {
      console.log('✅ isActive property found in types');
    } else {
      issues.push('❌ Missing isActive property in NextAuth types');
    }
    
  } catch (error) {
    issues.push(`❌ Error reading types file: ${error.message}`);
  }
} else {
  issues.push('❌ Missing NextAuth types file');
}

// 4. Check new API endpoints
console.log('\n📋 Step 4: Checking new API endpoints...');
const apiEndpoints = [
  'src/app/api/admin/settings/route.ts',
  'src/app/api/admin/users/[id]/delete/route.ts',
  'src/app/api/platform-settings/route.ts'
];

apiEndpoints.forEach(endpoint => {
  if (fs.existsSync(endpoint)) {
    console.log(`✅ ${endpoint} found`);
  } else {
    issues.push(`❌ Missing API endpoint: ${endpoint}`);
  }
});

// 5. Check new components
console.log('\n📋 Step 5: Checking new components...');
const components = [
  'src/components/DeactivationBanner.tsx',
  'src/components/RestrictedAccess.tsx'
];

components.forEach(component => {
  if (fs.existsSync(component)) {
    console.log(`✅ ${component} found`);
  } else {
    issues.push(`❌ Missing component: ${component}`);
  }
});

// 6. Check package.json for dependencies
console.log('\n📋 Step 6: Checking dependencies...');
if (fs.existsSync('package.json')) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = ['next-auth', 'framer-motion', 'lucide-react'];
    requiredDeps.forEach(dep => {
      if (dependencies[dep]) {
        console.log(`✅ ${dep} dependency found`);
      } else {
        warnings.push(`⚠️  Missing dependency: ${dep}`);
      }
    });
    
  } catch (error) {
    issues.push(`❌ Error reading package.json: ${error.message}`);
  }
} else {
  issues.push('❌ Missing package.json file');
}

// 7. Check environment variables template
console.log('\n📋 Step 7: Checking environment configuration...');
if (fs.existsSync('.env.example') || fs.existsSync('.env.local')) {
  console.log('✅ Environment file template found');
} else {
  warnings.push('⚠️  No environment file template found');
}

// 8. Check for TypeScript compilation issues
console.log('\n📋 Step 8: Checking for potential TypeScript issues...');
const tsConfigPath = 'tsconfig.json';
if (fs.existsSync(tsConfigPath)) {
  console.log('✅ TypeScript configuration found');
} else {
  warnings.push('⚠️  TypeScript configuration missing');
}

// Summary
console.log('\n🎯 DIAGNOSTIC SUMMARY');
console.log('=====================================');

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

console.log('\n📋 NEXT STEPS:');
if (issues.length > 0) {
  console.log('1. Fix all critical issues listed above');
  console.log('2. Run database migration script in production');
  console.log('3. Ensure all environment variables are set');
  console.log('4. Test TypeScript compilation: npm run build');
  console.log('5. Verify middleware configuration');
} else {
  console.log('1. Run database migration script in production');
  console.log('2. Verify environment variables in deployment');
  console.log('3. Check deployment logs for specific errors');
}

console.log('\n🔧 For detailed troubleshooting, check the deployment guide below.');
