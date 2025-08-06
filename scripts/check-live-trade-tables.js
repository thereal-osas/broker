#!/usr/bin/env node

/**
 * Check if live trade tables exist and create them if missing
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkLiveTradeSystem() {
  console.log('🔍 Checking Live Trade System Database Tables');
  console.log('=============================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if live trade tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits')
      ORDER BY table_name
    `);
    
    const existingTables = tableCheck.rows.map(row => row.table_name);
    const requiredTables = ['live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits'];
    
    console.log('📋 Table Status:');
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`\n⚠️  Found ${missingTables.length} missing table(s): ${missingTables.join(', ')}`);
      console.log('\n🔧 Creating missing tables...\n');
      
      // Create live_trade_plans table
      if (missingTables.includes('live_trade_plans')) {
        console.log('Creating live_trade_plans table...');
        await pool.query(`
          CREATE TABLE live_trade_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            min_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
            max_amount DECIMAL(15,2),
            hourly_profit_rate DECIMAL(8,6) NOT NULL,
            duration_hours INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ live_trade_plans table created');
      }
      
      // Create user_live_trades table
      if (missingTables.includes('user_live_trades')) {
        console.log('Creating user_live_trades table...');
        await pool.query(`
          CREATE TABLE user_live_trades (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            live_trade_plan_id UUID NOT NULL REFERENCES live_trade_plans(id) ON DELETE CASCADE,
            amount DECIMAL(15,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            total_profit DECIMAL(15,2) DEFAULT 0,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ user_live_trades table created');
      }
      
      // Create hourly_live_trade_profits table
      if (missingTables.includes('hourly_live_trade_profits')) {
        console.log('Creating hourly_live_trade_profits table...');
        await pool.query(`
          CREATE TABLE hourly_live_trade_profits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            live_trade_id UUID NOT NULL REFERENCES user_live_trades(id) ON DELETE CASCADE,
            profit_amount DECIMAL(15,2) NOT NULL,
            profit_hour TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ hourly_live_trade_profits table created');
      }
      
      // Create some sample live trade plans
      console.log('\n📋 Creating sample live trade plans...');
      
      const samplePlans = [
        {
          name: 'Quick Trade',
          description: 'Short-term live trading with hourly profits',
          min_amount: 50,
          max_amount: 1000,
          hourly_profit_rate: 0.02, // 2% per hour
          duration_hours: 12
        },
        {
          name: 'Standard Trade',
          description: 'Medium-term live trading with steady returns',
          min_amount: 100,
          max_amount: 5000,
          hourly_profit_rate: 0.015, // 1.5% per hour
          duration_hours: 24
        },
        {
          name: 'Premium Trade',
          description: 'Long-term live trading with maximum returns',
          min_amount: 500,
          max_amount: null,
          hourly_profit_rate: 0.025, // 2.5% per hour
          duration_hours: 48
        }
      ];
      
      for (const plan of samplePlans) {
        await pool.query(`
          INSERT INTO live_trade_plans (name, description, min_amount, max_amount, hourly_profit_rate, duration_hours)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [plan.name, plan.description, plan.min_amount, plan.max_amount, plan.hourly_profit_rate, plan.duration_hours]);
        console.log(`✅ Created plan: ${plan.name}`);
      }
      
      console.log('\n🎉 All missing tables and sample data created successfully!');
    } else {
      console.log('\n✅ All required tables exist!');
      
      // Check if there are any live trade plans
      const planCount = await pool.query('SELECT COUNT(*) as count FROM live_trade_plans');
      const count = parseInt(planCount.rows[0].count);
      console.log(`📊 Live trade plans available: ${count}`);
      
      if (count === 0) {
        console.log('\n⚠️  No live trade plans found. Creating sample plans...');
        // Create sample plans (same code as above)
        const samplePlans = [
          {
            name: 'Quick Trade',
            description: 'Short-term live trading with hourly profits',
            min_amount: 50,
            max_amount: 1000,
            hourly_profit_rate: 0.02,
            duration_hours: 12
          },
          {
            name: 'Standard Trade',
            description: 'Medium-term live trading with steady returns',
            min_amount: 100,
            max_amount: 5000,
            hourly_profit_rate: 0.015,
            duration_hours: 24
          },
          {
            name: 'Premium Trade',
            description: 'Long-term live trading with maximum returns',
            min_amount: 500,
            max_amount: null,
            hourly_profit_rate: 0.025,
            duration_hours: 48
          }
        ];
        
        for (const plan of samplePlans) {
          await pool.query(`
            INSERT INTO live_trade_plans (name, description, min_amount, max_amount, hourly_profit_rate, duration_hours)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [plan.name, plan.description, plan.min_amount, plan.max_amount, plan.hourly_profit_rate, plan.duration_hours]);
          console.log(`✅ Created plan: ${plan.name}`);
        }
        console.log('✅ Sample plans created!');
      }
    }
    
    console.log('\n🎯 LIVE TRADE SYSTEM STATUS');
    console.log('===========================');
    console.log('✅ Database tables: Ready');
    console.log('✅ Sample plans: Available');
    console.log('✅ System: Ready for use');
    
  } catch (error) {
    console.error('❌ Error checking live trade system:', error.message);
    console.log('\n💡 Possible solutions:');
    console.log('1. Check database connection');
    console.log('2. Verify DATABASE_URL environment variable');
    console.log('3. Ensure database user has CREATE TABLE permissions');
  } finally {
    await pool.end();
  }
}

checkLiveTradeSystem();
