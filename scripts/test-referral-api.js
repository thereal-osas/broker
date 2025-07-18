#!/usr/bin/env node

/**
 * Test referral API endpoint
 */

// Load environment variables
require('dotenv').config();

const http = require('http');

async function testReferralAPI() {
  console.log('🧪 Testing Referral API Endpoint');
  console.log('=================================\n');
  
  // Test the API endpoint
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/referrals',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  console.log('📡 Making request to /api/referrals...');

  const req = http.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📄 Response:', data);
      try {
        const parsed = JSON.parse(data);
        console.log('📝 Parsed response:', JSON.stringify(parsed, null, 2));
        
        if (parsed.error) {
          console.log('❌ API Error:', parsed.error);
          if (parsed.error === 'Authentication required') {
            console.log('ℹ️  This is expected - API requires authentication');
            console.log('   The referral system should work when user is logged in');
          }
        } else {
          console.log('✅ API response looks good');
        }
      } catch (e) {
        console.log('❌ Failed to parse JSON response');
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
    console.log('ℹ️  Make sure the development server is running: npm run dev');
  });

  req.end();
}

// Run test if called directly
if (require.main === module) {
  testReferralAPI();
}

module.exports = { testReferralAPI };
