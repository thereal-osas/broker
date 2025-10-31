/**
 * Check Database Connection and Tables
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDatabase() {
  console.log('🔍 Checking Database Connection...\n');

  try {
    // Show connection string (masked)
    const connStr = process.env.DATABASE_URL;
    if (connStr) {
      const masked = connStr.replace(/:[^:@]+@/, ':****@');
      console.log('Database URL:', masked);
    } else {
      console.log('❌ DATABASE_URL not found in environment!');
      return;
    }
    console.log('');

    // Test connection
    console.log('Testing connection...');
    const testResult = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('✅ Connected successfully');
    console.log('Current time:', testResult.rows[0].current_time);
    console.log('Database name:', testResult.rows[0].db_name);
    console.log('');

    // List all tables
    console.log('Listing all tables in database...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found in database!');
      console.log('   This is a completely empty database.');
      console.log('   You need to run the database setup/migration scripts first.');
    } else {
      console.log(`Found ${tablesResult.rows.length} table(s):`);
      tablesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }
    console.log('');

    // Check for essential tables
    const essentialTables = [
      'users',
      'user_balances',
      'investment_plans',
      'user_investments',
      'live_trade_plans',
      'user_live_trades'
    ];

    console.log('Checking for essential tables...');
    for (const table of essentialTables) {
      const exists = tablesResult.rows.some(r => r.table_name === table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    }
    console.log('');

    // Recommendations
    console.log('📋 RECOMMENDATIONS:');
    console.log('─'.repeat(60));
    
    if (tablesResult.rows.length === 0) {
      console.log('Your database is completely empty!');
      console.log('');
      console.log('You need to set up the database schema first:');
      console.log('1. Run: node scripts/setup-local-development.js');
      console.log('   OR');
      console.log('2. Run: node lib/migration-definitions.js');
      console.log('   OR');
      console.log('3. Execute the SQL from: database/schema.sql');
    } else {
      const missingTables = essentialTables.filter(
        table => !tablesResult.rows.some(r => r.table_name === table)
      );
      
      if (missingTables.length > 0) {
        console.log(`Missing ${missingTables.length} essential table(s):`);
        missingTables.forEach(table => console.log(`   - ${table}`));
        console.log('');
        console.log('Run the table creation script to add missing tables.');
      } else {
        console.log('✅ All essential tables exist!');
      }
    }
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkDatabase().catch(console.error);

