import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LiveTradeProfitService } from "@/lib/liveTradeProfit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const liveTradeId = resolvedParams.id;

    if (!liveTradeId) {
      return NextResponse.json(
        { error: "Live trade ID is required" },
        { status: 400 }
      );
    }

    console.log(`Admin ${session.user.email} attempting to complete live trade ${liveTradeId}`);

    // Use the manual completion function
    const success = await LiveTradeProfitService.completeLiveTrade(liveTradeId);

    if (success) {
      console.log(`Live trade ${liveTradeId} completed successfully by admin ${session.user.email}`);
      
      return NextResponse.json({
        message: "Live trade completed successfully",
        liveTradeId,
        completedBy: session.user.email,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: "Failed to complete live trade. Check if trade exists and is active." },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error completing live trade:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
