/**
 * Automated Database Migration System for Vercel Deployment
 * 
 * This module handles automatic database migrations during deployment.
 * It's designed to work with any PostgreSQL database (Railway, Supabase, AWS RDS, etc.)
 * and runs seamlessly in Vercel's serverless environment.
 */

const { Pool } = require('pg');

class MigrationSystem {
  constructor() {
    this.pool = null;
    this.migrations = [];
    this.retryAttempts = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Initialize the database connection
   */
  async initialize() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 3, // Limit connections for serverless
    });

    // Test connection with retry logic
    await this.testConnection();
  }

  /**
   * Test database connection with retry logic
   */
  async testConnection() {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection established');
        return;
      } catch (error) {
        console.log(`❌ Connection attempt ${attempt}/${this.retryAttempts} failed:`, error.message);
        
        if (attempt === this.retryAttempts) {
          throw new Error(`Failed to connect to database after ${this.retryAttempts} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  /**
   * Add a migration to the system
   */
  addMigration(name, sql, checkFunction = null) {
    this.migrations.push({
      name,
      sql,
      checkFunction
    });
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      return result.rows[0].exists;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a column exists in a table
   */
  async columnExists(tableName, columnName) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = $2
        )
      `, [tableName, columnName]);
      return result.rows[0].exists;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration) {
    const client = await this.pool.connect();
    
    try {
      console.log(`📄 Running migration: ${migration.name}`);
      
      // Check if migration should be skipped
      if (migration.checkFunction) {
        const shouldSkip = await migration.checkFunction.call(this);
        if (shouldSkip) {
          console.log(`⏭️  Skipping migration: ${migration.name} (already applied)`);
          return;
        }
      }

      // Execute the migration SQL
      await client.query(migration.sql);
      console.log(`✅ Migration completed: ${migration.name}`);
      
    } catch (error) {
      // Handle common "already exists" errors gracefully
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate key') ||
          error.message.includes('relation') && error.message.includes('already exists')) {
        console.log(`⏭️  Skipping migration: ${migration.name} (already exists)`);
        return;
      }
      
      console.error(`❌ Migration failed: ${migration.name}`);
      console.error('Error:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all migrations
   */
  async runMigrations() {
    console.log('🚀 Starting database migrations...');
    console.log(`📊 Total migrations to process: ${this.migrations.length}`);
    
    for (const migration of this.migrations) {
      await this.executeMigration(migration);
    }
    
    console.log('🎉 All migrations completed successfully');
  }

  /**
   * Create default admin user if none exists
   */
  async createDefaultAdmin() {
    const client = await this.pool.connect();
    
    try {
      // Check if admin user exists
      const adminCheck = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
      );
      
      if (parseInt(adminCheck.rows[0].count) > 0) {
        console.log('👤 Admin user already exists');
        return;
      }

      console.log('👤 Creating default admin user...');
      
      // Import bcryptjs dynamically to handle serverless environment
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'admin@credcrypto.com',
        hashedPassword,
        'Admin',
        'User',
        'admin',
        true,
        true
      ]);
      
      console.log('✅ Default admin user created');
      console.log('   Email: admin@credcrypto.com');
      console.log('   Password: admin123');
      console.log('   ⚠️  Change this password after first login!');
      
    } finally {
      client.release();
    }
  }

  /**
   * Create default investment plans if none exist
   */
  async createDefaultPlans() {
    const client = await this.pool.connect();
    
    try {
      // Check if plans exist
      const plansCheck = await client.query('SELECT COUNT(*) as count FROM investment_plans');
      
      if (parseInt(plansCheck.rows[0].count) > 0) {
        console.log('💼 Investment plans already exist');
        return;
      }

      console.log('💼 Creating default investment plans...');
      
      const plans = [
        {
          name: 'Starter Plan',
          description: 'Perfect for beginners looking to start their investment journey',
          min_amount: 100,
          max_amount: 999,
          daily_profit_rate: 0.025, // 2.5%
          duration_days: 30
        },
        {
          name: 'Professional Plan',
          description: 'Ideal for experienced investors seeking higher returns',
          min_amount: 1000,
          max_amount: 4999,
          daily_profit_rate: 0.035, // 3.5%
          duration_days: 45
        },
        {
          name: 'Premium Plan',
          description: 'Exclusive plan for high-value investors',
          min_amount: 5000,
          max_amount: null,
          daily_profit_rate: 0.045, // 4.5%
          duration_days: 60
        }
      ];
      
      for (const plan of plans) {
        await client.query(`
          INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          plan.name,
          plan.description,
          plan.min_amount,
          plan.max_amount,
          plan.daily_profit_rate,
          plan.duration_days,
          true
        ]);
      }
      
      console.log('✅ Default investment plans created');
      
    } finally {
      client.release();
    }
  }

  /**
   * Verify database setup
   */
  async verifySetup() {
    const client = await this.pool.connect();
    
    try {
      console.log('🔍 Verifying database setup...');
      
      // Check critical tables
      const criticalTables = ['users', 'user_balances', 'investment_plans', 'user_investments'];
      
      for (const table of criticalTables) {
        const exists = await this.tableExists(table);
        if (!exists) {
          throw new Error(`Critical table missing: ${table}`);
        }
      }
      
      // Get table counts
      const stats = await Promise.all([
        client.query('SELECT COUNT(*) as count FROM users'),
        client.query('SELECT COUNT(*) as count FROM investment_plans'),
        client.query('SELECT COUNT(*) as count FROM user_investments'),
      ]);
      
      console.log('📊 Database statistics:');
      console.log(`   Users: ${stats[0].rows[0].count}`);
      console.log(`   Investment Plans: ${stats[1].rows[0].count}`);
      console.log(`   Active Investments: ${stats[2].rows[0].count}`);
      
      console.log('✅ Database verification completed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Close database connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connections closed');
    }
  }
}

module.exports = { MigrationSystem };
