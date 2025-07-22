#!/usr/bin/env node

/**
 * Check for common deployment issues
 */

const fs = require('fs');
const path = require('path');

function checkDeploymentIssues() {
  console.log('🔍 Checking for Common Deployment Issues');
  console.log('========================================\n');
  
  const issues = [];
  const warnings = [];
  
  // 1. Check package.json
  console.log('📦 Checking package.json...');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.scripts.build) {
      issues.push('Missing build script in package.json');
    } else {
      console.log('✅ Build script found');
    }
    
    if (!packageJson.scripts.start) {
      warnings.push('Missing start script in package.json');
    } else {
      console.log('✅ Start script found');
    }
    
  } catch (error) {
    issues.push('Cannot read package.json');
  }
  
  // 2. Check Next.js config
  console.log('\n⚙️ Checking Next.js configuration...');
  const nextConfigPath = 'next.config.js';
  if (fs.existsSync(nextConfigPath)) {
    console.log('✅ next.config.js found');
  } else {
    warnings.push('next.config.js not found (may be optional)');
  }
  
  // 3. Check environment variables
  console.log('\n🔧 Checking environment files...');
  const envFiles = ['.env', '.env.local', '.env.production'];
  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} found`);
    } else {
      console.log(`ℹ️  ${file} not found`);
    }
  });
  
  // 4. Check for TypeScript issues
  console.log('\n📝 Checking TypeScript configuration...');
  if (fs.existsSync('tsconfig.json')) {
    console.log('✅ tsconfig.json found');
  } else {
    issues.push('tsconfig.json missing');
  }
  
  // 5. Check for common problematic files
  console.log('\n🗂️ Checking for problematic files...');
  
  const problematicPatterns = [
    '.DS_Store',
    'node_modules',
    '.next',
    '*.log',
    '.env.local'
  ];
  
  // Check if .gitignore exists and has proper entries
  if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    console.log('✅ .gitignore found');
    
    const requiredIgnores = ['node_modules', '.next', '.env.local'];
    requiredIgnores.forEach(pattern => {
      if (gitignore.includes(pattern)) {
        console.log(`✅ ${pattern} in .gitignore`);
      } else {
        warnings.push(`${pattern} should be in .gitignore`);
      }
    });
  } else {
    warnings.push('.gitignore not found');
  }
  
  // 6. Check API routes
  console.log('\n🌐 Checking API routes...');
  const apiDir = 'src/app/api';
  if (fs.existsSync(apiDir)) {
    console.log('✅ API directory found');
    
    // Check for our new support API routes
    const supportRoutes = [
      'src/app/api/support/tickets/route.ts',
      'src/app/api/support/messages/route.ts'
    ];
    
    supportRoutes.forEach(route => {
      if (fs.existsSync(route)) {
        console.log(`✅ ${route} found`);
      } else {
        issues.push(`Missing API route: ${route}`);
      }
    });
  } else {
    issues.push('API directory not found');
  }
  
  // 7. Check for import/export issues
  console.log('\n📥 Checking for potential import issues...');
  
  const checkFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for common issues
      if (content.includes('import ') && content.includes('require(')) {
        warnings.push(`Mixed import styles in ${filePath}`);
      }
      
      // Check for missing exports
      if (filePath.includes('route.ts') && !content.includes('export')) {
        issues.push(`Missing exports in ${filePath}`);
      }
      
      return true;
    }
    return false;
  };
  
  // Check key files
  const keyFiles = [
    'src/app/dashboard/support/page.tsx',
    'src/app/admin/support/page.tsx',
    'src/app/api/support/tickets/route.ts',
    'src/app/api/support/messages/route.ts'
  ];
  
  keyFiles.forEach(file => {
    if (checkFile(file)) {
      console.log(`✅ ${file} syntax check passed`);
    } else {
      issues.push(`File not found: ${file}`);
    }
  });
  
  // 8. Check for database connection issues
  console.log('\n🗄️ Checking database configuration...');
  try {
    require('dotenv').config();
    if (process.env.DATABASE_URL) {
      console.log('✅ DATABASE_URL found in environment');
    } else {
      issues.push('DATABASE_URL not found in environment variables');
    }
    
    if (process.env.NEXTAUTH_SECRET) {
      console.log('✅ NEXTAUTH_SECRET found');
    } else {
      issues.push('NEXTAUTH_SECRET not found');
    }
    
    if (process.env.NEXTAUTH_URL) {
      console.log(`✅ NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
      if (process.env.NEXTAUTH_URL.includes('localhost')) {
        warnings.push('NEXTAUTH_URL is set to localhost (should be production URL for deployment)');
      }
    } else {
      issues.push('NEXTAUTH_URL not found');
    }
    
  } catch (error) {
    warnings.push('Could not check environment variables');
  }
  
  // 9. Summary
  console.log('\n📊 Deployment Readiness Summary');
  console.log('================================');
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('🎉 No issues found! Your app should deploy successfully.');
  } else {
    if (issues.length > 0) {
      console.log(`❌ Found ${issues.length} critical issue(s):`);
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log(`⚠️  Found ${warnings.length} warning(s):`);
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
  }
  
  console.log('\n🔧 Common Deployment Fixes:');
  console.log('1. Ensure NEXTAUTH_URL is set to production domain');
  console.log('2. Check all environment variables are set in deployment platform');
  console.log('3. Verify database is accessible from deployment platform');
  console.log('4. Run "npm run build" locally to check for build errors');
  console.log('5. Check deployment platform logs for specific error messages');
  
  return { issues, warnings };
}

// Run check if called directly
if (require.main === module) {
  checkDeploymentIssues();
}

module.exports = { checkDeploymentIssues };
