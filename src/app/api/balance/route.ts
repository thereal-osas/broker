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
      // Convert string values to numbers (simplified structure)
      const total_balance = parseFloat(newBalance.total_balance || 0);
      const card_balance = parseFloat(newBalance.card_balance || 0);
      const credit_score_balance = parseInt(
        newBalance.credit_score_balance || 0
      );

      const formattedNewBalance = {
        ...newBalance,
        total_balance,
        card_balance,
        credit_score_balance,
      };
      return NextResponse.json(formattedNewBalance);
    }

    // Convert string values to numbers (simplified structure)
    const total_balance = parseFloat(balance.total_balance || 0);
    const card_balance = parseFloat(balance.card_balance || 0);
    const credit_score_balance = parseInt(balance.credit_score_balance || 0);

    const formattedBalance = {
      ...balance,
      total_balance,
      card_balance,
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
