#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Safely creates system_settings table and populates default values
 */

require('dotenv').config();
const { Pool } = require('pg');

async function runProductionMigration() {
  console.log('🚀 Running Production Database Migration...');
  console.log('==========================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if we can connect to the database
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Check if system_settings table already exists
    console.log('🔍 Checking if system_settings table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      console.log('✅ system_settings table already exists');
      
      // Check if we have the required settings
      const settingsCheck = await pool.query(`
        SELECT COUNT(*) as count FROM system_settings 
        WHERE category = 'withdrawal'
      `);
      
      if (parseInt(settingsCheck.rows[0].count) > 0) {
        console.log('✅ Withdrawal settings already configured');
        console.log('🎉 Migration not needed - database is up to date!');
        return;
      } else {
        console.log('⚠️  Table exists but missing withdrawal settings');
        console.log('📝 Adding missing settings...');
      }
    } else {
      console.log('📝 Creating system_settings table...');
      
      // Create the table
      await pool.query(`
        CREATE TABLE system_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value TEXT NOT NULL,
          setting_type VARCHAR(20) NOT NULL DEFAULT 'string',
          category VARCHAR(50) NOT NULL DEFAULT 'general',
          description TEXT,
          editable BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ system_settings table created successfully');
    }

    // Insert or update default settings
    console.log('📝 Configuring default system settings...');
    
    const defaultSettings = [
      {
        key: 'min_withdrawal_amount',
        value: '50',
        type: 'number',
        category: 'withdrawal',
        description: 'Minimum withdrawal amount in USD',
        editable: true
      },
      {
        key: 'max_withdrawal_amount',
        value: '50000',
        type: 'number',
        category: 'withdrawal',
        description: 'Maximum withdrawal amount in USD per transaction',
        editable: true
      },
      {
        key: 'max_withdrawal_percentage',
        value: '100',
        type: 'number',
        category: 'withdrawal',
        description: 'Maximum percentage of total balance that users can withdraw per transaction',
        editable: true
      },
      {
        key: 'withdrawal_fee_percentage',
        value: '0',
        type: 'number',
        category: 'withdrawal',
        description: 'Withdrawal fee as percentage of withdrawal amount',
        editable: true
      },
      {
        key: 'withdrawal_processing_fee',
        value: '0',
        type: 'number',
        category: 'withdrawal',
        description: 'Withdrawal processing fee in USD',
        editable: true
      },
      {
        key: 'platform_name',
        value: 'CredCrypto',
        type: 'string',
        category: 'platform',
        description: 'Platform name displayed to users',
        editable: true
      },
      {
        key: 'support_whatsapp',
        value: '+1234567890',
        type: 'string',
        category: 'platform',
        description: 'WhatsApp number for customer support',
        editable: true
      },
      {
        key: 'default_referral_commission',
        value: '10',
        type: 'number',
        category: 'referral',
        description: 'Default referral commission percentage',
        editable: true
      }
    ];

    for (const setting of defaultSettings) {
      await pool.query(`
        INSERT INTO system_settings (
          setting_key, setting_value, setting_type, category, description, editable
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (setting_key) 
        DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          setting_type = EXCLUDED.setting_type,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          editable = EXCLUDED.editable,
          updated_at = CURRENT_TIMESTAMP
      `, [setting.key, setting.value, setting.type, setting.category, setting.description, setting.editable]);
      
      console.log(`✅ Configured: ${setting.key}`);
    }

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const verifyResult = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM system_settings 
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('Settings by category:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} settings`);
    });

    console.log('\n🎉 Production migration completed successfully!');
    console.log('✅ system_settings table is ready');
    console.log('✅ Default withdrawal limits configured');
    console.log('✅ Platform settings initialized');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runProductionMigration();
