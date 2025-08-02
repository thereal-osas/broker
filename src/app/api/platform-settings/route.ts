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

    // Get platform settings
    const query = `
      SELECT key, value, description 
      FROM platform_settings 
      WHERE key IN (
        'max_withdrawal_percentage',
        'min_withdrawal_amount',
        'max_withdrawal_amount',
        'default_referral_commission'
      )
    `;

    const result = await db.query(query);
    
    // Convert to key-value object
    const settings: Record<string, string> = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    // Set defaults if not found
    const defaultSettings = {
      max_withdrawal_percentage: '100', // 100% of balance by default
      min_withdrawal_amount: '50',
      max_withdrawal_amount: '50000',
      default_referral_commission: '0.05'
    };

    // Merge with defaults
    const finalSettings = { ...defaultSettings, ...settings };

    return NextResponse.json(finalSettings);
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
