# Railway PostgreSQL Database Setup Guide

## Step 1: Get Your Railway Database Connection String

1. Go to your Railway dashboard: https://railway.app/dashboard
2. Select your PostgreSQL service
3. Go to the "Variables" tab
4. Copy the `DATABASE_URL` value (it should look like this):
   ```
   postgresql://postgres:password@host:port/railway
   ```

## Step 2: Set Up Environment Variables

### For Local Migration:
```bash
export DATABASE_URL="your-railway-database-url-here"
```

### For Vercel Deployment:
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables:

```
DATABASE_URL = your-railway-database-url-here
NEXTAUTH_URL = https://your-app-name.vercel.app
NEXTAUTH_SECRET = your-production-secret-here
```

## Step 3: Run the Migration

### Option A: Run from your local machine
```bash
# Install dependencies if not already installed
npm install

# Set your DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@host:port/railway"

# Run the migration
node scripts/migrate-production.js
```

### Option B: Run directly on Railway (if you have a Node.js service)
1. Add the migration script to your Railway deployment
2. Run it as a one-time command

## Step 4: Verify the Migration

After running the migration, you should see:
- ✅ All database tables created
- ✅ Default admin user created (admin@credcrypto.com / admin123)
- ✅ Default investment plans created

## Step 5: Update Your Application

1. **Update Vercel Environment Variables** with your Railway DATABASE_URL
2. **Redeploy your Vercel application**
3. **Test the connection** by trying to log in with the admin account

## Default Admin Account

After migration, you can log in with:
- **Email**: admin@credcrypto.com
- **Password**: admin123

⚠️ **IMPORTANT**: Change this password immediately after first login!

## Troubleshooting

### Connection Issues
- Make sure your Railway database is running
- Check that the DATABASE_URL is correct
- Ensure your IP is whitelisted (Railway usually allows all IPs by default)

### Migration Errors
- If tables already exist, the script will continue (this is normal)
- Check the console output for specific error messages
- You can run the migration multiple times safely

### Vercel Deployment Issues
- Make sure DATABASE_URL is set in Vercel environment variables
- Redeploy after setting environment variables
- Check Vercel function logs for database connection errors

## Manual Database Setup (Alternative)

If the automated script doesn't work, you can manually run the SQL files:

1. Connect to your Railway PostgreSQL database using a client like pgAdmin or psql
2. Run these files in order:
   - `database/schema.sql`
   - `scripts/create_profit_distributions_table.sql`
   - `scripts/add_transaction_hash_column.sql`

## Next Steps

1. Test your application with the production database
2. Create additional admin users if needed
3. Configure your investment plans
4. Set up your cryptocurrency wallet addresses
5. Test the complete user flow (registration, investment, withdrawals)
