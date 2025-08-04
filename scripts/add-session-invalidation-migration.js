#!/usr/bin/env node

/**
 * Migration script to add session invalidation support
 */

require('dotenv').config();
const { Pool } = require('pg');

async function addSessionInvalidationMigration() {
  console.log('🔐 Adding Session Invalidation Support');
  console.log('=====================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if session_invalidated_at column already exists
    console.log('🔍 Checking if session_invalidated_at column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'session_invalidated_at'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ session_invalidated_at column already exists');
      console.log('🎉 Migration not needed - database is up to date!');
      return;
    }

    console.log('📝 Adding session_invalidated_at column to users table...');
    
    // Add session_invalidated_at column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN session_invalidated_at TIMESTAMP DEFAULT NULL
    `);
    
    console.log('✅ session_invalidated_at column added successfully');

    // Add index for performance
    console.log('📝 Adding index for session invalidation queries...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_session_invalidated_at 
      ON users(session_invalidated_at) 
      WHERE session_invalidated_at IS NOT NULL
    `);
    
    console.log('✅ Index added for session invalidation queries');

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'session_invalidated_at'
    `);
    
    if (verifyResult.rows.length > 0) {
      const column = verifyResult.rows[0];
      console.log('Session invalidation column details:');
      console.log(`   Column: ${column.column_name}`);
      console.log(`   Type: ${column.data_type}`);
      console.log(`   Nullable: ${column.is_nullable}`);
      console.log(`   Default: ${column.column_default || 'NULL'}`);
    }

    // Test the functionality
    console.log('\n🧪 Testing session invalidation functionality...');
    
    const testUser = await pool.query(`
      SELECT id, email, first_name, last_name, is_active, session_invalidated_at
      FROM users 
      WHERE role = 'investor'
      LIMIT 1
    `);

    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      console.log(`Test user: ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`Current status: ${user.is_active ? 'Active' : 'Inactive'}`);
      console.log(`Session invalidated: ${user.session_invalidated_at || 'Never'}`);
      
      // Test updating session invalidation timestamp
      await pool.query(`
        UPDATE users 
        SET session_invalidated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [user.id]);
      
      const updatedUser = await pool.query(`
        SELECT session_invalidated_at 
        FROM users 
        WHERE id = $1
      `, [user.id]);
      
      console.log(`✅ Session invalidation test successful`);
      console.log(`   New timestamp: ${updatedUser.rows[0].session_invalidated_at}`);
      
      // Reset for normal operation
      await pool.query(`
        UPDATE users 
        SET session_invalidated_at = NULL 
        WHERE id = $1
      `, [user.id]);
      
      console.log('🧹 Test data cleaned up');
    }

    console.log('\n🎉 Session Invalidation Migration Completed Successfully!');
    console.log('✅ session_invalidated_at column added to users table');
    console.log('✅ Index created for performance optimization');
    console.log('✅ Database schema ready for session invalidation');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update authentication middleware to check session invalidation');
    console.log('2. Update login process to prevent deactivated user authentication');
    console.log('3. Add deactivation message to login page');
    console.log('4. Test session invalidation flow');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addSessionInvalidationMigration();
