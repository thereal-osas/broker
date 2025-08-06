import { NextRequest, NextResponse } from "next/server";
import { db, balanceQueries, transactionQueries } from "../../../../../lib/db";
// import { LiveTradeProfitService } from "@/lib/liveTradeProfit"; // Temporarily disabled

export async function POST(request: NextRequest) {
  try {
    // Verify cron job authorization (in production, use proper authentication)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // Get all active investments that haven't received profit today
    const investmentsQuery = `
      SELECT ui.*, ip.daily_profit_rate, ip.duration_days, ip.name as plan_name
      FROM user_investments ui
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.status = 'active'
      AND ui.start_date::date <= $1
      AND (ui.last_profit_date IS NULL OR ui.last_profit_date < $1)
      AND (ui.start_date::date + INTERVAL '1 day' * ip.duration_days) > $1
    `;

    const investmentsResult = await db.query(investmentsQuery, [today]);
    const investments = investmentsResult.rows;

    let processedCount = 0;
    let totalProfitDistributed = 0;

    for (const investment of investments) {
      try {
        await db.transaction(async (client) => {
          // Calculate daily profit
          const dailyProfit = investment.amount * investment.daily_profit_rate;

          // Check if profit already exists for today (prevent duplicates)
          const existingProfitQuery = `
            SELECT id FROM investment_profits 
            WHERE investment_id = $1 AND profit_date = $2
          `;
          const existingProfit = await client.query(existingProfitQuery, [
            investment.id,
            today,
          ]);

          if (existingProfit.rows.length > 0) {
            return; // Skip if profit already calculated for today
          }

          // Insert profit record
          const profitQuery = `
            INSERT INTO investment_profits (investment_id, profit_amount, profit_date)
            VALUES ($1, $2, $3)
            RETURNING *
          `;
          await client.query(profitQuery, [investment.id, dailyProfit, today]);

          // Update investment total profit and last profit date
          const updateInvestmentQuery = `
            UPDATE user_investments 
            SET total_profit = total_profit + $1, last_profit_date = $2
            WHERE id = $3
          `;
          await client.query(updateInvestmentQuery, [
            dailyProfit,
            today,
            investment.id,
          ]);

          // Add profit to user's profit balance
          await balanceQueries.updateBalance(
            investment.user_id,
            "profit_balance",
            dailyProfit,
            "add"
          );

          // Create transaction record
          await transactionQueries.createTransaction({
            userId: investment.user_id,
            type: "profit",
            amount: dailyProfit,
            balanceType: "profit",
            description: `Daily profit from ${investment.plan_name}`,
            referenceId: investment.id,
            status: "completed",
          });

          processedCount++;
          totalProfitDistributed += dailyProfit;
        });
      } catch (error) {
        console.error(`Error processing investment ${investment.id}:`, error);
        // Continue with other investments even if one fails
      }
    }

    // Check for completed investments
    const completedInvestmentsQuery = `
      UPDATE user_investments 
      SET status = 'completed'
      WHERE status = 'active'
      AND (start_date::date + INTERVAL '1 day' * (
        SELECT duration_days FROM investment_plans WHERE id = user_investments.plan_id
      )) <= $1
      RETURNING id, user_id
    `;

    const completedResult = await db.query(completedInvestmentsQuery, [today]);
    const completedCount = completedResult.rows.length;

    // Also run live trade profit distribution
    // console.log("Running live trade profit distribution...");
    // const liveTradeResult =
    //   await LiveTradeProfitService.runHourlyProfitDistribution();

    return NextResponse.json({
      message: "Profit calculation completed",
      stats: {
        investmentsProcessed: processedCount,
        totalProfitDistributed: totalProfitDistributed.toFixed(2),
        investmentsCompleted: completedCount,
        // liveTradesProcessed: liveTradeResult.processed,
        // liveTradesCompleted: liveTradeResult.completed,
        date: today,
      },
    });
  } catch (error) {
    console.error("Profit calculation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Manual trigger for testing (remove in production)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  // Simulate cron job for testing
  const mockRequest = new NextRequest(request.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET || "test-secret"}`,
    },
  });

  return POST(mockRequest);
}
