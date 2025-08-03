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

    const query = `
      SELECT setting_key, setting_value, setting_type, description, category, is_editable
      FROM system_settings
      ORDER BY category, setting_key
    `;

    const result = await db.query(query);

    // Group settings by category
    const settingsByCategory = result.rows.reduce((acc: any, setting: any) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push({
        key: setting.setting_key,
        value: setting.setting_value,
        type: setting.setting_type,
        description: setting.description,
        editable: setting.is_editable
      });
      return acc;
    }, {});

    return NextResponse.json(settingsByCategory);
  } catch (error) {
    console.error("Admin settings fetch error:", error);
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
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: "Invalid settings data" },
        { status: 400 }
      );
    }

    await db.query('BEGIN');

    try {
      for (const setting of settings) {
        const { key, value } = setting;

        if (!key || value === undefined) {
          throw new Error(`Invalid setting: ${key}`);
        }

        // Validate specific settings
        if (key === 'max_withdrawal_percentage') {
          const percentage = parseFloat(value);
          if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            throw new Error('Withdrawal percentage must be between 0 and 100');
          }
        }

        if (key === 'min_withdrawal_amount' || key === 'max_withdrawal_amount') {
          const amount = parseFloat(value);
          if (isNaN(amount) || amount < 0) {
            throw new Error(`${key} must be a positive number`);
          }
        }

        // Update setting
        await db.query(`
          UPDATE system_settings
          SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
          WHERE setting_key = $2 AND is_editable = true
        `, [value, key]);
      }

      await db.query('COMMIT');

      return NextResponse.json({
        message: "Settings updated successfully"
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
