import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SmartDistributionService } from "../../../../../../lib/smartDistributionService";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Run smart live trade profit distribution
    const result = await SmartDistributionService.runLiveTradeDistribution(
      session.user.email || "unknown"
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Live trade profit distribution error:", error);

    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error("Live trade profit distribution error details:", {
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
        "Smart distribution ready - will process eligible live trades only",
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
