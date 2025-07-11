const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

// Load environment variables from .env.local
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "broker_platform",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
};

async function seedDatabase() {
  const pool = new Pool(dbConfig);

  try {
    console.log("🌱 Seeding database with initial data...");

    // Create admin user
    const adminId = uuidv4();
    const adminQuery = `
      INSERT INTO users (id, email, password, first_name, last_name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    const adminValues = [
      adminId,
      "admin@broker.com",
      "admin123", // Plain text as requested
      "Admin",
      "User",
      "admin",
      true,
      true,
    ];

    const adminResult = await pool.query(adminQuery, adminValues);
    if (adminResult.rows.length > 0) {
      console.log("👤 Created admin user: admin@broker.com / admin123");

      // Create admin balance
      await pool.query(
        `
        INSERT INTO user_balances (user_id, total_balance)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO NOTHING
      `,
        [adminId, 1000000.0]
      );
    }

    // Create sample investment plans
    const investmentPlans = [
      {
        name: "Starter Plan",
        description:
          "Perfect for beginners looking to start their investment journey",
        min_amount: 100.0,
        max_amount: 999.99,
        daily_profit_rate: 0.015, // 1.5% daily
        duration_days: 30,
      },
      {
        name: "Growth Plan",
        description:
          "Ideal for investors seeking steady growth with moderate risk",
        min_amount: 1000.0,
        max_amount: 4999.99,
        daily_profit_rate: 0.02, // 2.0% daily
        duration_days: 45,
      },
      {
        name: "Premium Plan",
        description: "High-yield investment plan for experienced investors",
        min_amount: 5000.0,
        max_amount: 19999.99,
        daily_profit_rate: 0.025, // 2.5% daily
        duration_days: 60,
      },
      {
        name: "Elite Plan",
        description: "Exclusive plan for high-net-worth individuals",
        min_amount: 20000.0,
        max_amount: null,
        daily_profit_rate: 0.03, // 3.0% daily
        duration_days: 90,
      },
    ];

    for (const plan of investmentPlans) {
      await pool.query(
        `
        INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `,
        [
          plan.name,
          plan.description,
          plan.min_amount,
          plan.max_amount,
          plan.daily_profit_rate,
          plan.duration_days,
          true,
        ]
      );
    }
    console.log("📊 Created investment plans");

    // Create demo investor user
    const demoUserId = uuidv4();
    const demoUserQuery = `
      INSERT INTO users (id, email, password, first_name, last_name, role, is_active, email_verified, referral_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    const demoUserValues = [
      demoUserId,
      "demo@investor.com",
      "demo123",
      "Demo",
      "Investor",
      "investor",
      true,
      true,
      "DEMO2024",
    ];

    const demoResult = await pool.query(demoUserQuery, demoUserValues);
    if (demoResult.rows.length > 0) {
      console.log("👤 Created demo investor: demo@investor.com / demo123");

      // Create demo user balance
      await pool.query(
        `
        INSERT INTO user_balances (user_id, total_balance, deposit_balance, bonus_balance)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO NOTHING
      `,
        [demoUserId, 5000.0, 4000.0, 1000.0]
      );

      // Create sample transaction for demo user
      await pool.query(
        `
        INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          demoUserId,
          "deposit",
          4000.0,
          "deposit",
          "Initial deposit",
          "completed",
        ]
      );

      await pool.query(
        `
        INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [demoUserId, "bonus", 1000.0, "bonus", "Welcome bonus", "completed"]
      );
    }

    // Insert system settings
    const systemSettings = [
      {
        key: "platform_name",
        value: "CredCrypto",
        description: "Platform name displayed throughout the application",
      },
      {
        key: "default_referral_commission",
        value: "0.05",
        description: "Default referral commission rate (5%)",
      },
      {
        key: "min_withdrawal_amount",
        value: "50.00",
        description: "Minimum withdrawal amount",
      },
      {
        key: "max_withdrawal_amount",
        value: "50000.00",
        description: "Maximum withdrawal amount per request",
      },
      {
        key: "support_email",
        value: "support@credcrypto.com",
        description: "Support email address",
      },
      {
        key: "support_whatsapp",
        value: "+1234567890",
        description: "Support WhatsApp number",
      },
    ];

    for (const setting of systemSettings) {
      await pool.query(
        `
        INSERT INTO system_settings (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE SET value = $2, description = $3
      `,
        [setting.key, setting.value, setting.description]
      );
    }
    console.log("⚙️  Created system settings");

    // Create sample newsletter
    await pool.query(
      `
      INSERT INTO newsletters (title, content, author_id, is_published, published_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `,
      [
        "Welcome to CredCrypto",
        "Welcome to our investment platform! We are excited to have you join our community of successful investors. Start your journey today with our comprehensive investment plans designed to maximize your returns.",
        adminId,
        true,
        new Date(),
      ]
    );
    console.log("📰 Created sample newsletter");

    console.log("✅ Database seeding completed successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("Admin: admin@broker.com / admin123");
    console.log("Demo Investor: demo@investor.com / demo123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
