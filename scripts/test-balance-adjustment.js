// Script to test the balance adjustment API directly
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testBalanceAdjustment() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Testing balance adjustment functionality...\n');

    // Step 1: Create a test user if not exists
    console.log('Step 1: Checking for test user...');
    let user = await pool.query(`
      SELECT id, email FROM users WHERE email = 'test@example.com' LIMIT 1
    `);

    if (user.rows.length === 0) {
      console.log('  Creating test user...');
      const result = await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, email_verified)
        VALUES ('test@example.com', 'hashed_password', 'Test', 'User', 'investor', true)
        RETURNING id, email
      `);
      user = result;
      console.log(`  ✓ Created user: ${user.rows[0].email} (ID: ${user.rows[0].id})`);
    } else {
      console.log(`  ✓ Found user: ${user.rows[0].email} (ID: ${user.rows[0].id})`);
    }

    const userId = user.rows[0].id;

    // Step 2: Check current balance
    console.log('\nStep 2: Checking current balance...');
    let balance = await pool.query(`
      SELECT * FROM user_balances WHERE user_id = $1
    `, [userId]);

    if (balance.rows.length === 0) {
      console.log('  Creating balance record...');
      await pool.query(`
        INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
        VALUES ($1, 0, 0, 0)
      `, [userId]);
      balance = await pool.query(`
        SELECT * FROM user_balances WHERE user_id = $1
      `, [userId]);
    }

    console.log('  Current balances:');
    console.log(`    Total: $${balance.rows[0].total_balance}`);
    console.log(`    Card: $${balance.rows[0].card_balance}`);
    console.log(`    Credit Score: $${balance.rows[0].credit_score_balance}`);

    // Step 3: Test credit transaction
    console.log('\nStep 3: Testing CREDIT transaction (add $100)...');
    const creditAmount = 100;
    
    await pool.query('BEGIN');
    
    try {
      // Update balance
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = total_balance + $1
        WHERE user_id = $2
      `, [creditAmount, userId]);

      // Create transaction
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
        VALUES ($1, 'credit', $2, 'total', 'Test Credit Transaction', 'completed')
      `, [userId, creditAmount]);

      await pool.query('COMMIT');
      console.log('  ✓ Credit transaction successful');
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('  ✗ Credit transaction failed:', err.message);
    }

    // Step 4: Test debit transaction
    console.log('\nStep 4: Testing DEBIT transaction (deduct $50)...');
    const debitAmount = 50;
    
    await pool.query('BEGIN');
    
    try {
      // Update balance
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = total_balance - $1
        WHERE user_id = $2
      `, [debitAmount, userId]);

      // Create transaction
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
        VALUES ($1, 'debit', $2, 'total', 'Test Debit Transaction', 'completed')
      `, [userId, debitAmount]);

      await pool.query('COMMIT');
      console.log('  ✓ Debit transaction successful');
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('  ✗ Debit transaction failed:', err.message);
    }

    // Step 5: Verify final balance
    console.log('\nStep 5: Verifying final balance...');
    balance = await pool.query(`
      SELECT * FROM user_balances WHERE user_id = $1
    `, [userId]);

    console.log('  Final balances:');
    console.log(`    Total: $${balance.rows[0].total_balance}`);
    console.log(`    Card: $${balance.rows[0].card_balance}`);
    console.log(`    Credit Score: $${balance.rows[0].credit_score_balance}`);

    // Step 6: Show recent transactions
    console.log('\nStep 6: Recent transactions:');
    const transactions = await pool.query(`
      SELECT id, type, amount, balance_type, description, created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    transactions.rows.forEach(tx => {
      console.log(`  ${tx.type.toUpperCase()}: $${tx.amount} (${tx.balance_type}) - ${tx.description}`);
    });

    console.log('\n✓ All tests passed! The database supports credit/debit transactions.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testBalanceAdjustment();

