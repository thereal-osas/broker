import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all active investments with user details
    const result = await db.query(`
      SELECT 
        ui.id,
        ui.user_id,
        ui.amount,
        ui.daily_profit_rate,
        ui.duration_days,
        ui.start_date,
        ui.end_date,
        ui.status,
        ui.created_at,
        u.first_name,
        u.last_name,
        u.email,
        ip.name as plan_name,
        COALESCE(
          (SELECT COUNT(*) FROM profit_distributions pd 
           WHERE pd.user_id = ui.user_id 
           AND pd.investment_id = ui.id 
           AND pd.created_at >= ui.start_date),
          0
        ) as days_completed,
        CASE 
          WHEN ui.end_date <= NOW() THEN 'expired'
          WHEN ui.status = 'active' THEN 'active'
          ELSE ui.status
        END as current_status
      FROM user_investments ui
      JOIN users u ON ui.user_id = u.id
      LEFT JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.status = 'active'
      ORDER BY ui.created_at DESC
    `);

    const investments = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount),
      daily_profit_rate: parseFloat(row.daily_profit_rate),
      days_completed: parseInt(row.days_completed),
      duration_days: parseInt(row.duration_days)
    }));

    return NextResponse.json({
      investments,
      count: investments.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching investments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
