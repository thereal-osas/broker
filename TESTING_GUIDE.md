# Testing Guide - Post-Cleanup Verification

## Quick Start

### Option 1: Automated Database Verification (Recommended)

```bash
# Run the verification script
node scripts/verify-cleanup-changes.js
```

This will check:
- ✅ Database connectivity
- ✅ Active investments count
- ✅ Active live trades count
- ✅ Recent profit distributions
- ✅ User balances
- ✅ Admin users
- ✅ System settings

### Option 2: Manual Testing

Follow the detailed steps below to manually test all affected features.

---

## Detailed Testing Steps

### 1. Profit Distribution System (CRITICAL)

#### Test 1.1: Investment Profit Distribution

**Prerequisites:**
- Admin account credentials
- At least one active investment in the database

**Steps:**
```bash
1. Start dev server: npm run dev
2. Open browser: http://localhost:3000
3. Login as admin
4. Navigate to: /admin/profit-distribution
5. Verify the page loads without errors
6. Check that active investments are displayed
7. Click "Distribute Investment Profits" button
8. Confirm in the dialog
9. Wait for distribution to complete
10. Verify success message appears
```

**Expected Results:**
- ✅ Page loads without console errors
- ✅ Active investments list displays
- ✅ Distribution button is clickable
- ✅ Confirmation dialog appears
- ✅ Progress updates show during distribution
- ✅ Success toast notification appears
- ✅ Results show processed/skipped counts
- ✅ Investment list refreshes after distribution

**What to Check in Browser Console:**
```javascript
// Should see NO errors
// Should see successful API responses:
// POST /api/admin/profit-distribution → 200 OK
// GET /api/admin/investments → 200 OK
```

#### Test 1.2: Live Trade Profit Distribution

**Steps:**
```bash
1. On the same page (/admin/profit-distribution)
2. Scroll to "Live Trade Profit Distribution" section
3. Click "Distribute Live Trade Profits" button
4. Confirm in the dialog
5. Wait for distribution to complete
6. Verify success message appears
```

**Expected Results:**
- ✅ Distribution runs without errors
- ✅ Success toast notification appears
- ✅ Results display correctly
- ✅ Balance refresh event triggered

**What to Check in Browser Console:**
```javascript
// Should see:
// POST /api/admin/live-trade/profit-distribution → 200 OK
// Custom event 'balanceRefresh' dispatched
```

#### Test 1.3: Error Handling

**Steps:**
```bash
1. Open browser DevTools → Network tab
2. Set network to "Offline" mode
3. Try to distribute profits
4. Verify error message appears
5. Set network back to "Online"
6. Try again and verify it works
```

**Expected Results:**
- ✅ "Network error occurred" toast appears
- ✅ Error result displayed with details
- ✅ System doesn't crash
- ✅ Can retry successfully after reconnecting

---

### 2. User Dashboard (IMPORTANT)

#### Test 2.1: Dashboard Investment Display

**Prerequisites:**
- Regular user (investor) account
- At least one investment

**Steps:**
```bash
1. Login as regular user (not admin)
2. Navigate to: /dashboard
3. Verify page loads without errors
4. Check that investments are displayed
5. Verify all investment data shows correctly
```

**Expected Results:**
- ✅ Dashboard loads without errors
- ✅ UserInvestments component displays
- ✅ Investment cards show correct data
- ✅ Progress bars display correctly
- ✅ No console errors

**What Changed:**
- Removed `refreshTrigger` prop from UserInvestments
- Component still works because it has internal refresh mechanism

---

### 3. Investments Page (IMPORTANT)

#### Test 3.1: Investment Creation and Refresh

**Steps:**
```bash
1. Login as investor
2. Navigate to: /dashboard/investments
3. Switch to "New Investment" tab
4. Select an investment plan
5. Enter amount and create investment
6. Verify the investment list refreshes automatically
```

**Expected Results:**
- ✅ Investment creation works
- ✅ List refreshes after investment
- ✅ New investment appears in the list
- ✅ refreshTrigger mechanism still works (this page still uses it)

**What Changed:**
- Nothing on this page - it still uses refreshTrigger

---

### 4. Admin Settings (LOW RISK)

#### Test 4.1: Settings Display and Update

**Steps:**
```bash
1. Login as admin
2. Navigate to: /admin/settings
3. Verify all settings categories display
4. Try updating a setting (e.g., platform name)
5. Save changes
6. Refresh page and verify changes persisted
```

**Expected Results:**
- ✅ Settings page loads correctly
- ✅ All settings display properly
- ✅ Updates save without errors
- ✅ Changes persist after refresh

**What Changed:**
- Removed unused `allSettings` variable
- No functional impact

---

### 5. API Endpoints (LOW RISK)

#### Test 5.1: API Route Functionality

Test these endpoints using browser or curl:

```bash
# Test 1: Live trade trades
curl http://localhost:3000/api/admin/live-trade/trades

# Test 2: Live trade plans
curl http://localhost:3000/api/live-trade/plans

# Test 3: User trades
curl http://localhost:3000/api/live-trade/user-trades

# Test 4: Platform settings
curl http://localhost:3000/api/platform-settings

# Test 5: Database test
curl http://localhost:3000/api/test-db
```

**Expected Results:**
- ✅ All endpoints return data correctly
- ✅ No 500 errors
- ✅ Response format unchanged

**What Changed:**
- Removed unused `request` parameters
- No functional impact

---

### 6. Image Display (LOW RISK)

#### Test 6.1: Payment Proof Images

**Steps:**
```bash
1. Login as admin
2. Navigate to: /admin/deposits
3. Click "View Details" on a deposit with payment proof
4. Verify image displays correctly
```

**Expected Results:**
- ✅ Images display correctly
- ✅ Base64 images work
- ✅ No layout shifts

#### Test 6.2: Newsletter Images

**Steps:**
```bash
1. Login as admin
2. Navigate to: /admin/newsletter
3. Create or edit a newsletter
4. Upload an image
5. Verify preview displays
6. Publish newsletter
7. Login as user
8. Navigate to: /dashboard/newsletters
9. View newsletter and verify image displays
```

**Expected Results:**
- ✅ Image upload works
- ✅ Preview displays correctly
- ✅ Published newsletter shows image
- ✅ Next.js Image component used for regular URLs
- ✅ Base64 images still work

**What Changed:**
- Added eslint-disable comments for base64 images
- Converted some images to Next.js Image component
- No functional changes

---

## Edge Cases to Test

### Edge Case 1: No Active Investments

**Steps:**
```bash
1. Ensure database has no active investments
2. Navigate to /admin/profit-distribution
3. Try to distribute profits
```

**Expected Results:**
- ✅ Should show "0 processed, 0 skipped"
- ✅ Should not crash
- ✅ Should show appropriate message

### Edge Case 2: Already Distributed Today

**Steps:**
```bash
1. Run profit distribution once
2. Immediately run it again
```

**Expected Results:**
- ✅ Second run should skip already-processed investments
- ✅ Should show "0 processed, X skipped"
- ✅ Should complete successfully

### Edge Case 3: Large Dataset

**Steps:**
```bash
1. Create 100+ active investments (use seed script)
2. Run profit distribution
```

**Expected Results:**
- ✅ Should process all without timeout
- ✅ Progress updates should show
- ✅ Should complete successfully

---

## Browser Console Checks

### What to Look For:

**✅ Good Signs:**
```javascript
// No red errors
// Successful API calls (200 status)
// No React warnings
// No TypeScript errors
```

**❌ Bad Signs:**
```javascript
// Red errors in console
// Failed API calls (500 status)
// React warnings about missing props
// TypeScript type errors
```

### Common Console Messages (Normal):

```javascript
// These are NORMAL and expected:
"[HMR] connected" // Hot module reload
"Download the React DevTools..." // React dev tools prompt
```

---

## Performance Checks

### Build Size Comparison

```bash
# Before cleanup: Check old build size
# After cleanup: Check new build size

npm run build

# Look for:
# - Reduced bundle size (removed unused code)
# - Faster build time
# - No increase in bundle size
```

**Expected Results:**
- ✅ Build completes successfully
- ✅ 0 errors, 0 warnings
- ✅ Similar or smaller bundle size

---

## Rollback Instructions

If you encounter any issues:

```bash
# 1. Check git log
git log --oneline -10

# 2. Identify the cleanup commit
# Look for commit with message about "cleanup" or "unused variables"

# 3. Revert if needed
git revert <commit-hash>

# 4. Or create a branch from before cleanup
git checkout -b pre-cleanup <commit-hash-before-cleanup>
```

**Note:** Rollback should NOT be necessary - all changes were safe.

---

## Success Criteria

### ✅ All Tests Pass If:

1. **Build Status:**
   - ✅ `npm run build` completes with 0 errors, 0 warnings

2. **Profit Distribution:**
   - ✅ Investment distribution works
   - ✅ Live trade distribution works
   - ✅ Results display correctly

3. **User Dashboard:**
   - ✅ Investments display correctly
   - ✅ No console errors

4. **Admin Features:**
   - ✅ Settings page works
   - ✅ All admin pages load

5. **API Endpoints:**
   - ✅ All endpoints return data
   - ✅ No 500 errors

6. **Images:**
   - ✅ All images display correctly
   - ✅ No broken images

---

## Troubleshooting

### Issue: "Cannot find module" error

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: Database connection error

**Solution:**
```bash
# Check .env.local file
# Verify DATABASE_URL is correct
# Test connection:
node scripts/verify-cleanup-changes.js
```

### Issue: Build fails

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Issue: TypeScript errors

**Solution:**
```bash
# Run type check
npm run type-check

# If errors persist, check the specific file mentioned
```

---

## Reporting Issues

If you find any issues during testing:

1. **Note the exact steps to reproduce**
2. **Check browser console for errors**
3. **Check server logs for API errors**
4. **Note which test case failed**
5. **Check if issue existed before cleanup**

---

## Final Checklist

Before deploying to production:

- [ ] All automated checks pass (`node scripts/verify-cleanup-changes.js`)
- [ ] Build completes successfully (`npm run build`)
- [ ] Profit distribution tested and works
- [ ] User dashboard tested and works
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Images display correctly
- [ ] API endpoints respond correctly

---

## Conclusion

The cleanup changes were **safe and non-breaking**. All removed code was genuinely unused. If all tests pass, you can deploy with confidence.

**Estimated Testing Time:**
- Quick smoke test: 5 minutes
- Full manual testing: 30-45 minutes
- Automated verification: 1 minute

**Recommended Approach:**
1. Run automated verification script (1 min)
2. Quick smoke test of profit distribution (5 min)
3. Deploy to staging
4. Full testing in staging environment
5. Deploy to production

