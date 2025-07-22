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

    // Get user's referral code
    const userQuery = "SELECT referral_code FROM users WHERE id = $1";
    const userResult = await db.query(userQuery, [session.user.id]);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const referralCode = userResult.rows[0].referral_code;

    // Get referral statistics
    const statsQuery = `
      SELECT 
        COUNT(r.id) as total_referrals,
        COALESCE(SUM(r.commission_earned), 0) as total_commission,
        COALESCE(SUM(CASE WHEN r.commission_paid = false THEN r.commission_earned ELSE 0 END), 0) as pending_commission
      FROM referrals r
      WHERE r.referrer_id = $1
    `;
    const statsResult = await db.query(statsQuery, [session.user.id]);
    const stats = statsResult.rows[0];

    // Get detailed referral list (without investment details for privacy)
    const referralsQuery = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.created_at,
        r.commission_earned
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY u.created_at DESC
    `;
    const referralsResult = await db.query(referralsQuery, [session.user.id]);

    const referrals = referralsResult.rows.map((referral: Record<string, unknown>) => ({
      ...referral,
      commission_earned: parseFloat(String(referral.commission_earned || 0)),
    }));

    const response = {
      referral_code: referralCode,
      total_referrals: parseInt(stats.total_referrals || 0),
      total_commission: parseFloat(stats.total_commission || 0),
      pending_commission: parseFloat(stats.pending_commission || 0),
      referrals: referrals,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Referrals fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
