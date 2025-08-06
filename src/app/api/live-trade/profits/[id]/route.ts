import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const liveTradeId = resolvedParams.id;

    if (!liveTradeId) {
      return NextResponse.json(
        { error: "Live trade ID is required" },
        { status: 400 }
      );
    }

    // Verify the live trade belongs to the user (or user is admin)
    const liveTradeCheck = await db.query(
      `SELECT user_id FROM user_live_trades WHERE id = $1`,
      [liveTradeId]
    );

    if (liveTradeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Live trade not found" },
        { status: 404 }
      );
    }

    const liveTrade = liveTradeCheck.rows[0];

    // Check if user owns this live trade or is admin
    if (liveTrade.user_id !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get hourly profit distributions for this live trade
    const profitsQuery = `
      SELECT 
        id,
        profit_amount,
        profit_hour,
        created_at
      FROM hourly_live_trade_profits 
      WHERE live_trade_id = $1 
      ORDER BY profit_hour ASC
    `;

    const profitsResult = await db.query(profitsQuery, [liveTradeId]);

    // Get live trade details for additional context
    const tradeDetailsQuery = `
      SELECT 
        ult.*,
        ltp.name as plan_name,
        ltp.hourly_profit_rate,
        ltp.duration_hours
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.id = $1
    `;

    const tradeDetailsResult = await db.query(tradeDetailsQuery, [liveTradeId]);
    const tradeDetails = tradeDetailsResult.rows[0];

    // Calculate expected vs actual profits
    const expectedHourlyProfit = tradeDetails.amount * tradeDetails.hourly_profit_rate;
    const totalExpectedProfit = expectedHourlyProfit * tradeDetails.duration_hours;

    // Calculate progress statistics
    const startTime = new Date(tradeDetails.start_time);
    const currentTime = new Date();
    const elapsedHours = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
    const expectedProfitDistributions = Math.min(elapsedHours, tradeDetails.duration_hours);

    const summary = {
      totalDistributions: profitsResult.rows.length,
      expectedDistributions: expectedProfitDistributions,
      totalProfitEarned: tradeDetails.total_profit,
      expectedTotalProfit: totalExpectedProfit,
      averageProfitPerHour: profitsResult.rows.length > 0 ? 
        profitsResult.rows.reduce((sum, p) => sum + parseFloat(p.profit_amount), 0) / profitsResult.rows.length : 0,
      expectedProfitPerHour: expectedHourlyProfit,
      progressPercentage: tradeDetails.duration_hours > 0 ? 
        (elapsedHours / tradeDetails.duration_hours) * 100 : 0,
      profitProgressPercentage: totalExpectedProfit > 0 ? 
        (tradeDetails.total_profit / totalExpectedProfit) * 100 : 0
    };

    return NextResponse.json({
      liveTradeId,
      tradeDetails: {
        id: tradeDetails.id,
        planName: tradeDetails.plan_name,
        amount: tradeDetails.amount,
        status: tradeDetails.status,
        startTime: tradeDetails.start_time,
        endTime: tradeDetails.end_time,
        durationHours: tradeDetails.duration_hours,
        hourlyProfitRate: tradeDetails.hourly_profit_rate,
        totalProfit: tradeDetails.total_profit
      },
      profits: profitsResult.rows.map(profit => ({
        id: profit.id,
        amount: parseFloat(profit.profit_amount),
        profitHour: profit.profit_hour,
        createdAt: profit.created_at,
        formattedHour: new Date(profit.profit_hour).toLocaleString()
      })),
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching live trade profits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
