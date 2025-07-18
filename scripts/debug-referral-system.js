#!/usr/bin/env node

/**
 * Debug referral system functionality
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function debugReferralSystem() {
  console.log('🔍 Debugging Referral System');
  console.log('============================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // 1. Check if referrals table exists and its structure
    console.log('📋 Checking referrals table structure...');
    const tableCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'referrals' 
      ORDER BY ordinal_position
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Referrals table does not exist!');
      
      // Create the referrals table
      console.log('🔧 Creating referrals table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS referrals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            commission_rate DECIMAL(5,4) DEFAULT 0.0500,
            commission_earned DECIMAL(15,2) DEFAULT 0.00,
            commission_paid BOOLEAN DEFAULT false,
            total_commission DECIMAL(15,2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(referrer_id, referred_id)
        );
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
      `);
      
      console.log('✅ Referrals table created successfully');
    } else {
      console.log('✅ Referrals table exists with columns:');
      tableCheck.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check if commission_earned and commission_paid columns exist
      const hasCommissionEarned = tableCheck.rows.some(col => col.column_name === 'commission_earned');
      const hasCommissionPaid = tableCheck.rows.some(col => col.column_name === 'commission_paid');
      
      if (!hasCommissionEarned) {
        console.log('🔧 Adding commission_earned column...');
        await client.query(`
          ALTER TABLE referrals 
          ADD COLUMN commission_earned DECIMAL(15,2) DEFAULT 0.00
        `);
      }
      
      if (!hasCommissionPaid) {
        console.log('🔧 Adding commission_paid column...');
        await client.query(`
          ALTER TABLE referrals 
          ADD COLUMN commission_paid BOOLEAN DEFAULT false
        `);
      }
    }
    
    // 2. Check users with referral codes
    console.log('\n👥 Checking users with referral codes...');
    const usersWithCodes = await client.query(`
      SELECT id, email, first_name, last_name, referral_code, role 
      FROM users 
      WHERE referral_code IS NOT NULL 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${usersWithCodes.rows.length} users with referral codes:`);
    usersWithCodes.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - Code: ${user.referral_code}`);
    });
    
    // 3. Check users without referral codes
    const usersWithoutCodes = await client.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE referral_code IS NULL
    `);
    
    console.log(`\n⚠️  Users without referral codes: ${usersWithoutCodes.rows[0].count}`);
    
    // 4. Generate referral codes for users without them
    if (parseInt(usersWithoutCodes.rows[0].count) > 0) {
      console.log('🔧 Generating referral codes for users without them...');
      
      const usersNeedingCodes = await client.query(`
        SELECT id, email, first_name, last_name 
        FROM users 
        WHERE referral_code IS NULL
      `);
      
      for (const user of usersNeedingCodes.rows) {
        // Generate a unique referral code
        const timestamp = Date.now().toString();
        const nameCode = (user.first_name.substring(0, 2) + user.last_name.substring(0, 2)).toUpperCase();
        const referralCode = nameCode + timestamp.substring(timestamp.length - 6);
        
        await client.query(`
          UPDATE users 
          SET referral_code = $1 
          WHERE id = $2
        `, [referralCode, user.id]);
        
        console.log(`   ✅ Generated code ${referralCode} for ${user.email}`);
      }
    }
    
    // 5. Test API endpoint simulation
    console.log('\n🌐 Testing referral data retrieval...');
    
    // Get a test user
    const testUser = await client.query(`
      SELECT id, email, referral_code 
      FROM users 
      WHERE role = 'investor' AND referral_code IS NOT NULL 
      LIMIT 1
    `);
    
    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      console.log(`Testing with user: ${user.email} (Code: ${user.referral_code})`);
      
      // Simulate the API query
      const statsQuery = `
        SELECT 
          COUNT(r.id) as total_referrals,
          COALESCE(SUM(r.commission_earned), 0) as total_commission,
          COALESCE(SUM(CASE WHEN r.commission_paid = false THEN r.commission_earned ELSE 0 END), 0) as pending_commission
        FROM referrals r
        WHERE r.referrer_id = $1
      `;
      
      const statsResult = await client.query(statsQuery, [user.id]);
      const stats = statsResult.rows[0];
      
      console.log('📊 Referral stats:');
      console.log(`   Total referrals: ${stats.total_referrals}`);
      console.log(`   Total commission: $${stats.total_commission}`);
      console.log(`   Pending commission: $${stats.pending_commission}`);
      
      // Test the complete API response structure
      const response = {
        referral_code: user.referral_code,
        total_referrals: parseInt(stats.total_referrals || 0),
        total_commission: parseFloat(stats.total_commission || 0),
        pending_commission: parseFloat(stats.pending_commission || 0),
        referrals: []
      };
      
      console.log('\n📝 API Response structure:');
      console.log(JSON.stringify(response, null, 2));
      
    } else {
      console.log('❌ No investor users found for testing');
    }
    
    // 6. Check for any referral relationships
    console.log('\n🔗 Checking existing referral relationships...');
    const referralCount = await client.query(`
      SELECT COUNT(*) as count FROM referrals
    `);
    
    console.log(`Total referral relationships: ${referralCount.rows[0].count}`);
    
    if (parseInt(referralCount.rows[0].count) > 0) {
      const sampleReferrals = await client.query(`
        SELECT 
          r.*,
          u1.email as referrer_email,
          u2.email as referred_email
        FROM referrals r
        JOIN users u1 ON r.referrer_id = u1.id
        JOIN users u2 ON r.referred_id = u2.id
        LIMIT 5
      `);
      
      console.log('Sample referral relationships:');
      sampleReferrals.rows.forEach((ref, index) => {
        console.log(`   ${index + 1}. ${ref.referrer_email} → ${ref.referred_email} (Commission: $${ref.commission_earned || 0})`);
      });
    }
    
    console.log('\n🎉 Referral system debug completed!');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run debug if called directly
if (require.main === module) {
  debugReferralSystem();
}

module.exports = { debugReferralSystem };
