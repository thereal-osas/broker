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

    const body = await request.json();
    const { isActive } = body;
    const userId = params.id;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE users 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND role = 'investor'
      RETURNING *
    `;

    const result = await db.query(query, [isActive, userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("User status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
