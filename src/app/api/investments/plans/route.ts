import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { investmentQueries, db } from "../../../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const plans = await investmentQueries.getActivePlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Investment plans fetch error:", error);
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
      minAmount,
      maxAmount,
      dailyProfitRate,
      durationDays,
    } = body;

    // Validate input
    if (
      !name ||
      !description ||
      !minAmount ||
      !dailyProfitRate ||
      !durationDays
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (minAmount <= 0 || dailyProfitRate <= 0 || durationDays <= 0) {
      return NextResponse.json(
        { error: "Invalid values for amount, rate, or duration" },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_profit_rate, duration_days, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      name,
      description,
      minAmount,
      maxAmount || null,
      dailyProfitRate / 100, // Convert percentage to decimal
      durationDays,
      true,
    ];

    const result = await db.query(query, values);

    return NextResponse.json(
      {
        message: "Investment plan created successfully",
        plan: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Investment plan creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
