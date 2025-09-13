const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addSystemSettingsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding system_settings table for manual distribution cooldowns...');

    // Create system_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_settings_key 
      ON system_settings(key);
    `);

    // Insert default settings if they don't exist
    await client.query(`
      INSERT INTO system_settings (key, value, description) 
      VALUES 
        ('last_investment_distribution', '2000-01-01T00:00:00.000Z', 'Timestamp of last manual investment profit distribution'),
        ('last_live_trade_distribution', '2000-01-01T00:00:00.000Z', 'Timestamp of last manual live trade profit distribution')
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log('✅ System settings table created successfully');
    console.log('✅ Default cooldown settings initialized');
    
    // Verify the table
    const result = await client.query('SELECT * FROM system_settings ORDER BY key');
    console.log('\n📊 Current system settings:');
    result.rows.forEach(row => {
      console.log(`  ${row.key}: ${row.value}`);
    });

  } catch (error) {
    console.error('❌ Error adding system settings table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  addSystemSettingsTable()
    .then(() => {
      console.log('\n🎉 System settings table migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addSystemSettingsTable };
