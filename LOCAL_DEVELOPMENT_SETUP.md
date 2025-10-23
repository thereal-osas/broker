# Local Development Setup Guide

This guide will help you set up a complete local development environment for the broker application using your local PostgreSQL database.

## Prerequisites

1. **PostgreSQL installed locally** with the following configuration:
   - Host: localhost
   - Port: 5432 (default)
   - Username: postgres
   - Password: Mirror1#@

2. **Node.js and npm** installed on your system

3. **Git** for version control

## Quick Setup (Automated)

### 1. Environment Configuration

Your `.env` file has been configured for local development with:
- Local PostgreSQL database connection
- Local application URLs
- Production configuration commented out for easy switching

### 2. Database Setup

Run the automated setup script:

```bash
# Install dependencies if not already done
npm install

# Set up local database and seed test data
node scripts/setup-local-development.js
```

This script will:
- Create the `broker_platform` database if it doesn't exist
- Set up all required tables with proper schema
- Seed the database with test data including:
  - Admin user: `admin@credcrypto.com` / `password`
  - Test investor: `investor@test.com` / `password`
  - Sample investment and live trade plans
  - Initial user balances

### 3. Verify Setup

Test your local database connection:

```bash
node scripts/test-local-db.js
```

This will verify:
- Database connection
- All required tables exist
- Test data is properly seeded
- API compatibility

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and login with the test credentials.

## Manual Setup (If Needed)

### 1. Create Database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE broker_platform;
```

### 2. Run Schema Script

If the automated setup fails, you can run the schema setup manually:

```bash
node scripts/fix-database-schema.js
```

## Environment Switching

Use the environment switcher to easily switch between local and production:

```bash
# Switch to local development
node scripts/switch-environment.js local

# Switch to production
node scripts/switch-environment.js production

# Check current configuration
node scripts/switch-environment.js status
```

## Test Credentials

### Admin User
- **Email**: admin@credcrypto.com
- **Password**: password
- **Role**: admin
- **Initial Balance**: $10,000.00
- **Credit Score**: 1000 CRD

### Test Investor
- **Email**: investor@test.com
- **Password**: password
- **Role**: investor
- **Initial Balance**: $5,000.00
- **Credit Score**: 500 CRD

## Available Test Data

### Investment Plans
- **Starter Plan**: $100-$1,000, 1.5% daily, 30 days

### Live Trade Plans
- **Quick Trade**: $50-$2,000, 0.1% hourly, 24 hours

## Testing the Fixes

With your local environment set up, you can now test all the recent fixes:

### 1. Admin Investment Management
1. Login as admin
2. Navigate to `/admin/investments`
3. Verify the page loads without 503 errors
4. Test profit distribution functionality

### 2. Live Trade Status Display
1. Create a live trade as the test investor
2. Verify status badges show correctly
3. Check that timers stop when trades complete
4. Confirm completed trades show proper status

### 3. Profit Distribution
1. Use admin panel to distribute profits
2. Verify both investment and live trade profit distribution work
3. Check that eligible trades are detected correctly

## Database Schema

The local database includes all production tables:

### Core Tables
- `users` - User accounts and authentication
- `user_balances` - User financial balances
- `transactions` - All financial transactions

### Investment System
- `investment_plans` - Available investment plans
- `user_investments` - User investment records
- `profit_distributions` - Investment profit history

### Live Trade System
- `live_trade_plans` - Available live trade plans
- `user_live_trades` - User live trade records
- `hourly_live_trade_profits` - Hourly profit tracking

## Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running**:
   ```bash
   # Windows (if using pg_ctl)
   pg_ctl status

   # Or check if service is running
   net start postgresql-x64-13
   ```

2. **Verify credentials**:
   - Ensure PostgreSQL user `postgres` exists
   - Confirm password is `Mirror1#@`
   - Check if user has database creation privileges

3. **Test connection manually**:
   ```bash
   psql -h localhost -U postgres -d postgres
   ```

### Permission Issues

If you get permission errors:

```sql
-- Connect as superuser and grant permissions
ALTER USER postgres CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE broker_platform TO postgres;
```

### Port Conflicts

If port 5432 is in use:
1. Change `DB_PORT` in `.env` file
2. Update PostgreSQL configuration
3. Restart PostgreSQL service

### Schema Issues

If tables are missing or corrupted:

```bash
# Drop and recreate database
node scripts/setup-local-development.js

# Or manually reset
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS broker_platform;"
psql -h localhost -U postgres -c "CREATE DATABASE broker_platform;"
node scripts/setup-local-development.js
```

## Development Workflow

### Daily Development
1. Start PostgreSQL service
2. Run `npm run dev`
3. Access application at `http://localhost:3000`

### Testing Changes
1. Make code changes
2. Test locally with test data
3. Run database tests: `node scripts/test-local-db.js`
4. Verify API endpoints work correctly

### Switching to Production
1. Run: `node scripts/switch-environment.js production`
2. Restart development server
3. Test against production database (if needed)

### Deploying Changes
1. Ensure all tests pass locally
2. Switch to production configuration
3. Deploy to Vercel
4. Run production database migrations if needed

## Security Notes

- Local database uses test credentials - never use in production
- Test users have simple passwords - change in production
- Local environment bypasses some security checks
- Always test security features in production-like environment

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify PostgreSQL is properly installed and running
3. Ensure all dependencies are installed: `npm install`
4. Check the console for detailed error messages
5. Review the setup script output for any failures
