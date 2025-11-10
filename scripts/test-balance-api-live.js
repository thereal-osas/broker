// Test the balance adjustment API endpoint with actual HTTP requests
const { db } = require('../lib/db');

async function testBalanceAPILive() {
  console.log('=== TESTING BALANCE ADJUSTMENT API (LIVE) ===\n');
  
  try {
    // Step 1: Verify database connection
    console.log('Step 1: Verifying database connection...');
    const dbTest = await db.query('SELECT NOW()');
    console.log('  ✓ Database connected:', dbTest.rows[0].now);
    
    // Step 2: Check if admin user exists
    console.log('\nStep 2: Checking admin user...');
    const adminResult = await db.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['admin@example.com']
    );
    
    if (adminResult.rows.length === 0) {
      console.log('  ❌ Admin user not found. Creating admin user...');
      const createAdmin = await db.query(
        `INSERT INTO users (email, password, first_name, last_name, role, referral_code, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, role`,
        ['admin@example.com', 'admin123', 'Admin', 'User', 'admin', 'ADMIN001', true]
      );
      console.log('  ✓ Admin user created:', createAdmin.rows[0]);
    } else {
      console.log('  ✓ Admin user exists:', adminResult.rows[0]);
    }
    
    // Step 3: Check if test user exists
    console.log('\nStep 3: Checking test user...');
    const testUserId = '9ea0f6a8-c466-4e64-bc21-14bc0ffaaada';
    const userResult = await db.query(
      'SELECT id, email FROM users WHERE id = $1',
      [testUserId]
    );
    
    if (userResult.rows.length === 0) {
      console.log('  ❌ Test user not found. Please provide a valid user ID.');
      console.log('  Available users:');
      const allUsers = await db.query('SELECT id, email FROM users LIMIT 5');
      allUsers.rows.forEach(u => console.log(`    - ${u.id} (${u.email})`));
      return;
    }
    
    console.log('  ✓ Test user exists:', userResult.rows[0]);
    
    // Step 4: Check user balance
    console.log('\nStep 4: Checking user balance...');
    const balanceResult = await db.query(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [testUserId]
    );
    
    if (balanceResult.rows.length === 0) {
      console.log('  ❌ User balance not found. Creating balance record...');
      await db.query(
        `INSERT INTO user_balances (user_id, total_balance, available_balance, invested_balance, profit_balance)
         VALUES ($1, 0, 0, 0, 0)`,
        [testUserId]
      );
      console.log('  ✓ Balance record created');
    } else {
      console.log('  ✓ Current balance:', balanceResult.rows[0]);
    }
    
    // Step 5: Test the API endpoint with fetch
    console.log('\nStep 5: Testing API endpoint with HTTP request...');
    console.log('  Waiting for server to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      // First, try to get a session by logging in
      console.log('\n  5a. Attempting to login...');
      const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123',
          redirect: false
        })
      });
      
      console.log('     Login response status:', loginResponse.status);
      
      // Try the balance adjustment endpoint
      console.log('\n  5b. Testing balance adjustment endpoint...');
      const balanceResponse = await fetch('http://localhost:3000/api/admin/balance/fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          balanceType: 'total_balance',
          amount: 100,
          description: 'Test credit from script'
        })
      });
      
      console.log('     Balance API response status:', balanceResponse.status);
      const responseText = await balanceResponse.text();
      console.log('     Response body:', responseText);
      
      if (balanceResponse.status === 200) {
        console.log('  ✅ API endpoint working!');
      } else if (balanceResponse.status === 403) {
        console.log('  ⚠️  Authentication required (expected without session)');
        console.log('  This is normal - the API requires admin authentication');
      } else {
        console.log('  ❌ API endpoint returned error');
        console.log('  Please check the server logs for detailed error message');
      }
      
    } catch (fetchError) {
      console.log('  ⚠️  Could not reach server:', fetchError.message);
      console.log('  Make sure the dev server is running: npm run dev');
    }
    
    // Step 6: Direct database test (bypass API)
    console.log('\nStep 6: Testing direct database operation...');
    
    const beforeBalance = await db.query(
      'SELECT total_balance FROM user_balances WHERE user_id = $1',
      [testUserId]
    );
    console.log('  Balance before:', beforeBalance.rows[0].total_balance);
    
    // Simulate what the API does
    await db.query('BEGIN');
    
    try {
      // Update balance
      const updateResult = await db.query(
        `UPDATE user_balances 
         SET total_balance = GREATEST(0, total_balance + $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [testUserId, 100]
      );
      
      console.log('  ✓ Balance updated:', updateResult.rows[0].total_balance);
      
      // Create transaction
      const transactionResult = await db.query(
        `INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [testUserId, 'credit', 100, 'total_balance', 'Direct test credit', 'completed']
      );
      
      console.log('  ✓ Transaction created:', transactionResult.rows[0].id);
      
      await db.query('COMMIT');
      console.log('  ✅ Direct database operation successful!');
      
    } catch (dbError) {
      await db.query('ROLLBACK');
      console.error('  ❌ Database operation failed:', dbError.message);
      throw dbError;
    }
    
    const afterBalance = await db.query(
      'SELECT total_balance FROM user_balances WHERE user_id = $1',
      [testUserId]
    );
    console.log('  Balance after:', afterBalance.rows[0].total_balance);
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('\n📋 Summary:');
    console.log('  ✓ Database connection: Working');
    console.log('  ✓ Admin user: Exists');
    console.log('  ✓ Test user: Exists');
    console.log('  ✓ User balance: Exists');
    console.log('  ✓ Direct DB operation: Working');
    console.log('\n💡 Next Steps:');
    console.log('  1. Make sure dev server is running: npm run dev');
    console.log('  2. Login to admin panel: http://localhost:3000/auth/signin');
    console.log('  3. Navigate to: http://localhost:3000/admin/users');
    console.log('  4. Try adjusting balance for user:', testUserId);
    console.log('  5. Check the terminal running "npm run dev" for error messages');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Run the test
testBalanceAPILive().catch(console.error);

