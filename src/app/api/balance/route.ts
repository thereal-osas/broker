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
      // Convert string values to numbers and recalculate total balance excluding credit score
      const profit_balance = parseFloat(newBalance.profit_balance || 0);
      const deposit_balance = parseFloat(newBalance.deposit_balance || 0);
      const bonus_balance = parseFloat(newBalance.bonus_balance || 0);
      const credit_score_balance = parseFloat(newBalance.credit_score_balance || 0);

      // Calculate total balance excluding credit score (credit score is points, not money)
      const calculated_total_balance = profit_balance + deposit_balance + bonus_balance;

      const formattedNewBalance = {
        ...newBalance,
        total_balance: calculated_total_balance,
        profit_balance,
        deposit_balance,
        bonus_balance,
        credit_score_balance,
      };
      return NextResponse.json(formattedNewBalance);
    }

    // Convert string values to numbers and recalculate total balance excluding credit score
    const profit_balance = parseFloat(balance.profit_balance || 0);
    const deposit_balance = parseFloat(balance.deposit_balance || 0);
    const bonus_balance = parseFloat(balance.bonus_balance || 0);
    const credit_score_balance = parseFloat(balance.credit_score_balance || 0);

    // Calculate total balance excluding credit score (credit score is points, not money)
    const calculated_total_balance = profit_balance + deposit_balance + bonus_balance;

    const formattedBalance = {
      ...balance,
      total_balance: calculated_total_balance,
      profit_balance,
      deposit_balance,
      bonus_balance,
      credit_score_balance,
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
