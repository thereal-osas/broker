import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const query = `
      SELECT * FROM system_settings
      ORDER BY key ASC
    `;

    const result = await db.query(query);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Admin settings fetch error:", error);
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

    // Start transaction
    await db.query('BEGIN');

    try {
      // Update each setting
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
          const updateQuery = `
            UPDATE system_settings 
            SET value = $1, updated_at = CURRENT_TIMESTAMP
            WHERE key = $2
          `;
          await db.query(updateQuery, [value, key]);
        }
      }

      await db.query('COMMIT');

      // Fetch updated settings
      const fetchQuery = "SELECT * FROM system_settings ORDER BY key ASC";
      const result = await db.query(fetchQuery);

      return NextResponse.json(result.rows);
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
