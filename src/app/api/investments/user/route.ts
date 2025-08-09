import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import {
  investmentQueries,
  balanceQueries,
  transactionQueries,
  db,
} from "../../../../../lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const investments = await investmentQueries.getUserInvestments(
      session.user.id
    );
    return NextResponse.json(investments);
  } catch (error) {
    console.error("User investments fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, amount } = body;

    // Validate input
    if (!planId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid plan ID or amount" },
        { status: 400 }
      );
    }

    // Get investment plan details
    const planQuery =
      "SELECT * FROM investment_plans WHERE id = $1 AND is_active = true";
    const planResult = await db.query(planQuery, [planId]);

    if (planResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Investment plan not found or inactive" },
        { status: 404 }
      );
    }

    const plan = planResult.rows[0];

    // Validate investment amount
    if (amount < plan.min_amount) {
      return NextResponse.json(
        { error: `Minimum investment amount is $${plan.min_amount}` },
        { status: 400 }
      );
    }

    if (plan.max_amount && amount > plan.max_amount) {
      return NextResponse.json(
        { error: `Maximum investment amount is $${plan.max_amount}` },
        { status: 400 }
      );
    }

    // Check user balance
    const userBalance = await balanceQueries.getUserBalance(session.user.id);
    if (!userBalance || userBalance.total_balance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Create investment and update balances in a transaction
    const result = await db.transaction(async (client) => {
      // Create investment
      const investment = await investmentQueries.createInvestment(
        {
          userId: session.user.id,
          planId,
          amount,
        },
        client
      );

      // Deduct from deposit balance - PASS THE CLIENT!
      await balanceQueries.updateBalance(
        session.user.id,
        "deposit_balance",
        amount,
        "subtract",
        client // ← ADD THIS!
      );

      // Create transaction record
      const transaction = await transactionQueries.createTransaction(
        {
          userId: session.user.id,
          type: "investment",
          amount,
          balanceType: "deposit",
          description: `Investment in ${plan.name}`,
          referenceId: investment.id,
          status: "completed",
        },
        client // ← ALREADY HAS THIS
      );

      return { investment, transaction };
    });

    return NextResponse.json(
      {
        message: "Investment created successfully",
        investment: result.investment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Investment creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
