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
    const { isActive, emailVerified } = body;
    const userId = params.id;

    // Validate inputs
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Invalid isActive value" },
        { status: 400 }
      );
    }

    if (emailVerified !== undefined && typeof emailVerified !== "boolean") {
      return NextResponse.json(
        { error: "Invalid emailVerified value" },
        { status: 400 }
      );
    }

    if (isActive === undefined && emailVerified === undefined) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(isActive);
      paramCount++;
    }

    if (emailVerified !== undefined) {
      updateFields.push(`email_verified = $${paramCount}`);
      values.push(emailVerified);
      paramCount++;
    }

    // Always update timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND role = 'investor'
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = result.rows[0];

    // If user was deactivated, invalidate their session
    if (isActive === false) {
      try {
        // Add session invalidation timestamp to force logout on next request
        await db.query(
          `UPDATE users SET session_invalidated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [userId]
        );

        console.log(`Session invalidated for deactivated user: ${updatedUser.email}`);
      } catch (sessionError) {
        console.error("Failed to invalidate session:", sessionError);
        // Don't fail the main operation if session invalidation fails
      }
    }

    // Build success message
    const messages = [];
    if (isActive !== undefined) {
      messages.push(`${isActive ? "activated" : "deactivated"}`);
    }
    if (emailVerified !== undefined) {
      messages.push(`email ${emailVerified ? "verified" : "unverified"}`);
    }

    return NextResponse.json({
      message: `User ${messages.join(" and ")} successfully`,
      user: updatedUser,
      sessionInvalidated: isActive === false ? true : undefined,
    });
  } catch (error) {
    console.error("User status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
