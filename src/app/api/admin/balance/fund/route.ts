import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import {
  balanceQueries,
  transactionQueries,
  db,
} from "../../../../../../lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, balanceType, amount, description } = body;

    // Validate input
    if (!userId || !balanceType || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    // Validate balance type
    const validBalanceTypes = [
      "total_balance",
      "profit_balance",
      "deposit_balance",
      "bonus_balance",
      "credit_score_balance",
    ];
    if (!validBalanceTypes.includes(balanceType)) {
      return NextResponse.json(
        { error: "Invalid balance type" },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (client) => {
      // Update user balance
      const updatedBalance = await balanceQueries.updateBalance(
        userId,
        balanceType,
        amount,
        "add"
      );

      // Create transaction record
      const transaction = await transactionQueries.createTransaction({
        userId,
        type: "admin_funding",
        amount,
        balanceType: balanceType.replace("_balance", ""),
        description:
          description || `Admin funding - ${balanceType.replace("_", " ")}`,
        status: "completed",
      });

      return { balance: updatedBalance, transaction };
    });

    return NextResponse.json({
      message: "Balance funded successfully",
      balance: result.balance,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("Balance funding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      balanceType,
      amount,
      description,
      operation = "subtract",
    } = body;

    // Validate input
    if (!userId || !balanceType || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    // Validate balance type
    const validBalanceTypes = [
      "total_balance",
      "profit_balance",
      "deposit_balance",
      "bonus_balance",
      "credit_score_balance",
    ];
    if (!validBalanceTypes.includes(balanceType)) {
      return NextResponse.json(
        { error: "Invalid balance type" },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (client) => {
      // Update user balance
      const updatedBalance = await balanceQueries.updateBalance(
        userId,
        balanceType,
        amount,
        operation
      );

      // Create transaction record
      const transaction = await transactionQueries.createTransaction({
        userId,
        type: operation === "add" ? "admin_funding" : "admin_deduction",
        amount,
        balanceType: balanceType.replace("_balance", ""),
        description:
          description ||
          `Admin ${operation} - ${balanceType.replace("_", " ")}`,
        status: "completed",
      });

      return { balance: updatedBalance, transaction };
    });

    return NextResponse.json({
      message: `Balance ${operation}ed successfully`,
      balance: result.balance,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("Balance adjustment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
