import { db } from "./db";

export interface LiveTradeStatus {
  id: number;
  user_id: number;
  amount: number;
  hourly_profit_rate: number;
  duration_hours: number;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'completed' | 'cancelled';
  hours_elapsed: number;
  hours_remaining: number;
  is_expired: boolean;
  progress_percentage: number;
  total_profits_earned: number;
  next_profit_due: string | null;
}

export class LiveTradeStatusService {
  /**
   * Update all live trade statuses and complete expired ones
   */
  static async updateAllLiveTradeStatuses(): Promise<{
    updated: number;
    completed: number;
    details: string[];
  }> {
    console.log("Updating all live trade statuses...");

    try {
      // Get all active live trades
      const activeTrades = await this.getActiveLiveTrades();
      
      let updated = 0;
      let completed = 0;
      const details: string[] = [];

      for (const trade of activeTrades) {
        const hoursElapsed = this.calculateHoursElapsed(trade.start_time);
        
        if (hoursElapsed >= trade.duration_hours) {
          // Complete the trade
          await this.completeLiveTrade(trade.id, trade.user_id, trade.amount);
          completed++;
          details.push(`Completed live trade ${trade.id} - duration reached`);
        } else {
          updated++;
        }
      }

      console.log(`Live trade status update complete: ${updated} updated, ${completed} completed`);
      
      return {
        updated,
        completed,
        details
      };

    } catch (error) {
      console.error("Error updating live trade statuses:", error);
      throw error;
    }
  }

  /**
   * Get enhanced live trade status for a specific trade
   */
  static async getLiveTradeStatus(tradeId: number): Promise<LiveTradeStatus | null> {
    try {
      const result = await db.query(`
        SELECT 
          lt.*,
          EXTRACT(EPOCH FROM (NOW() - lt.start_time)) / 3600 as hours_elapsed,
          CASE 
            WHEN EXTRACT(EPOCH FROM (NOW() - lt.start_time)) / 3600 >= lt.duration_hours THEN true
            ELSE false
          END as is_expired,
          COALESCE(
            (SELECT SUM(profit_amount) FROM hourly_live_trade_profits 
             WHERE live_trade_id = lt.id), 
            0
          ) as total_profits_earned
        FROM live_trades lt
        WHERE lt.id = $1
      `, [tradeId]);

      if (result.rows.length === 0) {
        return null;
      }

      const trade = result.rows[0];
      return this.enhanceTradeStatus(trade);

    } catch (error) {
      console.error(`Error getting live trade status for trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Get all live trades with enhanced status information
   */
  static async getAllLiveTradesWithStatus(): Promise<LiveTradeStatus[]> {
    try {
      const result = await db.query(`
        SELECT 
          lt.*,
          EXTRACT(EPOCH FROM (NOW() - lt.start_time)) / 3600 as hours_elapsed,
          CASE 
            WHEN EXTRACT(EPOCH FROM (NOW() - lt.start_time)) / 3600 >= lt.duration_hours THEN true
            ELSE false
          END as is_expired,
          COALESCE(
            (SELECT SUM(profit_amount) FROM hourly_live_trade_profits 
             WHERE live_trade_id = lt.id), 
            0
          ) as total_profits_earned
        FROM live_trades lt
        ORDER BY lt.start_time DESC
      `);

      return result.rows.map(trade => this.enhanceTradeStatus(trade));

    } catch (error) {
      console.error("Error getting all live trades with status:", error);
      throw error;
    }
  }

  /**
   * Get active live trades that need status checking
   */
  private static async getActiveLiveTrades() {
    const result = await db.query(`
      SELECT 
        id,
        user_id,
        amount,
        duration_hours,
        start_time
      FROM live_trades 
      WHERE status = 'active'
      ORDER BY start_time ASC
    `);

    return result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount),
      duration_hours: parseInt(row.duration_hours)
    }));
  }

  /**
   * Complete a live trade and return capital to user
   */
  private static async completeLiveTrade(tradeId: number, userId: number, amount: number) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Update trade status to completed
      await client.query(
        `UPDATE live_trades SET status = 'completed', end_time = NOW() WHERE id = $1`,
        [tradeId]
      );

      // Return capital to user
      await client.query(
        `UPDATE users SET total_balance = total_balance + $1 WHERE id = $2`,
        [amount, userId]
      );

      // Record capital return transaction
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, balance_type, status, created_at)
         VALUES ($1, 'credit', $2, 'Live Trade Capital Return', 'total', 'completed', NOW())`,
        [userId, amount]
      );

      await client.query('COMMIT');
      console.log(`Completed live trade ${tradeId} and returned capital of $${amount} to user ${userId}`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate hours elapsed since trade start
   */
  private static calculateHoursElapsed(startTime: string): number {
    const start = new Date(startTime);
    const now = new Date();
    return (now.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Enhance trade data with calculated status information
   */
  private static enhanceTradeStatus(trade: any): LiveTradeStatus {
    const hoursElapsed = parseFloat(trade.hours_elapsed) || 0;
    const durationHours = parseInt(trade.duration_hours);
    const isExpired = trade.is_expired || hoursElapsed >= durationHours;
    
    // Calculate hours remaining
    const hoursRemaining = Math.max(0, durationHours - hoursElapsed);
    
    // Calculate progress percentage
    const progressPercentage = Math.min(100, (hoursElapsed / durationHours) * 100);
    
    // Calculate next profit due time
    let nextProfitDue = null;
    if (!isExpired && trade.status === 'active') {
      const nextHour = Math.floor(hoursElapsed) + 1;
      const startTime = new Date(trade.start_time);
      const nextProfitTime = new Date(startTime.getTime() + (nextHour * 60 * 60 * 1000));
      nextProfitDue = nextProfitTime.toISOString();
    }

    return {
      id: parseInt(trade.id),
      user_id: parseInt(trade.user_id),
      amount: parseFloat(trade.amount),
      hourly_profit_rate: parseFloat(trade.hourly_profit_rate),
      duration_hours: durationHours,
      start_time: trade.start_time,
      end_time: trade.end_time,
      status: isExpired ? 'completed' : trade.status,
      hours_elapsed: hoursElapsed,
      hours_remaining: hoursRemaining,
      is_expired: isExpired,
      progress_percentage: progressPercentage,
      total_profits_earned: parseFloat(trade.total_profits_earned) || 0,
      next_profit_due: nextProfitDue
    };
  }

  /**
   * Force complete a specific live trade (admin action)
   */
  static async forceCompleteLiveTrade(tradeId: number, adminEmail: string): Promise<{
    success: boolean;
    message: string;
    details: string[];
  }> {
    try {
      // Get trade details
      const result = await db.query(`
        SELECT id, user_id, amount, status 
        FROM live_trades 
        WHERE id = $1
      `, [tradeId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          message: "Live trade not found",
          details: [`Trade ID ${tradeId} does not exist`]
        };
      }

      const trade = result.rows[0];
      
      if (trade.status !== 'active') {
        return {
          success: false,
          message: "Trade is not active",
          details: [`Trade ${tradeId} has status: ${trade.status}`]
        };
      }

      // Complete the trade
      await this.completeLiveTrade(trade.id, trade.user_id, parseFloat(trade.amount));

      console.log(`Admin ${adminEmail} force completed live trade ${tradeId}`);

      return {
        success: true,
        message: "Live trade completed successfully",
        details: [
          `Trade ${tradeId} has been completed`,
          `Capital of $${trade.amount} returned to user`,
          `Completed by admin: ${adminEmail}`
        ]
      };

    } catch (error) {
      console.error(`Error force completing live trade ${tradeId}:`, error);
      return {
        success: false,
        message: "Failed to complete live trade",
        details: [`Error: ${error instanceof Error ? error.message : "Unknown error"}`]
      };
    }
  }
}
