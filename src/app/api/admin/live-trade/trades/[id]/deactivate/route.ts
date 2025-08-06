import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const liveTradeId = resolvedParams.id;

    if (!liveTradeId) {
      return NextResponse.json(
        { error: "Live trade ID is required" },
        { status: 400 }
      );
    }

    // Check if live trade exists and is active
    const liveTradeCheck = await db.query(
      "SELECT id, user_id, status, amount FROM user_live_trades WHERE id = $1",
      [liveTradeId]
    );

    if (liveTradeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Live trade not found" },
        { status: 404 }
      );
    }

    const liveTrade = liveTradeCheck.rows[0];

    if (liveTrade.status !== "active") {
      return NextResponse.json(
        { error: "Live trade is not active" },
        { status: 400 }
      );
    }

    // Begin transaction
    await db.query("BEGIN");

    try {
      // 1. Update live trade status to 'deactivated'
      await db.query(
        `UPDATE user_live_trades 
         SET status = 'deactivated', 
             end_time = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [liveTradeId]
      );

      // 2. Create transaction record for the deactivation
      await db.query(
        `INSERT INTO transactions (
           user_id, type, amount, balance_type, description, 
           reference_id, status, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          liveTrade.user_id,
          "live_trade_deactivation",
          0, // No amount change for deactivation
          "system",
          `Live trade #${liveTradeId} deactivated by admin`,
          liveTradeId,
          "completed",
        ]
      );

      // 3. Log the admin action
      console.log(
        `Admin ${session.user.email} deactivated live trade ${liveTradeId} for user ${liveTrade.user_id}`
      );

      await db.query("COMMIT");

      return NextResponse.json({
        message: "Live trade deactivated successfully",
        liveTradeId,
        status: "deactivated",
      });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error deactivating live trade:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
