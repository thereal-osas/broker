import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, balanceQueries, transactionQueries } from "@/lib/db";

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
    const { live_trade_plan_id, amount } = body;

    if (!live_trade_plan_id || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Invalid investment amount" },
        { status: 400 }
      );
    }

    // Get the live trade plan details
    const planQuery = `
      SELECT * FROM live_trade_plans 
      WHERE id = $1 AND is_active = true
    `;
    const planResult = await db.query(planQuery, [live_trade_plan_id]);

    if (planResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Live trade plan not found or inactive" },
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

    // Check user's balance from user_balances table
    const balanceQuery = `SELECT total_balance FROM user_balances WHERE user_id = $1`;
    const balanceResult = await db.query(balanceQuery, [session.user.id]);

    if (balanceResult.rows.length === 0) {
      return NextResponse.json(
        { error: "User balance not found" },
        { status: 404 }
      );
    }

    const userBalance = parseFloat(balanceResult.rows[0].total_balance);

    if (userBalance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Use proper transaction handling with client parameter
    const result = await db.transaction(async (client) => {
      // Deduct amount from user's total balance (simplified balance system)
      await balanceQueries.updateBalance(
        session.user.id,
        "total_balance",
        amount,
        "subtract",
        client
      );

      // Create live trade record
      const insertQuery = `
        INSERT INTO user_live_trades (
          user_id, live_trade_plan_id, amount, status,
          total_profit, start_time
        )
        VALUES ($1, $2, $3, 'active', 0, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const tradeResult = await client.query(insertQuery, [
        session.user.id,
        live_trade_plan_id,
        amount,
      ]);

      // Record transaction using transactionQueries with client
      const transaction = await transactionQueries.createTransaction(
        {
          userId: session.user.id,
          type: "live_trade_investment",
          amount,
          balanceType: "total",
          description: `Live Trade Investment: ${plan.name}`,
          status: "completed",
        },
        client // ← ALREADY HAS THIS
      );

      return {
        trade: tradeResult.rows[0],
        transaction,
      };
    });

    return NextResponse.json({
      message: "Live trade started successfully",
      trade: result.trade,
    });
  } catch (error) {
    console.error("Error starting live trade:", error);

    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes("does not exist")) {
        if (error.message.includes("table")) {
          return NextResponse.json(
            {
              error: "Live trade system not available. Please contact support.",
            },
            { status: 503 }
          );
        }

        if (error.message.includes("column")) {
          console.error(
            "Database schema error - missing column:",
            error.message
          );
          return NextResponse.json(
            { error: "Database schema error. Please contact support." },
            { status: 503 }
          );
        }
      }

      if (error.message.includes("card_balance")) {
        console.error("Card balance column missing:", error.message);
        return NextResponse.json(
          { error: "Balance system unavailable. Please contact support." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
