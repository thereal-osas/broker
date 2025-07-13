"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useInvestments } from "../../../hooks/useInvestments";
import InvestmentPlans from "../../../components/investments/InvestmentPlans";
import UserInvestments from "../../../components/investments/UserInvestments";
import { useBalance } from "../../../hooks/useBalance";
import { useToast } from "../../../hooks/useToast";
import {
  TrendingUp,
  DollarSign,
  Target,
  PlusCircle,
  BarChart3,
} from "lucide-react";

export default function InvestmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    investments,
    isLoading: investmentsLoading,
    fetchInvestments,
  } = useInvestments();
  const { balance } = useBalance();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"active" | "plans">("active");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    if (session.user.role !== "investor") {
      router.push("/admin/dashboard");
      return;
    }
  }, [session, status, router]);

  const handleInvestment = async (planId: string, amount: number) => {
    try {
      const response = await fetch("/api/investments/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          amount,
        }),
      });

      if (response.ok) {
        toast.success("Investment created successfully!");
        fetchInvestments();
        setRefreshTrigger((prev) => prev + 1);
        // Refresh balance as well
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create investment");
      }
    } catch {
      toast.error("An error occurred while creating the investment");
    }
  };

  // Calculate investment statistics with null checks
  const safeInvestments = investments || [];
  const activeInvestments = safeInvestments.filter(
    (inv) => inv.status === "active"
  );
  const totalInvested = safeInvestments.reduce(
    (sum, inv) =>
      sum +
      (typeof inv.amount === "number"
        ? inv.amount
        : parseFloat(inv.amount || "0")),
    0
  );
  const totalProfit = safeInvestments.reduce(
    (sum, inv) =>
      sum +
      (typeof inv.total_profit === "number"
        ? inv.total_profit
        : parseFloat(inv.total_profit || "0")),
    0
  );
  const completedInvestments = safeInvestments.filter(
    (inv) => inv.status === "completed"
  ).length;

  const stats = [
    {
      title: "Active Investments",
      value: activeInvestments.length,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Invested",
      value: `$${totalInvested.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Profit",
      value: `$${totalProfit.toFixed(2)}`,
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Completed",
      value: completedInvestments,
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  if (status === "loading" || investmentsLoading) {
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
                My Investments
              </h1>
              <p className="text-gray-600">Manage your investment portfolio</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Available Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  ${balance?.total_balance?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("active")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                My Investments ({safeInvestments.length})
              </button>
              <button
                onClick={() => setActiveTab("plans")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "plans"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <PlusCircle className="w-4 h-4 inline mr-2" />
                New Investment
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "active" ? (
              <UserInvestments refreshTrigger={refreshTrigger} />
            ) : (
              <InvestmentPlans
                onInvest={handleInvestment}
                userBalance={balance?.total_balance || 0}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
