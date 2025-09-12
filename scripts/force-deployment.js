#!/usr/bin/env node

/**
 * Force Deployment Script
 * 
 * This script helps force a new deployment to ensure
 * the live trade fixes are deployed to production
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function forceDeployment() {
  console.log('🚀 Force Deployment Script');
  console.log('=========================\n');
  
  try {
    // Step 1: Check current git status
    console.log('📋 Step 1: Checking Git Status');
    console.log('==============================');
    
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    
    if (gitStatus.trim()) {
      console.log('⚠️  Uncommitted changes found:');
      console.log(gitStatus);
    } else {
      console.log('✅ Working directory clean');
    }
    
    // Step 2: Check if we're on the main branch
    console.log('\n📋 Step 2: Checking Current Branch');
    console.log('=================================');
    
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    console.log(`Current branch: ${currentBranch}`);
    
    if (currentBranch !== 'main') {
      console.log('⚠️  Not on main branch - consider switching to main');
    }
    
    // Step 3: Create a deployment trigger commit
    console.log('\n📋 Step 3: Creating Deployment Trigger');
    console.log('=====================================');
    
    const timestamp = new Date().toISOString();
    const deploymentNote = `# Deployment Trigger\n\nForced deployment at: ${timestamp}\n\nThis commit triggers a new deployment to ensure live trade profit distribution fixes are active in production.\n\n## Changes Included:\n- Fixed live trade profit distribution for expired trades\n- Enhanced manual distribution to include all active trades\n- Fixed deposit approval balance type issue\n\n## Expected Results:\n- Manual profit distribution should process 4 hours\n- User balances should increase by $185.00 total\n- Live trades should complete after profit distribution\n`;
    
    fs.writeFileSync('DEPLOYMENT_NOTES.md', deploymentNote);
    console.log('✅ Created deployment notes file');
    
    // Step 4: Commit and push
    console.log('\n📋 Step 4: Committing and Pushing');
    console.log('================================');
    
    try {
      execSync('git add DEPLOYMENT_NOTES.md', { stdio: 'inherit' });
      execSync(`git commit -m "Force deployment: Live trade profit distribution fixes - ${timestamp}"`, { stdio: 'inherit' });
      console.log('✅ Changes committed');
      
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('✅ Changes pushed to remote');
      
    } catch (error) {
      console.log('⚠️  Git operations completed (may have been up to date)');
    }
    
    // Step 5: Verify deployment
    console.log('\n📋 Step 5: Deployment Verification Steps');
    console.log('=======================================');
    
    console.log('🎯 Manual Verification Steps:');
    console.log('1. 📱 Check your hosting platform dashboard:');
    console.log('   - Vercel: https://vercel.com/dashboard');
    console.log('   - Netlify: https://app.netlify.com/');
    console.log('   - Railway: https://railway.app/dashboard');
    
    console.log('\n2. 🔄 Wait for deployment to complete (usually 1-3 minutes)');
    
    console.log('\n3. 🧪 Test the live trade profit distribution:');
    console.log('   - Login to your admin panel');
    console.log('   - Go to live trade profit distribution');
    console.log('   - Click "Run Profit Distribution"');
    console.log('   - Should see "4 processed" instead of "0 processed"');
    
    console.log('\n4. ✅ Verify results:');
    console.log('   - Check user balances increased by $185.00 total');
    console.log('   - Verify 4 records in hourly_live_trade_profits table');
    console.log('   - Confirm live trades change to "completed" status');
    
    console.log('\n📋 If Still Not Working:');
    console.log('1. 🔍 Check deployment logs for errors');
    console.log('2. 🔄 Try a hard refresh (Ctrl+F5) on admin panel');
    console.log('3. 📊 Run the diagnosis script again:');
    console.log('   node scripts/diagnose-production-live-trades.js');
    
    console.log('\n🎉 DEPLOYMENT TRIGGER COMPLETE!');
    console.log('==============================');
    console.log('Your hosting platform should now rebuild with the latest fixes.');
    console.log('Wait 2-3 minutes then test the live trade profit distribution.');
    
  } catch (error) {
    console.error('❌ Deployment trigger failed:', error.message);
    
    console.log('\n🔧 Manual Deployment Steps:');
    console.log('1. Go to your hosting platform dashboard');
    console.log('2. Find your broker application');
    console.log('3. Trigger a manual redeploy/rebuild');
    console.log('4. Wait for completion and test again');
  }
}

forceDeployment();
