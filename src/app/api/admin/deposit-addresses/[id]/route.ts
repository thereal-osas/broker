import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT - Update deposit address
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
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
    } = body;

    // Validation
    if (!payment_method || !label || !address) {
      return NextResponse.json(
        { error: "Payment method, label, and address are required" },
        { status: 400 }
      );
    }

    // Validate address format
    const validationError = validateAddress(payment_method, address);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await db.transaction(async (client) => {
      // Get old value for audit log
      const oldValueResult = await client.query(
        "SELECT * FROM deposit_addresses WHERE id = $1",
        [id]
      );

      if (oldValueResult.rows.length === 0) {
        throw new Error("Deposit address not found");
      }

      const oldValue = oldValueResult.rows[0];

      // Update deposit address
      const updateQuery = `
        UPDATE deposit_addresses
        SET 
          payment_method = $1,
          label = $2,
          address = $3,
          network = $4,
          qr_code_url = $5,
          is_active = $6,
          display_order = $7,
          min_deposit = $8,
          max_deposit = $9,
          instructions = $10,
          updated_by = $11
        WHERE id = $12
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
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
        id,
      ]);

      const updatedAddress = updateResult.rows[0];

      // Log the update in audit log
      await client.query(
        `INSERT INTO deposit_address_audit_log (
          deposit_address_id,
          action,
          changed_by,
          old_value,
          new_value
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          "updated",
          session.user.id,
          JSON.stringify(oldValue),
          JSON.stringify(updatedAddress),
        ]
      );

      return updatedAddress;
    });

    return NextResponse.json({
      message: "Deposit address updated successfully",
      address: result,
    });
  } catch (error) {
    console.error("Error updating deposit address:", error);
    return NextResponse.json(
      {
        error: "Failed to update deposit address",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete deposit address
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const result = await db.transaction(async (client) => {
      // Get address details for audit log
      const addressResult = await client.query(
        "SELECT * FROM deposit_addresses WHERE id = $1",
        [id]
      );

      if (addressResult.rows.length === 0) {
        throw new Error("Deposit address not found");
      }

      const address = addressResult.rows[0];

      // Log the deletion in audit log
      await client.query(
        `INSERT INTO deposit_address_audit_log (
          deposit_address_id,
          action,
          changed_by,
          old_value
        ) VALUES ($1, $2, $3, $4)`,
        [id, "deleted", session.user.id, JSON.stringify(address)]
      );

      // Delete the deposit address
      await client.query("DELETE FROM deposit_addresses WHERE id = $1", [id]);

      return address;
    });

    return NextResponse.json({
      message: "Deposit address deleted successfully",
      address: result,
    });
  } catch (error) {
    console.error("Error deleting deposit address:", error);
    return NextResponse.json(
      {
        error: "Failed to delete deposit address",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Toggle active status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { is_active } = body;

    const result = await db.transaction(async (client) => {
      // Update active status
      const updateResult = await client.query(
        `UPDATE deposit_addresses
         SET is_active = $1, updated_by = $2
         WHERE id = $3
         RETURNING *`,
        [is_active, session.user.id, id]
      );

      if (updateResult.rows.length === 0) {
        throw new Error("Deposit address not found");
      }

      const updatedAddress = updateResult.rows[0];

      // Log the status change in audit log
      await client.query(
        `INSERT INTO deposit_address_audit_log (
          deposit_address_id,
          action,
          changed_by,
          new_value
        ) VALUES ($1, $2, $3, $4)`,
        [
          id,
          is_active ? "activated" : "deactivated",
          session.user.id,
          JSON.stringify({ is_active }),
        ]
      );

      return updatedAddress;
    });

    return NextResponse.json({
      message: `Deposit address ${result.is_active ? "activated" : "deactivated"} successfully`,
      address: result,
    });
  } catch (error) {
    console.error("Error toggling deposit address status:", error);
    return NextResponse.json(
      {
        error: "Failed to toggle deposit address status",
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

  if (address.length < 20) {
    return "Address is too short";
  }

  return null;
}

