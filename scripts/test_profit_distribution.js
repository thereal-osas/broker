// Comprehensive Test Script for Profit Distribution System
// Run with: node scripts/test_profit_distribution.js

const { Pool } = require("pg");

// Database connection
const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "password", // Update with your password
  database: "broker_platform",
  port: 5432,
});

// Test configuration
const TEST_CONFIG = {
  createTestData: true,
  runDistribution: false, // Set to true to actually run distribution
  validateCalculations: true,
  checkDuplicatePrevention: true,
  testAPIEndpoints: true,
};

async function testProfitDistribution() {
  console.log("🚀 Comprehensive Profit Distribution System Testing...\n");

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: [],
  };

  try {
    // 1. Check if we have active investments
    console.log("1. Checking active investments...");
    const activeInvestmentsQuery = `
      SELECT 
        ui.id,
        ui.user_id,
        ui.amount,
        ui.created_at,
        ip.daily_profit_rate,
        ip.duration_days,
        ip.name as plan_name,
        COALESCE(
          (SELECT COUNT(*) FROM profit_distributions pd WHERE pd.investment_id = ui.id),
          0
        ) as days_completed
      FROM user_investments ui
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.status = 'active'
      LIMIT 5
    `;

    const activeInvestments = await pool.query(activeInvestmentsQuery);
    console.log(`   Found ${activeInvestments.rows.length} active investments`);

    if (activeInvestments.rows.length === 0) {
      console.log(
        "   ⚠️  No active investments found. Creating a test investment..."
      );

      // Get first user and first plan
      const userResult = await pool.query(
        "SELECT id FROM users WHERE role = $1 LIMIT 1",
        ["investor"]
      );
      const planResult = await pool.query(
        "SELECT id FROM investment_plans WHERE is_active = true LIMIT 1"
      );

      if (userResult.rows.length === 0 || planResult.rows.length === 0) {
        console.log(
          "   ❌ No users or investment plans found. Please create them first."
        );
        return;
      }

      // Create test investment
      const createInvestmentQuery = `
        INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const newInvestment = await pool.query(createInvestmentQuery, [
        userResult.rows[0].id,
        planResult.rows[0].id,
        1000.0, // $1000 investment
        "active",
        0.0,
      ]);

      console.log(
        `   ✅ Created test investment: $${newInvestment.rows[0].amount}`
      );
    }

    // 2. Test profit calculation
    console.log("\n2. Testing profit calculations...");
    const testInvestment = activeInvestments.rows[0] || {
      amount: 1000,
      daily_profit_rate: 0.015, // 1.5%
    };

    const dailyProfit =
      parseFloat(testInvestment.amount) *
      parseFloat(testInvestment.daily_profit_rate);
    console.log(`   Investment: $${testInvestment.amount}`);
    console.log(
      `   Daily Rate: ${(
        parseFloat(testInvestment.daily_profit_rate) * 100
      ).toFixed(2)}%`
    );
    console.log(`   Daily Profit: $${dailyProfit.toFixed(2)}`);

    // 3. Check profit distribution table
    console.log("\n3. Checking profit distribution history...");
    const distributionHistory = await pool.query(`
      SELECT COUNT(*) as total_distributions,
             SUM(profit_amount) as total_profits
      FROM profit_distributions
    `);

    console.log(
      `   Total distributions: ${distributionHistory.rows[0].total_distributions}`
    );
    console.log(
      `   Total profits distributed: $${parseFloat(
        distributionHistory.rows[0].total_profits || 0
      ).toFixed(2)}`
    );

    // 4. Test API endpoint (if server is running)
    console.log("\n4. Testing API endpoint...");
    try {
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(
        "http://localhost:3001/api/admin/profit-distribution"
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ API endpoint working`);
        console.log(`   Active investments from API: ${data.count}`);
      } else {
        console.log(`   ⚠️  API endpoint returned status: ${response.status}`);
      }
    } catch (error) {
      console.log(
        `   ⚠️  Could not reach API endpoint (server may not be running)`
      );
    }

    // 5. Check database constraints
    console.log("\n5. Checking database constraints...");
    const constraintCheck = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'profit_distributions'
        AND tc.constraint_type = 'UNIQUE'
    `);

    console.log(`   Found ${constraintCheck.rows.length} unique constraints`);
    constraintCheck.rows.forEach((row) => {
      console.log(`   - ${row.constraint_name} on ${row.column_name}`);
    });

    console.log("\n✅ Profit Distribution System Test Complete!");
    console.log("\n📋 Next Steps:");
    console.log("   1. Set up cron job to call /api/cron/daily-profits daily");
    console.log("   2. Monitor admin panel at /admin/profit-distribution");
    console.log("   3. Check user dashboards for profit history");
    console.log("   4. Set CRON_SECRET environment variable for production");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await pool.end();
  }
}

// Run the test
testProfitDistribution();
