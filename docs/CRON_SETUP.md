# Daily Profit Distribution Cron Job Setup

This document explains how to set up automated daily profit distribution for the investment broker platform.

## Overview

The system automatically distributes daily profits to investors based on their active investment plans. Each investment plan has:
- A daily profit rate (e.g., 1.5% per day)
- A duration (e.g., 30 days)
- An investment amount

Daily profits are calculated as: `investment_amount × daily_profit_rate`

## API Endpoint

The cron job calls the following endpoint:
```
POST /api/cron/daily-profits
Authorization: Bearer YOUR_CRON_SECRET
```

## Environment Variables

Add the following to your `.env.local` file:
```
CRON_SECRET=your-secure-secret-key-here
```

## Setup Options

### Option 1: External Cron Service (Recommended for Production)

Use services like:
- **Vercel Cron Jobs** (if deployed on Vercel)
- **GitHub Actions** with scheduled workflows
- **Uptime Robot** or similar monitoring services
- **Zapier** or **IFTTT** for webhook automation

Example curl command:
```bash
curl -X POST https://your-domain.com/api/cron/daily-profits \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

### Option 2: Server Cron Job (Linux/Unix)

Add to your server's crontab:
```bash
# Run daily at 9:00 AM
0 9 * * * curl -X POST https://your-domain.com/api/cron/daily-profits -H "Authorization: Bearer your-cron-secret"
```

To edit crontab:
```bash
crontab -e
```

### Option 3: GitHub Actions (Free Option)

Create `.github/workflows/daily-profits.yml`:
```yaml
name: Daily Profit Distribution

on:
  schedule:
    - cron: '0 9 * * *'  # Run daily at 9:00 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  distribute-profits:
    runs-on: ubuntu-latest
    steps:
      - name: Call Profit Distribution API
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/daily-profits \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Add these secrets to your GitHub repository:
- `APP_URL`: Your application URL
- `CRON_SECRET`: Your cron secret key

### Option 4: Vercel Cron Jobs

If deployed on Vercel, create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-profits",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Manual Testing

### Admin Panel
1. Go to `/admin/profit-distribution`
2. Click "Run Distribution" button
3. View results and active investments

### API Testing
```bash
# Test the endpoint
curl -X POST http://localhost:3000/api/cron/daily-profits \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"

# Check health
curl http://localhost:3000/api/cron/daily-profits
```

## How It Works

1. **Fetch Active Investments**: Gets all investments with status 'active'
2. **Check Distribution History**: Ensures profits aren't distributed twice on the same day
3. **Calculate Daily Profit**: `investment_amount × daily_profit_rate`
4. **Update Balances**: Adds profit to user's profit_balance and total_balance
5. **Create Records**: 
   - Profit distribution record
   - Transaction record (type: 'profit')
   - Updates investment total_profit
6. **Complete Investments**: When duration is reached, marks investment as 'completed' and returns principal

## Database Tables

### profit_distributions
- Tracks each daily profit distribution
- Prevents duplicate distributions
- Links to investment and user

### transactions
- Records all profit distributions as 'profit' type transactions
- Provides audit trail for users

### user_balances
- Updated with daily profits in profit_balance and total_balance

## Monitoring

- Check admin panel at `/admin/profit-distribution` for status
- Monitor application logs for distribution results
- Set up alerts for failed distributions

## Security

- Use a strong, unique CRON_SECRET
- Restrict API access to authorized sources only
- Monitor for unauthorized access attempts
- Consider IP whitelisting for production

## Troubleshooting

### Common Issues

1. **No profits distributed**: Check if investments are active and haven't reached duration limit
2. **Duplicate distributions**: The system prevents this automatically with unique constraints
3. **Failed distributions**: Check database connectivity and user balance records
4. **Cron not running**: Verify cron service is active and endpoint is accessible

### Logs

Check application logs for:
```
Starting daily profit distribution...
Profit distributed for investment {id}: ${amount}
Daily profit distribution completed: X processed, Y skipped, Z errors
```

## Development

For local development, you can:
1. Use the admin panel to manually trigger distributions
2. Set up a local cron job pointing to `http://localhost:3000`
3. Use tools like `node-cron` for in-app scheduling (not recommended for production)

## Production Considerations

- Use external cron services for reliability
- Set up monitoring and alerting
- Consider timezone implications (UTC recommended)
- Implement backup distribution mechanisms
- Regular database maintenance for profit_distributions table
