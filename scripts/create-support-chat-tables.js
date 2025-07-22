#!/usr/bin/env node

/**
 * Create support chat system database tables
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function createSupportChatTables() {
  console.log('💬 Creating Support Chat System Tables');
  console.log('=====================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // 1. Create support_tickets table
    console.log('🎫 Creating support_tickets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          subject VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
          priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'account', 'investment', 'withdrawal', 'technical', 'billing')),
          assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP WITH TIME ZONE,
          closed_at TIMESTAMP WITH TIME ZONE
      );
    `);
    
    // 2. Create support_messages table
    console.log('💬 Creating support_messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          message_type VARCHAR(20) DEFAULT 'user' CHECK (message_type IN ('user', 'admin', 'system', 'bot')),
          is_internal BOOLEAN DEFAULT false,
          attachments JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 3. Create support_categories table for chatbot responses
    console.log('🤖 Creating support_categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          keywords TEXT[], -- Array of keywords for matching
          auto_response TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 4. Create support_notifications table
    console.log('🔔 Creating support_notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
          message_id UUID REFERENCES support_messages(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 5. Create indexes for performance
    console.log('📊 Creating indexes...');
    
    // Support tickets indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
    `);
    
    // Support messages indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);
    `);
    
    // Support notifications indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_notifications_user_id ON support_notifications(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_notifications_is_read ON support_notifications(is_read);
    `);
    
    // 6. Insert default support categories for chatbot
    console.log('🤖 Inserting default support categories...');
    
    const defaultCategories = [
      {
        name: 'Account Login',
        description: 'Help with login issues',
        keywords: ['login', 'password', 'signin', 'access', 'forgot password', 'cant login'],
        auto_response: 'I can help you with login issues! Please try resetting your password using the "Forgot Password" link on the login page. If you continue to have issues, our support team will assist you further.'
      },
      {
        name: 'Investment Questions',
        description: 'General investment inquiries',
        keywords: ['investment', 'invest', 'plan', 'profit', 'returns', 'portfolio'],
        auto_response: 'Thank you for your interest in our investment plans! You can view all available investment options in your dashboard under the "Investments" section. Each plan shows the expected returns and duration. Would you like me to connect you with our investment advisor?'
      },
      {
        name: 'Withdrawal Issues',
        description: 'Help with withdrawal requests',
        keywords: ['withdrawal', 'withdraw', 'payout', 'money', 'funds', 'cash out'],
        auto_response: 'I can help you with withdrawal requests! You can submit a withdrawal request from your dashboard. Processing typically takes 1-3 business days. Please ensure your account is verified and you have sufficient balance. Is there a specific issue with your withdrawal?'
      },
      {
        name: 'Account Verification',
        description: 'Account verification help',
        keywords: ['verify', 'verification', 'document', 'kyc', 'identity'],
        auto_response: 'Account verification is important for security! Please upload a clear photo of your government-issued ID and proof of address in the verification section of your dashboard. Our team typically reviews documents within 24 hours.'
      },
      {
        name: 'General Support',
        description: 'General questions and support',
        keywords: ['help', 'support', 'question', 'issue', 'problem', 'assistance'],
        auto_response: 'Hello! I\'m here to help you with any questions or concerns. Please describe your issue in detail, and I\'ll do my best to assist you or connect you with the right team member.'
      }
    ];
    
    for (const category of defaultCategories) {
      await client.query(`
        INSERT INTO support_categories (name, description, keywords, auto_response)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          keywords = EXCLUDED.keywords,
          auto_response = EXCLUDED.auto_response
      `, [category.name, category.description, category.keywords, category.auto_response]);
    }
    
    console.log('✅ Support chat system tables created successfully!');
    console.log('\n📋 Created Tables:');
    console.log('   - support_tickets (ticket management)');
    console.log('   - support_messages (chat messages)');
    console.log('   - support_categories (chatbot responses)');
    console.log('   - support_notifications (notifications)');
    console.log('\n🤖 Chatbot Categories:');
    defaultCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createSupportChatTables();
}

module.exports = { createSupportChatTables };
