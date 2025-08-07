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
      `Admin ${session.user.email} initiated live trade profit distribution...`
    );

    // Run hourly profit distribution
    const result = await LiveTradeProfitService.runHourlyProfitDistribution();

    // Get summary statistics
    const summary = await LiveTradeProfitService.getLiveTradeProfitSummary();

    console.log(
      `Live trade profit distribution completed by admin ${session.user.email}:`,
      {
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        completed: result.completed,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Live trade profit distribution completed",
        result,
        summary,
        timestamp: new Date().toISOString(),
        // Add cache-busting headers to ensure fresh data
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Admin live trade profit distribution error:", error);
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

    // Get live trade profit summary for admin dashboard
    const summary = await LiveTradeProfitService.getLiveTradeProfitSummary();

    // Get active live trades
    const activeLiveTrades = await LiveTradeProfitService.getActiveLiveTrades();

    return NextResponse.json({
      summary,
      activeLiveTrades,
      count: activeLiveTrades.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching live trade profit data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
