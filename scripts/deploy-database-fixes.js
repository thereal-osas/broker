#!/usr/bin/env node

/**
 * Production Database Deployment Script
 * 
 * This script deploys the database schema fixes to the production environment.
 * It should be run during Vercel deployment to ensure all required tables exist.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database configuration for production
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'broker_platform',
      password: process.env.DB_PASSWORD || 'YOUR_ACTUAL_PASSWORD_HERE',
      port: parseInt(process.env.DB_PORT || '5432'),
    };

const pool = new Pool(dbConfig);

async function checkTableExists(tableName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error.message);
    return false;
  }
}

async function createProfitDistributionsTable() {
  console.log('📝 Creating profit_distributions table...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profit_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        profit_amount DECIMAL(15,2) NOT NULL,
        distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profit_distributions_investment_id 
      ON profit_distributions(investment_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profit_distributions_user_id 
      ON profit_distributions(user_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profit_distributions_date 
      ON profit_distributions(distribution_date);
    `);
    
    console.log('✅ profit_distributions table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating profit_distributions table:', error.message);
    return false;
  }
}

async function ensureLiveTradeTablesExist() {
  console.log('📝 Ensuring live trade tables exist...');
  
  try {
    // Check if live_trade_plans exists
    const liveTradeePlansExists = await checkTableExists('live_trade_plans');
    if (!liveTradeePlansExists) {
      await pool.query(`
        CREATE TABLE live_trade_plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          min_amount DECIMAL(15,2) NOT NULL CHECK (min_amount > 0),
          max_amount DECIMAL(15,2) CHECK (max_amount IS NULL OR max_amount >= min_amount),
          hourly_profit_rate DECIMAL(5,4) NOT NULL CHECK (hourly_profit_rate > 0),
          duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ live_trade_plans table created');
    }
    
    // Check if user_live_trades exists
    const userLiveTradesExists = await checkTableExists('user_live_trades');
    if (!userLiveTradesExists) {
      await pool.query(`
        CREATE TABLE user_live_trades (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          live_trade_plan_id UUID NOT NULL REFERENCES live_trade_plans(id) ON DELETE CASCADE,
          amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
          total_profit DECIMAL(15,2) DEFAULT 0,
          start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ user_live_trades table created');
    }
    
    // Check if hourly_live_trade_profits exists
    const hourlyProfitsExists = await checkTableExists('hourly_live_trade_profits');
    if (!hourlyProfitsExists) {
      await pool.query(`
        CREATE TABLE hourly_live_trade_profits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          live_trade_id UUID NOT NULL REFERENCES user_live_trades(id) ON DELETE CASCADE,
          profit_amount DECIMAL(15,2) NOT NULL,
          profit_hour TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(live_trade_id, profit_hour)
        );
      `);
      console.log('✅ hourly_live_trade_profits table created');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error ensuring live trade tables exist:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting production database deployment...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Database URL configured:', !!process.env.DATABASE_URL);
  
  let success = true;
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ UUID extension enabled');
    
    // Check and create profit_distributions table
    const profitDistributionsExists = await checkTableExists('profit_distributions');
    if (!profitDistributionsExists) {
      const created = await createProfitDistributionsTable();
      if (!created) success = false;
    } else {
      console.log('✅ profit_distributions table already exists');
    }
    
    // Ensure live trade tables exist
    const liveTradeTablesCreated = await ensureLiveTradeTablesExist();
    if (!liveTradeTablesCreated) success = false;
    
    if (success) {
      console.log('🎉 Production database deployment completed successfully!');
    } else {
      console.log('⚠️  Production database deployment completed with some errors');
    }
    
  } catch (error) {
    console.error('❌ Critical error during database deployment:', error);
    success = false;
  } finally {
    await pool.end();
  }
  
  // Exit with appropriate code for CI/CD
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { main };
