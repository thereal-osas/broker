import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { db } from "../../../../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get total users
    const usersResult = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = $1",
      ["investor"]
    );
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get total deposits
    const depositsResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM deposit_requests 
      WHERE status = 'approved'
    `);
    const totalDeposits = parseFloat(depositsResult.rows[0].total);

    // Get total withdrawals
    const withdrawalsResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM withdrawal_requests 
      WHERE status = 'processed'
    `);
    const totalWithdrawals = parseFloat(withdrawalsResult.rows[0].total);

    // Get total investments
    const investmentsResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM user_investments 
      WHERE status IN ('active', 'completed')
    `);
    const totalInvestments = parseFloat(investmentsResult.rows[0].total);

    // Get pending deposits
    const pendingDepositsResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM deposit_requests 
      WHERE status = 'pending'
    `);
    const pendingDeposits = parseInt(pendingDepositsResult.rows[0].count);

    // Get pending withdrawals
    const pendingWithdrawalsResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM withdrawal_requests 
      WHERE status = 'pending'
    `);
    const pendingWithdrawals = parseInt(pendingWithdrawalsResult.rows[0].count);

    // Get active investments
    const activeInvestmentsResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM user_investments 
      WHERE status = 'active'
    `);
    const activeInvestments = parseInt(activeInvestmentsResult.rows[0].count);

    // Get total profit distributed
    const totalProfitResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE type = 'profit'
    `);
    const totalProfit = parseFloat(totalProfitResult.rows[0].total);

    const stats = {
      totalUsers,
      totalDeposits,
      totalWithdrawals,
      totalInvestments,
      pendingDeposits,
      pendingWithdrawals,
      activeInvestments,
      totalProfit,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
