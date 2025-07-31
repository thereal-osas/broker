import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const query = `
      SELECT 
        ip.*,
        COUNT(ui.id) as active_investments,
        COALESCE(SUM(ui.amount), 0) as total_invested
      FROM investment_plans ip
      LEFT JOIN user_investments ui ON ip.id = ui.plan_id AND ui.status = 'active'
      GROUP BY ip.id
      ORDER BY ip.created_at DESC
    `;

    const result = await db.query(query);

    const plans = result.rows.map((plan: Record<string, unknown>) => ({
      ...plan,
      min_amount: parseFloat(String(plan.min_amount || 0)),
      max_amount: plan.max_amount ? parseFloat(String(plan.max_amount)) : null,
      daily_profit_rate: parseFloat(String(plan.daily_profit_rate || 0)),
      duration_days: parseInt(String(plan.duration_days || 0)),
      active_investments: parseInt(String(plan.active_investments || 0)),
      total_invested: parseFloat(String(plan.total_invested || 0)),
    }));

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Admin investment plans fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const {
      name,
      description,
      min_amount,
      max_amount,
      daily_profit_rate,
      duration_days,
      is_active = true,
      plan_type = 'daily',
      profit_interval = 'daily',
    } = body;

    // Validation
    if (
      !name ||
      !description ||
      !min_amount ||
      !daily_profit_rate ||
      !duration_days
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (min_amount <= 0 || daily_profit_rate <= 0 || duration_days <= 0) {
      return NextResponse.json(
        { error: "Invalid values for amount, rate, or duration" },
        { status: 400 }
      );
    }

    if (max_amount && max_amount <= min_amount) {
      return NextResponse.json(
        { error: "Maximum amount must be greater than minimum amount" },
        { status: 400 }
      );
    }

    // Validate plan type and profit interval
    const validPlanTypes = ['daily', 'live_trade'];
    const validProfitIntervals = ['daily', 'hourly'];

    if (!validPlanTypes.includes(plan_type)) {
      return NextResponse.json(
        { error: "Invalid plan type. Must be 'daily' or 'live_trade'" },
        { status: 400 }
      );
    }

    if (!validProfitIntervals.includes(profit_interval)) {
      return NextResponse.json(
        { error: "Invalid profit interval. Must be 'daily' or 'hourly'" },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO investment_plans (
        name, description, min_amount, max_amount,
        daily_profit_rate, duration_days, is_active,
        plan_type, profit_interval
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      name,
      description,
      min_amount,
      max_amount,
      daily_profit_rate,
      duration_days,
      is_active,
      plan_type,
      profit_interval,
    ];

    const result = await db.query(query, values);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Investment plan creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
