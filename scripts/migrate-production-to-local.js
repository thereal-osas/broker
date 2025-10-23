#!/usr/bin/env node

/**
 * Production to Local Data Migration Script
 * 
 * This script migrates data from your Railway production database
 * to your local PostgreSQL database for development and testing.
 */

// Load environment variables
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');

// Production database configuration (Railway)
const productionConfig = {
  connectionString: "postgresql://postgres:UUHFHLmfoRLVNTSTbDgrGxsNWTgDCbCx@turntable.proxy.rlwy.net:30859/railway",
  ssl: { rejectUnauthorized: false },
};

// Local database configuration
const localConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'broker_platform',
  password: 'Mirror1#@',
  port: 5432,
};

const tablesToMigrate = [
  'users',
  'user_balances',
  'investment_plans',
  'user_investments',
  'transactions',
  'live_trade_plans',
  'user_live_trades',
  'hourly_live_trade_profits',
  'profit_distributions',
  'deposit_requests',
  'withdrawal_requests',
  'referrals'
];

async function testConnections() {
  console.log('🔍 Testing database connections...');
  
  // Test production connection
  const prodPool = new Pool(productionConfig);
  try {
    await prodPool.query('SELECT NOW()');
    console.log('✅ Production database connection successful');
  } catch (error) {
    console.error('❌ Production database connection failed:', error.message);
    return false;
  } finally {
    await prodPool.end();
  }
  
  // Test local connection
  const localPool = new Pool(localConfig);
  try {
    await localPool.query('SELECT NOW()');
    console.log('✅ Local database connection successful');
  } catch (error) {
    console.error('❌ Local database connection failed:', error.message);
    console.error('   Make sure PostgreSQL is running locally and credentials are correct');
    return false;
  } finally {
    await localPool.end();
  }
  
  return true;
}

async function getTableData(pool, tableName) {
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      console.log(`   ⚠️  Table ${tableName} does not exist in source database`);
      return { rows: [], rowCount: 0 };
    }
    
    // Get all data from table
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    return result;
  } catch (error) {
    console.error(`   ❌ Error reading ${tableName}:`, error.message);
    return { rows: [], rowCount: 0 };
  }
}

async function insertTableData(pool, tableName, data) {
  if (data.rows.length === 0) {
    console.log(`   📭 No data to insert for ${tableName}`);
    return 0;
  }
  
  try {
    // Clear existing data
    await pool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
    
    // Get column names from first row
    const columns = Object.keys(data.rows[0]);
    const columnList = columns.join(', ');
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    
    let insertedCount = 0;
    
    // Insert data row by row to handle any conflicts
    for (const row of data.rows) {
      try {
        const values = columns.map(col => row[col]);
        await pool.query(
          `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
          values
        );
        insertedCount++;
      } catch (error) {
        console.log(`   ⚠️  Skipped row in ${tableName}: ${error.message}`);
      }
    }
    
    console.log(`   ✅ Inserted ${insertedCount}/${data.rows.length} rows into ${tableName}`);
    return insertedCount;
  } catch (error) {
    console.error(`   ❌ Error inserting data into ${tableName}:`, error.message);
    return 0;
  }
}

async function migrateData() {
  console.log('🚀 Starting data migration from production to local...');
  
  const prodPool = new Pool(productionConfig);
  const localPool = new Pool(localConfig);
  
  let totalMigrated = 0;
  
  try {
    for (const tableName of tablesToMigrate) {
      console.log(`\n📋 Migrating ${tableName}...`);
      
      // Get data from production
      const data = await getTableData(prodPool, tableName);
      console.log(`   📊 Found ${data.rowCount} records in production`);
      
      // Insert data into local
      const inserted = await insertTableData(localPool, tableName, data);
      totalMigrated += inserted;
    }
    
    console.log(`\n🎉 Migration completed! Total records migrated: ${totalMigrated}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prodPool.end();
    await localPool.end();
  }
}

async function createTestAccounts() {
  console.log('\n👥 Creating additional test accounts...');
  
  const localPool = new Pool(localConfig);
  
  try {
    // Create test accounts with known passwords
    const testUsers = [
      {
        email: 'testuser1@example.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
        first_name: 'Test',
        last_name: 'User1',
        role: 'investor',
        referral_code: 'TEST001'
      },
      {
        email: 'testuser2@example.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
        first_name: 'Test',
        last_name: 'User2',
        role: 'investor',
        referral_code: 'TEST002'
      },
      {
        email: 'admin@test.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
        first_name: 'Admin',
        last_name: 'Test',
        role: 'admin',
        referral_code: 'ADMIN002'
      }
    ];
    
    for (const user of testUsers) {
      try {
        const userResult = await localPool.query(`
          INSERT INTO users (email, password, first_name, last_name, role, referral_code)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO UPDATE SET
            password = EXCLUDED.password,
            role = EXCLUDED.role
          RETURNING id
        `, [user.email, user.password, user.first_name, user.last_name, user.role, user.referral_code]);
        
        const userId = userResult.rows[0].id;
        
        // Create balance for user
        await localPool.query(`
          INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id) DO UPDATE SET
            total_balance = EXCLUDED.total_balance,
            card_balance = EXCLUDED.card_balance,
            credit_score_balance = EXCLUDED.credit_score_balance
        `, [userId, 1000.00, 0.00, 100]);
        
        console.log(`✅ Created test user: ${user.email}`);
      } catch (error) {
        console.log(`⚠️  Skipped ${user.email}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
  } finally {
    await localPool.end();
  }
}

async function showCredentials() {
  console.log('\n🔑 Test Account Credentials:');
  console.log('============================');
  console.log('');
  console.log('📧 Email: admin@credcrypto.com');
  console.log('🔒 Password: password');
  console.log('👤 Role: Admin');
  console.log('');
  console.log('📧 Email: investor@test.com');
  console.log('🔒 Password: password');
  console.log('👤 Role: Investor');
  console.log('');
  console.log('📧 Email: testuser1@example.com');
  console.log('🔒 Password: password');
  console.log('👤 Role: Investor');
  console.log('');
  console.log('📧 Email: testuser2@example.com');
  console.log('🔒 Password: password');
  console.log('👤 Role: Investor');
  console.log('');
  console.log('📧 Email: admin@test.com');
  console.log('🔒 Password: password');
  console.log('👤 Role: Admin');
  console.log('');
}

async function main() {
  console.log('🔄 Production to Local Migration Tool');
  console.log('=====================================');
  
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  
  if (command === 'test-connections') {
    const success = await testConnections();
    process.exit(success ? 0 : 1);
  }
  
  if (command === 'credentials') {
    await showCredentials();
    return;
  }
  
  // Test connections first
  const connectionsOk = await testConnections();
  if (!connectionsOk) {
    console.log('\n❌ Connection test failed. Please check your database configurations.');
    process.exit(1);
  }
  
  // Run migration
  await migrateData();
  
  // Create additional test accounts
  await createTestAccounts();
  
  // Show credentials
  await showCredentials();
  
  console.log('🎯 Next Steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Visit: http://localhost:3000');
  console.log('3. Login with any of the credentials above');
  console.log('4. Test the application with real production data!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
