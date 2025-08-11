import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LiveTradeProfitService } from "@/lib/liveTradeProfit";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.log(
      `Admin ${session.user.email} initiated force completion of all expired live trades...`
    );

    // Force complete all expired live trades
    const completed = await LiveTradeProfitService.completeExpiredLiveTrades();

    console.log(
      `Force completion completed by admin ${session.user.email}: ${completed} trades completed`
    );

    return NextResponse.json({
      success: true,
      message: `Force completion completed: ${completed} trades completed`,
      completedCount: completed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin force completion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all active live trades with expiry status
    const allActiveTrades =
      await LiveTradeProfitService.getAllActiveLiveTrades();

    // Separate expired from active (with type safety)
    const expiredTrades = allActiveTrades.filter(
      (trade) => trade.is_expired === true
    );
    const activeTrades = allActiveTrades.filter(
      (trade) => trade.is_expired !== true
    );

    return NextResponse.json({
      summary: {
        totalActiveTrades: allActiveTrades.length,
        expiredTrades: expiredTrades.length,
        stillActiveTrades: activeTrades.length,
      },
      expiredTrades: expiredTrades.map((trade) => ({
        id: trade.id,
        userId: trade.user_id,
        amount: trade.amount,
        startTime: trade.start_time,
        durationHours: trade.duration_hours,
        hoursElapsed: trade.hours_elapsed
          ? parseFloat(trade.hours_elapsed.toString()).toFixed(2)
          : "0.00",
        hoursOverdue: trade.hours_elapsed
          ? (
              parseFloat(trade.hours_elapsed.toString()) - trade.duration_hours
            ).toFixed(2)
          : "0.00",
      })),
      activeTrades: activeTrades.map((trade) => ({
        id: trade.id,
        userId: trade.user_id,
        amount: trade.amount,
        startTime: trade.start_time,
        durationHours: trade.duration_hours,
        hoursElapsed: trade.hours_elapsed
          ? parseFloat(trade.hours_elapsed.toString()).toFixed(2)
          : "0.00",
        hoursRemaining: trade.hours_elapsed
          ? (
              trade.duration_hours - parseFloat(trade.hours_elapsed.toString())
            ).toFixed(2)
          : trade.duration_hours.toFixed(2),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching live trade completion data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
