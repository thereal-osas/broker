import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get platform settings from system_settings table
    const query = `
      SELECT setting_key, setting_value, setting_type
      FROM system_settings
      WHERE setting_key IN (
        'max_withdrawal_percentage',
        'min_withdrawal_amount',
        'max_withdrawal_amount',
        'withdrawal_processing_fee',
        'withdrawal_fee_percentage'
      )
    `;

    const result = await db.query(query);

    // Convert to key-value object with proper type conversion
    const settings: Record<string, any> = {};
    result.rows.forEach(row => {
      let value = row.setting_value;

      // Convert based on type
      if (row.setting_type === 'number') {
        value = parseFloat(value);
      } else if (row.setting_type === 'boolean') {
        value = value === 'true';
      } else if (row.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if JSON parsing fails
        }
      }

      settings[row.setting_key] = value;
    });

    // Set defaults if not found
    const defaultSettings = {
      max_withdrawal_percentage: 100, // 100% of balance by default
      min_withdrawal_amount: 50,
      max_withdrawal_amount: 50000,
      withdrawal_processing_fee: 0,
      withdrawal_fee_percentage: 0
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
