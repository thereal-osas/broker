#!/usr/bin/env node

/**
 * Database Seeding Script
 *
 * This script populates empty database tables with essential data
 * including admin users, investment plans, and system settings.
 *
 * Safe to run multiple times - checks for existing data before inserting.
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class DatabaseSeeder {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 3,
    });

    // Test connection
    const client = await this.pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection established');
  }

  async seedAdminUser() {
    const client = await this.pool.connect();
    
    try {
      console.log('👤 Seeding admin user...');
      
      // Check if admin user already exists
      const existingAdmin = await client.query(
        "SELECT id, email FROM users WHERE role = 'admin' LIMIT 1"
      );
      
      if (existingAdmin.rows.length > 0) {
        console.log('✅ Admin user already exists:', existingAdmin.rows[0].email);
        return existingAdmin.rows[0];
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash('Admin123!@#', 12);
      
      const adminResult = await client.query(`
        INSERT INTO users (
          email, password, first_name, last_name, role, 
          is_active, email_verified, referral_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email
      `, [
        'admin@credcrypto.com',
        hashedPassword,
        'System',
        'Administrator',
        'admin',
        true,
        true,
        'ADMIN001'
      ]);

      const adminUser = adminResult.rows[0];
      
      // Create admin user balance
      await client.query(`
        INSERT INTO user_balances (
          user_id, total_balance, profit_balance, deposit_balance, 
          bonus_balance, credit_score_balance
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [adminUser.id, 0.00, 0.00, 0.00, 0.00, 0.00]);

      console.log('✅ Admin user created successfully');
      console.log('   Email: admin@credcrypto.com');
      console.log('   Password: Admin123!@#');
      console.log('   ⚠️  IMPORTANT: Change this password after first login!');
      
      return adminUser;
      
    } finally {
      client.release();
    }
  }

  async seedInvestmentPlans() {
    const client = await this.pool.connect();
    
    try {
      console.log('💼 Seeding investment plans...');
      
      // Check if plans already exist
      const existingPlans = await client.query('SELECT COUNT(*) as count FROM investment_plans');
      
      if (parseInt(existingPlans.rows[0].count) > 0) {
        console.log('✅ Investment plans already exist');
        return;
      }

      const plans = [
        {
          name: 'Starter Plan',
          description: 'Perfect for beginners looking to start their investment journey with low risk and steady returns.',
          min_amount: 100.00,
          max_amount: 999.99,
          daily_profit_rate: 0.025, // 2.5% daily
          duration_days: 30,
          is_active: true
        },
        {
          name: 'Professional Plan',
          description: 'Ideal for experienced investors seeking higher returns with moderate risk exposure.',
          min_amount: 1000.00,
          max_amount: 4999.99,
          daily_profit_rate: 0.035, // 3.5% daily
          duration_days: 45,
          is_active: true
        },
        {
          name: 'Premium Plan',
          description: 'Exclusive plan for high-value investors with maximum returns and premium support.',
          min_amount: 5000.00,
          max_amount: null, // No maximum
          daily_profit_rate: 0.045, // 4.5% daily
          duration_days: 60,
          is_active: true
        },
        {
          name: 'VIP Plan',
          description: 'Ultra-premium plan for institutional investors with the highest profit potential.',
          min_amount: 25000.00,
          max_amount: null,
          daily_profit_rate: 0.055, // 5.5% daily
          duration_days: 90,
          is_active: true
        }
      ];

      for (const plan of plans) {
        await client.query(`
          INSERT INTO investment_plans (
            name, description, min_amount, max_amount, 
            daily_profit_rate, duration_days, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          plan.name,
          plan.description,
          plan.min_amount,
          plan.max_amount,
          plan.daily_profit_rate,
          plan.duration_days,
          plan.is_active
        ]);
      }

      console.log('✅ Investment plans created successfully');
      console.log(`   Created ${plans.length} investment plans`);
      
    } finally {
      client.release();
    }
  }

  async seedSystemSettings() {
    const client = await this.pool.connect();
    
    try {
      console.log('⚙️  Seeding system settings...');
      
      // Check if settings already exist
      const existingSettings = await client.query('SELECT COUNT(*) as count FROM system_settings');
      
      if (parseInt(existingSettings.rows[0].count) > 0) {
        console.log('✅ System settings already exist');
        return;
      }

      const settings = [
        {
          key: 'app_name',
          value: 'CredCrypto',
          description: 'Application name displayed to users'
        },
        {
          key: 'app_version',
          value: '1.0.0',
          description: 'Current application version'
        },
        {
          key: 'maintenance_mode',
          value: 'false',
          description: 'Enable/disable maintenance mode'
        },
        {
          key: 'registration_enabled',
          value: 'true',
          description: 'Allow new user registrations'
        },
        {
          key: 'min_withdrawal_amount',
          value: '50.00',
          description: 'Minimum withdrawal amount in USD'
        },
        {
          key: 'max_withdrawal_amount',
          value: '10000.00',
          description: 'Maximum withdrawal amount in USD per request'
        },
        {
          key: 'referral_commission_rate',
          value: '0.05',
          description: 'Default referral commission rate (5%)'
        },
        {
          key: 'support_email',
          value: 'support@credcrypto.com',
          description: 'Support contact email'
        },
        {
          key: 'company_address',
          value: 'CredCrypto Investment Platform',
          description: 'Company address for legal documents'
        },
        {
          key: 'terms_version',
          value: '1.0',
          description: 'Current terms and conditions version'
        }
      ];

      for (const setting of settings) {
        await client.query(`
          INSERT INTO system_settings (key, value, description)
          VALUES ($1, $2, $3)
        `, [setting.key, setting.value, setting.description]);
      }

      console.log('✅ System settings created successfully');
      console.log(`   Created ${settings.length} system settings`);
      
    } finally {
      client.release();
    }
  }

  async createSampleData() {
    const client = await this.pool.connect();
    
    try {
      console.log('📝 Creating sample newsletter...');
      
      // Check if newsletter already exists
      const existingNewsletter = await client.query('SELECT COUNT(*) as count FROM newsletters');
      
      if (parseInt(existingNewsletter.rows[0].count) > 0) {
        console.log('✅ Sample newsletter already exists');
        return;
      }

      // Get admin user
      const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      
      if (adminResult.rows.length === 0) {
        console.log('⚠️  No admin user found, skipping sample newsletter');
        return;
      }

      const adminId = adminResult.rows[0].id;

      // Create welcome newsletter
      await client.query(`
        INSERT INTO newsletters (
          title, content, author_id, is_published, published_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        'Welcome to CredCrypto Investment Platform',
        `
        <h2>Welcome to CredCrypto!</h2>
        <p>We're excited to have you join our investment platform. Here's what you can expect:</p>
        
        <h3>🚀 Getting Started</h3>
        <ul>
          <li>Complete your profile setup</li>
          <li>Choose from our range of investment plans</li>
          <li>Start earning daily profits on your investments</li>
        </ul>
        
        <h3>💼 Investment Plans</h3>
        <p>We offer multiple investment plans to suit different risk appetites and investment goals:</p>
        <ul>
          <li><strong>Starter Plan:</strong> 2.5% daily returns for 30 days</li>
          <li><strong>Professional Plan:</strong> 3.5% daily returns for 45 days</li>
          <li><strong>Premium Plan:</strong> 4.5% daily returns for 60 days</li>
          <li><strong>VIP Plan:</strong> 5.5% daily returns for 90 days</li>
        </ul>
        
        <h3>🔒 Security</h3>
        <p>Your security is our priority. We use industry-standard encryption and security measures to protect your investments and personal information.</p>
        
        <h3>📞 Support</h3>
        <p>Our support team is available 24/7 to assist you. Contact us at support@credcrypto.com for any questions or concerns.</p>
        
        <p>Happy investing!</p>
        <p><strong>The CredCrypto Team</strong></p>
        `,
        adminId,
        true,
        new Date()
      ]);

      console.log('✅ Sample newsletter created successfully');
      
    } finally {
      client.release();
    }
  }

  async verifySeeding() {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🔍 Verifying seeded data...');
      
      // Check users
      const usersResult = await client.query('SELECT COUNT(*) as count, role FROM users GROUP BY role');
      console.log('👥 Users:');
      usersResult.rows.forEach(row => {
        console.log(`   ${row.role}: ${row.count}`);
      });
      
      // Check investment plans
      const plansResult = await client.query('SELECT COUNT(*) as count FROM investment_plans WHERE is_active = true');
      console.log(`💼 Active Investment Plans: ${plansResult.rows[0].count}`);
      
      // Check system settings
      const settingsResult = await client.query('SELECT COUNT(*) as count FROM system_settings');
      console.log(`⚙️  System Settings: ${settingsResult.rows[0].count}`);
      
      // Check newsletters
      const newslettersResult = await client.query('SELECT COUNT(*) as count FROM newsletters');
      console.log(`📰 Newsletters: ${newslettersResult.rows[0].count}`);
      
      console.log('\n✅ Database seeding verification completed');
      
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connections closed');
    }
  }
}

async function runSeeding() {
  const startTime = Date.now();
  console.log('🌱 Starting database seeding...');
  console.log('📅 Timestamp:', new Date().toISOString());
  
  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.initialize();
    
    // Run seeding operations
    await seeder.seedAdminUser();
    await seeder.seedInvestmentPlans();
    await seeder.seedSystemSettings();
    await seeder.createSampleData();
    
    // Verify results
    await seeder.verifySeeding();
    
    const duration = Date.now() - startTime;
    console.log(`\n🎉 Database seeding completed successfully in ${duration}ms`);
    console.log('✅ Your database is ready for production use!');
    
    console.log('\n📝 Important Notes:');
    console.log('- Admin login: admin@credcrypto.com / Admin123!@#');
    console.log('- Change the admin password immediately after first login');
    console.log('- Review and customize investment plans as needed');
    console.log('- Update system settings through the admin panel');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  } finally {
    await seeder.close();
  }
}

// Export for use in other scripts
module.exports = { DatabaseSeeder, runSeeding };

// Run seeding if called directly
if (require.main === module) {
  runSeeding()
    .then(() => {
      console.log('🏁 Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding script failed:', error);
      process.exit(1);
    });
}
