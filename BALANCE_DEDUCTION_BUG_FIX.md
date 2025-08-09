# Balance Deduction Bug Fix

## 🐛 Bug Description

**Critical Issue**: Users could successfully create the first 2 investments/live trades with proper balance deduction, but starting from the 3rd investment/live trade attempt, the balance deduction stopped working while the investment/trade records were still created successfully.

### Symptoms
- ✅ First 2 transactions: Balance deducted correctly
- ❌ 3rd+ transactions: Balance remains unchanged, but investment/trade is created
- ✅ Transaction records: Still being logged correctly
- ❌ Balance components: Not properly updated after 2nd transaction

### Affected APIs
- `/api/investments/user` (POST) - Investment creation
- `/api/live-trade/invest` (POST) - Live trade investment

## 🔍 Root Cause Analysis

The issue was caused by **improper database transaction handling** in the balance update mechanism:

### Problem 1: Transaction Isolation Violation
```javascript
// BEFORE (Problematic Code)
const result = await db.transaction(async (client) => {
  // This creates investment within the transaction
  const investment = await investmentQueries.createInvestment({...});
  
  // BUT this balance update uses a different connection!
  await balanceQueries.updateBalance(userId, "deposit_balance", amount, "subtract");
  //     ↑ This function internally calls db.query() which gets a NEW connection
  //       from the pool, breaking transaction isolation!
});
```

### Problem 2: Connection Pool Race Conditions
- The `balanceQueries.updateBalance()` function always used `db.query()` 
- This gets a new connection from the pool instead of using the transaction client
- After multiple transactions, connection pool timing issues caused balance updates to fail
- The investment records were still created because they used the correct transaction client

### Problem 3: Inconsistent Transaction Context
- Investment creation: ✅ Used transaction client
- Balance updates: ❌ Used separate connection
- Transaction records: ❌ Used separate connection

## 🔧 Solution Implemented

### 1. Enhanced Database Functions with Client Parameter Support

**Updated `balanceQueries.updateBalance()`**:
```javascript
// AFTER (Fixed Code)
async updateBalance(
  userId: string,
  balanceType: string,
  amount: number,
  operation: "add" | "subtract" = "add",
  client?: PoolClient  // ← NEW: Optional transaction client
) {
  const queryExecutor = client || db;  // ← Use client if provided, fallback to db
  
  const updateQuery = `
    UPDATE user_balances
    SET ${balanceType} = GREATEST(0, ${balanceType} ${operator} $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
  `;
  await queryExecutor.query(updateQuery, [userId, Math.abs(amount)]);
  
  // ... rest of function uses queryExecutor
}
```

**Updated `transactionQueries.createTransaction()`**:
```javascript
async createTransaction(
  transactionData: {...},
  client?: PoolClient  // ← NEW: Optional transaction client
) {
  const queryExecutor = client || db;
  // ... uses queryExecutor for all queries
}
```

**Updated `investmentQueries.createInvestment()`**:
```javascript
async createInvestment(
  investmentData: {...},
  client?: PoolClient  // ← NEW: Optional transaction client
) {
  const queryExecutor = client || db;
  // ... uses queryExecutor for all queries
}
```

### 2. Fixed Investment API Transaction Handling

```javascript
// AFTER (Fixed Code)
const result = await db.transaction(async (client) => {
  // All operations now use the SAME transaction client
  const investment = await investmentQueries.createInvestment({...}, client);
  
  await balanceQueries.updateBalance(
    userId, "deposit_balance", amount, "subtract", client
  );
  
  const transaction = await transactionQueries.createTransaction({...}, client);
  
  return { investment, transaction };
});
```

### 3. Fixed Live Trade API Transaction Handling

```javascript
// BEFORE (Problematic)
await db.query("BEGIN");
try {
  await balanceQueries.updateBalance(...);  // Different connection!
  await db.query(insertQuery, [...]);       // Different connection!
  await db.query(transactionQuery, [...]);  // Different connection!
  await db.query("COMMIT");
} catch (error) {
  await db.query("ROLLBACK");
}

// AFTER (Fixed)
const result = await db.transaction(async (client) => {
  await balanceQueries.updateBalance(..., client);  // Same connection!
  const tradeResult = await client.query(insertQuery, [...]);
  const transaction = await transactionQueries.createTransaction({...}, client);
  return { trade: tradeResult.rows[0], transaction };
});
```

## 🧪 Testing

Created comprehensive test script: `scripts/test-multiple-investment-balance-deduction.js`

### Test Scenarios
- Creates test user with $1000 balance
- Performs 5 consecutive $50 investments
- Verifies balance deduction for each transaction
- Checks for the specific bug pattern (first 2 work, then fail)

### Expected Results After Fix
- ✅ All 5 investments should process correctly
- ✅ Balance should be deducted properly for each transaction
- ✅ No connection pool or transaction isolation issues

## 📁 Files Modified

### Core Database Functions
- `lib/db.ts` - Enhanced with client parameter support
  - `balanceQueries.updateBalance()`
  - `transactionQueries.createTransaction()`
  - `investmentQueries.createInvestment()`

### API Endpoints
- `src/app/api/investments/user/route.ts` - Fixed transaction handling
- `src/app/api/live-trade/invest/route.ts` - Fixed transaction handling

### Test Scripts
- `scripts/test-multiple-investment-balance-deduction.js` - Verification test

## 🎯 Key Benefits

1. **Transaction Integrity**: All related operations now use the same database connection
2. **Connection Pool Efficiency**: Eliminates unnecessary connection acquisitions
3. **Race Condition Prevention**: Proper transaction isolation prevents timing issues
4. **Backward Compatibility**: Functions still work without client parameter
5. **Consistent Behavior**: Balance deduction works reliably regardless of transaction count

## 🚀 Verification Steps

1. **Run Test Script**:
   ```bash
   node scripts/test-multiple-investment-balance-deduction.js
   ```

2. **Manual Testing**:
   - Create multiple investments through the UI
   - Verify balance deduction for each transaction
   - Test both regular investments and live trades

3. **Monitor Logs**:
   - Check for transaction errors
   - Verify balance discrepancy logs are reduced
   - Confirm proper transaction completion

## 🔒 Impact Assessment

- ✅ **No Breaking Changes**: Existing functionality preserved
- ✅ **Performance Improvement**: Reduced connection pool usage
- ✅ **Data Integrity**: Enhanced transaction consistency
- ✅ **User Experience**: Reliable balance deduction for all transactions

This fix resolves the critical balance deduction bug while maintaining all existing functionality and improving overall system reliability.
