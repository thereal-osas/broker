import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userQueries } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch fresh user data from database
    const freshUserData = await userQueries.findById(session.user.id);

    if (!freshUserData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return updated user data that matches session structure
    const updatedUserData = {
      id: freshUserData.id,
      email: freshUserData.email,
      name: `${freshUserData.first_name} ${freshUserData.last_name}`,
      role: freshUserData.role,
      firstName: freshUserData.first_name,
      lastName: freshUserData.last_name,
      phone: freshUserData.phone,
      emailVerified: freshUserData.email_verified,
      referralCode: freshUserData.referral_code,
      isActive: freshUserData.is_active,
    };

    return NextResponse.json({
      message: "Session data refreshed",
      user: updatedUserData,
      // Include a flag to indicate if status changed
      statusChanged: session.user.isActive !== freshUserData.is_active,
    });
  } catch (error) {
    console.error("Session refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
