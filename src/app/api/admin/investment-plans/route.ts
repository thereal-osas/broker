import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

export async function GET(_request: NextRequest) {
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

    const plans = result.rows.map((plan: any) => ({
      ...plan,
      min_amount: parseFloat(plan.min_amount || 0),
      max_amount: plan.max_amount ? parseFloat(plan.max_amount) : null,
      daily_profit_rate: parseFloat(plan.daily_profit_rate || 0),
      duration_days: parseInt(plan.duration_days || 0),
      active_investments: parseInt(plan.active_investments || 0),
      total_invested: parseFloat(plan.total_invested || 0),
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

    const query = `
      INSERT INTO investment_plans (
        name, description, min_amount, max_amount, 
        daily_profit_rate, duration_days, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
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
