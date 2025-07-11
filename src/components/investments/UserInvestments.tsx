"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  X,
  CheckCircle,
  Clock,
} from "lucide-react";

interface UserInvestment {
  id: string;
  plan_id: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string | null;
  total_profit: number;
  last_profit_date: string | null;
  plan_name: string;
  daily_profit_rate: number;
  duration_days: number;
}

interface UserInvestmentsProps {
  refreshTrigger?: number;
}

export default function UserInvestments({
  refreshTrigger,
}: UserInvestmentsProps) {
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvestments();
  }, [refreshTrigger]);

  const fetchInvestments = async () => {
    try {
      const response = await fetch("/api/investments/user");
      if (response.ok) {
        const data = await response.json();
        setInvestments(data);
      }
    } catch (error) {
      console.error("Error fetching investments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const calculateProgress = (investment: UserInvestment) => {
    const startDate = new Date(investment.start_date);
    const endDate = new Date(
      startDate.getTime() + investment.duration_days * 24 * 60 * 60 * 1000
    );
    const now = new Date();

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();

    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const getDaysRemaining = (investment: UserInvestment) => {
    const startDate = new Date(investment.start_date);
    const endDate = new Date(
      startDate.getTime() + investment.duration_days * 24 * 60 * 60 * 1000
    );
    const now = new Date();

    const remaining = Math.ceil(
      (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    return Math.max(remaining, 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-lg p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (investments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Investments Yet
        </h3>
        <p className="text-gray-600">
          Start your investment journey by choosing a plan above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Your Investments</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {investments.map((investment, index) => (
          <motion.div
            key={investment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-semibold text-white">
                    {investment.plan_name}
                  </h4>
                  <p className="text-blue-100 text-sm">
                    $
                    {(typeof investment.amount === "number"
                      ? investment.amount
                      : parseFloat(investment.amount || "0")
                    ).toFixed(2)}{" "}
                    invested
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(
                    investment.status
                  )}`}
                >
                  {getStatusIcon(investment.status)}
                  <span className="capitalize">{investment.status}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-600">Total Profit</p>
                    <p className="font-semibold text-green-600">
                      $
                      {(typeof investment.total_profit === "number"
                        ? investment.total_profit
                        : parseFloat(investment.total_profit || "0")
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-600">Daily Rate</p>
                    <p className="font-semibold text-blue-600">
                      {(investment.daily_profit_rate * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-gray-600">Start Date</p>
                    <p className="font-semibold text-purple-600">
                      {new Date(investment.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-600">
                      {investment.status === "active"
                        ? "Days Left"
                        : "Duration"}
                    </p>
                    <p className="font-semibold text-orange-600">
                      {investment.status === "active"
                        ? `${getDaysRemaining(investment)} days`
                        : `${investment.duration_days} days`}
                    </p>
                  </div>
                </div>
              </div>

              {investment.status === "active" && (
                <>
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{calculateProgress(investment).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${calculateProgress(investment)}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              )}

              {investment.last_profit_date && (
                <div className="text-xs text-gray-500 border-t pt-3">
                  Last profit:{" "}
                  {new Date(investment.last_profit_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
