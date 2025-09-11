#!/usr/bin/env node

/**
 * Switch Back to Production Environment
 * 
 * Restores your production .env.local configuration from backup
 */

const fs = require('fs');
const path = require('path');

function switchToProduction() {
  console.log('🔄 Switching Back to Production Environment');
  console.log('==========================================\n');

  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envBackupPath = path.join(process.cwd(), '.env.local.production.backup');

  try {
    // Check if backup exists
    if (!fs.existsSync(envBackupPath)) {
      console.log('❌ No production backup found');
      console.log('Please manually configure your .env.local for production');
      return;
    }

    // Restore production configuration
    console.log('📋 Restoring production configuration...');
    fs.copyFileSync(envBackupPath, envLocalPath);
    console.log('✅ Production configuration restored');

    // Verify the restoration
    console.log('\n📋 Verifying configuration...');
    const restoredConfig = fs.readFileSync(envLocalPath, 'utf8');
    const isProductionDb = restoredConfig.includes('railway.internal') || restoredConfig.includes('railway');
    const noTestingMode = !restoredConfig.includes('TESTING_MODE="true"');

    console.log(`Database: ${isProductionDb ? '✅ Production' : '❌ Local'}`);
    console.log(`Testing Mode: ${noTestingMode ? '✅ Disabled' : '❌ Still Enabled'}`);

    if (isProductionDb && noTestingMode) {
      console.log('\n🎯 PRODUCTION ENVIRONMENT RESTORED');
      console.log('==================================');
      console.log('✅ Your application is back to production configuration');
      console.log('✅ Ready for deployment');
      
      console.log('\n📋 Next Steps:');
      console.log('1. Restart your development server');
      console.log('2. Deploy your tested fixes');
      console.log('3. Monitor production for any issues');
    } else {
      console.log('\n❌ RESTORATION VERIFICATION FAILED');
      console.log('Please check the configuration manually');
    }

    // Clean up backup file
    console.log('\n🧹 Cleaning up...');
    fs.unlinkSync(envBackupPath);
    console.log('✅ Backup file removed');

  } catch (error) {
    console.error('❌ Restoration failed:', error.message);
  }
}

switchToProduction();
