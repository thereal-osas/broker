import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const query = `
      SELECT 
        ult.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        ltp.name as plan_name,
        ltp.hourly_profit_rate,
        ltp.duration_hours
      FROM user_live_trades ult
      JOIN users u ON ult.user_id = u.id
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      ORDER BY ult.created_at DESC
    `;

    const result = await db.query(query);

    // Ensure numeric fields are properly converted
    const processedRows = result.rows.map((row) => ({
      ...row,
      amount: parseFloat(row.amount || 0),
      total_profit: parseFloat(row.total_profit || 0),
      hourly_profit_rate: parseFloat(row.hourly_profit_rate || 0),
      duration_hours: parseInt(row.duration_hours || 0),
    }));

    return NextResponse.json(processedRows);
  } catch (error) {
    console.error("Error fetching user live trades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
