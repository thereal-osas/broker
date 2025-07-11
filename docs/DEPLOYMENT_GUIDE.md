# 🚀 Deployment Guide - Broker Platform

This guide covers multiple deployment options for your Next.js broker platform, from local testing to production deployment.

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration
Ensure your `.env.local` is properly configured:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=broker_platform
DB_USER=postgres
DB_PASSWORD=your-password

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Cryptocurrency Wallet Addresses
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=your-bitcoin-address
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=your-ethereum-address
NEXT_PUBLIC_CRYPTO_WALLET_USDT=your-usdt-address
NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=your-litecoin-address

# Security
JWT_SECRET=your-jwt-secret-here
CRON_SECRET=your-cron-secret-here
```

### 2. Database Setup
```bash
# Set up database schema
npm run db:setup

# Seed with initial data
npm run db:seed
```

### 3. Validate Configuration
```bash
# Test database connection
node scripts/test_db_connection.js

# Validate wallet addresses
node scripts/validate-wallet-addresses.js
```

## 🏠 Option 1: Local Development Testing

### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

**Access Points:**
- **Main App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/dashboard
- **Deposit Page**: http://localhost:3000/dashboard/deposit
- **Profit Distribution**: http://localhost:3000/admin/profit-distribution

### Test Accounts
Use the seeded accounts from `scripts/seed-db.js`:
- **Admin**: admin@credcrypto.com / password123
- **Investor**: investor@credcrypto.com / password123

## 🌐 Option 2: Production Build (Local)

### Build for Production
```bash
# Create production build
npm run build

# Start production server
npm run start
```

**Benefits:**
- Tests production optimizations
- Faster performance
- Identifies build issues early

## ☁️ Option 3: Cloud Deployment

### A. Vercel Deployment (Recommended)

#### Prerequisites
- Vercel account
- GitHub repository
- PostgreSQL database (Neon, Supabase, or Railway)

#### Steps
1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/broker-platform.git
git push -u origin main
```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

3. **Environment Variables in Vercel**:
```env
DB_HOST=your-cloud-db-host
DB_PORT=5432
DB_NAME=broker_platform
DB_USER=your-db-user
DB_PASSWORD=your-db-password
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-production-secret
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=your-bitcoin-address
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=your-ethereum-address
NEXT_PUBLIC_CRYPTO_WALLET_USDT=your-usdt-address
NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=your-litecoin-address
JWT_SECRET=your-production-jwt-secret
CRON_SECRET=your-production-cron-secret
```

### B. Railway Deployment

#### Steps
1. **Install Railway CLI**:
```bash
npm install -g @railway/cli
```

2. **Login and Deploy**:
```bash
railway login
railway init
railway up
```

3. **Add PostgreSQL**:
```bash
railway add postgresql
```

### C. Netlify Deployment

#### Steps
1. **Build Command**: `npm run build`
2. **Publish Directory**: `.next`
3. **Environment Variables**: Same as Vercel

## 🗄️ Database Hosting Options

### Option A: Neon (Recommended)
- **Website**: [neon.tech](https://neon.tech)
- **Free Tier**: Yes
- **Features**: Serverless PostgreSQL, auto-scaling
- **Setup**: Create database → Copy connection string

### Option B: Supabase
- **Website**: [supabase.com](https://supabase.com)
- **Free Tier**: Yes
- **Features**: PostgreSQL + additional tools
- **Setup**: Create project → Use connection details

### Option C: Railway PostgreSQL
- **Website**: [railway.app](https://railway.app)
- **Free Tier**: Limited
- **Features**: Simple PostgreSQL hosting
- **Setup**: Add PostgreSQL service → Get credentials

### Option D: PlanetScale
- **Website**: [planetscale.com](https://planetscale.com)
- **Free Tier**: Yes
- **Features**: MySQL-compatible (requires schema changes)

## 🔧 Production Configuration

### 1. Update Next.js Config
Create/update `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static optimization
  output: 'standalone',
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
```

### 2. Production Environment Variables
```env
# Production Database
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=broker_platform_prod
DB_USER=your-prod-user
DB_PASSWORD=your-secure-password

# Production URLs
NEXTAUTH_URL=https://your-domain.com
APP_URL=https://your-domain.com

# Strong Secrets (generate new ones)
NEXTAUTH_SECRET=your-very-secure-secret-key-here
JWT_SECRET=your-very-secure-jwt-secret-here
CRON_SECRET=your-very-secure-cron-secret-here

# Production Wallet Addresses
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=your-production-bitcoin-address
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=your-production-ethereum-address
NEXT_PUBLIC_CRYPTO_WALLET_USDT=your-production-usdt-address
NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=your-production-litecoin-address

# Optional: Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
FROM_EMAIL=noreply@yourdomain.com
```

## 🔒 Security Considerations

### 1. Environment Secrets
- **Never commit** `.env` files to Git
- Use **strong, unique secrets** for production
- **Rotate secrets** regularly

### 2. Database Security
- Use **SSL connections** for production databases
- **Whitelist IP addresses** if possible
- **Regular backups** and monitoring

### 3. Application Security
- **HTTPS only** in production
- **Rate limiting** on API endpoints
- **Input validation** and sanitization
- **Regular security updates**

## 📊 Monitoring & Maintenance

### 1. Health Checks
Create health check endpoints:
```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
}
```

### 2. Logging
- **Application logs**: Use structured logging
- **Database logs**: Monitor query performance
- **Error tracking**: Sentry, LogRocket, or similar

### 3. Backups
- **Database backups**: Daily automated backups
- **Code backups**: Git repository with tags
- **Environment configs**: Secure backup of environment variables

## 🧪 Testing Your Deployment

### 1. Functional Testing
- [ ] User registration and login
- [ ] Investment plan creation and management
- [ ] Deposit functionality with QR codes
- [ ] Withdrawal requests
- [ ] Admin profit distribution
- [ ] Balance calculations

### 2. Performance Testing
- [ ] Page load times
- [ ] Database query performance
- [ ] API response times
- [ ] Mobile responsiveness

### 3. Security Testing
- [ ] Authentication flows
- [ ] Authorization checks
- [ ] Input validation
- [ ] SQL injection protection

## 🚨 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

#### Database Connection Issues
```bash
# Test database connection
node scripts/test_db_connection.js
```

#### Environment Variable Issues
```bash
# Validate configuration
node scripts/validate-wallet-addresses.js
```

### Support Resources
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **PostgreSQL Docs**: [postgresql.org/docs](https://postgresql.org/docs)

## 📞 Next Steps

1. **Choose deployment option** based on your needs
2. **Set up cloud database** if using cloud deployment
3. **Configure environment variables** for your chosen platform
4. **Deploy and test** all functionality
5. **Set up monitoring** and backup strategies
6. **Plan for scaling** as user base grows

Your broker platform is now ready for deployment! 🎉
