#!/usr/bin/env node

/**
 * Debug support messages
 */

require('dotenv').config();
const { Pool } = require('pg');

async function debugMessages() {
  console.log('🔍 Debugging Support Messages');
  console.log('=============================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // 1. Get all recent messages with user info
    console.log('📨 Recent Messages:');
    const result = await client.query(`
      SELECT 
        sm.*,
        u.first_name || ' ' || u.last_name as sender_name,
        u.email as sender_email,
        u.role as sender_role
      FROM support_messages sm
      JOIN users u ON sm.sender_id = u.id
      ORDER BY sm.created_at DESC
      LIMIT 10
    `);
    
    result.rows.forEach((msg, i) => {
      console.log(`${i+1}. ${msg.message_type} from ${msg.sender_name} (${msg.sender_role})`);
      console.log(`   Message: ${msg.message.substring(0, 80)}...`);
      console.log(`   Internal: ${msg.is_internal}, Created: ${msg.created_at}`);
      console.log(`   Ticket ID: ${msg.ticket_id}`);
      console.log('');
    });
    
    // 2. Test the API query for investors
    console.log('🔍 Testing API Query for Investors:');
    const investorQuery = await client.query(`
      SELECT 
        sm.*,
        u.first_name || ' ' || u.last_name as sender_name,
        u.email as sender_email,
        u.role as sender_role
      FROM support_messages sm
      JOIN users u ON sm.sender_id = u.id
      WHERE sm.ticket_id = (SELECT id FROM support_tickets LIMIT 1)
      AND (sm.is_internal = false OR $1 = 'admin')
      ORDER BY sm.created_at ASC
    `, ['investor']);
    
    console.log(`Found ${investorQuery.rows.length} messages for investor view:`);
    investorQuery.rows.forEach((msg, i) => {
      console.log(`${i+1}. ${msg.message_type} from ${msg.sender_name} (${msg.sender_role}): ${msg.message.substring(0, 50)}...`);
    });
    
    // 3. Test the API query for admins
    console.log('\n🔍 Testing API Query for Admins:');
    const adminQuery = await client.query(`
      SELECT 
        sm.*,
        u.first_name || ' ' || u.last_name as sender_name,
        u.email as sender_email,
        u.role as sender_role
      FROM support_messages sm
      JOIN users u ON sm.sender_id = u.id
      WHERE sm.ticket_id = (SELECT id FROM support_tickets LIMIT 1)
      AND (sm.is_internal = false OR $1 = 'admin')
      ORDER BY sm.created_at ASC
    `, ['admin']);
    
    console.log(`Found ${adminQuery.rows.length} messages for admin view:`);
    adminQuery.rows.forEach((msg, i) => {
      console.log(`${i+1}. ${msg.message_type} from ${msg.sender_name} (${msg.sender_role}): ${msg.message.substring(0, 50)}...`);
    });
    
    // 4. Check for any internal messages
    console.log('\n🔒 Internal Messages:');
    const internalQuery = await client.query(`
      SELECT 
        sm.*,
        u.first_name || ' ' || u.last_name as sender_name,
        u.role as sender_role
      FROM support_messages sm
      JOIN users u ON sm.sender_id = u.id
      WHERE sm.is_internal = true
      ORDER BY sm.created_at DESC
      LIMIT 5
    `);
    
    if (internalQuery.rows.length > 0) {
      console.log(`Found ${internalQuery.rows.length} internal messages:`);
      internalQuery.rows.forEach((msg, i) => {
        console.log(`${i+1}. ${msg.message_type} from ${msg.sender_name} (${msg.sender_role}): ${msg.message.substring(0, 50)}...`);
      });
    } else {
      console.log('No internal messages found');
    }
    
    // 5. Check user roles
    console.log('\n👥 User Roles:');
    const usersQuery = await client.query(`
      SELECT id, email, role, first_name || ' ' || last_name as name
      FROM users
      WHERE email IN ('john@gmail.com', 'admin@broker.com')
    `);
    
    usersQuery.rows.forEach(user => {
      console.log(`${user.name} (${user.email}): ${user.role} - ID: ${user.id}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  debugMessages();
}

module.exports = { debugMessages };
