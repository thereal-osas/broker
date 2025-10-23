#!/usr/bin/env node

/**
 * Comprehensive Test Data Creation Script
 * 
 * This script creates realistic test data for thorough testing of the broker application
 */

// Load environment variables
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');

// Local database configuration
const localConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'broker_platform',
  password: 'Mirror1#@',
  port: 5432,
};

async function createTestUsers() {
  console.log('👥 Creating comprehensive test users...');
  
  const pool = new Pool(localConfig);
  
  const testUsers = [
    {
      email: 'admin@credcrypto.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      referral_code: 'ADMIN001',
      total_balance: 50000.00,
      credit_score: 2000
    },
    {
      email: 'investor@test.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      first_name: 'Test',
      last_name: 'Investor',
      role: 'investor',
      referral_code: 'INV001',
      total_balance: 5000.00,
      credit_score: 500
    },
    {
      email: 'john.doe@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      first_name: 'John',
      last_name: 'Doe',
      role: 'investor',
      referral_code: 'JOHN001',
      total_balance: 2500.00,
      credit_score: 300
    },
    {
      email: 'jane.smith@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'investor',
      referral_code: 'JANE001',
      total_balance: 7500.00,
      credit_score: 750
    },
    {
      email: 'mike.wilson@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      first_name: 'Mike',
      last_name: 'Wilson',
      role: 'investor',
      referral_code: 'MIKE001',
      total_balance: 1200.00,
      credit_score: 150
    },
    {
      email: 'sarah.johnson@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      first_name: 'Sarah',
      last_name: 'Johnson',
      role: 'investor',
      referral_code: 'SARAH001',
      total_balance: 15000.00,
      credit_score: 1200
    }
  ];
  
  try {
    for (const user of testUsers) {
      // Create user
      const userResult = await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, referral_code, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active
        RETURNING id
      `, [user.email, user.password, user.first_name, user.last_name, user.role, user.referral_code, true]);
      
      const userId = userResult.rows[0].id;
      
      // Create user balance
      await pool.query(`
        INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET
          total_balance = EXCLUDED.total_balance,
          card_balance = EXCLUDED.card_balance,
          credit_score_balance = EXCLUDED.credit_score_balance
      `, [userId, user.total_balance, 0.00, user.credit_score]);
      
      console.log(`✅ Created user: ${user.email} (${user.role})`);
    }
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await pool.end();
  }
}

async function createInvestmentPlans() {
  console.log('\n📈 Creating investment plans...');
  
  const pool = new Pool(localConfig);
  
  const plans = [
    {
      name: 'Starter Plan',
      description: 'Perfect for beginners with low risk and steady returns',
      min_amount: 100.00,
      max_amount: 1000.00,
      daily_profit_rate: 0.015, // 1.5% daily
      duration_days: 30,
      is_active: true
    },
    {
      name: 'Growth Plan',
      description: 'Balanced risk and reward for growing your investment',
      min_amount: 1000.00,
      max_amount: 5000.00,
      daily_profit_rate: 0.025, // 2.5% daily
      duration_days: 45,
      is_active: true
    },
    {
      name: 'Premium Plan',
      description: 'High returns for serious investors',
      min_amount: 5000.00,
      max_amount: 25000.00,
      daily_profit_rate: 0.035, // 3.5% daily
      duration_days: 60,
      is_active: true
    },
    {
      name: 'VIP Plan',
      description: 'Exclusive plan for high-net-worth individuals',
      min_amount: 25000.00,
      max_amount: null,
      daily_profit_rate: 0.045, // 4.5% daily
      duration_days: 90,
      is_active: true
    }
  ];
  
  try {
    for (const plan of plans) {
      await pool.query(`
        INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [plan.name, plan.description, plan.min_amount, plan.max_amount, plan.daily_profit_rate, plan.duration_days, plan.is_active]);
      
      console.log(`✅ Created plan: ${plan.name}`);
    }
  } catch (error) {
    console.error('❌ Error creating investment plans:', error);
  } finally {
    await pool.end();
  }
}

async function createLiveTradePlans() {
  console.log('\n⚡ Creating live trade plans...');
  
  const pool = new Pool(localConfig);
  
  const plans = [
    {
      name: 'Quick Trade',
      description: 'Fast hourly profits for active traders',
      min_amount: 50.00,
      max_amount: 2000.00,
      hourly_profit_rate: 0.001, // 0.1% hourly
      duration_hours: 24,
      is_active: true
    },
    {
      name: 'Day Trader',
      description: 'Full day trading with consistent returns',
      min_amount: 200.00,
      max_amount: 5000.00,
      hourly_profit_rate: 0.0015, // 0.15% hourly
      duration_hours: 48,
      is_active: true
    },
    {
      name: 'Pro Trader',
      description: 'Professional trading for experienced investors',
      min_amount: 1000.00,
      max_amount: 20000.00,
      hourly_profit_rate: 0.002, // 0.2% hourly
      duration_hours: 72,
      is_active: true
    }
  ];
  
  try {
    for (const plan of plans) {
      await pool.query(`
        INSERT INTO live_trade_plans (name, description, min_amount, max_amount, hourly_profit_rate, duration_hours, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [plan.name, plan.description, plan.min_amount, plan.max_amount, plan.hourly_profit_rate, plan.duration_hours, plan.is_active]);
      
      console.log(`✅ Created live trade plan: ${plan.name}`);
    }
  } catch (error) {
    console.error('❌ Error creating live trade plans:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleInvestments() {
  console.log('\n💼 Creating sample investments...');
  
  const pool = new Pool(localConfig);
  
  try {
    // Get users and plans
    const usersResult = await pool.query(`SELECT id, email FROM users WHERE role = 'investor'`);
    const plansResult = await pool.query(`SELECT id, name, min_amount FROM investment_plans WHERE is_active = true`);
    
    const users = usersResult.rows;
    const plans = plansResult.rows;
    
    if (users.length === 0 || plans.length === 0) {
      console.log('⚠️  No users or plans found for creating investments');
      return;
    }
    
    // Create some sample investments
    const investments = [
      { userEmail: 'investor@test.com', planName: 'Starter Plan', amount: 500.00, status: 'active' },
      { userEmail: 'john.doe@example.com', planName: 'Growth Plan', amount: 1500.00, status: 'active' },
      { userEmail: 'jane.smith@example.com', planName: 'Premium Plan', amount: 7500.00, status: 'active' },
      { userEmail: 'sarah.johnson@example.com', planName: 'VIP Plan', amount: 30000.00, status: 'active' },
      { userEmail: 'mike.wilson@example.com', planName: 'Starter Plan', amount: 200.00, status: 'completed' },
    ];
    
    for (const investment of investments) {
      const user = users.find(u => u.email === investment.userEmail);
      const plan = plans.find(p => p.name === investment.planName);
      
      if (user && plan) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)); // Random start date within last 30 days
        
        await pool.query(`
          INSERT INTO user_investments (user_id, plan_id, amount, status, start_date, total_profit)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [user.id, plan.id, investment.amount, investment.status, startDate, Math.random() * investment.amount * 0.1]);
        
        console.log(`✅ Created investment: ${investment.userEmail} - ${investment.planName} ($${investment.amount})`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating sample investments:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleLiveTrades() {
  console.log('\n⚡ Creating sample live trades...');
  
  const pool = new Pool(localConfig);
  
  try {
    // Get users and live trade plans
    const usersResult = await pool.query(`SELECT id, email FROM users WHERE role = 'investor'`);
    const plansResult = await pool.query(`SELECT id, name FROM live_trade_plans WHERE is_active = true`);
    
    const users = usersResult.rows;
    const plans = plansResult.rows;
    
    if (users.length === 0 || plans.length === 0) {
      console.log('⚠️  No users or live trade plans found');
      return;
    }
    
    // Create some sample live trades
    const liveTrades = [
      { userEmail: 'investor@test.com', planName: 'Quick Trade', amount: 100.00, status: 'active' },
      { userEmail: 'john.doe@example.com', planName: 'Day Trader', amount: 500.00, status: 'completed' },
      { userEmail: 'jane.smith@example.com', planName: 'Pro Trader', amount: 2000.00, status: 'active' },
    ];
    
    for (const trade of liveTrades) {
      const user = users.find(u => u.email === trade.userEmail);
      const plan = plans.find(p => p.name === trade.planName);
      
      if (user && plan) {
        const startTime = new Date();
        if (trade.status === 'completed') {
          startTime.setHours(startTime.getHours() - 25); // Completed trade from yesterday
        } else {
          startTime.setHours(startTime.getHours() - Math.floor(Math.random() * 12)); // Active trade started within last 12 hours
        }
        
        const endTime = trade.status === 'completed' ? new Date(startTime.getTime() + 24 * 60 * 60 * 1000) : null;
        
        await pool.query(`
          INSERT INTO user_live_trades (user_id, live_trade_plan_id, amount, status, start_time, end_time, total_profit)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [user.id, plan.id, trade.amount, trade.status, startTime, endTime, Math.random() * trade.amount * 0.05]);
        
        console.log(`✅ Created live trade: ${trade.userEmail} - ${trade.planName} ($${trade.amount}) - ${trade.status}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating sample live trades:', error);
  } finally {
    await pool.end();
  }
}

async function showTestCredentials() {
  console.log('\n🔑 Test Account Credentials:');
  console.log('============================');
  console.log('');
  console.log('👑 ADMIN ACCOUNTS:');
  console.log('📧 admin@credcrypto.com');
  console.log('🔒 password');
  console.log('💰 Balance: $50,000.00');
  console.log('⭐ Credit Score: 2000 CRD');
  console.log('');
  console.log('👤 INVESTOR ACCOUNTS:');
  console.log('');
  console.log('📧 investor@test.com');
  console.log('🔒 password');
  console.log('💰 Balance: $5,000.00');
  console.log('⭐ Credit Score: 500 CRD');
  console.log('');
  console.log('📧 john.doe@example.com');
  console.log('🔒 password');
  console.log('💰 Balance: $2,500.00');
  console.log('⭐ Credit Score: 300 CRD');
  console.log('');
  console.log('📧 jane.smith@example.com');
  console.log('🔒 password');
  console.log('💰 Balance: $7,500.00');
  console.log('⭐ Credit Score: 750 CRD');
  console.log('');
  console.log('📧 mike.wilson@example.com');
  console.log('🔒 password');
  console.log('💰 Balance: $1,200.00');
  console.log('⭐ Credit Score: 150 CRD');
  console.log('');
  console.log('📧 sarah.johnson@example.com');
  console.log('🔒 password');
  console.log('💰 Balance: $15,000.00');
  console.log('⭐ Credit Score: 1200 CRD');
  console.log('');
}

async function main() {
  console.log('🚀 Creating Comprehensive Test Data');
  console.log('===================================');
  
  try {
    await createTestUsers();
    await createInvestmentPlans();
    await createLiveTradePlans();
    await createSampleInvestments();
    await createSampleLiveTrades();
    
    console.log('\n🎉 Comprehensive test data created successfully!');
    
    await showTestCredentials();
    
    console.log('🎯 Next Steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Visit: http://localhost:3000');
    console.log('3. Login with any of the credentials above');
    console.log('4. Test all features with realistic data!');
    console.log('');
    console.log('🧪 Features to test:');
    console.log('• Admin panel (/admin)');
    console.log('• Investment management');
    console.log('• Live trade functionality');
    console.log('• Profit distribution');
    console.log('• User dashboards');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
