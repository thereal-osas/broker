#!/usr/bin/env node

/**
 * Local Development Setup Script
 *
 * This script sets up a complete local development environment:
 * 1. Creates the local database if it doesn't exist
 * 2. Sets up all required tables with proper schema
 * 3. Seeds the database with test data
 * 4. Verifies the setup is working correctly
 */

// Load environment variables
require("dotenv").config({ path: ".env" });

const { Pool } = require("pg");

// Database configuration for local development
const localDbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: "postgres", // Connect to default postgres database first
  password: process.env.DB_PASSWORD || "Mirror1#@",
  port: parseInt(process.env.DB_PORT || "5432"),
};

const targetDbConfig = {
  ...localDbConfig,
  database: process.env.DB_NAME || "broker_platform",
};

async function createDatabaseIfNotExists() {
  console.log("🔍 Checking if database exists...");

  const pool = new Pool(localDbConfig);

  try {
    // Check if database exists
    const result = await pool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbConfig.database]
    );

    if (result.rows.length === 0) {
      console.log(`📝 Creating database: ${targetDbConfig.database}`);
      await pool.query(`CREATE DATABASE "${targetDbConfig.database}"`);
      console.log("✅ Database created successfully");
    } else {
      console.log("✅ Database already exists");
    }
  } catch (error) {
    console.error("❌ Error checking/creating database:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function setupDatabaseSchema() {
  console.log("🏗️  Setting up database schema...");

  const pool = new Pool(targetDbConfig);

  try {
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log("✅ UUID extension enabled");

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'investor' CHECK (role IN ('investor', 'admin')),
        referral_code VARCHAR(50) UNIQUE,
        referred_by VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Users table created");

    // Create user_balances table with proper schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_balances (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_balance DECIMAL(15,2) DEFAULT 0.00,
        credit_score_balance INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);

    // Add card_balance column if it doesn't exist
    await pool.query(`
      ALTER TABLE user_balances
      ADD COLUMN IF NOT EXISTS card_balance DECIMAL(15,2) DEFAULT 0.00;
    `);
    console.log("✅ User balances table created");

    // Create investment_plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS investment_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        min_amount DECIMAL(15,2) NOT NULL,
        max_amount DECIMAL(15,2),
        daily_profit_rate DECIMAL(5,4) NOT NULL,
        duration_days INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Investment plans table created");

    // Create user_investments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_investments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES investment_plans(id),
        amount DECIMAL(15,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'suspended', 'deactivated')),
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        total_profit DECIMAL(15,2) DEFAULT 0.00,
        last_profit_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ User investments table created");

    // Create transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment', 'credit')),
        amount DECIMAL(15,2) NOT NULL,
        balance_type VARCHAR(20) NOT NULL CHECK (balance_type IN ('total', 'card', 'credit_score')),
        description TEXT,
        reference_id UUID,
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Transactions table created");

    // Create live trade tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_trade_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    console.log("✅ Live trade plans table created");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_live_trades (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    console.log("✅ User live trades table created");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hourly_live_trade_profits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        live_trade_id UUID NOT NULL REFERENCES user_live_trades(id) ON DELETE CASCADE,
        profit_amount DECIMAL(15,2) NOT NULL,
        profit_hour TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(live_trade_id, profit_hour)
      );
    `);
    console.log("✅ Hourly live trade profits table created");

    // Create profit_distributions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profit_distributions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        profit_amount DECIMAL(15,2) NOT NULL,
        distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Profit distributions table created");

    console.log("🎉 Database schema setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up database schema:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function seedTestData() {
  console.log("🌱 Seeding test data...");

  const pool = new Pool(targetDbConfig);

  try {
    // Create admin user
    const adminResult = await pool.query(
      `
      INSERT INTO users (email, password, first_name, last_name, role, referral_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role
      RETURNING id
    `,
      [
        "admin@credcrypto.com",
        "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: password
        "Admin",
        "User",
        "admin",
        "ADMIN001",
      ]
    );

    const adminId = adminResult.rows[0].id;
    console.log("✅ Admin user created");

    // Create test investor user
    const investorResult = await pool.query(
      `
      INSERT INTO users (email, password, first_name, last_name, role, referral_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password
      RETURNING id
    `,
      [
        "investor@test.com",
        "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: password
        "Test",
        "Investor",
        "investor",
        "INV001",
      ]
    );

    const investorId = investorResult.rows[0].id;
    console.log("✅ Test investor user created");

    // Create user balances
    await pool.query(
      `
      INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        total_balance = EXCLUDED.total_balance,
        card_balance = EXCLUDED.card_balance,
        credit_score_balance = EXCLUDED.credit_score_balance
    `,
      [adminId, 10000.0, 0.0, 1000]
    );

    await pool.query(
      `
      INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        total_balance = EXCLUDED.total_balance,
        card_balance = EXCLUDED.card_balance,
        credit_score_balance = EXCLUDED.credit_score_balance
    `,
      [investorId, 5000.0, 0.0, 500]
    );

    console.log("✅ User balances created");

    // Create investment plans
    const investmentPlanResult = await pool.query(
      `
      INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
      RETURNING id
    `,
      [
        "Starter Plan",
        "Perfect for beginners with low risk and steady returns",
        100.0,
        1000.0,
        0.015, // 1.5% daily
        30,
        true,
      ]
    );

    if (investmentPlanResult.rows.length > 0) {
      console.log("✅ Investment plan created");
    }

    // Create live trade plan
    const liveTradeResult = await pool.query(
      `
      INSERT INTO live_trade_plans (name, description, min_amount, max_amount, hourly_profit_rate, duration_hours, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
      RETURNING id
    `,
      [
        "Quick Trade",
        "Fast hourly profits for active traders",
        50.0,
        2000.0,
        0.001, // 0.1% hourly
        24,
        true,
      ]
    );

    if (liveTradeResult.rows.length > 0) {
      console.log("✅ Live trade plan created");
    }

    console.log("🎉 Test data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding test data:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function verifySetup() {
  console.log("🔍 Verifying setup...");

  const pool = new Pool(targetDbConfig);

  try {
    // Check users
    const usersResult = await pool.query("SELECT COUNT(*) as count FROM users");
    console.log(`✅ Users table: ${usersResult.rows[0].count} records`);

    // Check investment plans
    const plansResult = await pool.query(
      "SELECT COUNT(*) as count FROM investment_plans"
    );
    console.log(`✅ Investment plans: ${plansResult.rows[0].count} records`);

    // Check live trade plans
    const liveTradeResult = await pool.query(
      "SELECT COUNT(*) as count FROM live_trade_plans"
    );
    console.log(
      `✅ Live trade plans: ${liveTradeResult.rows[0].count} records`
    );

    // Test database connection with app config
    const testResult = await pool.query("SELECT NOW() as current_time");
    console.log(
      `✅ Database connection test: ${testResult.rows[0].current_time}`
    );

    console.log("🎉 Setup verification completed successfully!");
  } catch (error) {
    console.error("❌ Error verifying setup:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log("🚀 Starting Local Development Setup");
  console.log("===================================");
  console.log(`Database: ${targetDbConfig.database}`);
  console.log(`Host: ${targetDbConfig.host}:${targetDbConfig.port}`);
  console.log(`User: ${targetDbConfig.user}`);
  console.log("");

  try {
    await createDatabaseIfNotExists();
    await setupDatabaseSchema();
    await seedTestData();
    await verifySetup();

    console.log("");
    console.log("🎉 Local development setup completed successfully!");
    console.log("");
    console.log("📋 Next steps:");
    console.log("1. Start your Next.js development server: npm run dev");
    console.log("2. Visit http://localhost:3000");
    console.log("3. Login with test credentials:");
    console.log("   Admin: admin@credcrypto.com / password");
    console.log("   Investor: investor@test.com / password");
    console.log("");
    console.log("🔧 To switch back to production:");
    console.log("1. Comment out local config in .env");
    console.log("2. Uncomment production config in .env");
    console.log("3. Restart your development server");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
