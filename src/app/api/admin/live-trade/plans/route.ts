import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";

    let query = `
      SELECT 
        ltp.*,
        COUNT(ult.id) as active_trades,
        COALESCE(SUM(CASE WHEN ult.status = 'active' THEN ult.amount ELSE 0 END), 0) as total_invested
      FROM live_trade_plans ltp
      LEFT JOIN user_live_trades ult ON ltp.id = ult.live_trade_plan_id
      GROUP BY ltp.id
      ORDER BY ltp.created_at DESC
    `;

    if (!includeStats) {
      query = `
        SELECT * FROM live_trade_plans 
        ORDER BY created_at DESC
      `;
    }

    const result = await db.query(query);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching live trade plans:", error);
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
      hourly_profit_rate,
      duration_hours,
      is_active = true,
    } = body;

    // Validation
    if (
      !name ||
      !description ||
      !min_amount ||
      !hourly_profit_rate ||
      !duration_hours
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (min_amount <= 0 || hourly_profit_rate <= 0 || duration_hours <= 0) {
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
      INSERT INTO live_trade_plans (
        name, description, min_amount, max_amount, 
        hourly_profit_rate, duration_hours, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      name,
      description,
      min_amount,
      max_amount,
      hourly_profit_rate / 100, // Convert percentage to decimal
      duration_hours,
      is_active,
    ];

    const result = await db.query(query, values);

    return NextResponse.json({
      message: "Live trade plan created successfully",
      plan: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating live trade plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
