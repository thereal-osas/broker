import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

interface DatabaseUserResult {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
  total_balance: string | null;
  profit_balance: string | null;
  deposit_balance: string | null;
  bonus_balance: string | null;
  credit_score_balance: string | null;
}

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
        u.*,
        ub.total_balance,
        ub.profit_balance,
        ub.deposit_balance,
        ub.bonus_balance,
        ub.credit_score_balance
      FROM users u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE u.role = 'investor'
      ORDER BY u.created_at DESC
    `;

    const result = await db.query(query);

    const users = result.rows.map((user: DatabaseUserResult) => ({
      ...user,
      balance: {
        total_balance: parseFloat(user.total_balance || "0"),
        profit_balance: parseFloat(user.profit_balance || "0"),
        deposit_balance: parseFloat(user.deposit_balance || "0"),
        bonus_balance: parseFloat(user.bonus_balance || "0"),
        credit_score_balance: parseFloat(user.credit_score_balance || "0"),
      },
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
