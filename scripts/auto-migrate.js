#!/usr/bin/env node

/**
 * Automated Database Migration Runner for Vercel Deployment
 * 
 * This script runs automatically during Vercel deployment to ensure
 * the database is properly set up before the application starts.
 * 
 * Features:
 * - Runs during build process
 * - Idempotent (safe to run multiple times)
 * - Works with any PostgreSQL database
 * - Handles connection issues gracefully
 * - Logs all operations for debugging
 * - Optimized for serverless environment
 */

const { MigrationSystem } = require('../lib/migrations');
const { getMigrationDefinitions } = require('../lib/migration-definitions');

async function runAutomatedMigration() {
  const startTime = Date.now();
  console.log('🚀 Starting automated database migration...');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  
  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not found - skipping migration');
    console.log('   This is normal for preview deployments or local development');
    console.log('   Set DATABASE_URL in Vercel environment variables for production');
    return;
  }

  // Log database host (without credentials)
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    console.log('🔗 Database host:', dbUrl.hostname);
    console.log('🔌 Database port:', dbUrl.port || '5432');
  } catch (error) {
    console.log('🔗 Database URL format appears invalid');
  }

  const migrationSystem = new MigrationSystem();
  
  try {
    // Initialize connection
    console.log('🔌 Initializing database connection...');
    await migrationSystem.initialize();
    
    // Load and add all migrations
    console.log('📋 Loading migration definitions...');
    const migrations = getMigrationDefinitions();
    
    for (const migration of migrations) {
      migrationSystem.addMigration(
        migration.name,
        migration.sql,
        migration.checkFunction
      );
    }
    
    // Run migrations
    await migrationSystem.runMigrations();
    
    // Create default data
    console.log('👤 Setting up default admin user...');
    await migrationSystem.createDefaultAdmin();
    
    console.log('💼 Setting up default investment plans...');
    await migrationSystem.createDefaultPlans();
    
    // Verify setup
    await migrationSystem.verifySetup();
    
    const duration = Date.now() - startTime;
    console.log(`🎉 Migration completed successfully in ${duration}ms`);
    console.log('✅ Database is ready for application startup');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('🔧 Network connectivity issue:');
      console.error('   - Check if your database service is running');
      console.error('   - Verify the DATABASE_URL is correct');
      console.error('   - Ensure firewall allows connections');

      // Special handling for Railway internal URLs
      if (error.message.includes('.railway.internal')) {
        console.error('');
        console.error('🚨 RAILWAY USERS: You are using an internal Railway URL!');
        console.error('   Internal URLs (*.railway.internal) only work within Railway network.');
        console.error('   For external services like Vercel, you need the PUBLIC Railway URL.');
        console.error('');
        console.error('📋 To fix this:');
        console.error('   1. Go to Railway dashboard → PostgreSQL service → Variables');
        console.error('   2. Look for PGHOST with format: containers-us-west-xxx.railway.app');
        console.error('   3. Use that hostname in your DATABASE_URL');
        console.error('   4. Update DATABASE_URL in Vercel environment variables');
        console.error('');
        console.error('   Example correct URL:');
        console.error('   postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway');
      }
    } else if (error.message.includes('authentication') || error.message.includes('password')) {
      console.error('🔧 Authentication issue:');
      console.error('   - Verify database credentials in DATABASE_URL');
      console.error('   - Check if password contains special characters that need encoding');
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      console.error('🔧 Permission issue:');
      console.error('   - Ensure database user has CREATE/ALTER privileges');
      console.error('   - Check if database allows schema modifications');
    }
    
    // In production, we might want to continue deployment even if migration fails
    // This allows manual intervention while keeping the app available
    if (process.env.NODE_ENV === 'production' && process.env.MIGRATION_FAIL_STRATEGY === 'continue') {
      console.log('⚠️  Continuing deployment despite migration failure (MIGRATION_FAIL_STRATEGY=continue)');
      console.log('   Manual database setup may be required');
    } else {
      // Exit with error code to fail the build
      process.exit(1);
    }
    
  } finally {
    // Always close connections
    await migrationSystem.close();
  }
}

// Health check function for API routes
async function healthCheck() {
  if (!process.env.DATABASE_URL) {
    return { status: 'warning', message: 'DATABASE_URL not configured' };
  }

  const migrationSystem = new MigrationSystem();
  
  try {
    await migrationSystem.initialize();
    
    // Quick health check
    const hasUsers = await migrationSystem.tableExists('users');
    const hasPlans = await migrationSystem.tableExists('investment_plans');
    
    await migrationSystem.close();
    
    if (hasUsers && hasPlans) {
      return { status: 'healthy', message: 'Database is ready' };
    } else {
      return { status: 'error', message: 'Database schema incomplete' };
    }
    
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Export for use in API routes
module.exports = { runAutomatedMigration, healthCheck };

// Run migration if called directly
if (require.main === module) {
  runAutomatedMigration()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}
