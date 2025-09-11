#!/usr/bin/env node

/**
 * Switch to Local Testing Environment
 *
 * Safely switches your .env.local to use local database for testing
 * while backing up your production configuration.
 */

const fs = require("fs");
const path = require("path");

function switchToLocalTesting() {
  console.log("🔄 Switching to Local Testing Environment");
  console.log("========================================\n");

  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envBackupPath = path.join(
    process.cwd(),
    ".env.local.production.backup"
  );

  try {
    // Step 1: Backup current .env.local
    if (fs.existsSync(envLocalPath)) {
      console.log("📋 Step 1: Backing up current .env.local...");
      fs.copyFileSync(envLocalPath, envBackupPath);
      console.log("✅ Backup created: .env.local.production.backup");
    }

    // Step 2: Create local testing configuration
    console.log("\n📋 Step 2: Creating local testing configuration...");

    const localTestingConfig = `# Local Testing Environment Configuration
# This file is configured for safe local testing

# Local PostgreSQL Database (SAFE FOR TESTING)
DATABASE_URL="postgresql://postgres:Mirror1#@localhost:5432/broker_local_test"

# Local Development Settings
NODE_ENV="development"
TESTING_MODE="true"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="local-testing-secret-key"

# Application Configuration
APP_NAME="CredCrypto (Local Testing)"
APP_URL="http://localhost:3000"

# Email Configuration (disabled for local testing)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
FROM_EMAIL="test@localhost"

# WhatsApp Configuration (disabled for local testing)
WHATSAPP_NUMBER="+1234567890"

# File Upload Configuration
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE="5242880"

# Security
JWT_SECRET="local-testing-jwt-secret"

# Cryptocurrency Wallet Addresses (test values)
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN="test-bitcoin-address"
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM="test-ethereum-address"
NEXT_PUBLIC_CRYPTO_WALLET_USDT="test-usdt-address"

# Cron Job Configuration (disabled for local testing)
CRON_SECRET="local-test-cron-secret"

# Production Database (BACKED UP - DO NOT USE)
# PRODUCTION_DATABASE_URL="postgresql://postgres:UUHFHLmfoRLVNTSTbDgrGxsNWTgDCbCx@postgres-mxht.railway.internal:5432/railway"
`;

    fs.writeFileSync(envLocalPath, localTestingConfig);
    console.log("✅ Local testing configuration created");

    // Step 3: Verify the switch
    console.log("\n📋 Step 3: Verifying configuration...");

    const newConfig = fs.readFileSync(envLocalPath, "utf8");
    const isLocalDb = newConfig.includes("broker_local_test");
    const isTestingMode = newConfig.includes('TESTING_MODE="true"');
    // Check that production URL is commented out or not present in active config
    const noProductionDb = !newConfig.match(/^DATABASE_URL=.*railway/m);

    console.log(`Database: ${isLocalDb ? "✅ Local" : "❌ Production"}`);
    console.log(
      `Testing Mode: ${isTestingMode ? "✅ Enabled" : "❌ Disabled"}`
    );
    console.log(`Production Safety: ${noProductionDb ? "✅ Safe" : "❌ Risk"}`);

    if (isLocalDb && isTestingMode && noProductionDb) {
      console.log("\n🎯 ENVIRONMENT SWITCH SUCCESSFUL");
      console.log("===============================");
      console.log(
        "✅ Your application is now configured for safe local testing"
      );
      console.log("✅ Production database is protected");
      console.log("✅ All changes will only affect your local test database");

      console.log("\n📋 Next Steps:");
      console.log("1. Run: node scripts/setup-local-testing-db.js");
      console.log("2. Restart your development server");
      console.log("3. Test the failing functionalities");
      console.log("4. When done, run: node scripts/switch-to-production.js");
    } else {
      console.log("\n❌ ENVIRONMENT SWITCH FAILED");
      console.log("Please check the configuration manually");
    }
  } catch (error) {
    console.error("❌ Switch failed:", error.message);

    // Restore backup if something went wrong
    if (fs.existsSync(envBackupPath)) {
      console.log("🔄 Restoring backup...");
      fs.copyFileSync(envBackupPath, envLocalPath);
      console.log("✅ Backup restored");
    }
  }
}

switchToLocalTesting();
