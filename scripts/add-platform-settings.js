const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addPlatformSettings() {
  try {
    console.log('🔧 Adding platform settings...\n');
    
    // Create platform_settings table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Platform settings table created/verified');
    
    // Add default settings
    const defaultSettings = [
      {
        key: 'platform_name',
        value: 'CredCrypto',
        description: 'Platform name displayed to users'
      },
      {
        key: 'support_whatsapp',
        value: '+1234567890',
        description: 'WhatsApp support contact number'
      },
      {
        key: 'default_referral_commission',
        value: '0.05',
        description: 'Default referral commission rate (5%)'
      },
      {
        key: 'min_withdrawal_amount',
        value: '50',
        description: 'Minimum withdrawal amount in USD'
      },
      {
        key: 'max_withdrawal_amount',
        value: '50000',
        description: 'Maximum withdrawal amount in USD'
      },
      {
        key: 'max_withdrawal_percentage',
        value: '100',
        description: 'Maximum withdrawal percentage of user balance'
      }
    ];
    
    console.log('📝 Adding default platform settings...');
    
    for (const setting of defaultSettings) {
      try {
        await pool.query(`
          INSERT INTO platform_settings (key, value, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
        `, [setting.key, setting.value, setting.description]);
        
        console.log(`✅ ${setting.key}: ${setting.value}`);
      } catch (error) {
        console.log(`⚠️  ${setting.key}: ${error.message}`);
      }
    }
    
    // Verify settings
    console.log('\n📋 Current platform settings:');
    const result = await pool.query('SELECT key, value, description FROM platform_settings ORDER BY key');
    result.rows.forEach(row => {
      console.log(`   ${row.key}: ${row.value} - ${row.description}`);
    });
    
    console.log('\n✅ Platform settings setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up platform settings:', error.message);
  } finally {
    await pool.end();
  }
}

addPlatformSettings();
