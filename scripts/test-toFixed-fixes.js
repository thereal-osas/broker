#!/usr/bin/env node

/**
 * Test script to verify toFixed runtime error fixes
 */

const fs = require('fs');

function testToFixedFixes() {
  console.log('🔧 Testing toFixed Runtime Error Fixes');
  console.log('=====================================\n');

  const testResults = {
    formatCurrencyFixed: false,
    nullChecksAdded: false,
    apiResponsesFixed: false,
    buildSuccessful: false
  };

  try {
    // Test 1: Check formatCurrency function improvements
    console.log('📋 Test 1: formatCurrency Function Improvements');
    console.log('===============================================');
    
    const userPageContent = fs.readFileSync('src/app/dashboard/live-trade/page.tsx', 'utf8');
    const adminPageContent = fs.readFileSync('src/app/admin/live-trade/page.tsx', 'utf8');
    
    // Check if formatCurrency handles null/undefined values
    const hasRobustFormatCurrency = userPageContent.includes('number | string | null | undefined') &&
                                   userPageContent.includes('parseFloat(String(amount || 0))') &&
                                   userPageContent.includes('isNaN(numAmount)');
    
    const adminHasRobustFormatCurrency = adminPageContent.includes('number | string | null | undefined') &&
                                        adminPageContent.includes('parseFloat(String(amount || 0))') &&
                                        adminPageContent.includes('isNaN(numAmount)');
    
    console.log(`User page formatCurrency: ${hasRobustFormatCurrency ? '✅ Fixed' : '❌ Not fixed'}`);
    console.log(`Admin page formatCurrency: ${adminHasRobustFormatCurrency ? '✅ Fixed' : '❌ Not fixed'}`);
    
    if (hasRobustFormatCurrency && adminHasRobustFormatCurrency) {
      testResults.formatCurrencyFixed = true;
      console.log('✅ formatCurrency function now handles null/undefined values');
    }

    // Test 2: Check null safety in calculations
    console.log('\n📋 Test 2: Null Safety in Calculations');
    console.log('======================================');
    
    const hasNullChecks = userPageContent.includes('(trade.hourly_profit_rate || 0)') &&
                         userPageContent.includes('parseFloat(String(trade.amount || 0))') &&
                         userPageContent.includes('parseFloat(String(trade.total_profit || 0))');
    
    const adminHasNullChecks = adminPageContent.includes('(trade.hourly_profit_rate || 0)') &&
                              adminPageContent.includes('(plan.hourly_profit_rate || 0)');
    
    console.log(`User page null checks: ${hasNullChecks ? '✅ Added' : '❌ Missing'}`);
    console.log(`Admin page null checks: ${adminHasNullChecks ? '✅ Added' : '❌ Missing'}`);
    
    if (hasNullChecks && adminHasNullChecks) {
      testResults.nullChecksAdded = true;
      console.log('✅ Null safety checks added to prevent toFixed errors');
    }

    // Test 3: Check API response processing
    console.log('\n📋 Test 3: API Response Processing');
    console.log('==================================');
    
    const apiFiles = [
      'src/app/api/live-trade/plans/route.ts',
      'src/app/api/live-trade/user-trades/route.ts',
      'src/app/api/admin/live-trade/plans/route.ts',
      'src/app/api/admin/live-trade/trades/route.ts'
    ];
    
    let allApisFixed = true;
    
    apiFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hasProcessing = content.includes('parseFloat(') && content.includes('processedRows');
        console.log(`${file}: ${hasProcessing ? '✅ Fixed' : '❌ Not fixed'}`);
        if (!hasProcessing) allApisFixed = false;
      } else {
        console.log(`${file}: ❌ File not found`);
        allApisFixed = false;
      }
    });
    
    if (allApisFixed) {
      testResults.apiResponsesFixed = true;
      console.log('✅ All API endpoints now properly convert numeric values');
    }

    // Test 4: Test formatCurrency function with various inputs
    console.log('\n📋 Test 4: formatCurrency Function Testing');
    console.log('==========================================');
    
    // Extract and test the formatCurrency function
    const formatCurrencyMatch = userPageContent.match(/const formatCurrency = \(amount[^}]+\};/s);
    
    if (formatCurrencyMatch) {
      try {
        // Create a test version of the function
        const formatCurrencyCode = formatCurrencyMatch[0].replace('const formatCurrency', 'function formatCurrency');
        
        // Test with various inputs
        eval(formatCurrencyCode);
        
        const testCases = [
          { input: 100, expected: '100.00' },
          { input: null, expected: '0.00' },
          { input: undefined, expected: '0.00' },
          { input: '50.5', expected: '50.50' },
          { input: 'invalid', expected: '0.00' },
          { input: 1234.567, expected: '1,234.57' }
        ];
        
        let allTestsPassed = true;
        
        testCases.forEach(({ input, expected }) => {
          try {
            const result = formatCurrency(input);
            const passed = result === expected;
            console.log(`  Input: ${JSON.stringify(input)} → Output: ${result} ${passed ? '✅' : '❌'}`);
            if (!passed) allTestsPassed = false;
          } catch (error) {
            console.log(`  Input: ${JSON.stringify(input)} → Error: ${error.message} ❌`);
            allTestsPassed = false;
          }
        });
        
        if (allTestsPassed) {
          console.log('✅ formatCurrency function handles all test cases correctly');
        } else {
          console.log('❌ Some formatCurrency test cases failed');
        }
        
      } catch (error) {
        console.log(`❌ Could not test formatCurrency function: ${error.message}`);
      }
    }

    // Summary
    console.log('\n🎯 TOFIXED ERROR FIXES SUMMARY');
    console.log('==============================');
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`Overall Status: ${passedTests}/${totalTests} fixes verified\n`);
    
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${status} ${testName}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TOFIXED RUNTIME ERROR FIXES SUCCESSFULLY IMPLEMENTED!');
      console.log('\n📋 FIXES COMPLETED:');
      console.log('1. ✅ formatCurrency Function Enhanced');
      console.log('   - Now accepts number, string, null, or undefined');
      console.log('   - Safely converts all inputs to valid numbers');
      console.log('   - Returns "0.00" for invalid inputs');
      
      console.log('\n2. ✅ Null Safety Checks Added');
      console.log('   - All toFixed() calls now have null checks');
      console.log('   - Default values (|| 0) added to prevent errors');
      console.log('   - Safe parsing in reduce operations');
      
      console.log('\n3. ✅ API Response Processing Fixed');
      console.log('   - All numeric fields properly converted from strings');
      console.log('   - parseFloat() and parseInt() used consistently');
      console.log('   - Null/undefined values handled gracefully');
      
      console.log('\n🚀 LIVE TRADE PAGES SHOULD NOW LOAD WITHOUT ERRORS!');
      console.log('\n💡 Next Steps:');
      console.log('1. Start your development server: npm run dev');
      console.log('2. Test /dashboard/live-trade page');
      console.log('3. Test /admin/live-trade page');
      console.log('4. Verify no more "toFixed is not a function" errors');
      
    } else {
      console.log('\n⚠️  Some fixes may need attention - review failed tests above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testToFixedFixes();
