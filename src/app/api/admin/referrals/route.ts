import { NextRequest, NextResponse } from "next/server";
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

    // Get all referral relationships with commission details
    const query = `
      SELECT 
        r.*,
        u1.first_name || ' ' || u1.last_name as referrer_name,
        u1.email as referrer_email,
        u1.referral_code as referrer_code,
        u2.first_name || ' ' || u2.last_name as referred_name,
        u2.email as referred_email,
        COALESCE(SUM(ui.amount), 0) as total_invested
      FROM referrals r
      JOIN users u1 ON r.referrer_id = u1.id
      JOIN users u2 ON r.referred_id = u2.id
      LEFT JOIN user_investments ui ON r.referred_id = ui.user_id
      GROUP BY r.id, u1.first_name, u1.last_name, u1.email, u1.referral_code,
               u2.first_name, u2.last_name, u2.email
      ORDER BY r.created_at DESC
    `;

    const result = await db.query(query);

    const referrals = result.rows.map((referral: Record<string, unknown>) => ({
      ...referral,
      commission_earned: parseFloat(String(referral.commission_earned || 0)),
      total_invested: parseFloat(String(referral.total_invested || 0)),
      commission_rate: parseFloat(String(referral.commission_rate || 0)),
    }));

    return NextResponse.json(referrals);
  } catch (error) {
    console.error("Admin referrals fetch error:", error);
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
    const { referralId, commissionEarned, commissionPaid, adminNotes } = body;

    if (!referralId) {
      return NextResponse.json(
        { error: "Referral ID is required" },
        { status: 400 }
      );
    }

    // Update referral commission
    const updateQuery = `
      UPDATE referrals 
      SET commission_earned = $1, commission_paid = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      commissionEarned,
      commissionPaid || false,
      referralId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // If commission is being paid, create transaction record
    if (commissionPaid && commissionEarned > 0) {
      const referral = result.rows[0];
      
      // Create transaction for referrer
      await db.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, 
          reference_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        referral.referrer_id,
        'referral_commission',
        commissionEarned,
        'total',
        adminNotes || `Referral commission payment`,
        referralId,
        'completed'
      ]);

      // Update referrer's balance
      await db.query(`
        UPDATE user_balances 
        SET total_balance = total_balance + $1
        WHERE user_id = $2
      `, [commissionEarned, referral.referrer_id]);
    }

    return NextResponse.json({
      message: "Referral commission updated successfully",
      referral: result.rows[0]
    });

  } catch (error) {
    console.error("Referral commission update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
