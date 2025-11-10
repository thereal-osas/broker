// Script to create an admin user for testing
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Creating admin user...\n');

    // Check if admin user already exists
    const existingAdmin = await pool.query(`
      SELECT id, email, role FROM users WHERE email = 'admin@example.com'
    `);

    if (existingAdmin.rows.length > 0) {
      console.log('✓ Admin user already exists:');
      console.log(`  Email: ${existingAdmin.rows[0].email}`);
      console.log(`  ID: ${existingAdmin.rows[0].id}`);
      console.log(`  Role: ${existingAdmin.rows[0].role}`);
      
      // Update role to admin if it's not
      if (existingAdmin.rows[0].role !== 'admin') {
        await pool.query(`
          UPDATE users SET role = 'admin' WHERE id = $1
        `, [existingAdmin.rows[0].id]);
        console.log('\n✓ Updated role to admin');
      }
    } else {
      // Create new admin user
      const result = await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, email_verified)
        VALUES ('admin@example.com', 'admin123', 'Admin', 'User', 'admin', true)
        RETURNING id, email, role
      `);

      console.log('✓ Created new admin user:');
      console.log(`  Email: ${result.rows[0].email}`);
      console.log(`  ID: ${result.rows[0].id}`);
      console.log(`  Role: ${result.rows[0].role}`);
      console.log(`  Password: admin123`);

      // Create balance record
      await pool.query(`
        INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
        VALUES ($1, 0, 0, 0)
      `, [result.rows[0].id]);

      console.log('\n✓ Created balance record for admin user');
    }

    console.log('\n✓ Admin user is ready!');
    console.log('\nYou can now login with:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUser();

