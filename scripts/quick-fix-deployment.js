#!/usr/bin/env node

/**
 * Quick Fix Script for Common Deployment Issues
 * Automatically fixes common problems that cause deployment failures
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function quickFixDeployment() {
  console.log('🔧 Quick Fix for Deployment Issues');
  console.log('===================================\n');

  const fixes = [];
  const errors = [];

  try {
    // Fix 1: Check and fix database connection
    console.log('🔍 Fix 1: Testing database connection...');
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      await pool.query('SELECT NOW()');
      await pool.end();
      fixes.push('✅ Database connection working');
    } catch (error) {
      errors.push(`❌ Database connection failed: ${error.message}`);
      console.log('💡 Suggestion: Check DATABASE_URL and network connectivity');
    }

    // Fix 2: Check environment variables
    console.log('\n🔍 Fix 2: Checking environment variables...');
    const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      fixes.push('✅ All required environment variables present');
    } else {
      errors.push(`❌ Missing environment variables: ${missingVars.join(', ')}`);
      console.log('💡 Suggestion: Set missing variables in your deployment platform');
    }

    // Fix 3: Check TypeScript configuration
    console.log('\n🔍 Fix 3: Checking TypeScript files...');
    const criticalFiles = [
      'types/next-auth.d.ts',
      'middleware.ts',
      'src/app/api/admin/settings/route.ts',
      'src/app/api/platform-settings/route.ts'
    ];
    
    let allFilesExist = true;
    criticalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} missing`);
        allFilesExist = false;
      }
    });
    
    if (allFilesExist) {
      fixes.push('✅ All critical TypeScript files present');
    } else {
      errors.push('❌ Some critical files are missing');
    }

    // Fix 4: Check and fix import paths
    console.log('\n🔍 Fix 4: Checking import paths...');
    const deleteRouteFile = 'src/app/api/admin/users/[id]/delete/route.ts';
    if (fs.existsSync(deleteRouteFile)) {
      const content = fs.readFileSync(deleteRouteFile, 'utf8');
      if (content.includes('@/lib/auth') && content.includes('@/lib/db')) {
        fixes.push('✅ Import paths are correct');
      } else {
        errors.push('❌ Import paths need fixing in delete route');
        console.log('💡 Suggestion: Use @/lib/auth and @/lib/db imports');
      }
    }

    // Fix 5: Check middleware configuration
    console.log('\n🔍 Fix 5: Checking middleware configuration...');
    if (fs.existsSync('middleware.ts')) {
      const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
      if (middlewareContent.includes('try {') && middlewareContent.includes('catch (error)')) {
        fixes.push('✅ Middleware has error handling');
      } else {
        errors.push('❌ Middleware missing error handling');
        console.log('💡 Suggestion: Add try-catch blocks in middleware');
      }
    } else {
      errors.push('❌ Middleware file missing');
    }

    // Fix 6: Auto-fix common issues
    console.log('\n🔧 Attempting automatic fixes...');
    
    // Auto-fix: Create missing directories
    const requiredDirs = [
      'src/app/api/admin/users/[id]/delete',
      'src/components',
      'scripts'
    ];
    
    requiredDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          fixes.push(`✅ Created missing directory: ${dir}`);
        } catch (error) {
          errors.push(`❌ Failed to create directory ${dir}: ${error.message}`);
        }
      }
    });

    // Summary and recommendations
    console.log('\n🎯 QUICK FIX SUMMARY');
    console.log('====================');
    
    if (fixes.length > 0) {
      console.log('\n✅ Successful fixes:');
      fixes.forEach(fix => console.log(`   ${fix}`));
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Issues that need manual attention:');
      errors.forEach(error => console.log(`   ${error}`));
      
      console.log('\n🔧 MANUAL FIX INSTRUCTIONS:');
      
      if (errors.some(e => e.includes('Database connection'))) {
        console.log('1. Database Connection Issues:');
        console.log('   - Verify DATABASE_URL format: postgresql://user:pass@host:port/db');
        console.log('   - Ensure database server is running and accessible');
        console.log('   - Check firewall and network settings');
      }
      
      if (errors.some(e => e.includes('environment variables'))) {
        console.log('2. Environment Variables:');
        console.log('   - Set missing variables in your deployment platform');
        console.log('   - For Vercel: Project Settings > Environment Variables');
        console.log('   - For Railway: Project Settings > Variables');
      }
      
      if (errors.some(e => e.includes('Import paths'))) {
        console.log('3. Import Path Issues:');
        console.log('   - Update imports to use @/lib/auth instead of relative paths');
        console.log('   - Ensure tsconfig.json has proper path mapping');
      }
      
    } else {
      console.log('\n🎉 All checks passed! Your deployment should work.');
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Fix any manual issues listed above');
    console.log('2. Run: node scripts/production-migration.js');
    console.log('3. Deploy your application');
    console.log('4. Run: node scripts/verify-deployment.js');
    
  } catch (error) {
    console.error('❌ Quick fix script failed:', error.message);
  }
}

quickFixDeployment();
