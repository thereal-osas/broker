# Automated Database Migration System

## 🚀 Overview

This system automatically sets up and migrates your PostgreSQL database during Vercel deployment. It requires **zero manual intervention** - just set your `DATABASE_URL` environment variable and deploy!

## ✨ Features

- ✅ **Fully Automated** - Runs during every Vercel deployment
- ✅ **Database Agnostic** - Works with Railway, Supabase, AWS RDS, etc.
- ✅ **Idempotent** - Safe to run multiple times without errors
- ✅ **Serverless Optimized** - Designed for Vercel's environment
- ✅ **Error Handling** - Graceful failure with detailed logging
- ✅ **Health Monitoring** - Built-in health check endpoint
- ✅ **Zero Configuration** - Just set DATABASE_URL and deploy

## 🔧 Setup Instructions

### 1. Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

```bash
# Required
DATABASE_URL=postgresql://username:password@host:port/database

# Optional (for enhanced security)
MIGRATION_KEY=your-secret-migration-key-here

# Optional (for production resilience)
MIGRATION_FAIL_STRATEGY=continue
```

### 2. Deploy Your Application

That's it! The migration will run automatically during deployment.

## 📊 What Gets Created

### Database Tables (15 total)
- `users` - User accounts and authentication
- `user_balances` - 5 types of user balances
- `investment_plans` - Admin-configured investment options
- `user_investments` - User investment records
- `investment_profits` - Daily profit calculations
- `profit_distributions` - Profit distribution tracking
- `deposit_requests` - Deposit management
- `withdrawal_requests` - Withdrawal management
- `transactions` - Complete transaction history
- `referrals` - Referral system
- `referral_commissions` - Commission tracking
- `newsletters` - Newsletter management
- `support_tickets` - Customer support
- `ticket_responses` - Support responses
- `system_settings` - Application configuration

### Default Data
- **Admin User**: `admin@credcrypto.com` / `admin123`
- **Investment Plans**: 3 default plans (Starter, Professional, Premium)
- **Indexes**: Performance-optimized database indexes
- **Triggers**: Automatic timestamp updates

## 🔍 Monitoring & Health Checks

### Health Check Endpoint
```
GET /api/health/database
```

Response:
```json
{
  "status": "healthy",
  "message": "Database is ready",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "database_configured": true
}
```

### Manual Migration Trigger (Emergency Use)
```
POST /api/health/database
Headers: x-migration-key: your-secret-key
```

## 📝 Deployment Logs

During deployment, you'll see logs like:

```
🚀 Starting automated database migration...
📅 Timestamp: 2024-01-15T10:30:00.000Z
🌍 Environment: production
🔗 Database host: containers-us-west-xxx.railway.app
🔌 Database port: 5432
🔌 Initializing database connection...
✅ Database connection established
📋 Loading migration definitions...
📊 Total migrations to process: 5
📄 Running migration: 001_main_schema
✅ Migration completed: 001_main_schema
📄 Running migration: 002_indexes
✅ Migration completed: 002_indexes
📄 Running migration: 003_triggers
✅ Migration completed: 003_triggers
📄 Running migration: 004_profit_distributions
⏭️  Skipping migration: 004_profit_distributions (already applied)
📄 Running migration: 005_transaction_hash
⏭️  Skipping migration: 005_transaction_hash (already applied)
🎉 All migrations completed successfully
👤 Setting up default admin user...
👤 Admin user already exists
💼 Setting up default investment plans...
💼 Investment plans already exist
🔍 Verifying database setup...
📊 Database statistics:
   Users: 1
   Investment Plans: 3
   Active Investments: 0
✅ Database verification completed
🎉 Migration completed successfully in 2847ms
✅ Database is ready for application startup
🔌 Database connections closed
🏁 Migration script completed
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Connection Errors
```
❌ Migration failed: Failed to connect to database after 3 attempts
```

**Solutions:**
- Verify DATABASE_URL is correct
- Check if database service is running
- Ensure firewall allows connections

#### 2. Authentication Errors
```
❌ Migration failed: password authentication failed
```

**Solutions:**
- Double-check database credentials
- URL-encode special characters in password
- Verify user has necessary permissions

#### 3. Permission Errors
```
❌ Migration failed: permission denied for schema public
```

**Solutions:**
- Ensure database user has CREATE/ALTER privileges
- Check if database allows schema modifications
- Contact your database provider for permission settings

### Debug Commands

```bash
# Test migration locally
npm run db:auto-migrate

# Check database health
curl https://your-app.vercel.app/api/health/database

# Manual migration trigger (development)
curl -X POST http://localhost:3000/api/health/database
```

## 🔒 Security Features

### Environment-Based Security
- Production databases require SSL connections
- Sensitive credentials never logged
- Connection timeouts prevent hanging

### Migration Key Protection
- Manual migrations require secret key
- Development mode allows unrestricted access
- Production mode enforces authentication

### Graceful Failure Handling
- Non-critical errors don't fail deployment
- Detailed error logging for debugging
- Configurable failure strategies

## 🚀 Advanced Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/db

# Optional Security
MIGRATION_KEY=secret-key-for-manual-migrations

# Optional Resilience
MIGRATION_FAIL_STRATEGY=continue  # Don't fail deployment on migration errors

# Optional Debugging
DEBUG_MIGRATIONS=true  # Enable verbose logging
```

### Custom Migration Behavior

The system supports different failure strategies:

- **Default**: Fail deployment if migration fails
- **Continue**: Log errors but continue deployment
- **Retry**: Attempt migration multiple times

## 📈 Performance Optimization

### Serverless Optimizations
- Limited connection pool size (max 3)
- Optimized timeouts for Vercel environment
- Efficient migration checking to skip unnecessary work

### Database Optimizations
- Comprehensive indexes for all queries
- Optimized foreign key relationships
- Efficient data types and constraints

## 🔄 Migration Lifecycle

1. **Pre-Build**: Migration runs before Next.js build
2. **Connection**: Establish database connection with retry logic
3. **Schema Check**: Verify which migrations need to run
4. **Migration Execution**: Run only necessary migrations
5. **Data Setup**: Create default admin user and plans
6. **Verification**: Confirm database is ready
7. **Cleanup**: Close all database connections
8. **Build Continue**: Next.js build proceeds with ready database

## 🎯 Best Practices

### For Production
- Always set DATABASE_URL in Vercel environment variables
- Use strong passwords with URL encoding for special characters
- Monitor deployment logs for migration status
- Set up database backups before major deployments

### For Development
- Test migrations locally before deploying
- Use the health check endpoint to verify setup
- Keep migration logs for debugging

### For Teams
- Document any custom migrations in this file
- Use the manual migration trigger for emergency fixes
- Monitor database performance after deployments

## 🆘 Emergency Procedures

### If Migration Fails During Deployment
1. Check Vercel deployment logs for specific error
2. Verify DATABASE_URL is correctly set
3. Use manual migration trigger with proper key
4. Contact database provider if permission issues persist

### If Database Becomes Corrupted
1. Restore from backup
2. Run manual migration via API endpoint
3. Verify with health check endpoint
4. Redeploy application

### If Need to Reset Database
1. Drop all tables in database
2. Redeploy application (migrations will recreate everything)
3. Change default admin password immediately

## 📞 Support

For issues with the automated migration system:
1. Check deployment logs in Vercel dashboard
2. Use the health check endpoint for current status
3. Review this documentation for common solutions
4. Check database provider documentation for connection issues
