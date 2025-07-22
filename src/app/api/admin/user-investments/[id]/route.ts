import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { db } from "../../../../../../lib/db";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { status, adminNotes } = body;

    // Check if investment exists
    const checkQuery = `
      SELECT ui.*, u.email as user_email, ip.name as plan_name
      FROM user_investments ui
      JOIN users u ON ui.user_id = u.id
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.id = $1
    `;
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const investment = checkResult.rows[0];

    // Validate status
    const validStatuses = ['active', 'completed', 'suspended', 'cancelled', 'deactivated'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Valid statuses: " + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    // Always update the timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) { // Only timestamp update
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(id);

    const updateQuery = `
      UPDATE user_investments 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    // Log admin action
    await db.query(`
      INSERT INTO admin_actions (
        admin_id, action_type, target_type, target_id, 
        details, created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      session.user.id,
      'investment_status_change',
      'user_investment',
      id,
      JSON.stringify({
        old_status: investment.status,
        new_status: status,
        user_email: investment.user_email,
        plan_name: investment.plan_name,
        amount: investment.amount,
        admin_notes: adminNotes || null
      })
    ]);

    return NextResponse.json({
      message: "Investment updated successfully",
      investment: result.rows[0]
    });

  } catch (error) {
    console.error("Investment update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Get investment details with user and plan information
    const query = `
      SELECT 
        ui.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        ip.name as plan_name,
        ip.daily_profit_rate,
        ip.duration_days,
        ip.min_amount,
        ip.max_amount
      FROM user_investments ui
      JOIN users u ON ui.user_id = u.id
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const investment = {
      ...result.rows[0],
      amount: parseFloat(String(result.rows[0].amount || 0)),
      total_profit: parseFloat(String(result.rows[0].total_profit || 0)),
      daily_profit_rate: parseFloat(String(result.rows[0].daily_profit_rate || 0)),
    };

    return NextResponse.json(investment);

  } catch (error) {
    console.error("Investment fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Get investment details before deletion for logging
    const investmentQuery = `
      SELECT ui.*, u.email as user_email, ip.name as plan_name
      FROM user_investments ui
      JOIN users u ON ui.user_id = u.id
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.id = $1
    `;
    const investmentResult = await db.query(investmentQuery, [id]);

    if (investmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const investment = investmentResult.rows[0];

    // Check if investment can be deleted (only if not active)
    if (investment.status === 'active') {
      return NextResponse.json(
        { error: "Cannot delete active investment. Deactivate it first." },
        { status: 400 }
      );
    }

    // Delete the investment
    const deleteQuery = "DELETE FROM user_investments WHERE id = $1 RETURNING *";
    const result = await db.query(deleteQuery, [id]);

    // Log admin action
    await db.query(`
      INSERT INTO admin_actions (
        admin_id, action_type, target_type, target_id, 
        details, created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      session.user.id,
      'investment_deletion',
      'user_investment',
      id,
      JSON.stringify({
        user_email: investment.user_email,
        plan_name: investment.plan_name,
        amount: investment.amount,
        status: investment.status,
        total_profit: investment.total_profit
      })
    ]);

    return NextResponse.json({ 
      message: "Investment deleted successfully",
      deleted_investment: result.rows[0]
    });

  } catch (error) {
    console.error("Investment deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
