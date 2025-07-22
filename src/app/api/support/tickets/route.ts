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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        st.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        admin_user.first_name || ' ' || admin_user.last_name as assigned_admin_name,
        (
          SELECT COUNT(*)::int 
          FROM support_messages sm 
          WHERE sm.ticket_id = st.id
        ) as message_count,
        (
          SELECT sm.created_at 
          FROM support_messages sm 
          WHERE sm.ticket_id = st.id 
          ORDER BY sm.created_at DESC 
          LIMIT 1
        ) as last_message_at
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN users admin_user ON st.assigned_to = admin_user.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    // Filter by user if not admin
    if (session.user.role !== 'admin') {
      query += ` AND st.user_id = $${paramIndex}`;
      queryParams.push(session.user.id);
      paramIndex++;
    }

    // Filter by status if provided
    if (status) {
      query += ` AND st.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    query += ` ORDER BY st.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    const tickets = result.rows.map((ticket: Record<string, unknown>) => ({
      ...ticket,
      message_count: parseInt(String(ticket.message_count || 0)),
    }));

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Support tickets fetch error:", error);
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
    const { subject, description, category, priority } = body;

    if (!subject || !description) {
      return NextResponse.json(
        { error: "Subject and description are required" },
        { status: 400 }
      );
    }

    // Create the ticket (handle both old and new schema)
    const ticketResult = await db.query(`
      INSERT INTO support_tickets (
        user_id, subject, message, description, category, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      session.user.id,
      subject,
      description, // for message column (legacy)
      description, // for description column (new)
      category || 'general',
      priority || 'medium',
      'open'
    ]);

    const ticket = ticketResult.rows[0];

    // Create initial message
    await db.query(`
      INSERT INTO support_messages (
        ticket_id, sender_id, message, message_type
      ) VALUES ($1, $2, $3, $4)
    `, [ticket.id, session.user.id, description, 'user']);

    // Check for automated response
    const autoResponse = await checkForAutomatedResponse(subject + ' ' + description);
    if (autoResponse) {
      // Create bot response
      await db.query(`
        INSERT INTO support_messages (
          ticket_id, sender_id, message, message_type
        ) VALUES ($1, $2, $3, $4)
      `, [ticket.id, session.user.id, autoResponse, 'bot']);
    }

    // Create notification for admins
    const adminUsers = await db.query(`
      SELECT id FROM users WHERE role = 'admin' AND is_active = true
    `);

    for (const admin of adminUsers.rows) {
      await db.query(`
        INSERT INTO support_notifications (
          user_id, ticket_id, type, title, message
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        admin.id,
        ticket.id,
        'new_ticket',
        'New Support Ticket',
        `New ticket created: ${subject}`
      ]);
    }

    return NextResponse.json({
      message: "Support ticket created successfully",
      ticket: ticket,
      hasAutoResponse: !!autoResponse
    });

  } catch (error) {
    console.error("Support ticket creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function checkForAutomatedResponse(content: string): Promise<string | null> {
  try {
    const categories = await db.query(`
      SELECT * FROM support_categories WHERE is_active = true
    `);

    const contentLower = content.toLowerCase();

    for (const category of categories.rows) {
      const keywords = category.keywords || [];
      const hasKeyword = keywords.some((keyword: string) => 
        contentLower.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        return category.auto_response;
      }
    }

    return null;
  } catch (error) {
    console.error("Auto response check error:", error);
    return null;
  }
}
