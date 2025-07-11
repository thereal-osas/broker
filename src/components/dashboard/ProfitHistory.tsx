"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, DollarSign, Target } from "lucide-react";

interface ProfitDistribution {
  id: string;
  investment_id: string;
  amount: number;
  profit_amount: number;
  distribution_date: string;
  plan_name: string;
}

interface ProfitHistoryProps {
  userId?: string;
}

export default function ProfitHistory({ userId }: ProfitHistoryProps) {
  const [profitHistory, setProfitHistory] = useState<ProfitDistribution[]>([]);
  const [totalProfits, setTotalProfits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfitHistory();
  }, [userId]);

  const fetchProfitHistory = async () => {
    try {
      const response = await fetch("/api/profits");
      if (response.ok) {
        const data = await response.json();
        setProfitHistory(data.profitHistory || []);
        setTotalProfits(data.totalProfits || 0);
      }
    } catch (error) {
      console.error("Error fetching profit history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl mt-6 shadow-lg overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Profit History
              </h2>
              <p className="text-sm text-gray-600">
                Your daily profit distributions
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Profits Earned</p>
            <p className="text-2xl font-bold text-green-600">
              ${totalProfits.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {profitHistory.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Profits Yet
            </h3>
            <p className="text-gray-600">
              Your daily profits will appear here once your investments start
              generating returns.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {profitHistory.map((profit, index) => (
              <motion.div
                key={profit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Daily Profit - {profit.plan_name}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(profit.distribution_date)}</span>
                      </div>
                      <span>Investment: ${profit.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">
                    +${profit.profit_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {((profit.profit_amount / profit.amount) * 100).toFixed(2)}%
                    return
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {profitHistory.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Total Distributions</p>
              <p className="text-lg font-semibold text-gray-900">
                {profitHistory.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Daily Profit</p>
              <p className="text-lg font-semibold text-gray-900">
                $
                {profitHistory.length > 0
                  ? (totalProfits / profitHistory.length).toFixed(2)
                  : "0.00"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Distribution</p>
              <p className="text-lg font-semibold text-gray-900">
                {profitHistory.length > 0
                  ? new Date(
                      profitHistory[0].distribution_date
                    ).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
