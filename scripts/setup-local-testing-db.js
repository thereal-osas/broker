#!/usr/bin/env node

/**
 * Setup Local Testing Database
 *
 * Creates a local PostgreSQL database with sample data for safe testing
 * without affecting the production Railway database.
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Local database configuration
const LOCAL_DB_CONFIG = {
  host: "localhost",
  port: 5432,
  database: "broker_local_test",
  user: "postgres",
  password: "Mirror1#@",
};

async function setupLocalTestingDatabase() {
  console.log("🔧 Setting Up Local Testing Database");
  console.log("===================================\n");

  // First, connect to postgres database to create our test database
  const adminPool = new Pool({
    ...LOCAL_DB_CONFIG,
    database: "postgres", // Connect to default postgres database
  });

  try {
    // Create test database if it doesn't exist
    console.log("📋 Step 1: Creating test database...");
    try {
      await adminPool.query(`CREATE DATABASE ${LOCAL_DB_CONFIG.database}`);
      console.log(`✅ Created database: ${LOCAL_DB_CONFIG.database}`);
    } catch (error) {
      if (error.code === "42P04") {
        console.log(`✅ Database ${LOCAL_DB_CONFIG.database} already exists`);
      } else {
        throw error;
      }
    }

    await adminPool.end();

    // Now connect to our test database
    const testPool = new Pool(LOCAL_DB_CONFIG);

    // Load and execute schema
    console.log("\n📋 Step 2: Setting up database schema...");
    const schemaPath = path.join(__dirname, "..", "database", "schema.sql");

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, "utf8");
      await testPool.query(schema);
      console.log("✅ Database schema created");
    } else {
      console.log("❌ Schema file not found at:", schemaPath);
      console.log("Creating basic schema...");

      // Create basic schema if file doesn't exist
      await createBasicSchema(testPool);
    }

    // Create test data
    console.log("\n📋 Step 3: Creating test data...");
    await createTestData(testPool);

    console.log("\n🎯 LOCAL TESTING DATABASE READY");
    console.log("===============================");
    console.log(`Database: ${LOCAL_DB_CONFIG.database}`);
    console.log(`Host: ${LOCAL_DB_CONFIG.host}:${LOCAL_DB_CONFIG.port}`);
    console.log(
      `Connection String: postgresql://${LOCAL_DB_CONFIG.user}:${LOCAL_DB_CONFIG.password}@${LOCAL_DB_CONFIG.host}:${LOCAL_DB_CONFIG.port}/${LOCAL_DB_CONFIG.database}`
    );

    console.log("\n📋 Next Steps:");
    console.log("1. Update your .env.local file with the local database URL");
    console.log("2. Restart your development server");
    console.log("3. Test the failing functionalities safely");

    await testPool.end();
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

async function createBasicSchema(pool) {
  // Create essential tables for testing
  const basicSchema = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(20) DEFAULT 'investor' CHECK (role IN ('investor', 'admin')),
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      referral_code VARCHAR(20) UNIQUE,
      referred_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- User balances table
    CREATE TABLE IF NOT EXISTS user_balances (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      total_balance DECIMAL(15,2) DEFAULT 0.00,
      card_balance DECIMAL(15,2) DEFAULT 0.00,
      credit_score_balance INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Investment plans table
    CREATE TABLE IF NOT EXISTS investment_plans (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      min_amount DECIMAL(15,2) NOT NULL,
      max_amount DECIMAL(15,2) NOT NULL,
      daily_profit_rate DECIMAL(5,4) NOT NULL,
      duration_days INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- User investments table
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

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_commission', 'admin_funding', 'live_trade_investment')),
      amount DECIMAL(15,2) NOT NULL,
      balance_type VARCHAR(20) NOT NULL CHECK (balance_type IN ('total', 'card', 'credit_score')),
      description TEXT,
      reference_id UUID,
      status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Deposit requests table
    CREATE TABLE IF NOT EXISTS deposit_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(15,2) NOT NULL,
      payment_method VARCHAR(50),
      payment_proof TEXT,
      payment_proof_image TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
      admin_notes TEXT,
      processed_by UUID REFERENCES users(id),
      processed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Live trade plans table
    CREATE TABLE IF NOT EXISTS live_trade_plans (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      min_amount DECIMAL(15,2) NOT NULL,
      max_amount DECIMAL(15,2) NOT NULL,
      hourly_profit_rate DECIMAL(8,6) NOT NULL,
      duration_hours INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- User live trades table
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

    -- Hourly live trade profits table
    CREATE TABLE IF NOT EXISTS hourly_live_trade_profits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      live_trade_id UUID NOT NULL REFERENCES user_live_trades(id) ON DELETE CASCADE,
      profit_amount DECIMAL(15,2) NOT NULL,
      profit_hour TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily profit distributions table
    CREATE TABLE IF NOT EXISTS daily_profit_distributions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
      distribution_date DATE NOT NULL,
      profit_amount DECIMAL(15,2) NOT NULL,
      distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(investment_id, distribution_date)
    );
  `;

  await pool.query(basicSchema);
  console.log("✅ Basic schema created");
}

async function createTestData(pool) {
  // Create test admin user
  const adminResult = await pool.query(
    `
    INSERT INTO users (email, password, first_name, last_name, role, email_verified, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role
    RETURNING id
  `,
    [
      "admin@test.com",
      "$2a$10$hashedpassword",
      "Test",
      "Admin",
      "admin",
      true,
      true,
    ]
  );

  const adminId = adminResult.rows[0].id;
  console.log("✅ Created test admin user");

  // Create test regular users
  const userIds = [];
  for (let i = 1; i <= 3; i++) {
    const userResult = await pool.query(
      `
      INSERT INTO users (email, password, first_name, last_name, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name
      RETURNING id
    `,
      [
        `user${i}@test.com`,
        "$2a$10$hashedpassword",
        `Test`,
        `User${i}`,
        "investor",
        true,
        true,
      ]
    );

    userIds.push(userResult.rows[0].id);
  }
  console.log("✅ Created test users");

  // Create user balances
  for (const userId of userIds) {
    await pool.query(
      `
      INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        total_balance = EXCLUDED.total_balance,
        card_balance = EXCLUDED.card_balance,
        credit_score_balance = EXCLUDED.credit_score_balance
    `,
      [userId, 1000.0, 0.0, 100]
    );
  }
  console.log("✅ Created user balances");

  // Create investment plans
  const planResult = await pool.query(
    `
    INSERT INTO investment_plans (name, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT DO NOTHING
    RETURNING id
  `,
    ["Test Plan", 100.0, 10000.0, 0.015, 30, true]
  );

  let planId;
  if (planResult.rows.length > 0) {
    planId = planResult.rows[0].id;
  } else {
    const existingPlan = await pool.query(
      "SELECT id FROM investment_plans LIMIT 1"
    );
    planId = existingPlan.rows[0]?.id;
  }

  if (planId) {
    // Create test investments
    for (let i = 0; i < userIds.length; i++) {
      await pool.query(
        `
        INSERT INTO user_investments (user_id, plan_id, amount, status, start_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `,
        [
          userIds[i],
          planId,
          500.0,
          "active",
          new Date().toISOString().split("T")[0],
        ]
      );
    }
    console.log("✅ Created test investments");
  }

  // Create live trade plan
  const liveTradeResult = await pool.query(
    `
    INSERT INTO live_trade_plans (name, min_amount, max_amount, hourly_profit_rate, duration_hours, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT DO NOTHING
    RETURNING id
  `,
    ["Test Live Trade", 50.0, 5000.0, 0.001, 24, true]
  );

  if (liveTradeResult.rows.length > 0) {
    const liveTradeplanId = liveTradeResult.rows[0].id;

    // Create test live trades
    await pool.query(
      `
      INSERT INTO user_live_trades (user_id, live_trade_plan_id, amount, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `,
      [userIds[0], liveTradeplanId, 200.0, "active"]
    );
    console.log("✅ Created test live trades");
  }

  // Create test deposit requests
  for (let i = 0; i < userIds.length; i++) {
    await pool.query(
      `
      INSERT INTO deposit_requests (user_id, amount, payment_method, payment_proof, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `,
      [userIds[i], 250.0, "bank_transfer", "test-payment-proof.jpg", "pending"]
    );
  }
  console.log("✅ Created test deposit requests");

  console.log("\n📊 Test Data Summary:");
  console.log("- 1 Admin user (admin@test.com)");
  console.log(
    "- 3 Regular users (user1@test.com, user2@test.com, user3@test.com)"
  );
  console.log("- User balances with $1000 each");
  console.log("- Active investments for profit distribution testing");
  console.log("- Active live trades for live trade profit testing");
  console.log("- Pending deposit requests for admin testing");
}

setupLocalTestingDatabase();
