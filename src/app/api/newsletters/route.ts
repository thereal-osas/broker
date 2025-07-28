import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get only published newsletters for users
    const query = `
      SELECT
        n.id,
        n.title,
        n.content,
        n.image_url,
        n.published_at,
        n.created_at,
        u.first_name || ' ' || u.last_name as author_name
      FROM newsletters n
      JOIN users u ON n.author_id = u.id
      WHERE n.is_published = true
      ORDER BY n.published_at DESC, n.created_at DESC
    `;

    const result = await db.query(query);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Newsletters fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
