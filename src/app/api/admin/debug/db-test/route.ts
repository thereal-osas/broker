import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time');
    
    // Test transactions table
    const transTest = await db.query('SELECT COUNT(*) as count FROM transactions');
    
    // Test user_balances table
    const balanceTest = await db.query('SELECT COUNT(*) as count FROM user_balances');
    
    // Test users table
    const usersTest = await db.query('SELECT COUNT(*) as count FROM users');
    
    // Check for users without balance records
    const missingBalances = await db.query(`
      SELECT COUNT(*) as count
      FROM users u 
      LEFT JOIN user_balances ub ON u.id = ub.user_id 
      WHERE ub.user_id IS NULL
    `);
    
    // Check transaction constraint
    const constraintCheck = await db.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'transactions'::regclass 
      AND contype = 'c'
      AND conname LIKE '%type%'
    `);
    
    return NextResponse.json({
      status: 'success',
      timestamp: result.rows[0].current_time,
      database: {
        connected: true,
        url_set: !!process.env.DATABASE_URL,
        url_preview: process.env.DATABASE_URL 
          ? `${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}` 
          : 'NOT SET'
      },
      tables: {
        users: parseInt(usersTest.rows[0].count),
        transactions: parseInt(transTest.rows[0].count),
        user_balances: parseInt(balanceTest.rows[0].count),
        users_without_balance: parseInt(missingBalances.rows[0].count)
      },
      constraints: constraintCheck.rows.map(row => ({
        name: row.conname,
        definition: row.definition
      })),
      environment: {
        node_env: process.env.NODE_ENV,
        nextauth_url: process.env.NEXTAUTH_URL || 'NOT SET',
        nextauth_secret_set: !!process.env.NEXTAUTH_SECRET
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      database_url_set: !!process.env.DATABASE_URL,
      environment: {
        node_env: process.env.NODE_ENV,
        nextauth_url: process.env.NEXTAUTH_URL || 'NOT SET',
        nextauth_secret_set: !!process.env.NEXTAUTH_SECRET
      }
    }, { status: 500 });
  }
}

