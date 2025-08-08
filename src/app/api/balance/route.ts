import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { balanceQueries } from "../../../../lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const balance = await balanceQueries.getUserBalance(session.user.id);

    if (!balance) {
      // Create balance if it doesn't exist
      const newBalance = await balanceQueries.createUserBalance(
        session.user.id
      );
      // Convert string values to numbers
      const profit_balance = parseFloat(newBalance.profit_balance || 0);
      const deposit_balance = parseFloat(newBalance.deposit_balance || 0);
      const bonus_balance = parseFloat(newBalance.bonus_balance || 0);
      const credit_score_balance = parseFloat(
        newBalance.credit_score_balance || 0
      );
      const card_balance = parseFloat(newBalance.card_balance || 0);

      // Calculate total balance including card balance (credit score excluded)
      const calculated_total =
        profit_balance + deposit_balance + bonus_balance + card_balance;

      // Update the database with the correct total balance
      await balanceQueries.recalculateUserTotalBalance(session.user.id);

      const formattedNewBalance = {
        ...newBalance,
        total_balance: calculated_total,
        profit_balance,
        deposit_balance,
        bonus_balance,
        credit_score_balance,
        card_balance,
      };
      return NextResponse.json(formattedNewBalance);
    }

    // Convert string values to numbers
    const profit_balance = parseFloat(balance.profit_balance || 0);
    const deposit_balance = parseFloat(balance.deposit_balance || 0);
    const bonus_balance = parseFloat(balance.bonus_balance || 0);
    const credit_score_balance = parseFloat(balance.credit_score_balance || 0);
    const card_balance = parseFloat(balance.card_balance || 0);

    // Calculate total balance including card balance (credit score excluded)
    const calculated_total =
      profit_balance + deposit_balance + bonus_balance + card_balance;
    const stored_total = parseFloat(balance.total_balance || 0);

    // Check if there's a discrepancy between stored and calculated total
    const discrepancy = Math.abs(calculated_total - stored_total);

    if (discrepancy > 0.01) {
      // Recalculate and update the database total balance if there's a significant discrepancy
      console.log(
        `Balance discrepancy detected for user ${session.user.id}: stored=${stored_total}, calculated=${calculated_total}, difference=${discrepancy}`
      );
      await balanceQueries.recalculateUserTotalBalance(session.user.id);
    }

    const formattedBalance = {
      ...balance,
      total_balance: calculated_total, // Always use the calculated total for consistency
      profit_balance,
      deposit_balance,
      bonus_balance,
      credit_score_balance,
      card_balance,
    };

    return NextResponse.json(formattedBalance);
  } catch (error) {
    console.error("Balance fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
