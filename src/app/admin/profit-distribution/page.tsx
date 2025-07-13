'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Play, 
  RefreshCw, 
  Users, 
  DollarSign, 
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';

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
  processed: number;
  skipped: number;
  errors: number;
}

export default function ProfitDistributionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [activeInvestments, setActiveInvestments] = useState<ActiveInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDistributing, setIsDistributing] = useState(false);
  const [lastDistribution, setLastDistribution] = useState<DistributionResult | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchActiveInvestments();
  }, [session, status, router]);

  const fetchActiveInvestments = async () => {
    try {
      const response = await fetch('/api/admin/profit-distribution');
      if (response.ok) {
        const data = await response.json();
        setActiveInvestments(data.activeInvestments || []);
      }
    } catch (error) {
      console.error('Error fetching active investments:', error);
      toast.error('Failed to fetch active investments');
    } finally {
      setIsLoading(false);
    }
  };

  const runProfitDistribution = async () => {
    setIsDistributing(true);
    try {
      const response = await fetch('/api/admin/profit-distribution', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setLastDistribution(data.result);
        toast.success(`Profit distribution completed: ${data.result.processed} processed, ${data.result.skipped} skipped`);
        fetchActiveInvestments(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to run profit distribution');
      }
    } catch {
      toast.error('An error occurred while running profit distribution');
    } finally {
      setIsDistributing(false);
    }
  };

  const calculateDailyProfit = (amount: number, rate: number) => {
    return amount * rate;
  };

  const calculateProgress = (daysCompleted: number, totalDays: number) => {
    return (daysCompleted / totalDays) * 100;
  };

  if (status === 'loading' || isLoading) {
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
              <h1 className="text-3xl font-bold text-gray-900">Profit Distribution</h1>
              <p className="text-gray-600">Manage daily profit distributions for active investments</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchActiveInvestments}
                disabled={isLoading}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={runProfitDistribution}
                disabled={isDistributing || activeInvestments.length === 0}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className={`w-4 h-4 mr-2 ${isDistributing ? 'animate-spin' : ''}`} />
                {isDistributing ? 'Distributing...' : 'Run Distribution'}
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
                <p className="text-sm font-medium text-gray-600">Active Investments</p>
                <p className="text-2xl font-bold text-gray-900">{activeInvestments.length}</p>
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
                <p className="text-sm font-medium text-gray-600">Total Investment Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${activeInvestments.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}
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
                <p className="text-sm font-medium text-gray-600">Daily Profit Pool</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${activeInvestments.reduce((sum, inv) => sum + calculateDailyProfit(inv.amount, inv.daily_profit_rate), 0).toFixed(2)}
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
                <p className="text-sm font-medium text-gray-600">Last Distribution</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lastDistribution ? `${lastDistribution.processed}` : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Last Distribution Result */}
        {lastDistribution && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Distribution Result</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{lastDistribution.processed}</p>
                <p className="text-sm text-gray-600">Processed</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{lastDistribution.skipped}</p>
                <p className="text-sm text-gray-600">Skipped</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <RefreshCw className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{lastDistribution.errors}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Investments</h3>
              <p className="text-gray-600">There are no active investments requiring profit distribution.</p>
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
                          ${calculateDailyProfit(investment.amount, investment.daily_profit_rate).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${calculateProgress(investment.days_completed, investment.duration_days)}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {investment.days_completed}/{investment.duration_days}
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
    </div>
  );
}
