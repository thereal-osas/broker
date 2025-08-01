const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function removeSupportEmail() {
  try {
    console.log('🧹 Removing support email from platform settings...\n');
    
    // Check if support_email exists
    const checkResult = await pool.query(`
      SELECT * FROM platform_settings WHERE key = 'support_email'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('📧 Found support_email setting:', checkResult.rows[0].value);
      
      // Remove support_email setting
      const deleteResult = await pool.query(`
        DELETE FROM platform_settings WHERE key = 'support_email'
      `);
      
      console.log('✅ Support email setting removed successfully!');
    } else {
      console.log('ℹ️  No support_email setting found in database');
    }
    
    // Show remaining platform settings
    const remainingResult = await pool.query(`
      SELECT key, value, description FROM platform_settings 
      WHERE key LIKE '%support%' OR key LIKE '%platform%'
      ORDER BY key
    `);
    
    console.log('\n📋 Remaining platform settings:');
    if (remainingResult.rows.length === 0) {
      console.log('   No platform/support settings found');
    } else {
      remainingResult.rows.forEach(setting => {
        console.log(`   ${setting.key}: ${setting.value}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error removing support email:', error.message);
  } finally {
    await pool.end();
  }
}

removeSupportEmail();
