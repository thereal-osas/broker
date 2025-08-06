#!/usr/bin/env node

/**
 * Test minimal build by temporarily disabling new files
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function testMinimalBuild() {
  console.log('🔧 Testing Minimal Build');
  console.log('========================\n');

  const newFiles = [
    'lib/liveTradeProfit.ts',
    'src/app/api/admin/live-trade/trades/[id]/deactivate/route.ts',
    'src/app/api/admin/live-trade/trades/[id]/route.ts',
    'src/app/api/cron/calculate-live-trade-profits/route.ts'
  ];

  const backupFiles = [];

  try {
    // Step 1: Backup new files
    console.log('📋 Step 1: Backing up new files');
    console.log('================================');
    
    newFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const backupPath = `${file}.backup`;
        fs.copyFileSync(file, backupPath);
        backupFiles.push({ original: file, backup: backupPath });
        console.log(`✅ Backed up: ${file}`);
      }
    });

    // Step 2: Remove references to new files from existing files
    console.log('\n📋 Step 2: Temporarily removing new imports');
    console.log('===========================================');
    
    // Remove LiveTradeProfitService import from calculate-profits route
    const calculateProfitsPath = 'src/app/api/cron/calculate-profits/route.ts';
    if (fs.existsSync(calculateProfitsPath)) {
      let content = fs.readFileSync(calculateProfitsPath, 'utf8');
      const originalContent = content;
      
      // Comment out the import and usage
      content = content.replace(
        'import { LiveTradeProfitService } from "@/lib/liveTradeProfit";',
        '// import { LiveTradeProfitService } from "@/lib/liveTradeProfit";'
      );
      
      content = content.replace(
        /console\.log\("Running live trade profit distribution\.\.\."\);\s*const liveTradeResult = await LiveTradeProfitService\.runHourlyProfitDistribution\(\);/g,
        '// console.log("Running live trade profit distribution..."); // const liveTradeResult = await LiveTradeProfitService.runHourlyProfitDistribution();'
      );
      
      content = content.replace(
        /liveTradesProcessed: liveTradeResult\.processed,\s*liveTradesCompleted: liveTradeResult\.completed,/g,
        '// liveTradesProcessed: liveTradeResult.processed, // liveTradesCompleted: liveTradeResult.completed,'
      );
      
      fs.writeFileSync(calculateProfitsPath, content);
      backupFiles.push({ original: calculateProfitsPath, backup: `${calculateProfitsPath}.backup`, content: originalContent });
      console.log('✅ Temporarily disabled LiveTradeProfitService usage');
    }

    // Remove new files
    console.log('\n📋 Step 3: Temporarily removing new files');
    console.log('=========================================');
    
    newFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`✅ Removed: ${file}`);
      }
    });

    // Step 3: Try build
    console.log('\n📋 Step 4: Testing build without new files');
    console.log('==========================================');
    
    try {
      console.log('Running npm run build...');
      const buildOutput = execSync('npm run build', { 
        encoding: 'utf8', 
        timeout: 60000, // 60 second timeout
        stdio: 'pipe'
      });
      
      console.log('✅ Build successful without new files!');
      console.log('🔍 This suggests the issue is with one of the new files');
      
    } catch (buildError) {
      console.log('❌ Build still fails without new files');
      console.log('🔍 The issue might be with existing code or dependencies');
      console.log('Build error:', buildError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Restore all files
    console.log('\n📋 Step 5: Restoring all files');
    console.log('==============================');
    
    backupFiles.forEach(({ original, backup, content }) => {
      try {
        if (content) {
          // Restore content for modified files
          fs.writeFileSync(original, content);
        } else {
          // Restore copied files
          fs.copyFileSync(backup, original);
        }
        fs.unlinkSync(backup);
        console.log(`✅ Restored: ${original}`);
      } catch (error) {
        console.error(`❌ Failed to restore ${original}:`, error.message);
      }
    });
    
    console.log('\n🎯 MINIMAL BUILD TEST COMPLETE');
    console.log('==============================');
    console.log('All files have been restored to their original state.');
  }
}

testMinimalBuild();
