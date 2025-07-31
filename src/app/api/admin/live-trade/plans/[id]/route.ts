import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const body = await request.json();
    const {
      name,
      description,
      min_amount,
      max_amount,
      hourly_profit_rate,
      duration_hours,
      is_active,
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
      UPDATE live_trade_plans 
      SET 
        name = $1,
        description = $2,
        min_amount = $3,
        max_amount = $4,
        hourly_profit_rate = $5,
        duration_hours = $6,
        is_active = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
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
      resolvedParams.id,
    ];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Live trade plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Live trade plan updated successfully",
      plan: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating live trade plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;

    // Check if there are active trades for this plan
    const activeTradesQuery = `
      SELECT COUNT(*) as count
      FROM user_live_trades
      WHERE live_trade_plan_id = $1 AND status = 'active'
    `;
    const activeTradesResult = await db.query(activeTradesQuery, [resolvedParams.id]);
    const activeTradesCount = parseInt(activeTradesResult.rows[0].count);

    if (activeTradesCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete plan with ${activeTradesCount} active trades. Please wait for trades to complete or deactivate the plan instead.` 
        },
        { status: 400 }
      );
    }

    const query = "DELETE FROM live_trade_plans WHERE id = $1 RETURNING *";
    const result = await db.query(query, [resolvedParams.id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Live trade plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Live trade plan deleted successfully",
      plan: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting live trade plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
