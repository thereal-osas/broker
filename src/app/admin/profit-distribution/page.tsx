"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Play,
  RefreshCw,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Timer,
  Loader2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface ActiveInvestment {
  id: string;
  user_id: string;
  amount: number;
  daily_profit_rate: number;
  duration_days: number;
  days_completed: number;
  created_at: string;
}

interface DistributionResult {
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

interface DistributionState {
  isProcessing: boolean;
  progress: string;
  result: DistributionResult | null;
}

export default function ProfitDistributionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeInvestments, setActiveInvestments] = useState<
    ActiveInvestment[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced state management
  const [investmentState, setInvestmentState] = useState<DistributionState>({
    isProcessing: false,
    progress: "",
    result: null,
  });

  const [liveTradeState, setLiveTradeState] = useState<DistributionState>({
    isProcessing: false,
    progress: "",
    result: null,
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    type: "investment" | "liveTrade" | null;
    isOpen: boolean;
  }>({ type: null, isOpen: false });

  // State for investments data
  const [investments, setInvestments] = useState<any[]>([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(true);

  // Fetch investments data
  const fetchInvestments = useCallback(async () => {
    try {
      setInvestmentsLoading(true);
      const response = await fetch("/api/admin/investments");
      if (response.ok) {
        const data = await response.json();
        setInvestments(data.investments || []);
      } else {
        console.error("Failed to fetch investments");
        toast.error("Failed to load investments data");
      }
    } catch (error) {
      console.error("Error fetching investments:", error);
      toast.error("Error loading investments data");
    } finally {
      setInvestmentsLoading(false);
    }
  }, [toast]);

  // Note: Cooldown system removed - using smart distribution now

  const fetchActiveInvestments = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/investments");
      if (response.ok) {
        const data = await response.json();
        setActiveInvestments(data.investments || []);
      }
    } catch (error) {
      console.error("Error fetching active investments:", error);
      toast.error("Failed to fetch active investments");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    if (session.user.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    fetchActiveInvestments();
  }, [session, status, router, fetchActiveInvestments]);

  // Enhanced investment profit distribution
  const runInvestmentDistribution = async () => {
    setInvestmentState((prev) => ({
      ...prev,
      isProcessing: true,
      progress: "Initializing investment profit distribution...",
    }));

    try {
      setInvestmentState((prev) => ({
        ...prev,
        progress: "Checking for eligible investments...",
      }));

      const response = await fetch("/api/admin/profit-distribution", {
        method: "POST",
      });

      const result = await response.json();

      setInvestmentState((prev) => ({
        ...prev,
        result,
        isProcessing: false,
        progress: "",
      }));

      if (result.success) {
        toast.success(result.message);
        fetchActiveInvestments();
        fetchInvestments();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const errorResult: DistributionResult = {
        success: false,
        processed: 0,
        skipped: 0,
        errors: 1,
        message: "Network error occurred",
        details: ["Failed to connect to server"],
        timestamp: new Date().toISOString(),
      };

      setInvestmentState((prev) => ({
        ...prev,
        result: errorResult,
        isProcessing: false,
        progress: "",
      }));

      toast.error("Network error occurred");
    }
  };

  // Enhanced live trade profit distribution
  const runLiveTradeDistribution = async () => {
    setLiveTradeState((prev) => ({
      ...prev,
      isProcessing: true,
      progress: "Initializing live trade profit distribution...",
    }));

    try {
      setLiveTradeState((prev) => ({
        ...prev,
        progress: "Checking for eligible live trades...",
      }));

      const response = await fetch(
        "/api/admin/live-trade/profit-distribution",
        {
          method: "POST",
        }
      );

      const result = await response.json();

      setLiveTradeState((prev) => ({
        ...prev,
        result,
        isProcessing: false,
        progress: "",
      }));

      if (result.success) {
        toast.success(result.message);

        // Trigger global balance refresh
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("balanceRefresh", {
              detail: {
                type: "liveTradeProfit",
                processed: result.processed,
              },
            })
          );
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const errorResult: DistributionResult = {
        success: false,
        processed: 0,
        skipped: 0,
        errors: 1,
        message: "Network error occurred",
        details: ["Failed to connect to server"],
        timestamp: new Date().toISOString(),
      };

      setLiveTradeState((prev) => ({
        ...prev,
        result: errorResult,
        isProcessing: false,
        progress: "",
      }));

      toast.error("Network error occurred");
    }
  };

  // Confirmation dialog handlers
  const handleConfirmDistribution = (type: "investment" | "liveTrade") => {
    setShowConfirmDialog({ type, isOpen: true });
  };

  const handleConfirmAction = () => {
    if (showConfirmDialog.type === "investment") {
      runInvestmentDistribution();
    } else if (showConfirmDialog.type === "liveTrade") {
      runLiveTradeDistribution();
    }
    setShowConfirmDialog({ type: null, isOpen: false });
  };

  // Remove cooldown timer - using smart distribution now

  // Initial data fetch
  useEffect(() => {
    fetchActiveInvestments();
    fetchInvestments();
  }, [fetchActiveInvestments, fetchInvestments]);

  const calculateDailyProfit = (amount: number, rate: number) => {
    return amount * rate;
  };

  const calculateProgress = (daysCompleted: number, totalDays: number) => {
    return (daysCompleted / totalDays) * 100;
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Profit Distribution
              </h1>
              <p className="text-gray-600">
                Manage daily profit distributions for active investments
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchActiveInvestments}
                disabled={isLoading}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                onClick={() => handleConfirmDistribution("investment")}
                disabled={investmentState.isProcessing}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play
                  className={`w-4 h-4 mr-2 ${investmentState.isProcessing ? "animate-spin" : ""}`}
                />
                {investmentState.isProcessing
                  ? "Distributing..."
                  : "Run Distribution"}
              </button>
              <button
                onClick={() => handleConfirmDistribution("liveTrade")}
                disabled={liveTradeState.isProcessing}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingUp
                  className={`w-4 h-4 mr-2 ${liveTradeState.isProcessing ? "animate-spin" : ""}`}
                />
                {liveTradeState.isProcessing
                  ? "Distributing..."
                  : "Run Live Trade Profits"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Investments
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeInvestments.length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Investment Value
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {activeInvestments
                    .reduce((sum, inv) => sum + inv.amount, 0)
                    .toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Daily Profit Pool
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {activeInvestments
                    .reduce(
                      (sum, inv) =>
                        sum +
                        calculateDailyProfit(inv.amount, inv.daily_profit_rate),
                      0
                    )
                    .toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Last Distribution
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {investmentState.result
                    ? `${investmentState.result.processed}`
                    : "N/A"}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Last Distribution Result */}
        {investmentState.result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span>Last Investment Distribution Result</span>
              <span className="text-sm font-normal text-gray-500">
                {new Date(investmentState.result.timestamp).toLocaleString()}
              </span>
            </h3>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {investmentState.result.processed}
                </p>
                <p className="text-sm text-gray-600">Processed</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">
                  {investmentState.result.skipped}
                </p>
                <p className="text-sm text-gray-600">Skipped</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">
                  {investmentState.result.errors}
                </p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>

            {/* Message */}
            <div className={`p-4 rounded-lg mb-4 ${
              investmentState.result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${
                investmentState.result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {investmentState.result.message}
              </p>
            </div>

            {/* Details */}
            {investmentState.result.details && investmentState.result.details.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Distribution Details:</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <ul className="space-y-1 text-sm font-mono">
                    {investmentState.result.details.map((detail, index) => (
                      <li key={index} className={`${
                        detail.includes('✅') ? 'text-green-700' :
                        detail.includes('❌') ? 'text-red-700' :
                        'text-gray-600'
                      }`}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Last Live Trade Distribution Result */}
        {liveTradeState.result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span>Last Live Trade Distribution Result</span>
              <span className="text-sm font-normal text-gray-500">
                {new Date(liveTradeState.result.timestamp).toLocaleString()}
              </span>
            </h3>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {liveTradeState.result.processed}
                </p>
                <p className="text-sm text-gray-600">Trades Processed</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">
                  {liveTradeState.result.skipped}
                </p>
                <p className="text-sm text-gray-600">Skipped</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">
                  {liveTradeState.result.errors}
                </p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">
                  {liveTradeState.result.completed || 0}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>

            {/* Message */}
            <div className={`p-4 rounded-lg mb-4 ${
              liveTradeState.result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${
                liveTradeState.result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {liveTradeState.result.message}
              </p>
            </div>

            {/* Details */}
            {liveTradeState.result.details && liveTradeState.result.details.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Distribution Details:</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <ul className="space-y-1 text-sm font-mono">
                    {liveTradeState.result.details.map((detail, index) => (
                      <li key={index} className={`${
                        detail.includes('✅') ? 'text-green-700' :
                        detail.includes('❌') ? 'text-red-700' :
                        'text-gray-600'
                      }`}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Active Investments Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Investments ({activeInvestments.length})
            </h2>
          </div>

          {activeInvestments.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Active Investments
              </h3>
              <p className="text-gray-600">
                There are no active investments requiring profit distribution.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daily Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daily Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeInvestments.map((investment) => (
                    <tr key={investment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{investment.id.slice(0, 8)}
                        </div>
                        <div className="text-sm text-gray-500">
                          User: {investment.user_id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${investment.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(investment.daily_profit_rate * 100).toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          $
                          {calculateDailyProfit(
                            investment.amount,
                            investment.daily_profit_rate
                          ).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${calculateProgress(investment.days_completed, investment.duration_days)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {investment.days_completed}/
                            {investment.duration_days}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(investment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
          >
            <div className="flex items-center mb-4">
              <AlertCircle className={`w-6 h-6 mr-3 ${
                showConfirmDialog.type === "investment" ? "text-green-600" : "text-blue-600"
              }`} />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Profit Distribution
              </h3>
            </div>

            {showConfirmDialog.type === "investment" ? (
              <div className="mb-6">
                <p className="text-gray-700 mb-3 font-medium">
                  Investment Profit Distribution (Daily)
                </p>
                <ul className="text-sm text-gray-600 space-y-2 bg-green-50 p-4 rounded-lg">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Distributes daily profits to all eligible active investments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Only processes investments that haven't received today's profit</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Automatically skips already-processed investments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Updates user balances and creates transaction records</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-700 mb-3 font-medium">
                  Live Trade Profit Distribution (Manual - All Elapsed Hours)
                </p>
                <ul className="text-sm text-gray-600 space-y-2 bg-blue-50 p-4 rounded-lg">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Calculates elapsed hours</strong> since last distribution for each trade</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Distributes ALL missing hours</strong> of profit in one operation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Example: If 5 hours passed, distributes 5 hours of profit</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Automatically completes trades that reach their duration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Returns capital to users when trades complete</span>
                  </li>
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() =>
                  setShowConfirmDialog({ type: null, isOpen: false })
                }
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  showConfirmDialog.type === "investment"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {showConfirmDialog.type === "investment"
                  ? "Run Investment Distribution"
                  : "Run Live Trade Distribution"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
