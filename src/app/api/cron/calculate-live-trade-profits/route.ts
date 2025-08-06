import { NextRequest, NextResponse } from "next/server";
import { LiveTradeProfitService } from "@/lib/liveTradeProfit";

export async function GET() {
  try {
    console.log("Starting live trade profit calculation...");

    // Run hourly profit distribution
    const result = await LiveTradeProfitService.runHourlyProfitDistribution();

    // Get summary statistics
    const summary = await LiveTradeProfitService.getLiveTradeProfitSummary();

    return NextResponse.json({
      message: "Live trade profit calculation completed",
      stats: {
        profitsProcessed: result.processed,
        profitsSkipped: result.skipped,
        errors: result.errors,
        tradesCompleted: result.completed,
        timestamp: new Date().toISOString(),
      },
      summary,
    });
  } catch (error) {
    console.error("Live trade profit calculation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source (in production, use proper authentication)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret-change-in-production';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log('Running live trade profit distribution cron job...');
    
    // Run hourly profit distribution
    const result = await LiveTradeProfitService.runHourlyProfitDistribution();

    // Get summary statistics
    const summary = await LiveTradeProfitService.getLiveTradeProfitSummary();

    return NextResponse.json({
      success: true,
      message: "Live trade profit distribution completed",
      result,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Live trade profit distribution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
