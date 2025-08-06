import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const query = `
      SELECT 
        ult.*,
        ltp.name as plan_name,
        ltp.hourly_profit_rate,
        ltp.duration_hours
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.user_id = $1
      ORDER BY ult.created_at DESC
    `;

    const result = await db.query(query, [session.user.id]);

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

    // Check if it's a table doesn't exist error
    if (error instanceof Error && error.message.includes("does not exist")) {
      return NextResponse.json(
        { error: "Live trade system not available. Please contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
