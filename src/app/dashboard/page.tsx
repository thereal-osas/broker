"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useBalance } from "../../hooks/useBalance";
import { useInvestments } from "../../hooks/useInvestments";
import { useToast } from "../../hooks/useToast";
import BalanceCards from "../../components/user/BalanceCards";
import InvestmentPlans from "../../components/investments/InvestmentPlans";
import UserInvestments from "../../components/investments/UserInvestments";
import ProfitHistory from "../../components/dashboard/ProfitHistory";

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { balance, isLoading: balanceLoading, refreshBalance } = useBalance();
  const { createInvestment } = useInvestments();
  const toast = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    if (session.user.role === "admin") {
      router.push("/admin/dashboard");
      return;
    }
  }, [session, status, router]);

  const handleInvestment = async (planId: string, amount: number) => {
    try {
      await createInvestment(planId, amount);
      refreshBalance();
      setRefreshTrigger((prev) => prev + 1);
      toast.success("Investment created successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create investment"
      );
    }
  };

  if (status === "loading" || balanceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user || session.user.role === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {session.user.firstName}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push("/dashboard/deposit")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => router.push("/dashboard/withdraw")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Account Balances
          </h2>
          {balance && <BalanceCards balance={balance} />}
        </motion.div>

        {/* Investment Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Investment Plans
          </h2>
          <InvestmentPlans
            onInvest={handleInvestment}
            userBalance={balance?.total_balance || 0}
          />
        </motion.div>

        {/* User Investments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <UserInvestments refreshTrigger={refreshTrigger} />
        </motion.div>

        {/* Profit History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ProfitHistory />
        </motion.div>
      </div>
    </div>
  );
}
