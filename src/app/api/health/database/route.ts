import { NextResponse } from 'next/server';

/**
 * Database Health Check API
 * 
 * This endpoint provides information about the database status
 * and can trigger migrations if needed.
 */

export async function GET() {
  try {
    // Import the health check function
    const { healthCheck } = require('../../../../../scripts/auto-migrate');
    
    const result = await healthCheck();
    
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'warning' ? 200 : 500;
    
    return NextResponse.json({
      status: result.status,
      message: result.message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database_configured: !!process.env.DATABASE_URL
    }, { status: statusCode });
    
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
 * Manual migration trigger (for emergency use)
 * Only works in development or with special header
 */
export async function POST(request: Request) {
  try {
    // Security check
    const authHeader = request.headers.get('x-migration-key');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasValidKey = authHeader === process.env.MIGRATION_KEY;
    
    if (!isDevelopment && !hasValidKey) {
      return NextResponse.json({
        error: 'Unauthorized - migration key required'
      }, { status: 401 });
    }
    
    // Import and run migration
    const { runAutomatedMigration } = require('../../../../../scripts/auto-migrate');
    
    console.log('🔧 Manual migration triggered via API');
    await runAutomatedMigration();
    
    return NextResponse.json({
      status: 'success',
      message: 'Migration completed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Manual migration failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Migration failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
