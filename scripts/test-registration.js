#!/usr/bin/env node

/**
 * Test user registration API endpoint
 */

// Load environment variables
require('dotenv').config();

// Using global fetch (available in Node.js 18+)

async function testRegistration() {
  console.log('🧪 Testing user registration API...');

  // Generate unique email to avoid conflicts
  const timestamp = Date.now();
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: `test${timestamp}@example.com`,
    phone: '+1234567890',
    password: 'testpass123',
    referralCode: '' // Optional
  };

  console.log('📧 Testing with email:', testUser.email);
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📄 Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Registration successful!');
      console.log('👤 User created:', data.user.email);
    } else {
      console.log('❌ Registration failed:', data.error);
      if (data.details) {
        console.log('📝 Details:', data.details);
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  testRegistration();
}

module.exports = { testRegistration };
