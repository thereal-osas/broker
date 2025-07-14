import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { db } from "../../../../../../lib/db";

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
    const validStatuses = ['pending', 'approved', 'declined', 'processed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
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
    await db.query('BEGIN');

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
        id
      ]);

      // If approved, deduct from user's balance and create transaction
      if (status === 'approved' && withdrawalRequest.status === 'pending') {
        const amount = parseFloat(withdrawalRequest.amount);
        
        // Check if user has sufficient balance
        if (withdrawalRequest.total_balance < amount) {
          await db.query('ROLLBACK');
          return NextResponse.json(
            { error: "Insufficient balance" },
            { status: 400 }
          );
        }

        // Update user balance
        const updateBalanceQuery = `
          UPDATE user_balances 
          SET total_balance = total_balance - $1
          WHERE user_id = $2
        `;
        await db.query(updateBalanceQuery, [amount, withdrawalRequest.user_id]);

        // Create transaction record
        const transactionQuery = `
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, 
            reference_id, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await db.query(transactionQuery, [
          withdrawalRequest.user_id,
          'withdrawal',
          amount,
          'total',
          `Withdrawal request approved - ${withdrawalRequest.withdrawal_method}`,
          id,
          'completed'
        ]);
      }

      // If declined and was previously approved, refund the balance
      if (status === 'declined' && withdrawalRequest.status === 'approved') {
        const amount = parseFloat(withdrawalRequest.amount);
        
        // Refund user balance
        const refundBalanceQuery = `
          UPDATE user_balances 
          SET total_balance = total_balance + $1
          WHERE user_id = $2
        `;
        await db.query(refundBalanceQuery, [amount, withdrawalRequest.user_id]);

        // Create refund transaction record
        const refundTransactionQuery = `
          INSERT INTO transactions (
            user_id, type, amount, balance_type, description, 
            reference_id, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await db.query(refundTransactionQuery, [
          withdrawalRequest.user_id,
          'admin_funding',
          amount,
          'total',
          `Withdrawal request declined - refund`,
          id,
          'completed'
        ]);
      }

      await db.query('COMMIT');

      return NextResponse.json(updateResult.rows[0]);
    } catch (error) {
      await db.query('ROLLBACK');
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
