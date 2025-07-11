// Comprehensive Test Script for Profit Distribution System
// Run with: node scripts/comprehensive_profit_test.js

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
  createTestData: false, // Set to true to create test investments
  runDistribution: false, // Set to true to actually run distribution
  validateCalculations: true,
  checkDuplicatePrevention: true,
  testAPIEndpoints: true,
  serverPort: 3001, // Update if your server runs on different port
};

async function runComprehensiveTests() {
  console.log("🚀 Comprehensive Profit Distribution System Testing...\n");
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  try {
    // Run all test suites
    await testDatabaseSchema(results);
    await testActiveInvestments(results);
    await testProfitCalculations(results);
    await testBalanceConsistency(results);
    
    if (TEST_CONFIG.testAPIEndpoints) {
      await testAPIEndpoints(results);
    }
    
    if (TEST_CONFIG.createTestData) {
      await createTestData(results);
    }
    
    if (TEST_CONFIG.runDistribution) {
      await testActualDistribution(results);
    }
    
    await testDuplicatePrevention(results);
    await testInvestmentCompletion(results);

    // Print final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📝 Total Tests: ${results.tests.length}`);
    
    if (results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.tests.filter(t => !t.passed && !t.warning).forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
    }
    
    if (results.warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      results.tests.filter(t => t.warning).forEach(test => {
        console.log(`   - ${test.name}: ${test.warning}`);
      });
    }

    console.log('\n📋 TESTING INSTRUCTIONS:');
    console.log('   1. To create test data: Set createTestData = true');
    console.log('   2. To run actual distribution: Set runDistribution = true');
    console.log('   3. Monitor admin panel at /admin/profit-distribution');
    console.log('   4. Check user dashboards for profit history');
    console.log('   5. Set CRON_SECRET environment variable for production');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    results.failed++;
  } finally {
    await pool.end();
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Test helper functions
function addTestResult(results, name, passed, error = null, warning = null) {
  const test = { name, passed, error, warning };
  results.tests.push(test);
  
  if (warning) {
    results.warnings++;
    console.log(`   ⚠️  ${name}: ${warning}`);
  } else if (passed) {
    results.passed++;
    console.log(`   ✅ ${name}`);
  } else {
    results.failed++;
    console.log(`   ❌ ${name}: ${error}`);
  }
}

async function testDatabaseSchema(results) {
  console.log('1. Testing Database Schema...');
  
  try {
    // Check profit_distributions table
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profit_distributions'
    `);
    
    const requiredColumns = ['id', 'investment_id', 'user_id', 'amount', 'profit_amount', 'distribution_date'];
    const existingColumns = tableCheck.rows.map(row => row.column_name);
    
    for (const col of requiredColumns) {
      if (existingColumns.includes(col)) {
        addTestResult(results, `Column ${col} exists`, true);
      } else {
        addTestResult(results, `Column ${col} exists`, false, `Missing column: ${col}`);
      }
    }
    
    // Check unique constraint
    const constraintCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'profit_distributions' AND constraint_type = 'UNIQUE'
    `);
    
    if (constraintCheck.rows.length > 0) {
      addTestResult(results, 'Unique constraint exists', true);
    } else {
      addTestResult(results, 'Unique constraint exists', false, 'Missing unique constraint for duplicate prevention');
    }
    
  } catch (error) {
    addTestResult(results, 'Database schema check', false, error.message);
  }
}

async function testActiveInvestments(results) {
  console.log('\n2. Testing Active Investments...');
  
  try {
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
    `;
    
    const activeInvestments = await pool.query(activeInvestmentsQuery);
    
    if (activeInvestments.rows.length > 0) {
      addTestResult(results, `Found ${activeInvestments.rows.length} active investments`, true);
      
      // Validate each investment
      for (const investment of activeInvestments.rows) {
        const amount = parseFloat(investment.amount);
        const rate = parseFloat(investment.daily_profit_rate);
        const id = investment.id.slice(0,8);
        
        if (amount > 0) {
          addTestResult(results, `Investment ${id} has valid amount ($${amount})`, true);
        } else {
          addTestResult(results, `Investment ${id} has valid amount`, false, `Invalid amount: ${amount}`);
        }
        
        if (rate > 0 && rate < 1) {
          addTestResult(results, `Investment ${id} has valid rate (${(rate*100).toFixed(2)}%)`, true);
        } else {
          addTestResult(results, `Investment ${id} has valid rate`, false, `Invalid rate: ${rate}`);
        }
        
        // Calculate expected daily profit
        const expectedProfit = amount * rate;
        addTestResult(results, `Investment ${id} daily profit: $${expectedProfit.toFixed(2)}`, true);
      }
    } else {
      addTestResult(results, 'Active investments found', false, 'No active investments found', 'Create test investments to proceed with testing');
    }
    
  } catch (error) {
    addTestResult(results, 'Active investments check', false, error.message);
  }
}

async function testProfitCalculations(results) {
  console.log('\n3. Testing Profit Calculations...');
  
  try {
    const testCases = [
      { amount: 1000, rate: 0.015, expected: 15.00 },
      { amount: 2500, rate: 0.025, expected: 62.50 },
      { amount: 500, rate: 0.01, expected: 5.00 },
      { amount: 10000, rate: 0.02, expected: 200.00 }
    ];
    
    for (const testCase of testCases) {
      const calculated = testCase.amount * testCase.rate;
      const difference = Math.abs(calculated - testCase.expected);
      
      if (difference < 0.01) {
        addTestResult(results, `Calculation: $${testCase.amount} × ${testCase.rate} = $${testCase.expected}`, true);
      } else {
        addTestResult(results, `Calculation: $${testCase.amount} × ${testCase.rate} = $${testCase.expected}`, false, `Expected ${testCase.expected}, got ${calculated}`);
      }
    }
    
    // Test actual database calculations
    const dbCalculationCheck = await pool.query(`
      SELECT 
        pd.investment_id,
        ui.amount as investment_amount,
        ip.daily_profit_rate,
        pd.profit_amount,
        (ui.amount * ip.daily_profit_rate) as expected_profit,
        ABS(pd.profit_amount - (ui.amount * ip.daily_profit_rate)) as difference
      FROM profit_distributions pd
      JOIN user_investments ui ON pd.investment_id = ui.id
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE DATE(pd.distribution_date) >= CURRENT_DATE - INTERVAL '7 days'
      LIMIT 10
    `);
    
    if (dbCalculationCheck.rows.length > 0) {
      for (const row of dbCalculationCheck.rows) {
        const difference = parseFloat(row.difference);
        const id = row.investment_id.slice(0,8);
        
        if (difference < 0.01) {
          addTestResult(results, `DB Calculation ${id}: $${parseFloat(row.profit_amount).toFixed(2)}`, true);
        } else {
          addTestResult(results, `DB Calculation ${id}`, false, `Expected ${parseFloat(row.expected_profit).toFixed(2)}, got ${parseFloat(row.profit_amount).toFixed(2)}`);
        }
      }
    } else {
      addTestResult(results, 'Database calculation verification', true, null, 'No recent distributions found to verify');
    }
    
  } catch (error) {
    addTestResult(results, 'Profit calculations test', false, error.message);
  }
}

async function testBalanceConsistency(results) {
  console.log('\n4. Testing Balance Consistency...');
  
  try {
    const balanceCheck = await pool.query(`
      SELECT 
        ub.user_id,
        ub.total_balance,
        ub.profit_balance,
        COALESCE(SUM(pd.profit_amount), 0) as total_profits_received,
        CASE 
          WHEN ub.profit_balance >= COALESCE(SUM(pd.profit_amount), 0) 
          THEN 'CONSISTENT' 
          ELSE 'INCONSISTENT' 
        END as status
      FROM user_balances ub
      LEFT JOIN profit_distributions pd ON ub.user_id = pd.user_id
      GROUP BY ub.user_id, ub.total_balance, ub.profit_balance
    `);
    
    const inconsistentUsers = balanceCheck.rows.filter(row => row.status === 'INCONSISTENT');
    
    if (inconsistentUsers.length === 0) {
      addTestResult(results, 'User balance consistency', true);
    } else {
      addTestResult(results, 'User balance consistency', false, `${inconsistentUsers.length} users have inconsistent balances`);
    }
    
    // Check for negative balances
    const negativeBalanceCheck = await pool.query(`
      SELECT user_id, total_balance, profit_balance 
      FROM user_balances 
      WHERE total_balance < 0 OR profit_balance < 0
    `);
    
    if (negativeBalanceCheck.rows.length === 0) {
      addTestResult(results, 'No negative balances', true);
    } else {
      addTestResult(results, 'No negative balances', false, `${negativeBalanceCheck.rows.length} users have negative balances`);
    }
    
  } catch (error) {
    addTestResult(results, 'Balance consistency check', false, error.message);
  }
}

async function testAPIEndpoints(results) {
  console.log('\n5. Testing API Endpoints...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = `http://localhost:${TEST_CONFIG.serverPort}`;
    
    // Test admin profit distribution endpoint
    try {
      const response = await fetch(`${baseUrl}/api/admin/profit-distribution`);
      if (response.ok) {
        addTestResult(results, 'Admin profit distribution API accessible', true);
        const data = await response.json();
        addTestResult(results, `API returns ${data.count || 0} active investments`, true);
      } else {
        addTestResult(results, 'Admin profit distribution API accessible', false, `HTTP ${response.status}`);
      }
    } catch (error) {
      addTestResult(results, 'Admin profit distribution API accessible', false, 'Server not running or endpoint not accessible');
    }
    
    // Test cron endpoint health check
    try {
      const response = await fetch(`${baseUrl}/api/cron/daily-profits`);
      if (response.ok) {
        addTestResult(results, 'Cron endpoint health check', true);
      } else {
        addTestResult(results, 'Cron endpoint health check', false, `HTTP ${response.status}`);
      }
    } catch (error) {
      addTestResult(results, 'Cron endpoint health check', false, 'Endpoint not accessible');
    }
    
    // Test user profits endpoint
    try {
      const response = await fetch(`${baseUrl}/api/profits`);
      // This should return 401 without authentication, which is expected
      if (response.status === 401) {
        addTestResult(results, 'User profits API authentication', true);
      } else {
        addTestResult(results, 'User profits API authentication', false, `Expected 401, got ${response.status}`);
      }
    } catch (error) {
      addTestResult(results, 'User profits API authentication', false, 'Endpoint not accessible');
    }
    
  } catch (error) {
    addTestResult(results, 'API endpoints test', false, error.message);
  }
}

async function createTestData(results) {
  console.log('\n6. Creating Test Data...');
  
  try {
    // Get first user and plan
    const userResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['investor']);
    const planResult = await pool.query('SELECT id, daily_profit_rate FROM investment_plans WHERE is_active = true LIMIT 1');
    
    if (userResult.rows.length === 0) {
      addTestResult(results, 'Create test data', false, 'No investor users found');
      return;
    }
    
    if (planResult.rows.length === 0) {
      addTestResult(results, 'Create test data', false, 'No active investment plans found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    const planId = planResult.rows[0].id;
    const rate = parseFloat(planResult.rows[0].daily_profit_rate);
    
    // Create test investment
    const testAmount = 1000.00;
    const createInvestmentQuery = `
      INSERT INTO user_investments (user_id, plan_id, amount, status, total_profit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    const newInvestment = await pool.query(createInvestmentQuery, [
      userId,
      planId,
      testAmount,
      'active',
      0.00
    ]);
    
    const investmentId = newInvestment.rows[0].id;
    const expectedDailyProfit = testAmount * rate;
    
    addTestResult(results, `Created test investment: $${testAmount}`, true);
    addTestResult(results, `Expected daily profit: $${expectedDailyProfit.toFixed(2)}`, true);
    
  } catch (error) {
    addTestResult(results, 'Create test data', false, error.message);
  }
}

async function testActualDistribution(results) {
  console.log('\n7. Testing Actual Distribution (WARNING: This will modify data)...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = `http://localhost:${TEST_CONFIG.serverPort}`;
    
    // Get initial state
    const initialDistributions = await pool.query('SELECT COUNT(*) as count FROM profit_distributions WHERE DATE(distribution_date) = CURRENT_DATE');
    const initialCount = parseInt(initialDistributions.rows[0].count);
    
    // Run distribution via API
    const response = await fetch(`${baseUrl}/api/cron/daily-profits`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-secret-123',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      addTestResult(results, 'Distribution API call successful', true);
      addTestResult(results, `Processed ${data.result?.processed || 0} investments`, true);
      addTestResult(results, `Skipped ${data.result?.skipped || 0} investments`, true);
      addTestResult(results, `Errors: ${data.result?.errors || 0}`, data.result?.errors === 0);
      
      // Verify database changes
      const finalDistributions = await pool.query('SELECT COUNT(*) as count FROM profit_distributions WHERE DATE(distribution_date) = CURRENT_DATE');
      const finalCount = parseInt(finalDistributions.rows[0].count);
      
      if (finalCount > initialCount) {
        addTestResult(results, 'Distribution records created', true);
      } else if (data.result?.skipped > 0) {
        addTestResult(results, 'Distribution records created', true, null, 'No new records (already distributed today)');
      } else {
        addTestResult(results, 'Distribution records created', false, 'No new distribution records found');
      }
      
    } else {
      const errorText = await response.text();
      addTestResult(results, 'Distribution API call successful', false, `HTTP ${response.status}: ${errorText}`);
    }
    
  } catch (error) {
    addTestResult(results, 'Actual distribution test', false, error.message);
  }
}

async function testDuplicatePrevention(results) {
  console.log('\n8. Testing Duplicate Prevention...');
  
  try {
    const duplicateCheck = await pool.query(`
      SELECT investment_id, DATE(distribution_date), COUNT(*) as count
      FROM profit_distributions 
      GROUP BY investment_id, DATE(distribution_date)
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length === 0) {
      addTestResult(results, 'No duplicate distributions found', true);
    } else {
      addTestResult(results, 'No duplicate distributions found', false, `Found ${duplicateCheck.rows.length} duplicate distributions`);
    }
    
  } catch (error) {
    addTestResult(results, 'Duplicate prevention test', false, error.message);
  }
}

async function testInvestmentCompletion(results) {
  console.log('\n9. Testing Investment Completion Logic...');
  
  try {
    const completionCheck = await pool.query(`
      SELECT 
        ui.id,
        ui.status,
        ip.duration_days,
        COUNT(pd.id) as distributions_count
      FROM user_investments ui
      JOIN investment_plans ip ON ui.plan_id = ip.id
      LEFT JOIN profit_distributions pd ON ui.id = pd.investment_id
      GROUP BY ui.id, ui.status, ip.duration_days
      HAVING COUNT(pd.id) >= ip.duration_days AND ui.status = 'active'
    `);
    
    if (completionCheck.rows.length === 0) {
      addTestResult(results, 'Investment completion logic', true);
    } else {
      addTestResult(results, 'Investment completion logic', false, `${completionCheck.rows.length} investments should be completed but are still active`);
    }
    
    // Check for properly completed investments
    const completedCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_investments 
      WHERE status = 'completed'
    `);
    
    const completedCount = parseInt(completedCheck.rows[0].count);
    if (completedCount > 0) {
      addTestResult(results, `Found ${completedCount} completed investments`, true);
    } else {
      addTestResult(results, 'Completed investments found', true, null, 'No completed investments found (may be normal for new system)');
    }
    
  } catch (error) {
    addTestResult(results, 'Investment completion test', false, error.message);
  }
}

// Run the comprehensive test
runComprehensiveTests();
