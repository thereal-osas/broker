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

    // Get all user investments with user and plan details
    const query = `
      SELECT 
        ui.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        ip.name as plan_name,
        ip.daily_profit_rate,
        ip.duration_days
      FROM user_investments ui
      JOIN users u ON ui.user_id = u.id
      JOIN investment_plans ip ON ui.plan_id = ip.id
      ORDER BY ui.created_at DESC
    `;

    const result = await db.query(query);

    const investments = result.rows.map((investment: Record<string, unknown>) => ({
      ...investment,
      amount: parseFloat(String(investment.amount || 0)),
      total_profit: parseFloat(String(investment.total_profit || 0)),
      daily_profit_rate: parseFloat(String(investment.daily_profit_rate || 0)),
    }));

    return NextResponse.json(investments);
  } catch (error) {
    console.error("Admin user investments fetch error:", error);
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
    const { investmentId, status, adminNotes } = body;

    if (!investmentId) {
      return NextResponse.json(
        { error: "Investment ID is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['active', 'completed', 'suspended', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update investment status
    const updateQuery = `
      UPDATE user_investments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(updateQuery, [status, investmentId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    // Log admin action if notes provided
    if (adminNotes) {
      await db.query(`
        INSERT INTO admin_actions (
          admin_id, action_type, target_type, target_id, 
          description, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        session.user.id,
        'investment_status_change',
        'user_investment',
        investmentId,
        adminNotes
      ]);
    }

    return NextResponse.json({
      message: "Investment status updated successfully",
      investment: result.rows[0]
    });

  } catch (error) {
    console.error("Investment status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
