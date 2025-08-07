import { db } from "./db";

interface ActiveLiveTrade {
  id: string;
  user_id: string;
  live_trade_plan_id: string;
  amount: number;
  hourly_profit_rate: number;
  duration_hours: number;
  start_time: string;
  total_profit: number;
}

interface LiveTradeProfitDistribution {
  live_trade_id: string;
  user_id: string;
  amount: number;
  profit_amount: number;
  profit_hour: string;
}

export class LiveTradeProfitService {
  /**
   * Calculate hourly profit for a live trade
   */
  static calculateHourlyProfit(
    investmentAmount: number,
    hourlyRate: number
  ): number {
    return investmentAmount * hourlyRate;
  }

  /**
   * Get all active live trades that need profit distribution
   */
  static async getActiveLiveTrades(): Promise<ActiveLiveTrade[]> {
    const query = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.live_trade_plan_id,
        ult.amount,
        ult.start_time,
        ult.total_profit,
        ltp.hourly_profit_rate,
        ltp.duration_hours
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours > CURRENT_TIMESTAMP
    `;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Check if profit has already been distributed for a specific hour for a live trade
   */
  static async isProfitDistributedForHour(
    liveTradeId: string,
    profitHour: string
  ): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM hourly_live_trade_profits
      WHERE live_trade_id = $1 
      AND DATE_TRUNC('hour', profit_hour) = DATE_TRUNC('hour', $2::timestamp)
    `;

    const result = await db.query(query, [liveTradeId, profitHour]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Distribute hourly profit for a single live trade
   */
  static async distributeHourlyProfitForLiveTrade(
    liveTrade: ActiveLiveTrade,
    profitHour: string
  ): Promise<void> {
    const profitAmount = this.calculateHourlyProfit(
      liveTrade.amount,
      liveTrade.hourly_profit_rate
    );

    try {
      await db.query("BEGIN");

      // 1. Add profit to user's profit balance
      const updateBalanceQuery = `
        UPDATE user_balances 
        SET profit_balance = profit_balance + $1,
            total_balance = total_balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `;
      await db.query(updateBalanceQuery, [profitAmount, liveTrade.user_id]);

      // 2. Create hourly profit record
      const createHourlyProfitQuery = `
        INSERT INTO hourly_live_trade_profits (
          live_trade_id, profit_amount, profit_hour
        ) VALUES ($1, $2, $3)
      `;
      await db.query(createHourlyProfitQuery, [
        liveTrade.id,
        profitAmount,
        profitHour,
      ]);

      // 3. Create transaction record
      const createTransactionQuery = `
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description,
          reference_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;
      await db.query(createTransactionQuery, [
        liveTrade.user_id,
        "profit", // Use supported transaction type
        profitAmount,
        "profit",
        `Hourly profit from live trade #${liveTrade.id}`,
        liveTrade.id,
        "completed",
      ]);

      // 4. Update live trade total profit
      const updateLiveTradeQuery = `
        UPDATE user_live_trades 
        SET total_profit = total_profit + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await db.query(updateLiveTradeQuery, [profitAmount, liveTrade.id]);

      await db.query("COMMIT");
      console.log(
        `Hourly profit distributed for live trade ${liveTrade.id}: $${profitAmount}`
      );
    } catch (error) {
      await db.query("ROLLBACK");
      console.error(
        `Error distributing hourly profit for live trade ${liveTrade.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check and complete expired live trades
   */
  static async completeExpiredLiveTrades(): Promise<number> {
    // First, get all live trades that need to be completed
    const selectQuery = `
      SELECT ult.id, ult.user_id, ult.amount, ltp.name as plan_name
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours <= CURRENT_TIMESTAMP
    `;

    const expiredTrades = await db.query(selectQuery);
    let completedCount = 0;

    for (const trade of expiredTrades.rows) {
      try {
        await db.query("BEGIN");

        // 1. Update live trade status to completed
        await db.query(
          `UPDATE user_live_trades
           SET status = 'completed',
               end_time = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [trade.id]
        );

        // 2. Return original investment capital to user's deposit balance
        await db.query(
          `UPDATE user_balances
           SET deposit_balance = deposit_balance + $1,
               total_balance = total_balance + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [trade.amount, trade.user_id]
        );

        // 3. Create transaction record for capital return
        await db.query(
          `INSERT INTO transactions (
             user_id, type, amount, balance_type, description,
             reference_id, status, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [
            trade.user_id,
            "profit", // Use supported transaction type
            trade.amount,
            "deposit",
            `Live trade #${trade.id} completed - principal returned (${trade.plan_name})`,
            trade.id,
            "completed",
          ]
        );

        await db.query("COMMIT");
        completedCount++;

        console.log(
          `Live trade ${trade.id} completed - returned $${trade.amount} capital to user ${trade.user_id}`
        );
      } catch (error) {
        await db.query("ROLLBACK");
        console.error(`Error completing live trade ${trade.id}:`, error);
      }
    }

    return completedCount;
  }

  /**
   * Manually complete a specific live trade (for admin use)
   */
  static async completeLiveTrade(liveTradeId: string): Promise<boolean> {
    try {
      // Get live trade details
      const tradeQuery = `
        SELECT ult.id, ult.user_id, ult.amount, ult.status, ltp.name as plan_name
        FROM user_live_trades ult
        JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
        WHERE ult.id = $1
      `;

      const tradeResult = await db.query(tradeQuery, [liveTradeId]);

      if (tradeResult.rows.length === 0) {
        console.error(`Live trade ${liveTradeId} not found`);
        return false;
      }

      const trade = tradeResult.rows[0];

      if (trade.status !== "active") {
        console.error(
          `Live trade ${liveTradeId} is not active (status: ${trade.status})`
        );
        return false;
      }

      await db.query("BEGIN");

      // 1. Update live trade status to completed
      await db.query(
        `UPDATE user_live_trades
         SET status = 'completed',
             end_time = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [trade.id]
      );

      // 2. Return original investment capital to user's deposit balance
      await db.query(
        `UPDATE user_balances
         SET deposit_balance = deposit_balance + $1,
             total_balance = total_balance + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [trade.amount, trade.user_id]
      );

      // 3. Create transaction record for capital return
      await db.query(
        `INSERT INTO transactions (
           user_id, type, amount, balance_type, description,
           reference_id, status, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          trade.user_id,
          "profit", // Use supported transaction type
          trade.amount,
          "deposit",
          `Live trade #${trade.id} manually completed - principal returned (${trade.plan_name})`,
          trade.id,
          "completed",
        ]
      );

      await db.query("COMMIT");

      console.log(
        `Live trade ${trade.id} manually completed - returned $${trade.amount} capital to user ${trade.user_id}`
      );

      return true;
    } catch (error) {
      await db.query("ROLLBACK");
      console.error(
        `Error manually completing live trade ${liveTradeId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Run hourly profit distribution for all active live trades
   */
  static async runHourlyProfitDistribution(): Promise<{
    processed: number;
    skipped: number;
    errors: number;
    completed: number;
  }> {
    console.log("Starting hourly live trade profit distribution...");

    const activeLiveTrades = await this.getActiveLiveTrades();
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0); // Round to the hour

    for (const liveTrade of activeLiveTrades) {
      try {
        // Calculate which hours need profit distribution
        const startTime = new Date(liveTrade.start_time);
        const hoursElapsed = Math.floor(
          (currentHour.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        );

        // Distribute profits for each elapsed hour that hasn't been processed
        for (let hour = 1; hour <= hoursElapsed; hour++) {
          const profitHour = new Date(
            startTime.getTime() + hour * 60 * 60 * 1000
          );

          if (profitHour <= currentHour) {
            const alreadyDistributed = await this.isProfitDistributedForHour(
              liveTrade.id,
              profitHour.toISOString()
            );

            if (!alreadyDistributed) {
              await this.distributeHourlyProfitForLiveTrade(
                liveTrade,
                profitHour.toISOString()
              );
              processed++;
            } else {
              skipped++;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing live trade ${liveTrade.id}:`, error);
        errors++;
      }
    }

    // Complete expired live trades
    const completed = await this.completeExpiredLiveTrades();

    console.log(
      `Hourly profit distribution completed: ${processed} processed, ${skipped} skipped, ${errors} errors, ${completed} completed`
    );

    return { processed, skipped, errors, completed };
  }

  /**
   * Get live trade profit summary for admin
   */
  static async getLiveTradeProfitSummary(): Promise<{
    totalActiveTrades: number;
    totalInvested: number;
    totalProfitsDistributed: number;
    profitsDistributedToday: number;
  }> {
    const summaryQuery = `
      SELECT 
        COUNT(CASE WHEN ult.status = 'active' THEN 1 END) as total_active_trades,
        COALESCE(SUM(CASE WHEN ult.status = 'active' THEN ult.amount ELSE 0 END), 0) as total_invested,
        COALESCE(SUM(ult.total_profit), 0) as total_profits_distributed,
        COALESCE(SUM(CASE WHEN hltp.created_at::date = CURRENT_DATE THEN hltp.profit_amount ELSE 0 END), 0) as profits_distributed_today
      FROM user_live_trades ult
      LEFT JOIN hourly_live_trade_profits hltp ON ult.id = hltp.live_trade_id
    `;

    const result = await db.query(summaryQuery);
    const row = result.rows[0];

    return {
      totalActiveTrades: parseInt(row.total_active_trades),
      totalInvested: parseFloat(row.total_invested),
      totalProfitsDistributed: parseFloat(row.total_profits_distributed),
      profitsDistributedToday: parseFloat(row.profits_distributed_today),
    };
  }
}
