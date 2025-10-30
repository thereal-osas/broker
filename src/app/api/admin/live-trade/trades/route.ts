import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LiveTradeStatusService } from "@/lib/liveTradeStatusService";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Update all live trade statuses first
    await LiveTradeStatusService.updateAllLiveTradeStatuses();

    // Get all live trades with enhanced status information
    const liveTrades =
      await LiveTradeStatusService.getAllLiveTradesWithStatus();

    // Get user information for each trade
    const tradesWithUserInfo = await Promise.all(
      liveTrades.map(async (trade) => {
        try {
          const userResult = await db.query(
            `SELECT first_name, last_name, email FROM users WHERE id = $1`,
            [trade.user_id]
          );

          const user = userResult.rows[0];

          return {
            ...trade,
            user_name: user
              ? `${user.first_name} ${user.last_name}`
              : "Unknown User",
            user_email: user?.email || "unknown@email.com",
          };
        } catch (error) {
          console.error(
            `Error fetching user info for trade ${trade.id}:`,
            error
          );
          return {
            ...trade,
            user_name: "Unknown User",
            user_email: "unknown@email.com",
          };
        }
      })
    );

    return NextResponse.json({
      trades: tradesWithUserInfo,
      count: tradesWithUserInfo.length,
      active_count: tradesWithUserInfo.filter((t) => t.status === "active")
        .length,
      completed_count: tradesWithUserInfo.filter(
        (t) => t.status === "completed"
      ).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching live trades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
