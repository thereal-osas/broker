import { db } from "../../lib/db";
import { ProfitDistributionService } from "./profitDistribution";
import { LiveTradeProfitService } from "../../lib/liveTradeProfit";

export interface DistributionResult {
  success: boolean;
  processed: number;
  skipped: number;
  errors: number;
  completed?: number;
  totalAmount?: number;
  message: string;
  details: string[];
  timestamp: string;
}

export interface CooldownStatus {
  isOnCooldown: boolean;
  nextAllowedTime: Date | null;
  remainingTime: number; // in milliseconds
  remainingTimeFormatted: string;
}

export class ManualDistributionService {
  private static readonly INVESTMENT_COOLDOWN_KEY =
    "last_investment_distribution";
  private static readonly LIVE_TRADE_COOLDOWN_KEY =
    "last_live_trade_distribution";
  private static readonly INVESTMENT_COOLDOWN_HOURS = 24;
  private static readonly LIVE_TRADE_COOLDOWN_HOURS = 1;

  /**
   * Check if investment profit distribution is on cooldown
   */
  static async getInvestmentCooldownStatus(): Promise<CooldownStatus> {
    try {
      const result = await db.query(
        `SELECT value FROM system_settings WHERE key = $1`,
        [this.INVESTMENT_COOLDOWN_KEY]
      );

      if (result.rows.length === 0) {
        return {
          isOnCooldown: false,
          nextAllowedTime: null,
          remainingTime: 0,
          remainingTimeFormatted: "Ready",
        };
      }

      const lastDistribution = new Date(result.rows[0].value);
      const nextAllowed = new Date(
        lastDistribution.getTime() +
          this.INVESTMENT_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      const now = new Date();
      const remainingTime = Math.max(0, nextAllowed.getTime() - now.getTime());

      return {
        isOnCooldown: remainingTime > 0,
        nextAllowedTime: remainingTime > 0 ? nextAllowed : null,
        remainingTime,
        remainingTimeFormatted: this.formatRemainingTime(remainingTime),
      };
    } catch (error) {
      console.error("Error checking investment cooldown:", error);
      return {
        isOnCooldown: false,
        nextAllowedTime: null,
        remainingTime: 0,
        remainingTimeFormatted: "Ready",
      };
    }
  }

  /**
   * Check if live trade profit distribution is on cooldown
   */
  static async getLiveTradeCooldownStatus(): Promise<CooldownStatus> {
    try {
      const result = await db.query(
        `SELECT value FROM system_settings WHERE key = $1`,
        [this.LIVE_TRADE_COOLDOWN_KEY]
      );

      if (result.rows.length === 0) {
        return {
          isOnCooldown: false,
          nextAllowedTime: null,
          remainingTime: 0,
          remainingTimeFormatted: "Ready",
        };
      }

      const lastDistribution = new Date(result.rows[0].value);
      const nextAllowed = new Date(
        lastDistribution.getTime() +
          this.LIVE_TRADE_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      const now = new Date();
      const remainingTime = Math.max(0, nextAllowed.getTime() - now.getTime());

      return {
        isOnCooldown: remainingTime > 0,
        nextAllowedTime: remainingTime > 0 ? nextAllowed : null,
        remainingTime,
        remainingTimeFormatted: this.formatRemainingTime(remainingTime),
      };
    } catch (error) {
      console.error("Error checking live trade cooldown:", error);
      return {
        isOnCooldown: false,
        nextAllowedTime: null,
        remainingTime: 0,
        remainingTimeFormatted: "Ready",
      };
    }
  }

  /**
   * Format remaining time in a human-readable format
   */
  private static formatRemainingTime(milliseconds: number): string {
    if (milliseconds <= 0) return "Ready";

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  }

  /**
   * Update cooldown timestamp
   */
  private static async updateCooldown(key: string): Promise<void> {
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, now]
    );
  }

  /**
   * Run manual investment profit distribution with cooldown check
   */
  static async runInvestmentDistribution(
    adminEmail: string
  ): Promise<DistributionResult> {
    console.log(
      `Admin ${adminEmail} initiated manual investment profit distribution`
    );

    // Check cooldown
    const cooldownStatus = await this.getInvestmentCooldownStatus();
    if (cooldownStatus.isOnCooldown) {
      return {
        success: false,
        processed: 0,
        skipped: 0,
        errors: 0,
        message: "Distribution on cooldown",
        details: [
          `Next distribution allowed in ${cooldownStatus.remainingTimeFormatted}`,
        ],
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Get active investments count for progress tracking
      const activeInvestmentsResult = await db.query(
        `SELECT COUNT(*) as count FROM user_investments 
         WHERE status = 'active' AND end_date > NOW()`
      );
      const activeCount = parseInt(activeInvestmentsResult.rows[0].count);

      if (activeCount === 0) {
        return {
          success: true,
          processed: 0,
          skipped: 0,
          errors: 0,
          message: "No active investments found",
          details: ["No active investments require profit distribution"],
          timestamp: new Date().toISOString(),
        };
      }

      // Run the actual distribution
      const result =
        await ProfitDistributionService.runDailyProfitDistribution();

      // Update cooldown
      await this.updateCooldown(this.INVESTMENT_COOLDOWN_KEY);

      return {
        success: true,
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        totalAmount: 0,
        message: `Investment profit distribution completed successfully`,
        details: [
          `Processed ${result.processed} active investments`,
          `Skipped ${result.skipped} investments (already distributed today)`,
          `Errors: ${result.errors}`,
          `Distribution completed successfully`,
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
   * Run manual live trade profit distribution with cooldown check
   */
  static async runLiveTradeDistribution(
    adminEmail: string
  ): Promise<DistributionResult> {
    console.log(
      `Admin ${adminEmail} initiated manual live trade profit distribution`
    );

    // Check cooldown
    const cooldownStatus = await this.getLiveTradeCooldownStatus();
    if (cooldownStatus.isOnCooldown) {
      return {
        success: false,
        processed: 0,
        skipped: 0,
        errors: 0,
        message: "Distribution on cooldown",
        details: [
          `Next distribution allowed in ${cooldownStatus.remainingTimeFormatted}`,
        ],
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Get active live trades count for progress tracking
      const activeTradesResult = await db.query(
        `SELECT COUNT(*) as count FROM live_trades WHERE status = 'active'`
      );
      const activeCount = parseInt(activeTradesResult.rows[0].count);

      if (activeCount === 0) {
        return {
          success: true,
          processed: 0,
          skipped: 0,
          errors: 0,
          completed: 0,
          message: "No active live trades found",
          details: ["No active live trades require profit distribution"],
          timestamp: new Date().toISOString(),
        };
      }

      // Run the actual distribution
      const result = await LiveTradeProfitService.runManualProfitDistribution();

      // Update cooldown
      await this.updateCooldown(this.LIVE_TRADE_COOLDOWN_KEY);

      return {
        success: true,
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        completed: result.completed,
        message: `Live trade profit distribution completed successfully`,
        details: [
          `Processed ${result.processed} active live trades`,
          `Completed ${result.completed} expired trades`,
          `Skipped ${result.skipped} trades (already processed this hour)`,
          `Errors: ${result.errors}`,
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
}
