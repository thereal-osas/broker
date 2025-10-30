"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useBalance } from "../../../hooks/useBalance";
import {
  TrendingUp,
  DollarSign,
  Activity,
  Play,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import LiveTradeProgressCard from "../../../components/LiveTradeProgressCard";
import toast from "react-hot-toast";

// Utility function to format currency without leading zeros
const formatCurrency = (amount: number | string | null | undefined): string => {
  // Convert to number and handle null/undefined/invalid values
  const numAmount =
    typeof amount === "number" ? amount : parseFloat(String(amount || 0));

  // If still not a valid number, return "0.00"
  if (isNaN(numAmount)) {
    return "0.00";
  }

  return numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

interface LiveTradePlan {
  id: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number | null;
  hourly_profit_rate: number;
  duration_hours: number;
  is_active: boolean;
}

interface UserLiveTrade {
  id: string;
  live_trade_plan_id: string;
  plan_name: string;
  amount: number;
  status: string;
  total_profit: number;
  hourly_profit_rate: number;
  duration_hours: number;
  start_time: string;
  end_time?: string;
  created_at: string;
}

export default function UserLiveTradePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { balance, refreshBalance } = useBalance();

  const [plans, setPlans] = useState<LiveTradePlan[]>([]);
  const [userTrades, setUserTrades] = useState<UserLiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LiveTradePlan | null>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [autoRefresh] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // Auto-refresh live trades every 2 minutes for real-time updates
  useEffect(() => {
    if (!autoRefresh || !session?.user) return;

    const interval = setInterval(() => {
      fetchUserTrades();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, session?.user]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/live-trade/plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data.filter((plan: LiveTradePlan) => plan.is_active));
      }
    } catch (error) {
      console.error("Error fetching live trade plans:", error);
    }
  };

  const fetchUserTrades = async () => {
    try {
      const response = await fetch("/api/live-trade/user-trades");
      if (response.ok) {
        const data = await response.json();
        setUserTrades(data);
      }
    } catch (error) {
      console.error("Error fetching user live trades:", error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      Promise.all([fetchPlans(), fetchUserTrades()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [session]);

  const openInvestModal = (plan: LiveTradePlan) => {
    setSelectedPlan(plan);
    setInvestAmount("");
    setShowInvestModal(true);
  };

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan) return;

    const amount = parseFloat(investAmount);
    if (amount < selectedPlan.min_amount) {
      toast.error(`Minimum investment amount is $${selectedPlan.min_amount}`);
      return;
    }

    if (selectedPlan.max_amount && amount > selectedPlan.max_amount) {
      toast.error(`Maximum investment amount is $${selectedPlan.max_amount}`);
      return;
    }

    try {
      const response = await fetch("/api/live-trade/invest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          live_trade_plan_id: selectedPlan.id,
          amount: amount,
        }),
      });

      if (response.ok) {
        toast.success("Live trade investment started successfully!");
        setShowInvestModal(false);
        setSelectedPlan(null);
        setInvestAmount("");
        fetchUserTrades();
        refreshBalance(); // Refresh balance after successful investment
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to start live trade");
      }
    } catch (error) {
      console.error("Error starting live trade:", error);
      toast.error("An error occurred while starting the live trade");
    }
  };



  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Trade</h1>
            <p className="mt-2 text-gray-600">
              Experience real-time trading with hourly profit calculations
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Available Balance</p>
            <p className="text-2xl font-bold text-green-600">
              ${balance?.total_balance?.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>

        {/* User Statistics */}
        {userTrades.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Active Trades
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {
                        userTrades.filter((trade) => trade.status === "active")
                          .length
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-500">
                      Total Invested
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 truncate">
                      $
                      {formatCurrency(
                        userTrades
                          .filter((trade) => trade.status === "active")
                          .reduce(
                            (sum, trade) =>
                              sum + parseFloat(String(trade.amount || 0)),
                            0
                          )
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="ml-4 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-500">
                      Total Profit
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 truncate">
                      $
                      {formatCurrency(
                        userTrades.reduce(
                          (sum, trade) =>
                            sum + parseFloat(String(trade.total_profit || 0)),
                          0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Completed
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {
                        userTrades.filter(
                          (trade) => trade.status === "completed"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User's Live Trades with Enhanced Progress Tracking */}
        {userTrades.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Your Live Trades
              </h2>
              <button
                onClick={() => {
                  fetchUserTrades();
                  toast.success("Live trades refreshed");
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {userTrades.map((trade) => (
                <LiveTradeProgressCard
                  key={trade.id}
                  trade={trade}
                  onRefresh={fetchUserTrades}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Available Live Trade Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Min Amount:</span>
                    <span className="font-medium">
                      ${plan.min_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Max Amount:</span>
                    <span className="font-medium">
                      {plan.max_amount
                        ? `$${plan.max_amount.toLocaleString()}`
                        : "No limit"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Hourly Rate:</span>
                    <span className="font-medium text-green-600">
                      {((plan.hourly_profit_rate || 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium">
                      {plan.duration_hours} hours
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openInvestModal(plan)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Live Trade</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Investment Modal */}
        {showInvestModal && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Start Live Trade: {selectedPlan.name}
                </h3>

                <form onSubmit={handleInvest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Investment Amount ($)
                    </label>
                    <input
                      type="number"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Min: $${selectedPlan.min_amount}`}
                      min={selectedPlan.min_amount}
                      max={selectedPlan.max_amount || undefined}
                      step="0.01"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Min: ${selectedPlan.min_amount.toLocaleString()}
                      {selectedPlan.max_amount &&
                        ` | Max: $${selectedPlan.max_amount.toLocaleString()}`}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Trade Details
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hourly Rate:</span>
                        <span className="font-medium text-green-600">
                          {(
                            (selectedPlan.hourly_profit_rate || 0) * 100
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">
                          {selectedPlan.duration_hours} hours
                        </span>
                      </div>
                      {investAmount && (
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="text-gray-500">
                            Expected Total Profit:
                          </span>
                          <span className="font-medium text-green-600">
                            $
                            {(
                              (parseFloat(investAmount) || 0) *
                              (selectedPlan.hourly_profit_rate || 0) *
                              (selectedPlan.duration_hours || 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowInvestModal(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Start Trade
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
