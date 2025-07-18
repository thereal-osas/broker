import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const userResult = await db.query(
      "SELECT id, email, email_verified FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await db.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id) 
       DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
      [user.id, verificationToken, expiresAt]
    );

    // In a real application, you would send an email here
    // For now, we'll return the verification link for testing
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify?token=${verificationToken}`;

    return NextResponse.json({
      message: "Verification email sent",
      // Remove this in production - only for testing
      verificationUrl: process.env.NODE_ENV === 'development' ? verificationUrl : undefined
    });

  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find the verification token
    const tokenResult = await db.query(
      `SELECT evt.*, u.email FROM email_verification_tokens evt
       JOIN users u ON evt.user_id = u.id
       WHERE evt.token = $1 AND evt.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    const tokenData = tokenResult.rows[0];

    // Update user as verified
    await db.query(
      "UPDATE users SET email_verified = true WHERE id = $1",
      [tokenData.user_id]
    );

    // Delete the verification token
    await db.query(
      "DELETE FROM email_verification_tokens WHERE user_id = $1",
      [tokenData.user_id]
    );

    return NextResponse.json({
      message: "Email verified successfully",
      email: tokenData.email
    });

  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
