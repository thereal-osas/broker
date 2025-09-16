import { db } from "./db";

export interface DistributionResult {
  success: boolean;
  processed: number;
  skipped: number;
  errors: number;
  completed?: number;
  message: string;
  details: string[];
  timestamp: string;
}

export class SmartDistributionService {
  /**
   * Smart investment profit distribution - only processes eligible investments
   */
  static async runInvestmentDistribution(
    adminEmail: string
  ): Promise<DistributionResult> {
    console.log(
      `Admin ${adminEmail} initiated smart investment profit distribution`
    );

    try {
      // Get all active investments that are eligible for today's profit
      const eligibleInvestments = await this.getEligibleInvestments();

      if (eligibleInvestments.length === 0) {
        return {
          success: true,
          processed: 0,
          skipped: 0,
          errors: 0,
          message: "No eligible investments found",
          details: [
            "All active investments have already received today's profit",
          ],
          timestamp: new Date().toISOString(),
        };
      }

      let processed = 0;
      let errors = 0;
      const details: string[] = [];

      for (const investment of eligibleInvestments) {
        try {
          await this.distributeInvestmentProfit(investment);
          processed++;
          details.push(
            `Distributed profit for investment ${investment.id} (User: ${investment.email})`
          );
        } catch (error) {
          errors++;
          console.error(
            `Error distributing profit for investment ${investment.id}:`,
            error
          );
          details.push(
            `Failed to distribute profit for investment ${investment.id}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return {
        success: true,
        processed,
        skipped: 0,
        errors,
        message: `Investment profit distribution completed`,
        details: [
          `Found ${eligibleInvestments.length} eligible investments`,
          `Successfully processed: ${processed}`,
          `Errors: ${errors}`,
          ...details,
        ],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Investment distribution error:", error);
      return {
        success: false,
        processed: 0,
        skipped: 0,
        errors: 1,
        message: "Distribution failed",
        details: [
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Smart live trade profit distribution - only processes eligible trades
   */
  static async runLiveTradeDistribution(
    adminEmail: string
  ): Promise<DistributionResult> {
    console.log(
      `Admin ${adminEmail} initiated smart live trade profit distribution`
    );

    try {
      // Get all active live trades that are eligible for this hour's profit
      const eligibleTrades = await this.getEligibleLiveTrades();

      if (eligibleTrades.length === 0) {
        return {
          success: true,
          processed: 0,
          skipped: 0,
          errors: 0,
          completed: 0,
          message: "No eligible live trades found",
          details: [
            "All active live trades have already received this hour's profit",
          ],
          timestamp: new Date().toISOString(),
        };
      }

      let processed = 0;
      let completed = 0;
      let errors = 0;
      const details: string[] = [];

      for (const trade of eligibleTrades) {
        try {
          const result = await this.distributeLiveTradeProfit(trade);
          processed++;

          if (result.completed) {
            completed++;
            details.push(
              `Completed live trade ${trade.id} and returned capital to user ${trade.email}`
            );
          } else {
            details.push(
              `Distributed hourly profit for live trade ${trade.id} (User: ${trade.email})`
            );
          }
        } catch (error) {
          errors++;
          console.error(`Error processing live trade ${trade.id}:`, error);
          details.push(
            `Failed to process live trade ${trade.id}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return {
        success: true,
        processed,
        skipped: 0,
        errors,
        completed,
        message: `Live trade profit distribution completed`,
        details: [
          `Found ${eligibleTrades.length} eligible live trades`,
          `Successfully processed: ${processed}`,
          `Completed trades: ${completed}`,
          `Errors: ${errors}`,
          ...details,
        ],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Live trade distribution error:", error);
      return {
        success: false,
        processed: 0,
        skipped: 0,
        errors: 1,
        completed: 0,
        message: "Distribution failed",
        details: [
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get investments that are eligible for today's profit distribution
   */
  private static async getEligibleInvestments() {
    const result = await db.query(`
      SELECT 
        ui.id,
        ui.user_id,
        ui.amount,
        ui.daily_profit_rate,
        ui.duration_days,
        ui.start_date,
        ui.end_date,
        u.email,
        u.first_name,
        u.last_name
      FROM user_investments ui
      JOIN users u ON ui.user_id = u.id
      WHERE ui.status = 'active'
        AND ui.end_date > NOW()
        AND NOT EXISTS (
          SELECT 1 FROM profit_distributions pd
          WHERE pd.user_id = ui.user_id
            AND pd.investment_id = ui.id
            AND DATE(pd.distribution_date) = CURRENT_DATE
        )
      ORDER BY ui.created_at ASC
    `);

    return result.rows.map((row) => ({
      ...row,
      amount: parseFloat(row.amount),
      daily_profit_rate: parseFloat(row.daily_profit_rate),
    }));
  }

  /**
   * Get live trades that are eligible for this hour's profit distribution
   */
  private static async getEligibleLiveTrades() {
    const result = await db.query(`
      SELECT
        ult.id,
        ult.user_id,
        ult.amount,
        ltp.hourly_profit_rate,
        ltp.duration_hours,
        ult.start_time,
        ult.end_time,
        ult.status,
        u.email,
        u.first_name,
        u.last_name,
        EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 as hours_elapsed
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      JOIN users u ON ult.user_id = u.id
      WHERE ult.status = 'active'
        AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours > NOW()
        AND NOT EXISTS (
          SELECT 1 FROM hourly_live_trade_profits hltp
          WHERE hltp.live_trade_id = ult.id
            AND hltp.profit_hour = DATE_TRUNC('hour', NOW())
        )
      ORDER BY ult.start_time ASC
    `);

    return result.rows.map((row) => ({
      ...row,
      amount: parseFloat(row.amount),
      hourly_profit_rate: parseFloat(row.hourly_profit_rate),
      hours_elapsed: parseFloat(row.hours_elapsed),
    }));
  }

  /**
   * Distribute profit for a single investment
   */
  private static async distributeInvestmentProfit(investment: any) {
    return await db.transaction(async (client) => {
      const dailyProfit = investment.amount * investment.daily_profit_rate;

      // Add profit to user's balance
      await client.query(
        `UPDATE users SET total_balance = total_balance + $1 WHERE id = $2`,
        [dailyProfit, investment.user_id]
      );

      // Record the profit distribution
      await client.query(
        `INSERT INTO profit_distributions (user_id, investment_id, amount, profit_amount, distribution_date, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW())`,
        [investment.user_id, investment.id, investment.amount, dailyProfit]
      );

      // Record transaction
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, balance_type, status, created_at)
         VALUES ($1, 'credit', $2, 'Daily Investment Profit', 'total', 'completed', NOW())`,
        [investment.user_id, dailyProfit]
      );

      console.log(
        `Distributed daily profit of $${dailyProfit} for investment ${investment.id}`
      );
      return { success: true };
    });
  }

  /**
   * Distribute profit for a single live trade and complete if necessary
   */
  private static async distributeLiveTradeProfit(
    trade: any
  ): Promise<{ completed: boolean }> {
    return await db.transaction(async (client) => {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0); // Round to current hour
      const hourlyProfit = trade.amount * trade.hourly_profit_rate;
      let completed = false;

      // Check if trade should be completed (duration exceeded)
      const tradeEndTime = new Date(
        trade.start_time.getTime() + trade.duration_hours * 60 * 60 * 1000
      );
      if (currentHour >= tradeEndTime) {
        // Complete the trade and return capital
        await client.query(
          `UPDATE user_live_trades SET status = 'completed', end_time = NOW() WHERE id = $1`,
          [trade.id]
        );

        // Return capital to user
        await client.query(
          `UPDATE users SET total_balance = total_balance + $1 WHERE id = $2`,
          [trade.amount, trade.user_id]
        );

        // Record capital return transaction
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, balance_type, status, created_at)
           VALUES ($1, 'profit', $2, 'Live Trade Capital Return', 'total', 'completed', NOW())`,
          [trade.user_id, trade.amount]
        );

        completed = true;
        console.log(
          `Completed live trade ${trade.id} and returned capital of $${trade.amount}`
        );
      } else {
        // Distribute hourly profit
        await client.query(
          `UPDATE users SET total_balance = total_balance + $1 WHERE id = $2`,
          [hourlyProfit, trade.user_id]
        );

        // Record hourly profit
        await client.query(
          `INSERT INTO hourly_live_trade_profits (live_trade_id, profit_amount, profit_hour, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [trade.id, hourlyProfit, currentHour.toISOString()]
        );

        // Record transaction
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, balance_type, status, created_at)
           VALUES ($1, 'profit', $2, 'Live Trade Hourly Profit', 'total', 'completed', NOW())`,
          [trade.user_id, hourlyProfit]
        );

        console.log(
          `Distributed hourly profit of $${hourlyProfit} for live trade ${trade.id} at ${currentHour.toISOString()}`
        );
      }

      return { completed };
    });
  }
}
