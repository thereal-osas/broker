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
    const { status, assigned_to } = body;

    // Validate status
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Check if ticket exists
    const checkQuery = "SELECT id FROM support_tickets WHERE id = $1";
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Support ticket not found" },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (assigned_to !== undefined) {
      updateFields.push(`assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
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
      UPDATE support_tickets 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Support ticket update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
