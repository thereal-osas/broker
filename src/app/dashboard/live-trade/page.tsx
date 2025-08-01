"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Play,
  Pause,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

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

  const [plans, setPlans] = useState<LiveTradePlan[]>([]);
  const [userTrades, setUserTrades] = useState<UserLiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LiveTradePlan | null>(null);
  const [investAmount, setInvestAmount] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

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
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to start live trade");
      }
    } catch (error) {
      console.error("Error starting live trade:", error);
      toast.error("An error occurred while starting the live trade");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="w-4 h-4 text-green-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <Pause className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Live Trade</h1>
          <p className="mt-2 text-gray-600">
            Experience real-time trading with hourly profit calculations
          </p>
        </div>

        {/* User's Active Trades */}
        {userTrades.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Live Trades</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTrades.map((trade) => (
                <div key={trade.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{trade.plan_name}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(trade.status)}
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status)}`}
                      >
                        {trade.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Investment:</span>
                      <span className="font-medium">${trade.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Profit:</span>
                      <span className="font-medium text-green-600">
                        ${trade.total_profit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Hourly Rate:</span>
                      <span className="font-medium">
                        {(trade.hourly_profit_rate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium">{trade.duration_hours} hours</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Started:</span>
                      <span className="font-medium">
                        {new Date(trade.start_time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Live Trade Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Min Amount:</span>
                    <span className="font-medium">${plan.min_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Max Amount:</span>
                    <span className="font-medium">
                      {plan.max_amount ? `$${plan.max_amount.toLocaleString()}` : 'No limit'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Hourly Rate:</span>
                    <span className="font-medium text-green-600">
                      {(plan.hourly_profit_rate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium">{plan.duration_hours} hours</span>
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
                      {selectedPlan.max_amount && ` | Max: $${selectedPlan.max_amount.toLocaleString()}`}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Trade Details</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hourly Rate:</span>
                        <span className="font-medium text-green-600">
                          {(selectedPlan.hourly_profit_rate * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{selectedPlan.duration_hours} hours</span>
                      </div>
                      {investAmount && (
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="text-gray-500">Expected Total Profit:</span>
                          <span className="font-medium text-green-600">
                            ${(parseFloat(investAmount) * selectedPlan.hourly_profit_rate * selectedPlan.duration_hours).toFixed(2)}
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
