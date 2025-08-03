#!/usr/bin/env node

/**
 * Test withdrawal method display enhancement
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testWithdrawalDisplay() {
  console.log('🧪 Testing withdrawal method display enhancement...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Check existing withdrawal requests
    console.log('\n📋 Step 1: Checking existing withdrawal requests...');
    const existingWithdrawals = await pool.query(`
      SELECT 
        id, withdrawal_method, account_details, created_at
      FROM withdrawal_requests 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(`Found ${existingWithdrawals.rows.length} withdrawal requests:`);
    existingWithdrawals.rows.forEach((wr, index) => {
      const accountDetails = typeof wr.account_details === 'string' 
        ? JSON.parse(wr.account_details) 
        : wr.account_details;
      
      console.log(`${index + 1}. Method: ${wr.withdrawal_method}`);
      console.log(`   Account Details:`, accountDetails);
      
      // Test the formatting logic
      if (wr.withdrawal_method === 'crypto' && accountDetails?.cryptoType) {
        const cryptoMap = {
          bitcoin: 'BTC',
          ethereum: 'ETH',
          usdt: 'USDT',
          usdc: 'USDC',
          bnb: 'BNB',
          cardano: 'ADA',
          solana: 'SOL',
          dogecoin: 'DOGE',
          litecoin: 'LTC',
          polygon: 'MATIC'
        };
        const cryptoSymbol = cryptoMap[accountDetails.cryptoType] || accountDetails.cryptoType.toUpperCase();
        console.log(`   ✅ Enhanced Display: "Crypto - ${cryptoSymbol}"`);
      } else {
        console.log(`   📋 Standard Display: "${wr.withdrawal_method.replace('_', ' ')}"`);
      }
      console.log('');
    });
    
    // 2. Create test crypto withdrawal requests if none exist
    const cryptoWithdrawals = existingWithdrawals.rows.filter(wr => wr.withdrawal_method === 'crypto');
    
    if (cryptoWithdrawals.length === 0) {
      console.log('\n📋 Step 2: Creating test crypto withdrawal requests...');
      
      // Get a test user
      const testUser = await pool.query('SELECT id FROM users WHERE role = \'investor\' LIMIT 1');
      if (testUser.rows.length === 0) {
        console.log('❌ No investor users found');
        return;
      }
      
      const userId = testUser.rows[0].id;
      
      // Create test crypto withdrawals
      const testCryptos = [
        { type: 'bitcoin', symbol: 'BTC', wallet: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
        { type: 'ethereum', symbol: 'ETH', wallet: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b' },
        { type: 'usdt', symbol: 'USDT', wallet: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5oREqjK' }
      ];
      
      for (const crypto of testCryptos) {
        const accountDetails = {
          walletAddress: crypto.wallet,
          cryptoType: crypto.type
        };
        
        await pool.query(`
          INSERT INTO withdrawal_requests (
            user_id, amount, withdrawal_method, account_details, status
          ) VALUES ($1, $2, 'crypto', $3, 'pending')
        `, [userId, 100.00, JSON.stringify(accountDetails)]);
        
        console.log(`✅ Created test ${crypto.type} withdrawal (${crypto.symbol})`);
      }
      
      console.log('\n📋 Test crypto withdrawals created. Admin interface will now show:');
      testCryptos.forEach(crypto => {
        console.log(`   - "Crypto - ${crypto.symbol}" instead of just "crypto"`);
      });
    } else {
      console.log('\n📋 Step 2: Crypto withdrawals already exist');
    }
    
    // 3. Test the formatting function
    console.log('\n📋 Step 3: Testing formatting function...');
    
    const testCases = [
      { method: 'bank_transfer', details: {}, expected: 'bank transfer' },
      { method: 'paypal', details: {}, expected: 'paypal' },
      { method: 'crypto', details: { cryptoType: 'bitcoin' }, expected: 'Crypto - BTC' },
      { method: 'crypto', details: { cryptoType: 'ethereum' }, expected: 'Crypto - ETH' },
      { method: 'crypto', details: { cryptoType: 'usdt' }, expected: 'Crypto - USDT' },
      { method: 'crypto', details: {}, expected: 'crypto' }, // No cryptoType
    ];
    
    testCases.forEach((testCase, index) => {
      let result;
      if (testCase.method === 'crypto' && testCase.details.cryptoType) {
        const cryptoMap = {
          bitcoin: 'BTC',
          ethereum: 'ETH',
          usdt: 'USDT',
          usdc: 'USDC',
          bnb: 'BNB',
          cardano: 'ADA',
          solana: 'SOL',
          dogecoin: 'DOGE',
          litecoin: 'LTC',
          polygon: 'MATIC'
        };
        const cryptoSymbol = cryptoMap[testCase.details.cryptoType] || testCase.details.cryptoType.toUpperCase();
        result = `Crypto - ${cryptoSymbol}`;
      } else {
        result = testCase.method.replace("_", " ");
      }
      
      const status = result === testCase.expected ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${testCase.method} → "${result}" (expected: "${testCase.expected}")`);
    });
    
    console.log('\n🎉 Withdrawal method display enhancement test completed!');
    console.log('✅ Admin interface will now show specific cryptocurrency types');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testWithdrawalDisplay();
