const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: "postgres", // Connect to default database first
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
};

const targetDatabase = process.env.DB_NAME || "broker_platform";

async function setupDatabase() {
  const pool = new Pool(dbConfig);

  try {
    console.log("🔄 Setting up database...");

    // Check if database exists
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
    const dbExists = await pool.query(checkDbQuery, [targetDatabase]);

    if (dbExists.rows.length === 0) {
      // Create database
      console.log(`📦 Creating database: ${targetDatabase}`);
      await pool.query(`CREATE DATABASE ${targetDatabase}`);
    } else {
      console.log(`✅ Database ${targetDatabase} already exists`);
    }

    await pool.end();

    // Connect to the target database
    const targetPool = new Pool({
      ...dbConfig,
      database: targetDatabase,
    });

    // Read and execute schema
    const schemaPath = path.join(__dirname, "../database/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    console.log("🏗️  Creating tables and schema...");
    await targetPool.query(schema);

    console.log("✅ Database setup completed successfully!");

    await targetPool.end();
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
