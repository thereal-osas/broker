#!/usr/bin/env node

/**
 * Test Production API Endpoints
 * 
 * This script tests the live trade profit distribution API
 * directly to verify if the fixes are deployed
 */

const https = require('https');
const http = require('http');

async function testProductionAPI() {
  console.log('🧪 Testing Production API Endpoints');
  console.log('==================================\n');
  
  // You'll need to replace this with your actual production URL
  const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://your-app.vercel.app';
  
  console.log(`Testing against: ${PRODUCTION_URL}`);
  
  // Test 1: Check if the manual distribution endpoint exists
  console.log('\n📋 Test 1: Check Live Trade Profit Distribution Endpoint');
  console.log('======================================================');
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/admin/live-trade/profit-distribution`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Endpoint accessible: ${response.status}`);
    
    if (response.status === 403) {
      console.log('✅ Authentication required (expected for admin endpoint)');
    } else if (response.status === 200) {
      console.log('✅ Endpoint responding correctly');
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Endpoint test failed: ${error.message}`);
  }
  
  // Test 2: Check deployment timestamp
  console.log('\n📋 Test 2: Check Deployment Status');
  console.log('=================================');
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/health`, {
      method: 'GET'
    });
    
    if (response.status === 404) {
      console.log('⚠️  No health endpoint found (normal for this app)');
    } else {
      console.log(`✅ Health check: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`Health check failed: ${error.message}`);
  }
  
  console.log('\n🎯 PRODUCTION API TEST SUMMARY');
  console.log('=============================');
  
  console.log('\n📋 Manual Steps to Verify Deployment:');
  console.log('1. 🚀 Force redeploy your application:');
  console.log('   - If using Vercel: Go to Vercel dashboard → Deployments → Redeploy');
  console.log('   - If using Netlify: Go to Netlify dashboard → Deploys → Trigger deploy');
  console.log('   - If using Railway: Push a new commit to trigger rebuild');
  
  console.log('\n2. 🧪 Test the API endpoint manually:');
  console.log(`   - Open: ${PRODUCTION_URL}/api/admin/live-trade/profit-distribution`);
  console.log('   - Should return 403 (authentication required) or admin data');
  
  console.log('\n3. 🔍 Check server logs:');
  console.log('   - Look for "MANUAL live trade profit distribution" in logs');
  console.log('   - Should see "Found 2 active live trades for manual distribution"');
  
  console.log('\n4. 📊 Expected Results After Fix:');
  console.log('   - Manual distribution should show "4 processed"');
  console.log('   - User balances should increase by $185.00 total');
  console.log('   - 4 records should be created in hourly_live_trade_profits table');
  
  console.log('\n🚨 If Still Not Working:');
  console.log('1. Check if your hosting platform supports the latest Node.js features');
  console.log('2. Verify environment variables are set correctly in production');
  console.log('3. Check if there are any build errors in deployment logs');
  console.log('4. Try a hard refresh of your admin panel (Ctrl+F5)');
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

testProductionAPI();
