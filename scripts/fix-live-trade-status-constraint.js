const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixLiveTradeStatusConstraint() {
  console.log('🔧 Fixing Live Trade Status Constraint');
  console.log('=====================================\n');

  try {
    const client = await pool.connect();
    
    // 1. Check current constraint
    console.log('🔍 Checking current user_live_trades status constraint...');
    const currentConstraint = await client.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint 
      WHERE conrelid = 'user_live_trades'::regclass 
      AND contype = 'c'
      AND conname LIKE '%status%'
    `);
    
    if (currentConstraint.rows.length > 0) {
      console.log('📋 Current constraint:', currentConstraint.rows[0].constraint_def);
    } else {
      console.log('⚠️  No status constraint found');
    }

    // 2. Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_live_trades'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ user_live_trades table does not exist!');
      console.log('   Please run the live trade migration script first.');
      client.release();
      return;
    }

    // 3. Drop existing status constraint
    console.log('\n🗑️  Dropping existing status constraint...');
    await client.query(`
      ALTER TABLE user_live_trades 
      DROP CONSTRAINT IF EXISTS user_live_trades_status_check
    `);
    console.log('✅ Status constraint dropped');

    // 4. Add updated status constraint with 'deactivated'
    console.log('\n➕ Adding updated status constraint...');
    await client.query(`
      ALTER TABLE user_live_trades 
      ADD CONSTRAINT user_live_trades_status_check 
      CHECK (status IN ('active', 'completed', 'cancelled', 'deactivated'))
    `);
    console.log('✅ Updated status constraint added');
    console.log('   Added support for: deactivated');

    // 5. Test the new constraint
    console.log('\n🧪 Testing new constraint...');
    
    // Get a test user and live trade plan
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    const planResult = await client.query('SELECT id FROM live_trade_plans LIMIT 1');
    
    if (userResult.rows.length > 0 && planResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      const planId = planResult.rows[0].id;
      
      // Test creating a live trade with 'deactivated' status
      try {
        const testResult = await client.query(`
          INSERT INTO user_live_trades (
            user_id, live_trade_plan_id, amount, status
          ) VALUES ($1, $2, 100.00, 'deactivated')
          RETURNING id
        `, [userId, planId]);
        
        const testId = testResult.rows[0].id;
        console.log('✅ deactivated status: OK');
        
        // Test updating to deactivated status
        await client.query(`
          UPDATE user_live_trades 
          SET status = 'active' 
          WHERE id = $1
        `, [testId]);
        
        await client.query(`
          UPDATE user_live_trades 
          SET status = 'deactivated' 
          WHERE id = $1
        `, [testId]);
        
        console.log('✅ status update to deactivated: OK');
        
        // Clean up test record
        await client.query(`
          DELETE FROM user_live_trades WHERE id = $1
        `, [testId]);
        console.log('🧹 Test record cleaned up');
        
      } catch (error) {
        console.log(`❌ deactivated status test: FAILED - ${error.message}`);
      }

      // Test all valid statuses
      const validStatuses = ['active', 'completed', 'cancelled', 'deactivated'];
      console.log('\n🔍 Testing all valid statuses...');
      
      for (const status of validStatuses) {
        try {
          const testResult = await client.query(`
            INSERT INTO user_live_trades (
              user_id, live_trade_plan_id, amount, status
            ) VALUES ($1, $2, 100.00, $3)
            RETURNING id
          `, [userId, planId, status]);
          
          const testId = testResult.rows[0].id;
          console.log(`✅ ${status}: OK`);
          
          // Clean up
          await client.query(`DELETE FROM user_live_trades WHERE id = $1`, [testId]);
          
        } catch (error) {
          console.log(`❌ ${status}: FAILED - ${error.message}`);
        }
      }

      // Test invalid status (should fail)
      try {
        await client.query(`
          INSERT INTO user_live_trades (
            user_id, live_trade_plan_id, amount, status
          ) VALUES ($1, $2, 100.00, 'invalid_status')
        `, [userId, planId]);
        
        console.log('❌ invalid_status: SHOULD HAVE FAILED but passed!');
        
      } catch (error) {
        console.log('✅ invalid_status: Correctly rejected');
      }
      
    } else {
      console.log('⚠️  No test data available (users or live_trade_plans missing)');
    }

    client.release();
    
    console.log('\n🎉 Live trade status constraint fixed successfully!');
    console.log('   - Status constraint now supports: active, completed, cancelled, deactivated');
    console.log('   - Live trade deactivation should now work without errors');

  } catch (error) {
    console.error('❌ Error fixing live trade status constraint:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixLiveTradeStatusConstraint().catch(console.error);
}

module.exports = fixLiveTradeStatusConstraint;
