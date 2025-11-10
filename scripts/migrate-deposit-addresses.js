const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting deposit addresses migration...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrations/add_deposit_addresses_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   - Created deposit_addresses table');
    console.log('   - Created deposit_address_audit_log table');
    console.log('   - Added indexes for performance');
    console.log('   - Inserted default deposit addresses (Bitcoin, Ethereum, USDT)');
    console.log('   - Created audit logging triggers\n');

    // Verify the migration
    const result = await client.query('SELECT COUNT(*) FROM deposit_addresses');
    console.log(`✅ Verified: ${result.rows[0].count} deposit addresses in database\n`);

    // Display the default addresses
    const addresses = await client.query('SELECT payment_method, label, address, network FROM deposit_addresses ORDER BY display_order');
    console.log('📍 Default Deposit Addresses:');
    addresses.rows.forEach((addr, index) => {
      console.log(`   ${index + 1}. ${addr.label} (${addr.network})`);
      console.log(`      Address: ${addr.address}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration();

