import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const query = `
      SELECT * FROM live_trade_plans 
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching live trade plans:", error);
    
    // Check if it's a table doesn't exist error
    if (error instanceof Error && error.message.includes('relation "live_trade_plans" does not exist')) {
      return NextResponse.json(
        { error: "Live trade system not available. Please contact support." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
