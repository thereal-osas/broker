"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
} from "lucide-react";
import { useBalance } from "../../../hooks/useBalance";
import { useToast } from "../../../hooks/useToast";

interface WithdrawalRequest {
  id: string;
  amount: number;
  withdrawal_method: string;
  account_details: Record<string, unknown>;
  status: string;
  admin_notes: string;
  created_at: string;
}

export default function WithdrawPage() {
  const { balance } = useBalance();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] = useState("bank_transfer");
  const [accountDetails, setAccountDetails] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    routingNumber: "",
    walletAddress: "",
    paypalId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequest[]
  >([]);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  const fetchWithdrawalRequests = async () => {
    try {
      const response = await fetch("/api/withdrawals");
      if (response.ok) {
        const data = await response.json();
        setWithdrawalRequests(data);
      }
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          withdrawalMethod,
          accountDetails,
        }),
      });

      if (response.ok) {
        setAmount("");
        setAccountDetails({
          bankName: "",
          accountNumber: "",
          accountName: "",
          routingNumber: "",
          walletAddress: "",
          paypalId: "",
        });
        setShowForm(false);
        fetchWithdrawalRequests();
        toast.success("Withdrawal request submitted successfully!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to submit withdrawal request");
      }
    } catch {
      toast.error("An error occurred while submitting the request");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case "processed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "declined":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "processed":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const availableBalance = balance?.total_balance || 0;
  const maxWithdrawal = Math.min(availableBalance, 50000); // Max $50k per request

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Withdraw Funds
        </h1>
        <p className="text-gray-600">Request withdrawal from your account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Withdrawal Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowDownRight className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Request Withdrawal
              </h2>
              <p className="text-sm text-gray-600">
                Available: ${availableBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="50"
                  max={maxWithdrawal}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                  placeholder="Enter amount to withdraw"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min: $50.00 | Max: ${maxWithdrawal.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Method
                </label>
                <select
                  value={withdrawalMethod}
                  onChange={(e) => setWithdrawalMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              {withdrawalMethod === "bank_transfer" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={accountDetails.bankName}
                      onChange={(e) =>
                        setAccountDetails((prev) => ({
                          ...prev,
                          bankName: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={accountDetails.accountName}
                      onChange={(e) =>
                        setAccountDetails((prev) => ({
                          ...prev,
                          accountName: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Account holder name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountDetails.accountNumber}
                      onChange={(e) =>
                        setAccountDetails((prev) => ({
                          ...prev,
                          accountNumber: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Account number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Routing Number
                    </label>
                    <input
                      type="text"
                      value={accountDetails.routingNumber}
                      onChange={(e) =>
                        setAccountDetails((prev) => ({
                          ...prev,
                          routingNumber: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Routing number"
                    />
                  </div>
                </div>
              )}

              {withdrawalMethod === "crypto" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cryptocurrency Wallet Address
                    </label>
                    <input
                      type="text"
                      value={accountDetails.walletAddress}
                      onChange={(e) =>
                        setAccountDetails((prev) => ({
                          ...prev,
                          walletAddress: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your crypto wallet address"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Please ensure the wallet address is correct. Incorrect addresses may result in loss of funds.
                    </p>
                  </div>
                </div>
              )}

              {withdrawalMethod === "paypal" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PayPal ID/Email
                    </label>
                    <input
                      type="email"
                      value={accountDetails.paypalId}
                      onChange={(e) =>
                        setAccountDetails((prev) => ({
                          ...prev,
                          paypalId: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your PayPal email address"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the email address associated with your PayPal account.
                    </p>
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={
                  isLoading ||
                  !amount ||
                  parseFloat(amount) < 50 ||
                  parseFloat(amount) > availableBalance ||
                  parseFloat(amount) > maxWithdrawal ||
                  (withdrawalMethod === "bank_transfer" &&
                    (!accountDetails.bankName || !accountDetails.accountName ||
                     !accountDetails.accountNumber || !accountDetails.routingNumber)) ||
                  (withdrawalMethod === "crypto" && !accountDetails.walletAddress) ||
                  (withdrawalMethod === "paypal" && !accountDetails.paypalId)
                }
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  `Submit Withdrawal Request - $${amount || "0.00"}`
                )}
              </motion.button>
            </form>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Request Submitted!
              </h3>
              <p className="text-gray-600 mb-4">
                Your withdrawal request has been submitted for review.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          )}
        </motion.div>

        {/* Withdrawal History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Withdrawal History
          </h2>

          {withdrawalRequests.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawalRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(request.status)}
                      <span className="font-semibold text-gray-900">
                        ${request.amount.toFixed(2)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Method: {request.withdrawal_method.replace("_", " ")}</p>
                    <p>
                      Date: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.admin_notes && (
                      <p className="text-red-600">
                        Note: {request.admin_notes}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
