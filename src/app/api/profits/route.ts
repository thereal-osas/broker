import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { ProfitDistributionService } from "../../../lib/profitDistribution";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's profit history
    const profitHistory = await ProfitDistributionService.getUserProfitHistory(
      session.user.id
    );
    const totalProfits = await ProfitDistributionService.getUserTotalProfits(
      session.user.id
    );

    return NextResponse.json({
      profitHistory,
      totalProfits,
    });
  } catch (error) {
    console.error("Error fetching profit history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
