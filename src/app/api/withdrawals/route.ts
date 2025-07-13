import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { db, balanceQueries } from "../../../../lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const query = `
      SELECT * FROM withdrawal_requests 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [session.user.id]);
    const withdrawals = result.rows.map((withdrawal: any) => ({
      ...withdrawal,
      amount: parseFloat(withdrawal.amount || 0),
    }));
    return NextResponse.json(withdrawals);
  } catch (error) {
    console.error("Withdrawal requests fetch error:", error);
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
    const { amount, withdrawalMethod, accountDetails } = body;

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (amount < 50) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is $50" },
        { status: 400 }
      );
    }

    if (amount > 50000) {
      return NextResponse.json(
        { error: "Maximum withdrawal amount is $50,000 per request" },
        { status: 400 }
      );
    }

    if (!withdrawalMethod || !accountDetails) {
      return NextResponse.json(
        { error: "Withdrawal method and account details are required" },
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

    // Create withdrawal request
    const query = `
      INSERT INTO withdrawal_requests (user_id, amount, withdrawal_method, account_details, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      session.user.id,
      amount,
      withdrawalMethod,
      JSON.stringify(accountDetails),
      "pending",
    ];

    const result = await db.query(query, values);

    return NextResponse.json(
      {
        message: "Withdrawal request submitted successfully",
        request: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Withdrawal request creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
