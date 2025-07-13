"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
} from "lucide-react";


interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_proof: string;
  transaction_hash?: string;
  status: string;
  admin_notes: string;
  created_at: string;
  user_name: string;
  user_email: string;
}

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(
    null
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);


  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const response = await fetch("/api/admin/deposits");
      if (response.ok) {
        const data = await response.json();
        setDeposits(data);
      }
    } catch (error) {
      console.error("Error fetching deposits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (
    depositId: string,
    action: "approve" | "decline"
  ) => {
    setActionLoading(true);

    try {
      const response = await fetch(
        `/api/admin/deposits/${depositId}/${action}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ adminNotes }),
        }
      );

      if (response.ok) {
        fetchDeposits();
        setSelectedDeposit(null);
        setAdminNotes("");
        alert(`Deposit ${action}d successfully!`);
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${action} deposit`);
      }
    } catch (error) {
      alert(`An error occurred while ${action}ing the deposit: ${error}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Deposit Requests
        </h1>
        <p className="text-gray-600">Review and manage user deposit requests</p>
      </div>

      {/* Deposits Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deposits.map((deposit, index) => (
                <motion.tr
                  key={deposit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {deposit.user_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {deposit.user_email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      ${deposit.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {deposit.payment_method.replace("_", " ")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        deposit.status
                      )}`}
                    >
                      {deposit.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(deposit.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedDeposit(deposit)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {deposit.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleAction(deposit.id, "approve")}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(deposit.id, "decline")}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Decline"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Details Modal */}
      {selectedDeposit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDeposit(null)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Deposit Request Details
              </h3>
              <button
                onClick={() => setSelectedDeposit(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    User
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedDeposit.user_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedDeposit.user_email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    ${selectedDeposit.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <p className="text-sm text-gray-900 capitalize">
                    {selectedDeposit.payment_method.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      selectedDeposit.status
                    )}`}
                  >
                    {selectedDeposit.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Proof
                </label>
                <a
                  href={selectedDeposit.payment_proof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View Payment Proof</span>
                </a>
              </div>

              {selectedDeposit.admin_notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Admin Notes
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedDeposit.admin_notes}
                  </p>
                </div>
              )}
            </div>

            {selectedDeposit.status === "pending" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add notes for this action..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleAction(selectedDeposit.id, "approve")}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Approve Deposit"}
                  </button>
                  <button
                    onClick={() => handleAction(selectedDeposit.id, "decline")}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Decline Deposit"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
