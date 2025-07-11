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
        wr.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      ORDER BY wr.created_at DESC
    `;

    const result = await db.query(query);

    const withdrawals = result.rows.map((withdrawal: any) => ({
      ...withdrawal,
      amount: parseFloat(withdrawal.amount),
      account_details: typeof withdrawal.account_details === 'string' 
        ? JSON.parse(withdrawal.account_details) 
        : withdrawal.account_details,
    }));

    return NextResponse.json(withdrawals);
  } catch (error) {
    console.error("Admin withdrawals fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
