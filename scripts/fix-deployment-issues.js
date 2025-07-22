#!/usr/bin/env node

/**
 * Fix common deployment issues
 */

const fs = require('fs');
const path = require('path');

function fixDeploymentIssues() {
  console.log('🔧 Fixing Common Deployment Issues');
  console.log('==================================\n');
  
  let fixesApplied = 0;
  
  // 1. Check and fix import paths
  console.log('📥 Checking import paths...');
  
  const filesToCheck = [
    'src/app/dashboard/support/page.tsx',
    'src/app/admin/support/page.tsx',
    'src/app/api/support/tickets/route.ts',
    'src/app/api/support/messages/route.ts'
  ];
  
  filesToCheck.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Fix relative imports to absolute imports
      const fixes = [
        {
          from: /from ["']\.\.\/\.\.\/\.\.\/hooks\/useToast["']/g,
          to: 'from "@/hooks/useToast"'
        },
        {
          from: /from ["']\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\/auth["']/g,
          to: 'from "@/lib/auth"'
        },
        {
          from: /from ["']\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\/db["']/g,
          to: 'from "@/lib/db"'
        }
      ];
      
      fixes.forEach(fix => {
        if (fix.from.test(content)) {
          content = content.replace(fix.from, fix.to);
          modified = true;
          console.log(`✅ Fixed import in ${filePath}`);
          fixesApplied++;
        }
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content);
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  });
  
  // 2. Check tsconfig.json for path mapping
  console.log('\n⚙️ Checking TypeScript configuration...');
  
  if (fs.existsSync('tsconfig.json')) {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    if (!tsconfig.compilerOptions.paths || !tsconfig.compilerOptions.paths['@/*']) {
      console.log('🔧 Adding path mapping to tsconfig.json...');
      
      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
      }
      
      tsconfig.compilerOptions.paths['@/*'] = ['./src/*'];
      
      fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
      console.log('✅ Added path mapping to tsconfig.json');
      fixesApplied++;
    } else {
      console.log('✅ Path mapping already configured');
    }
  }
  
  // 3. Check for missing exports in API routes
  console.log('\n🌐 Checking API route exports...');
  
  const apiRoutes = [
    'src/app/api/support/tickets/route.ts',
    'src/app/api/support/messages/route.ts'
  ];
  
  apiRoutes.forEach(routePath => {
    if (fs.existsSync(routePath)) {
      const content = fs.readFileSync(routePath, 'utf8');
      
      if (!content.includes('export async function GET') && !content.includes('export async function POST')) {
        console.log(`❌ Missing exports in ${routePath}`);
      } else {
        console.log(`✅ Exports found in ${routePath}`);
      }
    }
  });
  
  // 4. Check for client component declarations
  console.log('\n📱 Checking client component declarations...');
  
  const clientComponents = [
    'src/app/dashboard/support/page.tsx',
    'src/app/admin/support/page.tsx'
  ];
  
  clientComponents.forEach(componentPath => {
    if (fs.existsSync(componentPath)) {
      const content = fs.readFileSync(componentPath, 'utf8');
      
      if (!content.startsWith('"use client";') && !content.startsWith("'use client';")) {
        console.log(`🔧 Adding "use client" to ${componentPath}...`);
        
        const newContent = '"use client";\n\n' + content;
        fs.writeFileSync(componentPath, newContent);
        console.log(`✅ Added "use client" to ${componentPath}`);
        fixesApplied++;
      } else {
        console.log(`✅ "use client" found in ${componentPath}`);
      }
    }
  });
  
  // 5. Check environment variables template
  console.log('\n🔧 Checking environment variables...');
  
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    
    if (envContent.includes('localhost') && envContent.includes('NEXTAUTH_URL')) {
      console.log('⚠️  NEXTAUTH_URL is set to localhost');
      console.log('   For deployment, set NEXTAUTH_URL to your production domain');
      console.log('   Example: https://your-app.vercel.app');
    }
  }
  
  // 6. Create deployment environment template
  console.log('\n📝 Creating deployment environment template...');
  
  const deploymentEnvTemplate = `# Deployment Environment Variables
# Copy these to your deployment platform (Vercel, Netlify, etc.)

# Database (Required)
DATABASE_URL=your_production_database_url

# NextAuth (Required)
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_production_secret_key

# Application (Optional)
APP_NAME=CredCrypto
APP_URL=https://your-domain.vercel.app

# Instructions:
# 1. Replace 'your-domain.vercel.app' with your actual domain
# 2. Replace 'your_production_database_url' with your production database URL
# 3. Generate a strong secret for NEXTAUTH_SECRET
# 4. Set these in your deployment platform's environment variables section
`;
  
  fs.writeFileSync('.env.deployment-template', deploymentEnvTemplate);
  console.log('✅ Created .env.deployment-template');
  
  // Summary
  console.log('\n📊 Fix Summary');
  console.log('===============');
  
  if (fixesApplied > 0) {
    console.log(`✅ Applied ${fixesApplied} fixes`);
    console.log('\n🚀 Next steps:');
    console.log('1. Try building again: npm run build');
    console.log('2. If deploying, update environment variables using .env.deployment-template');
    console.log('3. Ensure your production database has the support tables');
  } else {
    console.log('ℹ️  No automatic fixes needed');
    console.log('\n🔍 If still having issues:');
    console.log('1. Share the exact error message');
    console.log('2. Check deployment platform logs');
    console.log('3. Verify environment variables are set correctly');
  }
  
  console.log('\n📞 Common deployment issues:');
  console.log('- Environment variables not set in deployment platform');
  console.log('- NEXTAUTH_URL pointing to localhost instead of production domain');
  console.log('- Database tables not created in production');
  console.log('- Import path issues (should be fixed now)');
  
  return fixesApplied;
}

// Run fix if called directly
if (require.main === module) {
  fixDeploymentIssues();
}

module.exports = { fixDeploymentIssues };
