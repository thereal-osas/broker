import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this ticket
    const ticketCheck = await db.query(`
      SELECT user_id FROM support_tickets WHERE id = $1
    `, [ticketId]);

    if (ticketCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = ticketCheck.rows[0];

    // Check if user has access (owner or admin)
    if (session.user.role !== 'admin' && ticket.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get messages
    const messagesResult = await db.query(`
      SELECT 
        sm.*,
        u.first_name || ' ' || u.last_name as sender_name,
        u.email as sender_email,
        u.role as sender_role
      FROM support_messages sm
      JOIN users u ON sm.sender_id = u.id
      WHERE sm.ticket_id = $1
      AND (sm.is_internal = false OR $2 = 'admin')
      ORDER BY sm.created_at ASC
    `, [ticketId, session.user.role]);

    const messages = messagesResult.rows.map((message: Record<string, unknown>) => ({
      ...message,
      attachments: message.attachments || [],
    }));

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Support messages fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ticketId, message, isInternal } = body;

    if (!ticketId || !message) {
      return NextResponse.json(
        { error: "Ticket ID and message are required" },
        { status: 400 }
      );
    }

    // Verify ticket exists and user has access
    const ticketResult = await db.query(`
      SELECT 
        st.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      WHERE st.id = $1
    `, [ticketId]);

    if (ticketResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = ticketResult.rows[0];

    // Check access permissions
    if (session.user.role !== 'admin' && ticket.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Only admins can send internal messages
    const messageIsInternal = isInternal && session.user.role === 'admin';

    // Determine message type
    let messageType = 'user';
    if (session.user.role === 'admin') {
      messageType = 'admin';
    }

    // Create the message
    const messageResult = await db.query(`
      INSERT INTO support_messages (
        ticket_id, sender_id, message, message_type, is_internal
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [ticketId, session.user.id, message, messageType, messageIsInternal]);

    const newMessage = messageResult.rows[0];

    // Update ticket status if needed
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      await db.query(`
        UPDATE support_tickets 
        SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [ticketId]);
    } else if (ticket.status === 'open') {
      await db.query(`
        UPDATE support_tickets 
        SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [ticketId]);
    }

    // Create notifications
    if (!messageIsInternal) {
      if (session.user.role === 'admin') {
        // Notify the ticket owner
        await db.query(`
          INSERT INTO support_notifications (
            user_id, ticket_id, message_id, type, title, message
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          ticket.user_id,
          ticketId,
          newMessage.id,
          'admin_reply',
          'Admin Reply to Your Ticket',
          `You have a new reply to your support ticket: ${ticket.subject}`
        ]);
      } else {
        // Notify admins
        const adminUsers = await db.query(`
          SELECT id FROM users WHERE role = 'admin' AND is_active = true
        `);

        for (const admin of adminUsers.rows) {
          await db.query(`
            INSERT INTO support_notifications (
              user_id, ticket_id, message_id, type, title, message
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            admin.id,
            ticketId,
            newMessage.id,
            'user_reply',
            'User Reply to Support Ticket',
            `${ticket.user_name} replied to ticket: ${ticket.subject}`
          ]);
        }
      }
    }

    // Get the complete message with sender info
    const completeMessageResult = await db.query(`
      SELECT 
        sm.*,
        u.first_name || ' ' || u.last_name as sender_name,
        u.email as sender_email,
        u.role as sender_role
      FROM support_messages sm
      JOIN users u ON sm.sender_id = u.id
      WHERE sm.id = $1
    `, [newMessage.id]);

    return NextResponse.json({
      message: "Message sent successfully",
      data: completeMessageResult.rows[0]
    });

  } catch (error) {
    console.error("Support message creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
