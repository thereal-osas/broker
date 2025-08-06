#!/usr/bin/env node

/**
 * Diagnose potential build errors
 */

const fs = require('fs');
const path = require('path');

function diagnoseBuildError() {
  console.log('🔍 Diagnosing Build Error');
  console.log('=========================\n');

  const issues = [];
  const warnings = [];

  try {
    // 1. Check for syntax errors in recent files
    console.log('📋 Step 1: Checking Recent File Syntax');
    console.log('======================================');

    const recentFiles = [
      'lib/liveTradeProfit.ts',
      'src/app/api/admin/live-trade/trades/[id]/deactivate/route.ts',
      'src/app/api/admin/live-trade/trades/[id]/route.ts',
      'src/app/api/cron/calculate-live-trade-profits/route.ts',
      'src/app/admin/live-trade/page.tsx',
      'src/app/dashboard/live-trade/page.tsx',
      'lib/db.ts'
    ];

    recentFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
        
        // Basic syntax check
        try {
          const content = fs.readFileSync(file, 'utf8');
          
          // Check for common syntax issues
          const hasUnmatchedBraces = (content.match(/\{/g) || []).length !== (content.match(/\}/g) || []).length;
          const hasUnmatchedParens = (content.match(/\(/g) || []).length !== (content.match(/\)/g) || []).length;
          const hasUnmatchedBrackets = (content.match(/\[/g) || []).length !== (content.match(/\]/g) || []).length;
          
          if (hasUnmatchedBraces) {
            issues.push(`${file}: Unmatched braces { }`);
          }
          if (hasUnmatchedParens) {
            issues.push(`${file}: Unmatched parentheses ( )`);
          }
          if (hasUnmatchedBrackets) {
            issues.push(`${file}: Unmatched brackets [ ]`);
          }
          
          // Check for incomplete imports
          const incompleteImports = content.match(/import\s+.*from\s*$/gm);
          if (incompleteImports) {
            issues.push(`${file}: Incomplete import statements`);
          }
          
        } catch (error) {
          issues.push(`${file}: Cannot read file - ${error.message}`);
        }
      } else {
        warnings.push(`${file}: File not found`);
      }
    });

    // 2. Check package.json
    console.log('\n📋 Step 2: Package.json Validation');
    console.log('===================================');

    if (fs.existsSync('package.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        console.log('✅ package.json is valid JSON');
        
        if (packageJson.scripts && packageJson.scripts.build) {
          console.log(`✅ Build script: ${packageJson.scripts.build}`);
        } else {
          issues.push('Missing build script in package.json');
        }
        
      } catch (error) {
        issues.push(`package.json: Invalid JSON - ${error.message}`);
      }
    } else {
      issues.push('package.json not found');
    }

    // 3. Check tsconfig.json
    console.log('\n📋 Step 3: TypeScript Configuration');
    console.log('===================================');

    if (fs.existsSync('tsconfig.json')) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
        console.log('✅ tsconfig.json is valid JSON');
        
        if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
          console.log('✅ Path mapping configured');
          console.log(`   @/*: ${JSON.stringify(tsconfig.compilerOptions.paths['@/*'])}`);
          console.log(`   @/lib/*: ${JSON.stringify(tsconfig.compilerOptions.paths['@/lib/*'])}`);
        }
        
      } catch (error) {
        issues.push(`tsconfig.json: Invalid JSON - ${error.message}`);
      }
    } else {
      warnings.push('tsconfig.json not found');
    }

    // 4. Check for circular dependencies
    console.log('\n📋 Step 4: Circular Dependency Check');
    console.log('====================================');

    // Simple check for potential circular imports
    const checkCircularDeps = (file, visited = new Set(), stack = new Set()) => {
      if (stack.has(file)) {
        return [`Circular dependency detected: ${Array.from(stack).join(' -> ')} -> ${file}`];
      }
      
      if (visited.has(file) || !fs.existsSync(file)) {
        return [];
      }
      
      visited.add(file);
      stack.add(file);
      
      const content = fs.readFileSync(file, 'utf8');
      const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
      
      const circularDeps = [];
      
      imports.forEach(importLine => {
        const match = importLine.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          let importPath = match[1];
          
          // Resolve relative imports
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            importPath = path.resolve(path.dirname(file), importPath);
            if (!importPath.endsWith('.ts') && !importPath.endsWith('.tsx')) {
              importPath += '.ts';
            }
          } else if (importPath.startsWith('@/')) {
            importPath = importPath.replace('@/', './src/');
            if (importPath.startsWith('./src/lib/')) {
              importPath = importPath.replace('./src/lib/', './lib/');
            }
            if (!importPath.endsWith('.ts') && !importPath.endsWith('.tsx')) {
              importPath += '.ts';
            }
          }
          
          if (fs.existsSync(importPath)) {
            circularDeps.push(...checkCircularDeps(importPath, visited, new Set(stack)));
          }
        }
      });
      
      stack.delete(file);
      return circularDeps;
    };

    const mainFiles = [
      'lib/liveTradeProfit.ts',
      'lib/db.ts',
      'lib/auth.ts'
    ];

    mainFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const circularDeps = checkCircularDeps(file);
        if (circularDeps.length > 0) {
          issues.push(...circularDeps);
        } else {
          console.log(`✅ ${file}: No circular dependencies detected`);
        }
      }
    });

    // 5. Check for missing dependencies
    console.log('\n📋 Step 5: Dependency Check');
    console.log('===========================');

    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const requiredDeps = [
        'next',
        'react',
        'typescript',
        'next-auth',
        'pg',
        'lucide-react',
        'framer-motion'
      ];
      
      requiredDeps.forEach(dep => {
        if (allDeps[dep]) {
          console.log(`✅ ${dep}: ${allDeps[dep]}`);
        } else {
          issues.push(`Missing dependency: ${dep}`);
        }
      });
    }

    // 6. Check .next directory
    console.log('\n📋 Step 6: Build Cache Check');
    console.log('============================');

    if (fs.existsSync('.next')) {
      console.log('⚠️  .next directory exists (may contain stale cache)');
      warnings.push('Consider clearing .next directory: rm -rf .next');
    } else {
      console.log('✅ No .next directory (clean state)');
    }

    // Summary
    console.log('\n🎯 BUILD ERROR DIAGNOSIS SUMMARY');
    console.log('================================');

    if (issues.length === 0) {
      console.log('✅ No critical issues detected in static analysis');
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

    console.log('\n💡 RECOMMENDED ACTIONS:');
    if (issues.length > 0) {
      console.log('1. Fix critical issues listed above');
      console.log('2. Clear build cache: rm -rf .next');
      console.log('3. Reinstall dependencies: npm ci');
      console.log('4. Try build again: npm run build');
    } else {
      console.log('1. Clear build cache: rm -rf .next');
      console.log('2. Try build again: npm run build');
      console.log('3. If still failing, check Vercel deployment logs');
      console.log('4. Verify environment variables are set correctly');
    }

  } catch (error) {
    console.error('❌ Diagnosis script failed:', error.message);
  }
}

diagnoseBuildError();
