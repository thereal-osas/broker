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
    const { userId, balanceType, amount, description, customDate } = body;

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
      "card_balance",
      "credit_score_balance",
    ];
    if (!validBalanceTypes.includes(balanceType)) {
      return NextResponse.json(
        { error: "Invalid balance type" },
        { status: 400 }
      );
    }

    // Validate custom date if provided
    if (customDate) {
      const dateObj = new Date(customDate);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: "Invalid custom date" },
          { status: 400 }
        );
      }
      // Prevent future dates
      if (dateObj > new Date()) {
        return NextResponse.json(
          { error: "Custom date cannot be in the future" },
          { status: 400 }
        );
      }
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (client) => {
      // Update user balance
      const updatedBalance = await balanceQueries.updateBalance(
        userId,
        balanceType,
        amount,
        "add",
        client
      );

      // Create transaction record with custom date if provided
      let transaction;
      if (customDate) {
        // Create transaction with custom date using raw SQL
        const transactionResult = await client.query(
          `INSERT INTO transactions (user_id, type, amount, balance_type, description, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            userId,
            "credit",
            amount,
            balanceType.replace("_balance", ""),
            description || `Manual Balance Adjustment by Admin`,
            "completed",
            customDate,
          ]
        );
        transaction = transactionResult.rows[0];
      } else {
        // Create transaction with current timestamp
        transaction = await transactionQueries.createTransaction(
          {
            userId,
            type: "credit",
            amount,
            balanceType: balanceType.replace("_balance", ""),
            description: description || `Manual Balance Adjustment by Admin`,
            status: "completed",
          },
          client
        );
      }

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
      customDate,
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
      "card_balance",
      "credit_score_balance",
    ];
    if (!validBalanceTypes.includes(balanceType)) {
      return NextResponse.json(
        { error: "Invalid balance type" },
        { status: 400 }
      );
    }

    // Validate custom date if provided
    if (customDate) {
      const dateObj = new Date(customDate);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: "Invalid custom date" },
          { status: 400 }
        );
      }
      // Prevent future dates
      if (dateObj > new Date()) {
        return NextResponse.json(
          { error: "Custom date cannot be in the future" },
          { status: 400 }
        );
      }
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (client) => {
      // Update user balance
      const updatedBalance = await balanceQueries.updateBalance(
        userId,
        balanceType,
        amount,
        operation,
        client
      );

      // Create transaction record with custom date if provided
      let transaction;
      if (customDate) {
        // Create transaction with custom date using raw SQL
        const transactionResult = await client.query(
          `INSERT INTO transactions (user_id, type, amount, balance_type, description, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            userId,
            operation === "add" ? "credit" : "debit",
            amount,
            balanceType.replace("_balance", ""),
            description || `Manual Balance Adjustment by Admin`,
            "completed",
            customDate,
          ]
        );
        transaction = transactionResult.rows[0];
      } else {
        // Create transaction with current timestamp
        transaction = await transactionQueries.createTransaction(
          {
            userId,
            type: operation === "add" ? "credit" : "debit",
            amount,
            balanceType: balanceType.replace("_balance", ""),
            description: description || `Manual Balance Adjustment by Admin`,
            status: "completed",
          },
          client
        );
      }

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
