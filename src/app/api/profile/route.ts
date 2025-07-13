import { NextRequest, NextResponse } from "next/server";
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

    const query = "SELECT * FROM users WHERE id = $1";
    const result = await db.query(query, [session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = result.rows[0];
    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userProfile } = user;

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { first_name, last_name, phone } = body;

    // Validation
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE users 
      SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(query, [
      first_name,
      last_name,
      phone,
      session.user.id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = result.rows[0];
    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userProfile } = user;

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
