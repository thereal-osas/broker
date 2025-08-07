import { NextRequest, NextResponse } from "next/server";
import { LiveTradeProfitService } from "@/lib/liveTradeProfit";

export async function GET() {
  try {
    console.log("🕐 Automated hourly live trade profit distribution started...");
    
    // Run hourly profit distribution
    const result = await LiveTradeProfitService.runHourlyProfitDistribution();
    
    // Check and complete expired trades (with final hour profit distribution)
    const completedTrades = await LiveTradeProfitService.completeExpiredLiveTrades();
    
    console.log("✅ Automated live trade profit distribution completed:", {
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors,
      completed: result.completed,
      tradesCompleted: completedTrades
    });

    return NextResponse.json({
      success: true,
      message: "Automated live trade profit distribution completed",
      result: {
        ...result,
        tradesCompleted: completedTrades
      },
      timestamp: new Date().toISOString(),
      automated: true
    });

  } catch (error) {
    console.error("❌ Error in automated live trade profit distribution:", error);
    return NextResponse.json(
      { 
        error: "Automated profit distribution failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid cron secret" },
        { status: 401 }
      );
    }

    console.log("🕐 Scheduled live trade profit distribution started...");
    
    // Run hourly profit distribution
    const result = await LiveTradeProfitService.runHourlyProfitDistribution();
    
    // Check and complete expired trades (with final hour profit distribution)
    const completedTrades = await LiveTradeProfitService.completeExpiredLiveTrades();
    
    console.log("✅ Scheduled live trade profit distribution completed:", {
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors,
      completed: result.completed,
      tradesCompleted: completedTrades
    });

    return NextResponse.json({
      success: true,
      message: "Scheduled live trade profit distribution completed",
      result: {
        ...result,
        tradesCompleted: completedTrades
      },
      timestamp: new Date().toISOString(),
      scheduled: true
    });

  } catch (error) {
    console.error("❌ Error in scheduled live trade profit distribution:", error);
    return NextResponse.json(
      { 
        error: "Scheduled profit distribution failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
