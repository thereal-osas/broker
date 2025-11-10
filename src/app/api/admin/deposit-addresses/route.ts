import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Fetch all deposit addresses
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
      SELECT 
        id,
        payment_method,
        label,
        address,
        network,
        qr_code_url,
        is_active,
        display_order,
        min_deposit,
        max_deposit,
        instructions,
        created_at,
        updated_at
      FROM deposit_addresses
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

// POST - Create new deposit address
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      payment_method,
      label,
      address,
      network,
      qr_code_url,
      is_active = true,
      display_order = 0,
      min_deposit = 10.0,
      max_deposit,
      instructions,
    } = body;

    // Validation
    if (!payment_method || !label || !address) {
      return NextResponse.json(
        { error: "Payment method, label, and address are required" },
        { status: 400 }
      );
    }

    // Validate address format based on payment method
    const validationError = validateAddress(payment_method, address);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await db.transaction(async (client) => {
      // Insert new deposit address
      const insertQuery = `
        INSERT INTO deposit_addresses (
          payment_method,
          label,
          address,
          network,
          qr_code_url,
          is_active,
          display_order,
          min_deposit,
          max_deposit,
          instructions,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        payment_method,
        label,
        address,
        network,
        qr_code_url,
        is_active,
        display_order,
        min_deposit,
        max_deposit,
        instructions,
        session.user.id,
        session.user.id,
      ]);

      const newAddress = insertResult.rows[0];

      // Log the creation in audit log
      await client.query(
        `INSERT INTO deposit_address_audit_log (
          deposit_address_id,
          action,
          changed_by,
          new_value
        ) VALUES ($1, $2, $3, $4)`,
        [
          newAddress.id,
          "created",
          session.user.id,
          JSON.stringify(newAddress),
        ]
      );

      return newAddress;
    });

    return NextResponse.json({
      message: "Deposit address created successfully",
      address: result,
    });
  } catch (error) {
    console.error("Error creating deposit address:", error);
    return NextResponse.json(
      {
        error: "Failed to create deposit address",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to validate cryptocurrency addresses
function validateAddress(
  paymentMethod: string,
  address: string
): string | null {
  // Basic validation - can be enhanced with more sophisticated checks
  const validations: Record<string, RegExp> = {
    bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
    ethereum: /^0x[a-fA-F0-9]{40}$/,
    usdt: /^0x[a-fA-F0-9]{40}$|^T[A-Za-z1-9]{33}$/, // ERC20 or TRC20
    litecoin: /^(ltc1|[LM3])[a-zA-HJ-NP-Z0-9]{26,62}$/,
    bnb: /^0x[a-fA-F0-9]{40}$|^bnb1[a-z0-9]{38}$/,
    cardano: /^addr1[a-z0-9]{58,}$/,
    solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    dogecoin: /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/,
    polygon: /^0x[a-fA-F0-9]{40}$/,
  };

  const pattern = validations[paymentMethod.toLowerCase()];

  if (pattern && !pattern.test(address)) {
    return `Invalid ${paymentMethod} address format`;
  }

  // Check for minimum length
  if (address.length < 20) {
    return "Address is too short";
  }

  return null;
}

