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

    // Check if plan exists
    const checkQuery = "SELECT id FROM investment_plans WHERE id = $1";
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Investment plan not found" },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      "name",
      "description",
      "min_amount",
      "max_amount",
      "daily_profit_rate",
      "duration_days",
      "is_active",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(body[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE investment_plans 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Investment plan update error:", error);
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

    // Check if plan exists and get its status
    const planQuery = `
      SELECT is_active FROM investment_plans WHERE id = $1
    `;
    const planResult = await db.query(planQuery, [id]);

    if (planResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Investment plan not found" },
        { status: 404 }
      );
    }

    // Check if plan is active - if so, suggest deactivation first
    if (planResult.rows[0].is_active) {
      return NextResponse.json(
        {
          error:
            "Cannot delete active plan. Deactivate the plan first, then try deleting again.",
        },
        { status: 400 }
      );
    }

    // Check if plan has any active investments
    const activeInvestmentsQuery = `
      SELECT COUNT(*) as count
      FROM user_investments
      WHERE plan_id = $1 AND status = 'active'
    `;
    const activeInvestmentsResult = await db.query(activeInvestmentsQuery, [
      id,
    ]);

    if (parseInt(activeInvestmentsResult.rows[0].count) > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete plan with active investments. Deactivate the plan first to suspend active investments, then try deleting again.",
        },
        { status: 400 }
      );
    }

    // Check for any investments (active or inactive) that would prevent deletion
    const allInvestmentsQuery = `
      SELECT COUNT(*) as count,
             COUNT(CASE WHEN status != 'active' THEN 1 END) as inactive_count
      FROM user_investments
      WHERE plan_id = $1
    `;
    const allInvestmentsResult = await db.query(allInvestmentsQuery, [id]);
    const totalInvestments = parseInt(allInvestmentsResult.rows[0].count);
    const inactiveInvestments = parseInt(
      allInvestmentsResult.rows[0].inactive_count
    );

    if (totalInvestments > 0) {
      if (inactiveInvestments > 0) {
        // Delete inactive investments that are blocking the plan deletion
        const deleteInactiveQuery = `
          DELETE FROM user_investments
          WHERE plan_id = $1 AND status != 'active'
        `;
        await db.query(deleteInactiveQuery, [id]);

        console.log(
          `Deleted ${inactiveInvestments} inactive investments for plan ${id}`
        );
      }

      // Check again for any remaining investments
      const remainingQuery = `
        SELECT COUNT(*) as count
        FROM user_investments
        WHERE plan_id = $1
      `;
      const remainingResult = await db.query(remainingQuery, [id]);

      if (parseInt(remainingResult.rows[0].count) > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot delete plan with remaining investments. Please ensure all investments are properly handled.",
          },
          { status: 400 }
        );
      }
    }

    // Now attempt to delete the plan
    const deleteQuery =
      "DELETE FROM investment_plans WHERE id = $1 RETURNING *";
    const result = await db.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Investment plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Investment plan deleted successfully",
    });
  } catch (error) {
    console.error("Investment plan deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
