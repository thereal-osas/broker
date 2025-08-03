#!/usr/bin/env node

/**
 * Create system settings table and initialize default values
 */

require('dotenv').config();
const { Pool } = require('pg');

async function createSystemSettings() {
  console.log('🔧 Creating system settings table...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Drop and recreate system_settings table
    console.log('\n📋 Step 1: Creating system_settings table...');
    await pool.query(`DROP TABLE IF EXISTS system_settings CASCADE`);
    await pool.query(`
      CREATE TABLE system_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        is_editable BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ System settings table created');

    // Insert default withdrawal settings
    console.log('\n📋 Step 2: Inserting default withdrawal settings...');
    
    const defaultSettings = [
      {
        key: 'max_withdrawal_percentage',
        value: '100',
        type: 'number',
        description: 'Maximum percentage of total balance that users can withdraw per transaction',
        category: 'withdrawal'
      },
      {
        key: 'min_withdrawal_amount',
        value: '50',
        type: 'number',
        description: 'Minimum withdrawal amount in USD',
        category: 'withdrawal'
      },
      {
        key: 'max_withdrawal_amount',
        value: '50000',
        type: 'number',
        description: 'Maximum withdrawal amount in USD per transaction',
        category: 'withdrawal'
      },
      {
        key: 'withdrawal_processing_fee',
        value: '0',
        type: 'number',
        description: 'Withdrawal processing fee in USD',
        category: 'withdrawal'
      },
      {
        key: 'withdrawal_fee_percentage',
        value: '0',
        type: 'number',
        description: 'Withdrawal fee as percentage of withdrawal amount',
        category: 'withdrawal'
      }
    ];

    for (const setting of defaultSettings) {
      await pool.query(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (setting_key) DO NOTHING
      `, [setting.key, setting.value, setting.type, setting.description, setting.category]);
      
      console.log(`✅ Added setting: ${setting.key} = ${setting.value}`);
    }

    // Create index for performance
    console.log('\n📋 Step 3: Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
      CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
    `);
    console.log('✅ Indexes created');

    // Verify settings
    console.log('\n📋 Step 4: Verifying settings...');
    const result = await pool.query(`
      SELECT setting_key, setting_value, setting_type, description 
      FROM system_settings 
      WHERE category = 'withdrawal'
      ORDER BY setting_key
    `);
    
    console.log('Current withdrawal settings:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.setting_key}: ${row.setting_value} (${row.setting_type})`);
      console.log(`   Description: ${row.description}`);
      console.log('');
    });

    console.log('🎉 System settings table created and initialized successfully!');
    
  } catch (error) {
    console.error('❌ Error creating system settings:', error.message);
  } finally {
    await pool.end();
  }
}

createSystemSettings();
