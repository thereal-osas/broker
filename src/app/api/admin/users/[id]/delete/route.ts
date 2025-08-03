import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../auth/[...nextauth]/route";
import { db } from "../../../../../../lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // First, check if user exists and get their information
      const userCheck = await db.query(
        'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
        [id]
      );

      if (userCheck.rows.length === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      const userToDelete = userCheck.rows[0];

      // Prevent deletion of admin users (safety measure)
      if (userToDelete.role === 'admin') {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { error: "Cannot delete admin users" },
          { status: 403 }
        );
      }

      // Prevent self-deletion
      if (userToDelete.id === session.user.id) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { error: "Cannot delete your own account" },
          { status: 403 }
        );
      }

      // Delete related records in proper order (respecting foreign key constraints)
      
      // 1. Delete investment profits (references user_investments)
      await db.query(`
        DELETE FROM investment_profits 
        WHERE investment_id IN (
          SELECT id FROM user_investments WHERE user_id = $1
        )
      `, [id]);

      // 2. Delete user investments
      await db.query('DELETE FROM user_investments WHERE user_id = $1', [id]);

      // 3. Delete live trade profits (references user_live_trades)
      await db.query(`
        DELETE FROM hourly_live_trade_profits 
        WHERE live_trade_id IN (
          SELECT id FROM user_live_trades WHERE user_id = $1
        )
      `, [id]);

      // 4. Delete user live trades
      await db.query('DELETE FROM user_live_trades WHERE user_id = $1', [id]);

      // 5. Delete transactions
      await db.query('DELETE FROM transactions WHERE user_id = $1', [id]);

      // 6. Delete withdrawal requests
      await db.query('DELETE FROM withdrawal_requests WHERE user_id = $1', [id]);

      // 7. Delete deposit requests
      await db.query('DELETE FROM deposit_requests WHERE user_id = $1', [id]);

      // 8. Delete referrals (both as referrer and referred)
      await db.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_id = $1', [id]);

      // 9. Delete user balances
      await db.query('DELETE FROM user_balances WHERE user_id = $1', [id]);

      // 10. Delete support tickets and messages
      await db.query(`
        DELETE FROM support_messages 
        WHERE ticket_id IN (
          SELECT id FROM support_tickets WHERE user_id = $1
        )
      `, [id]);
      await db.query('DELETE FROM support_tickets WHERE user_id = $1', [id]);

      // 11. Finally, delete the user
      const deleteResult = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

      if (deleteResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { error: "Failed to delete user" },
          { status: 500 }
        );
      }

      // Commit transaction
      await db.query('COMMIT');

      // Log the deletion for audit purposes
      console.log(`User deleted by admin: ${session.user.email} deleted user ${userToDelete.email} (${userToDelete.first_name} ${userToDelete.last_name})`);

      return NextResponse.json({
        message: `User ${userToDelete.first_name} ${userToDelete.last_name} has been successfully deleted`,
        deletedUser: {
          id: userToDelete.id,
          email: userToDelete.email,
          name: `${userToDelete.first_name} ${userToDelete.last_name}`
        }
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error("User deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
