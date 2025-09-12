import { NextRequest, NextResponse } from "next/server";
import { ProfitDistributionService } from "../../../../lib/profitDistribution";
import { LiveTradeProfitService } from "../../../../lib/liveTradeProfit";

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source (in production, use proper authentication)
    const authHeader = request.headers.get("authorization");
    const cronSecret =
      process.env.CRON_SECRET || "default-secret-change-in-production";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Running combined profit distribution cron job...");

    // 1. Run live trade profit distribution (hourly)
    console.log("Processing live trade profits...");
    const liveTradeResult =
      await LiveTradeProfitService.runHourlyProfitDistribution();

    // 2. Run regular investment profit distribution (daily)
    console.log("Processing regular investment profits...");
    const investmentResult =
      await ProfitDistributionService.runDailyProfitDistribution();

    return NextResponse.json({
      success: true,
      message: "Combined profit distribution completed",
      results: {
        liveTrades: {
          processed: liveTradeResult.processed,
          skipped: liveTradeResult.skipped,
          errors: liveTradeResult.errors,
          completed: liveTradeResult.completed,
        },
        investments: {
          processed: investmentResult.processed,
          skipped: investmentResult.skipped,
          errors: investmentResult.errors,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Combined cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for health checks
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "combined-profits-cron",
    description: "Handles both live trade and investment profit distribution",
    timestamp: new Date().toISOString(),
  });
}
