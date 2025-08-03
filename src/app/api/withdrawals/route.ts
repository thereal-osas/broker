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
    const withdrawals = result.rows.map((withdrawal: Record<string, unknown>) => ({
      ...withdrawal,
      amount: parseFloat(String(withdrawal.amount || 0)),
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

    // Get platform settings for validation
    const settingsQuery = `
      SELECT setting_key, setting_value, setting_type
      FROM system_settings
      WHERE setting_key IN ('min_withdrawal_amount', 'max_withdrawal_amount', 'max_withdrawal_percentage')
    `;
    const settingsResult = await db.query(settingsQuery);

    const settings: Record<string, any> = {};
    settingsResult.rows.forEach(row => {
      settings[row.setting_key] = row.setting_type === 'number' ? parseFloat(row.setting_value) : row.setting_value;
    });

    const minWithdrawal = settings.min_withdrawal_amount || 50;
    const maxWithdrawal = settings.max_withdrawal_amount || 50000;
    const maxPercentage = settings.max_withdrawal_percentage || 100;

    if (amount < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is $${minWithdrawal}` },
        { status: 400 }
      );
    }

    if (amount > maxWithdrawal) {
      return NextResponse.json(
        { error: `Maximum withdrawal amount is $${maxWithdrawal.toLocaleString()} per request` },
        { status: 400 }
      );
    }

    if (!withdrawalMethod || !accountDetails) {
      return NextResponse.json(
        { error: "Withdrawal method and account details are required" },
        { status: 400 }
      );
    }

    // Validate specific fields based on withdrawal method
    if (withdrawalMethod === "bank_transfer") {
      const { bankName, accountName, accountNumber, routingNumber } = accountDetails;
      if (!bankName || !accountName || !accountNumber || !routingNumber) {
        return NextResponse.json(
          { error: "All bank details are required for bank transfer" },
          { status: 400 }
        );
      }
    } else if (withdrawalMethod === "crypto") {
      const { walletAddress } = accountDetails;
      if (!walletAddress) {
        return NextResponse.json(
          { error: "Wallet address is required for cryptocurrency withdrawal" },
          { status: 400 }
        );
      }
    } else if (withdrawalMethod === "paypal") {
      const { paypalId } = accountDetails;
      if (!paypalId) {
        return NextResponse.json(
          { error: "PayPal ID/Email is required for PayPal withdrawal" },
          { status: 400 }
        );
      }
      // Basic email validation for PayPal ID
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paypalId)) {
        return NextResponse.json(
          { error: "Please enter a valid email address for PayPal ID" },
          { status: 400 }
        );
      }
    }

    // Check user balance
    const userBalance = await balanceQueries.getUserBalance(session.user.id);
    if (!userBalance || userBalance.total_balance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Check percentage-based limit
    const maxAllowedByPercentage = (userBalance.total_balance * maxPercentage) / 100;
    if (amount > maxAllowedByPercentage) {
      return NextResponse.json(
        { error: `Maximum withdrawal is ${maxPercentage}% of your balance ($${maxAllowedByPercentage.toFixed(2)})` },
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
