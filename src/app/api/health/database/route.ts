import { NextResponse } from 'next/server';

/**
 * Database Health Check API
 * 
 * This endpoint provides information about the database status
 * and can trigger migrations if needed.
 */

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        status: 'warning',
        message: 'DATABASE_URL not configured',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database_configured: false
      });
    }

    // Simple health check without migration system
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
      // Test basic connection
      await client.query('SELECT NOW()');

      // Check if critical tables exist
      const tablesCheck = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'investment_plans', 'user_investments')
      `);

      const hasRequiredTables = tablesCheck.rows.length >= 3;

      // Check if database has been seeded
      const adminCheck = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
      );
      const hasAdmin = parseInt(adminCheck.rows[0].count) > 0;

      const status = hasRequiredTables && hasAdmin ? 'healthy' : 'needs_seeding';
      const message = hasRequiredTables && hasAdmin ?
        'Database is ready' :
        'Database tables exist but need seeding';

      return NextResponse.json({
        status,
        message,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database_configured: true,
        tables_exist: hasRequiredTables,
        has_admin: hasAdmin
      });

    } finally {
      client.release();
      await pool.end();
    }

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database_configured: !!process.env.DATABASE_URL
    }, { status: 500 });
  }
}

/**
 * Manual seeding trigger (for emergency use)
 * Only works in development or with special header
 */
export async function POST(request: Request) {
  try {
    // Security check
    const authHeader = request.headers.get('x-seed-key');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasValidKey = authHeader === process.env.SEED_KEY;

    if (!isDevelopment && !hasValidKey) {
      return NextResponse.json({
        error: 'Unauthorized - seed key required'
      }, { status: 401 });
    }

    // Import and run seeding
    const { runSeeding } = require('../../../../../scripts/seed-database');

    console.log('🌱 Manual seeding triggered via API');
    await runSeeding();

    return NextResponse.json({
      status: 'success',
      message: 'Database seeding completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual seeding failed:', error);

    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Seeding failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
