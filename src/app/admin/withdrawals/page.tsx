"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  Check,
  X,
  Clock,
  DollarSign,
  User,
  Calendar,
  CreditCard,
  Eye,
  XCircle,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  withdrawal_method: string;
  account_details: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    routingNumber?: string;
    walletAddress?: string;
    paypalId?: string;
  };
  status: "pending" | "approved" | "declined" | "processed";
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
}

export default function AdminWithdrawalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/signin");
      return;
    }

    fetchWithdrawalRequests();
  }, [session, status, router]);

  const fetchWithdrawalRequests = async () => {
    try {
      const response = await fetch("/api/admin/withdrawals");
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: string,
    notes: string = ""
  ) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/withdrawals/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          admin_notes: notes,
        }),
      });

      if (response.ok) {
        fetchWithdrawalRequests();
        setSelectedRequest(null);
        setAdminNotes("");
        toast.success(`Withdrawal request ${newStatus} successfully!`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update withdrawal request");
      }
    } catch {
      toast.error("An error occurred while updating the request");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (filter === "all") return true;
    return request.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "processed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "approved":
        return <Check className="w-4 h-4" />;
      case "declined":
        return <X className="w-4 h-4" />;
      case "processed":
        return <ArrowDownRight className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
                Withdrawal Requests
              </h1>
              <p className="text-gray-600">
                Review and manage user withdrawal requests
              </p>
            </div>
            <div className="flex space-x-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
                <option value="processed">Processed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {["pending", "approved", "declined", "processed"].map((status) => {
            const count = requests.filter((r) => r.status === status).length;
            const total = requests
              .filter((r) => r.status === status)
              .reduce((sum, r) => sum + r.amount, 0);

            return (
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 capitalize">
                      {status}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-500">${total.toFixed(2)}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Withdrawal Requests Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Withdrawal Requests ({filteredRequests.length})
            </h2>
          </div>

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
                    Method & Details
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
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.user_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.user_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {request.amount.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900 capitalize">
                            {request.withdrawal_method.replace("_", " ")}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {request.withdrawal_method === 'bank_transfer' && request.account_details.accountNumber && (
                              <div>
                                <div>Bank: {request.account_details.bankName}</div>
                                <div>Account: {request.account_details.accountNumber}</div>
                                <div>Name: {request.account_details.accountName}</div>
                              </div>
                            )}
                            {request.withdrawal_method === 'crypto' && request.account_details.walletAddress && (
                              <div>
                                <div>Wallet: {request.account_details.walletAddress}</div>
                              </div>
                            )}
                            {request.withdrawal_method === 'paypal' && request.account_details.paypalId && (
                              <div>
                                <div>PayPal: {request.account_details.paypalId}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">
                          {request.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">

                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <ArrowDownRight className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No withdrawal requests
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === "all"
                  ? "No withdrawal requests found."
                  : `No ${filter} withdrawal requests found.`}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Withdrawal Details Modal */}
      {selectedRequest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRequest(null)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Withdrawal Request Details
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    User
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedRequest.user_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedRequest.user_email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    ${selectedRequest.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Withdrawal Method
                  </label>
                  <p className="text-sm text-gray-900 capitalize">
                    {selectedRequest.withdrawal_method.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      selectedRequest.status
                    )}`}
                  >
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Details
                </label>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  {selectedRequest.account_details.bankName && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Bank Name:</span>
                      <span className="text-sm text-gray-900">{selectedRequest.account_details.bankName}</span>
                    </div>
                  )}
                  {selectedRequest.account_details.accountNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Account Number:</span>
                      <span className="text-sm text-gray-900">{selectedRequest.account_details.accountNumber}</span>
                    </div>
                  )}
                  {selectedRequest.account_details.accountName && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Account Name:</span>
                      <span className="text-sm text-gray-900">{selectedRequest.account_details.accountName}</span>
                    </div>
                  )}
                  {selectedRequest.account_details.routingNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Routing Number:</span>
                      <span className="text-sm text-gray-900">{selectedRequest.account_details.routingNumber}</span>
                    </div>
                  )}
                  {selectedRequest.account_details.walletAddress && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Wallet Address:</span>
                      <span className="text-sm text-gray-900 break-all">{selectedRequest.account_details.walletAddress}</span>
                    </div>
                  )}
                  {selectedRequest.account_details.paypalId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">PayPal ID:</span>
                      <span className="text-sm text-gray-900">{selectedRequest.account_details.paypalId}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.admin_notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Admin Notes
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedRequest.admin_notes}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Request Date
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedRequest.status === "pending" && (
              <div className="space-y-4 mt-6 pt-6 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add notes about this withdrawal request..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest.id, "approved", adminNotes)}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? "Processing..." : "Approve Withdrawal"}
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest.id, "declined", adminNotes)}
                    disabled={isProcessing}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? "Processing..." : "Decline Withdrawal"}
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
