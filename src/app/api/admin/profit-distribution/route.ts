import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { ManualDistributionService } from "../../../../../lib/manualDistributionService";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Run manual investment profit distribution with cooldown check
    const result = await ManualDistributionService.runInvestmentDistribution(
      session.user.email || "unknown"
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error("Investment profit distribution error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        details: [error instanceof Error ? error.message : "Unknown error"],
        timestamp: new Date().toISOString(),
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

    // Get cooldown status for investment distribution
    const cooldownStatus =
      await ManualDistributionService.getInvestmentCooldownStatus();

    return NextResponse.json({
      cooldownStatus,
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
