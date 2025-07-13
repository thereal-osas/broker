import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { ProfitDistributionService } from "../../../../lib/profitDistribution";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Run daily profit distribution
    const result = await ProfitDistributionService.runDailyProfitDistribution();

    return NextResponse.json({
      message: "Profit distribution completed",
      result,
    });
  } catch (error) {
    console.error("Profit distribution error:", error);
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

    // Get active investments that need profit distribution
    const activeInvestments =
      await ProfitDistributionService.getActiveInvestments();

    return NextResponse.json({
      activeInvestments,
      count: activeInvestments.length,
    });
  } catch (error) {
    console.error("Error fetching active investments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
