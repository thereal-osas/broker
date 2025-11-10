// Script to check database status
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDatabaseStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking database status...\n');

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('=== EXISTING TABLES ===');
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    } else {
      console.log('  No tables found');
    }

    // Check if transactions table exists
    const transactionsExists = tablesResult.rows.some(row => row.table_name === 'transactions');
    
    if (transactionsExists) {
      console.log('\n=== TRANSACTIONS TABLE CONSTRAINTS ===');
      
      // Get constraints on transactions table
      const constraintsResult = await pool.query(`
        SELECT 
          conname AS constraint_name,
          contype AS constraint_type,
          pg_get_constraintdef(oid) AS constraint_definition
        FROM pg_constraint
        WHERE conrelid = 'transactions'::regclass
        ORDER BY conname
      `);

      if (constraintsResult.rows.length > 0) {
        constraintsResult.rows.forEach(row => {
          console.log(`\n${row.constraint_name} (${row.constraint_type}):`);
          console.log(`  ${row.constraint_definition}`);
        });
      } else {
        console.log('  No constraints found');
      }

      // Check transaction type constraint specifically
      const typeConstraint = constraintsResult.rows.find(row => 
        row.constraint_definition && row.constraint_definition.toLowerCase().includes('type')
      );

      if (typeConstraint) {
        console.log('\n=== TRANSACTION TYPE CHECK ===');
        const def = typeConstraint.constraint_definition;
        const hasCredit = def.includes("'credit'");
        const hasDebit = def.includes("'debit'");
        const hasAdminFunding = def.includes("'admin_funding'");
        
        console.log(`  ${hasCredit ? '✓' : '✗'} 'credit' type`);
        console.log(`  ${hasDebit ? '✓' : '✗'} 'debit' type`);
        console.log(`  ${hasAdminFunding ? '✓' : '✗'} 'admin_funding' type`);
        
        if (!hasCredit || !hasDebit) {
          console.log('\n⚠️  MIGRATION NEEDED!');
          console.log('  Run: node scripts/run-migration.js');
        } else {
          console.log('\n✓ All required transaction types are supported!');
        }
      }

      // Get sample transactions
      const sampleResult = await pool.query(`
        SELECT type, COUNT(*) as count
        FROM transactions
        GROUP BY type
        ORDER BY count DESC
        LIMIT 10
      `);

      if (sampleResult.rows.length > 0) {
        console.log('\n=== TRANSACTION TYPES IN USE ===');
        sampleResult.rows.forEach(row => {
          console.log(`  ${row.type}: ${row.count}`);
        });
      }
    } else {
      console.log('\n⚠️  transactions table does not exist!');
      console.log('  Run: node scripts/setup-database.js');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseStatus();

