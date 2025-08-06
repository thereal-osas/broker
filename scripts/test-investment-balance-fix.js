const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

class InvestmentBalanceTest {
  constructor() {
    this.testResults = [];
  }

  addTestResult(description, passed, details = "") {
    this.testResults.push({
      description,
      passed,
      details,
      timestamp: new Date().toISOString(),
    });

    const status = passed ? "✅" : "❌";
    console.log(`${status} ${description}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }

  async runTests() {
    console.log("🧪 Investment Balance Deduction Test");
    console.log("===================================\n");

    try {
      // 1. Setup test data
      await this.setupTestData();

      // 2. Test investment balance deduction
      await this.testInvestmentBalanceDeduction();

      // 3. Test transaction recording
      await this.testTransactionRecording();

      // 4. Test data consistency
      await this.testDataConsistency();

      // 5. Cleanup
      await this.cleanup();

      // 6. Print summary
      this.printSummary();
    } catch (error) {
      console.error("❌ Test execution failed:", error);
      this.addTestResult("Test execution", false, error.message);
    } finally {
      await pool.end();
    }
  }

  async setupTestData() {
    console.log("📋 Step 1: Setting up test data");
    console.log("==============================");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create test user
      const userResult = await client.query(
        `
        INSERT INTO users (email, password, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
        [
          "test-investment@example.com",
          "hashedpassword",
          "Test",
          "User",
          "user",
        ]
      );

      this.testUserId = userResult.rows[0].id;
      this.addTestResult(
        "Created test user",
        true,
        `User ID: ${this.testUserId}`
      );

      // Create user balance with sufficient funds
      await client.query(
        `
        INSERT INTO user_balances (
          user_id, total_balance, profit_balance, deposit_balance, 
          bonus_balance, credit_score_balance, card_balance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [this.testUserId, 5000.0, 0.0, 5000.0, 0.0, 0.0, 0.0]
      );

      this.addTestResult(
        "Created user balance",
        true,
        "Initial balance: $5,000"
      );

      // Create test investment plan
      const planResult = await client.query(
        `
        INSERT INTO investment_plans (
          name, description, min_amount, max_amount, 
          daily_profit_rate, duration_days, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
        ["Test Plan", "Test investment plan", 100.0, 10000.0, 0.05, 30, true]
      );

      this.testPlanId = planResult.rows[0].id;
      this.addTestResult(
        "Created test investment plan",
        true,
        `Plan ID: ${this.testPlanId}`
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async testInvestmentBalanceDeduction() {
    console.log("\n📋 Step 2: Testing investment balance deduction");
    console.log("==============================================");

    const investmentAmount = 1000.0;

    // Get balance before investment
    const balanceBeforeResult = await pool.query(
      `
      SELECT total_balance, deposit_balance FROM user_balances WHERE user_id = $1
    `,
      [this.testUserId]
    );

    const balanceBefore = balanceBeforeResult.rows[0];
    this.addTestResult(
      "Retrieved balance before investment",
      true,
      `Total: $${balanceBefore.total_balance}, Deposit: $${balanceBefore.deposit_balance}`
    );

    // Make investment using the API logic (simulated)
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create investment
      const investmentResult = await client.query(
        `
        INSERT INTO user_investments (user_id, plan_id, amount)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [this.testUserId, this.testPlanId, investmentAmount]
      );

      this.testInvestmentId = investmentResult.rows[0].id;

      // Deduct from deposit balance (following the fixed logic)
      await client.query(
        `
        UPDATE user_balances
        SET deposit_balance = deposit_balance - $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `,
        [this.testUserId, investmentAmount]
      );

      // Recalculate total balance
      await client.query(
        `
        UPDATE user_balances
        SET total_balance = profit_balance + deposit_balance + bonus_balance + card_balance
        WHERE user_id = $1
      `,
        [this.testUserId]
      );

      // Create transaction record
      await client.query(
        `
        INSERT INTO transactions (user_id, type, amount, balance_type, description, reference_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          this.testUserId,
          "investment",
          investmentAmount,
          "deposit",
          "Test Investment",
          this.testInvestmentId,
          "completed",
        ]
      );

      await client.query("COMMIT");
      this.addTestResult(
        "Investment created successfully",
        true,
        `Investment ID: ${this.testInvestmentId}`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      this.addTestResult("Investment creation failed", false, error.message);
      throw error;
    } finally {
      client.release();
    }

    // Get balance after investment
    const balanceAfterResult = await pool.query(
      `
      SELECT total_balance, deposit_balance FROM user_balances WHERE user_id = $1
    `,
      [this.testUserId]
    );

    const balanceAfter = balanceAfterResult.rows[0];
    this.addTestResult(
      "Retrieved balance after investment",
      true,
      `Total: $${balanceAfter.total_balance}, Deposit: $${balanceAfter.deposit_balance}`
    );

    // Verify balance deduction
    const expectedTotalBalance =
      parseFloat(balanceBefore.total_balance) - investmentAmount;
    const expectedDepositBalance =
      parseFloat(balanceBefore.deposit_balance) - investmentAmount;
    const actualTotalBalance = parseFloat(balanceAfter.total_balance);
    const actualDepositBalance = parseFloat(balanceAfter.deposit_balance);

    const totalBalanceCorrect =
      Math.abs(actualTotalBalance - expectedTotalBalance) < 0.01;
    const depositBalanceCorrect =
      Math.abs(actualDepositBalance - expectedDepositBalance) < 0.01;

    this.addTestResult(
      "Total balance deducted correctly",
      totalBalanceCorrect,
      `Expected: $${expectedTotalBalance}, Actual: $${actualTotalBalance}`
    );
    this.addTestResult(
      "Deposit balance deducted correctly",
      depositBalanceCorrect,
      `Expected: $${expectedDepositBalance}, Actual: $${actualDepositBalance}`
    );
  }

  async testTransactionRecording() {
    console.log("\n📋 Step 3: Testing transaction recording");
    console.log("======================================");

    // Check if transaction was recorded
    const transactionResult = await pool.query(
      `
      SELECT * FROM transactions 
      WHERE user_id = $1 AND reference_id = $2 AND type = 'investment'
    `,
      [this.testUserId, this.testInvestmentId]
    );

    if (transactionResult.rows.length > 0) {
      const transaction = transactionResult.rows[0];
      this.addTestResult(
        "Transaction recorded",
        true,
        `Amount: $${transaction.amount}, Type: ${transaction.type}, Balance Type: ${transaction.balance_type}`
      );

      // Verify transaction details
      const amountCorrect = parseFloat(transaction.amount) === 1000.0;
      const typeCorrect = transaction.type === "investment";
      const balanceTypeCorrect = transaction.balance_type === "deposit";
      const statusCorrect = transaction.status === "completed";

      this.addTestResult("Transaction amount correct", amountCorrect);
      this.addTestResult("Transaction type correct", typeCorrect);
      this.addTestResult(
        "Transaction balance type correct",
        balanceTypeCorrect
      );
      this.addTestResult("Transaction status correct", statusCorrect);
    } else {
      this.addTestResult("Transaction recorded", false, "No transaction found");
    }
  }

  async testDataConsistency() {
    console.log("\n📋 Step 4: Testing data consistency");
    console.log("==================================");

    // Verify investment record
    const investmentResult = await pool.query(
      `
      SELECT * FROM user_investments WHERE id = $1
    `,
      [this.testInvestmentId]
    );

    if (investmentResult.rows.length > 0) {
      const investment = investmentResult.rows[0];
      this.addTestResult(
        "Investment record exists",
        true,
        `Amount: $${investment.amount}, Status: ${investment.status}`
      );
    } else {
      this.addTestResult("Investment record exists", false);
    }

    // Verify balance consistency
    const balanceResult = await pool.query(
      `
      SELECT total_balance, profit_balance + deposit_balance + bonus_balance + card_balance as calculated_total
      FROM user_balances WHERE user_id = $1
    `,
      [this.testUserId]
    );

    if (balanceResult.rows.length > 0) {
      const balance = balanceResult.rows[0];
      const totalBalance = parseFloat(balance.total_balance);
      const calculatedTotal = parseFloat(balance.calculated_total);
      const consistent = Math.abs(totalBalance - calculatedTotal) < 0.01;

      this.addTestResult(
        "Balance consistency check",
        consistent,
        `Total: $${totalBalance}, Calculated: $${calculatedTotal}`
      );
    }
  }

  async cleanup() {
    console.log("\n📋 Step 5: Cleaning up test data");
    console.log("===============================");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Delete test data in reverse order of creation
      await client.query("DELETE FROM transactions WHERE user_id = $1", [
        this.testUserId,
      ]);
      await client.query("DELETE FROM user_investments WHERE user_id = $1", [
        this.testUserId,
      ]);
      await client.query("DELETE FROM user_balances WHERE user_id = $1", [
        this.testUserId,
      ]);
      await client.query("DELETE FROM investment_plans WHERE id = $1", [
        this.testPlanId,
      ]);
      await client.query("DELETE FROM users WHERE id = $1", [this.testUserId]);

      await client.query("COMMIT");
      this.addTestResult("Test data cleaned up", true);
    } catch (error) {
      await client.query("ROLLBACK");
      this.addTestResult("Test data cleanup failed", false, error.message);
    } finally {
      client.release();
    }
  }

  printSummary() {
    console.log("\n📊 Test Summary");
    console.log("==============");

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((test) => test.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(
      `Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
    );

    if (failedTests > 0) {
      console.log("\n❌ Failed tests:");
      this.testResults
        .filter((test) => !test.passed)
        .forEach((test) => {
          console.log(`   - ${test.description}: ${test.details}`);
        });
    }

    console.log(
      `\n${failedTests === 0 ? "🎉 All tests passed!" : "⚠️  Some tests failed"}`
    );
  }
}

// Run the test
if (require.main === module) {
  const test = new InvestmentBalanceTest();
  test.runTests().catch(console.error);
}

module.exports = InvestmentBalanceTest;
