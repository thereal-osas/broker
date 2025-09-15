import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { SmartDistributionService } from "../../../../../lib/smartDistributionService";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Run smart investment profit distribution
    const result = await SmartDistributionService.runInvestmentDistribution(
      session.user.email || "unknown"
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error("Investment profit distribution error:", error);

    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error("Profit distribution error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        adminEmail: session.user.email,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        details: [
          error instanceof Error ? error.message : "Unknown error",
          "Check server logs for detailed error information",
        ],
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.name : "UnknownError",
      },
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

    // Return ready status - no cooldowns in smart distribution
    return NextResponse.json({
      success: true,
      ready: true,
      message:
        "Smart distribution ready - will process eligible investments only",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching investment distribution status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
