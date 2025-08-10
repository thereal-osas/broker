import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

interface DatabaseUserResult {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
  total_balance: string | null;
  card_balance: string | null;
  credit_score_balance: string | null;
}

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
        u.*,
        ub.total_balance,
        ub.card_balance,
        ub.credit_score_balance
      FROM users u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE u.role = 'investor'
      ORDER BY u.created_at DESC
    `;

    const result = await db.query(query);

    const users = result.rows.map((user: DatabaseUserResult) => ({
      id: user.id,
      email: user.email,
      password: user.password,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      email_verified: user.email_verified,
      referral_code: user.referral_code,
      referred_by: user.referred_by,
      created_at: user.created_at,
      updated_at: user.updated_at,
      balance: {
        total_balance: parseFloat(user.total_balance || "0"),
        card_balance: parseFloat(user.card_balance || "0"),
        credit_score_balance: parseInt(user.credit_score_balance || "0"),
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
