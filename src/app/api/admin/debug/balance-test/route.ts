import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, balanceQueries, transactionQueries } from "@/lib/db";

export async function POST(request: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diagnostics: any = {
    step: 'starting',
    timestamp: new Date().toISOString()
  };

  try {
    // Step 1: Check authentication
    diagnostics.step = 'checking_auth';
    const session = await getServerSession(authOptions);
    
    diagnostics.auth = {
      has_session: !!session,
      has_user: !!session?.user,
      user_role: session?.user?.role || 'none',
      is_admin: session?.user?.role === 'admin'
    };

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({
        error: "Admin access required",
        diagnostics
      }, { status: 403 });
    }

    // Step 2: Parse request body
    diagnostics.step = 'parsing_body';
    const body = await request.json();
    const { userId, balanceType, amount, description } = body;
    
    diagnostics.request = {
      userId,
      balanceType,
      amount,
      description,
      has_userId: !!userId,
      has_balanceType: !!balanceType,
      has_amount: !!amount
    };

    // Step 3: Validate input
    diagnostics.step = 'validating_input';
    if (!userId || !balanceType || !amount || amount <= 0) {
      return NextResponse.json({
        error: "Invalid input data",
        diagnostics
      }, { status: 400 });
    }

    // Step 4: Check if user exists
    diagnostics.step = 'checking_user_exists';
    const userCheck = await db.query(
      'SELECT id, email FROM users WHERE id = $1',
      [userId]
    );
    
    diagnostics.user = {
      exists: userCheck.rows.length > 0,
      email: userCheck.rows[0]?.email || 'not found'
    };

    if (userCheck.rows.length === 0) {
      return NextResponse.json({
        error: "User not found",
        diagnostics
      }, { status: 404 });
    }

    // Step 5: Check if user has balance record
    diagnostics.step = 'checking_balance_record';
    const balanceCheck = await db.query(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId]
    );
    
    diagnostics.balance_record = {
      exists: balanceCheck.rows.length > 0,
      current_balance: balanceCheck.rows[0]?.[balanceType] || 'no record'
    };

    if (balanceCheck.rows.length === 0) {
      // Create balance record
      diagnostics.step = 'creating_balance_record';
      await db.query(
        `INSERT INTO user_balances (user_id, total_balance, available_balance, invested_balance, profit_balance)
         VALUES ($1, 0, 0, 0, 0)`,
        [userId]
      );
      diagnostics.balance_record.created = true;
    }

    // Step 6: Test transaction method
    diagnostics.step = 'testing_transaction_method';
    diagnostics.db_transaction_available = typeof db.transaction === 'function';

    if (typeof db.transaction !== 'function') {
      return NextResponse.json({
        error: "Database transaction method not available",
        diagnostics
      }, { status: 500 });
    }

    // Step 7: Attempt balance update
    diagnostics.step = 'updating_balance';
    
    try {
      const result = await db.transaction(async (client) => {
        // Update balance
        const updatedBalance = await balanceQueries.updateBalance(
          userId,
          balanceType,
          amount,
          "add",
          client
        );

        diagnostics.balance_updated = {
          success: true,
          new_balance: updatedBalance[balanceType]
        };

        // Create transaction record
        diagnostics.step = 'creating_transaction';
        
        let transaction;
        try {
          transaction = await transactionQueries.createTransaction(
            {
              userId,
              type: "credit",
              amount,
              balanceType: balanceType.replace("_balance", ""),
              description: description || "Test balance adjustment",
              status: "completed",
            },
            client
          );
          diagnostics.transaction_created = {
            success: true,
            type: 'credit',
            id: transaction.id
          };
        } catch (err) {
          // Try fallback type
          diagnostics.transaction_created = {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            trying_fallback: true
          };
          
          transaction = await transactionQueries.createTransaction(
            {
              userId,
              type: "admin_funding",
              amount,
              balanceType: balanceType.replace("_balance", ""),
              description: description || "Test balance adjustment",
              status: "completed",
            },
            client
          );
          
          diagnostics.transaction_created.fallback_success = true;
          diagnostics.transaction_created.fallback_type = 'admin_funding';
        }

        return { balance: updatedBalance, transaction };
      });

      diagnostics.step = 'completed';
      diagnostics.result = {
        success: true,
        balance: result.balance[balanceType],
        transaction_id: result.transaction.id
      };

      return NextResponse.json({
        message: "Test successful - balance adjustment works!",
        diagnostics,
        result: {
          balance: result.balance,
          transaction: result.transaction
        }
      });

    } catch (dbError) {
      diagnostics.step = 'database_error';
      diagnostics.error = {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        name: dbError instanceof Error ? dbError.name : undefined
      };

      return NextResponse.json({
        error: "Database operation failed",
        diagnostics
      }, { status: 500 });
    }

  } catch (error) {
    diagnostics.step = 'general_error';
    diagnostics.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    };

    console.error("Balance test error:", error);
    return NextResponse.json({
      error: "Test failed",
      diagnostics
    }, { status: 500 });
  }
}

