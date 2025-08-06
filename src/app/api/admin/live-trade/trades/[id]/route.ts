import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, balanceQueries } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const liveTradeId = params.id;

    if (!liveTradeId) {
      return NextResponse.json(
        { error: "Live trade ID is required" },
        { status: 400 }
      );
    }

    // Check if live trade exists
    const liveTradeCheck = await db.query(
      `SELECT ult.id, ult.user_id, ult.status, ult.amount, ult.total_profit,
              u.first_name, u.last_name, u.email
       FROM user_live_trades ult
       JOIN users u ON ult.user_id = u.id
       WHERE ult.id = $1`,
      [liveTradeId]
    );

    if (liveTradeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Live trade not found" },
        { status: 404 }
      );
    }

    const liveTrade = liveTradeCheck.rows[0];

    // Begin transaction
    await db.query("BEGIN");

    try {
      // 1. If live trade is active, refund the investment amount to user's balance
      if (liveTrade.status === 'active') {
        // Add the investment amount back to user's total balance
        await balanceQueries.updateBalance(
          liveTrade.user_id,
          "deposit_balance", // Add to deposit balance
          liveTrade.amount,
          "add"
        );

        // Create refund transaction
        await db.query(
          `INSERT INTO transactions (
             user_id, type, amount, balance_type, description, 
             reference_id, status, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [
            liveTrade.user_id,
            "live_trade_refund",
            liveTrade.amount,
            "deposit",
            `Refund for deleted live trade #${liveTradeId}`,
            liveTradeId,
            "completed",
          ]
        );
      }

      // 2. Delete related hourly profits first (due to foreign key constraint)
      await db.query(
        "DELETE FROM hourly_live_trade_profits WHERE live_trade_id = $1",
        [liveTradeId]
      );

      // 3. Delete the live trade
      await db.query(
        "DELETE FROM user_live_trades WHERE id = $1",
        [liveTradeId]
      );

      // 4. Create deletion log transaction
      await db.query(
        `INSERT INTO transactions (
           user_id, type, amount, balance_type, description, 
           reference_id, status, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          liveTrade.user_id,
          "live_trade_deletion",
          0, // No amount change for deletion log
          "system",
          `Live trade #${liveTradeId} deleted by admin${liveTrade.status === 'active' ? ' (refunded)' : ''}`,
          liveTradeId,
          "completed",
        ]
      );

      // 5. Log the admin action
      console.log(`Admin ${session.user.email} deleted live trade ${liveTradeId} for user ${liveTrade.first_name} ${liveTrade.last_name} (${liveTrade.email})`);
      if (liveTrade.status === 'active') {
        console.log(`Refunded $${liveTrade.amount} to user ${liveTrade.user_id}`);
      }

      await db.query("COMMIT");

      return NextResponse.json({
        message: "Live trade deleted successfully",
        liveTradeId,
        refunded: liveTrade.status === 'active',
        refundAmount: liveTrade.status === 'active' ? liveTrade.amount : 0,
      });

    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }

  } catch (error) {
    console.error("Error deleting live trade:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
