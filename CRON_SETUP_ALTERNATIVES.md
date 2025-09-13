# 🕐 Cron Job Setup Alternatives

Since you're not using Vercel, here are alternative ways to set up automated profit distribution:

## 🚀 Option 1: GitHub Actions (FREE)

Create `.github/workflows/profit-distribution.yml`:

```yaml
name: Automated Profit Distribution

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

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

**Setup:**
1. Create `.github/workflows/` directory
2. Add the file above
3. Set GitHub Secrets:
   - `APP_URL`: Your Railway/Render app URL
   - `CRON_SECRET`: Your cron secret

## 🌐 Option 2: External Cron Services

### UptimeRobot (FREE)
1. Sign up at https://uptimerobot.com
2. Create HTTP(s) monitor
3. Set URL: `https://your-app.com/api/cron/daily-profits`
4. Set interval: 60 minutes
5. Add custom headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Cron-job.org (FREE)
1. Sign up at https://cron-job.org
2. Create new cron job
3. URL: `https://your-app.com/api/cron/daily-profits`
4. Schedule: `0 * * * *`
5. Add header: `Authorization: Bearer YOUR_CRON_SECRET`

## 🖥️ Option 3: Server Cron (If you have a server)

Add to crontab:
```bash
# Edit crontab
crontab -e

# Add this line (runs every hour)
0 * * * * curl -X POST https://your-app.com/api/cron/daily-profits -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 🔧 Option 4: Railway Cron Plugin

Railway has experimental cron support:

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Add cron service: `railway add`
4. Select "Cron" service
5. Configure schedule and endpoint

## 📱 Option 5: Manual Admin Trigger

Use the admin interface:
1. Go to `/admin/live-trade`
2. Click "Run Profit Distribution" button
3. Monitor results

## 🧪 Testing Your Setup

Test the endpoint manually:
```bash
curl -X POST https://your-app.com/api/cron/daily-profits \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Combined profit distribution completed",
  "results": {
    "liveTrades": {
      "processed": 0,
      "skipped": 0,
      "errors": 0,
      "completed": 0
    },
    "investments": {
      "processed": 0,
      "skipped": 0,
      "errors": 0
    }
  }
}
```

## 🎯 Recommended Solution

**For Railway/Render deployment**: Use **GitHub Actions** (Option 1)
- ✅ Free
- ✅ Reliable
- ✅ Easy to set up
- ✅ Integrated with your repository
- ✅ Logs available in GitHub

**For Vercel deployment**: Rename `vercel-with-cron.json` to `vercel.json`
