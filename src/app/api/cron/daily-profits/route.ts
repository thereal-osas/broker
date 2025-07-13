import { NextRequest, NextResponse } from "next/server";
import { ProfitDistributionService } from "../../../../lib/profitDistribution";

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

    console.log('Running daily profit distribution cron job...');
    
    // Run daily profit distribution
    const result = await ProfitDistributionService.runDailyProfitDistribution();

    return NextResponse.json({
      success: true,
      message: "Daily profit distribution completed",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
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
    service: "daily-profits-cron",
    timestamp: new Date().toISOString(),
  });
}
