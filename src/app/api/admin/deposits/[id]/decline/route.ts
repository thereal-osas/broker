import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../lib/auth";
import { db } from "../../../../../../../lib/db";

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
    const { adminNotes } = body;

    // Get deposit request details
    const depositQuery = `
      SELECT dr.*, u.email as user_email
      FROM deposit_requests dr
      JOIN users u ON dr.user_id = u.id
      WHERE dr.id = $1
    `;
    const depositResult = await db.query(depositQuery, [id]);

    if (depositResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Deposit request not found" },
        { status: 404 }
      );
    }

    const depositRequest = depositResult.rows[0];

    if (depositRequest.status !== 'pending') {
      return NextResponse.json(
        { error: "Deposit request is not pending" },
        { status: 400 }
      );
    }

    // Update deposit request status
    const updateQuery = `
      UPDATE deposit_requests 
      SET status = 'declined', admin_notes = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      adminNotes || 'Deposit declined',
      session.user.id,
      id
    ]);

    return NextResponse.json({
      message: "Deposit declined successfully",
      deposit: result.rows[0]
    });

  } catch (error) {
    console.error("Deposit decline error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
