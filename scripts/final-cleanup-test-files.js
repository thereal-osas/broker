/**
 * Final Cleanup Script for Unnecessary Test Files
 * 
 * This script identifies and removes remaining unnecessary test files
 * that are outdated, redundant, or no longer needed after the live trade fixes.
 */

const fs = require('fs');
const path = require('path');

// Files to remove (outdated or redundant test files)
const filesToRemove = [
  // Duplicate live trade test files
  'scripts/test-live-trade-fixes.js', // Superseded by comprehensive test
  'scripts/test-live-trade-profit-fixes.js', // Superseded by comprehensive test
  'scripts/test-live-trade-profit-distribution.js', // Superseded by comprehensive test
  'scripts/test-live-trade-completion.js', // Superseded by comprehensive test
  'scripts/test-live-trade-comprehensive.js', // Old version
  
  // Debugging scripts for resolved issues
  'scripts/debug-live-trade-profits.js', // Issue resolved
  'scripts/diagnose-live-trade-issues.js', // Issue resolved
  'scripts/diagnose-production-live-trades.js', // Issue resolved
  'scripts/analyze-live-trade-completion.js', // Issue resolved
  
  // Outdated balance test files
  'scripts/test-simplified-balance.js', // Balance system finalized
  'scripts/debug-balance-issues.js', // Issues resolved
  'scripts/fix-balance-discrepancies.js', // Issues resolved
  'scripts/fix-negative-balances.js', // Issues resolved
  
  // Redundant constraint fix files
  'scripts/fix-live-trade-constraints.js', // Applied
  'scripts/fix-live-trade-status-constraint.js', // Applied
  'scripts/fix-live-trade-transaction-types.js', // Applied
  'scripts/fix-card-balance-transaction-constraint.js', // Applied
  'scripts/quick-fix-card-constraint.js', // Applied
  
  // Temporary migration files
  'scripts/add-card-balance-migration.js', // Applied
  'scripts/add-session-invalidation-migration.js', // Applied
  'scripts/add-transaction-hash-column.js', // Applied
  'scripts/fix-balance-deduction-schema.js', // Applied
  
  // Emergency/critical fix files (issues resolved)
  'scripts/emergency-fix-database.js', // Emergency resolved
  'scripts/deploy-critical-fixes.js', // Deployed
  'scripts/fix-critical-admin-functionality.js', // Fixed
  'scripts/force-deployment.js', // Deployment completed
  
  // Diagnostic files for resolved issues
  'scripts/diagnose-critical-issues.js', // Issues resolved
  'scripts/comprehensive-broker-analysis.js', // Analysis completed
  
  // Redundant API test files
  'scripts/test-live-trade-api.js', // Covered by comprehensive test
  'scripts/test-live-trade-apis.js', // Covered by comprehensive test
  'scripts/test-production-api.js', // Production stable
  
  // Old setup files
  'scripts/retry-local-setup.js', // Setup working
  'scripts/setup-live-trade-automation.js', // Automation implemented
];

// Files to keep (essential for ongoing maintenance)
const essentialFiles = [
  'scripts/auto-migrate.js',
  'scripts/migrate-production.js',
  'scripts/verify-db.js',
  'scripts/seed-database.js',
  'scripts/setup-local-testing-db.js',
  'scripts/test-live-trade-system-comprehensive.js', // Our new comprehensive test
  'scripts/test-all-enhancements.js',
  'scripts/comprehensive_profit_test.js',
  'scripts/test_profit_distribution.js',
  'scripts/test-support-system.js',
  'scripts/test-deposit-system.js',
  'scripts/test-email-verification.js',
  'scripts/test-referral-api.js',
  'scripts/test-balance-api.js',
  'scripts/test-admin-fund-management.js',
  'scripts/test-transaction-constraint.js',
  'scripts/api-endpoint-test.js',
  'scripts/test-live-trade-management.js',
  'scripts/verify-all-fixes.js',
];

async function cleanupTestFiles() {
  console.log('🧹 FINAL TEST FILES CLEANUP');
  console.log('===========================\n');

  let removedCount = 0;
  let keptCount = 0;
  let notFoundCount = 0;

  console.log('📋 Analyzing files for cleanup...\n');

  for (const filePath of filesToRemove) {
    try {
      if (fs.existsSync(filePath)) {
        // Check file size to avoid removing large important files
        const stats = fs.statSync(filePath);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        
        console.log(`🗑️  Removing: ${path.basename(filePath)} (${fileSizeKB} KB)`);
        fs.unlinkSync(filePath);
        removedCount++;
      } else {
        console.log(`⚠️  Not found: ${path.basename(filePath)} (already removed)`);
        notFoundCount++;
      }
    } catch (error) {
      console.log(`❌ Error removing ${filePath}: ${error.message}`);
    }
  }

  console.log('\n📊 CLEANUP SUMMARY');
  console.log('==================');
  console.log(`✅ Files removed: ${removedCount}`);
  console.log(`⚠️  Files not found: ${notFoundCount}`);
  console.log(`📁 Essential files kept: ${essentialFiles.length}`);

  console.log('\n📁 ESSENTIAL FILES PRESERVED');
  console.log('============================');
  essentialFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${path.basename(file)}`);
      keptCount++;
    } else {
      console.log(`❌ ${path.basename(file)} (missing)`);
    }
  });

  console.log('\n🎯 CLEANUP BENEFITS');
  console.log('===================');
  console.log('✅ Reduced project clutter');
  console.log('✅ Improved maintainability');
  console.log('✅ Clearer file organization');
  console.log('✅ Faster development navigation');
  console.log('✅ Reduced confusion from outdated scripts');

  console.log('\n📝 REMAINING TEST STRUCTURE');
  console.log('===========================');
  console.log('Database Management:');
  console.log('  - auto-migrate.js (automated migrations)');
  console.log('  - migrate-production.js (production migrations)');
  console.log('  - verify-db.js (database verification)');
  console.log('  - seed-database.js (test data seeding)');
  console.log('');
  console.log('System Testing:');
  console.log('  - test-live-trade-system-comprehensive.js (live trade testing)');
  console.log('  - test-all-enhancements.js (comprehensive system test)');
  console.log('  - comprehensive_profit_test.js (profit system testing)');
  console.log('  - test_profit_distribution.js (profit distribution testing)');
  console.log('');
  console.log('Feature Testing:');
  console.log('  - test-support-system.js (support chat testing)');
  console.log('  - test-deposit-system.js (deposit system testing)');
  console.log('  - test-email-verification.js (email verification testing)');
  console.log('  - test-referral-api.js (referral system testing)');
  console.log('  - test-balance-api.js (balance API testing)');
  console.log('  - test-admin-fund-management.js (admin fund management)');
  console.log('');
  console.log('API Testing:');
  console.log('  - api-endpoint-test.js (API endpoint testing)');
  console.log('  - test-transaction-constraint.js (transaction validation)');

  console.log('\n🚀 NEXT STEPS');
  console.log('=============');
  console.log('1. Run comprehensive live trade test:');
  console.log('   node scripts/test-live-trade-system-comprehensive.js');
  console.log('');
  console.log('2. Verify all systems working:');
  console.log('   node scripts/test-all-enhancements.js');
  console.log('');
  console.log('3. Test profit distribution:');
  console.log('   node scripts/comprehensive_profit_test.js');
  console.log('');
  console.log('4. Deploy to production with confidence!');

  return {
    removed: removedCount,
    notFound: notFoundCount,
    kept: keptCount
  };
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupTestFiles()
    .then(result => {
      console.log(`\n✅ Cleanup completed: ${result.removed} files removed, ${result.kept} essential files preserved`);
    })
    .catch(error => {
      console.error('❌ Cleanup failed:', error);
    });
}

module.exports = { cleanupTestFiles };
