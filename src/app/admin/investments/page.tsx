"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Plus,
  Edit,
  DollarSign,
  Percent,
  Users,
  Pause,
  Play,
  Search,
  BarChart3,
  CheckCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";

interface InvestmentPlan {
  id: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number | null;
  daily_profit_rate: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  active_investments?: number;
  total_invested?: number;
}

interface UserInvestment {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: string;
  total_profit: number;
  created_at: string;
  updated_at?: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  daily_profit_rate: number;
  duration_days: number;
  start_date?: string;
  end_date?: string;
}

interface InvestmentStats {
  totalPlans: number;
  activePlans: number;
  totalInvestments: number;
  activeInvestments: number;
  totalInvested: number;
  totalProfit: number;
}

export default function AdminInvestmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  
  // State management
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [filteredInvestments, setFilteredInvestments] = useState<UserInvestment[]>([]);
  const [stats, setStats] = useState<InvestmentStats>({
    totalPlans: 0,
    activePlans: 0,
    totalInvestments: 0,
    activeInvestments: 0,
    totalInvested: 0,
    totalProfit: 0,
  });
  
  // Loading and UI state
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'investments' | 'analytics'>('plans');
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);

  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  
  // Form state
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    min_amount: 0,
    max_amount: 0,
    daily_profit_rate: 0,
    duration_days: 0,
    is_active: true,
  });

  // Filter investments function
  const filterInvestments = useCallback(() => {
    let filtered = userInvestments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(investment =>
        investment.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(investment => investment.status === statusFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(investment => investment.plan_id === planFilter);
    }

    setFilteredInvestments(filtered);
  }, [userInvestments, searchTerm, statusFilter, planFilter]);

  const fetchInvestmentPlans = async () => {
    try {
      const response = await fetch("/api/admin/investment-plans?includeStats=true");
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
        updateStats(data, userInvestments);
      }
    } catch (error) {
      console.error("Error fetching investment plans:", error);
    }
  };

  const fetchUserInvestments = async () => {
    try {
      const response = await fetch("/api/admin/user-investments");
      if (response.ok) {
        const data = await response.json();
        setUserInvestments(data);
        updateStats(plans, data);
      }
    } catch (error) {
      console.error("Error fetching user investments:", error);
    }
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchInvestmentPlans(),
        fetchUserInvestments(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch investment data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvestmentPlans, fetchUserInvestments]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/signin");
      return;
    }

    fetchAllData();
  }, [session, status, router, fetchAllData]);

  // Filter investments when search term or filters change
  useEffect(() => {
    filterInvestments();
  }, [filterInvestments]);

  const updateStats = (plansData: InvestmentPlan[], investmentsData: UserInvestment[]) => {
    const totalPlans = plansData.length;
    const activePlans = plansData.filter(p => p.is_active).length;
    const totalInvestments = investmentsData.length;
    const activeInvestments = investmentsData.filter(i => i.status === 'active').length;
    const totalInvested = investmentsData.reduce((sum, i) => sum + i.amount, 0);
    const totalProfit = investmentsData.reduce((sum, i) => sum + i.total_profit, 0);

    setStats({
      totalPlans,
      activePlans,
      totalInvestments,
      activeInvestments,
      totalInvested,
      totalProfit,
    });
  };

  const createPlan = async () => {
    try {
      // Validation
      if (!planForm.name || !planForm.description || planForm.min_amount <= 0) {
        toast.error("Please fill in all required fields with valid values");
        return;
      }

      if (planForm.max_amount > 0 && planForm.max_amount <= planForm.min_amount) {
        toast.error("Maximum amount must be greater than minimum amount");
        return;
      }

      if (planForm.daily_profit_rate <= 0 || planForm.daily_profit_rate > 100) {
        toast.error("Daily profit rate must be between 0 and 100");
        return;
      }

      if (planForm.duration_days <= 0) {
        toast.error("Duration must be greater than 0 days");
        return;
      }

      const response = await fetch("/api/admin/investment-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planForm),
      });

      if (response.ok) {
        toast.success("Investment plan created successfully");
        setShowCreateModal(false);
        resetForm();
        fetchInvestmentPlans();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create plan");
      }
    } catch (error) {
      console.error("Error creating plan:", error);
      toast.error("An error occurred while creating the plan");
    }
  };

  const updatePlan = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/admin/investment-plans/${selectedPlan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planForm),
      });

      if (response.ok) {
        toast.success("Investment plan updated successfully");
        setShowEditModal(false);
        setSelectedPlan(null);
        resetForm();
        fetchInvestmentPlans();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update plan");
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("An error occurred while updating the plan");
    }
  };

  const toggleInvestmentStatus = async (investment: UserInvestment) => {
    try {
      const newStatus = investment.status === 'active' ? 'deactivated' : 'active';

      const response = await fetch(`/api/admin/user-investments/${investment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        toast.success(`Investment ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        fetchUserInvestments();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update investment status");
      }
    } catch (error) {
      console.error("Error updating investment status:", error);
      toast.error("An error occurred while updating the investment status");
    }
  };

  const togglePlanStatus = async (plan: InvestmentPlan) => {
    try {
      const newStatus = !plan.is_active;

      const response = await fetch(`/api/admin/investment-plans/${plan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: newStatus,
        }),
      });

      if (response.ok) {
        toast.success(`Plan ${newStatus ? 'activated' : 'deactivated'} successfully`);
        fetchInvestmentPlans();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update plan status");
      }
    } catch (error) {
      console.error("Error updating plan status:", error);
      toast.error("An error occurred while updating the plan status");
    }
  };

  const deleteInvestment = async (investment: UserInvestment) => {
    if (!confirm(`Are you sure you want to delete this investment? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/user-investments/${investment.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Investment deleted successfully");
        fetchUserInvestments();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete investment");
      }
    } catch (error) {
      console.error("Error deleting investment:", error);
      toast.error("An error occurred while deleting the investment");
    }
  };

  const deletePlan = async (plan: InvestmentPlan) => {
    if (!confirm(`Are you sure you want to delete the plan "${plan.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/investment-plans/${plan.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Investment plan deleted successfully");
        fetchInvestmentPlans();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete plan");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("An error occurred while deleting the plan");
    }
  };

  const resetForm = () => {
    setPlanForm({
      name: '',
      description: '',
      min_amount: 0,
      max_amount: 0,
      daily_profit_rate: 0,
      duration_days: 0,
      is_active: true,
    });
  };

  const openEditModal = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      min_amount: plan.min_amount,
      max_amount: plan.max_amount || 0,
      daily_profit_rate: plan.daily_profit_rate * 100, // Convert to percentage
      duration_days: plan.duration_days,
      is_active: plan.is_active,
    });
    setShowEditModal(true);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Investment Management</h1>
        <p className="text-gray-600">Manage investment plans and user investments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Plans</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalPlans}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Plans</p>
              <p className="text-lg font-semibold text-gray-900">{stats.activePlans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Investments</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalInvestments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Play className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Investments</p>
              <p className="text-lg font-semibold text-gray-900">{stats.activeInvestments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Invested</p>
              <p className="text-lg font-semibold text-gray-900">${stats.totalInvested.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Percent className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Profit</p>
              <p className="text-lg font-semibold text-gray-900">${stats.totalProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'plans', name: 'Investment Plans', icon: TrendingUp },
            { id: 'investments', name: 'User Investments', icon: Users },
            { id: 'analytics', name: 'Analytics', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'plans' | 'investments' | 'analytics')}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'plans' && (
        <div>
          {/* Plans Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Investment Plans</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </button>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      plan.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Min Amount:</span>
                    <span className="text-sm font-medium">${plan.min_amount.toLocaleString()}</span>
                  </div>
                  {plan.max_amount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Max Amount:</span>
                      <span className="text-sm font-medium">${plan.max_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Daily Return:</span>
                    <span className="text-sm font-medium">{(plan.daily_profit_rate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Duration:</span>
                    <span className="text-sm font-medium">{plan.duration_days} days</span>
                  </div>
                  {plan.active_investments !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Active Investments:</span>
                      <span className="text-sm font-medium">{plan.active_investments}</span>
                    </div>
                  )}
                  {plan.total_invested !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Invested:</span>
                      <span className="text-sm font-medium">${plan.total_invested.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center justify-center"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => togglePlanStatus(plan)}
                    className={`flex-1 px-3 py-2 rounded text-sm flex items-center justify-center ${
                      plan.is_active
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {plan.is_active ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    {plan.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deletePlan(plan)}
                    className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* User Investments Tab */}
      {activeTab === 'investments' && (
        <div>
          {/* Investments Header with Search and Filters */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">User Investments</h2>
              <button
                onClick={fetchUserInvestments}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by user or plan..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan
                </label>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Plans</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPlanFilter('all');
                  }}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Investments Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvestments.map((investment) => (
                    <tr key={investment.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {investment.user_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {investment.user_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{investment.plan_name}</div>
                        <div className="text-sm text-gray-500">
                          {(investment.daily_profit_rate * 100).toFixed(2)}% daily
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${investment.amount.toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${investment.total_profit.toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            investment.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : investment.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : investment.status === 'suspended'
                              ? 'bg-yellow-100 text-yellow-800'
                              : investment.status === 'deactivated'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {investment.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(investment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                          <button
                            onClick={() => toggleInvestmentStatus(investment)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              investment.status === 'active'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {investment.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteInvestment(investment)}
                            className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredInvestments.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No investments found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || planFilter !== 'all'
                    ? 'Try adjusting your search criteria.'
                    : 'No user investments have been created yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Investment Analytics</h2>

          {/* Analytics Charts and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Performance */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Plan Performance</h3>
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                      <div className="text-sm text-gray-500">
                        {plan.active_investments || 0} active investments
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ${(plan.total_invested || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">total invested</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Investment Status Distribution</h3>
              <div className="space-y-4">
                {['active', 'completed', 'suspended', 'deactivated', 'cancelled'].map((status) => {
                  const count = userInvestments.filter(inv => inv.status === status).length;
                  const percentage = userInvestments.length > 0 ? (count / userInvestments.length) * 100 : 0;

                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${
                            status === 'active'
                              ? 'bg-green-500'
                              : status === 'completed'
                              ? 'bg-blue-500'
                              : status === 'suspended'
                              ? 'bg-yellow-500'
                              : status === 'deactivated'
                              ? 'bg-red-500'
                              : 'bg-gray-500'
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{count}</div>
                        <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Investment Plan</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter plan name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter plan description"
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
                    onChange={(e) => setPlanForm(prev => ({ ...prev, min_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Amount ($)
                  </label>
                  <input
                    type="number"
                    value={planForm.max_amount}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, max_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0 (unlimited)"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Return (%) *
                  </label>
                  <input
                    type="number"
                    value={planForm.daily_profit_rate}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, daily_profit_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    value={planForm.duration_days}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active (available for new investments)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createPlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Investment Plan</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
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
                    onChange={(e) => setPlanForm(prev => ({ ...prev, min_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Amount ($)
                  </label>
                  <input
                    type="number"
                    value={planForm.max_amount}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, max_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Return (%) *
                  </label>
                  <input
                    type="number"
                    value={planForm.daily_profit_rate}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, daily_profit_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    value={planForm.duration_days}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active (available for new investments)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPlan(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={updatePlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
