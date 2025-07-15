#!/usr/bin/env node

/**
 * Simple registration test using http module
 */

const http = require('http');

const postData = JSON.stringify({
  firstName: 'Test',
  lastName: 'User',
  email: 'test' + Date.now() + '@example.com',
  phone: '+1234567890',
  password: 'testpass123',
  referralCode: ''
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing registration with http module...');
console.log('📧 Email:', JSON.parse(postData).email);

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
    } catch (e) {
      console.log('❌ Failed to parse JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
