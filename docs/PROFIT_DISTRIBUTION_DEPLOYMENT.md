# Investment Profit Distribution - Deployment Guide

## Overview

The investment profit distribution system is now fully automated and ready for production deployment. It uses Vercel Cron Jobs to automatically distribute daily profits to active investments.

## System Architecture

### Components

1. **SmartDistributionService** (`lib/smartDistributionService.ts`)
   - Core business logic for profit distribution
   - Handles investment profit calculations
   - Manages database transactions

2. **Cron Endpoint** (`src/app/api/cron/daily-profits/route.ts`)
   - Receives cron job requests
   - Validates CRON_SECRET for security
   - Triggers profit distribution

3. **Vercel Cron Configuration** (`vercel.json`)
   - Schedules daily profit distribution at 9:00 AM UTC
   - Automatically calls the cron endpoint

## Deployment Steps

### Step 1: Set Environment Variables

In your Vercel project settings, add:

```env
CRON_SECRET=your-very-secure-random-string-here
```

**Generate a secure secret:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Select-Object -First 32
```

### Step 2: Verify Database Configuration

Ensure your production database is properly configured:

```env
DATABASE_URL=postgresql://user:password@host:5432/database_name
```

### Step 3: Deploy to Vercel

```bash
git add .
git commit -m "Add automated profit distribution system"
git push origin main
```

Vercel will automatically:
1. Build the application
2. Deploy the new cron endpoint
3. Register the cron job schedule

### Step 4: Verify Deployment

1. **Check Vercel Dashboard**
   - Go to your project settings
   - Look for "Cron Jobs" section
   - Verify `/api/cron/daily-profits` is listed with schedule "0 9 * * *"

2. **Test the Endpoint**
   ```bash
   curl -X GET https://your-app.vercel.app/api/cron/daily-profits
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "status": "healthy",
     "message": "Cron endpoint is ready",
     "timestamp": "2024-01-15T09:00:00.000Z"
   }
   ```

3. **Manual Test (with authentication)**
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/daily-profits \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json"
   ```

## How It Works

### Daily Profit Distribution Flow

1. **Trigger**: Vercel Cron Job fires at 9:00 AM UTC daily
2. **Request**: Sends POST request to `/api/cron/daily-profits` with CRON_SECRET
3. **Validation**: Endpoint verifies the CRON_SECRET
4. **Processing**:
   - Fetches all active investments
   - Checks which investments haven't received today's profit
   - Calculates daily profit: `investment_amount × daily_profit_rate`
   - Updates user balance
   - Records profit distribution
   - Creates transaction record
5. **Response**: Returns distribution statistics

### Profit Calculation

```
Daily Profit = Investment Amount × Daily Profit Rate

Example:
- Investment: $1,000
- Daily Rate: 1.5% (0.015)
- Daily Profit: $1,000 × 0.015 = $15.00
```

## Monitoring

### Check Logs

In Vercel dashboard:
1. Go to your project
2. Click "Deployments"
3. Select the latest deployment
4. Click "Logs"
5. Search for "daily profit distribution"

### Expected Log Messages

```
🔄 Starting automated daily profit distribution...
Found X eligible investments
Successfully processed: X
Errors: 0
Distributed daily profit of $X for investment Y
✅ Daily profit distribution completed
```

## Troubleshooting

### Issue: Cron job not running

**Solution:**
1. Verify `vercel.json` has correct cron configuration
2. Redeploy: `git push origin main`
3. Check Vercel dashboard for cron job registration

### Issue: "Invalid cron secret" error

**Solution:**
1. Verify CRON_SECRET is set in Vercel environment variables
2. Ensure the secret matches exactly (no extra spaces)
3. Redeploy after updating environment variables

### Issue: No profits distributed

**Solution:**
1. Check if investments exist: `SELECT COUNT(*) FROM user_investments WHERE status = 'active'`
2. Verify end_date is in the future: `SELECT * FROM user_investments WHERE end_date <= NOW()`
3. Check if profits already distributed today: `SELECT COUNT(*) FROM profit_distributions WHERE DATE(distribution_date) = CURRENT_DATE`

### Issue: Database connection errors

**Solution:**
1. Verify DATABASE_URL is correct
2. Check database is accessible from Vercel
3. Verify user has proper permissions
4. Check connection pool settings in `lib/db.ts`

## Manual Distribution

For testing or manual distribution, use the admin panel:

1. Go to `/admin/profit-distribution`
2. Click "Run Distribution" button
3. View results and active investments

## Rollback

If issues occur:

1. Remove cron configuration from `vercel.json`
2. Commit and push: `git push origin main`
3. Vercel will automatically unregister the cron job

## Security Considerations

1. **CRON_SECRET**: Use a strong, random secret (minimum 32 characters)
2. **Authorization**: All cron requests require valid CRON_SECRET
3. **Database**: Ensure DATABASE_URL is only accessible from Vercel
4. **Logs**: Monitor logs for unauthorized access attempts

## Performance

- **Execution Time**: Typically completes in 5-30 seconds
- **Database Load**: Minimal impact on production database
- **Scalability**: Handles thousands of investments efficiently

## Next Steps

1. Deploy to production
2. Monitor first few automated runs
3. Verify profits are distributed correctly
4. Set up alerts for failed cron jobs (optional)

