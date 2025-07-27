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

    // Check if newsletter exists
    const checkQuery = "SELECT * FROM newsletters WHERE id = $1";
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      );
    }

    const currentNewsletter = checkResult.rows[0];

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['title', 'content', 'image_url', 'is_published'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(body[field]);
        paramCount++;
      }
    }

    // Handle published_at field
    if (body.is_published !== undefined) {
      if (body.is_published && !currentNewsletter.is_published) {
        // Publishing for the first time
        updateFields.push(`published_at = CURRENT_TIMESTAMP`);
      } else if (!body.is_published && currentNewsletter.is_published) {
        // Unpublishing
        updateFields.push(`published_at = NULL`);
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
      UPDATE newsletters 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Newsletter update error:", error);
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

    // Delete the newsletter
    const deleteQuery = "DELETE FROM newsletters WHERE id = $1 RETURNING *";
    const result = await db.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Newsletter deleted successfully" });
  } catch (error) {
    console.error("Newsletter deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
