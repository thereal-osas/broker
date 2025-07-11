# 🔄 Continuous Deployment Guide - Broker Platform

This guide shows you how to deploy your broker platform with the ability to easily add features and make changes later.

## 🎯 Deployment Strategy Overview

We'll set up a **Git-based continuous deployment** workflow that automatically updates your live application when you push code changes.

## 🚀 Recommended Approach: Vercel + GitHub

### Why This Approach?
- ✅ **Automatic deployments** when you push to GitHub
- ✅ **Preview deployments** for testing changes
- ✅ **Easy rollbacks** if something goes wrong
- ✅ **Branch-based environments** (staging/production)
- ✅ **Built-in CI/CD** pipeline
- ✅ **Free tier available**

## 📋 Step-by-Step Setup

### Step 1: Prepare Your Repository

```bash
# Initialize Git repository (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial broker platform setup"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/broker-platform.git
git branch -M main
git push -u origin main
```

### Step 2: Set Up Branch Strategy

```bash
# Create development branch
git checkout -b development
git push -u origin development

# Create staging branch
git checkout -b staging
git push -u origin staging

# Return to main branch
git checkout main
```

**Branch Strategy:**
- `main` → Production environment
- `staging` → Testing environment
- `development` → Development environment
- `feature/*` → Feature branches

### Step 3: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign up/login
2. **Import your GitHub repository**
3. **Configure deployment settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 4: Configure Environment Variables

In Vercel dashboard, add these environment variables:

```env
# Database Configuration
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=broker_platform
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# NextAuth Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-production-secret

# Cryptocurrency Wallets
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=your-bitcoin-address
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=your-ethereum-address
NEXT_PUBLIC_CRYPTO_WALLET_USDT=your-usdt-address
NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=your-litecoin-address

# Security
JWT_SECRET=your-jwt-secret
CRON_SECRET=your-cron-secret

# Application
NODE_ENV=production
```

### Step 5: Set Up Database (Cloud)

#### Option A: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update environment variables in Vercel

#### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection details
5. Update environment variables

### Step 6: Configure Automatic Deployments

In Vercel, configure:
- **Production Branch**: `main`
- **Preview Branches**: `staging`, `development`
- **Auto-deploy**: Enabled for all branches

## 🔧 Development Workflow

### Adding New Features

```bash
# 1. Create feature branch
git checkout development
git pull origin development
git checkout -b feature/new-investment-plans

# 2. Make your changes
# Edit files, add features, etc.

# 3. Test locally
npm run dev

# 4. Commit and push
git add .
git commit -m "Add new investment plans feature"
git push origin feature/new-investment-plans

# 5. Create Pull Request to development branch
# This will create a preview deployment automatically
```

### Testing Changes

```bash
# 1. Merge to staging for testing
git checkout staging
git merge feature/new-investment-plans
git push origin staging

# 2. Test on staging environment
# Vercel will automatically deploy to staging URL

# 3. If tests pass, merge to production
git checkout main
git merge staging
git push origin main

# 4. Production deployment happens automatically
```

### Quick Hotfixes

```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/urgent-bug-fix

# 2. Make the fix
# Edit files

# 3. Test and deploy
git add .
git commit -m "Fix urgent bug in profit calculation"
git push origin hotfix/urgent-bug-fix

# 4. Merge directly to main for urgent fixes
git checkout main
git merge hotfix/urgent-bug-fix
git push origin main
```

## 🌍 Environment Setup

### Multiple Environments

You'll have these environments automatically:

1. **Production**: `https://your-app.vercel.app`
   - Connected to `main` branch
   - Production database
   - Real wallet addresses

2. **Staging**: `https://your-app-git-staging.vercel.app`
   - Connected to `staging` branch
   - Staging database (optional)
   - Test wallet addresses

3. **Development**: `https://your-app-git-development.vercel.app`
   - Connected to `development` branch
   - Development database
   - Test wallet addresses

4. **Feature Previews**: `https://your-app-git-feature-name.vercel.app`
   - Automatic for each feature branch
   - Temporary environments for testing

### Environment-Specific Configuration

Create different environment files for each environment:

```bash
# .env.production
NEXTAUTH_URL=https://your-app.vercel.app
DB_NAME=broker_platform_prod

# .env.staging  
NEXTAUTH_URL=https://your-app-git-staging.vercel.app
DB_NAME=broker_platform_staging

# .env.development
NEXTAUTH_URL=https://your-app-git-development.vercel.app
DB_NAME=broker_platform_dev
```

## 🔄 Database Migration Strategy

### For Schema Changes

Create migration scripts in `scripts/migrations/`:

```javascript
// scripts/migrations/001_add_new_feature.js
const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN new_feature_flag BOOLEAN DEFAULT false;
    `);
    
    console.log('Migration 001 completed successfully');
  } catch (error) {
    console.error('Migration 001 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
```

### Run Migrations

```bash
# Add to package.json scripts
"migrate": "node scripts/migrations/run-migrations.js"

# Run migrations after deployment
npm run migrate
```

## 📱 Mobile-First Development

### Testing on Mobile

```bash
# Test locally on mobile devices
npm run dev -- --hostname 0.0.0.0

# Access from mobile: http://your-local-ip:3000
```

### Progressive Web App (PWA)

Add PWA capabilities for mobile users:

```bash
# Install PWA dependencies
npm install next-pwa

# Configure in next.config.ts
const withPWA = require('next-pwa')({
  dest: 'public'
});

module.exports = withPWA({
  // your existing config
});
```

## 🔍 Monitoring & Analytics

### Add Monitoring

```bash
# Install monitoring tools
npm install @vercel/analytics @vercel/speed-insights

# Add to your app
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
```

### Error Tracking

```bash
# Install Sentry for error tracking
npm install @sentry/nextjs

# Configure Sentry
npx @sentry/wizard -i nextjs
```

## 🚀 Quick Deployment Commands

### Deploy Current Changes
```bash
# Quick deploy to staging
git add .
git commit -m "Update: describe your changes"
git push origin staging

# Deploy to production
git checkout main
git merge staging
git push origin main
```

### Rollback if Needed
```bash
# Rollback to previous version
git checkout main
git reset --hard HEAD~1
git push --force origin main
```

## 🔧 Local Development Setup

### Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Set up database
npm run db:setup
npm run db:seed

# Start development
npm run dev
```

### Development Tools
```bash
# Add development tools
npm install --save-dev @types/node typescript eslint prettier

# Add scripts to package.json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit",
  "format": "prettier --write .",
  "db:setup": "node scripts/setup-db.js",
  "db:seed": "node scripts/seed-db.js",
  "migrate": "node scripts/migrations/run-migrations.js"
}
```

## 📋 Deployment Checklist

### Before Each Deployment
- [ ] Test locally: `npm run dev`
- [ ] Build successfully: `npm run build`
- [ ] Run type checking: `npm run type-check`
- [ ] Test database connections
- [ ] Validate wallet addresses
- [ ] Check environment variables
- [ ] Test on mobile devices

### After Deployment
- [ ] Verify application loads
- [ ] Test user authentication
- [ ] Test deposit functionality
- [ ] Test admin features
- [ ] Check profit distribution
- [ ] Monitor error logs
- [ ] Test on different devices

## 🎯 Benefits of This Setup

1. **Easy Updates**: Push code → Automatic deployment
2. **Safe Testing**: Preview deployments for every change
3. **Quick Rollbacks**: Revert to previous version instantly
4. **Multiple Environments**: Test before going live
5. **Collaborative**: Team members can contribute easily
6. **Scalable**: Handles traffic growth automatically
7. **Cost-Effective**: Free tier for small applications

## 🔄 Continuous Improvement

### Regular Maintenance
- **Weekly**: Review and merge feature branches
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Performance optimization and code cleanup

### Feature Development Cycle
1. **Plan** → Create feature branch
2. **Develop** → Code and test locally
3. **Review** → Preview deployment and testing
4. **Stage** → Deploy to staging environment
5. **Release** → Deploy to production
6. **Monitor** → Track performance and errors

This setup gives you the flexibility to continuously improve your broker platform while maintaining a stable production environment! 🚀
