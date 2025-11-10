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

      // Determine transaction type - use 'credit' if available, fallback to 'admin_funding'
      const transactionType = "credit";

      if (customDate) {
        // Create transaction with custom date using raw SQL
        try {
          const transactionResult = await client.query(
            `INSERT INTO transactions (user_id, type, amount, balance_type, description, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              userId,
              transactionType,
              amount,
              balanceType.replace("_balance", ""),
              description || `Manual Balance Adjustment - Credit`,
              "completed",
              customDate,
            ]
          );
          transaction = transactionResult.rows[0];
        } catch (err) {
          // If 'credit' type fails (constraint error), fallback to 'admin_funding'
          console.log("Falling back to admin_funding type:", err);
          const transactionResult = await client.query(
            `INSERT INTO transactions (user_id, type, amount, balance_type, description, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              userId,
              "admin_funding",
              amount,
              balanceType.replace("_balance", ""),
              description || `Manual Balance Adjustment - Credit`,
              "completed",
              customDate,
            ]
          );
          transaction = transactionResult.rows[0];
        }
      } else {
        // Create transaction with current timestamp
        try {
          transaction = await transactionQueries.createTransaction(
            {
              userId,
              type: transactionType,
              amount,
              balanceType: balanceType.replace("_balance", ""),
              description: description || `Manual Balance Adjustment - Credit`,
              status: "completed",
            },
            client
          );
        } catch (err) {
          // If 'credit' type fails (constraint error), fallback to 'admin_funding'
          console.log("Falling back to admin_funding type:", err);
          transaction = await transactionQueries.createTransaction(
            {
              userId,
              type: "admin_funding",
              amount,
              balanceType: balanceType.replace("_balance", ""),
              description: description || `Manual Balance Adjustment - Credit`,
              status: "completed",
            },
            client
          );
        }
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
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Failed to fund balance", details: errorMessage },
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

      // Determine transaction type - use 'credit'/'debit' if available, fallback to 'admin_funding'
      const transactionType = operation === "add" ? "credit" : "debit";
      const fallbackDescription = operation === "add"
        ? `Manual Balance Adjustment - Credit`
        : `Manual Balance Adjustment - Debit`;

      if (customDate) {
        // Create transaction with custom date using raw SQL
        try {
          const transactionResult = await client.query(
            `INSERT INTO transactions (user_id, type, amount, balance_type, description, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              userId,
              transactionType,
              amount,
              balanceType.replace("_balance", ""),
              description || fallbackDescription,
              "completed",
              customDate,
            ]
          );
          transaction = transactionResult.rows[0];
        } catch (err) {
          // If 'credit'/'debit' type fails (constraint error), fallback to 'admin_funding'
          console.log("Falling back to admin_funding type:", err);
          const transactionResult = await client.query(
            `INSERT INTO transactions (user_id, type, amount, balance_type, description, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              userId,
              "admin_funding",
              amount,
              balanceType.replace("_balance", ""),
              description || fallbackDescription,
              "completed",
              customDate,
            ]
          );
          transaction = transactionResult.rows[0];
        }
      } else {
        // Create transaction with current timestamp
        try {
          transaction = await transactionQueries.createTransaction(
            {
              userId,
              type: transactionType,
              amount,
              balanceType: balanceType.replace("_balance", ""),
              description: description || fallbackDescription,
              status: "completed",
            },
            client
          );
        } catch (err) {
          // If 'credit'/'debit' type fails (constraint error), fallback to 'admin_funding'
          console.log("Falling back to admin_funding type:", err);
          transaction = await transactionQueries.createTransaction(
            {
              userId,
              type: "admin_funding",
              amount,
              balanceType: balanceType.replace("_balance", ""),
              description: description || fallbackDescription,
              status: "completed",
            },
            client
          );
        }
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
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Failed to adjust balance", details: errorMessage },
      { status: 500 }
    );
  }
}
