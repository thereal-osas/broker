// Script to set up the database schema
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Setting up database schema...\n');

    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Add IF NOT EXISTS to CREATE TABLE statements
    schema = schema.replace(/CREATE TABLE (\w+) \(/g, 'CREATE TABLE IF NOT EXISTS $1 (');

    // Add IF NOT EXISTS to CREATE INDEX statements
    schema = schema.replace(/CREATE INDEX (\w+)/g, 'CREATE INDEX IF NOT EXISTS $1');

    console.log('Executing schema.sql (with IF NOT EXISTS)...');
    await pool.query(schema);
    console.log('✓ Database schema created successfully!\n');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('Tables created:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n✓ Database setup complete!');

  } catch (error) {
    console.error('Error setting up database:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();

