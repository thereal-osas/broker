import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

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
      SELECT * FROM deposit_requests 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [session.user.id]);
    const deposits = result.rows.map((deposit: Record<string, unknown>) => ({
      ...deposit,
      amount: parseFloat(String(deposit.amount || 0)),
    }));
    return NextResponse.json(deposits);
  } catch (error) {
    console.error("Deposit requests fetch error:", error);
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
    const { amount, paymentMethod, paymentProof, transactionHash } = body;

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (amount < 10) {
      return NextResponse.json(
        { error: "Minimum deposit amount is $10" },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    // For crypto deposits, transaction hash is required
    if (paymentMethod.startsWith("crypto_") && !transactionHash) {
      return NextResponse.json(
        { error: "Transaction hash is required for cryptocurrency deposits" },
        { status: 400 }
      );
    }

    // Create deposit request
    const query = `
      INSERT INTO deposit_requests (user_id, amount, payment_method, payment_proof, transaction_hash, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      session.user.id,
      amount,
      paymentMethod,
      paymentProof || "",
      transactionHash || null,
      "pending",
    ];

    const result = await db.query(query, values);

    return NextResponse.json(
      {
        message: "Deposit request submitted successfully",
        request: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Deposit request creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
