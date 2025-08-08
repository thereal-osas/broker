import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import {
  db,
  balanceQueries,
  transactionQueries,
} from "../../../../../../lib/db";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { status, admin_notes } = body;

    // Validate status
    const validStatuses = ["pending", "approved", "declined", "processed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the withdrawal request
    const getRequestQuery = `
      SELECT wr.*, u.id as user_id, ub.total_balance
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE wr.id = $1
    `;
    const requestResult = await db.query(getRequestQuery, [id]);

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Withdrawal request not found" },
        { status: 404 }
      );
    }

    const withdrawalRequest = requestResult.rows[0];

    // Start transaction
    await db.query("BEGIN");

    try {
      // Update withdrawal request
      const updateQuery = `
        UPDATE withdrawal_requests 
        SET status = $1, admin_notes = $2, processed_by = $3, processed_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;

      const updateResult = await db.query(updateQuery, [
        status,
        admin_notes,
        session.user.id,
        id,
      ]);

      // Handle balance deduction for approved or processed withdrawals
      if (
        (status === "approved" && withdrawalRequest.status === "pending") ||
        (status === "processed" && withdrawalRequest.status === "approved")
      ) {
        const amount = parseFloat(withdrawalRequest.amount);
        const userBalance = parseFloat(withdrawalRequest.total_balance || 0);

        // Check if user has sufficient balance
        if (userBalance < amount) {
          await db.query("ROLLBACK");
          return NextResponse.json(
            { error: "Insufficient balance" },
            { status: 400 }
          );
        }

        // Only deduct balance if not already deducted (when moving from pending to approved)
        if (withdrawalRequest.status === "pending") {
          // Use proper balance update mechanism that recalculates totals
          await balanceQueries.updateBalance(
            withdrawalRequest.user_id,
            "total_balance",
            amount,
            "subtract"
          );

          // Create transaction record using the transaction queries
          await transactionQueries.createTransaction({
            userId: withdrawalRequest.user_id,
            type: "withdrawal",
            amount: amount,
            balanceType: "total",
            description: `Debit Alert - Withdrawal ${withdrawalRequest.withdrawal_method}`,
            referenceId: id,
            status: "completed",
          });
        }
      }

      // If declined and was previously approved, refund the balance
      if (status === "declined" && withdrawalRequest.status === "approved") {
        const amount = parseFloat(withdrawalRequest.amount);

        // Refund user balance using proper balance update mechanism
        await balanceQueries.updateBalance(
          withdrawalRequest.user_id,
          "total_balance",
          amount,
          "add"
        );

        // Create refund transaction record using transaction queries
        await transactionQueries.createTransaction({
          userId: withdrawalRequest.user_id,
          type: "admin_funding",
          amount: amount,
          balanceType: "total",
          description: "Deposit Alert - Withdrawal request declined (refund)",
          referenceId: id,
          status: "completed",
        });
      }

      await db.query("COMMIT");

      return NextResponse.json(updateResult.rows[0]);
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Withdrawal request update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
