// Script to check if 'credit' and 'debit' transaction types are supported
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTransactionTypes() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking transaction type constraints...\n');

    // Get all constraints on transactions table
    const allConstraints = await pool.query(`
      SELECT
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'transactions'::regclass
    `);

    console.log('All constraints on transactions table:');
    allConstraints.rows.forEach(row => {
      console.log(`\n${row.constraint_name}:`);
      console.log(row.constraint_definition);
    });

    // Get the type constraint specifically
    const result = await pool.query(`
      SELECT
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'transactions'::regclass
        AND pg_get_constraintdef(oid) LIKE '%type%'
    `);

    console.log('\n\n=== TYPE CONSTRAINT CHECK ===');
    if (result.rows.length > 0) {
      console.log('Current type constraint:');
      console.log(result.rows[0].constraint_definition);

      const constraintDef = result.rows[0].constraint_definition;
      const hasCredit = constraintDef.includes("'credit'");
      const hasDebit = constraintDef.includes("'debit'");

      console.log('\n✓ Type constraint found');
      console.log(`${hasCredit ? '✓' : '✗'} 'credit' type supported`);
      console.log(`${hasDebit ? '✓' : '✗'} 'debit' type supported`);

      if (!hasCredit || !hasDebit) {
        console.log('\n⚠️  Migration needed! Run:');
        console.log('psql -U your_username -d your_database -f database/migrations/add_credit_debit_transaction_types.sql');
      } else {
        console.log('\n✓ All transaction types are supported!');
      }
    } else {
      console.log('⚠️  No type constraint found on transactions table');
      console.log('The table might not have CHECK constraints or uses a different approach');
    }

  } catch (error) {
    console.error('Error checking transaction types:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransactionTypes();

