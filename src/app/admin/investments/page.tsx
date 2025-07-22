"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Percent,
  Users,
  Eye,
  Pause,
  Play,
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
  user_name: string;
  user_email: string;
  plan_name: string;
}

export default function AdminInvestmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'investments'>('plans');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    min_amount: 0,
    max_amount: 0,
    daily_profit_rate: 0,
    duration_days: 0,
    is_active: true,
  });
  const toast = useToast();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/signin");
      return;
    }

    fetchInvestmentPlans();
  }, [session, status, router]);

  const fetchInvestmentPlans = async () => {
    try {
      const response = await fetch("/api/admin/investment-plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Error fetching investment plans:", error);
    } finally {
      setIsLoading(false);
    }
  };





  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this investment plan?"))
      return;

    try {
      const response = await fetch(`/api/admin/investment-plans/${planId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchInvestmentPlans();
        toast.success("Plan deleted successfully!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete plan");
      }
    } catch {
      toast.error("An error occurred while deleting the plan");
    }
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/investment-plans/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (response.ok) {
        fetchInvestmentPlans();
        alert(
          `Plan ${!currentStatus ? "activated" : "deactivated"} successfully!`
        );
      }
    } catch {
      alert("An error occurred while updating the plan status");
    }
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
                Investment Plans
              </h1>
              <p className="text-gray-600">
                Manage investment plans and monitor performance
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Investment Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                !plan.is_active ? "opacity-60" : ""
              }`}
            >
              <div
                className={`h-2 ${
                  plan.is_active ? "bg-green-500" : "bg-gray-400"
                }`}
              ></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Daily Rate</span>
                    <span className="font-semibold text-green-600">
                      {(plan.daily_profit_rate * 100).toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Duration</span>
                    <span className="font-semibold">
                      {plan.duration_days} days
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Min Amount</span>
                    <span className="font-semibold">
                      $
                      {(typeof plan.min_amount === "number"
                        ? plan.min_amount
                        : parseFloat(plan.min_amount || "0")
                      ).toFixed(2)}
                    </span>
                  </div>

                  {plan.max_amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Max Amount</span>
                      <span className="font-semibold">
                        $
                        {(typeof plan.max_amount === "number"
                          ? plan.max_amount
                          : parseFloat(plan.max_amount || "0")
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                      plan.is_active
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {plan.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
