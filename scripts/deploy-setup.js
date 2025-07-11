#!/usr/bin/env node

// Deployment setup script for broker platform
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Broker Platform Deployment Setup\n');

// Check if Git is initialized
function checkGitSetup() {
  console.log('📋 Checking Git setup...');
  
  try {
    execSync('git status', { stdio: 'ignore' });
    console.log('✅ Git repository is initialized');
    return true;
  } catch (error) {
    console.log('❌ Git repository not initialized');
    return false;
  }
}

// Initialize Git repository
function initializeGit() {
  console.log('\n🔧 Initializing Git repository...');
  
  try {
    execSync('git init', { stdio: 'inherit' });
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Initial broker platform setup"', { stdio: 'inherit' });
    console.log('✅ Git repository initialized and initial commit created');
  } catch (error) {
    console.error('❌ Failed to initialize Git repository:', error.message);
    process.exit(1);
  }
}

// Create deployment branches
function createBranches() {
  console.log('\n🌿 Creating deployment branches...');
  
  const branches = ['development', 'staging'];
  
  branches.forEach(branch => {
    try {
      execSync(`git checkout -b ${branch}`, { stdio: 'ignore' });
      console.log(`✅ Created ${branch} branch`);
      execSync('git checkout main', { stdio: 'ignore' });
    } catch (error) {
      console.log(`⚠️  ${branch} branch may already exist`);
    }
  });
}

// Create environment template
function createEnvTemplate() {
  console.log('\n📄 Creating environment template...');
  
  const envTemplate = `# Broker Platform Environment Configuration
# Copy this file to .env.local and update with your values

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=broker_platform
DB_USER=postgres
DB_PASSWORD=your-database-password

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Cryptocurrency Wallet Addresses
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=your-bitcoin-address-here
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=your-ethereum-address-here
NEXT_PUBLIC_CRYPTO_WALLET_USDT=your-usdt-address-here
NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=your-litecoin-address-here

# Security
JWT_SECRET=your-jwt-secret-here
CRON_SECRET=your-cron-secret-here

# Application Configuration
APP_NAME=CredCrypto
APP_URL=http://localhost:3000
NODE_ENV=development

# Email Configuration (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=noreply@credcrypto.com

# WhatsApp Configuration
WHATSAPP_NUMBER=+1234567890
`;

  try {
    fs.writeFileSync('.env.example', envTemplate);
    console.log('✅ Created .env.example template');
    
    if (!fs.existsSync('.env.local')) {
      fs.writeFileSync('.env.local', envTemplate);
      console.log('✅ Created .env.local file (update with your values)');
    } else {
      console.log('⚠️  .env.local already exists, not overwriting');
    }
  } catch (error) {
    console.error('❌ Failed to create environment template:', error.message);
  }
}

// Create .gitignore if it doesn't exist
function createGitignore() {
  console.log('\n🚫 Setting up .gitignore...');
  
  const gitignoreContent = `# Dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Environment files
.env*
!.env.example

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Database
*.db
*.sqlite

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
`;

  try {
    if (!fs.existsSync('.gitignore')) {
      fs.writeFileSync('.gitignore', gitignoreContent);
      console.log('✅ Created .gitignore file');
    } else {
      console.log('⚠️  .gitignore already exists');
    }
  } catch (error) {
    console.error('❌ Failed to create .gitignore:', error.message);
  }
}

// Update package.json with deployment scripts
function updatePackageJson() {
  console.log('\n📦 Updating package.json with deployment scripts...');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add deployment scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "deploy:staging": "git checkout staging && git merge development && git push origin staging",
      "deploy:production": "git checkout main && git merge staging && git push origin main",
      "deploy:hotfix": "git checkout main && git push origin main",
      "validate": "npm run type-check && node scripts/validate-wallet-addresses.js",
      "type-check": "tsc --noEmit",
      "format": "prettier --write .",
      "prepare": "npm run validate"
    };
    
    // Add development dependencies if not present
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
    
    const devDeps = {
      "prettier": "^3.0.0",
      "@types/node": "^20.0.0"
    };
    
    Object.entries(devDeps).forEach(([dep, version]) => {
      if (!packageJson.devDependencies[dep] && !packageJson.dependencies[dep]) {
        packageJson.devDependencies[dep] = version;
      }
    });
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json with deployment scripts');
  } catch (error) {
    console.error('❌ Failed to update package.json:', error.message);
  }
}

// Create Vercel configuration
function createVercelConfig() {
  console.log('\n⚡ Creating Vercel configuration...');
  
  const vercelConfig = {
    "version": 2,
    "builds": [
      {
        "src": "package.json",
        "use": "@vercel/next"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "/$1"
      }
    ],
    "env": {
      "NODE_ENV": "production"
    },
    "functions": {
      "src/app/api/**/*.ts": {
        "maxDuration": 30
      }
    }
  };
  
  try {
    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
    console.log('✅ Created vercel.json configuration');
  } catch (error) {
    console.error('❌ Failed to create Vercel configuration:', error.message);
  }
}

// Main setup function
async function main() {
  try {
    // Check prerequisites
    const hasGit = checkGitSetup();
    
    if (!hasGit) {
      initializeGit();
    }
    
    // Setup deployment structure
    createBranches();
    createEnvTemplate();
    createGitignore();
    updatePackageJson();
    createVercelConfig();
    
    console.log('\n🎉 Deployment setup completed!\n');
    console.log('📋 Next steps:');
    console.log('   1. Update .env.local with your actual values');
    console.log('   2. Test locally: npm run dev');
    console.log('   3. Validate configuration: npm run validate');
    console.log('   4. Push to GitHub: git remote add origin <your-repo-url>');
    console.log('   5. Deploy to Vercel: Import your GitHub repository');
    console.log('\n📚 Read the deployment guide: docs/CONTINUOUS_DEPLOYMENT_GUIDE.md');
    console.log('\n🚀 Happy deploying!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  main();
}

module.exports = { main };
