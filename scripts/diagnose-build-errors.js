#!/usr/bin/env node

/**
 * Comprehensive build error diagnosis script
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Build Error Diagnosis');
console.log('========================\n');

const issues = [];
const warnings = [];

try {
  // 1. Check TypeScript compilation
  console.log('📋 Step 1: TypeScript Compilation Check');
  console.log('=======================================');
  
  try {
    console.log('Running TypeScript compilation...');
    const tscOutput = execSync('npx tsc --noEmit --skipLibCheck', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ TypeScript compilation successful');
  } catch (error) {
    console.log('❌ TypeScript compilation failed');
    console.log('Error output:');
    console.log(error.stdout || error.stderr);
    issues.push('TypeScript compilation errors');
  }

  // 2. Check middleware.ts for issues
  console.log('\n📋 Step 2: Middleware Analysis');
  console.log('==============================');
  
  if (fs.existsSync('middleware.ts')) {
    const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
    
    // Check for import issues
    const hasPoolImport = middlewareContent.includes('import { Pool }');
    const hasNextAuthImport = middlewareContent.includes('import { getToken }');
    const hasNextResponseImport = middlewareContent.includes('import { NextResponse }');
    
    console.log(`Pool import: ${hasPoolImport ? '✅ Present' : '❌ Missing'}`);
    console.log(`NextAuth import: ${hasNextAuthImport ? '✅ Present' : '❌ Missing'}`);
    console.log(`NextResponse import: ${hasNextResponseImport ? '✅ Present' : '❌ Missing'}`);
    
    // Check for potential issues
    if (middlewareContent.includes('process.env.DATABASE_URL')) {
      console.log('⚠️  Middleware accesses DATABASE_URL - may cause build issues');
      warnings.push('Middleware database access during build');
    }
    
    // Check for async/await in middleware
    const hasAsyncMiddleware = middlewareContent.includes('async function middleware');
    const hasAwaitInMiddleware = middlewareContent.includes('await checkSessionInvalidation');
    
    console.log(`Async middleware: ${hasAsyncMiddleware ? '✅ Present' : '❌ Missing'}`);
    console.log(`Await usage: ${hasAwaitInMiddleware ? '✅ Present' : '❌ Missing'}`);
    
    if (hasAwaitInMiddleware && !hasAsyncMiddleware) {
      issues.push('Await used without async function in middleware');
    }
    
  } else {
    issues.push('middleware.ts file not found');
  }

  // 3. Check auth.ts for issues
  console.log('\n📋 Step 3: Auth Configuration Analysis');
  console.log('=====================================');
  
  if (fs.existsSync('lib/auth.ts')) {
    const authContent = fs.readFileSync('lib/auth.ts', 'utf8');
    
    // Check for import issues
    const hasNextAuthImport = authContent.includes('import { NextAuthOptions }');
    const hasCredentialsImport = authContent.includes('import CredentialsProvider');
    const hasUserQueriesImport = authContent.includes('import { userQueries }');
    
    console.log(`NextAuth import: ${hasNextAuthImport ? '✅ Present' : '❌ Missing'}`);
    console.log(`Credentials provider: ${hasCredentialsImport ? '✅ Present' : '❌ Missing'}`);
    console.log(`User queries import: ${hasUserQueriesImport ? '✅ Present' : '❌ Missing'}`);
    
    // Check for error throwing syntax
    const hasErrorThrow = authContent.includes('throw new Error');
    const hasAccountDeactivated = authContent.includes('ACCOUNT_DEACTIVATED');
    
    console.log(`Error throwing: ${hasErrorThrow ? '✅ Present' : '❌ Missing'}`);
    console.log(`Deactivation error: ${hasAccountDeactivated ? '✅ Present' : '❌ Missing'}`);
    
  } else {
    issues.push('lib/auth.ts file not found');
  }

  // 4. Check signin page for issues
  console.log('\n📋 Step 4: Signin Page Analysis');
  console.log('===============================');
  
  if (fs.existsSync('src/app/auth/signin/page.tsx')) {
    const signinContent = fs.readFileSync('src/app/auth/signin/page.tsx', 'utf8');
    
    // Check for import issues
    const hasUseEffect = signinContent.includes('useEffect');
    const hasUseSearchParams = signinContent.includes('useSearchParams');
    const hasLucideIcons = signinContent.includes('AlertTriangle');
    
    console.log(`useEffect import: ${hasUseEffect ? '✅ Present' : '❌ Missing'}`);
    console.log(`useSearchParams import: ${hasUseSearchParams ? '✅ Present' : '❌ Missing'}`);
    console.log(`Lucide icons import: ${hasLucideIcons ? '✅ Present' : '❌ Missing'}`);
    
    // Check for potential client-side issues
    const hasClientDirective = signinContent.includes('"use client"');
    console.log(`Client directive: ${hasClientDirective ? '✅ Present' : '❌ Missing'}`);
    
    if (!hasClientDirective && (hasUseEffect || hasUseSearchParams)) {
      issues.push('Client-side hooks used without "use client" directive');
    }
    
  } else {
    issues.push('src/app/auth/signin/page.tsx file not found');
  }

  // 5. Check package.json dependencies
  console.log('\n📋 Step 5: Dependencies Check');
  console.log('=============================');
  
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredDeps = [
      'next-auth',
      'pg',
      'next',
      'react',
      'lucide-react',
      'framer-motion'
    ];
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        console.log(`✅ ${dep}: ${allDeps[dep]}`);
      } else {
        issues.push(`Missing dependency: ${dep}`);
        console.log(`❌ ${dep}: Missing`);
      }
    });
    
    // Check for @types/pg for TypeScript
    if (allDeps['pg'] && !allDeps['@types/pg']) {
      warnings.push('Missing @types/pg for TypeScript support');
      console.log('⚠️  @types/pg missing - may cause TypeScript issues');
    }
    
  } else {
    issues.push('package.json not found');
  }

  // 6. Check environment variables template
  console.log('\n📋 Step 6: Environment Variables');
  console.log('================================');
  
  const envFiles = ['.env.example', '.env.local.example', '.env'];
  let envFileFound = false;
  
  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      envFileFound = true;
      console.log(`✅ ${file} found`);
      
      const envContent = fs.readFileSync(file, 'utf8');
      const hasDbUrl = envContent.includes('DATABASE_URL');
      const hasNextAuthSecret = envContent.includes('NEXTAUTH_SECRET');
      
      console.log(`   DATABASE_URL: ${hasDbUrl ? '✅ Present' : '❌ Missing'}`);
      console.log(`   NEXTAUTH_SECRET: ${hasNextAuthSecret ? '✅ Present' : '❌ Missing'}`);
    }
  });
  
  if (!envFileFound) {
    warnings.push('No environment variable template found');
  }

  // 7. Check for build script issues
  console.log('\n📋 Step 7: Build Configuration');
  console.log('==============================');
  
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.build) {
      console.log(`✅ Build script: ${packageJson.scripts.build}`);
    } else {
      issues.push('Missing build script in package.json');
    }
    
    if (packageJson.scripts && packageJson.scripts.validate) {
      console.log(`✅ Validate script: ${packageJson.scripts.validate}`);
    }
  }

  // Summary
  console.log('\n🎯 DIAGNOSIS SUMMARY');
  console.log('===================');
  
  if (issues.length === 0) {
    console.log('✅ No critical issues found in static analysis');
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

  console.log('\n🔧 RECOMMENDATIONS:');
  if (issues.length > 0) {
    console.log('1. Fix critical issues listed above');
    console.log('2. Run TypeScript compilation locally: npx tsc --noEmit');
    console.log('3. Test build locally: npm run build');
  } else {
    console.log('1. Run local build test: npm run build');
    console.log('2. Check Vercel environment variables');
    console.log('3. Review Vercel build logs for specific errors');
  }

} catch (error) {
  console.error('❌ Diagnosis script failed:', error.message);
}
