#!/usr/bin/env node

/**
 * Production Database Migration Script for Railway PostgreSQL
 *
 * This script will:
 * 1. Connect to your Railway PostgreSQL database
 * 2. Run all necessary migrations to set up the schema
 * 3. Create initial data if needed
 *
 * Usage:
 * node scripts/migrate-production.js
 *
 * Make sure to set your DATABASE_URL environment variable first:
 * export DATABASE_URL="postgresql://username:password@host:port/database"
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection with better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Always use SSL for Railway
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 1 // Limit connections for migration
});

// Migration files in order
const migrationFiles = [
  '../database/schema.sql',
  './create_profit_distributions_table.sql',
  './add_transaction_hash_column.sql'
];

async function runMigration() {
  // Validate DATABASE_URL first
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please set it to your Railway PostgreSQL connection string:');
    console.error('export DATABASE_URL="postgresql://username:password@host:port/database"');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  console.log('Host:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown');

  let client;
  try {
    client = await pool.connect();
    console.log('🚀 Starting database migration...');

    // Test connection
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    
    // Run each migration file
    for (const migrationFile of migrationFiles) {
      const filePath = path.join(__dirname, migrationFile);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Migration file not found: ${filePath}`);
        continue;
      }
      
      console.log(`📄 Running migration: ${migrationFile}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`✅ Migration completed: ${migrationFile}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${migrationFile}`);
        console.error('Error:', error.message);
        
        // Continue with other migrations unless it's a critical error
        if (error.message.includes('already exists')) {
          console.log('   (Table/column already exists - continuing...)');
        } else {
          throw error;
        }
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying database schema...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('📋 Tables created:', tables);
    
    // Check if we need to create an admin user
    const adminCheck = await client.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
    );
    
    if (parseInt(adminCheck.rows[0].count) === 0) {
      console.log('\n👤 Creating default admin user...');
      await createDefaultAdmin(client);
    } else {
      console.log('\n👤 Admin user already exists');
    }
    
    // Create some default investment plans if none exist
    const plansCheck = await client.query('SELECT COUNT(*) as count FROM investment_plans');
    if (parseInt(plansCheck.rows[0].count) === 0) {
      console.log('\n💼 Creating default investment plans...');
      await createDefaultPlans(client);
    } else {
      console.log('\n💼 Investment plans already exist');
    }
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update your Vercel environment variables with the Railway DATABASE_URL');
    console.log('2. Test your application with the production database');
    console.log('3. Create additional admin users if needed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('SCRAM-SERVER-FIRST-MESSAGE')) {
      console.error('\n🔧 This appears to be a password authentication issue.');
      console.error('Try running: npm run db:fix');
      console.error('This will help diagnose and fix connection string issues.');
    }

    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

async function createDefaultAdmin(client) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await client.query(`
    INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    'admin@credcrypto.com',
    hashedPassword,
    'Admin',
    'User',
    'admin',
    true,
    true
  ]);
  
  console.log('✅ Default admin user created:');
  console.log('   Email: admin@credcrypto.com');
  console.log('   Password: admin123');
  console.log('   ⚠️  Please change this password after first login!');
}

async function createDefaultPlans(client) {
  const plans = [
    {
      name: 'Starter Plan',
      description: 'Perfect for beginners looking to start their investment journey',
      min_amount: 100,
      max_amount: 999,
      daily_profit_rate: 0.025, // 2.5%
      duration_days: 30
    },
    {
      name: 'Professional Plan',
      description: 'Ideal for experienced investors seeking higher returns',
      min_amount: 1000,
      max_amount: 4999,
      daily_profit_rate: 0.035, // 3.5%
      duration_days: 45
    },
    {
      name: 'Premium Plan',
      description: 'Exclusive plan for high-value investors',
      min_amount: 5000,
      max_amount: null,
      daily_profit_rate: 0.045, // 4.5%
      duration_days: 60
    }
  ];
  
  for (const plan of plans) {
    await client.query(`
      INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      plan.name,
      plan.description,
      plan.min_amount,
      plan.max_amount,
      plan.daily_profit_rate,
      plan.duration_days,
      true
    ]);
  }
  
  console.log('✅ Default investment plans created');
}

// Run the migration
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
