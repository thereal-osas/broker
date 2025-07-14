import { NextRequest, NextResponse } from 'next/server';

/**
 * Database Seeding API Endpoint
 * 
 * This endpoint allows safe seeding of the database with essential data.
 * Protected by environment variable check for security.
 */

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with special key
    const authHeader = request.headers.get('x-seed-key');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasValidKey = authHeader === process.env.SEED_KEY;
    
    if (!isDevelopment && !hasValidKey) {
      return NextResponse.json({
        error: 'Unauthorized - seed key required'
      }, { status: 401 });
    }

    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: 'DATABASE_URL not configured'
      }, { status: 500 });
    }

    console.log('🌱 Database seeding requested via API');
    
    // Import and run seeding
    const { runSeeding } = require('../../../../../scripts/seed-database');
    await runSeeding();
    
    return NextResponse.json({
      status: 'success',
      message: 'Database seeding completed successfully',
      timestamp: new Date().toISOString(),
      data: {
        admin_email: 'admin@credcrypto.com',
        admin_password: 'Admin123!@#',
        note: 'Please change the admin password after first login'
      }
    });
    
  } catch (error) {
    console.error('Database seeding failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Seeding failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Get seeding status
 */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        status: 'error',
        message: 'DATABASE_URL not configured'
      }, { status: 500 });
    }

    // Check if database has been seeded
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    try {
      // Check for admin user
      const adminCheck = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
      );
      
      // Check for investment plans
      const plansCheck = await client.query(
        'SELECT COUNT(*) as count FROM investment_plans'
      );
      
      // Check for system settings
      const settingsCheck = await client.query(
        'SELECT COUNT(*) as count FROM system_settings'
      );
      
      const hasAdmin = parseInt(adminCheck.rows[0].count) > 0;
      const hasPlans = parseInt(plansCheck.rows[0].count) > 0;
      const hasSettings = parseInt(settingsCheck.rows[0].count) > 0;
      
      const isSeeded = hasAdmin && hasPlans && hasSettings;
      
      return NextResponse.json({
        status: isSeeded ? 'seeded' : 'not_seeded',
        message: isSeeded ? 'Database has been seeded' : 'Database needs seeding',
        data: {
          admin_users: parseInt(adminCheck.rows[0].count),
          investment_plans: parseInt(plansCheck.rows[0].count),
          system_settings: parseInt(settingsCheck.rows[0].count),
          is_seeded: isSeeded
        },
        timestamp: new Date().toISOString()
      });
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Status check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
