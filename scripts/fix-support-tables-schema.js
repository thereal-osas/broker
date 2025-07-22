#!/usr/bin/env node

/**
 * Fix support tables schema issues
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function fixSupportTablesSchema() {
  console.log('🔧 Fixing Support Tables Schema');
  console.log('===============================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // 1. Check current support_tickets schema
    console.log('📋 Checking current support_tickets schema...');
    
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'support_tickets' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    const currentColumns = columnsResult.rows.map(row => row.column_name);
    
    // 2. Add missing columns if needed
    const requiredColumns = [
      { name: 'description', type: 'TEXT', sql: 'ADD COLUMN description TEXT' },
      { name: 'category', type: 'VARCHAR(50)', sql: "ADD COLUMN category VARCHAR(50) DEFAULT 'general'" },
      { name: 'priority', type: 'VARCHAR(10)', sql: "ADD COLUMN priority VARCHAR(10) DEFAULT 'medium'" }
    ];
    
    console.log('\n🔧 Adding missing columns...');
    
    for (const column of requiredColumns) {
      if (!currentColumns.includes(column.name)) {
        try {
          await client.query(`ALTER TABLE support_tickets ${column.sql}`);
          console.log(`✅ Added column: ${column.name}`);
        } catch (error) {
          console.log(`⚠️  Column ${column.name}: ${error.message}`);
        }
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // 3. Add constraints if missing
    console.log('\n🔒 Adding constraints...');
    
    const constraints = [
      {
        name: 'support_tickets_status_check',
        sql: "ADD CONSTRAINT support_tickets_status_check CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))"
      },
      {
        name: 'support_tickets_priority_check', 
        sql: "ADD CONSTRAINT support_tickets_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))"
      },
      {
        name: 'support_tickets_category_check',
        sql: "ADD CONSTRAINT support_tickets_category_check CHECK (category IN ('general', 'account', 'investment', 'withdrawal', 'technical', 'billing'))"
      }
    ];
    
    for (const constraint of constraints) {
      try {
        await client.query(`ALTER TABLE support_tickets ${constraint.sql}`);
        console.log(`✅ Added constraint: ${constraint.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`✅ Constraint ${constraint.name} already exists`);
        } else {
          console.log(`⚠️  Constraint ${constraint.name}: ${error.message}`);
        }
      }
    }
    
    // 4. Check support_messages schema
    console.log('\n📨 Checking support_messages schema...');
    
    const messagesColumnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'support_messages' 
      ORDER BY ordinal_position
    `);
    
    const messageColumns = messagesColumnsResult.rows.map(row => row.column_name);
    
    const requiredMessageColumns = [
      { name: 'message_type', type: 'VARCHAR(20)', sql: "ADD COLUMN message_type VARCHAR(20) DEFAULT 'user'" },
      { name: 'is_internal', type: 'BOOLEAN', sql: 'ADD COLUMN is_internal BOOLEAN DEFAULT false' }
    ];
    
    for (const column of requiredMessageColumns) {
      if (!messageColumns.includes(column.name)) {
        try {
          await client.query(`ALTER TABLE support_messages ${column.sql}`);
          console.log(`✅ Added column to support_messages: ${column.name}`);
        } catch (error) {
          console.log(`⚠️  Column ${column.name}: ${error.message}`);
        }
      } else {
        console.log(`✅ Column ${column.name} already exists in support_messages`);
      }
    }
    
    // 5. Add message type constraint
    try {
      await client.query(`
        ALTER TABLE support_messages 
        ADD CONSTRAINT support_messages_type_check 
        CHECK (message_type IN ('user', 'admin', 'system', 'bot'))
      `);
      console.log('✅ Added message type constraint');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Message type constraint already exists');
      } else {
        console.log(`⚠️  Message type constraint: ${error.message}`);
      }
    }
    
    // 6. Verify final schema
    console.log('\n✅ Final Schema Verification');
    console.log('============================');
    
    const finalTicketsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'support_tickets' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nsupport_tickets table:');
    finalTicketsSchema.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    const finalMessagesSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'support_messages' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nsupport_messages table:');
    finalMessagesSchema.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    console.log('\n🎉 Schema fix completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the support system: node scripts/test-support-system.js');
    console.log('2. Build the application: npm run build');
    console.log('3. Deploy with confidence!');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixSupportTablesSchema();
}

module.exports = { fixSupportTablesSchema };
