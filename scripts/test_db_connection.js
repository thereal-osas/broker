// Test database connection and create profit_distributions table
// Run with: node scripts/test_db_connection.js

const { Pool } = require('pg');

// Test different password configurations
const configs = [
  {
    name: 'Environment Variable',
    config: {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'broker_platform',
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432'),
    }
  },
  {
    name: 'Default Password',
    config: {
      user: 'postgres',
      host: 'localhost',
      database: 'broker_platform',
      password: 'password',
      port: 5432,
    }
  },
  {
    name: 'Empty Password',
    config: {
      user: 'postgres',
      host: 'localhost',
      database: 'broker_platform',
      password: '',
      port: 5432,
    }
  },
  {
    name: 'Common Passwords',
    config: {
      user: 'postgres',
      host: 'localhost',
      database: 'broker_platform',
      password: 'postgres',
      port: 5432,
    }
  }
];

async function testConnection(configObj) {
  console.log(`\n🔍 Testing: ${configObj.name}`);
  console.log(`   User: ${configObj.config.user}`);
  console.log(`   Host: ${configObj.config.host}`);
  console.log(`   Database: ${configObj.config.database}`);
  console.log(`   Password: ${configObj.config.password ? '[SET]' : '[EMPTY]'}`);
  console.log(`   Port: ${configObj.config.port}`);

  const pool = new Pool(configObj.config);
  
  try {
    const client = await pool.connect();
    console.log(`   ✅ Connection successful!`);
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`   ✅ Query test successful: ${result.rows[0].current_time}`);
    
    client.release();
    await pool.end();
    
    return configObj.config;
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    await pool.end();
    return null;
  }
}

async function createProfitDistributionsTable(workingConfig) {
  console.log('\n🔧 Creating profit_distributions table with working config...');
  
  const pool = new Pool(workingConfig);
  
  try {
    // Check if table already exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'profit_distributions'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ profit_distributions table already exists');
      return true;
    }

    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Create table
    const createTableQuery = `
      CREATE TABLE profit_distributions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(15,2) NOT NULL,
          profit_amount DECIMAL(15,2) NOT NULL,
          distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ profit_distributions table created');

    // Create indexes
    const indexes = [
      'CREATE INDEX idx_profit_distributions_investment_id ON profit_distributions(investment_id)',
      'CREATE INDEX idx_profit_distributions_user_id ON profit_distributions(user_id)',
      'CREATE INDEX idx_profit_distributions_date ON profit_distributions(distribution_date)',
      'CREATE UNIQUE INDEX idx_profit_distributions_unique_daily ON profit_distributions(investment_id, DATE(distribution_date))'
    ];

    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    console.log('✅ Indexes created');

    // Verify table
    const verifyQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profit_distributions'
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(verifyQuery);
    console.log('✅ Table structure verified:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Database Connection and Table Creation Test\n');
  console.log('Environment variables:');
  console.log(`   DB_USER: ${process.env.DB_USER || '[NOT SET]'}`);
  console.log(`   DB_HOST: ${process.env.DB_HOST || '[NOT SET]'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || '[NOT SET]'}`);
  console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT || '[NOT SET]'}`);

  let workingConfig = null;

  // Test each configuration
  for (const config of configs) {
    const result = await testConnection(config);
    if (result) {
      workingConfig = result;
      break;
    }
  }

  if (workingConfig) {
    console.log('\n🎉 Found working database configuration!');
    
    // Create the profit_distributions table
    const tableCreated = await createProfitDistributionsTable(workingConfig);
    
    if (tableCreated) {
      console.log('\n✅ Setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Update your .env.local file with working credentials');
      console.log('   2. Restart your development server');
      console.log('   3. Test /admin/profit-distribution page');
      
      // Show the working config (without password)
      console.log('\n🔧 Working database configuration:');
      console.log(`   DB_USER=${workingConfig.user}`);
      console.log(`   DB_HOST=${workingConfig.host}`);
      console.log(`   DB_NAME=${workingConfig.database}`);
      console.log(`   DB_PASSWORD=${workingConfig.password}`);
      console.log(`   DB_PORT=${workingConfig.port}`);
    }
  } else {
    console.log('\n❌ No working database configuration found!');
    console.log('\n💡 Troubleshooting steps:');
    console.log('   1. Make sure PostgreSQL is running');
    console.log('   2. Check your database password');
    console.log('   3. Verify database name exists');
    console.log('   4. Check if user has proper permissions');
  }
}

main().catch(console.error);
