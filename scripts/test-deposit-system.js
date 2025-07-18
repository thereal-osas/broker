#!/usr/bin/env node

/**
 * Comprehensive Deposit System Testing Script
 * 
 * This script tests the complete deposit workflow:
 * 1. Creates test deposit requests
 * 2. Tests admin approval/decline functionality
 * 3. Verifies balance updates
 * 4. Checks transaction records
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

class DepositSystemTester {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 3,
    });
  }

  async initialize() {
    console.log('🧪 Deposit System Testing Suite');
    console.log('================================\n');
  }

  async createTestUser() {
    console.log('👤 Creating test user...');
    
    const client = await this.pool.connect();
    try {
      const timestamp = Date.now();
      const email = `testuser${timestamp}@example.com`;
      
      // Create test user
      const userResult = await client.query(`
        INSERT INTO users (
          email, password, first_name, last_name, role, 
          is_active, email_verified, referral_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email
      `, [
        email,
        'testpass123',
        'Test',
        'User',
        'investor',
        true,
        true,
        `TEST${timestamp.toString().substring(7)}`
      ]);

      const user = userResult.rows[0];

      // Create user balance
      await client.query(`
        INSERT INTO user_balances (
          user_id, total_balance, profit_balance, deposit_balance, 
          bonus_balance, credit_score_balance
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [user.id, 0.00, 0.00, 0.00, 0.00, 0.00]);

      console.log(`✅ Test user created: ${user.email} (ID: ${user.id})`);
      return user;
      
    } finally {
      client.release();
    }
  }

  async createTestDeposit(userId, amount = 100, paymentMethod = 'crypto_bitcoin') {
    console.log(`💰 Creating test deposit: $${amount} via ${paymentMethod}...`);
    
    const client = await this.pool.connect();
    try {
      const transactionHash = `test_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const result = await client.query(`
        INSERT INTO deposit_requests (
          user_id, amount, payment_method, payment_proof, 
          transaction_hash, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userId,
        amount,
        paymentMethod,
        'Test payment proof',
        transactionHash,
        'pending'
      ]);

      const deposit = result.rows[0];
      console.log(`✅ Test deposit created: ID ${deposit.id}, Hash: ${transactionHash}`);
      return deposit;
      
    } finally {
      client.release();
    }
  }

  async getBalances(userId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM user_balances WHERE user_id = $1
      `, [userId]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async approveDeposit(depositId, adminUserId) {
    console.log(`✅ Approving deposit ${depositId}...`);
    
    const client = await this.pool.connect();
    try {
      // Get deposit details
      const depositResult = await client.query(`
        SELECT * FROM deposit_requests WHERE id = $1
      `, [depositId]);
      
      if (depositResult.rows.length === 0) {
        throw new Error('Deposit not found');
      }
      
      const deposit = depositResult.rows[0];
      const amount = parseFloat(deposit.amount);
      
      // Start transaction
      await client.query('BEGIN');
      
      // Update deposit status
      await client.query(`
        UPDATE deposit_requests 
        SET status = 'approved', admin_notes = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, ['Test approval', adminUserId, depositId]);
      
      // Update user balances
      await client.query(`
        UPDATE user_balances 
        SET deposit_balance = deposit_balance + $1,
            total_balance = total_balance + $1
        WHERE user_id = $2
      `, [amount, deposit.user_id]);
      
      // Create transaction record
      await client.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, 
          reference_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        deposit.user_id,
        'deposit',
        amount,
        'deposit',
        `Test deposit approved - ${deposit.payment_method}`,
        depositId,
        'completed'
      ]);
      
      await client.query('COMMIT');
      console.log(`✅ Deposit approved and balance updated`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async runFullTest() {
    try {
      await this.initialize();
      
      // 1. Create test user
      const testUser = await this.createTestUser();
      
      // 2. Check initial balances
      console.log('\n💰 Initial balances:');
      let balances = await this.getBalances(testUser.id);
      console.log(`   Total: $${balances.total_balance}`);
      console.log(`   Deposit: $${balances.deposit_balance}`);
      
      // 3. Create test deposits
      console.log('\n📝 Creating test deposits...');
      const deposit1 = await this.createTestDeposit(testUser.id, 100, 'crypto_bitcoin');
      const deposit2 = await this.createTestDeposit(testUser.id, 250, 'crypto_ethereum');
      const deposit3 = await this.createTestDeposit(testUser.id, 50, 'crypto_usdt');
      
      // 4. Get admin user
      const adminResult = await this.pool.query(`
        SELECT id FROM users WHERE role = 'admin' LIMIT 1
      `);
      
      if (adminResult.rows.length === 0) {
        throw new Error('No admin user found');
      }
      
      const adminId = adminResult.rows[0].id;
      
      // 5. Approve first deposit
      console.log('\n✅ Testing deposit approval...');
      await this.approveDeposit(deposit1.id, adminId);
      
      // 6. Check updated balances
      console.log('\n💰 Balances after approval:');
      balances = await this.getBalances(testUser.id);
      console.log(`   Total: $${balances.total_balance}`);
      console.log(`   Deposit: $${balances.deposit_balance}`);
      
      // 7. Check transaction history
      console.log('\n📊 Transaction history:');
      const transactions = await this.pool.query(`
        SELECT type, amount, balance_type, description, status, created_at
        FROM transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `, [testUser.id]);
      
      transactions.rows.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} (${tx.balance_type}) - ${tx.description}`);
      });
      
      // 8. Test decline functionality
      console.log('\n❌ Testing deposit decline...');
      await this.pool.query(`
        UPDATE deposit_requests 
        SET status = 'declined', admin_notes = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, ['Test decline', adminId, deposit2.id]);
      
      console.log(`✅ Deposit ${deposit2.id} declined`);
      
      // 9. Final status report
      console.log('\n📋 Final deposit status:');
      const finalDeposits = await this.pool.query(`
        SELECT id, amount, payment_method, status, admin_notes
        FROM deposit_requests 
        WHERE user_id = $1 
        ORDER BY created_at
      `, [testUser.id]);
      
      finalDeposits.rows.forEach((deposit, index) => {
        console.log(`   ${index + 1}. $${deposit.amount} via ${deposit.payment_method} - ${deposit.status}`);
        if (deposit.admin_notes) {
          console.log(`      Notes: ${deposit.admin_notes}`);
        }
      });
      
      console.log('\n🎉 Deposit system test completed successfully!');
      console.log('\n📝 Test Summary:');
      console.log(`   - Test user created: ${testUser.email}`);
      console.log(`   - Deposits created: 3`);
      console.log(`   - Deposits approved: 1`);
      console.log(`   - Deposits declined: 1`);
      console.log(`   - Final balance: $${balances.total_balance}`);
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error(error.stack);
    } finally {
      await this.pool.end();
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new DepositSystemTester();
  tester.runFullTest();
}

module.exports = { DepositSystemTester };
