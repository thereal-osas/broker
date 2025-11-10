// Script to debug the balance adjustment API with a specific user
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function debugBalanceAPI() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const userId = '9ea0f6a8-c466-4e64-bc21-14bc0ffaaada';

  try {
    console.log('=== DEBUGGING BALANCE ADJUSTMENT API ===\n');
    console.log(`Target User ID: ${userId}\n`);

    // Step 1: Check if user exists
    console.log('Step 1: Checking if user exists...');
    const userResult = await pool.query(`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found!');
      console.log('\nCreating test user with this ID...');
      
      try {
        await pool.query(`
          INSERT INTO users (id, email, password, first_name, last_name, role, email_verified)
          VALUES ($1, 'testuser@example.com', 'password123', 'Test', 'User', 'investor', true)
        `, [userId]);
        console.log('✓ User created successfully');
      } catch (err) {
        console.error('Failed to create user:', err.message);
        return;
      }
    } else {
      const user = userResult.rows[0];
      console.log('✓ User found:');
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.first_name} ${user.last_name}`);
      console.log(`  Role: ${user.role}`);
    }

    // Step 2: Check if balance record exists
    console.log('\nStep 2: Checking balance record...');
    let balanceResult = await pool.query(`
      SELECT * FROM user_balances WHERE user_id = $1
    `, [userId]);

    if (balanceResult.rows.length === 0) {
      console.log('  Creating balance record...');
      await pool.query(`
        INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
        VALUES ($1, 0, 0, 0)
      `, [userId]);
      
      balanceResult = await pool.query(`
        SELECT * FROM user_balances WHERE user_id = $1
      `, [userId]);
    }

    const balance = balanceResult.rows[0];
    console.log('✓ Current balances:');
    console.log(`  Total Balance: $${balance.total_balance}`);
    console.log(`  Card Balance: $${balance.card_balance}`);
    console.log(`  Credit Score: ${balance.credit_score_balance}`);

    // Step 3: Simulate the exact API call
    console.log('\nStep 3: Simulating API balance adjustment...');
    console.log('  Operation: Credit (add) $100 to total_balance');

    const amount = 100;
    const balanceType = 'total_balance';
    const description = 'Test Credit via API Simulation';

    try {
      await pool.query('BEGIN');

      // Update balance (exactly as the API does)
      const operator = '+';
      const updateQuery = `
        UPDATE user_balances
        SET ${balanceType} = GREATEST(0, ${balanceType} ${operator} $2),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING *
      `;
      
      const updatedBalanceResult = await pool.query(updateQuery, [userId, Math.abs(amount)]);
      
      if (updatedBalanceResult.rows.length === 0) {
        throw new Error('Failed to update balance - no rows returned');
      }

      console.log('  ✓ Balance updated successfully');

      // Create transaction record (exactly as the API does)
      const transactionQuery = `
        INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const transactionResult = await pool.query(transactionQuery, [
        userId,
        'credit',
        amount,
        balanceType.replace('_balance', ''),
        description,
        'completed'
      ]);

      console.log('  ✓ Transaction record created successfully');
      console.log(`    Transaction ID: ${transactionResult.rows[0].id}`);

      await pool.query('COMMIT');
      console.log('  ✓ Transaction committed');

    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('  ❌ Error during balance adjustment:');
      console.error(`    ${err.message}`);
      console.error('\nFull error:', err);
      return;
    }

    // Step 4: Verify the result
    console.log('\nStep 4: Verifying final state...');
    const finalBalance = await pool.query(`
      SELECT * FROM user_balances WHERE user_id = $1
    `, [userId]);

    console.log('✓ Final balances:');
    console.log(`  Total Balance: $${finalBalance.rows[0].total_balance}`);
    console.log(`  Card Balance: $${finalBalance.rows[0].card_balance}`);
    console.log(`  Credit Score: ${finalBalance.rows[0].credit_score_balance}`);

    // Step 5: Show recent transactions
    console.log('\nStep 5: Recent transactions for this user:');
    const transactions = await pool.query(`
      SELECT id, type, amount, balance_type, description, status, created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    if (transactions.rows.length === 0) {
      console.log('  No transactions found');
    } else {
      transactions.rows.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.type.toUpperCase()} - $${tx.amount} (${tx.balance_type})`);
        console.log(`     ${tx.description}`);
        console.log(`     Status: ${tx.status} | Created: ${tx.created_at}`);
      });
    }

    console.log('\n✅ SUCCESS! The balance adjustment works correctly.');
    console.log('\nIf you\'re still getting a 500 error in the UI, the issue is likely:');
    console.log('  1. Authentication/session issue');
    console.log('  2. Request body format mismatch');
    console.log('  3. Missing environment variables');
    console.log('\nNext steps:');
    console.log('  1. Start the dev server: npm run dev');
    console.log('  2. Login as admin (admin@example.com / admin123)');
    console.log('  3. Try the balance adjustment again');
    console.log('  4. Check the server console for detailed error messages');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugBalanceAPI();

