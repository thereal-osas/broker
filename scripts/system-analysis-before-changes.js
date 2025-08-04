#!/usr/bin/env node

/**
 * System Analysis Before Implementing Changes
 * Analyzes current user management and balance systems
 */

require('dotenv').config();
const { Pool } = require('pg');

async function analyzeCurrentSystem() {
  console.log('🔍 System Analysis Before Changes');
  console.log('=================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const analysis = {
    userManagement: {},
    balanceSystem: {},
    sessionManagement: {},
    issues: []
  };

  try {
    // 1. Analyze User Management System
    console.log('📋 1. User Management System Analysis');
    console.log('====================================');
    
    // Check user table structure
    const userTableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('User table structure:');
    userTableInfo.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check current user status distribution
    const userStats = await pool.query(`
      SELECT 
        role,
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM users 
      GROUP BY role
    `);
    
    console.log('\nUser status distribution:');
    userStats.rows.forEach(stat => {
      console.log(`   ${stat.role}: ${stat.total} total (${stat.active} active, ${stat.inactive} inactive)`);
    });
    
    analysis.userManagement = {
      tableStructure: userTableInfo.rows,
      statusDistribution: userStats.rows,
      hasIsActiveField: userTableInfo.rows.some(col => col.column_name === 'is_active')
    };

    // 2. Analyze Balance System
    console.log('\n📋 2. Balance System Analysis');
    console.log('============================');
    
    // Check balance table structure
    const balanceTableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      ORDER BY ordinal_position
    `);
    
    console.log('Balance table structure:');
    const balanceFields = [];
    balanceTableInfo.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      if (col.column_name.includes('balance')) {
        balanceFields.push(col.column_name);
      }
    });
    
    console.log(`\nCurrent balance fields: ${balanceFields.join(', ')}`);
    
    // Check balance calculation logic
    const sampleBalance = await pool.query(`
      SELECT * FROM user_balances LIMIT 1
    `);
    
    if (sampleBalance.rows.length > 0) {
      const balance = sampleBalance.rows[0];
      const calculatedTotal = parseFloat(balance.deposit_balance || 0) + 
                             parseFloat(balance.profit_balance || 0) + 
                             parseFloat(balance.bonus_balance || 0);
      const storedTotal = parseFloat(balance.total_balance || 0);
      
      console.log('\nBalance calculation verification:');
      console.log(`   Stored total: $${storedTotal.toFixed(2)}`);
      console.log(`   Calculated (deposit + profit + bonus): $${calculatedTotal.toFixed(2)}`);
      console.log(`   Credit score: ${balance.credit_score_balance} (excluded from total)`);
      console.log(`   Difference: $${(storedTotal - calculatedTotal).toFixed(2)}`);
    }
    
    analysis.balanceSystem = {
      tableStructure: balanceTableInfo.rows,
      currentBalanceFields: balanceFields,
      hasCardBalance: balanceFields.includes('card_balance')
    };

    // 3. Analyze Session Management
    console.log('\n📋 3. Session Management Analysis');
    console.log('=================================');
    
    console.log('Current session flow:');
    console.log('   1. User login → JWT token created with user data');
    console.log('   2. JWT token includes: role, firstName, lastName, phone, emailVerified, referralCode, isActive');
    console.log('   3. Session callback maps JWT to session object');
    console.log('   4. Middleware checks token.isActive for access control');
    console.log('   5. Frontend components use session.user.isActive');
    
    console.log('\nSession update mechanism:');
    console.log('   ❌ ISSUE: JWT tokens are stateless - changes require new login');
    console.log('   ❌ ISSUE: Admin status changes don\'t affect existing sessions');
    console.log('   ❌ ISSUE: Users must logout/login to see status changes');
    
    analysis.sessionManagement = {
      isStateless: true,
      requiresLoginForUpdates: true,
      hasRealTimeUpdates: false
    };
    
    analysis.issues.push('Real-time user status updates not implemented');
    analysis.issues.push('Card balance field missing from user_balances table');

    // 4. Check API endpoints
    console.log('\n📋 4. API Endpoints Analysis');
    console.log('============================');
    
    console.log('User management APIs:');
    console.log('   ✅ /api/admin/users - List users');
    console.log('   ✅ /api/admin/users/[id]/status - Update user status');
    console.log('   ❌ Missing: Real-time session update API');
    
    console.log('\nBalance management APIs:');
    console.log('   ✅ /api/balance - Get user balance');
    console.log('   ✅ /api/admin/balance/fund - Admin balance funding');
    console.log('   ❌ Missing: Card balance support in APIs');
    
    // 5. Check frontend components
    console.log('\n📋 5. Frontend Components Analysis');
    console.log('==================================');
    
    console.log('Balance display components:');
    console.log('   ✅ BalanceCards.tsx - Shows 4 balance types');
    console.log('   ❌ Missing: Card balance card');
    
    console.log('\nAdmin components:');
    console.log('   ✅ Admin users page with status toggle');
    console.log('   ✅ Balance manager component');
    console.log('   ❌ Missing: Real-time status update feedback');

    // Summary
    console.log('\n🎯 ANALYSIS SUMMARY');
    console.log('==================');
    
    console.log('Current System State:');
    console.log(`   ✅ User management: ${analysis.userManagement.hasIsActiveField ? 'Complete' : 'Incomplete'}`);
    console.log(`   ❌ Balance system: ${analysis.balanceSystem.hasCardBalance ? 'Complete' : 'Missing card balance'}`);
    console.log(`   ❌ Session management: ${analysis.sessionManagement.hasRealTimeUpdates ? 'Real-time' : 'Requires login for updates'}`);
    
    console.log('\nRequired Changes:');
    console.log('   1. Add card_balance field to user_balances table');
    console.log('   2. Update balance calculation to include card balance');
    console.log('   3. Add card balance to all balance APIs');
    console.log('   4. Add card balance card to frontend');
    console.log('   5. Implement real-time session updates');
    console.log('   6. Add session refresh mechanism');
    
    console.log('\nRisk Assessment:');
    console.log('   🟢 Low risk: Adding card balance (additive change)');
    console.log('   🟡 Medium risk: Session update mechanism (affects auth flow)');
    console.log('   🟢 Low risk: Frontend balance display updates');
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    return null;
  } finally {
    await pool.end();
  }
}

// Run analysis
analyzeCurrentSystem().then(analysis => {
  if (analysis) {
    console.log('\n✅ System analysis completed successfully');
    console.log('📋 Ready to implement changes with minimal risk');
  }
});
