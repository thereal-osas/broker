#!/usr/bin/env node

/**
 * Test database connection using the same configuration as API routes
 */

// Load environment variables
require('dotenv').config();

// Import the database module used by API routes
const { userQueries, balanceQueries } = require('../lib/db');

async function testApiDbConnection() {
  console.log('🔍 Testing API database connection...');
  
  try {
    // Test finding a user (same as auth logic)
    console.log('👤 Testing userQueries.findByEmail...');
    const user = await userQueries.findByEmail('admin@gmail.com');
    
    if (user) {
      console.log('✅ User found successfully');
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
    } else {
      console.log('❌ User not found');
    }
    
    // Test creating a user (same as registration logic)
    console.log('\n🧪 Testing user creation...');
    const timestamp = Date.now();
    const testEmail = `apitest${timestamp}@example.com`;
    
    const newUser = await userQueries.createUser({
      email: testEmail,
      password: 'testpass123',
      firstName: 'API',
      lastName: 'Test',
      phone: '+1234567890',
      role: 'investor',
      referralCode: `TEST${timestamp.toString().substring(7)}`,
      referredBy: null,
    });
    
    console.log('✅ User created successfully');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    
    // Test creating user balance
    console.log('\n💰 Testing balance creation...');
    await balanceQueries.createUserBalance(newUser.id);
    console.log('✅ User balance created successfully');
    
    // Test finding the newly created user
    console.log('\n🔍 Testing retrieval of new user...');
    const retrievedUser = await userQueries.findByEmail(testEmail);
    
    if (retrievedUser) {
      console.log('✅ New user retrieved successfully');
      console.log(`   Password match: ${retrievedUser.password === 'testpass123'}`);
    } else {
      console.log('❌ Failed to retrieve new user');
    }
    
    console.log('\n🎉 All API database tests passed!');
    
  } catch (error) {
    console.error('❌ API database test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  testApiDbConnection();
}

module.exports = { testApiDbConnection };
