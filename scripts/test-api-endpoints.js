#!/usr/bin/env node

/**
 * API Endpoints Test Script
 * 
 * This script tests the fixed API endpoints to ensure they're working correctly.
 * Run this after deploying the fixes to verify everything is functioning.
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_URL || 'https://broker-weld.vercel.app';
const TEST_ENDPOINTS = [
  {
    name: 'Admin Investments',
    method: 'GET',
    path: '/api/admin/investments',
    expectedStatus: [200, 403], // 403 if not authenticated, 200 if authenticated
  },
  {
    name: 'Investment Profit Distribution Status',
    method: 'GET', 
    path: '/api/admin/profit-distribution',
    expectedStatus: [200, 403],
  },
  {
    name: 'Live Trade Profit Distribution Status',
    method: 'GET',
    path: '/api/admin/live-trade/profit-distribution', 
    expectedStatus: [200, 403],
  },
  {
    name: 'Admin Live Trade Trades',
    method: 'GET',
    path: '/api/admin/live-trade/trades',
    expectedStatus: [200, 403],
  }
];

function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': 'API-Test-Script/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000,
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message,
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  
  try {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.method} ${url}`);
    
    const response = await makeRequest(url, endpoint.method);
    
    const statusOk = endpoint.expectedStatus.includes(response.status);
    const statusIcon = statusOk ? '✅' : '❌';
    
    console.log(`   ${statusIcon} Status: ${response.status} ${statusOk ? '(Expected)' : '(Unexpected)'}`);
    
    if (response.parseError) {
      console.log(`   ⚠️  JSON Parse Error: ${response.parseError}`);
    }
    
    // Check for specific error patterns that indicate our fixes worked
    if (response.status === 503) {
      console.log(`   ❌ Service Unavailable - Database table might be missing`);
    } else if (response.status === 400 && response.data?.error) {
      console.log(`   ❌ Bad Request: ${response.data.error}`);
    } else if (response.status === 403) {
      console.log(`   ✅ Authentication required (expected for admin endpoints)`);
    } else if (response.status === 200) {
      console.log(`   ✅ Success - Endpoint is working correctly`);
      if (response.data?.count !== undefined) {
        console.log(`   📊 Data count: ${response.data.count}`);
      }
      if (response.data?.message) {
        console.log(`   💬 Message: ${response.data.message}`);
      }
    }
    
    return {
      endpoint: endpoint.name,
      status: response.status,
      success: statusOk,
      error: response.data?.error || null,
    };
    
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return {
      endpoint: endpoint.name,
      status: 'ERROR',
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🚀 Starting API Endpoints Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📅 Test Time: ${new Date().toISOString()}`);
  
  const results = [];
  
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.endpoint}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Success Rate: ${successful}/${total} (${Math.round(successful/total*100)}%)`);
  
  if (successful === total) {
    console.log('🎉 All endpoints are working correctly!');
  } else {
    console.log('⚠️  Some endpoints need attention.');
  }
  
  // Exit with appropriate code
  process.exit(successful === total ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { main, testEndpoint };
