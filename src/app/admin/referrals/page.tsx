"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  DollarSign,
  Edit,
  Check,
  TrendingUp,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";

interface ReferralData {
  id: string;
  referrer_id: string;
  referred_id: string;
  referrer_name: string;
  referrer_email: string;
  referrer_code: string;
  referred_name: string;
  referred_email: string;
  commission_rate: number;
  commission_earned: number;
  commission_paid: boolean;
  total_invested: number;
  status: string;
  created_at: string;
}

export default function AdminReferralsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<ReferralData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    commissionEarned: 0,
    commissionPaid: false,
    adminNotes: "",
  });

  const fetchReferrals = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/referrals");
      if (response.ok) {
        const data = await response.json();
        setReferrals(data);
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast.error("Failed to fetch referrals");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

    fetchReferrals();
  }, [session, status, router, fetchReferrals]);

  const handleEditReferral = (referral: ReferralData) => {
    setSelectedReferral(referral);
    setEditForm({
      commissionEarned: referral.commission_earned,
      commissionPaid: referral.commission_paid,
      adminNotes: "",
    });
    setShowEditModal(true);
  };

  const handleUpdateCommission = async () => {
    if (!selectedReferral) return;

    try {
      const response = await fetch("/api/admin/referrals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referralId: selectedReferral.id,
          ...editForm,
        }),
      });

      if (response.ok) {
        toast.success("Referral commission updated successfully");
        setShowEditModal(false);
        fetchReferrals();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update commission");
      }
    } catch (error) {
      console.error("Error updating commission:", error);
      toast.error("An error occurred while updating commission");
    }
  };

  const stats = {
    totalReferrals: referrals.length,
    totalCommissionEarned: referrals.reduce((sum, r) => sum + r.commission_earned, 0),
    totalCommissionPaid: referrals.filter(r => r.commission_paid).reduce((sum, r) => sum + r.commission_earned, 0),
    pendingCommission: referrals.filter(r => !r.commission_paid).reduce((sum, r) => sum + r.commission_earned, 0),
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Referral Management
        </h1>
        <p className="text-gray-600">Manage referral commissions and relationships</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Referrals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalReferrals}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earned</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalCommissionEarned.toFixed(2)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Check className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid Out</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalCommissionPaid.toFixed(2)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">${stats.pendingCommission.toFixed(2)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Referrals Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Referral Relationships ({referrals.length})
          </h2>
        </div>

        {referrals.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No referrals found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Referral relationships will appear here when users sign up with referral codes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referrer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referred User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {referral.referrer_name}
                        </div>
                        <div className="text-sm text-gray-500">{referral.referrer_email}</div>
                        <div className="text-xs text-gray-400">Code: {referral.referrer_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {referral.referred_name}
                        </div>
                        <div className="text-sm text-gray-500">{referral.referred_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${referral.total_invested.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${referral.commission_earned.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{(referral.commission_rate * 100).toFixed(1)}% rate</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          referral.commission_paid
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {referral.commission_paid ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditReferral(referral)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Edit Commission"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Edit Commission Modal */}
      {showEditModal && selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Referral Commission
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.commissionEarned}
                  onChange={(e) =>
                    setEditForm(prev => ({
                      ...prev,
                      commissionEarned: parseFloat(e.target.value) || 0
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.commissionPaid}
                    onChange={(e) =>
                      setEditForm(prev => ({
                        ...prev,
                        commissionPaid: e.target.checked
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as Paid</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes
                </label>
                <textarea
                  value={editForm.adminNotes}
                  onChange={(e) =>
                    setEditForm(prev => ({
                      ...prev,
                      adminNotes: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional notes about this commission update"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCommission}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Commission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
