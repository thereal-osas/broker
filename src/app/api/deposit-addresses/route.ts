import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Fetch active deposit addresses for users
export async function GET() {
  try {
    const query = `
      SELECT 
        id,
        payment_method,
        label,
        address,
        network,
        qr_code_url,
        display_order,
        min_deposit,
        max_deposit,
        instructions
      FROM deposit_addresses
      WHERE is_active = true
      ORDER BY display_order ASC, created_at DESC
    `;

    const result = await db.query(query);

    return NextResponse.json({
      addresses: result.rows.map((row) => ({
        ...row,
        min_deposit: parseFloat(row.min_deposit || 0),
        max_deposit: row.max_deposit ? parseFloat(row.max_deposit) : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching deposit addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch deposit addresses" },
      { status: 500 }
    );
  }
}

