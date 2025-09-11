import { db } from "../../lib/db";

interface ActiveInvestment {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  daily_profit_rate: number;
  duration_days: number;
  created_at: string;
  days_completed: number;
}

interface ProfitDistribution {
  investment_id: string;
  user_id: string;
  amount: number;
  profit_amount: number;
  distribution_date: string;
}

export class ProfitDistributionService {
  /**
   * Calculate daily profit for an investment
   */
  static calculateDailyProfit(
    investmentAmount: number,
    dailyRate: number
  ): number {
    return investmentAmount * dailyRate;
  }

  /**
   * Get all active investments that need profit distribution
   */
  static async getActiveInvestments(): Promise<ActiveInvestment[]> {
    const query = `
      SELECT 
        ui.id,
        ui.user_id,
        ui.plan_id,
        ui.amount,
        ui.created_at,
        ip.daily_profit_rate,
        ip.duration_days,
        COALESCE(
          (SELECT COUNT(*) FROM profit_distributions pd WHERE pd.investment_id = ui.id),
          0
        ) as days_completed
      FROM user_investments ui
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.status = 'active'
      AND COALESCE(
        (SELECT COUNT(*) FROM profit_distributions pd WHERE pd.investment_id = ui.id),
        0
      ) < ip.duration_days
    `;

    const result = await db.query(query);
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      plan_id: String(row.plan_id),
      created_at: String(row.created_at),
      amount: parseFloat(String(row.amount)),
      daily_profit_rate: parseFloat(String(row.daily_profit_rate)),
      duration_days: parseInt(String(row.duration_days)),
      days_completed: parseInt(String(row.days_completed)),
    }));
  }

  /**
   * Check if profit has already been distributed for today for a specific investment
   */
  static async isProfitDistributedToday(
    investmentId: string
  ): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];
    const query = `
      SELECT COUNT(*) as count
      FROM profit_distributions
      WHERE investment_id = $1 
      AND DATE(distribution_date) = $2
    `;

    const result = await db.query(query, [investmentId, today]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Distribute profit for a single investment
   */
  static async distributeProfitForInvestment(
    investment: ActiveInvestment
  ): Promise<void> {
    const profitAmount = this.calculateDailyProfit(
      investment.amount,
      investment.daily_profit_rate
    );

    try {
      await db.query("BEGIN");

      // 1. Add profit to user's total balance (simplified balance system)
      const updateBalanceQuery = `
        UPDATE user_balances
        SET total_balance = total_balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `;
      await db.query(updateBalanceQuery, [profitAmount, investment.user_id]);

      // 2. Create profit distribution record
      const createDistributionQuery = `
        INSERT INTO profit_distributions (
          investment_id, user_id, amount, profit_amount, distribution_date
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      await db.query(createDistributionQuery, [
        investment.id,
        investment.user_id,
        investment.amount,
        profitAmount,
      ]);

      // 3. Create transaction record
      const createTransactionQuery = `
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, 
          reference_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;
      await db.query(createTransactionQuery, [
        investment.user_id,
        "profit",
        profitAmount,
        "total", // ✅ Use valid balance type
        `Daily profit from investment #${investment.id}`,
        investment.id,
        "completed",
      ]);

      // 4. Update investment total profit
      const updateInvestmentQuery = `
        UPDATE user_investments 
        SET total_profit = total_profit + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await db.query(updateInvestmentQuery, [profitAmount, investment.id]);

      // 5. Check if investment period is complete
      const newDaysCompleted = investment.days_completed + 1;
      if (newDaysCompleted >= investment.duration_days) {
        const completeInvestmentQuery = `
          UPDATE user_investments 
          SET status = 'completed',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        await db.query(completeInvestmentQuery, [investment.id]);

        // Create completion transaction
        await db.query(createTransactionQuery, [
          investment.user_id,
          "admin_funding", // ✅ Use valid transaction type for principal return
          investment.amount,
          "total",
          `Investment #${investment.id} completed - principal returned`,
          investment.id,
          "completed",
        ]);

        // Return principal to total balance
        await db.query(updateBalanceQuery, [
          investment.amount,
          investment.user_id,
        ]);
      }

      await db.query("COMMIT");
      console.log(
        `Profit distributed for investment ${investment.id}: $${profitAmount}`
      );
    } catch (error) {
      await db.query("ROLLBACK");
      console.error(
        `Error distributing profit for investment ${investment.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Run daily profit distribution for all active investments
   */
  static async runDailyProfitDistribution(): Promise<{
    processed: number;
    skipped: number;
    errors: number;
  }> {
    console.log("Starting daily profit distribution...");

    const activeInvestments = await this.getActiveInvestments();
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const investment of activeInvestments) {
      try {
        // Check if profit already distributed today
        const alreadyDistributed = await this.isProfitDistributedToday(
          investment.id
        );

        if (alreadyDistributed) {
          console.log(
            `Profit already distributed today for investment ${investment.id}`
          );
          skipped++;
          continue;
        }

        await this.distributeProfitForInvestment(investment);
        processed++;
      } catch (error) {
        console.error(`Error processing investment ${investment.id}:`, error);
        errors++;
      }
    }

    console.log(
      `Daily profit distribution completed: ${processed} processed, ${skipped} skipped, ${errors} errors`
    );

    return { processed, skipped, errors };
  }

  /**
   * Get profit distribution history for a user
   */
  static async getUserProfitHistory(
    userId: string,
    limit: number = 50
  ): Promise<ProfitDistribution[]> {
    const query = `
      SELECT 
        pd.*,
        ui.plan_id,
        ip.name as plan_name
      FROM profit_distributions pd
      JOIN user_investments ui ON pd.investment_id = ui.id
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE pd.user_id = $1
      ORDER BY pd.distribution_date DESC
      LIMIT $2
    `;

    const result = await db.query(query, [userId, limit]);
    return result.rows.map((row: Record<string, unknown>) => ({
      investment_id: String(row.investment_id),
      user_id: String(row.user_id),
      distribution_date: String(row.distribution_date),
      amount: parseFloat(String(row.amount)),
      profit_amount: parseFloat(String(row.profit_amount)),
    }));
  }

  /**
   * Get total profits earned by a user
   */
  static async getUserTotalProfits(userId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(profit_amount), 0) as total_profits
      FROM profit_distributions
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return parseFloat(result.rows[0].total_profits);
  }
}
