#!/usr/bin/env node

/**
 * Test live trade API endpoints
 */

require('dotenv').config();

async function testLiveTradeAPIs() {
  console.log('🔍 Testing Live Trade API Endpoints');
  console.log('===================================\n');
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  try {
    // Test 1: Live Trade Plans API
    console.log('📋 Test 1: Live Trade Plans API');
    console.log('===============================');
    
    try {
      const response = await fetch(`${baseUrl}/api/live-trade/plans`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Plans API working - Found ${data.length} plans`);
        if (data.length > 0) {
          console.log(`   First plan: ${data[0].name}`);
        }
      } else {
        const errorData = await response.text();
        console.log(`❌ Plans API failed: ${errorData}`);
      }
    } catch (error) {
      console.log(`❌ Plans API error: ${error.message}`);
    }
    
    // Test 2: User Trades API (will fail without auth, but should return 401)
    console.log('\n📋 Test 2: User Trades API');
    console.log('==========================');
    
    try {
      const response = await fetch(`${baseUrl}/api/live-trade/user-trades`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 401) {
        console.log('✅ User Trades API working (correctly requires authentication)');
      } else {
        const data = await response.text();
        console.log(`⚠️  Unexpected response: ${data}`);
      }
    } catch (error) {
      console.log(`❌ User Trades API error: ${error.message}`);
    }
    
    // Test 3: Admin Live Trade API (will fail without auth, but should return 401)
    console.log('\n📋 Test 3: Admin Live Trade API');
    console.log('===============================');
    
    try {
      const response = await fetch(`${baseUrl}/api/admin/live-trade/trades`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 401) {
        console.log('✅ Admin Live Trade API working (correctly requires authentication)');
      } else {
        const data = await response.text();
        console.log(`⚠️  Unexpected response: ${data}`);
      }
    } catch (error) {
      console.log(`❌ Admin Live Trade API error: ${error.message}`);
    }
    
    console.log('\n🎯 API TEST SUMMARY');
    console.log('==================');
    console.log('If all APIs show ✅ or correct 401 responses, the backend is working.');
    console.log('If you\'re still seeing client-side errors, the issue might be:');
    console.log('1. Frontend JavaScript errors');
    console.log('2. Missing environment variables');
    console.log('3. Authentication/session issues');
    console.log('4. Browser console will show the actual error');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLiveTradeAPIs();
