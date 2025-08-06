"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Activity,
  Pause,
} from "lucide-react";
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
  created_at: string;
  updated_at?: string;
  active_trades?: number;
  total_invested?: number;
}

interface UserLiveTrade {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
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

interface Stats {
  totalPlans: number;
  activePlans: number;
  totalTrades: number;
  activeTrades: number;
  totalInvested: number;
  totalProfits: number;
}

export default function AdminLiveTradePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [plans, setPlans] = useState<LiveTradePlan[]>([]);
  const [userTrades, setUserTrades] = useState<UserLiveTrade[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPlans: 0,
    activePlans: 0,
    totalTrades: 0,
    activeTrades: 0,
    totalInvested: 0,
    totalProfits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LiveTradePlan | null>(null);
  const [activeTab, setActiveTab] = useState<"plans" | "trades">("plans");

  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    min_amount: 0,
    max_amount: 0,
    hourly_profit_rate: 0,
    duration_hours: 0,
    is_active: true,
  });

  // Redirect if not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  const updateStats = useCallback(
    (plansData: LiveTradePlan[], tradesData: UserLiveTrade[]) => {
      const totalPlans = plansData.length;
      const activePlans = plansData.filter((plan) => plan.is_active).length;
      const totalTrades = tradesData.length;
      const activeTrades = tradesData.filter(
        (trade) => trade.status === "active"
      ).length;
      const totalInvested = tradesData
        .filter((trade) => trade.status === "active")
        .reduce((sum, trade) => sum + trade.amount, 0);
      const totalProfits = tradesData.reduce(
        (sum, trade) => sum + trade.total_profit,
        0
      );

      setStats({
        totalPlans,
        activePlans,
        totalTrades,
        activeTrades,
        totalInvested,
        totalProfits,
      });
    },
    []
  );

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/admin/live-trade/plans?includeStats=true"
      );
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching live trade plans:", error);
      return [];
    }
  }, []);

  const fetchUserTrades = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/live-trade/trades");
      if (response.ok) {
        const data = await response.json();
        setUserTrades(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching user live trades:", error);
      return [];
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansData, tradesData] = await Promise.all([
        fetchPlans(),
        fetchUserTrades(),
      ]);
      updateStats(plansData || [], tradesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch live trade data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchPlans, fetchUserTrades, updateStats]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchAllData();
    }
  }, [session, fetchAllData]);

  const resetForm = () => {
    setPlanForm({
      name: "",
      description: "",
      min_amount: 0,
      max_amount: 0,
      hourly_profit_rate: 0,
      duration_hours: 0,
      is_active: true,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (plan: LiveTradePlan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      min_amount: plan.min_amount,
      max_amount: plan.max_amount || 0,
      hourly_profit_rate: plan.hourly_profit_rate * 100, // Convert to percentage
      duration_hours: plan.duration_hours,
      is_active: plan.is_active,
    });
    setShowEditModal(true);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/admin/live-trade/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planForm),
      });

      if (response.ok) {
        toast.success("Live trade plan created successfully");
        setShowCreateModal(false);
        resetForm();
        fetchAllData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create live trade plan");
      }
    } catch (error) {
      console.error("Error creating live trade plan:", error);
      toast.error("An error occurred while creating the live trade plan");
    }
  };

  const handleEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan) return;

    try {
      const response = await fetch(
        `/api/admin/live-trade/plans/${selectedPlan.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(planForm),
        }
      );

      if (response.ok) {
        toast.success("Live trade plan updated successfully");
        setShowEditModal(false);
        setSelectedPlan(null);
        resetForm();
        fetchAllData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update live trade plan");
      }
    } catch (error) {
      console.error("Error updating live trade plan:", error);
      toast.error("An error occurred while updating the live trade plan");
    }
  };

  const togglePlanStatus = async (plan: LiveTradePlan) => {
    try {
      const response = await fetch(`/api/admin/live-trade/plans/${plan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...plan,
          hourly_profit_rate: plan.hourly_profit_rate * 100, // Convert to percentage for API
          is_active: !plan.is_active,
        }),
      });

      if (response.ok) {
        toast.success(
          `Plan ${!plan.is_active ? "activated" : "deactivated"} successfully`
        );
        fetchAllData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update plan status");
      }
    } catch (error) {
      console.error("Error updating plan status:", error);
      toast.error("An error occurred while updating the plan status");
    }
  };

  const deletePlan = async (plan: LiveTradePlan) => {
    if (
      !confirm(
        `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/live-trade/plans/${plan.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Live trade plan deleted successfully");
        fetchAllData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete live trade plan");
      }
    } catch (error) {
      console.error("Error deleting live trade plan:", error);
      toast.error("An error occurred while deleting the live trade plan");
    }
  };

  const handleDeactivateLiveTrade = async (liveTradeId: string) => {
    if (!confirm("Are you sure you want to deactivate this live trade?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/live-trade/trades/${liveTradeId}/deactivate`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        toast.success("Live trade deactivated successfully");
        fetchAllData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to deactivate live trade");
      }
    } catch (error) {
      console.error("Error deactivating live trade:", error);
      toast.error("An error occurred while deactivating the live trade");
    }
  };

  const handleDeleteLiveTrade = async (liveTradeId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this live trade? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/live-trade/trades/${liveTradeId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Live trade deleted successfully");
        fetchAllData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete live trade");
      }
    } catch (error) {
      console.error("Error deleting live trade:", error);
      toast.error("An error occurred while deleting the live trade");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Live Trade Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage live trading plans and monitor user trading activities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Plans</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalPlans}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Active Plans
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.activePlans}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Trades
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalTrades}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Active Trades
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.activeTrades}
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
                  ${formatCurrency(stats.totalInvested)}
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
                  Total Profits
                </p>
                <p className="text-2xl font-semibold text-gray-900 truncate">
                  ${formatCurrency(stats.totalProfits)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("plans")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "plans"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Live Trade Plans ({plans.length})
              </button>
              <button
                onClick={() => setActiveTab("trades")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "trades"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                User Trades ({userTrades.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Plans Tab */}
        {activeTab === "plans" && (
          <div>
            {/* Create Plan Button */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Live Trade Plans
              </h2>
              <button
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Plan</span>
              </button>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {plan.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        plan.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4">
                    {plan.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Min Amount:</span>
                      <span className="font-medium">
                        ${formatCurrency(plan.min_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Max Amount:</span>
                      <span className="font-medium">
                        {plan.max_amount
                          ? `$${formatCurrency(plan.max_amount)}`
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
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Active Trades:</span>
                      <span className="font-medium">
                        {plan.active_trades || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Invested:</span>
                      <span className="font-medium">
                        ${formatCurrency(plan.total_invested || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => togglePlanStatus(plan)}
                      className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center space-x-1 transition-colors ${
                        plan.is_active
                          ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-600"
                          : "bg-green-50 hover:bg-green-100 text-green-600"
                      }`}
                    >
                      {plan.is_active ? (
                        <>
                          <ToggleLeft className="w-4 h-4" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <ToggleRight className="w-4 h-4" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deletePlan(plan)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === "trades" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              User Live Trades
            </h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userTrades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {trade.user_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {trade.user_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {trade.plan_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {((trade.hourly_profit_rate || 0) * 100).toFixed(2)}
                            % hourly
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${formatCurrency(trade.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              trade.status === "active"
                                ? "bg-green-100 text-green-800"
                                : trade.status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {trade.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${formatCurrency(trade.total_profit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {trade.duration_hours} hours
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(trade.start_time).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {trade.status === "active" && (
                              <button
                                onClick={() =>
                                  handleDeactivateLiveTrade(trade.id)
                                }
                                className="text-yellow-600 hover:text-yellow-900 transition-colors"
                                title="Deactivate Live Trade"
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLiveTrade(trade.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete Live Trade"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Create Plan Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Create Live Trade Plan
                </h3>

                <form onSubmit={handleCreatePlan} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name *
                    </label>
                    <input
                      type="text"
                      value={planForm.name}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter plan name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={planForm.description}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Enter plan description"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Amount ($) *
                      </label>
                      <input
                        type="number"
                        value={planForm.min_amount}
                        onChange={(e) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            min_amount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Amount ($)
                      </label>
                      <input
                        type="number"
                        value={planForm.max_amount}
                        onChange={(e) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            max_amount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        placeholder="No limit"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hourly Profit Rate (%) *
                      </label>
                      <input
                        type="number"
                        value={planForm.hourly_profit_rate}
                        onChange={(e) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            hourly_profit_rate: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (Hours) *
                      </label>
                      <input
                        type="number"
                        value={planForm.duration_hours}
                        onChange={(e) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            duration_hours: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={planForm.is_active}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="is_active"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Active plan
                    </label>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Create Plan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Plan Modal */}
        {showEditModal && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Edit Live Trade Plan
                </h3>

                <form onSubmit={handleEditPlan} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name *
                    </label>
                    <input
                      type="text"
                      value={planForm.name}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={planForm.description}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Amount ($) *
                      </label>
                      <input
                        type="number"
                        value={planForm.min_amount}
                        onChange={(e) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            min_amount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Amount ($)
                      </label>
                      <input
                        type="number"
                        value={planForm.max_amount}
                        onChange={(e) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            max_amount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hourly Profit Rate (%) *
                      </label>
                      <input
                        type="number"
                        value={planForm.hourly_profit_rate}
                        onChange={(e) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            hourly_profit_rate: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (Hours) *
                      </label>
                      <input
                        type="number"
                        value={planForm.duration_hours}
                        onChange={(e) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            duration_hours: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit_is_active"
                      checked={planForm.is_active}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="edit_is_active"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Active plan
                    </label>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedPlan(null);
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Update Plan
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
