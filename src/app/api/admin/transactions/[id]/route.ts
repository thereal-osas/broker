import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { db } from "../../../../../../lib/db";

// GET - Get transaction details
export async function GET(
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

    const { id } = await params;

    const result = await db.query(
      `SELECT t.*, u.email, u.first_name, u.last_name
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update transaction date
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

    const { id } = await params;
    const body = await request.json();
    const { created_at } = body;

    // Validate input
    if (!created_at) {
      return NextResponse.json(
        { error: "Transaction date is required" },
        { status: 400 }
      );
    }

    // Validate date
    const dateObj = new Date(created_at);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Check if transaction exists
    const checkResult = await db.query(
      "SELECT id FROM transactions WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Update transaction date
    const result = await db.query(
      `UPDATE transactions
       SET created_at = $1
       WHERE id = $2
       RETURNING *`,
      [created_at, id]
    );

    return NextResponse.json({
      message: "Transaction date updated successfully",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating transaction date:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction (optional feature)
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

    const { id } = await params;

    // Check if transaction exists
    const checkResult = await db.query(
      "SELECT id FROM transactions WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Delete transaction
    await db.query("DELETE FROM transactions WHERE id = $1", [id]);

    return NextResponse.json({
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

