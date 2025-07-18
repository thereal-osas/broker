import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const query = `
      SELECT 
        dr.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM deposit_requests dr
      JOIN users u ON dr.user_id = u.id
      ORDER BY dr.created_at DESC
    `;

    const result = await db.query(query);

    const deposits = result.rows.map((deposit: Record<string, unknown>) => ({
      ...deposit,
      amount: parseFloat(String(deposit.amount)),
    }));

    return NextResponse.json(deposits);
  } catch (error) {
    console.error("Admin deposits fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
