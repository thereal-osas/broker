#!/usr/bin/env node

/**
 * Environment Switcher Script
 * 
 * This script helps you quickly switch between local and production configurations
 * by commenting/uncommenting the appropriate sections in your .env file.
 * 
 * Usage:
 *   node scripts/switch-environment.js local
 *   node scripts/switch-environment.js production
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(process.cwd(), '.env');

function readEnvFile() {
  try {
    return fs.readFileSync(ENV_FILE, 'utf8');
  } catch (error) {
    console.error('❌ Error reading .env file:', error.message);
    process.exit(1);
  }
}

function writeEnvFile(content) {
  try {
    fs.writeFileSync(ENV_FILE, content, 'utf8');
    console.log('✅ .env file updated successfully');
  } catch (error) {
    console.error('❌ Error writing .env file:', error.message);
    process.exit(1);
  }
}

function switchToLocal(content) {
  console.log('🔄 Switching to LOCAL development configuration...');
  
  // Uncomment local database config
  content = content.replace(/^# (DB_HOST=localhost)/gm, '$1');
  content = content.replace(/^# (DB_PORT=5432)/gm, '$1');
  content = content.replace(/^# (DB_NAME=broker_platform)/gm, '$1');
  content = content.replace(/^# (DB_USER=postgres)/gm, '$1');
  content = content.replace(/^# (DB_PASSWORD="Mirror1#@")/gm, '$1');
  content = content.replace(/^# (DATABASE_URL="postgresql:\/\/postgres:Mirror1#@localhost:5432\/broker_platform")/gm, '$1');
  
  // Comment out production database config
  content = content.replace(/^(DB_HOST=postgres-mxht\.railway\.internal)/gm, '# $1');
  content = content.replace(/^(DB_NAME=railway)/gm, '# $1');
  content = content.replace(/^(DB_PASSWORD="UUHFHLmfoRLVNTSTbDgrGxsNWTgDCbCx")/gm, '# $1');
  content = content.replace(/^(DATABASE_URL="postgresql:\/\/postgres:UUHFHLmfoRLVNTSTbDgrGxsNWTgDCbCx@turntable\.proxy\.rlwy\.net:30859\/railway")/gm, '# $1');
  
  // Uncomment local app config
  content = content.replace(/^# (APP_URL=http:\/\/localhost:3000)/gm, '$1');
  
  // Comment out production app config
  content = content.replace(/^(APP_URL=https:\/\/broker-weld\.vercel\.app)/gm, '# $1');
  
  return content;
}

function switchToProduction(content) {
  console.log('🔄 Switching to PRODUCTION configuration...');
  
  // Comment out local database config
  content = content.replace(/^(DB_HOST=localhost)/gm, '# $1');
  content = content.replace(/^(DB_NAME=broker_platform)/gm, '# $1');
  content = content.replace(/^(DB_PASSWORD="Mirror1#@")/gm, '# $1');
  content = content.replace(/^(DATABASE_URL="postgresql:\/\/postgres:Mirror1#@localhost:5432\/broker_platform")/gm, '# $1');
  
  // Uncomment production database config
  content = content.replace(/^# (DB_HOST=postgres-mxht\.railway\.internal)/gm, '$1');
  content = content.replace(/^# (DB_NAME=railway)/gm, '$1');
  content = content.replace(/^# (DB_PASSWORD="UUHFHLmfoRLVNTSTbDgrGxsNWTgDCbCx")/gm, '$1');
  content = content.replace(/^# (DATABASE_URL="postgresql:\/\/postgres:UUHFHLmfoRLVNTSTbDgrGxsNWTgDCbCx@turntable\.proxy\.rlwy\.net:30859\/railway")/gm, '$1');
  
  // Comment out local app config
  content = content.replace(/^(APP_URL=http:\/\/localhost:3000)/gm, '# $1');
  
  // Uncomment production app config
  content = content.replace(/^# (APP_URL=https:\/\/broker-weld\.vercel\.app)/gm, '$1');
  
  return content;
}

function showCurrentConfig(content) {
  console.log('📋 Current Configuration:');
  console.log('========================');
  
  // Check which database config is active
  const localDbActive = content.includes('DB_HOST=localhost') && !content.includes('# DB_HOST=localhost');
  const prodDbActive = content.includes('DB_HOST=postgres-mxht.railway.internal') && !content.includes('# DB_HOST=postgres-mxht.railway.internal');
  
  if (localDbActive) {
    console.log('🏠 Database: LOCAL (localhost:5432/broker_platform)');
  } else if (prodDbActive) {
    console.log('☁️  Database: PRODUCTION (Railway)');
  } else {
    console.log('❓ Database: Unknown configuration');
  }
  
  // Check which app URL is active
  const localAppActive = content.includes('APP_URL=http://localhost:3000') && !content.includes('# APP_URL=http://localhost:3000');
  const prodAppActive = content.includes('APP_URL=https://broker-weld.vercel.app') && !content.includes('# APP_URL=https://broker-weld.vercel.app');
  
  if (localAppActive) {
    console.log('🌐 App URL: LOCAL (http://localhost:3000)');
  } else if (prodAppActive) {
    console.log('🌐 App URL: PRODUCTION (https://broker-weld.vercel.app)');
  } else {
    console.log('❓ App URL: Unknown configuration');
  }
  
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || !['local', 'production', 'status'].includes(command)) {
    console.log('🔧 Environment Switcher');
    console.log('=======================');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/switch-environment.js local      - Switch to local development');
    console.log('  node scripts/switch-environment.js production - Switch to production');
    console.log('  node scripts/switch-environment.js status     - Show current configuration');
    console.log('');
    process.exit(1);
  }
  
  let content = readEnvFile();
  
  if (command === 'status') {
    showCurrentConfig(content);
    return;
  }
  
  showCurrentConfig(content);
  
  if (command === 'local') {
    content = switchToLocal(content);
  } else if (command === 'production') {
    content = switchToProduction(content);
  }
  
  writeEnvFile(content);
  
  console.log('');
  showCurrentConfig(content);
  
  console.log('⚠️  Important: Restart your development server for changes to take effect!');
  
  if (command === 'local') {
    console.log('');
    console.log('📋 Next steps for local development:');
    console.log('1. Ensure PostgreSQL is running locally');
    console.log('2. Run: node scripts/setup-local-development.js');
    console.log('3. Start dev server: npm run dev');
  } else if (command === 'production') {
    console.log('');
    console.log('📋 Next steps for production:');
    console.log('1. Ensure Railway database is accessible');
    console.log('2. Start dev server: npm run dev');
    console.log('3. Or deploy to Vercel');
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
