import { NextResponse } from "next/server";
import { SmartDistributionService } from "@/lib/smartDistributionService";

/**
 * Cron endpoint for automated daily profit distribution
 * Called by Vercel Cron Jobs or external cron services
 * 
 * Security: Requires CRON_SECRET header for POST requests
 */

export async function POST(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET environment variable not set");
      return NextResponse.json(
        { error: "Cron job not configured" },
        { status: 500 }
      );
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== cronSecret) {
      return NextResponse.json(
        { error: "Invalid cron secret" },
        { status: 403 }
      );
    }

    console.log("🔄 Starting automated daily profit distribution...");

    // Run investment profit distribution
    const investmentResult =
      await SmartDistributionService.runInvestmentDistribution("cron-job");

    console.log("✅ Daily profit distribution completed", investmentResult);

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        investment: investmentResult,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for cron job
 */
export async function GET() {
  try {
    return NextResponse.json(
      {
        success: true,
        status: "healthy",
        message: "Cron endpoint is ready",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

