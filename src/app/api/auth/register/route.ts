import { NextRequest, NextResponse } from "next/server";
import { userQueries, balanceQueries, db } from "../../../../../lib/db";
import {
  validateRegistration,
  generateReferralCode,
} from "../../../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, referralCode } = body;

    // Validate input data
    const validation = validateRegistration({
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await userQueries.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Check if referral code is valid (if provided)
    let referredBy = null;
    if (referralCode) {
      const referrer = await userQueries.findByReferralCode(referralCode);
      if (!referrer) {
        return NextResponse.json(
          { error: "Invalid referral code" },
          { status: 400 }
        );
      }
      referredBy = referrer.id;
    }

    // Generate unique referral code for new user
    let newReferralCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      newReferralCode = generateReferralCode();
      const existing = await userQueries.findByReferralCode(newReferralCode);
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: "Failed to generate unique referral code" },
        { status: 500 }
      );
    }

    // Create new user
    const newUser = await userQueries.createUser({
      email: email.toLowerCase(),
      password, // Plain text as requested
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || null,
      role: "investor",
      referralCode: newReferralCode,
      referredBy,
    });

    // Create initial balance for user
    await balanceQueries.createUserBalance(newUser.id);

    // If user was referred, create referral record
    if (referredBy) {
      await db.query(
        `
        INSERT INTO referrals (referrer_id, referred_id)
        VALUES ($1, $2)
      `,
        [referredBy, newUser.id]
      );
    }

    // Return success response (excluding password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
