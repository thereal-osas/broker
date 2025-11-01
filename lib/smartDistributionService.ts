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
   * Smart investment profit distribution - processes ALL missed days for eligible investments
   */
  static async runInvestmentDistribution(
    adminEmail: string
  ): Promise<DistributionResult> {
    console.log(
      `Admin ${adminEmail} initiated smart investment profit distribution`
    );

    try {
      // Get all active investments that have missing profit distributions
      const eligibleInvestments = await this.getEligibleInvestments();

      if (eligibleInvestments.length === 0) {
        return {
          success: true,
          processed: 0,
          skipped: 0,
          errors: 0,
          message: "No eligible investments found",
          details: [
            "All active investments have received all their daily profits",
          ],
          timestamp: new Date().toISOString(),
        };
      }

      let totalDaysProcessed = 0;
      let totalProfitDistributed = 0;
      let investmentsProcessed = 0;
      let errors = 0;
      const details: string[] = [];

      for (const investment of eligibleInvestments) {
        try {
          const result = await this.distributeInvestmentProfit(investment);
          investmentsProcessed++;
          totalDaysProcessed += result.daysDistributed;
          totalProfitDistributed += result.totalProfit;

          details.push(
            `✅ Investment ${investment.id} (${investment.email}): Distributed ${result.daysDistributed} day(s) of profit ($${result.totalProfit.toFixed(2)})`
          );
        } catch (error) {
          errors++;
          console.error(
            `Error distributing profit for investment ${investment.id}:`,
            error
          );
          details.push(
            `❌ Failed to process investment ${investment.id}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return {
        success: true,
        processed: investmentsProcessed,
        skipped: 0,
        errors,
        message: `Investment profit distribution completed: ${totalDaysProcessed} day(s) processed, $${totalProfitDistributed.toFixed(2)} distributed`,
        details: [
          `Found ${eligibleInvestments.length} eligible investments`,
          `Successfully processed: ${investmentsProcessed} investments`,
          `Total days distributed: ${totalDaysProcessed}`,
          `Total profit distributed: $${totalProfitDistributed.toFixed(2)}`,
          `Errors: ${errors}`,
          "",
          "Details:",
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
   * Distributes ALL elapsed hours of profit since last distribution
   */
  static async runLiveTradeDistribution(
    adminEmail: string
  ): Promise<DistributionResult> {
    console.log(
      `Admin ${adminEmail} initiated smart live trade profit distribution`
    );

    try {
      // Get all active live trades that need profit distribution
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
            "All active live trades have received all their profits",
          ],
          timestamp: new Date().toISOString(),
        };
      }

      let totalHoursProcessed = 0;
      let totalProfitDistributed = 0;
      let tradesProcessed = 0;
      let completed = 0;
      let errors = 0;
      const details: string[] = [];

      for (const trade of eligibleTrades) {
        try {
          const result = await this.distributeLiveTradeProfit(trade);
          tradesProcessed++;
          totalHoursProcessed += result.hoursDistributed;
          totalProfitDistributed += result.totalProfit;

          if (result.completed) {
            completed++;
            details.push(
              `✅ Completed trade ${trade.id} (${trade.email}): Distributed ${result.hoursDistributed} hours of profit ($${result.totalProfit.toFixed(2)}) + returned capital ($${trade.amount.toFixed(2)})`
            );
          } else {
            details.push(
              `✅ Trade ${trade.id} (${trade.email}): Distributed ${result.hoursDistributed} hours of profit ($${result.totalProfit.toFixed(2)})`
            );
          }
        } catch (error) {
          errors++;
          console.error(`Error processing live trade ${trade.id}:`, error);
          details.push(
            `❌ Failed to process trade ${trade.id}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return {
        success: true,
        processed: tradesProcessed,
        skipped: 0,
        errors,
        completed,
        message: `Live trade profit distribution completed: ${totalHoursProcessed} hours processed, $${totalProfitDistributed.toFixed(2)} distributed`,
        details: [
          `Found ${eligibleTrades.length} eligible live trades`,
          `Successfully processed: ${tradesProcessed} trades`,
          `Total hours distributed: ${totalHoursProcessed}`,
          `Total profit distributed: $${totalProfitDistributed.toFixed(2)}`,
          `Completed trades: ${completed}`,
          `Errors: ${errors}`,
          "",
          "Details:",
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
   * Get investments that are eligible for profit distribution
   * Returns investments that have missing daily profit distributions
   */
  private static async getEligibleInvestments() {
    try {
      console.log("🔍 Searching for eligible investments...");

      // First, try to check if profit_distributions table exists
      const tableExistsResult = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'profit_distributions'
        );
      `);

      const tableExists = tableExistsResult.rows[0].exists;

      let query;
      if (tableExists) {
        // Get all active investments with their distribution counts
        // This allows us to detect investments with missing days
        query = `
          SELECT
            ui.id,
            ui.user_id,
            ui.amount,
            ip.daily_profit_rate,
            ip.duration_days,
            ui.start_date,
            ui.end_date,
            u.email,
            u.first_name,
            u.last_name,
            DATE(ui.start_date) as start_date_only,
            CURRENT_DATE as current_date,
            (CURRENT_DATE - DATE(ui.start_date)) as days_elapsed,
            COALESCE(
              (SELECT COUNT(DISTINCT DATE(pd.distribution_date))
               FROM profit_distributions pd
               WHERE pd.user_id = ui.user_id
                 AND pd.investment_id = ui.id),
              0
            ) as days_distributed
          FROM user_investments ui
          JOIN users u ON ui.user_id = u.id
          JOIN investment_plans ip ON ui.plan_id = ip.id
          WHERE ui.status = 'active'
            AND ui.end_date > NOW()
            AND DATE(ui.start_date) < CURRENT_DATE
            AND (
              -- Has missing profit distributions
              COALESCE(
                (SELECT COUNT(DISTINCT DATE(pd.distribution_date))
                 FROM profit_distributions pd
                 WHERE pd.user_id = ui.user_id
                   AND pd.investment_id = ui.id),
                0
              ) < LEAST(
                (CURRENT_DATE - DATE(ui.start_date)),
                ip.duration_days
              )
            )
          ORDER BY ui.created_at ASC
        `;
      } else {
        // Fallback: get all active investments (table doesn't exist yet)
        console.log(
          "profit_distributions table does not exist, returning all active investments"
        );
        query = `
          SELECT
            ui.id,
            ui.user_id,
            ui.amount,
            ip.daily_profit_rate,
            ip.duration_days,
            ui.start_date,
            ui.end_date,
            u.email,
            u.first_name,
            u.last_name,
            DATE(ui.start_date) as start_date_only,
            CURRENT_DATE as current_date,
            (CURRENT_DATE - DATE(ui.start_date)) as days_elapsed,
            0 as days_distributed
          FROM user_investments ui
          JOIN users u ON ui.user_id = u.id
          JOIN investment_plans ip ON ui.plan_id = ip.id
          WHERE ui.status = 'active'
            AND ui.end_date > NOW()
            AND DATE(ui.start_date) < CURRENT_DATE
          ORDER BY ui.created_at ASC
        `;
      }

      const result = await db.query(query);

      console.log(`✅ Found ${result.rows.length} eligible investments`);

      if (result.rows.length > 0) {
        console.log("Investment details:");
        result.rows.forEach((row) => {
          const daysElapsed = parseInt(row.days_elapsed);
          const daysDistributed = parseInt(row.days_distributed);
          const maxDays = Math.min(daysElapsed, row.duration_days);
          const missingDays = maxDays - daysDistributed;

          console.log(`  - Investment ${row.id}: ${missingDays} days pending (${daysDistributed}/${maxDays} distributed)`);
        });
      }

      return result.rows.map((row) => ({
        ...row,
        amount: parseFloat(row.amount),
        daily_profit_rate: parseFloat(row.daily_profit_rate),
        days_elapsed: parseInt(row.days_elapsed),
        days_distributed: parseInt(row.days_distributed),
      }));
    } catch (error) {
      console.error("Error in getEligibleInvestments:", error);
      throw error;
    }
  }

  /**
   * Get live trades that need profit distribution
   * Returns trades that have elapsed hours without profit distribution
   */
  private static async getEligibleLiveTrades() {
    try {
      console.log("🔍 Searching for eligible live trades...");

      // Get all active live trades that have missing profit distributions
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
          FLOOR(EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600) as hours_elapsed,
          COALESCE(
            (SELECT COUNT(*) FROM hourly_live_trade_profits hltp WHERE hltp.live_trade_id = ult.id),
            0
          ) as hours_distributed
        FROM user_live_trades ult
        JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
        JOIN users u ON ult.user_id = u.id
        WHERE ult.status = 'active'
          AND ult.start_time <= NOW()
          AND (
            -- Has elapsed at least 1 hour
            EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600 >= 1
          )
          AND (
            -- Has missing profit distributions
            COALESCE(
              (SELECT COUNT(*) FROM hourly_live_trade_profits hltp WHERE hltp.live_trade_id = ult.id),
              0
            ) < LEAST(
              FLOOR(EXTRACT(EPOCH FROM (NOW() - ult.start_time)) / 3600),
              ltp.duration_hours
            )
          )
        ORDER BY ult.start_time ASC
      `);

      console.log(`✅ Found ${result.rows.length} eligible live trades`);

      if (result.rows.length > 0) {
        console.log("Trade details:");
        result.rows.forEach((row) => {
          const hoursElapsed = parseInt(row.hours_elapsed);
          const hoursDistributed = parseInt(row.hours_distributed);
          const maxHours = Math.min(hoursElapsed, row.duration_hours);
          const missingHours = maxHours - hoursDistributed;

          console.log(`  - Trade ${row.id}: ${missingHours} hours pending (${hoursDistributed}/${maxHours} distributed)`);
        });
      }

      return result.rows.map((row) => ({
        ...row,
        amount: parseFloat(row.amount),
        hourly_profit_rate: parseFloat(row.hourly_profit_rate),
        hours_elapsed: parseInt(row.hours_elapsed),
        hours_distributed: parseInt(row.hours_distributed),
      }));
    } catch (error) {
      console.error("Error in getEligibleLiveTrades:", error);
      throw error;
    }
  }

  /**
   * Distribute profit for a single investment - handles ALL missed days
   * Calculates how many days have passed and distributes profit for each day
   */
  private static async distributeInvestmentProfit(
    investment: any
  ): Promise<{ daysDistributed: number; totalProfit: number }> {
    const dailyProfit = investment.amount * investment.daily_profit_rate;
    let daysDistributed = 0;
    let totalProfit = 0;

    try {
      console.log(`\n📊 Processing investment ${investment.id}:`);
      console.log(`  Amount: $${investment.amount}`);
      console.log(`  Daily rate: ${(investment.daily_profit_rate * 100).toFixed(4)}%`);
      console.log(`  Duration: ${investment.duration_days} days`);
      console.log(`  Start date: ${investment.start_date}`);

      // Calculate investment end date
      const startDate = new Date(investment.start_date);
      const endDate = new Date(investment.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      console.log(`  End date: ${endDate.toISOString()}`);

      // Calculate how many days have elapsed since start
      const startDateOnly = new Date(startDate);
      startDateOnly.setHours(0, 0, 0, 0);

      const totalElapsedDays = Math.floor(
        (today.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`  Total elapsed days: ${totalElapsedDays}`);

      // Cap at duration days
      const maxDaysToDistribute = Math.min(totalElapsedDays, investment.duration_days);
      console.log(`  Max days to distribute: ${maxDaysToDistribute}`);

      // Get already distributed days
      const distributedResult = await db.query(
        `SELECT COUNT(DISTINCT DATE(distribution_date)) as count
         FROM profit_distributions
         WHERE user_id = $1 AND investment_id = $2`,
        [investment.user_id, investment.id]
      );
      const alreadyDistributed = parseInt(distributedResult.rows[0].count);
      console.log(`  Already distributed: ${alreadyDistributed} days`);

      // Calculate days that need distribution
      const daysToDistribute = maxDaysToDistribute - alreadyDistributed;
      console.log(`  Days to distribute now: ${daysToDistribute}`);

      if (daysToDistribute <= 0) {
        console.log(`  ⏭️  No days to distribute`);
        return { daysDistributed: 0, totalProfit: 0 };
      }

      // Get list of dates that already have distributions
      const existingDatesResult = await db.query(
        `SELECT DISTINCT DATE(distribution_date) as dist_date
         FROM profit_distributions
         WHERE user_id = $1 AND investment_id = $2
         ORDER BY dist_date`,
        [investment.user_id, investment.id]
      );
      const existingDates = new Set(
        existingDatesResult.rows.map(row => row.dist_date.toISOString().split('T')[0])
      );

      // Distribute profit for each missing day
      for (let dayOffset = 0; dayOffset < maxDaysToDistribute; dayOffset++) {
        const distributionDate = new Date(startDateOnly);
        distributionDate.setDate(distributionDate.getDate() + dayOffset + 1); // +1 because first profit is on day after start
        const dateStr = distributionDate.toISOString().split('T')[0];

        // Skip if this date already has a distribution
        if (existingDates.has(dateStr)) {
          continue;
        }

        console.log(`  💰 Distributing day ${dayOffset + 1}: ${dateStr}`);

        // Add profit to user balance
        await db.query(
          `UPDATE user_balances SET total_balance = total_balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [dailyProfit, investment.user_id]
        );

        // Record the profit distribution with the specific date
        await db.query(
          `INSERT INTO profit_distributions (user_id, investment_id, amount, profit_amount, distribution_date, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [investment.user_id, investment.id, investment.amount, dailyProfit, distributionDate]
        );

        // Record transaction
        await db.query(
          `INSERT INTO transactions (user_id, type, amount, description, balance_type, status, created_at)
           VALUES ($1, 'profit', $2, $3, 'total', 'completed', NOW())`,
          [
            investment.user_id,
            dailyProfit,
            `Investment Daily Profit (Day ${dayOffset + 1}/${investment.duration_days})`
          ]
        );

        // Update investment total profit
        await db.query(
          `UPDATE user_investments SET total_profit = total_profit + $1, updated_at = NOW() WHERE id = $2`,
          [dailyProfit, investment.id]
        );

        daysDistributed++;
        totalProfit += dailyProfit;
      }

      console.log(`  ✅ Distributed ${daysDistributed} days, total: $${totalProfit.toFixed(2)}`);

      return { daysDistributed, totalProfit };
    } catch (error) {
      console.error(
        `Error distributing profit for investment ${investment.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Distribute profit for a single live trade - handles ALL elapsed hours
   * Calculates how many hours have passed and distributes profit for each hour
   */
  private static async distributeLiveTradeProfit(
    trade: any
  ): Promise<{ completed: boolean; hoursDistributed: number; totalProfit: number }> {
    const now = new Date();
    const startTime = new Date(trade.start_time);
    const hourlyProfit = trade.amount * trade.hourly_profit_rate;
    let completed = false;
    let hoursDistributed = 0;
    let totalProfit = 0;

    try {
      console.log(`\n📊 Processing live trade ${trade.id}:`);
      console.log(`  Amount: $${trade.amount}`);
      console.log(`  Hourly rate: ${(trade.hourly_profit_rate * 100).toFixed(2)}%`);
      console.log(`  Duration: ${trade.duration_hours} hours`);
      console.log(`  Start time: ${startTime.toISOString()}`);

      // Calculate trade end time
      const tradeEndTime = new Date(
        startTime.getTime() + trade.duration_hours * 60 * 60 * 1000
      );
      console.log(`  End time: ${tradeEndTime.toISOString()}`);

      // Calculate how many hours have elapsed since start
      const totalElapsedHours = Math.floor(
        (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      );
      console.log(`  Total elapsed hours: ${totalElapsedHours}`);

      // Cap at duration hours
      const maxHoursToDistribute = Math.min(totalElapsedHours, trade.duration_hours);
      console.log(`  Max hours to distribute: ${maxHoursToDistribute}`);

      // Get already distributed hours
      const distributedResult = await db.query(
        `SELECT COUNT(*) as count FROM hourly_live_trade_profits WHERE live_trade_id = $1`,
        [trade.id]
      );
      const alreadyDistributed = parseInt(distributedResult.rows[0].count);
      console.log(`  Already distributed: ${alreadyDistributed} hours`);

      // Calculate hours that need distribution
      const hoursToDistribute = maxHoursToDistribute - alreadyDistributed;
      console.log(`  Hours to distribute now: ${hoursToDistribute}`);

      if (hoursToDistribute <= 0) {
        console.log(`  ⏭️  No hours to distribute`);

        // Check if trade should be completed
        if (now >= tradeEndTime && trade.status === 'active') {
          await this.completeLiveTrade(trade);
          completed = true;
        }

        return { completed, hoursDistributed: 0, totalProfit: 0 };
      }

      // Distribute profit for each missing hour
      for (let i = 0; i < hoursToDistribute; i++) {
        const hourNumber = alreadyDistributed + i + 1;
        const profitHour = new Date(
          startTime.getTime() + hourNumber * 60 * 60 * 1000
        );

        console.log(`  💰 Distributing hour ${hourNumber}: ${profitHour.toISOString()}`);

        // Add profit to user balance
        await db.query(
          `UPDATE user_balances SET total_balance = total_balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [hourlyProfit, trade.user_id]
        );

        // Record hourly profit
        await db.query(
          `INSERT INTO hourly_live_trade_profits (live_trade_id, profit_amount, profit_hour, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [trade.id, hourlyProfit, profitHour.toISOString()]
        );

        // Record transaction
        await db.query(
          `INSERT INTO transactions (user_id, type, amount, description, balance_type, status, created_at)
           VALUES ($1, 'profit', $2, $3, 'total', 'completed', NOW())`,
          [
            trade.user_id,
            hourlyProfit,
            `Live Trade Hourly Profit (Hour ${hourNumber}/${trade.duration_hours})`
          ]
        );

        // Update trade total profit
        await db.query(
          `UPDATE user_live_trades SET total_profit = total_profit + $1, updated_at = NOW() WHERE id = $2`,
          [hourlyProfit, trade.id]
        );

        hoursDistributed++;
        totalProfit += hourlyProfit;
      }

      console.log(`  ✅ Distributed ${hoursDistributed} hours, total: $${totalProfit.toFixed(2)}`);

      // Check if trade should be completed (all hours distributed)
      const totalDistributedNow = alreadyDistributed + hoursDistributed;
      if (totalDistributedNow >= trade.duration_hours && trade.status === 'active') {
        console.log(`  🏁 Trade completed - returning capital`);
        await this.completeLiveTrade(trade);
        completed = true;
      }

      return { completed, hoursDistributed, totalProfit };
    } catch (error) {
      console.error(
        `Error distributing profit for live trade ${trade.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Complete a live trade and return capital to user
   */
  private static async completeLiveTrade(trade: any): Promise<void> {
    // Update trade status
    await db.query(
      `UPDATE user_live_trades SET status = 'completed', end_time = NOW(), updated_at = NOW() WHERE id = $1`,
      [trade.id]
    );

    // Return capital to user
    await db.query(
      `UPDATE user_balances SET total_balance = total_balance + $1, updated_at = NOW() WHERE user_id = $2`,
      [trade.amount, trade.user_id]
    );

    // Record capital return transaction
    await db.query(
      `INSERT INTO transactions (user_id, type, amount, description, balance_type, status, created_at)
       VALUES ($1, 'credit', $2, 'Live Trade Capital Return', 'total', 'completed', NOW())`,
      [trade.user_id, trade.amount]
    );

    console.log(
      `Completed live trade ${trade.id} and returned capital of $${trade.amount}`
    );
  }
}
