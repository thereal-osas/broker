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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = await db.transaction(async (_client) => {
      // Create investment
      const investment = await investmentQueries.createInvestment({
        userId: session.user.id,
        planId,
        amount,
      });

      // Deduct from total balance
      await balanceQueries.updateBalance(
        session.user.id,
        "total_balance",
        amount,
        "subtract"
      );

      // Create transaction record
      const transaction = await transactionQueries.createTransaction({
        userId: session.user.id,
        type: "investment",
        amount,
        balanceType: "total",
        description: `Investment in ${plan.name}`,
        referenceId: investment.id,
        status: "completed",
      });

      // Check if user was referred and calculate commission
      const referralQuery = `
        SELECT r.*, s.default_referral_commission
        FROM referrals r
        CROSS JOIN settings s
        WHERE r.referred_id = $1 AND r.status = 'active'
      `;
      const referralResult = await db.query(referralQuery, [session.user.id]);

      if (referralResult.rows.length > 0) {
        const referral = referralResult.rows[0];
        const commissionRate = parseFloat(referral.commission_rate || referral.default_referral_commission || 0.05);
        const commissionAmount = amount * commissionRate;

        // Update referral commission
        await db.query(`
          UPDATE referrals
          SET commission_earned = commission_earned + $1,
              total_commission = total_commission + $1
          WHERE id = $2
        `, [commissionAmount, referral.id]);

        console.log(`Referral commission calculated: $${commissionAmount.toFixed(2)} for investment of $${amount}`);
      }

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
