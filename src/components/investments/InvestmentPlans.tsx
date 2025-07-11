"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, DollarSign, Star } from "lucide-react";

interface InvestmentPlan {
  id: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number | null;
  daily_profit_rate: number;
  duration_days: number;
  is_active: boolean;
}

interface InvestmentPlansProps {
  onInvest: (planId: string, amount: number) => void;
  userBalance: number;
}

export default function InvestmentPlans({
  onInvest,
  userBalance,
}: InvestmentPlansProps) {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/investments/plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvest = (planId: string) => {
    const amount = parseFloat(investmentAmount);
    if (amount > 0) {
      onInvest(planId, amount);
      setSelectedPlan(null);
      setInvestmentAmount("");
    }
  };

  const calculateReturns = (amount: number, rate: number, days: number) => {
    const dailyProfit = amount * rate;
    const totalProfit = dailyProfit * days;
    const totalReturn = amount + totalProfit;
    return { dailyProfit, totalProfit, totalReturn };
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-lg p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="text-blue-100 text-sm mt-1">{plan.description}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">Daily Return</span>
                </div>
                <span className="font-semibold text-green-600">
                  {(
                    (typeof plan.daily_profit_rate === "number"
                      ? plan.daily_profit_rate
                      : parseFloat(plan.daily_profit_rate || "0")) * 100
                  ).toFixed(2)}
                  %
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">Duration</span>
                </div>
                <span className="font-semibold text-blue-600">
                  {plan.duration_days} days
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-600">Min Amount</span>
                </div>
                <span className="font-semibold text-purple-600">
                  $
                  {(typeof plan.min_amount === "number"
                    ? plan.min_amount
                    : parseFloat(plan.min_amount || "0")
                  ).toFixed(2)}
                </span>
              </div>

              {plan.max_amount && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-600">Max Amount</span>
                  </div>
                  <span className="font-semibold text-orange-600">
                    $
                    {(typeof plan.max_amount === "number"
                      ? plan.max_amount
                      : parseFloat(plan.max_amount || "0")
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-2">
                  Total Return:{" "}
                  {(
                    ((typeof plan.daily_profit_rate === "number"
                      ? plan.daily_profit_rate
                      : parseFloat(plan.daily_profit_rate || "0")) *
                      (typeof plan.duration_days === "number"
                        ? plan.duration_days
                        : parseInt(plan.duration_days || "0")) +
                      1) *
                    100
                  ).toFixed(0)}
                  %
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  Invest Now
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Investment Modal */}
      {selectedPlan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPlan(null)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const plan = plans.find((p) => p.id === selectedPlan);
              if (!plan) return null;

              const amount = parseFloat(investmentAmount) || 0;
              const returns = calculateReturns(
                amount,
                typeof plan.daily_profit_rate === "number"
                  ? plan.daily_profit_rate
                  : parseFloat(plan.daily_profit_rate || "0"),
                typeof plan.duration_days === "number"
                  ? plan.duration_days
                  : parseInt(plan.duration_days || "0")
              );

              return (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Invest in {plan.name}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Investment Amount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={
                          typeof plan.min_amount === "number"
                            ? plan.min_amount
                            : parseFloat(plan.min_amount || "0")
                        }
                        max={
                          (plan.max_amount &&
                            (typeof plan.max_amount === "number"
                              ? plan.max_amount
                              : parseFloat(plan.max_amount || "0"))) ||
                          undefined
                        }
                        value={investmentAmount}
                        onChange={(e) => setInvestmentAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Min: $${(typeof plan.min_amount ===
                        "number"
                          ? plan.min_amount
                          : parseFloat(plan.min_amount || "0")
                        ).toFixed(2)}`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available Balance: ${userBalance.toFixed(2)}
                      </p>
                    </div>

                    {amount >=
                      (typeof plan.min_amount === "number"
                        ? plan.min_amount
                        : parseFloat(plan.min_amount || "0")) && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-gray-900">
                          Investment Summary
                        </h4>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Daily Profit:</span>
                            <span className="font-semibold text-green-600">
                              ${returns.dailyProfit.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Profit:</span>
                            <span className="font-semibold text-green-600">
                              ${returns.totalProfit.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span>Total Return:</span>
                            <span className="font-bold text-blue-600">
                              ${returns.totalReturn.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button
                        onClick={() => setSelectedPlan(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleInvest(selectedPlan)}
                        disabled={
                          !amount ||
                          amount <
                            (typeof plan.min_amount === "number"
                              ? plan.min_amount
                              : parseFloat(plan.min_amount || "0")) ||
                          (plan.max_amount &&
                            amount >
                              (typeof plan.max_amount === "number"
                                ? plan.max_amount
                                : parseFloat(plan.max_amount || "0"))) ||
                          amount > userBalance
                        }
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Invest ${amount.toFixed(2)}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
