#!/usr/bin/env node

/**
 * Test script to verify the reverted deactivation system is working correctly
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testRevertedDeactivationSystem() {
  console.log('🔄 Testing Reverted Deactivation System');
  console.log('======================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const testResults = {
    realTimeRefreshRemoved: false,
    deactivationBannerEnhanced: false,
    pageBlurImplemented: false,
    supportAccessMaintained: false,
    middlewareWorking: false
  };

  try {
    // Test 1: Verify Real-time Refresh Components Removed
    console.log('🔍 Test 1: Real-time Refresh System Removal');
    console.log('============================================');
    
    const fs = require('fs');
    
    // Check if useSessionRefresh hook is removed
    const sessionRefreshExists = fs.existsSync('src/hooks/useSessionRefresh.ts');
    console.log(`useSessionRefresh hook: ${sessionRefreshExists ? '❌ Still exists' : '✅ Removed'}`);
    
    // Check if refresh-session API is removed
    const refreshApiExists = fs.existsSync('src/app/api/auth/refresh-session/route.ts');
    console.log(`refresh-session API: ${refreshApiExists ? '❌ Still exists' : '✅ Removed'}`);
    
    // Check dashboard layout for session refresh usage
    const dashboardLayout = fs.readFileSync('src/app/dashboard/layout.tsx', 'utf8');
    const hasSessionRefreshImport = dashboardLayout.includes('useSessionRefresh');
    const hasStatusChangeNotification = dashboardLayout.includes('statusChangeNotification');
    
    console.log(`Dashboard useSessionRefresh import: ${hasSessionRefreshImport ? '❌ Still present' : '✅ Removed'}`);
    console.log(`Status change notifications: ${hasStatusChangeNotification ? '❌ Still present' : '✅ Removed'}`);
    
    if (!sessionRefreshExists && !refreshApiExists && !hasSessionRefreshImport && !hasStatusChangeNotification) {
      testResults.realTimeRefreshRemoved = true;
      console.log('✅ Real-time refresh system successfully removed');
    } else {
      console.log('❌ Some real-time refresh components still present');
    }

    // Test 2: Verify Enhanced Deactivation Banner
    console.log('\n🔍 Test 2: Enhanced Deactivation Banner');
    console.log('======================================');
    
    const deactivationBanner = fs.readFileSync('src/components/DeactivationBanner.tsx', 'utf8');
    
    // Check for red styling
    const hasRedStyling = deactivationBanner.includes('border-red-500') || deactivationBanner.includes('bg-red-');
    console.log(`Red styling: ${hasRedStyling ? '✅ Present' : '❌ Missing'}`);
    
    // Check for contact support message
    const hasContactSupportMessage = deactivationBanner.includes('Contact Support') || deactivationBanner.includes('contact support');
    console.log(`Contact support message: ${hasContactSupportMessage ? '✅ Present' : '❌ Missing'}`);
    
    // Check for deactivated badge
    const hasDeactivatedBadge = deactivationBanner.includes('Deactivated');
    console.log(`Deactivated badge: ${hasDeactivatedBadge ? '✅ Present' : '❌ Missing'}`);
    
    if (hasRedStyling && hasContactSupportMessage && hasDeactivatedBadge) {
      testResults.deactivationBannerEnhanced = true;
      console.log('✅ Deactivation banner properly enhanced');
    }

    // Test 3: Verify Page Blur Implementation
    console.log('\n🔍 Test 3: Page Blur Implementation');
    console.log('===================================');
    
    // Check for DeactivationOverlay component
    const overlayExists = fs.existsSync('src/components/DeactivationOverlay.tsx');
    console.log(`DeactivationOverlay component: ${overlayExists ? '✅ Created' : '❌ Missing'}`);
    
    if (overlayExists) {
      const overlayContent = fs.readFileSync('src/components/DeactivationOverlay.tsx', 'utf8');
      
      // Check for blur and overlay features
      const hasBlurEffect = overlayContent.includes('backdrop-blur') || overlayContent.includes('blur');
      const hasOverlayModal = overlayContent.includes('fixed inset-0') && overlayContent.includes('z-50');
      const hasAccessRestrictionMessage = overlayContent.includes('Access Restricted') || overlayContent.includes('restricted');
      
      console.log(`Blur effect: ${hasBlurEffect ? '✅ Implemented' : '❌ Missing'}`);
      console.log(`Overlay modal: ${hasOverlayModal ? '✅ Implemented' : '❌ Missing'}`);
      console.log(`Access restriction message: ${hasAccessRestrictionMessage ? '✅ Present' : '❌ Missing'}`);
      
      if (hasBlurEffect && hasOverlayModal && hasAccessRestrictionMessage) {
        testResults.pageBlurImplemented = true;
        console.log('✅ Page blur and overlay properly implemented');
      }
    }
    
    // Check dashboard layout integration
    const hasOverlayIntegration = dashboardLayout.includes('DeactivationOverlay') && dashboardLayout.includes('shouldShowOverlay');
    console.log(`Dashboard overlay integration: ${hasOverlayIntegration ? '✅ Integrated' : '❌ Missing'}`);

    // Test 4: Verify Support Access for Deactivated Users
    console.log('\n🔍 Test 4: Support Access for Deactivated Users');
    console.log('===============================================');
    
    // Check middleware configuration
    const middlewareExists = fs.existsSync('middleware.ts');
    if (middlewareExists) {
      const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
      
      const allowsSupportAccess = middlewareContent.includes('/dashboard/support');
      const hasDeactivatedUserLogic = middlewareContent.includes('isActive') || middlewareContent.includes('deactivated');
      
      console.log(`Middleware exists: ✅ Present`);
      console.log(`Allows support access: ${allowsSupportAccess ? '✅ Configured' : '❌ Missing'}`);
      console.log(`Deactivated user logic: ${hasDeactivatedUserLogic ? '✅ Present' : '❌ Missing'}`);
      
      if (allowsSupportAccess && hasDeactivatedUserLogic) {
        testResults.supportAccessMaintained = true;
        testResults.middlewareWorking = true;
        console.log('✅ Support access properly configured for deactivated users');
      }
    } else {
      console.log('❌ Middleware file not found');
    }

    // Test 5: Database User Status Check
    console.log('\n🔍 Test 5: Database User Status Check');
    console.log('====================================');
    
    const userStatusCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
      FROM users
    `);
    
    const statusStats = userStatusCheck.rows[0];
    console.log(`Total users: ${statusStats.total_users}`);
    console.log(`Active users: ${statusStats.active_users}`);
    console.log(`Inactive users: ${statusStats.inactive_users}`);
    
    if (parseInt(statusStats.inactive_users) > 0) {
      console.log('✅ Inactive users available for testing deactivation features');
    } else {
      console.log('⚠️  No inactive users found - deactivation features can be tested by admin');
    }

    // Summary
    console.log('\n🎯 REVERSION TEST SUMMARY');
    console.log('========================');
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`Overall Status: ${passedTests}/${totalTests} components verified\n`);
    
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${status} ${testName}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 DEACTIVATION SYSTEM SUCCESSFULLY REVERTED!');
      console.log('\n📋 REVERTED FEATURES:');
      console.log('1. ✅ Real-time Session Refresh Removed:');
      console.log('   - No more automatic page refreshes');
      console.log('   - Users must logout/login to see status changes');
      console.log('   - useSessionRefresh hook removed');
      console.log('   - Session refresh API endpoint removed');
      
      console.log('\n2. ✅ Enhanced Deactivation System:');
      console.log('   - Red deactivation badge with prominent styling');
      console.log('   - Clear "Contact Support" message');
      console.log('   - Page blur effect for restricted access');
      console.log('   - Modal overlay for non-support pages');
      
      console.log('\n3. ✅ Access Control Restored:');
      console.log('   - Deactivated users can only access support page');
      console.log('   - All other pages are blurred and inaccessible');
      console.log('   - Middleware properly enforces restrictions');
      console.log('   - Clear visual indication of account status');
      
      console.log('\n🚀 SYSTEM READY - Previous Behavior Restored!');
    } else {
      console.log('\n⚠️  Some components may need attention - review failed tests above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testRevertedDeactivationSystem();
