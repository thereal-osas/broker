import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.log(`Admin ${session.user.email} requested live trade profit debug info`);

    // 1. Get all live trades
    const allTradesQuery = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.amount,
        ult.status,
        ult.start_time,
        ult.end_time,
        ult.total_profit,
        ult.created_at,
        ltp.name as plan_name,
        ltp.hourly_profit_rate,
        ltp.duration_hours,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed,
        ult.start_time + INTERVAL '1 hour' * ltp.duration_hours as expected_end_time
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      ORDER BY ult.created_at DESC
      LIMIT 10
    `;

    const allTrades = await db.query(allTradesQuery);

    // 2. Get active trades specifically
    const activeTradesQuery = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.live_trade_plan_id,
        ult.amount,
        ult.start_time,
        ult.total_profit,
        ltp.hourly_profit_rate,
        ltp.duration_hours,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed,
        CURRENT_TIMESTAMP as current_time,
        ult.start_time + INTERVAL '1 hour' * ltp.duration_hours as expiry_time
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours > CURRENT_TIMESTAMP
    `;

    const activeTrades = await db.query(activeTradesQuery);

    // 3. Get existing profit distributions
    const profitsQuery = `
      SELECT 
        hltp.id,
        hltp.live_trade_id,
        hltp.profit_amount,
        hltp.profit_hour,
        hltp.created_at,
        ult.amount as trade_amount,
        ltp.hourly_profit_rate
      FROM hourly_live_trade_profits hltp
      JOIN user_live_trades ult ON hltp.live_trade_id = ult.id
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      ORDER BY hltp.created_at DESC
      LIMIT 20
    `;

    const existingProfits = await db.query(profitsQuery);

    // 4. Check table existence
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hourly_live_trade_profits'
      )
    `);

    // 5. Simulate profit distribution logic for active trades
    const simulationResults = [];
    
    for (const trade of activeTrades.rows) {
      const startTime = new Date(trade.start_time);
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);
      
      const hoursElapsed = Math.floor(
        (currentHour.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      );
      
      const hourlyProfit = trade.amount * trade.hourly_profit_rate;
      const eligibleHours = [];
      
      for (let hour = 1; hour <= hoursElapsed; hour++) {
        const profitHour = new Date(
          startTime.getTime() + hour * 60 * 60 * 1000
        );
        
        if (profitHour <= currentHour) {
          // Check if already distributed
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM hourly_live_trade_profits
            WHERE live_trade_id = $1 
            AND DATE_TRUNC('hour', profit_hour) = DATE_TRUNC('hour', $2::timestamp)
          `;
          
          const checkResult = await db.query(checkQuery, [trade.id, profitHour.toISOString()]);
          const alreadyDistributed = parseInt(checkResult.rows[0].count) > 0;
          
          eligibleHours.push({
            hour,
            profitHour: profitHour.toISOString(),
            alreadyDistributed,
            expectedProfit: hourlyProfit
          });
        }
      }
      
      simulationResults.push({
        tradeId: trade.id,
        amount: trade.amount,
        startTime: trade.start_time,
        hoursElapsed,
        hourlyProfitRate: trade.hourly_profit_rate,
        expectedHourlyProfit: hourlyProfit,
        eligibleHours
      });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalTrades: allTrades.rows.length,
        activeTrades: activeTrades.rows.length,
        existingProfitDistributions: existingProfits.rows.length,
        tableExists: tableCheck.rows[0].exists
      },
      allTrades: allTrades.rows,
      activeTrades: activeTrades.rows,
      existingProfits: existingProfits.rows,
      simulationResults,
      recommendations: [
        activeTrades.rows.length === 0 ? "No active trades found - check trade status and expiry" : null,
        existingProfits.rows.length === 0 ? "No profit distributions found - profits may never have been distributed" : null,
        !tableCheck.rows[0].exists ? "hourly_live_trade_profits table missing!" : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error("Error in live trade profit debug:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
