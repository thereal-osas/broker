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
      SELECT 
        st.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        COUNT(tr.id) as responses_count
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN ticket_responses tr ON st.id = tr.ticket_id
      GROUP BY st.id, u.first_name, u.last_name, u.email
      ORDER BY st.created_at DESC
    `;

    const result = await db.query(query);

    const tickets = result.rows.map((ticket: any) => ({
      ...ticket,
      responses_count: parseInt(ticket.responses_count || 0),
    }));

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Admin support tickets fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
